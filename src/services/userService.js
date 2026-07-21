import { supabase } from "./supabase";

/*
=====================================
HELPER FUNCTIONS
=====================================
*/

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeCourse(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeYearLevel(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  const directNumber = Number(normalized);

  if (
    Number.isInteger(directNumber) &&
    directNumber >= 1 &&
    directNumber <= 4
  ) {
    return directNumber;
  }

  if (
    normalized.includes("1st") ||
    normalized.includes("first")
  ) {
    return 1;
  }

  if (
    normalized.includes("2nd") ||
    normalized.includes("second")
  ) {
    return 2;
  }

  if (
    normalized.includes("3rd") ||
    normalized.includes("third")
  ) {
    return 3;
  }

  if (
    normalized.includes("4th") ||
    normalized.includes("fourth")
  ) {
    return 4;
  }

  const extractedNumber =
    normalized.match(/[1-4]/);

  return extractedNumber
    ? Number(extractedNumber[0])
    : null;
}

function normalizeBlock(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/^block[\s\-:]*/i, "")
    .replace(/^section[\s\-:]*/i, "")
    .toUpperCase();
}

/*
Get the student's registered block.

Your users table currently uses:
block

Other fallback fields are included
for compatibility.
*/
function getUserBlock(user) {
  return (
    user?.block ||
    user?.block_code ||
    user?.block_name ||
    user?.section ||
    user?.section_name ||
    ""
  );
}

/*
Get the section's official course code.

The related courses table is checked first,
then the old sections.course field.
*/
function getSectionCourse(section) {
  return (
    section?.courses?.course_code ||
    section?.courses?.code ||
    section?.course ||
    section?.course_code ||
    section?.program ||
    ""
  );
}

function getSectionYearLevel(section) {
  return (
    section?.year_level ||
    section?.year ||
    section?.level ||
    ""
  );
}

/*
Important:

Your sections table uses:
block_code
*/
function getSectionBlock(section) {
  return (
    section?.block_code ||
    section?.block ||
    section?.block_name ||
    section?.section_name ||
    section?.name ||
    ""
  );
}

function handleUserError(error) {
  if (!error) {
    return;
  }

  const message = String(
    error.message || ""
  ).toLowerCase();

  if (
    error.code === "42501" ||
    message.includes("row-level security")
  ) {
    throw new Error(
      "Database permission denied. Please verify the Supabase RLS policies for the users table."
    );
  }

  if (
    error.code === "23503" ||
    message.includes("foreign key")
  ) {
    throw new Error(
      "The selected section or related record no longer exists."
    );
  }

  if (
    error.code === "PGRST116" ||
    message.includes("multiple") ||
    message.includes("no rows")
  ) {
    throw new Error(
      "The requested user record could not be found."
    );
  }

  throw error;
}

/*
=====================================
GET ALL USERS
=====================================
*/

export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      sections (
        id,
        course_id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    handleUserError(error);
  }

  return data || [];
}

/*
=====================================
GET SINGLE USER
=====================================
*/

export async function getUser(id) {
  if (!id) {
    throw new Error(
      "User ID is required."
    );
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      sections (
        id,
        course_id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    handleUserError(error);
  }

  return data;
}

/*
=====================================
UPDATE USER
=====================================
*/

export async function updateUser(
  id,
  updates
) {
  if (!id) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    !updates ||
    typeof updates !== "object"
  ) {
    throw new Error(
      "Valid user updates are required."
    );
  }

  const payload = {
    ...updates,
  };

  /*
  Normalize academic fields when present.
  */
  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "course"
    )
  ) {
    payload.course =
      normalizeCourse(payload.course);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "block"
    )
  ) {
    payload.block =
      normalizeBlock(payload.block);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "year_level"
    )
  ) {
    payload.year_level =
      String(
        payload.year_level ?? ""
      ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "semester"
    )
  ) {
    payload.semester =
      String(
        payload.semester ?? ""
      ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "school_year"
    )
  ) {
    payload.school_year =
      String(
        payload.school_year ?? ""
      ).trim();
  }

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    handleUserError(error);
  }

  return data;
}

