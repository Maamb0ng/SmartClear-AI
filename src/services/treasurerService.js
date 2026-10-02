import { supabase } from "./supabase";

/*
=====================================
HELPERS
=====================================
*/

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const normalizeText = (value) => {
  return String(value || "").trim();
};

/*
=====================================
GET CURRENT TREASURER
=====================================
*/

export const getCurrentTreasurer = async () => {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const authUser = authData?.user;

  if (!authUser) {
    throw new Error("You are not logged in.");
  }

  const {
    data: user,
    error: userError,
  } = await supabase
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
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Treasurer account was not found."
    );
  }

  if (
    String(user.role || "").toLowerCase() !==
    "approver"
  ) {
    throw new Error(
      "This account is not an approver account."
    );
  }

  if (
    String(user.status || "").toLowerCase() !==
    "active"
  ) {
    throw new Error(
      "Your account is not active."
    );
  }

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("approver_assignments")
    .select(`
      id,
      office_id,
      is_active,
      offices!inner (
        id,
        office_name,
        office_code,
        is_active
      )
    `)
    .eq("approver_id", user.id)
    .eq("is_active", true)
    .eq("offices.is_active", true);

  if (assignmentError) {
    throw assignmentError;
  }

  const treasurerAssignment =
    normalizeArray(assignments).find(
      (assignment) => {
        const office =
          assignment?.offices;

        const code = String(
          office?.office_code || ""
        )
          .trim()
          .toLowerCase();

        const name = String(
          office?.office_name || ""
        )
          .trim()
          .toLowerCase();

        return (
          code === "fin" ||
          name.includes("treasurer") ||
          name.includes("finance")
        );
      }
    );

  if (!treasurerAssignment) {
    throw new Error(
      "No active Treasurer office assignment was found."
    );
  }

  return {
    user,
    assignment: treasurerAssignment,
    office: treasurerAssignment.offices,
  };
};

/*
=====================================
GET ELIGIBLE STUDENTS
=====================================

Returns students who:

- have a Pending Treasurer clearance step
- are Active students
- belong to the Treasurer office
- are not yet assigned to a batch
=====================================
*/

export const getTreasurerEligibleStudents =
  async () => {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_treasurer_eligible_students"
    );

    if (error) {
      throw error;
    }

    return normalizeArray(data);
  };

/*
=====================================
GET TREASURER BATCHES
=====================================
*/

export const getTreasurerBatches =
  async () => {
    const {
      data,
      error,
    } = await supabase
      .from("treasurer_batches")
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
        student_note,
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

    if (error) {
      throw error;
    }

    return normalizeArray(data);
  };

/*
=====================================
GET ONE TREASURER BATCH
=====================================
*/

