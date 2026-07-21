import { supabase } from "./supabase";

/*
=====================================
HELPER FUNCTIONS
=====================================
*/

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCourse(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeBlockCode(value) {
  return String(value ?? "")
    .trim()
    .replace(/^block[\s\-:]*/i, "")
    .replace(/^section[\s\-:]*/i, "")
    .toUpperCase();
}

function normalizeSectionData(sectionData = {}) {
  return {
    course_id: sectionData.course_id || null,

    course: normalizeCourse(sectionData.course),

    year_level: normalizeText(
      sectionData.year_level
    ),

    block_code: normalizeBlockCode(
      sectionData.block_code
    ),

    school_year: normalizeText(
      sectionData.school_year
    ),

    semester: normalizeText(
      sectionData.semester
    ),

    is_active:
      sectionData.is_active === undefined
        ? true
        : Boolean(sectionData.is_active),
  };
}

function validateSectionData(sectionData = {}) {
  if (!sectionData.course_id) {
    throw new Error(
      "Course ID is required. Please select an official course."
    );
  }

  if (!normalizeCourse(sectionData.course)) {
    throw new Error("Course is required.");
  }

  if (!normalizeText(sectionData.year_level)) {
    throw new Error("Year level is required.");
  }

  if (!normalizeBlockCode(sectionData.block_code)) {
    throw new Error("Block code is required.");
  }

  if (!normalizeText(sectionData.school_year)) {
    throw new Error("School year is required.");
  }

  if (!normalizeText(sectionData.semester)) {
    throw new Error("Semester is required.");
  }
}

function handleSectionError(error) {
  if (!error) {
    return;
  }

  const message = String(
    error.message || ""
  ).toLowerCase();

  if (
    error.code === "23505" ||
    message.includes("duplicate") ||
    message.includes("unique constraint")
  ) {
    throw new Error(
      "This course, year level, block, school year, and semester combination already exists."
    );
  }

  if (
    error.code === "23503" ||
    message.includes("foreign key")
  ) {
    throw new Error(
      "The selected course does not exist or has already been deleted."
    );
  }

  if (
    error.code === "42501" ||
    message.includes("row-level security")
  ) {
    throw new Error(
      "You do not have permission to manage sections. Please verify the Supabase RLS policy."
    );
  }

  throw error;
}

/*
=====================================
GET ALL SECTIONS
=====================================
*/

export async function getSections() {
  const { data, error } = await supabase
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
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .order("course", {
      ascending: true,
    })
    .order("year_level", {
      ascending: true,
    })
    .order("block_code", {
      ascending: true,
    });

  if (error) {
    handleSectionError(error);
  }

  return data || [];
}

/*
=====================================
GET ACTIVE SECTIONS
Used for registration and selection.
=====================================
*/

export async function getActiveSections() {
  const { data, error } = await supabase
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
    .eq("is_active", true)
    .order("course", {
      ascending: true,
    })
    .order("year_level", {
      ascending: true,
    })
    .order("block_code", {
      ascending: true,
    });

  if (error) {
    handleSectionError(error);
  }

  return data || [];
}

/*
=====================================
GET SINGLE SECTION
=====================================
*/

export async function getSectionById(sectionId) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const { data, error } = await supabase
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
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .eq("id", sectionId)
    .single();

  if (error) {
    handleSectionError(error);
  }

  return data;
}

/*
=====================================
CREATE SECTION / BLOCK
=====================================
*/