/*
=====================================
FIND OFFICIAL SECTION

Matches:

Student course
Student year level
Student block

against:

sections + courses
=====================================
*/

export async function findMatchingSection(
  user
) {
  if (!user) {
    throw new Error(
      "Student information is required."
    );
  }

  const studentCourse =
    normalizeCourse(user.course);

  const studentYearLevel =
    normalizeYearLevel(
      user.year_level
    );

  const studentBlock =
    normalizeBlock(
      getUserBlock(user)
    );

  if (!studentCourse) {
    throw new Error(
      "The student has no course information. Please edit and verify the student's course."
    );
  }

  if (!studentYearLevel) {
    throw new Error(
      `The student has no valid year level. Current value: ${
        user.year_level ||
        "Not provided"
      }.`
    );
  }

  if (!studentBlock) {
    throw new Error(
      "The student has no block information. Please edit and verify the student's block."
    );
  }

  const {
    data: sections,
    error: sectionsError,
  } = await supabase
    .from("sections")
    .select(`
      id,
      course_id,
      course,
      year_level,
      block_code,
      school_year,
      semester,
      is_active,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .eq("is_active", true);

  if (sectionsError) {
    handleUserError(sectionsError);
  }

  const matchingSection = (
    sections || []
  ).find((section) => {
    const sectionCourse =
      normalizeCourse(
        getSectionCourse(section)
      );

    const sectionYearLevel =
      normalizeYearLevel(
        getSectionYearLevel(section)
      );

    const sectionBlock =
      normalizeBlock(
        getSectionBlock(section)
      );

    return (
      sectionCourse ===
        studentCourse &&
      sectionYearLevel ===
        studentYearLevel &&
      sectionBlock ===
        studentBlock
    );
  });

  if (!matchingSection) {
    throw new Error(
      `No official section found for ${studentCourse}, Year ${studentYearLevel}, Block ${studentBlock}. Please verify that this exact block exists and is active in Course Management.`
    );
  }

  return matchingSection;
}

/*
=====================================
APPROVE USER

Students:
- Automatically find official section
- Save users.section_id
- Activate account

Teachers, approvers, and administrators:
- Activate account directly
=====================================
*/

export async function approveUser(user) {
  if (!user?.id) {
    throw new Error(
      "Invalid user record."
    );
  }

  const normalizedRole =
    normalizeText(user.role);

  const isStudent =
    normalizedRole.includes(
      "student"
    );

  /*
  Non-student accounts do not need
  an official student section.
  */
  if (!isStudent) {
    const { data, error } =
      await supabase
        .from("users")
        .update({
          status: "Active",
          email_verified: true,
        })
        .eq("id", user.id)
        .select()
        .single();

    if (error) {
      handleUserError(error);
    }

    return data;
  }

  /*
  Find the official section using:
  course + year level + block
  */
  const matchingSection =
    await findMatchingSection(user);

  /*
  Assign official section and
  activate student account.
  */
  const {
    data: approvedUser,
    error: approvalError,
  } = await supabase
    .from("users")
    .update({
      section_id:
        matchingSection.id,
      status: "Active",
      email_verified: true,
    })
    .eq("id", user.id)
    .select(`
      *,
      sections (
        id,
        course_id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      )
    `)
    .single();

  if (approvalError) {
    handleUserError(
      approvalError
    );
  }

  return approvedUser;
}

/*
=====================================
REJECT / DEACTIVATE USER
=====================================
*/

export async function rejectUser(id) {
  if (!id) {
    throw new Error(
      "User ID is required."
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      status: "Inactive",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    handleUserError(error);
  }

  return data;
}

/*
=====================================
SET USER STATUS
=====================================
*/

export async function setUserStatus(
  id,
  status
) {
  if (!id) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!status) {
    throw new Error(
      "User status is required."
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    handleUserError(error);
  }

  return data;
}

/*
=====================================
DELETE USER
=====================================
*/

export async function deleteUser(id) {
  if (!id) {
    throw new Error(
      "User ID is required."
    );
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (error) {
    handleUserError(error);
  }

  return {
    success: true,
  };
}