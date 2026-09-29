import { supabase } from "./supabase";

/*
|--------------------------------------------------------------------------
| GUIDANCE SERVICE
|--------------------------------------------------------------------------
| Handles:
| - Guidance batches
| - Eligible students for Guidance scheduling
| - Students inside batches
| - Student Guidance responses
| - Individual Guidance review
| - Bulk / selected approval
|--------------------------------------------------------------------------
*/

// ============================================================
// GET CURRENT LOGGED-IN USER PROFILE
// ============================================================

export async function getCurrentGuidanceUser() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("User not logged in.");
    }

    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        auth_id,
        employee_id,
        full_name,
        email,
        role,
        status
      `)
      .eq("auth_id", user.id)
      .eq("status", "Active")
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "Guidance user profile not found."
      );
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error(
      "getCurrentGuidanceUser:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance user.",
    };
  }
}

// ============================================================
// GET GUIDANCE OFFICE
// ============================================================

export async function getGuidanceOffice() {
  try {
    const { data, error } = await supabase
      .from("offices")
      .select(`
        id,
        office_name,
        office_code,
        description,
        is_active
      `)
      .eq("office_code", "GUI")
      .eq("is_active", true)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error(
      "getGuidanceOffice:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance office.",
    };
  }
}

// ============================================================
// GET ELIGIBLE STUDENTS FOR GUIDANCE SCHEDULING
// Secure RPC:
// get_guidance_eligible_students()
// ============================================================

export async function getGuidanceEligibleStudents() {
  try {
    const { data, error } =
      await supabase.rpc(
        "get_guidance_eligible_students"
      );

    if (error) throw error;

    const students = (data || []).map(
      (item) => ({
        id: item.clearance_step_id,

        clearanceStepId:
          item.clearance_step_id,

        requestId:
          item.clearance_request_id,

        studentId:
          item.student_user_id,

        student: {
          id: item.student_user_id,

          student_id:
            item.student_id,

          full_name:
            item.full_name,

          email:
            item.email,

          course:
            item.course,

          year_level:
            item.year_level,

          block:
            item.block,
        },

        section: item.section_id
          ? {
              id: item.section_id,

              course:
                item.section_course,

              year_level:
                item.section_year_level,

              block_code:
                item.section_block_code,
            }
          : null,

        schoolYear:
          item.school_year,

        semester:
          item.semester,

        requestStatus:
          item.request_status,

        requestedAt:
          item.requested_at,

        clearanceReference:
          item.clearance_reference,
      })
    );

    return {
      success: true,
      data: students,
    };
  } catch (err) {
    console.error(
      "getGuidanceEligibleStudents:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load eligible Guidance students.",
      data: [],
    };
  }
}

// ============================================================
// GET ALL GUIDANCE BATCHES
// ============================================================

export async function getGuidanceBatches() {
  try {
    const { data, error } = await supabase
      .from("guidance_batches")
      .select(`
        id,
        office_id,
        created_by,
        batch_name,
        school_year,
        semester,
        schedule_date,
        start_time,
        end_time,
        question,
        instructions,
        max_students,
        status,
        created_at,
        updated_at
      `)
      .order("schedule_date", {
        ascending: false,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error(
      "getGuidanceBatches:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance batches.",
      data: [],
    };
  }
}

// ============================================================
// GET SINGLE GUIDANCE BATCH
// ============================================================

export async function getGuidanceBatch(batchId) {
  try {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    const { data, error } = await supabase
      .from("guidance_batches")
      .select(`
        id,
        office_id,
        created_by,
        batch_name,
        school_year,
        semester,
        schedule_date,
        start_time,
        end_time,
        question,
        instructions,
        max_students,
        status,
        created_at,
        updated_at
      `)
      .eq("id", batchId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error(
      "getGuidanceBatch:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance batch.",
    };
  }
}

// ============================================================
// CREATE GUIDANCE BATCH
// ============================================================

export async function createGuidanceBatch(
  batchData
) {
  try {
    const userResult =
      await getCurrentGuidanceUser();

    if (!userResult.success) {
      throw new Error(
        userResult.error
      );
    }

    const officeResult =
      await getGuidanceOffice();

    if (!officeResult.success) {
      throw new Error(
        officeResult.error
      );
    }

    if (
      !batchData?.batch_name?.trim()
    ) {
      throw new Error(
        "Batch name is required."
      );
    }

    if (!batchData?.school_year) {
      throw new Error(
        "School year is required."
      );
    }

    if (!batchData?.semester) {
      throw new Error(
        "Semester is required."
      );
    }

    if (!batchData?.schedule_date) {
      throw new Error(
        "Schedule date is required."
      );
    }

    if (!batchData?.start_time) {
      throw new Error(
        "Start time is required."
      );
    }

    if (!batchData?.end_time) {
      throw new Error(
        "End time is required."
      );
    }

    if (
      !batchData?.question?.trim()
    ) {
      throw new Error(
        "Guidance question is required."
      );
    }

    if (
      batchData.end_time <=
      batchData.start_time
    ) {
      throw new Error(
        "End time must be later than start time."
      );
    }

    const maximumStudents = Number(
      batchData.max_students
    );

    if (
      !Number.isFinite(
        maximumStudents
      ) ||
      maximumStudents <= 0
    ) {
      throw new Error(
        "Maximum students must be greater than zero."
      );
    }

    const payload = {
      office_id:
        officeResult.data.id,

      created_by:
        userResult.data.id,

      batch_name:
        batchData.batch_name.trim(),

      school_year:
        batchData.school_year,

      semester:
        batchData.semester,

      schedule_date:
        batchData.schedule_date,

      start_time:
        batchData.start_time,

      end_time:
        batchData.end_time,

      question:
        batchData.question.trim(),

      instructions:
        batchData.instructions?.trim() ||
        null,

      max_students:
        maximumStudents,

      status:
        batchData.status ||
        "Draft",
    };

    const { data, error } = await supabase
      .from("guidance_batches")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        "Guidance batch created successfully.",
    };
  } catch (err) {
    console.error(
      "createGuidanceBatch:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to create Guidance batch.",
    };
  }
}

// ============================================================
// UPDATE GUIDANCE BATCH
// ============================================================

export async function updateGuidanceBatch(
  batchId,
  updates
) {
  try {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    const allowedFields = {
      batch_name:
        updates.batch_name,

      school_year:
        updates.school_year,

      semester:
        updates.semester,

      schedule_date:
        updates.schedule_date,

      start_time:
        updates.start_time,

      end_time:
        updates.end_time,

      question:
        updates.question,

      instructions:
        updates.instructions,

      max_students:
        updates.max_students,

      status:
        updates.status,
    };

    Object.keys(
      allowedFields
    ).forEach((key) => {
      if (
        allowedFields[key] ===
        undefined
      ) {
        delete allowedFields[key];
      }
    });

    if (
      allowedFields.batch_name
    ) {
      allowedFields.batch_name =
        allowedFields.batch_name.trim();
    }

    if (allowedFields.question) {
      allowedFields.question =
        allowedFields.question.trim();
    }

    if (
      typeof allowedFields.instructions ===
      "string"
    ) {
      allowedFields.instructions =
        allowedFields.instructions.trim() ||
        null;
    }

    if (
      allowedFields.max_students !==
      undefined
    ) {
      const maximumStudents = Number(
        allowedFields.max_students
      );

      if (
        !Number.isFinite(
          maximumStudents
        ) ||
        maximumStudents <= 0
      ) {
        throw new Error(
          "Maximum students must be greater than zero."
        );
      }

      allowedFields.max_students =
        maximumStudents;
    }

    if (
      allowedFields.start_time &&
      allowedFields.end_time &&
      allowedFields.end_time <=
        allowedFields.start_time
    ) {
      throw new Error(
        "End time must be later than start time."
      );
    }

    const { data, error } = await supabase
      .from("guidance_batches")
      .update(allowedFields)
      .eq("id", batchId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        "Guidance batch updated successfully.",
    };
  } catch (err) {
    console.error(
      "updateGuidanceBatch:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to update Guidance batch.",
    };
  }
}

// ============================================================
// GET STUDENTS INSIDE A GUIDANCE BATCH
// ============================================================

export async function getGuidanceBatchStudents(
  batchId
) {
  try {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    const { data, error } = await supabase
      .from(
        "guidance_batch_students"
      )
      .select(`
        id,
        batch_id,
        clearance_step_id,
        student_id,
        response,
        response_submitted_at,
        guidance_status,
        guidance_remarks,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,

        student:users!guidance_batch_students_student_id_fkey (
          id,
          student_id,
          full_name,
          email,
          course,
          year_level,
          block,
          semester,
          school_year
        )
      `)
      .eq("batch_id", batchId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error(
      "getGuidanceBatchStudents:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load students in this Guidance batch.",
      data: [],
    };
  }
}

// ============================================================
// ADD STUDENT TO GUIDANCE BATCH
// ============================================================

export async function addStudentToGuidanceBatch({
  batchId,
  clearanceStepId,
  studentId,
}) {
  try {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    if (!clearanceStepId) {
      throw new Error(
        "Clearance step ID is required."
      );
    }

    if (!studentId) {
      throw new Error(
        "Student ID is required."
      );
    }

    const batchResult =
      await getGuidanceBatch(
        batchId
      );

    if (!batchResult.success) {
      throw new Error(
        batchResult.error
      );
    }

    const batch =
      batchResult.data;

    if (
      batch.status ===
        "Completed" ||
      batch.status ===
        "Cancelled"
    ) {
      throw new Error(
        "Students cannot be added to this batch."
      );
    }

    const {
      count,
      error: countError,
    } = await supabase
      .from(
        "guidance_batch_students"
      )
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "batch_id",
        batchId
      );

    if (countError) {
      throw countError;
    }

    if (
      Number(count || 0) >=
      Number(
        batch.max_students
      )
    ) {
      throw new Error(
        "This Guidance batch is already full."
      );
    }

    const { data, error } = await supabase
      .from(
        "guidance_batch_students"
      )
      .insert({
        batch_id: batchId,

        clearance_step_id:
          clearanceStepId,

        student_id:
          studentId,

        guidance_status:
          "Scheduled",
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        "Student added to Guidance batch successfully.",
    };
  } catch (err) {
    console.error(
      "addStudentToGuidanceBatch:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to add student to Guidance batch.",
    };
  }
}

// ============================================================
// STUDENT - GET OWN GUIDANCE ASSIGNMENTS
// ============================================================

export async function getMyGuidanceAssignments() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      throw new Error(
        "User not logged in."
      );
    }

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("users")
      .select("id")
      .eq(
        "auth_id",
        user.id
      )
      .eq(
        "role",
        "Student"
      )
      .single();

    if (studentError) {
      throw studentError;
    }

    const { data, error } = await supabase
      .from(
        "guidance_batch_students"
      )
      .select(`
        id,
        batch_id,
        clearance_step_id,
        response,
        response_submitted_at,
        guidance_status,
        guidance_remarks,
        reviewed_at,

        batch:guidance_batches!guidance_batch_students_batch_id_fkey (
          id,
          batch_name,
          school_year,
          semester,
          schedule_date,
          start_time,
          end_time,
          question,
          instructions,
          status
        )
      `)
      .eq(
        "student_id",
        student.id
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error(
      "getMyGuidanceAssignments:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load your Guidance assignments.",
      data: [],
    };
  }
}

// ============================================================
// STUDENT - SUBMIT GUIDANCE RESPONSE
// Uses secure RPC created in Supabase
// ============================================================

export async function submitGuidanceResponse(
  batchStudentId,
  response
) {
  try {
    if (!batchStudentId) {
      throw new Error(
        "Guidance assignment ID is required."
      );
    }

    if (!response?.trim()) {
      throw new Error(
        "Please provide your answer."
      );
    }

    const { data, error } =
      await supabase.rpc(
        "submit_guidance_response",
        {
          p_batch_student_id:
            batchStudentId,

          p_response:
            response.trim(),
        }
      );

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        data?.message ||
        "Guidance response submitted successfully.",
    };
  } catch (err) {
    console.error(
      "submitGuidanceResponse:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to submit Guidance response.",
    };
  }
}

// ============================================================
// GUIDANCE - REVIEW ONE STUDENT
// ============================================================

export async function reviewGuidanceStudent(
  batchStudentId,
  decision,
  remarks = null
) {
  try {
    if (!batchStudentId) {
      throw new Error(
        "Guidance assignment ID is required."
      );
    }

    if (
      decision !==
        "Approved" &&
      decision !==
        "Needs Follow-up"
    ) {
      throw new Error(
        "Invalid Guidance decision."
      );
    }

    if (
      decision ===
        "Needs Follow-up" &&
      !remarks?.trim()
    ) {
      throw new Error(
        "Remarks are required for follow-up."
      );
    }

    const { data, error } =
      await supabase.rpc(
        "review_guidance_student",
        {
          p_batch_student_id:
            batchStudentId,

          p_decision:
            decision,

          p_remarks:
            remarks?.trim() ||
            null,
        }
      );

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        data?.message ||
        "Guidance review completed.",
    };
  } catch (err) {
    console.error(
      "reviewGuidanceStudent:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to complete Guidance review.",
    };
  }
}

// ============================================================
// GUIDANCE - APPROVE SELECTED STUDENTS
// ============================================================

export async function approveSelectedGuidanceStudents(
  batchStudentIds,
  remarks = null
) {
  try {
    if (
      !Array.isArray(
        batchStudentIds
      ) ||
      batchStudentIds.length ===
        0
    ) {
      throw new Error(
        "Please select at least one student."
      );
    }

    const { data, error } =
      await supabase.rpc(
        "approve_selected_guidance_students",
        {
          p_batch_student_ids:
            batchStudentIds,

          p_remarks:
            remarks?.trim() ||
            null,
        }
      );

    if (error) throw error;

    return {
      success: true,
      data,
      message:
        data?.message ||
        "Selected students approved successfully.",
    };
  } catch (err) {
    console.error(
      "approveSelectedGuidanceStudents:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to approve selected students.",
    };
  }
}
// ============================================================
// GUIDANCE ATTACHMENTS
// ============================================================

const GUIDANCE_ATTACHMENT_BUCKET = "guidance-attachments";

const GUIDANCE_ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

const GUIDANCE_MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// FILE VALIDATION
// ============================================================

function validateGuidanceAttachment(file) {
  if (!file) {
    throw new Error("Please select a file.");
  }

  if (!GUIDANCE_ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG, and PDF files are allowed."
    );
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > GUIDANCE_MAX_FILE_SIZE) {
    throw new Error(
      "The file must not exceed 10 MB."
    );
  }

  return true;
}

// ============================================================
// SAFE FILE NAME
// ============================================================

function createSafeGuidanceFileName(fileName) {
  const originalName =
    String(fileName || "attachment").trim();

  const lastDot =
    originalName.lastIndexOf(".");

  const extension =
    lastDot >= 0
      ? originalName
          .slice(lastDot)
          .toLowerCase()
      : "";

  const baseName =
    lastDot >= 0
      ? originalName.slice(0, lastDot)
      : originalName;

  const safeBaseName =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "attachment";

  const uniquePart = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  return `${uniquePart}-${safeBaseName}${extension}`;
}

// ============================================================
// STUDENT - GET CURRENT STUDENT PROFILE
// Internal helper for attachment operations
// ============================================================

async function getCurrentGuidanceStudent() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("User not logged in.");
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("users")
    .select(`
      id,
      auth_id,
      student_id,
      full_name,
      email,
      role,
      status
    `)
    .eq("auth_id", user.id)
    .eq("role", "Student")
    .eq("status", "Active")
    .single();

  if (studentError) {
    throw studentError;
  }

  if (!student) {
    throw new Error(
      "Active student profile not found."
    );
  }

  return student;
}

// ============================================================
// STUDENT - UPLOAD GUIDANCE ATTACHMENT
// ============================================================

export async function uploadGuidanceAttachment({
  batchStudentId,
  file,
}) {
  let uploadedPath = null;

  try {
    if (!batchStudentId) {
      throw new Error(
        "Guidance assignment ID is required."
      );
    }

    validateGuidanceAttachment(file);

    const student =
      await getCurrentGuidanceStudent();

    // --------------------------------------------------------
    // Verify that this assignment belongs to the student
    // and that attachments may still be modified.
    // --------------------------------------------------------

    const {
      data: assignment,
      error: assignmentError,
    } = await supabase
      .from("guidance_batch_students")
      .select(`
        id,
        student_id,
        guidance_status
      `)
      .eq("id", batchStudentId)
      .eq("student_id", student.id)
      .single();

    if (assignmentError) {
      throw assignmentError;
    }

    if (!assignment) {
      throw new Error(
        "Guidance assignment not found."
      );
    }

    if (
      ![
        "Scheduled",
        "Needs Follow-up",
      ].includes(assignment.guidance_status)
    ) {
      throw new Error(
        "Attachments can no longer be added to this Guidance requirement."
      );
    }

    // --------------------------------------------------------
    // Storage path:
    // student-user-id / batch-student-id / filename
    // --------------------------------------------------------

    const safeFileName =
      createSafeGuidanceFileName(
        file.name
      );

    uploadedPath =
      `${student.id}/${batchStudentId}/${safeFileName}`;

    // --------------------------------------------------------
    // Upload actual file
    // --------------------------------------------------------

    const {
      error: uploadError,
    } = await supabase.storage
      .from(
        GUIDANCE_ATTACHMENT_BUCKET
      )
      .upload(
        uploadedPath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    // --------------------------------------------------------
    // Save metadata
    // --------------------------------------------------------

    const {
      data: attachment,
      error: metadataError,
    } = await supabase
      .from("guidance_attachments")
      .insert({
        batch_student_id:
          batchStudentId,

        student_id:
          student.id,

        file_name:
          file.name,

        file_path:
          uploadedPath,

        file_type:
          file.type,

        file_size:
          file.size,
      })
      .select(`
        id,
        batch_student_id,
        student_id,
        file_name,
        file_path,
        file_type,
        file_size,
        created_at
      `)
      .single();

    if (metadataError) {
      // Storage upload succeeded but DB insert failed.
      // Remove the orphaned file.
      await supabase.storage
        .from(
          GUIDANCE_ATTACHMENT_BUCKET
        )
        .remove([uploadedPath]);

      uploadedPath = null;

      throw metadataError;
    }

    return {
      success: true,
      data: attachment,
      message:
        "Attachment uploaded successfully.",
    };
  } catch (err) {
    console.error(
      "uploadGuidanceAttachment:",
      err
    );

    // Extra cleanup protection
    if (uploadedPath) {
      try {
        const {
          data: existingRecord,
        } = await supabase
          .from(
            "guidance_attachments"
          )
          .select("id")
          .eq(
            "file_path",
            uploadedPath
          )
          .maybeSingle();

        if (!existingRecord) {
          await supabase.storage
            .from(
              GUIDANCE_ATTACHMENT_BUCKET
            )
            .remove([
              uploadedPath,
            ]);
        }
      } catch (cleanupError) {
        console.error(
          "Guidance attachment cleanup:",
          cleanupError
        );
      }
    }

    return {
      success: false,
      error:
        err?.message ||
        "Unable to upload Guidance attachment.",
    };
  }
}

// ============================================================
// GET ATTACHMENTS FOR A GUIDANCE ASSIGNMENT
//
// Works for:
// - Student: own assignment only via RLS
// - Guidance: assigned Guidance records via RLS
// ============================================================

export async function getGuidanceAttachments(
  batchStudentId
) {
  try {
    if (!batchStudentId) {
      throw new Error(
        "Guidance assignment ID is required."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("guidance_attachments")
      .select(`
        id,
        batch_student_id,
        student_id,
        file_name,
        file_path,
        file_type,
        file_size,
        created_at
      `)
      .eq(
        "batch_student_id",
        batchStudentId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error(
      "getGuidanceAttachments:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance attachments.",
      data: [],
    };
  }
}

// ============================================================
// CREATE PRIVATE SIGNED URL
// ============================================================

export async function getGuidanceAttachmentUrl(
  attachment
) {
  try {
    if (!attachment?.file_path) {
      throw new Error(
        "Attachment file path is required."
      );
    }

    const {
      data,
      error,
    } = await supabase.storage
      .from(
        GUIDANCE_ATTACHMENT_BUCKET
      )
      .createSignedUrl(
        attachment.file_path,
        60 * 10
      );

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error(
        "Unable to create attachment link."
      );
    }

    return {
      success: true,
      data: {
        ...attachment,
        signedUrl:
          data.signedUrl,
      },
    };
  } catch (err) {
    console.error(
      "getGuidanceAttachmentUrl:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to open Guidance attachment.",
    };
  }
}

// ============================================================
// LOAD ATTACHMENTS WITH PRIVATE SIGNED URLS
// ============================================================

export async function getGuidanceAttachmentsWithUrls(
  batchStudentId
) {
  try {
    const attachmentResult =
      await getGuidanceAttachments(
        batchStudentId
      );

    if (!attachmentResult.success) {
      throw new Error(
        attachmentResult.error
      );
    }

    const attachments =
      attachmentResult.data || [];

    if (attachments.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const results =
      await Promise.all(
        attachments.map(
          async (attachment) => {
            const urlResult =
              await getGuidanceAttachmentUrl(
                attachment
              );

            if (!urlResult.success) {
              return {
                ...attachment,
                signedUrl: null,
                urlError:
                  urlResult.error,
              };
            }

            return urlResult.data;
          }
        )
      );

    return {
      success: true,
      data: results,
    };
  } catch (err) {
    console.error(
      "getGuidanceAttachmentsWithUrls:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to load Guidance attachments.",
      data: [],
    };
  }
}

// ============================================================
// STUDENT - DELETE GUIDANCE ATTACHMENT
// ============================================================

export async function deleteGuidanceAttachment(
  attachmentId
) {
  try {
    if (!attachmentId) {
      throw new Error(
        "Attachment ID is required."
      );
    }

    const student =
      await getCurrentGuidanceStudent();

    // --------------------------------------------------------
    // Read record first.
    // RLS guarantees the student only sees their own.
    // --------------------------------------------------------

    const {
      data: attachment,
      error: attachmentError,
    } = await supabase
      .from("guidance_attachments")
      .select(`
        id,
        batch_student_id,
        student_id,
        file_name,
        file_path,
        file_type,
        file_size,
        created_at
      `)
      .eq(
        "id",
        attachmentId
      )
      .eq(
        "student_id",
        student.id
      )
      .single();

    if (attachmentError) {
      throw attachmentError;
    }

    if (!attachment) {
      throw new Error(
        "Attachment not found."
      );
    }

    // --------------------------------------------------------
    // Verify current assignment status.
    // --------------------------------------------------------

    const {
      data: assignment,
      error: assignmentError,
    } = await supabase
      .from(
        "guidance_batch_students"
      )
      .select(`
        id,
        guidance_status
      `)
      .eq(
        "id",
        attachment.batch_student_id
      )
      .eq(
        "student_id",
        student.id
      )
      .single();

    if (assignmentError) {
      throw assignmentError;
    }

    if (
      ![
        "Scheduled",
        "Needs Follow-up",
      ].includes(
        assignment.guidance_status
      )
    ) {
      throw new Error(
        "This attachment can no longer be deleted because the Guidance response has already been submitted."
      );
    }

    // --------------------------------------------------------
    // Delete Storage object first.
    // --------------------------------------------------------

    const {
      error: storageError,
    } = await supabase.storage
      .from(
        GUIDANCE_ATTACHMENT_BUCKET
      )
      .remove([
        attachment.file_path,
      ]);

    if (storageError) {
      throw storageError;
    }

    // --------------------------------------------------------
    // Delete metadata.
    // --------------------------------------------------------

    const {
      error: deleteError,
    } = await supabase
      .from("guidance_attachments")
      .delete()
      .eq(
        "id",
        attachment.id
      );

    if (deleteError) {
      throw deleteError;
    }

    return {
      success: true,
      data: attachment,
      message:
        "Attachment deleted successfully.",
    };
  } catch (err) {
    console.error(
      "deleteGuidanceAttachment:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Unable to delete Guidance attachment.",
    };
  }
}

// ============================================================
// FILE DISPLAY HELPERS
// ============================================================

export function formatGuidanceAttachmentSize(
  bytes
) {
  const size = Number(bytes || 0);

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export function isGuidanceAttachmentImage(
  attachment
) {
  return [
    "image/jpeg",
    "image/png",
  ].includes(
    attachment?.file_type
  );
}

export function isGuidanceAttachmentPdf(
  attachment
) {
  return (
    attachment?.file_type ===
    "application/pdf"
  );
}