export const getTreasurerBatch =
  async (batchId) => {
    if (!batchId) {
      throw new Error(
        "Treasurer batch ID is required."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("treasurer_batches")
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
        student_note,
        max_students,
        status,
        created_at,
        updated_at
      `)
      .eq("id", batchId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Treasurer batch was not found."
      );
    }

    return data;
  };

/*
=====================================
GET STUDENTS INSIDE BATCH
=====================================
*/

export const getTreasurerBatchStudents =
  async (batchId) => {
    if (!batchId) {
      throw new Error(
        "Treasurer batch ID is required."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("treasurer_batch_students")
      .select(`
        id,
        batch_id,
        clearance_step_id,
        student_id,
        financial_status,
        balance_amount,
        treasurer_remarks,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,

        users!treasurer_batch_students_student_id_fkey (
          id,
          student_id,
          full_name,
          email,
          course,
          year_level,
          section,
          semester,
          school_year
        )
      `)
      .eq("batch_id", batchId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return normalizeArray(data);
  };

/*
=====================================
CREATE TREASURER BATCH
=====================================
*/

export const createTreasurerBatch =
  async ({
    batchName,
    schoolYear,
    semester,
    scheduleDate,
    startTime,
    endTime,
    studentNote = "",
    maxStudents = 30,
    clearanceStepIds = [],
  }) => {
    const cleanBatchName =
      normalizeText(batchName);

    const cleanSchoolYear =
      normalizeText(schoolYear);

    const cleanSemester =
      normalizeText(semester);

    const cleanScheduleDate =
      normalizeText(scheduleDate);

    const cleanStartTime =
      normalizeText(startTime);

    const cleanEndTime =
      normalizeText(endTime);

    const cleanStudentNote =
      normalizeText(studentNote);

    const selectedIds = [
      ...new Set(
        normalizeArray(
          clearanceStepIds
        ).filter(Boolean)
      ),
    ];

    if (!cleanBatchName) {
      throw new Error(
        "Batch name is required."
      );
    }

    if (!cleanSchoolYear) {
      throw new Error(
        "School year is required."
      );
    }

    if (!cleanSemester) {
      throw new Error(
        "Semester is required."
      );
    }

    if (!cleanScheduleDate) {
      throw new Error(
        "Schedule date is required."
      );
    }

    if (!cleanStartTime) {
      throw new Error(
        "Start time is required."
      );
    }

    if (!cleanEndTime) {
      throw new Error(
        "End time is required."
      );
    }

    const capacity =
      Number(maxStudents);

    if (
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      throw new Error(
        "Maximum students must be greater than zero."
      );
    }

    if (selectedIds.length === 0) {
      throw new Error(
        "Select at least one student."
      );
    }

    if (
      selectedIds.length > capacity
    ) {
      throw new Error(
        "Selected students exceed the batch capacity."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "create_treasurer_batch",
      {
        p_batch_name:
          cleanBatchName,

        p_school_year:
          cleanSchoolYear,

        p_semester:
          cleanSemester,

        p_schedule_date:
          cleanScheduleDate,

        p_start_time:
          cleanStartTime,

        p_end_time:
          cleanEndTime,

        p_student_note:
          cleanStudentNote || null,

        p_max_students:
          capacity,

        p_clearance_step_ids:
          selectedIds,
      }
    );

    if (error) {
      throw error;
    }

    return data;
  };

/*
=====================================
REVIEW STUDENT
=====================================

Allowed decisions:

Cleared
With Balance
Needs Action
=====================================
*/

export const reviewTreasurerStudent =
  async ({
    batchStudentId,
    decision,
    balanceAmount = null,
    remarks = "",
  }) => {
    if (!batchStudentId) {
      throw new Error(
        "Batch student ID is required."
      );
    }

    const allowedDecisions = [
      "Cleared",
      "With Balance",
      "Needs Action",
    ];

    if (
      !allowedDecisions.includes(
        decision
      )
    ) {
      throw new Error(
        "Invalid Treasurer decision."
      );
    }

    let normalizedBalance = null;

    if (
      balanceAmount !== null &&
      balanceAmount !== undefined &&
      balanceAmount !== ""
    ) {
      normalizedBalance =
        Number(balanceAmount);

      if (
        Number.isNaN(
          normalizedBalance
        ) ||
        normalizedBalance < 0
      ) {
        throw new Error(
          "Balance amount must be a valid number."
        );
      }
    }

    if (
      decision === "With Balance" &&
      (
        normalizedBalance === null ||
        normalizedBalance <= 0
      )
    ) {
      throw new Error(
        "Enter the student's outstanding balance."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "review_treasurer_student",
      {
        p_batch_student_id:
          batchStudentId,

        p_decision:
          decision,

        p_balance_amount:
          decision === "Cleared"
            ? 0
            : normalizedBalance,

        p_remarks:
          normalizeText(remarks) ||
          null,
      }
    );

    if (error) {
      throw error;
    }

    return data;
  };

/*
=====================================
UPDATE BATCH STATUS
=====================================
*/

export const updateTreasurerBatchStatus =
  async (
    batchId,
    status
  ) => {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    const allowedStatuses = [
      "Draft",
      "Open",
      "Closed",
      "Completed",
      "Cancelled",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw new Error(
        "Invalid batch status."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("treasurer_batches")
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", batchId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

/*
=====================================
UPDATE BATCH SCHEDULE / NOTE
=====================================
*/

export const updateTreasurerBatch =
  async (
    batchId,
    {
      batchName,
      scheduleDate,
      startTime,
      endTime,
      studentNote,
      maxStudents,
    }
  ) => {
    if (!batchId) {
      throw new Error(
        "Batch ID is required."
      );
    }

    const updates = {
      updated_at:
        new Date().toISOString(),
    };

    if (
      batchName !== undefined
    ) {
      const value =
        normalizeText(batchName);

      if (!value) {
        throw new Error(
          "Batch name cannot be empty."
        );
      }

      updates.batch_name = value;
    }

    if (
      scheduleDate !== undefined
    ) {
      updates.schedule_date =
        normalizeText(
          scheduleDate
        );
    }

    if (
      startTime !== undefined
    ) {
      updates.start_time =
        normalizeText(startTime);
    }

    if (
      endTime !== undefined
    ) {
      updates.end_time =
        normalizeText(endTime);
    }

    if (
      studentNote !== undefined
    ) {
      updates.student_note =
        normalizeText(studentNote) ||
        null;
    }

    if (
      maxStudents !== undefined
    ) {
      const capacity =
        Number(maxStudents);

      if (
        !Number.isInteger(
          capacity
        ) ||
        capacity <= 0
      ) {
        throw new Error(
          "Maximum students must be greater than zero."
        );
      }

      updates.max_students =
        capacity;
    }

    const {
      data,
      error,
    } = await supabase
      .from("treasurer_batches")
      .update(updates)
      .eq("id", batchId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

/*
=====================================
GET STUDENT'S OWN TREASURER SCHEDULE
=====================================

Used later on Student Clearance Status
to display:

- scheduled date
- time
- Treasurer note
- financial clearance status
- balance / action message
=====================================
*/

export const getMyTreasurerSchedule =
  async () => {
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    const authUser =
      authData?.user;

    if (!authUser) {
      throw new Error(
        "You are not logged in."
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
        authUser.id
      )
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      throw new Error(
        "Student account was not found."
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "treasurer_batch_students"
      )
      .select(`
        id,
        financial_status,
        balance_amount,
        treasurer_remarks,
        reviewed_at,

        treasurer_batches!inner (
          id,
          batch_name,
          school_year,
          semester,
          schedule_date,
          start_time,
          end_time,
          student_note,
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

    if (error) {
      throw error;
    }

    return normalizeArray(data);
  };