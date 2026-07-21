import { supabase } from "./supabase";

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

const validateOfferingData = (offeringData) => {
  if (!offeringData.section_id) {
    throw new Error("Block or section is required.");
  }

  if (!offeringData.subject_id) {
    throw new Error("Subject is required.");
  }

  if (!offeringData.teacher_id) {
    throw new Error("Teacher is required.");
  }

  if (!offeringData.school_year?.trim()) {
    throw new Error("School year is required.");
  }

  if (!offeringData.semester?.trim()) {
    throw new Error("Semester is required.");
  }
};

const normalizeOfferingData = (offeringData) => {
  validateOfferingData(offeringData);

  return {
    section_id: offeringData.section_id,
    subject_id: offeringData.subject_id,
    teacher_id: offeringData.teacher_id,
    school_year: offeringData.school_year.trim(),
    semester: offeringData.semester.trim(),
    is_active: offeringData.is_active ?? true,
  };
};

const handleOfferingError = (error) => {
  if (
    error?.code === "23505" ||
    error?.message
      ?.toLowerCase()
      .includes("duplicate")
  ) {
    throw new Error(
      "This subject is already assigned to this block for the selected school year and semester."
    );
  }

  if (error?.code === "23503") {
    throw new Error(
      "The selected block, subject, or teacher no longer exists."
    );
  }

  throw error;
};

/*
|--------------------------------------------------------------------------
| Get all class offerings
|--------------------------------------------------------------------------
*/

export async function getClassOfferings() {
  const { data, error } = await supabase
    .from("class_offerings")
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at,

      section:sections!class_offerings_section_id_fkey (
        id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      ),

      subject:subjects!class_offerings_subject_id_fkey (
        id,
        subject_code,
        subject_name
      ),

      teacher:users!class_offerings_teacher_id_fkey (
        id,
        employee_id,
        full_name,
        email,
        role,
        status
      )
    `)
    .order("school_year", {
      ascending: false,
    })
    .order("semester", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Get active offerings for one block
|--------------------------------------------------------------------------
*/

export async function getClassOfferingsBySection(
  sectionId,
  schoolYear,
  semester
) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  let query = supabase
    .from("class_offerings")
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,

      subject:subjects!class_offerings_subject_id_fkey (
        id,
        subject_code,
        subject_name
      ),

      teacher:users!class_offerings_teacher_id_fkey (
        id,
        employee_id,
        full_name,
        email
      )
    `)
    .eq("section_id", sectionId)
    .eq("is_active", true);

  if (schoolYear) {
    query = query.eq(
      "school_year",
      schoolYear
    );
  }

  if (semester) {
    query = query.eq(
      "semester",
      semester
    );
  }

  const { data, error } = await query.order(
    "created_at",
    {
      ascending: true,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Get logged-in teacher's class offerings
|--------------------------------------------------------------------------
*/

export async function getTeacherClassOfferings(
  teacherId
) {
  if (!teacherId) {
    throw new Error("Teacher ID is required.");
  }

  const { data, error } = await supabase
    .from("class_offerings")
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
      created_at,

      section:sections!class_offerings_section_id_fkey (
        id,
        course,
        year_level,
        block_code
      ),

      subject:subjects!class_offerings_subject_id_fkey (
        id,
        subject_code,
        subject_name
      )
    `)
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .order("school_year", {
      ascending: false,
    })
    .order("semester", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Create one class offering
|--------------------------------------------------------------------------
*/

export async function createClassOffering(
  offeringData
) {
  const payload =
    normalizeOfferingData(offeringData);

  const { data, error } = await supabase
    .from("class_offerings")
    .insert(payload)
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    handleOfferingError(error);
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Create multiple subject assignments
|--------------------------------------------------------------------------
*/

export async function createMultipleClassOfferings({
  section_id,
  assignments,
  school_year,
  semester,
  is_active = true,
}) {
  if (!section_id) {
    throw new Error("Block or section is required.");
  }

  if (
    !Array.isArray(assignments) ||
    assignments.length === 0
  ) {
    throw new Error(
      "Select at least one subject and teacher assignment."
    );
  }

  if (!school_year?.trim()) {
    throw new Error("School year is required.");
  }

  if (!semester?.trim()) {
    throw new Error("Semester is required.");
  }

  const invalidAssignment =
    assignments.find(
      (assignment) =>
        !assignment.subject_id ||
        !assignment.teacher_id
    );

  if (invalidAssignment) {
    throw new Error(
      "Every selected subject must have an assigned teacher."
    );
  }

  const payload = assignments.map(
    (assignment) => ({
      section_id,
      subject_id: assignment.subject_id,
      teacher_id: assignment.teacher_id,
      school_year: school_year.trim(),
      semester: semester.trim(),
      is_active,
    })
  );

  const { data, error } = await supabase
    .from("class_offerings")
    .insert(payload)
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
      created_at
    `);

  if (error) {
    handleOfferingError(error);
  }

  return data || [];
}

/*
|--------------------------------------------------------------------------
| Update one class offering
|--------------------------------------------------------------------------
*/

export async function updateClassOffering(
  offeringId,
  offeringData
) {
  if (!offeringId) {
    throw new Error(
      "Class offering ID is required."
    );
  }

  const payload =
    normalizeOfferingData(offeringData);

  const { data, error } = await supabase
    .from("class_offerings")
    .update(payload)
    .eq("id", offeringId)
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    handleOfferingError(error);
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Activate or deactivate one offering
|--------------------------------------------------------------------------
*/

export async function setClassOfferingStatus(
  offeringId,
  isActive
) {
  if (!offeringId) {
    throw new Error(
      "Class offering ID is required."
    );
  }

  const { data, error } = await supabase
    .from("class_offerings")
    .update({
      is_active: Boolean(isActive),
    })
    .eq("id", offeringId)
    .select(`
      id,
      section_id,
      subject_id,
      teacher_id,
      school_year,
      semester,
      is_active,
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
| Delete one class offering
|--------------------------------------------------------------------------
*/

export async function deleteClassOffering(
  offeringId
) {
  if (!offeringId) {
    throw new Error(
      "Class offering ID is required."
    );
  }

  const { error } = await supabase
    .from("class_offerings")
    .delete()
    .eq("id", offeringId);

  if (error) {
    throw error;
  }

  return {
    success: true,
  };
}

/*
|--------------------------------------------------------------------------
| Delete every offering under one block and term
|--------------------------------------------------------------------------
*/

export async function deleteBlockClassOfferings(
  sectionId,
  schoolYear,
  semester
) {
  if (!sectionId) {
    throw new Error("Section ID is required.");
  }

  if (!schoolYear) {
    throw new Error("School year is required.");
  }

  if (!semester) {
    throw new Error("Semester is required.");
  }

  const { error } = await supabase
    .from("class_offerings")
    .delete()
    .eq("section_id", sectionId)
    .eq("school_year", schoolYear)
    .eq("semester", semester);

  if (error) {
    throw error;
  }

  return {
    success: true,
  };
}