import { supabase } from "./supabase";

/*
=====================================
REQUEST CLEARANCE
=====================================

The student ID, school year, and semester
parameters are retained for compatibility
with the existing RequestClearance page.

The secure database function determines
the actual student, section, semester,
and school year from the logged-in account.
=====================================
*/

export async function requestClearance(
  _studentId = null,
  _schoolYear = null,
  _semester = null
) {
  /*
  =====================================
  CHECK CURRENT AUTH SESSION
  =====================================
  */

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(
      authError.message ||
        "Unable to verify your login session."
    );
  }

  if (!user) {
    throw new Error(
      "Please log in before submitting a clearance request."
    );
  }

  /*
  =====================================
  CALL SECURE DATABASE FUNCTION
  =====================================

  The RPC automatically:

  - validates the logged-in student
  - checks account status
  - checks section_id
  - creates the clearance request
  - generates subject steps
  - generates office steps
  - assigns approvers
  - sends notifications
  =====================================
  */

  const {
    data,
    error,
  } = await supabase.rpc(
    "submit_clearance_request"
  );

  if (error) {
    console.error(
      "Submit clearance RPC error:",
      error
    );

    const errorMessage =
      error.message ||
      error.details ||
      error.hint ||
      "Unable to submit your clearance request.";

    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error(
      "The clearance request was not created."
    );
  }

  /*
  =====================================
  NORMALIZE RESPONSE
  =====================================
  */

  return {
    success: data.success === true,

    requestId:
      data.requestId ||
      data.request_id ||
      null,

    status:
      data.status ||
      "In Progress",

    sectionId:
      data.sectionId ||
      data.section_id ||
      null,

    schoolYear:
      data.schoolYear ||
      data.school_year ||
      null,

    semester:
      data.semester ||
      null,

    subjectStepCount:
      Number(
        data.subjectStepCount ??
          data.subject_step_count ??
          0
      ),

    officeStepCount:
      Number(
        data.officeStepCount ??
          data.office_step_count ??
          0
      ),

    stepCount:
      Number(
        data.stepCount ??
          data.step_count ??
          0
      ),
  };
}