export async function createSection(
  sectionData
) {
  validateSectionData(sectionData);

  const payload =
    normalizeSectionData(sectionData);

  const { data, error } = await supabase
    .from("sections")
    .insert(payload)
    .select(`
      id,
      course_id,
      course,
      year_level,
      block_code,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .single();

  if (error) {
    handleSectionError(error);
  }

  return data;
}

/*
=====================================
UPDATE SECTION / BLOCK
=====================================
*/

export async function updateSection(
  sectionId,
  sectionData
) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  validateSectionData(sectionData);

  const payload =
    normalizeSectionData(sectionData);

  const { data, error } = await supabase
    .from("sections")
    .update(payload)
    .eq("id", sectionId)
    .select(`
      id,
      course_id,
      course,
      year_level,
      block_code,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .single();

  if (error) {
    handleSectionError(error);
  }

  return data;
}

/*
=====================================
ACTIVATE / DEACTIVATE SECTION
=====================================
*/

export async function setSectionStatus(
  sectionId,
  isActive
) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const { data, error } = await supabase
    .from("sections")
    .update({
      is_active: Boolean(isActive),
    })
    .eq("id", sectionId)
    .select(`
      id,
      course_id,
      course,
      year_level,
      block_code,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .single();

  if (error) {
    handleSectionError(error);
  }

  return data;
}

/*
=====================================
GET STUDENT COUNT
=====================================
*/

export async function getSectionStudentCount(
  sectionId
) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const { count, error } = await supabase
    .from("users")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("section_id", sectionId)
    .ilike("role", "%student%");

  if (error) {
    throw error;
  }

  return count || 0;
}

/*
=====================================
DELETE SECTION
Only allowed when no student is assigned.
=====================================
*/

export async function deleteSection(sectionId) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  const studentCount =
    await getSectionStudentCount(sectionId);

  if (studentCount > 0) {
    throw new Error(
      `This block cannot be deleted because ${studentCount} student${
        studentCount === 1 ? " is" : "s are"
      } currently assigned to it. Deactivate the block instead.`
    );
  }

  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    handleSectionError(error);
  }

  return {
    success: true,
  };
}

/*
=====================================
GET AVAILABLE COURSES
=====================================
*/

export async function getAvailableCourses() {
  const sections =
    await getActiveSections();

  const courses = sections
    .map((section) => {
      return (
        section.courses?.course_code ||
        section.course ||
        ""
      );
    })
    .filter(Boolean)
    .map(normalizeCourse);

  return [...new Set(courses)].sort();
}

/*
=====================================
GET YEAR LEVELS BY COURSE
=====================================
*/

export async function getYearLevelsByCourse(
  course
) {
  if (!course) {
    return [];
  }

  const normalizedSelectedCourse =
    normalizeCourse(course);

  const sections =
    await getActiveSections();

  const yearOrder = {
    "1st Year": 1,
    "2nd Year": 2,
    "3rd Year": 3,
    "4th Year": 4,
  };

  const yearLevels = sections
    .filter((section) => {
      const sectionCourse = normalizeCourse(
        section.courses?.course_code ||
          section.course
      );

      return (
        sectionCourse ===
        normalizedSelectedCourse
      );
    })
    .map((section) => section.year_level)
    .filter(Boolean);

  return [...new Set(yearLevels)].sort(
    (firstYear, secondYear) =>
      (yearOrder[firstYear] || 99) -
      (yearOrder[secondYear] || 99)
  );
}

/*
=====================================
GET BLOCKS BY COURSE AND YEAR
=====================================
*/

export async function getBlocksByCourseAndYear(
  course,
  yearLevel
) {
  if (!course || !yearLevel) {
    return [];
  }

  const normalizedCourse =
    normalizeCourse(course);

  const { data, error } = await supabase
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
    .eq("year_level", yearLevel)
    .eq("is_active", true)
    .order("block_code", {
      ascending: true,
    });

  if (error) {
    handleSectionError(error);
  }

  return (data || []).filter((section) => {
    const sectionCourse = normalizeCourse(
      section.courses?.course_code ||
        section.course
    );

    return sectionCourse === normalizedCourse;
  });
}

/*
=====================================
GET SECTIONS BY COURSE ID
Useful for Course Management.
=====================================
*/

export async function getSectionsByCourseId(
  courseId
) {
  if (!courseId) {
    return [];
  }

  const { data, error } = await supabase
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
      created_at,
      updated_at,
      courses (
        id,
        course_code,
        course_name
      )
    `)
    .eq("course_id", courseId)
    .order("year_level", {
      ascending: true,
    })
    .order("block_code", {
      ascending: true,
    });

  if (error) {
    handleSectionError(error);
  }

  return data || [];
}