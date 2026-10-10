import { supabase } from "./supabase";

/*
=========================================================
HELPERS
=========================================================
*/

const clean = (value) =>
  String(value ?? "").trim();

function formatYearLevel(value) {
  const raw = clean(value);

  if (!raw) return "—";

  if (
    raw.toLowerCase().includes("year")
  ) {
    return raw;
  }

  const labels = {
    1: "1st Year",
    2: "2nd Year",
    3: "3rd Year",
    4: "4th Year",
    5: "5th Year",
  };

  return labels[raw] || raw;
}

function toOfficeUiStatus(value) {
  const raw = clean(value);

  if (
    raw.toLowerCase() === "rejected"
  ) {
    return "Needs Action";
  }

  return raw || "Pending";
}

function toDatabaseStepStatus(value) {
  const raw = clean(value);

  if (raw === "Approved") {
    return "Approved";
  }

  if (raw === "Needs Action") {
    return "Rejected";
  }

  throw new Error(
    'Status must be "Approved" or "Needs Action".'
  );
}

/*
=========================================================
AUTHENTICATED OFFICE STAFF
=========================================================
*/

async function getAuthenticatedOfficeStaff() {
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
    data: profile,
    error,
  } = await supabase
    .from("users")
    .select(`
      id,
      auth_id,
      full_name,
      email,
      employee_id,
      role,
      status,
      approver_type
    `)
    .eq("auth_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error(
      "Office Staff profile not found."
    );
  }

  if (
    clean(profile.role).toLowerCase() !==
    "approver"
  ) {
    throw new Error(
      "This account is not an approver."
    );
  }

  const approverType = clean(
    profile.approver_type
  ).toLowerCase();

  if (
    !["office", "faculty"].includes(
      approverType
    )
  ) {
    throw new Error(
      "This account is not authorized for office clearance responsibilities."
    );
  }

  return profile;
}

/*
=========================================================
OFFICE STAFF CONTEXT
=========================================================
*/

export async function getOfficeStaffContext() {
  const profile =
    await getAuthenticatedOfficeStaff();

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from("approver_assignments")
    .select(`
      id,
      approver_id,
      office_id,
      is_active
    `)
    .eq(
      "approver_id",
      profile.id
    )
    .eq("is_active", true)
    .not(
      "office_id",
      "is",
      null
    );

  if (assignmentError) {
    throw assignmentError;
  }

  const assignedOfficeIds = [
    ...new Set(
      (assignments || [])
        .map(
          (assignment) =>
            assignment.office_id
        )
        .filter(Boolean)
    ),
  ];

  if (
    !assignedOfficeIds.length
  ) {
    return {
      profile,
      assignments: [],
      offices: [],
      officeIds: [],
      primaryOffice: null,
    };
  }

  const {
    data: offices,
    error: officeError,
  } = await supabase
    .from("offices")
    .select(`
      id,
      office_name,
      office_code,
      description,
      is_active
    `)
    .in(
      "id",
      assignedOfficeIds
    );

  if (officeError) {
    throw officeError;
  }

  const activeOffices = (
    offices || []
  ).filter(
    (office) =>
      office.is_active !== false
  );

  return {
    profile,

    assignments:
      assignments || [],

    offices:
      activeOffices,

    officeIds:
      activeOffices.map(
        (office) => office.id
      ),

    primaryOffice:
      activeOffices[0] || null,
  };
}

/*
=========================================================
OFFICE STUDENT QUEUE
=========================================================
*/

