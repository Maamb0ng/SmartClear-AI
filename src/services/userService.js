import { supabase } from "./supabase";

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCourse(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeYearLevel(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim().toLowerCase();
  const directNumber = Number(normalized);

  if (
    Number.isInteger(directNumber) &&
    directNumber >= 1 &&
    directNumber <= 4
  ) {
    return directNumber;
  }

  if (normalized.includes("1st") || normalized.includes("first")) return 1;
  if (normalized.includes("2nd") || normalized.includes("second")) return 2;
  if (normalized.includes("3rd") || normalized.includes("third")) return 3;
  if (normalized.includes("4th") || normalized.includes("fourth")) return 4;

  const extractedNumber = normalized.match(/[1-4]/);
  return extractedNumber ? Number(extractedNumber[0]) : null;
}

function normalizeBlock(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .trim()
    .replace(/^block[\s\-:]*/i, "")
    .replace(/^section[\s\-:]*/i, "")
    .toUpperCase();
}

function getUserBlock(user) {
  return (
    user?.block ||
    user?.block_name ||
    user?.section ||
    user?.section_name ||
    ""
  );
}

function getSectionCourse(section) {
  return (
    section?.course ||
    section?.program ||
    section?.course_code ||
    section?.courses?.course_code ||
    section?.courses?.code ||
    ""
  );
}

function getSectionYearLevel(section) {
  return section?.year_level || section?.year || section?.level || "";
}

function getSectionBlock(section) {
  return (
    section?.block ||
    section?.block_name ||
    section?.section_name ||
    section?.name ||
    ""
  );
}

export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUser(id) {
  if (!id) throw new Error("User ID is required.");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(id, updates) {
  if (!id) throw new Error("User ID is required.");

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveUser(user) {
  if (!user?.id) {
    throw new Error("Invalid user record.");
  }

  const role = normalizeText(user.role);
  const isStudent = role.includes("student");

  if (!isStudent) {
    const { data, error } = await supabase
      .from("users")
      .update({
        status: "Active",
        email_verified: true,
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const course = normalizeCourse(user.course);
  const yearLevel = normalizeYearLevel(user.year_level);
  const block = normalizeBlock(getUserBlock(user));

  if (!course) {
    throw new Error(
      "The student has no course information. Please verify the registration details."
    );
  }

  if (!yearLevel) {
    throw new Error(
      `The student has no valid year level. Current value: ${
        user.year_level || "Not provided"
      }.`
    );
  }

  if (!block) {
    throw new Error(
      "The student has no block information. Please verify the registration details."
    );
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select(`
      *,
      courses (*)
    `);

  if (sectionsError) throw sectionsError;

  const matchingSection = (sections || []).find((section) => {
    const sectionCourse = normalizeCourse(getSectionCourse(section));
    const sectionYearLevel = normalizeYearLevel(
      getSectionYearLevel(section)
    );
    const sectionBlock = normalizeBlock(getSectionBlock(section));

    return (
      sectionCourse === course &&
      sectionYearLevel === yearLevel &&
      sectionBlock === block
    );
  });

  if (!matchingSection) {
    throw new Error(
      `No official section found for ${course}, Year ${yearLevel}, Block ${block}. Please create or verify this block in Course Management first.`
    );
  }

  const { data: approvedUser, error: approvalError } = await supabase
    .from("users")
    .update({
      section_id: matchingSection.id,
      status: "Active",
      email_verified: true,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (approvalError) throw approvalError;
  return approvedUser;
}

export async function rejectUser(id) {
  if (!id) throw new Error("User ID is required.");

  const { data, error } = await supabase
    .from("users")
    .update({
      status: "Inactive",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUser(user) {
  const userId =
    typeof user === "string"
      ? user
      : user?.id;

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      "delete-user-account",
      {
        body: {
          userId,
          confirmation:
            "DELETE",
        },
      }
    );

  if (error) {
    let message =
      error.message ||
      "The secure account deletion request failed.";

    try {
      const details =
        await error.context?.json();

      message =
        details?.error ||
        details?.message ||
        message;
    } catch {
      // Keep the original Edge Function error message.
    }

    throw new Error(
      message
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
      "The account could not be deleted."
    );
  }

  return data;
}
