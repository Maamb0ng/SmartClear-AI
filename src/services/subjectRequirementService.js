import { supabase } from "./supabase";

const VALID_SUBMISSION_TYPES = [
  "File",
  "Text",
  "File or Text",
  "No Submission",
];

const REQUIREMENT_SELECT = `
  id,
  class_offering_id,
  created_by,
  title,
  description,
  submission_type,
  is_required,
  deadline,
  allowed_file_types,
  max_file_size_mb,
  is_active,
  is_open,
  opened_at,
  closed_at,
  created_at,
  updated_at
`;

const emptyToNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();

  return normalizedValue || null;
};

const normalizeFileTypes = (fileTypes) => {
  if (!Array.isArray(fileTypes)) {
    return [];
  }

  return [
    ...new Set(
      fileTypes
        .map((fileType) =>
          String(fileType).trim().toLowerCase()
        )
        .filter(Boolean)
    ),
  ];
};

const normalizeDeadline = (deadline) => {
  if (!deadline) {
    return null;
  }

  const parsedDate = new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid requirement deadline.");
  }

  return parsedDate.toISOString();
};

/*
|--------------------------------------------------------------------------
| GET CURRENT APPROVER PROFILE
|--------------------------------------------------------------------------
*/

export const getCurrentApproverProfile = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      auth_id,
      full_name,
      email,
      role,
      status
    `)
    .eq("auth_id", user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Approver profile not found.");
  }

  if (data.role !== "Approver") {
    throw new Error(
      "Only approvers can manage subject requirements."
    );
  }

  if (data.status !== "Active") {
    throw new Error(
      "Your approver account is not active."
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| GET REQUIREMENTS BY CLASS OFFERING
|--------------------------------------------------------------------------
*/

export const getSubjectRequirements = async (
  classOfferingId
) => {
  if (!classOfferingId) {
    throw new Error("Class offering is required.");
  }

  const { data, error } = await supabase
    .from("subject_requirements")
    .select(REQUIREMENT_SELECT)
    .eq("class_offering_id", classOfferingId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

/*
|--------------------------------------------------------------------------
| GET ONE REQUIREMENT
|--------------------------------------------------------------------------
*/

export const getSubjectRequirementById = async (
  requirementId
) => {
  if (!requirementId) {
    throw new Error("Requirement ID is required.");
  }

  const { data, error } = await supabase
    .from("subject_requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", requirementId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| CREATE REQUIREMENT
|--------------------------------------------------------------------------
*/

export const createSubjectRequirement = async ({
  classOfferingId,
  title,
  description = "",
  submissionType = "File",
  isRequired = true,
  deadline = null,
  allowedFileTypes = [],
  maxFileSizeMb = 5,
}) => {
  if (!classOfferingId) {
    throw new Error("Class offering is required.");
  }

  const normalizedTitle = String(title || "").trim();

  if (!normalizedTitle) {
    throw new Error("Requirement title is required.");
  }

  if (
    !VALID_SUBMISSION_TYPES.includes(
      submissionType
    )
  ) {
    throw new Error("Invalid submission type.");
  }

  const normalizedMaxFileSize =
    Number(maxFileSizeMb);

  if (
    submissionType !== "No Submission" &&
    (
      !Number.isInteger(
        normalizedMaxFileSize
      ) ||
      normalizedMaxFileSize <= 0
    )
  ) {
    throw new Error(
      "Maximum file size must be a positive whole number."
    );
  }

  const approver =
    await getCurrentApproverProfile();

  const requiresFile =
    submissionType === "File" ||
    submissionType === "File or Text";

  const now = new Date().toISOString();

  const requirementPayload = {
    class_offering_id:
      classOfferingId,

    created_by:
      approver.id,

    title:
      normalizedTitle,

    description:
      emptyToNull(description),

    submission_type:
      submissionType,

    is_required:
      Boolean(isRequired),

    deadline:
      normalizeDeadline(deadline),

    allowed_file_types:
      requiresFile
        ? normalizeFileTypes(
            allowedFileTypes
          )
        : [],

    max_file_size_mb:
      requiresFile
        ? normalizedMaxFileSize
        : 5,

    is_active: true,

    /*
    |--------------------------------------------------------------------------
    | REQUIREMENT IS CLOSED BY DEFAULT
    |--------------------------------------------------------------------------
    */

    is_open: false,
    opened_at: null,
    closed_at: now,

    updated_at: now,
  };

  const { data, error } = await supabase
    .from("subject_requirements")
    .insert(requirementPayload)
    .select(REQUIREMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A requirement already exists for this subject. Edit the existing requirement instead."
      );
    }

    throw new Error(error.message);
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| UPDATE REQUIREMENT
|--------------------------------------------------------------------------
*/

export const updateSubjectRequirement = async (
  requirementId,
  {
    title,
    description,
    submissionType,
    isRequired,
    deadline,
    allowedFileTypes,
    maxFileSizeMb,
  }
) => {
  if (!requirementId) {
    throw new Error("Requirement ID is required.");
  }

  const updatePayload = {
    updated_at:
      new Date().toISOString(),
  };

  if (title !== undefined) {
    const normalizedTitle =
      String(title).trim();

    if (!normalizedTitle) {
      throw new Error(
        "Requirement title is required."
      );
    }

    updatePayload.title =
      normalizedTitle;
  }

  if (description !== undefined) {
    updatePayload.description =
      emptyToNull(description);
  }

  if (submissionType !== undefined) {
    if (
      !VALID_SUBMISSION_TYPES.includes(
        submissionType
      )
    ) {
      throw new Error(
        "Invalid submission type."
      );
    }

    updatePayload.submission_type =
      submissionType;
  }

  if (isRequired !== undefined) {
    updatePayload.is_required =
      Boolean(isRequired);
  }

  if (deadline !== undefined) {
    updatePayload.deadline =
      normalizeDeadline(deadline);
  }

  const currentRequirement =
    await getSubjectRequirementById(
      requirementId
    );

  const effectiveSubmissionType =
    submissionType ||
    currentRequirement.submission_type;

  const requiresFile =
    effectiveSubmissionType === "File" ||
    effectiveSubmissionType ===
      "File or Text";

  if (requiresFile) {
    if (
      allowedFileTypes !== undefined
    ) {
      updatePayload.allowed_file_types =
        normalizeFileTypes(
          allowedFileTypes
        );
    }

    if (
      maxFileSizeMb !== undefined
    ) {
      const normalizedMaxFileSize =
        Number(maxFileSizeMb);

      if (
        !Number.isInteger(
          normalizedMaxFileSize
        ) ||
        normalizedMaxFileSize <= 0
      ) {
        throw new Error(
          "Maximum file size must be a positive whole number."
        );
      }

      updatePayload.max_file_size_mb =
        normalizedMaxFileSize;
    }
  } else {
    updatePayload.allowed_file_types = [];
    updatePayload.max_file_size_mb = 5;
  }

  const { data, error } = await supabase
    .from("subject_requirements")
    .update(updatePayload)
    .eq("id", requirementId)
    .select(REQUIREMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A requirement already exists for this subject. Edit the existing requirement instead."
      );
    }

    throw new Error(error.message);
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| ACTIVATE OR DEACTIVATE REQUIREMENT
|--------------------------------------------------------------------------
*/

export const setSubjectRequirementStatus = async (
  requirementId,
  isActive
) => {
  if (!requirementId) {
    throw new Error(
      "Requirement ID is required."
    );
  }

  const { data, error } = await supabase
    .from("subject_requirements")
    .update({
      is_active:
        Boolean(isActive),

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", requirementId)
    .select(REQUIREMENT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| OPEN OR CLOSE STUDENT SUBMISSION
|--------------------------------------------------------------------------
*/

export const setSubjectRequirementOpenStatus =
  async (
    requirementId,
    isOpen
  ) => {
    if (!requirementId) {
      throw new Error(
        "Requirement ID is required."
      );
    }

    const now =
      new Date().toISOString();

    const statusPayload =
      isOpen
        ? {
            is_open: true,
            opened_at: now,
            closed_at: null,
            updated_at: now,
          }
        : {
            is_open: false,
            closed_at: now,
            updated_at: now,
          };

    const { data, error } =
      await supabase
        .from(
          "subject_requirements"
        )
        .update(statusPayload)
        .eq("id", requirementId)
        .select(REQUIREMENT_SELECT)
        .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return data;
  };

/*
|--------------------------------------------------------------------------
| DELETE REQUIREMENT
|--------------------------------------------------------------------------
*/

export const deleteSubjectRequirement = async (
  requirementId
) => {
  if (!requirementId) {
    throw new Error(
      "Requirement ID is required."
    );
  }

  const { error } = await supabase
    .from("subject_requirements")
    .delete()
    .eq("id", requirementId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};