export async function getOfficeStudentQueue() {
  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    return {
      ...context,
      students: [],
    };
  }

  const {
    data: steps,
    error: stepsError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .in(
      "office_id",
      context.officeIds
    );

  if (stepsError) {
    throw stepsError;
  }

  const queueSteps = (
    steps || []
  ).filter(
    (step) =>
      clean(
        step.status
      ).toLowerCase() !==
      "approved"
  );

  if (!queueSteps.length) {
    return {
      ...context,
      students: [],
    };
  }

  const requestIds = [
    ...new Set(
      queueSteps
        .map(
          (step) =>
            step.clearance_request_id
        )
        .filter(Boolean)
    ),
  ];

  const {
    data: requests,
    error: requestError,
  } = await supabase
    .from("clearance_requests")
    .select(`
      id,
      student_id,
      section_id,
      school_year,
      semester,
      status,
      remarks,
      requested_at,
      updated_at
    `)
    .in("id", requestIds);

  if (requestError) {
    throw requestError;
  }

  const requestMap = new Map(
    (requests || []).map(
      (request) => [
        request.id,
        request,
      ]
    )
  );

  const studentIds = [
    ...new Set(
      (requests || [])
        .map(
          (request) =>
            request.student_id
        )
        .filter(Boolean)
    ),
  ];

  let students = [];

  if (studentIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        student_id,
        course,
        year_level,
        section_id,
        section,
        block,
        semester,
        school_year,
        status
      `)
      .in(
        "id",
        studentIds
      );

    if (error) {
      throw error;
    }

    students = data || [];
  }

  const studentMap = new Map(
    students.map(
      (student) => [
        student.id,
        student,
      ]
    )
  );

  const sectionIds = [
    ...new Set(
      (requests || [])
        .map(
          (request) =>
            request.section_id
        )
        .filter(Boolean)
    ),
  ];

  let sections = [];

  if (sectionIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("sections")
      .select(`
        id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      `)
      .in(
        "id",
        sectionIds
      );

    if (error) {
      throw error;
    }

    sections = data || [];
  }

  const sectionMap = new Map(
    sections.map(
      (section) => [
        section.id,
        section,
      ]
    )
  );

  const officeMap = new Map(
    context.offices.map(
      (office) => [
        office.id,
        office,
      ]
    )
  );

  const mappedStudents =
    queueSteps
      .map((step) => {
        const request =
          requestMap.get(
            step.clearance_request_id
          );

        if (!request) {
          return null;
        }

        const student =
          studentMap.get(
            request.student_id
          );

        if (!student) {
          return null;
        }

        const section =
          request.section_id
            ? sectionMap.get(
                request.section_id
              )
            : null;

        const office =
          officeMap.get(
            step.office_id
          );

        const rawStatus =
          clean(step.status) ||
          "Pending";

        return {
          id: step.id,

          stepId: step.id,

          requestId:
            request.id,

          studentUserId:
            student.id,

          studentId:
            student.student_id ||
            "—",

          name:
            student.full_name ||
            "Student",

          studentName:
            student.full_name ||
            "Student",

          email:
            student.email || "",

          course:
            section?.course ||
            student.course ||
            "—",

          yearLevel:
            formatYearLevel(
              section?.year_level ||
                student.year_level
            ),

          section:
            clean(
              section?.block_code
            ) ||
            clean(
              student.block
            ) ||
            clean(
              student.section
            ) ||
            "—",

          semester:
            request.semester ||
            student.semester ||
            "—",

          schoolYear:
            request.school_year ||
            student.school_year ||
            "—",

          officeId:
            step.office_id,

          officeName:
            office?.office_name ||
            "Office",

          officeCode:
            office?.office_code ||
            "",

          status:
            toOfficeUiStatus(
              rawStatus
            ),

          rawStatus,

          remarks:
            step.remarks || "",

          reviewedAt:
            step.reviewed_at ||
            null,

          requestedAt:
            request.requested_at ||
            null,

          requestStatus:
            request.status ||
            "",

          batch: null,

          schedule: null,

          time: null,
        };
      })
      .filter(Boolean);

  mappedStudents.sort(
    (a, b) => {
      const aDate =
        a.requestedAt
          ? new Date(
              a.requestedAt
            ).getTime()
          : 0;

      const bDate =
        b.requestedAt
          ? new Date(
              b.requestedAt
            ).getTime()
          : 0;

      return bDate - aDate;
    }
  );

  return {
    ...context,

    students:
      mappedStudents,
  };
}

/*
=========================================================
REVIEWED OFFICE STUDENTS
=========================================================
*/

export async function getOfficeReviewedStudents() {
  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    return {
      ...context,
      students: [],
    };
  }

  const {
    data: steps,
    error: stepsError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .in(
      "office_id",
      context.officeIds
    )
    .in(
      "status",
      [
        "Approved",
        "Rejected",
      ]
    )
    .not(
      "reviewed_at",
      "is",
      null
    )
    .order(
      "reviewed_at",
      {
        ascending: false,
      }
    );

  if (stepsError) {
    throw stepsError;
  }

  const reviewedSteps =
    steps || [];

  if (!reviewedSteps.length) {
    return {
      ...context,
      students: [],
    };
  }

  const requestIds = [
    ...new Set(
      reviewedSteps
        .map(
          (step) =>
            step.clearance_request_id
        )
        .filter(Boolean)
    ),
  ];

  const {
    data: requests,
    error: requestError,
  } = await supabase
    .from("clearance_requests")
    .select(`
      id,
      student_id,
      section_id,
      school_year,
      semester,
      status,
      requested_at,
      updated_at
    `)
    .in(
      "id",
      requestIds
    );

  if (requestError) {
    throw requestError;
  }

  const requestMap = new Map(
    (requests || []).map(
      (request) => [
        request.id,
        request,
      ]
    )
  );

  const studentIds = [
    ...new Set(
      (requests || [])
        .map(
          (request) =>
            request.student_id
        )
        .filter(Boolean)
    ),
  ];

  let students = [];

  if (studentIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        student_id,
        course,
        year_level,
        section_id,
        section,
        block,
        semester,
        school_year
      `)
      .in(
        "id",
        studentIds
      );

    if (error) {
      throw error;
    }

    students = data || [];
  }

  const studentMap = new Map(
    students.map(
      (student) => [
        student.id,
        student,
      ]
    )
  );

  const sectionIds = [
    ...new Set(
      (requests || [])
        .map(
          (request) =>
            request.section_id
        )
        .filter(Boolean)
    ),
  ];

  let sections = [];

  if (sectionIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("sections")
      .select(`
        id,
        course,
        year_level,
        block_code,
        school_year,
        semester
      `)
      .in(
        "id",
        sectionIds
      );

    if (error) {
      throw error;
    }

    sections = data || [];
  }

  const sectionMap = new Map(
    sections.map(
      (section) => [
        section.id,
        section,
      ]
    )
  );

  const reviewerIds = [
    ...new Set(
      reviewedSteps
        .map(
          (step) =>
            step.approver_id
        )
        .filter(Boolean)
    ),
  ];

  let reviewers = [];

  if (reviewerIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        employee_id
      `)
      .in(
        "id",
        reviewerIds
      );

    if (error) {
      throw error;
    }

    reviewers = data || [];
  }

  const reviewerMap =
    new Map(
      reviewers.map(
        (reviewer) => [
          reviewer.id,
          reviewer,
        ]
      )
    );

  const officeMap =
    new Map(
      context.offices.map(
        (office) => [
          office.id,
          office,
        ]
      )
    );

  const mappedStudents =
    reviewedSteps
      .map((step) => {
        const request =
          requestMap.get(
            step.clearance_request_id
          );

        if (!request) {
          return null;
        }

        const student =
          studentMap.get(
            request.student_id
          );

        if (!student) {
          return null;
        }

        const section =
          request.section_id
            ? sectionMap.get(
                request.section_id
              )
            : null;

        const reviewer =
          step.approver_id
            ? reviewerMap.get(
                step.approver_id
              )
            : null;

        const office =
          officeMap.get(
            step.office_id
          );

        return {
          id:
            step.id,

          stepId:
            step.id,

          requestId:
            request.id,

          studentUserId:
            student.id,

          studentId:
            student.student_id ||
            "—",

          name:
            student.full_name ||
            "Student",

          studentName:
            student.full_name ||
            "Student",

          email:
            student.email || "",

          course:
            section?.course ||
            student.course ||
            "—",

          yearLevel:
            formatYearLevel(
              section?.year_level ||
                student.year_level
            ),

          section:
            clean(
              section?.block_code
            ) ||
            clean(
              student.block
            ) ||
            clean(
              student.section
            ) ||
            "—",

          semester:
            request.semester ||
            student.semester ||
            "—",

          schoolYear:
            request.school_year ||
            student.school_year ||
            "—",

          officeId:
            step.office_id,

          officeName:
            office?.office_name ||
            "Office",

          officeCode:
            office?.office_code ||
            "",

          status:
            toOfficeUiStatus(
              step.status
            ),

          rawStatus:
            step.status,

          remarks:
            step.remarks || "",

          reviewedAt:
            step.reviewed_at,

          reviewerId:
            reviewer?.id || null,

          reviewerName:
            reviewer?.full_name ||
            "—",

          reviewerEmployeeId:
            reviewer?.employee_id ||
            "",

          requestStatus:
            request.status || "",

          requestedAt:
            request.requested_at ||
            null,
        };
      })
      .filter(Boolean);

  return {
    ...context,

    students:
      mappedStudents,
  };
}
/*
=========================================================
OFFICE REQUIREMENTS
=========================================================
*/

export async function getOfficeRequirements(
  officeId = null,
  {
    includeInactive = false,
  } = {}
) {
  const context =
    await getOfficeStaffContext();

  const targetOfficeId =
    officeId ||
    context.primaryOffice?.id ||
    null;

  if (!targetOfficeId) {
    return {
      ...context,
      requirements: [],
    };
  }

  if (
    !context.officeIds.includes(
      targetOfficeId
    )
  ) {
    throw new Error(
      "This office is not assigned to the logged-in Office Staff account."
    );
  }

  let query = supabase
    .from("office_requirements")
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
      is_active,
      created_at,
      updated_at
    `)
    .eq(
      "office_id",
      targetOfficeId
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (!includeInactive) {
    query = query.eq(
      "is_active",
      true
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return {
    ...context,
    requirements:
      data || [],
  };
}

/*
=========================================================
CREATE OFFICE REQUIREMENT
=========================================================
*/

export async function createOfficeRequirement({
  officeId = null,
  requirementType = "Requirement",
  title,
  description = "",
  responseType = null,
  isRequired = false,
  isActive = true,
}) {
  const context =
    await getOfficeStaffContext();

  const targetOfficeId =
    officeId ||
    context.primaryOffice?.id ||
    null;

  if (!targetOfficeId) {
    throw new Error(
      "No active office assignment found."
    );
  }

  if (
    !context.officeIds.includes(
      targetOfficeId
    )
  ) {
    throw new Error(
      "You cannot create a requirement for an office that is not assigned to your account."
    );
  }

  const normalizedType =
    clean(requirementType);

  if (
    ![
      "Requirement",
      "Question",
    ].includes(normalizedType)
  ) {
    throw new Error(
      'Requirement type must be "Requirement" or "Question".'
    );
  }

  const normalizedTitle =
    clean(title);

  if (!normalizedTitle) {
    throw new Error(
      "Requirement title is required."
    );
  }

  const normalizedResponseType =
    normalizedType ===
    "Question"
      ? "yes-no"
      : "check";

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("office_requirements")
    .insert({
      office_id:
        targetOfficeId,

      requirement_type:
        normalizedType,

      title:
        normalizedTitle,

      description:
        clean(description) ||
        null,

      response_type:
        responseType
          ? clean(responseType)
          : normalizedResponseType,

      is_required:
        Boolean(isRequired),

      is_active:
        Boolean(isActive),

      created_at:
        now,

      updated_at:
        now,
    })
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
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
=========================================================
UPDATE OFFICE REQUIREMENT
=========================================================
*/

export async function updateOfficeRequirement({
  requirementId,
  requirementType,
  title,
  description,
  responseType,
  isRequired,
  isActive,
}) {
  if (!requirementId) {
    throw new Error(
      "Requirement ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("office_requirements")
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
      is_active
    `)
    .eq(
      "id",
      requirementId
    )
    .in(
      "office_id",
      context.officeIds
    )
    .single();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error(
      "Requirement not found or does not belong to your office."
    );
  }

  const finalType =
    requirementType !==
    undefined
      ? clean(
          requirementType
        )
      : existing.requirement_type;

  if (
    ![
      "Requirement",
      "Question",
    ].includes(finalType)
  ) {
    throw new Error(
      'Requirement type must be "Requirement" or "Question".'
    );
  }

  const finalTitle =
    title !== undefined
      ? clean(title)
      : existing.title;

  if (!finalTitle) {
    throw new Error(
      "Requirement title is required."
    );
  }

  const finalResponseType =
    finalType === "Question"
      ? "yes-no"
      : "check";

  const payload = {
    requirement_type:
      finalType,

    title:
      finalTitle,

    description:
      description !==
      undefined
        ? clean(description) ||
          null
        : existing.description,

    response_type:
      responseType !==
      undefined
        ? clean(
            responseType
          ) ||
          finalResponseType
        : finalResponseType,

    is_required:
      isRequired !==
      undefined
        ? Boolean(
            isRequired
          )
        : existing.is_required,

    is_active:
      isActive !==
      undefined
        ? Boolean(
            isActive
          )
        : existing.is_active,

    updated_at:
      new Date().toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from("office_requirements")
    .update(payload)
    .eq(
      "id",
      existing.id
    )
    .eq(
      "office_id",
      existing.office_id
    )
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
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
=========================================================
ENABLE / DISABLE OFFICE REQUIREMENT
=========================================================
*/

export async function setOfficeRequirementStatus({
  requirementId,
  isActive,
}) {
  if (!requirementId) {
    throw new Error(
      "Requirement ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  const {
    data,
    error,
  } = await supabase
    .from("office_requirements")
    .update({
      is_active:
        Boolean(isActive),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      requirementId
    )
    .in(
      "office_id",
      context.officeIds
    )
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
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
=========================================================
DELETE OFFICE REQUIREMENT
=========================================================
*/

export async function deleteOfficeRequirement(
  requirementId
) {
  if (!requirementId) {
    throw new Error(
      "Requirement ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const {
    data: requirement,
    error: requirementError,
  } = await supabase
    .from("office_requirements")
    .select(`
      id,
      office_id,
      title,
      is_active
    `)
    .eq(
      "id",
      requirementId
    )
    .in(
      "office_id",
      context.officeIds
    )
    .single();

  if (requirementError) {
    throw requirementError;
  }

  if (!requirement) {
    throw new Error(
      "Requirement not found or does not belong to your office."
    );
  }

  const {
    count,
    error: countError,
  } = await supabase
    .from(
      "office_requirement_responses"
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "requirement_id",
      requirement.id
    );

  if (countError) {
    throw countError;
  }

  if (
    Number(count || 0) > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "office_requirements"
      )
      .update({
        is_active: false,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        requirement.id
      )
      .select(`
        id,
        office_id,
        requirement_type,
        title,
        description,
        response_type,
        is_required,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      archived: true,
      requirement: data,
    };
  }

  const {
    error: deleteError,
  } = await supabase
    .from("office_requirements")
    .delete()
    .eq(
      "id",
      requirement.id
    )
    .eq(
      "office_id",
      requirement.office_id
    );

  if (deleteError) {
    throw deleteError;
  }

  return {
    success: true,
    archived: false,
    requirementId:
      requirement.id,
  };
}

/*
=========================================================
GET EXACT OFFICE STUDENT REVIEW
=========================================================
*/

export async function getOfficeStudentReview(
  stepId
) {
  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const {
    data: step,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .eq("id", stepId)
    .in(
      "office_id",
      context.officeIds
    )
    .single();

  if (stepError) {
    throw stepError;
  }

  if (!step) {
    throw new Error(
      "Clearance step not found or does not belong to your office."
    );
  }

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from("clearance_requests")
    .select(`
      id,
      student_id,
      section_id,
      school_year,
      semester,
      status,
      remarks,
      requested_at,
      updated_at,
      completed_at,
      clearance_reference,
      verification_status
    `)
    .eq(
      "id",
      step.clearance_request_id
    )
    .single();

  if (requestError) {
    throw requestError;
  }

  if (!request) {
    throw new Error(
      "Clearance request not found."
    );
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("users")
    .select(`
      id,
      full_name,
      email,
      student_id,
      course,
      year_level,
      section_id,
      section,
      block,
      semester,
      school_year,
      status
    `)
    .eq(
      "id",
      request.student_id
    )
    .single();

  if (studentError) {
    throw studentError;
  }

  let section = null;

  if (request.section_id) {
    const {
      data,
      error,
    } = await supabase
      .from("sections")
      .select(`
        id,
        course,
        year_level,
        block_code,
        school_year,
        semester,
        is_active
      `)
      .eq(
        "id",
        request.section_id
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    section = data || null;
  }

  const office =
    context.offices.find(
      (item) =>
        item.id ===
        step.office_id
    ) || null;

  if (!office) {
    throw new Error(
      "Assigned office not found."
    );
  }

  const {
    data: requirements,
    error: requirementError,
  } = await supabase
    .from("office_requirements")
    .select(`
      id,
      office_id,
      requirement_type,
      title,
      description,
      response_type,
      is_required,
      is_active,
      created_at,
      updated_at
    `)
    .eq(
      "office_id",
      step.office_id
    )
    .eq(
      "is_active",
      true
    )
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (requirementError) {
    throw requirementError;
  }

  const requirementIds =
    (requirements || []).map(
      (requirement) =>
        requirement.id
    );

  let responses = [];

  if (requirementIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "office_requirement_responses"
      )
      .select(`
        id,
        clearance_step_id,
        requirement_id,
        response_value,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      `)
      .eq(
        "clearance_step_id",
        step.id
      )
      .in(
        "requirement_id",
        requirementIds
      );

    if (error) {
      throw error;
    }

    responses = data || [];
  }

  const responseMap =
    new Map(
      responses.map(
        (response) => [
          response.requirement_id,
          response,
        ]
      )
    );

  const mappedRequirements =
    (requirements || []).map(
      (requirement) => {
        const response =
          responseMap.get(
            requirement.id
          );

        return {
          ...requirement,

          response:
            response || null,

          responseValue:
            response
              ?.response_value ??
            "",
        };
      }
    );

  let reviewer = null;

  if (step.approver_id) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        employee_id,
        email
      `)
      .eq(
        "id",
        step.approver_id
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    reviewer = data || null;
  }

  /*
  =========================================================
  LOAD ASSIGNED BATCH / SCHEDULE
  =========================================================
  */

  let batch = null;

  const {
    data: batchAssignments,
    error: batchAssignmentError,
  } = await supabase
    .from("office_batch_students")
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `)
    .eq(
      "clearance_step_id",
      step.id
    )
    .order(
      "assigned_at",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (batchAssignmentError) {
    throw batchAssignmentError;
  }

  const batchAssignment =
    batchAssignments?.[0] || null;

  if (batchAssignment?.batch_id) {
    const {
      data: batchData,
      error: batchError,
    } = await supabase
      .from("office_batches")
      .select(`
        id,
        office_id,
        created_by,
        batch_name,
        schedule_date,
        start_time,
        end_time,
        note,
        capacity,
        status,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        batchAssignment.batch_id
      )
      .eq(
        "office_id",
        step.office_id
      )
      .maybeSingle();

    if (batchError) {
      throw batchError;
    }

    if (batchData) {
      batch = {
        id:
          batchData.id,

        officeId:
          batchData.office_id,

        name:
          batchData.batch_name,

        batchName:
          batchData.batch_name,

        date:
          batchData.schedule_date,

        scheduleDate:
          batchData.schedule_date,

        startTime:
          batchData.start_time,

        endTime:
          batchData.end_time,

        note:
          batchData.note || "",

        capacity:
          batchData.capacity,

        status:
          batchData.status,

        assignedAt:
          batchAssignment.assigned_at,
      };
    }
  }

  return {
    ...context,

    office,

    student: {
      id:
        student.id,

      studentUserId:
        student.id,

      studentId:
        student.student_id ||
        "—",

      name:
        student.full_name ||
        "Student",

      studentName:
        student.full_name ||
        "Student",

      email:
        student.email || "",

      course:
        section?.course ||
        student.course ||
        "—",

      yearLevel:
        formatYearLevel(
          section?.year_level ||
            student.year_level
        ),

      section:
        clean(
          section?.block_code
        ) ||
        clean(
          student.block
        ) ||
        clean(
          student.section
        ) ||
        "—",

      semester:
        request.semester ||
        student.semester ||
        "—",

      schoolYear:
        request.school_year ||
        student.school_year ||
        "—",
    },

    request,

    step: {
      ...step,

      rawStatus:
        step.status,

      displayStatus:
        toOfficeUiStatus(
          step.status
        ),
    },

    reviewer,

    requirements:
      mappedRequirements,

    batch,

    schedule: batch
      ? {
          batchId:
            batch.id,

          batchName:
            batch.name,

          date:
            batch.date,

          scheduleDate:
            batch.scheduleDate,

          startTime:
            batch.startTime,

          endTime:
            batch.endTime,

          note:
            batch.note,

          status:
            batch.status,

          assignedAt:
            batch.assignedAt,
        }
      : null,
  };
}

/*
=========================================================
SAVE OFFICE REQUIREMENT RESPONSES
=========================================================
*/

export async function saveOfficeRequirementResponses({
  stepId,
  responses = [],
}) {
  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const {
    data: step,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      office_id,
      status
    `)
    .eq(
      "id",
      stepId
    )
    .in(
      "office_id",
      context.officeIds
    )
    .single();

  if (stepError) {
    throw stepError;
  }

  if (!step) {
    throw new Error(
      "Clearance step not found or does not belong to your office."
    );
  }

  if (!responses.length) {
    return {
      success: true,
      responses: [],
    };
  }

  const requirementIds = [
    ...new Set(
      responses
        .map(
          (response) =>
            response.requirementId
        )
        .filter(Boolean)
    ),
  ];

  if (!requirementIds.length) {
    return {
      success: true,
      responses: [],
    };
  }

  const {
    data: requirements,
    error: requirementError,
  } = await supabase
    .from("office_requirements")
    .select(`
      id,
      office_id,
      response_type,
      is_active
    `)
    .in(
      "id",
      requirementIds
    )
    .eq(
      "office_id",
      step.office_id
    );

  if (requirementError) {
    throw requirementError;
  }

  const requirementMap =
    new Map(
      (requirements || []).map(
        (requirement) => [
          requirement.id,
          requirement,
        ]
      )
    );

  const now =
    new Date().toISOString();

  const rows = responses
    .map((response) => {
      const requirement =
        requirementMap.get(
          response.requirementId
        );

      if (!requirement) {
        return null;
      }

      let responseValue =
        clean(
          response.responseValue
        );

      if (
        requirement.response_type ===
        "yes-no"
      ) {
        if (
          responseValue &&
          ![
            "Yes",
            "No",
          ].includes(
            responseValue
          )
        ) {
          throw new Error(
            "Question responses must be Yes or No."
          );
        }
      }

      if (
        requirement.response_type ===
        "check"
      ) {
        responseValue =
          responseValue ===
          "Verified"
            ? "Verified"
            : "";
      }

      return {
        clearance_step_id:
          step.id,

        requirement_id:
          requirement.id,

        response_value:
          responseValue ||
          null,

        reviewed_by:
          context.profile.id,

        reviewed_at:
          now,

        updated_at:
          now,
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return {
      success: true,
      responses: [],
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "office_requirement_responses"
    )
    .upsert(
      rows,
      {
        onConflict:
          "clearance_step_id,requirement_id",
      }
    )
    .select(`
      id,
      clearance_step_id,
      requirement_id,
      response_value,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at
    `);

  if (error) {
    throw error;
  }

  return {
    success: true,
    responses:
      data || [],
  };
}

/*
=========================================================
UPDATE EXACT OFFICE CLEARANCE STEP
=========================================================
*/

export async function updateOfficeClearanceStep({
  stepId,
  status,
  remarks = "",
}) {
  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  const context =
    await getOfficeStaffContext();

  if (!context.officeIds.length) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const databaseStatus =
    toDatabaseStepStatus(status);

  const {
    data: step,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .eq("id", stepId)
    .in(
      "office_id",
      context.officeIds
    )
    .single();

  if (stepError) {
    throw stepError;
  }

  if (!step) {
    throw new Error(
      "Clearance step not found or does not belong to your office."
    );
  }

  const normalizedRemarks =
    clean(remarks);

  if (
    databaseStatus ===
      "Rejected" &&
    !normalizedRemarks
  ) {
    throw new Error(
      "Remarks are required when marking a student as Needs Action."
    );
  }

  const reviewedAt =
    new Date().toISOString();

  const {
    data: updatedStep,
    error: updateError,
  } = await supabase
    .from("clearance_steps")
    .update({
      status:
        databaseStatus,

      remarks:
        normalizedRemarks ||
        null,

      approver_id:
        context.profile.id,

      reviewed_at:
        reviewedAt,
    })
    .eq("id", step.id)
    .eq(
      "office_id",
      step.office_id
    )
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .single();

  if (updateError) {
    throw updateError;
  }

  return {
    success: true,

    step: {
      ...updatedStep,

      rawStatus:
        updatedStep.status,

      displayStatus:
        toOfficeUiStatus(
          updatedStep.status
        ),
    },
  };
}

/*
=========================================================
COMPLETE OFFICE STUDENT REVIEW
=========================================================
*/

export async function saveOfficeStudentReview({
  stepId,
  status,
  remarks = "",
  responses = [],
}) {
  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  if (
    ![
      "Approved",
      "Needs Action",
    ].includes(clean(status))
  ) {
    throw new Error(
      'Review status must be "Approved" or "Needs Action".'
    );
  }

  const review =
    await getOfficeStudentReview(
      stepId
    );

  if (
    review.step.rawStatus ===
    "Approved"
  ) {
    throw new Error(
      "This office clearance step is already approved."
    );
  }

  const responseInputMap =
    new Map(
      (responses || []).map(
        (response) => [
          response.requirementId,
          clean(
            response.responseValue
          ),
        ]
      )
    );

  if (status === "Approved") {
    for (
      const requirement of
      review.requirements || []
    ) {
      if (
        !requirement.is_required
      ) {
        continue;
      }

      const submittedValue =
        responseInputMap.has(
          requirement.id
        )
          ? responseInputMap.get(
              requirement.id
            )
          : clean(
              requirement.responseValue
            );

      if (
        requirement.response_type ===
          "check" &&
        submittedValue !==
          "Verified"
      ) {
        throw new Error(
          `"${requirement.title}" must be verified before approval.`
        );
      }

      if (
        requirement.response_type ===
          "yes-no" &&
        ![
          "Yes",
          "No",
        ].includes(
          submittedValue
        )
      ) {
        throw new Error(
          `"${requirement.title}" must be answered before approval.`
        );
      }
    }
  }

  if (
    status === "Needs Action" &&
    !clean(remarks)
  ) {
    throw new Error(
      "Remarks are required when marking the student as Needs Action."
    );
  }

  if (
    Array.isArray(responses) &&
    responses.length
  ) {
    await saveOfficeRequirementResponses({
      stepId,
      responses,
    });
  }

  const result =
    await updateOfficeClearanceStep({
      stepId,
      status,
      remarks,
    });

  return {
    success: true,

    status:
      result.step.displayStatus,

    rawStatus:
      result.step.rawStatus,

    step:
      result.step,
  };
}

/*
=========================================================
BATCH HELPERS
=========================================================
*/

function normalizeBatchStatus(
  value
) {
  const status =
    clean(value) || "Open";

  const allowed = [
    "Open",
    "Closed",
    "Completed",
    "Cancelled",
  ];

  if (
    !allowed.includes(status)
  ) {
    throw new Error(
      "Invalid batch status."
    );
  }

  return status;
}

function normalizeTime(value) {
  const raw = clean(value);

  if (!raw) {
    return "";
  }

  return raw.slice(0, 8);
}

function ensureValidBatchTime(
  startTime,
  endTime
) {
  const start =
    normalizeTime(startTime);

  const end =
    normalizeTime(endTime);

  if (!start || !end) {
    throw new Error(
      "Start time and end time are required."
    );
  }

  if (end <= start) {
    throw new Error(
      "End time must be later than the start time."
    );
  }

  return {
    start,
    end,
  };
}

async function getAuthorizedOfficeBatch(
  batchId,
  context = null
) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  const officeContext =
    context ||
    (await getOfficeStaffContext());

  if (
    !officeContext.officeIds.length
  ) {
    throw new Error(
      "No active office assignment found."
    );
  }

  const {
    data: batch,
    error,
  } = await supabase
    .from("office_batches")
    .select(`
      id,
      office_id,
      created_by,
      batch_name,
      schedule_date,
      start_time,
      end_time,
      note,
      capacity,
      status,
      created_at,
      updated_at
    `)
    .eq("id", batchId)
    .in(
      "office_id",
      officeContext.officeIds
    )
    .single();

  if (error) {
    throw error;
  }

  if (!batch) {
    throw new Error(
      "Batch not found or does not belong to your office."
    );
  }

  return {
    context:
      officeContext,

    batch,
  };
}

/*
=========================================================
GET OFFICE BATCHES
=========================================================
*/

export async function getOfficeBatches(
  officeId = null
) {
  const context =
    await getOfficeStaffContext();

  const targetOfficeId =
    officeId ||
    context.primaryOffice?.id ||
    null;

  if (!targetOfficeId) {
    return {
      ...context,
      batches: [],
    };
  }

  if (
    !context.officeIds.includes(
      targetOfficeId
    )
  ) {
    throw new Error(
      "This office is not assigned to the logged-in Office Staff account."
    );
  }

  const {
    data: batches,
    error,
  } = await supabase
    .from("office_batches")
    .select(`
      id,
      office_id,
      created_by,
      batch_name,
      schedule_date,
      start_time,
      end_time,
      note,
      capacity,
      status,
      created_at,
      updated_at
    `)
    .eq(
      "office_id",
      targetOfficeId
    )
    .order(
      "schedule_date",
      {
        ascending: false,
      }
    )
    .order(
      "start_time",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  if (!(batches || []).length) {
    return {
      ...context,
      batches: [],
    };
  }

  const batchIds =
    batches.map(
      (batch) => batch.id
    );

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `)
    .in(
      "batch_id",
      batchIds
    );

  if (assignmentError) {
    throw assignmentError;
  }

  const stepIds = [
    ...new Set(
      (assignments || [])
        .map(
          (assignment) =>
            assignment.clearance_step_id
        )
        .filter(Boolean)
    ),
  ];

  let steps = [];

  if (stepIds.length) {
    const {
      data,
      error: stepError,
    } = await supabase
      .from("clearance_steps")
      .select(`
        id,
        status,
        reviewed_at
      `)
      .in(
        "id",
        stepIds
      );

    if (stepError) {
      throw stepError;
    }

    steps = data || [];
  }

  const stepMap =
    new Map(
      steps.map(
        (step) => [
          step.id,
          step,
        ]
      )
    );

  const assignmentMap =
    new Map();

  for (
    const assignment of
    assignments || []
  ) {
    const list =
      assignmentMap.get(
        assignment.batch_id
      ) || [];

    list.push(assignment);

    assignmentMap.set(
      assignment.batch_id,
      list
    );
  }

  const mappedBatches =
    batches.map((batch) => {
      const batchAssignments =
        assignmentMap.get(
          batch.id
        ) || [];

      const reviewedCount =
        batchAssignments.filter(
          (assignment) => {
            const step =
              stepMap.get(
                assignment.clearance_step_id
              );

            return Boolean(
              step?.reviewed_at
            );
          }
        ).length;

      return {
        ...batch,

        assignedCount:
          batchAssignments.length,

        reviewedCount,

        remainingSlots:
          Math.max(
            Number(
              batch.capacity || 0
            ) -
              batchAssignments.length,
            0
          ),
      };
    });

  return {
    ...context,

    batches:
      mappedBatches,
  };
}
/*
=========================================================
CREATE OFFICE BATCH
=========================================================
*/

export async function createOfficeBatch({
  officeId = null,
  batchName,
  scheduleDate,
  startTime,
  endTime,
  note = "",
  capacity = 20,
  status = "Open",
}) {
  const context =
    await getOfficeStaffContext();

  const targetOfficeId =
    officeId ||
    context.primaryOffice?.id ||
    null;

  if (!targetOfficeId) {
    throw new Error(
      "No active office assignment found."
    );
  }

  if (
    !context.officeIds.includes(
      targetOfficeId
    )
  ) {
    throw new Error(
      "You cannot create a batch for an office that is not assigned to your account."
    );
  }

  const normalizedName =
    clean(batchName);

  if (!normalizedName) {
    throw new Error(
      "Batch name is required."
    );
  }

  const normalizedDate =
    clean(scheduleDate);

  if (!normalizedDate) {
    throw new Error(
      "Schedule date is required."
    );
  }

  const {
    start,
    end,
  } = ensureValidBatchTime(
    startTime,
    endTime
  );

  const normalizedCapacity =
    Number(capacity);

  if (
    !Number.isInteger(
      normalizedCapacity
    ) ||
    normalizedCapacity < 1
  ) {
    throw new Error(
      "Batch capacity must be a positive whole number."
    );
  }

  const normalizedStatus =
    normalizeBatchStatus(
      status
    );

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("office_batches")
    .insert({
      office_id:
        targetOfficeId,

      created_by:
        context.profile.id,

      batch_name:
        normalizedName,

      schedule_date:
        normalizedDate,

      start_time:
        start,

      end_time:
        end,

      note:
        clean(note) ||
        null,

      capacity:
        normalizedCapacity,

      status:
        normalizedStatus,

      created_at:
        now,

      updated_at:
        now,
    })
    .select(`
      id,
      office_id,
      created_by,
      batch_name,
      schedule_date,
      start_time,
      end_time,
      note,
      capacity,
      status,
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
=========================================================
UPDATE OFFICE BATCH
=========================================================
*/

export async function updateOfficeBatch({
  batchId,
  batchName,
  scheduleDate,
  startTime,
  endTime,
  note = "",
  capacity,
  status,
}) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  const {
    context,
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  const normalizedName =
    clean(batchName);

  if (!normalizedName) {
    throw new Error(
      "Batch name is required."
    );
  }

  const normalizedDate =
    clean(scheduleDate);

  if (!normalizedDate) {
    throw new Error(
      "Schedule date is required."
    );
  }

  const {
    start,
    end,
  } = ensureValidBatchTime(
    startTime,
    endTime
  );

  const normalizedCapacity =
    Number(capacity);

  if (
    !Number.isInteger(
      normalizedCapacity
    ) ||
    normalizedCapacity < 1
  ) {
    throw new Error(
      "Batch capacity must be a positive whole number."
    );
  }

  const normalizedStatus =
    normalizeBatchStatus(
      status || batch.status
    );

  const {
    count,
    error: countError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "batch_id",
      batch.id
    );

  if (countError) {
    throw countError;
  }

  const assignedCount =
    Number(count || 0);

  if (
    normalizedCapacity <
    assignedCount
  ) {
    throw new Error(
      `Batch capacity cannot be lower than the ${assignedCount} student(s) already assigned.`
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("office_batches")
    .update({
      batch_name:
        normalizedName,

      schedule_date:
        normalizedDate,

      start_time:
        start,

      end_time:
        end,

      note:
        clean(note) ||
        null,

      capacity:
        normalizedCapacity,

      status:
        normalizedStatus,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      batch.id
    )
    .eq(
      "office_id",
      batch.office_id
    )
    .select(`
      id,
      office_id,
      created_by,
      batch_name,
      schedule_date,
      start_time,
      end_time,
      note,
      capacity,
      status,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,

    context,
  };
}

/*
=========================================================
SET OFFICE BATCH STATUS
=========================================================
*/

export async function setOfficeBatchStatus({
  batchId,
  status,
}) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  const {
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  const normalizedStatus =
    normalizeBatchStatus(
      status
    );

  const {
    data,
    error,
  } = await supabase
    .from("office_batches")
    .update({
      status:
        normalizedStatus,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      batch.id
    )
    .eq(
      "office_id",
      batch.office_id
    )
    .select(`
      id,
      office_id,
      created_by,
      batch_name,
      schedule_date,
      start_time,
      end_time,
      note,
      capacity,
      status,
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
=========================================================
GET STUDENTS ASSIGNED TO A BATCH
=========================================================
*/

export async function getOfficeBatchStudents(
  batchId
) {
  const {
    context,
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `)
    .eq(
      "batch_id",
      batch.id
    )
    .order(
      "assigned_at",
      {
        ascending: true,
      }
    );

  if (assignmentError) {
    throw assignmentError;
  }

  if (!(assignments || []).length) {
    return {
      ...context,
      batch,
      students: [],
    };
  }

  const stepIds = [
    ...new Set(
      assignments
        .map(
          (assignment) =>
            assignment.clearance_step_id
        )
        .filter(Boolean)
    ),
  ];

  const studentIds = [
    ...new Set(
      assignments
        .map(
          (assignment) =>
            assignment.student_id
        )
        .filter(Boolean)
    ),
  ];

  const {
    data: steps,
    error: stepsError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      approver_id,
      status,
      remarks,
      reviewed_at
    `)
    .in(
      "id",
      stepIds
    )
    .eq(
      "office_id",
      batch.office_id
    );

  if (stepsError) {
    throw stepsError;
  }

  const requestIds = [
    ...new Set(
      (steps || [])
        .map(
          (step) =>
            step.clearance_request_id
        )
        .filter(Boolean)
    ),
  ];

  let requests = [];

  if (requestIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("clearance_requests")
      .select(`
        id,
        student_id,
        section_id,
        school_year,
        semester,
        status,
        requested_at
      `)
      .in(
        "id",
        requestIds
      );

    if (error) {
      throw error;
    }

    requests = data || [];
  }

  let students = [];

  if (studentIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        student_id,
        course,
        year_level,
        section_id,
        section,
        block,
        semester,
        school_year
      `)
      .in(
        "id",
        studentIds
      );

    if (error) {
      throw error;
    }

    students = data || [];
  }

  const sectionIds = [
    ...new Set(
      requests
        .map(
          (request) =>
            request.section_id
        )
        .filter(Boolean)
    ),
  ];

  let sections = [];

  if (sectionIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from("sections")
      .select(`
        id,
        course,
        year_level,
        block_code,
        school_year,
        semester
      `)
      .in(
        "id",
        sectionIds
      );

    if (error) {
      throw error;
    }

    sections = data || [];
  }

  const stepMap =
    new Map(
      (steps || []).map(
        (step) => [
          step.id,
          step,
        ]
      )
    );

  const requestMap =
    new Map(
      requests.map(
        (request) => [
          request.id,
          request,
        ]
      )
    );

  const studentMap =
    new Map(
      students.map(
        (student) => [
          student.id,
          student,
        ]
      )
    );

  const sectionMap =
    new Map(
      sections.map(
        (section) => [
          section.id,
          section,
        ]
      )
    );

  const mappedStudents =
    assignments
      .map((assignment) => {
        const step =
          stepMap.get(
            assignment.clearance_step_id
          );

        if (!step) {
          return null;
        }

        const request =
          requestMap.get(
            step.clearance_request_id
          );

        if (!request) {
          return null;
        }

        const student =
          studentMap.get(
            assignment.student_id
          );

        if (!student) {
          return null;
        }

        const section =
          request.section_id
            ? sectionMap.get(
                request.section_id
              )
            : null;

        return {
          assignmentId:
            assignment.id,

          batchId:
            assignment.batch_id,

          stepId:
            step.id,

          requestId:
            request.id,

          studentUserId:
            student.id,

          studentId:
            student.student_id ||
            "—",

          studentName:
            student.full_name ||
            "Student",

          name:
            student.full_name ||
            "Student",

          email:
            student.email || "",

          course:
            section?.course ||
            student.course ||
            "—",

          yearLevel:
            formatYearLevel(
              section?.year_level ||
                student.year_level
            ),

          section:
            clean(
              section?.block_code
            ) ||
            clean(
              student.block
            ) ||
            clean(
              student.section
            ) ||
            "—",

          semester:
            request.semester ||
            student.semester ||
            "—",

          schoolYear:
            request.school_year ||
            student.school_year ||
            "—",

          status:
            toOfficeUiStatus(
              step.status
            ),

          rawStatus:
            step.status,

          remarks:
            step.remarks || "",

          reviewedAt:
            step.reviewed_at ||
            null,

          assignedAt:
            assignment.assigned_at,
        };
      })
      .filter(Boolean);

  return {
    ...context,

    batch,

    students:
      mappedStudents,
  };
}

/*
=========================================================
GET AVAILABLE STUDENTS FOR A BATCH
=========================================================
*/

export async function getAvailableOfficeBatchStudents(
  batchId
) {
  const {
    context,
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  const queueResult =
    await getOfficeStudentQueue();

  const officeStudents =
    (
      queueResult.students || []
    ).filter(
      (student) =>
        student.officeId ===
        batch.office_id
    );

  if (!officeStudents.length) {
    return {
      ...context,
      batch,
      students: [],
    };
  }

  const queueStepIds =
    officeStudents.map(
      (student) =>
        student.stepId
    );

  const {
    data: existingAssignments,
    error: assignmentError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id
    `)
    .in(
      "clearance_step_id",
      queueStepIds
    );

  if (assignmentError) {
    throw assignmentError;
  }

  const assignedStepIds =
    new Set(
      (
        existingAssignments || []
      ).map(
        (assignment) =>
          assignment.clearance_step_id
      )
    );

  const availableStudents =
    officeStudents.filter(
      (student) =>
        !assignedStepIds.has(
          student.stepId
        )
    );

  return {
    ...context,

    batch,

    students:
      availableStudents,
  };
}

/*
=========================================================
ASSIGN ONE STUDENT TO OFFICE BATCH
=========================================================
*/

export async function assignStudentToOfficeBatch({
  batchId,
  stepId,
  studentId,
}) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  if (!studentId) {
    throw new Error(
      "Student user ID is required."
    );
  }

  const {
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  if (
    batch.status !== "Open"
  ) {
    throw new Error(
      "Students can only be assigned to an Open batch."
    );
  }

  const {
    data: step,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      status
    `)
    .eq(
      "id",
      stepId
    )
    .eq(
      "office_id",
      batch.office_id
    )
    .single();

  if (stepError) {
    throw stepError;
  }

  if (!step) {
    throw new Error(
      "The selected clearance step does not belong to this office."
    );
  }

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from("clearance_requests")
    .select(`
      id,
      student_id
    `)
    .eq(
      "id",
      step.clearance_request_id
    )
    .single();

  if (requestError) {
    throw requestError;
  }

  if (
    request.student_id !==
    studentId
  ) {
    throw new Error(
      "The selected student does not match this clearance step."
    );
  }

  const {
    data: existingAssignments,
    error: existingError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id
    `)
    .eq(
      "clearance_step_id",
      step.id
    )
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existingAssignment =
    existingAssignments?.[0] ||
    null;

  if (existingAssignment) {
    if (
      existingAssignment.batch_id ===
      batch.id
    ) {
      throw new Error(
        "This student is already assigned to this batch."
      );
    }

    throw new Error(
      "This student is already assigned to another office batch."
    );
  }

  const {
    count,
    error: countError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "batch_id",
      batch.id
    );

  if (countError) {
    throw countError;
  }

  if (
    Number(count || 0) >=
    Number(batch.capacity)
  ) {
    throw new Error(
      "This batch has reached its maximum capacity."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .insert({
      batch_id:
        batch.id,

      clearance_step_id:
        step.id,

      student_id:
        studentId,

      assigned_at:
        new Date().toISOString(),
    })
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/*
=========================================================
ASSIGN MULTIPLE STUDENTS TO OFFICE BATCH
=========================================================
*/

export async function assignOfficeStudentsToBatch({
  batchId,
  stepIds = [],
}) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  const uniqueStepIds = [
    ...new Set(
      (stepIds || [])
        .map((stepId) =>
          clean(stepId)
        )
        .filter(Boolean)
    ),
  ];

  if (!uniqueStepIds.length) {
    throw new Error(
      "Select at least one student."
    );
  }

  const {
    context,
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  if (
    batch.status !== "Open"
  ) {
    throw new Error(
      "Students can only be assigned to an Open batch."
    );
  }

  const {
    data: steps,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      clearance_request_id,
      office_id,
      status
    `)
    .in(
      "id",
      uniqueStepIds
    )
    .eq(
      "office_id",
      batch.office_id
    );

  if (stepError) {
    throw stepError;
  }

  if (
    (steps || []).length !==
    uniqueStepIds.length
  ) {
    throw new Error(
      "One or more selected students do not belong to this office clearance batch."
    );
  }

  const approvedStep =
    (steps || []).find(
      (step) =>
        clean(
          step.status
        ) === "Approved"
    );

  if (approvedStep) {
    throw new Error(
      "An already approved clearance step cannot be newly assigned to a batch."
    );
  }

  const requestIds = [
    ...new Set(
      (steps || [])
        .map(
          (step) =>
            step.clearance_request_id
        )
        .filter(Boolean)
    ),
  ];

  const {
    data: requests,
    error: requestError,
  } = await supabase
    .from("clearance_requests")
    .select(`
      id,
      student_id
    `)
    .in(
      "id",
      requestIds
    );

  if (requestError) {
    throw requestError;
  }

  const requestMap =
    new Map(
      (requests || []).map(
        (request) => [
          request.id,
          request,
        ]
      )
    );

  const rows = [];

  for (const step of steps || []) {
    const request =
      requestMap.get(
        step.clearance_request_id
      );

    if (
      !request ||
      !request.student_id
    ) {
      throw new Error(
        "A selected clearance step has no valid student record."
      );
    }

    rows.push({
      batch_id:
        batch.id,

      clearance_step_id:
        step.id,

      student_id:
        request.student_id,

      assigned_at:
        new Date().toISOString(),
    });
  }

  const {
    data: existingAssignments,
    error: existingError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id
    `)
    .in(
      "clearance_step_id",
      uniqueStepIds
    );

  if (existingError) {
    throw existingError;
  }

  if (
    (existingAssignments || [])
      .length
  ) {
    const sameBatchCount =
      existingAssignments.filter(
        (assignment) =>
          assignment.batch_id ===
          batch.id
      ).length;

    if (
      sameBatchCount ===
      existingAssignments.length
    ) {
      throw new Error(
        "One or more selected students are already assigned to this batch."
      );
    }

    throw new Error(
      "One or more selected students are already assigned to another office batch."
    );
  }

  const {
    count: assignedCount,
    error: countError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "batch_id",
      batch.id
    );

  if (countError) {
    throw countError;
  }

  const remainingSlots =
    Math.max(
      Number(
        batch.capacity || 0
      ) -
        Number(
          assignedCount || 0
        ),
      0
    );

  if (
    rows.length >
    remainingSlots
  ) {
    throw new Error(
      `This batch only has ${remainingSlots} remaining slot(s).`
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .insert(rows)
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `);

  if (error) {
    throw error;
  }

  return {
    success: true,

    batchId:
      batch.id,

    assignedCount:
      (data || []).length,

    assignments:
      data || [],

    context,
  };
}

/*
=========================================================
REMOVE ONE STUDENT FROM OFFICE BATCH
=========================================================
*/

export async function removeOfficeStudentFromBatch({
  batchId,
  stepId,
}) {
  if (!batchId) {
    throw new Error(
      "Batch ID is required."
    );
  }

  if (!stepId) {
    throw new Error(
      "Clearance step ID is required."
    );
  }

  const {
    batch,
  } =
    await getAuthorizedOfficeBatch(
      batchId
    );

  if (
    batch.status !== "Open"
  ) {
    throw new Error(
      "Students can only be removed while the batch is Open."
    );
  }

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .select(`
      id,
      batch_id,
      clearance_step_id,
      student_id,
      assigned_at
    `)
    .eq(
      "batch_id",
      batch.id
    )
    .eq(
      "clearance_step_id",
      stepId
    )
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    throw new Error(
      "Student is not assigned to this batch."
    );
  }

  const {
    data: step,
    error: stepError,
  } = await supabase
    .from("clearance_steps")
    .select(`
      id,
      office_id,
      status,
      reviewed_at
    `)
    .eq(
      "id",
      stepId
    )
    .eq(
      "office_id",
      batch.office_id
    )
    .single();

  if (stepError) {
    throw stepError;
  }

  const reviewed =
    Boolean(
      step?.reviewed_at
    ) ||
    [
      "Approved",
      "Rejected",
    ].includes(
      clean(
        step?.status
      )
    );

  if (reviewed) {
    throw new Error(
      "A reviewed student cannot be removed from the batch because the schedule is already part of the clearance history."
    );
  }

  const {
    error: deleteError,
  } = await supabase
    .from(
      "office_batch_students"
    )
    .delete()
    .eq(
      "id",
      assignment.id
    )
    .eq(
      "batch_id",
      batch.id
    );

  if (deleteError) {
    throw deleteError;
  }

  return {
    success: true,

    assignmentId:
      assignment.id,

    batchId:
      batch.id,

    stepId:
      stepId,
  };
}

/*
=========================================================
BACKWARD-COMPATIBLE REMOVE ALIAS
=========================================================
*/

export async function removeStudentFromOfficeBatch({
  batchId,
  stepId,
}) {
  return removeOfficeStudentFromBatch({
    batchId,
    stepId,
  });
}