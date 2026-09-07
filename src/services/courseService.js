import { supabase } from "./supabase";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeCourseData = (courseData) => {
  return {
    course_code: courseData.course_code
      .trim()
      .toUpperCase(),

    course_name: courseData.course_name.trim(),

    is_active: courseData.is_active ?? true,

    updated_at: new Date().toISOString(),
  };
};

const validateCourseData = (courseData) => {
  if (!courseData.course_code?.trim()) {
    throw new Error("Course code is required.");
  }

  if (!courseData.course_name?.trim()) {
    throw new Error("Course name is required.");
  }
};

const handleCourseError = (error) => {
  if (
    error?.code === "23505" ||
    error?.message
      ?.toLowerCase()
      .includes("duplicate")
  ) {
    throw new Error(
      "A course with this course code already exists."
    );
  }

  if (error?.code === "23503") {
    throw new Error(
      "This course cannot be deleted because it is still connected to existing blocks."
    );
  }

  throw error;
};

/*
|--------------------------------------------------------------------------
| Get all courses
|--------------------------------------------------------------------------
*/

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at
    `)
    .order("course_code", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Get active courses
|--------------------------------------------------------------------------
| Used by registration and other dropdowns.
|--------------------------------------------------------------------------
*/

export async function getActiveCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      course_code,
      course_name,
      is_active
    `)
    .eq("is_active", true)
    .order("course_code", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Get one course
|--------------------------------------------------------------------------
*/

export async function getCourseById(courseId) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", courseId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Get courses together with their blocks
|--------------------------------------------------------------------------
| This will be used by the grouped Course Management page.
|--------------------------------------------------------------------------
*/

export async function getCoursesWithSections() {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at,

      sections:sections!sections_course_id_fkey (
        id,
        course_id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active,
        created_at,
        updated_at
      )
    `)
    .order("course_code", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  const yearOrder = {
    "1st Year": 1,
    "2nd Year": 2,
    "3rd Year": 3,
    "4th Year": 4,
  };

  return (data || []).map((course) => ({
    ...course,

    sections: [...(course.sections || [])].sort(
      (firstSection, secondSection) => {
        const firstYear =
          yearOrder[firstSection.year_level] || 99;

        const secondYear =
          yearOrder[secondSection.year_level] || 99;

        if (firstYear !== secondYear) {
          return firstYear - secondYear;
        }

        return (
          firstSection.block_code || ""
        ).localeCompare(
          secondSection.block_code || ""
        );
      }
    ),
  }));
}

/*
|--------------------------------------------------------------------------
| Create course
|--------------------------------------------------------------------------
*/

export async function createCourse(courseData) {
  validateCourseData(courseData);

  const payload =
    normalizeCourseData(courseData);

  const { data, error } = await supabase
    .from("courses")
    .insert({
      course_code: payload.course_code,
      course_name: payload.course_name,
      is_active: payload.is_active,
    })
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    handleCourseError(error);
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Update course
|--------------------------------------------------------------------------
*/

export async function updateCourse(
  courseId,
  courseData
) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  validateCourseData(courseData);

  const payload =
    normalizeCourseData(courseData);

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    handleCourseError(error);
  }

  /*
  Keep the old sections.course text column synchronized
  so existing pages will continue working.
  */
  const { error: sectionUpdateError } =
    await supabase
      .from("sections")
      .update({
        course: payload.course_code,
      })
      .eq("course_id", courseId);

  if (sectionUpdateError) {
    console.error(
      "Unable to synchronize section course codes:",
      sectionUpdateError
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Activate or deactivate course
|--------------------------------------------------------------------------
*/

export async function setCourseStatus(
  courseId,
  isActive
) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .select(`
      id,
      course_code,
      course_name,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Count blocks belonging to a course
|--------------------------------------------------------------------------
*/

export async function getCourseSectionCount(
  courseId
) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  const { count, error } = await supabase
    .from("sections")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("course_id", courseId);

  if (error) {
    throw error;
  }

  return count || 0;
}

/*
|--------------------------------------------------------------------------
| Count students belonging to a course
|--------------------------------------------------------------------------
*/

export async function getCourseStudentCount(
  courseId
) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  const { data: sectionData, error: sectionError } =
    await supabase
      .from("sections")
      .select("id")
      .eq("course_id", courseId);

  if (sectionError) {
    throw sectionError;
  }

  const sectionIds = (sectionData || []).map(
    (section) => section.id
  );

  if (sectionIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("users")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("role", "Student")
    .in("section_id", sectionIds);

  if (error) {
    throw error;
  }

  return count || 0;
}

/*
|--------------------------------------------------------------------------
| Delete course
|--------------------------------------------------------------------------
| Courses with existing blocks cannot be deleted.
| They should be deactivated instead.
|--------------------------------------------------------------------------
*/

export async function deleteCourse(courseId) {
  if (!courseId) {
    throw new Error("Course ID is required.");
  }

  const sectionCount =
    await getCourseSectionCount(courseId);

  if (sectionCount > 0) {
    throw new Error(
      `This course cannot be deleted because it has ${sectionCount} existing block${
        sectionCount === 1 ? "" : "s"
      }. Delete the unused blocks first or deactivate the course instead.`
    );
  }

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) {
    handleCourseError(error);
  }

  return {
    success: true,
  };
}

/*
|--------------------------------------------------------------------------
| Group sections into four year levels
|--------------------------------------------------------------------------
*/

export function groupSectionsByYear(
  sections = []
) {
  const groupedSections = {
    "1st Year": [],
    "2nd Year": [],
    "3rd Year": [],
    "4th Year": [],
  };

  sections.forEach((section) => {
    if (
      Object.prototype.hasOwnProperty.call(
        groupedSections,
        section.year_level
      )
    ) {
      groupedSections[
        section.year_level
      ].push(section);
    }
  });

  Object.keys(groupedSections).forEach(
    (yearLevel) => {
      groupedSections[yearLevel].sort(
        (firstSection, secondSection) =>
          (
            firstSection.block_code || ""
          ).localeCompare(
            secondSection.block_code || ""
          )
      );
    }
  );

  return groupedSections;
}