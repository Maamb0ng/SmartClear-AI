import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";
import { requestClearance } from "../../services/requestClearanceService";
import { supabase } from "../../services/supabase";
import { sendClearancePassEmail } from "../../services/clearancePassEmailService";

import {
  FaBook,
  FaBuilding,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaGraduationCap,
  FaPaperPlane,
  FaPrint,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
  FaUpload,
  FaUserCheck,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const STORAGE_BUCKET = "clearance-requirements";

const DEFAULT_MAX_FILE_SIZE_MB = 10;

const DEFAULT_ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const DEFAULT_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStepName = (step) => {
  if (step?.subjects?.subject_name) {
    return step.subjects.subject_name;
  }

  if (step?.offices?.office_name) {
    return step.offices.office_name;
  }

  return "Unassigned Clearance Requirement";
};

const getStepCode = (step) => {
  return (
    step?.subjects?.subject_code ||
    step?.offices?.office_code ||
    "No code"
  );
};

const getStepType = (step) => {
  return step?.subject_id ? "Subject" : "Office";
};

const getStatusStyle = (status) => {
  if (status === "Approved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "Rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
};

const getOverallStatusStyle = (status) => {
  if (status === "Completed") {
    return "bg-green-100 text-green-700";
  }

  if (status === "In Progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "Rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
};

const getRequirement = (step) => {
  return step?.subjectRequirement || null;
};

const isPastDeadline = (requirement) => {
  if (!requirement?.deadline) return false;

  const deadline = new Date(requirement.deadline);

  return (
    !Number.isNaN(deadline.getTime()) &&
    deadline.getTime() < Date.now()
  );
};

const subjectNeedsStudentSubmission = (step) => {
  const requirement = getRequirement(step);

  return Boolean(
    step?.subject_id &&
      requirement?.is_active &&
      requirement.submission_type !== "No Submission"
  );
};

const stepAllowsText = (step) => {
  if (!step?.subject_id) return true;

  const submissionType =
    getRequirement(step)?.submission_type;

  return (
    submissionType === "Text" ||
    submissionType === "File or Text"
  );
};

const stepAllowsFile = (step) => {
  if (!step?.subject_id) return true;

  const submissionType =
    getRequirement(step)?.submission_type;

  return (
    submissionType === "File" ||
    submissionType === "File or Text"
  );
};

const isSubmissionWindowOpen = (step) => {
  if (!step?.subject_id) return true;

  const requirement = getRequirement(step);

  return Boolean(
    subjectNeedsStudentSubmission(step) &&
      requirement?.is_open === true &&
      !isPastDeadline(requirement)
  );
};

const getSubmissionBlockedReason = (step) => {
  if (!step?.subject_id) return null;

  const requirement = getRequirement(step);

  if (!requirement || !requirement.is_active) {
    return {
      key: "waiting",
      title: "Waiting for Teacher to Open Submission",
      message:
        "You cannot submit this requirement yet because the assigned teacher has not posted and activated the submission instructions.",
    };
  }

  if (
    requirement.submission_type ===
    "No Submission"
  ) {
    return {
      key: "faculty-review",
      title: "Teacher Review Only",
      message:
        "No student upload is required for this subject. The assigned teacher will review and clear this step directly.",
    };
  }

  if (isPastDeadline(requirement)) {
    return {
      key: "deadline",
      title: "Submission Deadline Passed",
      message:
        "The submission period has ended. Contact the assigned teacher if this requirement must be reopened.",
    };
  }

  if (requirement.is_open !== true) {
    return {
      key: "closed",
      title: "Submission Not Yet Open",
      message:
        "The assigned teacher has not opened submissions yet or has temporarily closed the submission window.",
    };
  }

  return null;
};

const getDisplayedStepStatus = (step) => {
  if (step.status === "Approved") {
    return "Approved";
  }

  if (step.status === "Rejected") {
    return "Needs Correction";
  }

  if (step.status === "Pending" && step.submission) {
    return "Under Review";
  }

  if (step.status === "Pending") {
    return isSubmissionWindowOpen(step)
      ? "Ready to Submit"
      : "Not Submitted";
  }

  return step.status;
};

const getDisplayedStepStatusStyle = (step) => {
  if (step.status === "Approved") {
    return "bg-green-100 text-green-700";
  }

  if (
    step.status === "Pending" &&
    step.submission
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (step.status === "Rejected") {
    return "bg-red-100 text-red-700";
  }

  const blockedReason =
    getSubmissionBlockedReason(step);

  if (blockedReason?.key === "deadline") {
    return "bg-red-100 text-red-700";
  }

  if (
    blockedReason?.key === "faculty-review"
  ) {
    return "bg-slate-200 text-slate-700";
  }

  if (blockedReason) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

const getStepWorkflowRank = (step) => {
  const blockedReason =
    getSubmissionBlockedReason(step);

  if (
    (step.status === "Rejected" ||
      (step.status === "Pending" &&
        !step.submission)) &&
    !blockedReason
  ) {
    return 0;
  }

  if (blockedReason) {
    return 1;
  }

  if (
    step.status === "Pending" &&
    step.submission
  ) {
    return 2;
  }

  if (step.status === "Approved") {
    return 3;
  }

  return 4;
};

const normalizeFileType = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const getStepMaxFileSizeMb = (step) => {
  const configuredSize = Number(
    getRequirement(step)?.max_file_size_mb
  );

  if (
    Number.isFinite(configuredSize) &&
    configuredSize > 0
  ) {
    return configuredSize;
  }

  return DEFAULT_MAX_FILE_SIZE_MB;
};

const getStepAllowedFileTypes = (step) => {
  const configuredTypes =
    getRequirement(step)?.allowed_file_types;

  if (
    Array.isArray(configuredTypes) &&
    configuredTypes.length > 0
  ) {
    return configuredTypes
      .map(normalizeFileType)
      .filter(Boolean);
  }

  return DEFAULT_ALLOWED_FILE_TYPES;
};

const fileMatchesAllowedType = (
  file,
  allowedTypes
) => {
  const fileType = normalizeFileType(file?.type);
  const fileName = normalizeFileType(file?.name);

  const fileExtension = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";

  return allowedTypes.some((allowedType) => {
    const normalized =
      normalizeFileType(allowedType);

    if (!normalized) return false;

    if (normalized.startsWith(".")) {
      return fileExtension === normalized;
    }

    if (normalized.includes("/")) {
      return fileType === normalized;
    }

    return (
      fileExtension === `.${normalized}` ||
      fileType.endsWith(`/${normalized}`)
    );
  });
};

const getFileAcceptValue = (step) => {
  const configuredTypes =
    getRequirement(step)?.allowed_file_types;

  if (
    !Array.isArray(configuredTypes) ||
    configuredTypes.length === 0
  ) {
    return DEFAULT_FILE_ACCEPT;
  }

  return configuredTypes
    .map(normalizeFileType)
    .filter(Boolean)
    .map((type) => {
      if (
        type.startsWith(".") ||
        type.includes("/")
      ) {
        return type;
      }

      return `.${type}`;
    })
    .join(",");
};

const formatAllowedFileTypes = (step) => {
  return getStepAllowedFileTypes(step)
    .map((type) =>
      type
        .replace("application/", "")
        .replace("image/", "")
        .replace(".", "")
        .toUpperCase()
    )
    .join(", ");
};

const sanitizeFileName = (fileName) => {
  const lastDotIndex = fileName.lastIndexOf(".");

  const extension =
    lastDotIndex >= 0
      ? fileName.slice(lastDotIndex).toLowerCase()
      : "";

  const nameWithoutExtension =
    lastDotIndex >= 0
      ? fileName.slice(0, lastDotIndex)
      : fileName;

  const safeName = nameWithoutExtension
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeName || "requirement"}${extension}`;
};

const escapeHtml = (value) => {
  return String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const createUniqueId = () => {
  if (
    typeof globalThis.crypto?.randomUUID ===
    "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (
    typeof globalThis.crypto?.getRandomValues ===
    "function"
  ) {
    const bytes = new Uint8Array(16);

    globalThis.crypto.getRandomValues(bytes);

    bytes[6] =
      (bytes[6] & 0x0f) | 0x40;

    bytes[8] =
      (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(
      bytes,
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0")
    );

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
};

function RequestClearance() {
  const [student, setStudent] = useState(null);
  const [clearanceRequest, setClearanceRequest] =
    useState(null);
  const [steps, setSteps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submittingRequest, setSubmittingRequest] =
    useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStep, setSelectedStep] = useState(null);
  const [submissionText, setSubmissionText] =
    useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingStepId, setSubmittingStepId] =
    useState(null);

  const [clearancePass, setClearancePass] =
    useState(null);
  const [loadingPass, setLoadingPass] = useState(false);
  const [showClearancePass, setShowClearancePass] =
    useState(false);

  const [sendingPassEmail, setSendingPassEmail] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | CREATE PRIVATE SIGNED URL
  |--------------------------------------------------------------------------
  */

  const addSignedUrls = useCallback(
    async (submissions = []) => {
      return Promise.all(
        submissions.map(async (submission) => {
          if (!submission.attachment_url) {
            return {
              ...submission,
              signed_url: null,
            };
          }

          const { data, error } =
            await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(
                submission.attachment_url,
                60 * 10
              );

          if (error) {
            console.error(
              "Unable to create signed URL:",
              error
            );

            return {
              ...submission,
              signed_url: null,
            };
          }

          return {
            ...submission,
            signed_url: data?.signedUrl || null,
          };
        })
      );
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | LOAD STUDENT CLEARANCE
  |--------------------------------------------------------------------------
  */

  const loadStudentClearance = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        throw new Error(
          "Please log in before accessing this page."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD STUDENT PROFILE
      |--------------------------------------------------------------------------
      */

      const {
        data: studentData,
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
          status,
          course,
          year_level,
          section,
          section_id,
          semester,
          school_year
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (studentError) throw studentError;

      if (studentData.role !== "Student") {
        throw new Error(
          "Only student accounts can request clearance."
        );
      }

      setStudent(studentData);

      /*
      |--------------------------------------------------------------------------
      | LOAD LATEST CLEARANCE REQUEST
      |--------------------------------------------------------------------------
      */

      const {
        data: requestData,
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
          completed_at
        `)
        .eq("student_id", studentData.id)
        .order("requested_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;

      setClearanceRequest(requestData || null);

      if (!requestData) {
        setSteps([]);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD CLEARANCE STEPS
      |--------------------------------------------------------------------------
      */

      const {
        data: stepData,
        error: stepError,
      } = await supabase
        .from("clearance_steps")
        .select(`
          id,
          clearance_request_id,
          office_id,
          subject_id,
          approver_id,
          status,
          remarks,
          reviewed_at,
          offices (
            id,
            office_name,
            office_code
          ),
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq(
          "clearance_request_id",
          requestData.id
        );

      if (stepError) throw stepError;

      const safeSteps = stepData || [];

      if (safeSteps.length === 0) {
        setSteps([]);
        return;
      }

      const stepIds = safeSteps.map(
        (step) => step.id
      );

      const approverIds = [
        ...new Set(
          safeSteps
            .map((step) => step.approver_id)
            .filter(Boolean)
        ),
      ];

      const subjectIds = [
        ...new Set(
          safeSteps
            .map((step) => step.subject_id)
            .filter(Boolean)
        ),
      ];

      /*
      |--------------------------------------------------------------------------
      | LOAD TEACHER-PROVIDED SUBJECT REQUIREMENTS
      |--------------------------------------------------------------------------
      |
      | This is display-only. A missing requirement must never block the
      | student's existing Submit Requirement button.
      |--------------------------------------------------------------------------
      */

      let classOfferings = [];
      let subjectRequirements = [];

      if (subjectIds.length > 0) {
        const {
          data: offeringData,
          error: offeringError,
        } = await supabase
          .from("class_offerings")
          .select(`
            id,
            section_id,
            subject_id,
            teacher_id,
            semester,
            school_year,
            is_active
          `)
          .eq("section_id", requestData.section_id)
          .eq("semester", requestData.semester)
          .eq("school_year", requestData.school_year)
          .eq("is_active", true)
          .in("subject_id", subjectIds);

        if (offeringError) {
          console.warn(
            "Teacher class offerings could not be loaded:",
            offeringError
          );
        } else {
          classOfferings = offeringData || [];
        }

        const classOfferingIds = classOfferings.map(
          (offering) => offering.id
        );

        if (classOfferingIds.length > 0) {
          const {
            data: requirementData,
            error: requirementError,
          } = await supabase
            .from("subject_requirements")
            .select(`
              id,
              class_offering_id,
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
            `)
            .in("class_offering_id", classOfferingIds)
            .eq("is_active", true);

          if (requirementError) {
            console.warn(
              "Teacher subject requirements could not be loaded:",
              requirementError
            );
          } else {
            subjectRequirements = requirementData || [];
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD CURRENT SUBMISSIONS
      |--------------------------------------------------------------------------
      */

      const {
        data: submissionData,
        error: submissionError,
      } = await supabase
        .from("clearance_submissions")
        .select(`
          id,
          clearance_step_id,
          student_id,
          submission_text,
          attachment_url,
          attachment_name,
          version,
          is_current,
          submitted_at,
          updated_at
        `)
        .in("clearance_step_id", stepIds)
        .eq("is_current", true);

      if (submissionError) throw submissionError;

      const submissionsWithUrls =
        await addSignedUrls(submissionData || []);

      const submissionMap = new Map(
        submissionsWithUrls.map((submission) => [
          submission.clearance_step_id,
          submission,
        ])
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD APPROVER NAMES
      |--------------------------------------------------------------------------
      |
      | If the users RLS does not allow the student to read approver
      | profiles, the page will continue and display "Assigned Approver."
      |--------------------------------------------------------------------------
      */

      const approverMap = new Map();

      if (approverIds.length > 0) {
        const {
          data: approverData,
          error: approverError,
        } = await supabase
          .from("users")
          .select(`
            id,
            full_name,
            employee_id
          `)
          .in("id", approverIds);

        if (approverError) {
          console.warn(
            "Approver names could not be loaded:",
            approverError
          );
        } else {
          (approverData || []).forEach(
            (approver) => {
              approverMap.set(
                approver.id,
                approver
              );
            }
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | ENRICH AND SORT STEPS
      |--------------------------------------------------------------------------
      */

      const classOfferingByTeacherMap = new Map(
        classOfferings.map((offering) => [
          [
            offering.subject_id,
            offering.teacher_id,
          ].join("|"),
          offering,
        ])
      );

      const classOfferingBySubjectMap = new Map(
        classOfferings.map((offering) => [
          offering.subject_id,
          offering,
        ])
      );

      const subjectRequirementMap = new Map(
        subjectRequirements.map((requirement) => [
          requirement.class_offering_id,
          requirement,
        ])
      );

      const enrichedSteps = safeSteps
        .map((step) => {
          const classOffering = step.subject_id
            ? classOfferingByTeacherMap.get(
                [
                  step.subject_id,
                  step.approver_id,
                ].join("|")
              ) ||
              classOfferingBySubjectMap.get(
                step.subject_id
              ) ||
              null
            : null;

          return {
            ...step,

            submission:
              submissionMap.get(step.id) || null,

            approver:
              approverMap.get(step.approver_id) ||
              null,

            classOffering,

            subjectRequirement:
              classOffering
                ? subjectRequirementMap.get(
                    classOffering.id
                  ) || null
                : null,
          };
        })
        .sort((first, second) => {
          const firstIsSubject =
            Boolean(first.subject_id);

          const secondIsSubject =
            Boolean(second.subject_id);

          if (
            firstIsSubject !== secondIsSubject
          ) {
            return firstIsSubject ? -1 : 1;
          }

          return getStepName(first).localeCompare(
            getStepName(second)
          );
        });

      setSteps(enrichedSteps);
    } catch (error) {
      console.error(
        "Load student clearance error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Unable to Load Clearance",
        text:
          error?.message ||
          "An unexpected error occurred while loading your clearance.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addSignedUrls]);

  useEffect(() => {
    loadStudentClearance();
  }, [loadStudentClearance]);

  /*
  |--------------------------------------------------------------------------
  | PROGRESS
  |--------------------------------------------------------------------------
  */

  const progress = useMemo(() => {
    const total = steps.length;

    const approved = steps.filter(
      (step) => step.status === "Approved"
    ).length;

    const rejected = steps.filter(
      (step) => step.status === "Rejected"
    ).length;

    const pending = steps.filter(
      (step) => step.status === "Pending"
    ).length;

    const submitted = steps.filter(
      (step) => Boolean(step.submission)
    ).length;

    const percentage =
      total > 0
        ? Math.round((approved / total) * 100)
        : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      submitted,
      percentage,
    };
  }, [steps]);

  const organizedSteps = useMemo(() => {
    return [...steps].sort((first, second) => {
      const rankDifference =
        getStepWorkflowRank(first) -
        getStepWorkflowRank(second);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      return getStepName(first).localeCompare(
        getStepName(second)
      );
    });
  }, [steps]);

  const submissionOverview = useMemo(() => {
    const ready = steps.filter((step) => {
      const needsStudentAction =
        step.status === "Rejected" ||
        (step.status === "Pending" &&
          !step.submission);

      return (
        needsStudentAction &&
        !getSubmissionBlockedReason(step)
      );
    }).length;

    const waitingToOpen = steps.filter(
      (step) =>
        Boolean(
          getSubmissionBlockedReason(step)
        ) &&
        (step.status === "Rejected" ||
          (step.status === "Pending" &&
            !step.submission))
    ).length;

    const underReview = steps.filter(
      (step) =>
        step.status === "Pending" &&
        Boolean(step.submission)
    ).length;

    const completed = steps.filter(
      (step) => step.status === "Approved"
    ).length;

    return {
      ready,
      waitingToOpen,
      underReview,
      completed,
    };
  }, [steps]);

  /*
  |--------------------------------------------------------------------------
  | CURRENT CLEARANCE CYCLE CHECK
  |--------------------------------------------------------------------------
  */

  const hasCurrentCycleRequest =
    clearanceRequest &&
    clearanceRequest.school_year ===
      student?.school_year &&
    clearanceRequest.semester ===
      student?.semester &&
    [
      "Pending",
      "In Progress",
      "Completed",
    ].includes(clearanceRequest.status);

  /*
  |--------------------------------------------------------------------------
  | SUBMIT MAIN CLEARANCE REQUEST
  |--------------------------------------------------------------------------
  */

  const handleRequestClearance = async () => {
    if (!student) {
      await Swal.fire({
        icon: "error",
        title: "Student Record Missing",
        text:
          "Unable to find your student profile.",
      });

      return;
    }

    if (student.status !== "Active") {
      await Swal.fire({
        icon: "warning",
        title: "Account Not Active",
        text:
          "Your account must be activated by the administrator before requesting clearance.",
      });

      return;
    }

    if (!student.section_id) {
      await Swal.fire({
        icon: "warning",
        title: "Official Block Not Assigned",
        text:
          "The administrator must assign your official course, year level, and block first.",
      });

      return;
    }

    if (hasCurrentCycleRequest) {
      await Swal.fire({
        icon: "info",
        title: "Clearance Request Exists",
        text:
          "You already have a clearance request for your current semester and school year.",
      });

      return;
    }

    const schoolYear =
      student.school_year ||
      "Official assigned school year";

    const semester =
      student.semester ||
      "Official assigned semester";

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Submit Clearance Request?",
      html: `
        <div style="text-align:left">
          <p><strong>School Year:</strong> ${schoolYear}</p>
          <p><strong>Semester:</strong> ${semester}</p>
          <p style="margin-top:12px;color:#64748b">
            Your subject and office requirements will be assigned
            automatically to the correct approvers.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Submit Request",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setSubmittingRequest(true);

      const result = await requestClearance(
        student.id,
        schoolYear,
        semester
      );

      if (!result.success) {
        throw new Error(
          "The clearance request was not created."
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Request Submitted",
        text: `${
          result.stepCount || 0
        } clearance requirement${
          result.stepCount === 1 ? "" : "s"
        } were assigned successfully.`,
      });

      await loadStudentClearance();
    } catch (error) {
      console.error(
        "Request clearance error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Request Failed",
        text:
          error?.message ||
          "Unable to submit your clearance request.",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN SUBMISSION MODAL
  |--------------------------------------------------------------------------
  */

  const openSubmissionModal = async (step) => {
    if (step.status === "Approved") {
      await Swal.fire({
        icon: "info",
        title: "Already Approved",
        text:
          "This clearance requirement has already been approved.",
      });

      return;
    }

    const blockedReason =
      getSubmissionBlockedReason(step);

    if (blockedReason) {
      await Swal.fire({
        icon:
          blockedReason.key === "deadline"
            ? "warning"
            : "info",
        title: blockedReason.title,
        text: blockedReason.message,
      });

      return;
    }

    if (
      step.status === "Pending" &&
      step.submission
    ) {
      await Swal.fire({
        icon: "info",
        title: "Waiting for Review",
        text:
          "Your current submission is already waiting for the assigned approver.",
      });

      return;
    }

    setSelectedStep(step);

    setSubmissionText(
      step.status === "Rejected"
        ? step.submission?.submission_text || ""
        : ""
    );

    setSelectedFile(null);
  };

  const closeSubmissionModal = () => {
    if (submittingStepId) return;

    setSelectedStep(null);
    setSubmissionText("");
    setSelectedFile(null);
  };

  /*
  |--------------------------------------------------------------------------
  | FILE VALIDATION
  |--------------------------------------------------------------------------
  */

  const handleFileChange = async (event) => {
    const file =
      event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      selectedStep &&
      !stepAllowsFile(selectedStep)
    ) {
      event.target.value = "";
      setSelectedFile(null);

      await Swal.fire({
        icon: "warning",
        title: "File Not Allowed",
        text:
          "This requirement accepts a text response only.",
      });

      return;
    }

    const allowedTypes =
      getStepAllowedFileTypes(selectedStep);

    if (
      !fileMatchesAllowedType(
        file,
        allowedTypes
      )
    ) {
      event.target.value = "";
      setSelectedFile(null);

      await Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: `Allowed file types: ${formatAllowedFileTypes(
          selectedStep
        )}.`,
      });

      return;
    }

    const maxFileSizeMb =
      getStepMaxFileSizeMb(selectedStep);

    const maxFileSizeBytes =
      maxFileSizeMb * 1024 * 1024;

    if (file.size > maxFileSizeBytes) {
      event.target.value = "";
      setSelectedFile(null);

      await Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text: `The attachment must not exceed ${maxFileSizeMb} MB.`,
      });

      return;
    }

    setSelectedFile(file);
  };

  /*
  |--------------------------------------------------------------------------
  | UPLOAD AND SUBMIT REQUIREMENT
  |--------------------------------------------------------------------------
  */

  const handleSubmitRequirement = async () => {
    if (!selectedStep || !student) return;

    const cleanText = submissionText.trim();

    const blockedReason =
      getSubmissionBlockedReason(selectedStep);

    if (blockedReason) {
      await Swal.fire({
        icon:
          blockedReason.key === "deadline"
            ? "warning"
            : "info",
        title: blockedReason.title,
        text: blockedReason.message,
      });

      return;
    }

    const allowsText =
      stepAllowsText(selectedStep);

    const allowsFile =
      stepAllowsFile(selectedStep);

    if (!allowsText && cleanText) {
      await Swal.fire({
        icon: "warning",
        title: "Text Response Not Allowed",
        text:
          "This requirement accepts a file attachment only.",
      });

      return;
    }

    if (!allowsFile && selectedFile) {
      await Swal.fire({
        icon: "warning",
        title: "File Not Allowed",
        text:
          "This requirement accepts a text response only.",
      });

      return;
    }

    if (
      allowsText &&
      !allowsFile &&
      !cleanText
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Text Response Required",
        text:
          "Enter the required response before submitting.",
      });

      return;
    }

    if (
      !allowsText &&
      allowsFile &&
      !selectedFile
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Attachment Required",
        text:
          "Upload the required attachment before submitting.",
      });

      return;
    }

    if (
      allowsText &&
      allowsFile &&
      !cleanText &&
      !selectedFile
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Submission Required",
        text:
          "Enter a response or upload the requested attachment.",
      });

      return;
    }

    const isResubmission =
      selectedStep.status === "Rejected";

    const confirmation = await Swal.fire({
      icon: "question",
      title: isResubmission
        ? "Resubmit Requirement?"
        : "Submit Requirement?",
      text: `${getStepName(selectedStep)} — ${
        selectedFile
          ? selectedFile.name
          : "Message only"
      }`,
      showCancelButton: true,
      confirmButtonText: isResubmission
        ? "Resubmit"
        : "Submit",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    let uploadedFilePath = null;

    try {
      setSubmittingStepId(selectedStep.id);

      /*
      |--------------------------------------------------------------------------
      | UPLOAD PRIVATE ATTACHMENT
      |--------------------------------------------------------------------------
      */

      if (selectedFile) {
        const safeFileName = sanitizeFileName(
          selectedFile.name
        );

        const uniqueName = `${Date.now()}-${createUniqueId()}-${safeFileName}`;

        uploadedFilePath = [
          student.id,
          selectedStep.id,
          uniqueName,
        ].join("/");

        const {
          error: uploadError,
        } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(
            uploadedFilePath,
            selectedFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: selectedFile.type,
            }
          );

        if (uploadError) throw uploadError;
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE SUBMISSION THROUGH SECURE RPC
      |--------------------------------------------------------------------------
      */

      const {
        data,
        error: submissionError,
      } = await supabase.rpc(
        "submit_clearance_requirement",
        {
          p_step_id: selectedStep.id,

          p_submission_text:
            cleanText || null,

          p_attachment_url:
            uploadedFilePath || null,

          p_attachment_name:
            selectedFile?.name || null,
        }
      );

      if (submissionError) {
        throw submissionError;
      }

      await Swal.fire({
        icon: "success",
        title: data?.isResubmission
          ? "Requirement Resubmitted"
          : "Requirement Submitted",
        text: data?.isResubmission
          ? "Your corrected requirement was sent back to the assigned approver."
          : "Your requirement was sent to the assigned approver for review.",
      });

      setSelectedStep(null);
      setSubmissionText("");
      setSelectedFile(null);

      await loadStudentClearance();
    } catch (error) {
      console.error(
        "Submit requirement error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text:
          error?.message ||
          "Unable to submit the clearance requirement.",
      });
    } finally {
      setSubmittingStepId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD DIGITAL CLEARANCE PASS
  |--------------------------------------------------------------------------
  */

  const handleOpenClearancePass = async () => {
    if (
      !clearanceRequest ||
      clearanceRequest.status !== "Completed"
    ) {
      await Swal.fire({
        icon: "info",
        title: "Clearance Not Completed",
        text:
          "Your Digital Clearance Pass becomes available after all required subject and office approvals are completed.",
      });

      return;
    }

    try {
      setLoadingPass(true);

      const { data, error } = await supabase.rpc(
        "get_my_clearance_pass",
        {
          p_request_id: clearanceRequest.id,
        }
      );

      if (error) throw error;

      if (!data?.success || !data?.clearedForEnrollment) {
        throw new Error(
          "Your clearance pass is not ready for enrollment verification."
        );
      }

      setClearancePass(data);
      setShowClearancePass(true);
    } catch (error) {
      console.error(
        "Load clearance pass error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Digital Pass",
        text:
          error?.message ||
          "Your Digital Clearance Pass could not be loaded.",
      });
    } finally {
      setLoadingPass(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | EMAIL DIGITAL CLEARANCE PASS
  |--------------------------------------------------------------------------
  */

  const handleSendPassEmail = async () => {
    if (
      !clearanceRequest?.id ||
      clearanceRequest.status !== "Completed"
    ) {
      await Swal.fire({
        icon: "info",
        title: "Clearance Not Completed",
        text:
          "The Digital Clearance Pass can only be emailed after all clearance steps are approved.",
      });

      return;
    }

    try {
      setSendingPassEmail(true);

      const result =
        await sendClearancePassEmail({
          requestId:
            clearanceRequest.id,
          force: true,
        });

      await Swal.fire({
        icon: "success",
        title: "Digital Pass Emailed",
        text: `The Digital Clearance Pass was sent to ${
          result?.recipientEmail ||
          student?.email ||
          "your registered email"
        }.`,
      });
    } catch (error) {
      console.error(
        "Email Digital Clearance Pass error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Email Digital Pass",
        text:
          error?.message ||
          "The Digital Clearance Pass could not be emailed.",
      });
    } finally {
      setSendingPassEmail(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PRINT OR SAVE DIGITAL PASS AS PDF
  |--------------------------------------------------------------------------
  */

  const handlePrintClearancePass = () => {
    if (!clearancePass) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=750"
    );

    if (!printWindow) {
      Swal.fire({
        icon: "warning",
        title: "Popup Blocked",
        text:
          "Allow popups for this website before printing the Digital Clearance Pass.",
      });

      return;
    }

    const courseDisplay = [
      clearancePass.courseCode,
      clearancePass.courseName,
    ]
      .filter(Boolean)
      .join(" — ");

    const classDisplay = [
      clearancePass.yearLevel,
      clearancePass.blockCode
        ? `Block ${clearancePass.blockCode}`
        : null,
    ]
      .filter(Boolean)
      .join(" — ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>${escapeHtml(
            clearancePass.clearanceReference
          )}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              background: #f1f5f9;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .pass {
              max-width: 850px;
              margin: 0 auto;
              overflow: hidden;
              border: 2px solid #1d4ed8;
              border-radius: 24px;
              background: #ffffff;
            }

            .header {
              padding: 32px;
              background: linear-gradient(135deg, #1d4ed8, #4338ca);
              color: #ffffff;
              text-align: center;
            }

            .header h1 {
              margin: 0;
              font-size: 32px;
            }

            .header p {
              margin: 10px 0 0;
              color: #dbeafe;
            }

            .status {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 22px;
              border-radius: 999px;
              background: #dcfce7;
              color: #15803d;
              font-size: 15px;
              font-weight: 700;
              letter-spacing: 0.04em;
            }

            .content {
              padding: 32px;
            }

            .student-name {
              margin-bottom: 8px;
              font-size: 28px;
              font-weight: 700;
              text-align: center;
            }

            .student-id {
              margin-bottom: 30px;
              color: #64748b;
              text-align: center;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }

            .field {
              padding: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              background: #f8fafc;
            }

            .label {
              margin-bottom: 7px;
              color: #64748b;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }

            .value {
              color: #1e293b;
              font-size: 16px;
              font-weight: 700;
            }

            .verification {
              margin-top: 24px;
              padding: 24px;
              border: 2px dashed #2563eb;
              border-radius: 16px;
              background: #eff6ff;
              text-align: center;
            }

            .reference {
              margin-top: 12px;
              color: #1d4ed8;
              font-size: 22px;
              font-weight: 700;
            }

            .code {
              margin-top: 14px;
              padding: 14px;
              border-radius: 10px;
              background: #ffffff;
              font-family: monospace;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.12em;
            }

            .footer {
              padding: 22px 32px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 12px;
              line-height: 1.6;
              text-align: center;
            }

            @media (max-width: 640px) {
              body {
                padding: 16px;
              }

              .grid {
                grid-template-columns: 1fr;
              }
            }

            @media print {
              body {
                padding: 0;
                background: #ffffff;
              }

              .pass {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="pass">
            <div class="header">
              <h1>SmartClear AI</h1>
              <p>Official Digital Clearance Pass</p>
              <div class="status">CLEARED FOR ENROLLMENT</div>
            </div>

            <div class="content">
              <div class="student-name">
                ${escapeHtml(clearancePass.studentName)}
              </div>

              <div class="student-id">
                Student Number:
                ${escapeHtml(clearancePass.studentId)}
              </div>

              <div class="grid">
                <div class="field">
                  <div class="label">Program</div>
                  <div class="value">${escapeHtml(
                    courseDisplay
                  )}</div>
                </div>

                <div class="field">
                  <div class="label">Year and Block</div>
                  <div class="value">${escapeHtml(
                    classDisplay
                  )}</div>
                </div>

                <div class="field">
                  <div class="label">Semester</div>
                  <div class="value">${escapeHtml(
                    clearancePass.semester
                  )}</div>
                </div>

                <div class="field">
                  <div class="label">School Year</div>
                  <div class="value">${escapeHtml(
                    clearancePass.schoolYear
                  )}</div>
                </div>

                <div class="field">
                  <div class="label">Completed</div>
                  <div class="value">${escapeHtml(
                    formatDate(clearancePass.completedAt)
                  )}</div>
                </div>

                <div class="field">
                  <div class="label">Approved Requirements</div>
                  <div class="value">${escapeHtml(
                    `${clearancePass.approvedSteps}/${clearancePass.totalSteps}`
                  )}</div>
                </div>
              </div>

              <div class="verification">
                <div class="label">Clearance Reference</div>
                <div class="reference">
                  ${escapeHtml(
                    clearancePass.clearanceReference
                  )}
                </div>

                <div class="label" style="margin-top: 20px;">
                  Verification Code
                </div>

                <div class="code">
                  ${escapeHtml(
                    clearancePass.verificationCode
                  )}
                </div>

                <p style="margin: 18px 0 0; color: #475569; font-size: 13px;">
                  Present this reference and verification code to the
                  Registrar or authorized enrollment personnel.
                </p>
              </div>
            </div>

            <div class="footer">
              This pass was generated by SmartClear AI. Its validity must be
              confirmed through the official clearance verification system.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStudentClearance();
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading your clearance information...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="mb-5 flex min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white shadow-lg sm:mb-8 sm:rounded-3xl sm:p-8 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
            Request Clearance
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:mt-3 sm:text-base">
            Submit your clearance requirements and monitor
            every subject and office approval.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <FaSyncAlt
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={handleRequestClearance}
            disabled={
              submittingRequest ||
              hasCurrentCycleRequest
            }
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            <FaPaperPlane />

            {submittingRequest
              ? "Submitting..."
              : hasCurrentCycleRequest
                ? "Request Already Created"
                : "Submit Clearance Request"}
          </button>
        </div>
      </div>

      {/* Student Information */}

      <div className="mb-5 min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:mb-8 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center gap-3 sm:mb-6">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <FaClipboardCheck className="text-xl" />
          </div>

          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
            Student Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">
              Student Number
            </p>

            <h3 className="mt-2 break-words font-semibold text-slate-800">
              {student?.student_id || "Not assigned"}
            </h3>
          </div>

          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">
              Student Name
            </p>

            <h3 className="mt-2 break-words font-semibold text-slate-800">
              {student?.full_name || "No Name"}
            </h3>
          </div>

          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">
              Program
            </p>

            <h3 className="mt-2 break-words font-semibold text-slate-800">
              {student?.course || "Not assigned"}
            </h3>
          </div>

          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:p-5">
            <p className="text-sm text-slate-500">
              Year and Block
            </p>

            <h3 className="mt-2 break-words font-semibold text-slate-800">
              {student?.year_level ||
                "No year level"}

              {student?.section
                ? ` — Block ${student.section}`
                : ""}
            </h3>
          </div>
        </div>
      </div>

      {!clearanceRequest ? (
        <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-6 text-center shadow-sm sm:rounded-3xl sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-700 sm:h-20 sm:w-20 sm:text-4xl">
            <FaClipboardCheck />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-800 sm:mt-6 sm:text-2xl">
            No Clearance Request Yet
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Submit a clearance request to generate your
            official subject and office requirements.
          </p>

          <button
            type="button"
            onClick={handleRequestClearance}
            disabled={submittingRequest}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-7 sm:w-auto sm:px-7"
          >
            <FaPaperPlane />

            {submittingRequest
              ? "Submitting..."
              : "Submit Clearance Request"}
          </button>
        </div>
      ) : (
        <>
          {/* Completed Banner */}

          {clearanceRequest.status ===
            "Completed" && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm sm:mb-8 sm:rounded-3xl sm:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl text-white sm:h-16 sm:w-16 sm:text-3xl">
                  <FaCheckCircle />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-green-800">
                    Clearance Completed
                  </h2>

                  <p className="mt-2 text-green-700">
                    All your required subject and office
                    clearances have been approved. You are
                    cleared for enrollment verification.
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenClearancePass}
                    disabled={loadingPass}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                  >
                    {loadingPass ? (
                      <>
                        <FaSyncAlt className="animate-spin" />
                        Loading Pass...
                      </>
                    ) : (
                      <>
                        <FaShieldAlt />
                        View Digital Clearance Pass
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Request Summary */}

          <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Overall Status
              </p>

              <span
                className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-semibold ${getOverallStatusStyle(
                  clearanceRequest.status
                )}`}
              >
                {clearanceRequest.status}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Clearance Cycle
              </p>

              <h3 className="mt-3 font-bold text-slate-800">
                {clearanceRequest.semester}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {clearanceRequest.school_year}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Approved Steps
              </p>

              <h3 className="mt-3 text-2xl font-bold text-green-700 sm:text-3xl">
                {progress.approved}/{progress.total}
              </h3>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Submitted Requirements
              </p>

              <h3 className="mt-3 text-2xl font-bold text-blue-700 sm:text-3xl">
                {progress.submitted}/{progress.total}
              </h3>
            </div>
          </div>

          {/* Progress */}

          <div className="mb-5 min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:mb-8 sm:rounded-3xl sm:p-7">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                  Overall Progress
                </h2>

                <p className="mt-1 text-slate-500">
                  {progress.approved} approved,{" "}
                  {progress.pending} pending,{" "}
                  {progress.rejected} rejected
                </p>
              </div>

              <span className="text-2xl font-bold text-blue-700 sm:text-3xl">
                {progress.percentage}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 sm:mt-6 sm:h-4">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${progress.percentage}%`,
                }}
              />
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Last updated:{" "}
              {formatDate(clearanceRequest.updated_at)}
            </p>
          </div>

          {/* Clearance Requirements */}

          <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-3 shadow-lg sm:rounded-3xl sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Clearance Requirements
              </h2>

              <p className="mt-2 text-slate-500">
                Requirements are arranged by the action you
                can take. A subject submission stays locked
                until the assigned teacher opens it.
              </p>
            </div>

            {steps.length > 0 && (
              <div className="mb-6 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <FaUpload />
                    <p className="text-xs font-bold uppercase tracking-wide">
                      Ready to Submit
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-black text-emerald-800">
                    {submissionOverview.ready}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <FaClock />
                    <p className="text-xs font-bold uppercase tracking-wide">
                      Waiting to Open
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-black text-amber-800">
                    {submissionOverview.waitingToOpen}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <FaEye />
                    <p className="text-xs font-bold uppercase tracking-wide">
                      Under Review
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-black text-blue-800">
                    {submissionOverview.underReview}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <FaCheckCircle />
                    <p className="text-xs font-bold uppercase tracking-wide">
                      Completed
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-black text-green-800">
                    {submissionOverview.completed}
                  </p>
                </div>
              </div>
            )}

            {steps.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
                No clearance requirements were generated.
              </div>
            ) : (
              <div className="space-y-5">
                {organizedSteps.map((step) => {
                  const displayedStatus =
                    getDisplayedStepStatus(step);

                  const blockedReason =
                    getSubmissionBlockedReason(step);

                  const submissionWindowOpen =
                    isSubmissionWindowOpen(step);

                  const canSubmit =
                    step.status === "Pending" &&
                    !step.submission &&
                    submissionWindowOpen;

                  const canResubmit =
                    step.status === "Rejected" &&
                    submissionWindowOpen;

                  return (
                    <div
                      key={step.id}
                      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:shadow-md sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
                            {step.subject_id ? (
                              <FaBook />
                            ) : (
                              <FaBuilding />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <h3 className="break-words text-base font-bold text-slate-800 sm:text-lg">
                                {getStepName(step)}
                              </h3>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {getStepType(step)}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {getStepCode(step)}
                            </p>

                            <div className="mt-3 flex min-w-0 items-start gap-2 text-sm text-slate-600">
                              <FaUserCheck className="mt-0.5 shrink-0 text-blue-700" />

                              <span className="min-w-0 break-words">
                                Approver:{" "}
                                <strong>
                                  {step.approver
                                    ?.full_name ||
                                    "Assigned Approver"}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`w-full rounded-full px-4 py-2 text-center text-sm font-semibold sm:w-fit ${getDisplayedStepStatusStyle(
                            step
                          )}`}
                        >
                          {displayedStatus}
                        </span>
                      </div>

                      {/* Teacher-provided Subject Requirement */}

                      {step.subject_id && (
                        step.subjectRequirement ? (
                          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                  Teacher-Provided Requirement
                                </p>

                                <h4 className="mt-2 text-lg font-bold text-slate-800">
                                  {step.subjectRequirement.title}
                                </h4>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                  {step.subjectRequirement.description ||
                                    "No additional instructions provided."}
                                </p>
                              </div>

                              <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-blue-700">
                                  {step.subjectRequirement.submission_type}
                                </span>

                                <span
                                  className={`rounded-full px-3 py-2 text-xs font-bold ${
                                    step.subjectRequirement.is_required
                                      ? "bg-red-100 text-red-700"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {step.subjectRequirement.is_required
                                    ? "Required"
                                    : "Optional"}
                                </span>

                                <span
                                  className={`rounded-full px-3 py-2 text-xs font-bold ${
                                    step.subjectRequirement.submission_type ===
                                    "No Submission"
                                      ? "bg-slate-200 text-slate-700"
                                      : isPastDeadline(
                                            step.subjectRequirement
                                          )
                                        ? "bg-red-100 text-red-700"
                                        : step.subjectRequirement.is_open
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {step.subjectRequirement.submission_type ===
                                  "No Submission"
                                    ? "Teacher Review Only"
                                    : isPastDeadline(
                                          step.subjectRequirement
                                        )
                                      ? "Deadline Passed"
                                      : step.subjectRequirement.is_open
                                        ? "Submission Open"
                                        : "Submission Not Open"}
                                </span>
                              </div>
                            </div>

                            {step.subjectRequirement.deadline && (
                              <p className="mt-4 text-xs font-semibold text-slate-500">
                                Deadline: {formatDate(
                                  step.subjectRequirement.deadline
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex gap-3">
                              <FaExclamationTriangle className="mt-1 shrink-0 text-amber-600" />

                              <div>
                                <p className="font-bold text-amber-700">
                                  Submission Not Available Yet
                                </p>

                                <p className="mt-1 text-sm leading-6 text-amber-700">
                                  You cannot submit this subject requirement yet. The assigned teacher must post the instructions and open the submission window first.
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {/* Rejection */}

                      {step.status === "Rejected" && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex gap-3">
                            <FaExclamationTriangle className="mt-1 shrink-0 text-red-600" />

                            <div>
                              <p className="font-bold text-red-700">
                                Requirement Rejected
                              </p>

                              <p className="mt-1 text-sm text-red-700">
                                {step.remarks ||
                                  "The approver did not provide a rejection reason."}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Submission */}

                      {step.submission && (
                        <div className="mt-5 min-w-0 rounded-xl bg-slate-50 p-4">
                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                            <div>
                              <p className="font-bold text-slate-700">
                                Current Submission — Version{" "}
                                {step.submission.version}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Submitted{" "}
                                {formatDate(
                                  step.submission
                                    .submitted_at
                                )}
                              </p>

                              {step.submission
                                .submission_text && (
                                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                  {
                                    step.submission
                                      .submission_text
                                  }
                                </p>
                              )}
                            </div>

                            {step.submission.signed_url && (
                              <a
                                href={
                                  step.submission
                                    .signed_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:w-fit"
                              >
                                <FaEye />
                                View Attachment
                              </a>
                            )}
                          </div>

                          {step.submission
                            .attachment_name && (
                            <div className="mt-3 flex min-w-0 items-start gap-2 break-all text-xs text-slate-500">
                              <FaFileAlt />

                              {
                                step.submission
                                  .attachment_name
                              }
                            </div>
                          )}
                        </div>
                      )}

                      {/* Review Remarks */}

                      {step.status === "Approved" && (
                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                          <p className="font-bold text-green-700">
                            Approved
                          </p>

                          <p className="mt-1 text-sm text-green-700">
                            {step.remarks ||
                              "Requirement verified and approved."}
                          </p>

                          <p className="mt-2 text-xs text-green-600">
                            Reviewed:{" "}
                            {formatDate(
                              step.reviewed_at
                            )}
                          </p>
                        </div>
                      )}

                      {/* Actions */}

                      {(canSubmit ||
                        canResubmit ||
                        (step.status === "Pending" &&
                          step.submission)) && (
                        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
                        {canSubmit && (
                          <button
                            type="button"
                            onClick={() =>
                              openSubmissionModal(step)
                            }
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
                          >
                            <FaUpload />
                            Submit Requirement
                          </button>
                        )}

                        {canResubmit && (
                          <button
                            type="button"
                            onClick={() =>
                              openSubmissionModal(step)
                            }
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-red-700 sm:w-auto"
                          >
                            <FaSyncAlt />
                            Correct and Resubmit
                          </button>
                        )}

                        {step.status === "Pending" &&
                          step.submission && (
                            <div className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-100 px-4 py-3 text-center font-semibold text-yellow-700 sm:w-auto sm:px-5">
                              <FaClock />
                              Waiting for Approver Review
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Submission Modal */}

      {selectedStep && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-4 sm:p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  {selectedStep.status === "Rejected"
                    ? "Correct and Resubmit"
                    : "Submit Requirement"}
                </p>

                <h2 className="mt-1 break-words text-xl font-bold text-slate-800 sm:text-2xl">
                  {getStepName(selectedStep)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {getStepType(selectedStep)} •{" "}
                  {getStepCode(selectedStep)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSubmissionModal}
                disabled={Boolean(submittingStepId)}
                className="rounded-xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6">
              {selectedStep.status === "Rejected" &&
                selectedStep.remarks && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="font-bold text-red-700">
                      Rejection Reason
                    </p>

                    <p className="mt-2 text-sm text-red-700">
                      {selectedStep.remarks}
                    </p>
                  </div>
                )}

              {stepAllowsText(selectedStep) && (
                <div>
                  <label
                    htmlFor="submissionText"
                    className="mb-2 block font-semibold text-slate-700"
                  >
                    Submission Message
                  </label>

                  <textarea
                    id="submissionText"
                    rows="6"
                    value={submissionText}
                    onChange={(event) =>
                      setSubmissionText(
                        event.target.value
                      )
                    }
                    placeholder="Describe the requirement you are submitting..."
                    disabled={Boolean(submittingStepId)}
                    className="w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>
              )}

              {stepAllowsFile(selectedStep) && (
              <div>
                <label
                  htmlFor="requirementFile"
                  className="mb-2 block font-semibold text-slate-700"
                >
                  Attachment
                </label>

                <label
                  htmlFor="requirementFile"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-5 text-center transition hover:bg-blue-100 sm:p-8"
                >
                  <FaUpload className="text-4xl text-blue-700" />

                  <p className="mt-4 font-semibold text-slate-700">
                    Allowed: {formatAllowedFileTypes(
                      selectedStep
                    )}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Maximum file size:{" "}
                    {getStepMaxFileSizeMb(
                      selectedStep
                    )}{" "}
                    MB
                  </p>

                  <input
                    id="requirementFile"
                    type="file"
                    accept={getFileAcceptValue(selectedStep)}
                    onChange={handleFileChange}
                    disabled={Boolean(submittingStepId)}
                    className="hidden"
                  />
                </label>

                {selectedFile && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <FaFileAlt className="shrink-0 text-blue-700" />

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-700">
                          {selectedFile.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {(
                            selectedFile.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFile(null)
                      }
                      disabled={Boolean(
                        submittingStepId
                      )}
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-100"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
              )}

              {stepAllowsFile(selectedStep) && (
                <div className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
                  Your attachment is stored privately. Only
                  you, the assigned approver, and authorized
                  administrators can access it.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeSubmissionModal}
                  disabled={Boolean(submittingStepId)}
                  className="flex-1 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRequirement}
                  disabled={Boolean(submittingStepId)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingStepId ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />

                      {selectedStep.status ===
                      "Rejected"
                        ? "Resubmit Requirement"
                        : "Submit Requirement"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Compact Digital Clearance Pass Modal */}

      {showClearancePass &&
        clearancePass && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-3">
          <div className="max-h-[100dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setShowClearancePass(
                    false
                  )
                }
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                aria-label="Close Digital Clearance Pass"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
                  <FaShieldAlt />
                </div>

                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    SmartClear AI
                  </h2>

                  <p className="text-xs text-blue-100 sm:text-sm">
                    Official Digital Clearance Pass
                  </p>
                </div>

                <span className="ml-auto hidden items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-xs font-black text-green-700 sm:inline-flex">
                  <FaGraduationCap />
                  CLEARED
                </span>
              </div>
            </div>

            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="break-words text-xl font-black text-slate-800 sm:text-2xl">
                    {clearancePass.studentName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Student Number:{" "}
                    {clearancePass.studentId}
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-xs font-black text-green-700 sm:hidden">
                  <FaGraduationCap />
                  CLEARED FOR ENROLLMENT
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.courseCode ||
                      "N/A"}
                  </p>

                  {clearancePass.courseName && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {clearancePass.courseName}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Year and Block
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.yearLevel ||
                      "N/A"}

                    {clearancePass.blockCode
                      ? ` — Block ${clearancePass.blockCode}`
                      : ""}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Clearance Cycle
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.semester ||
                      "N/A"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {clearancePass.schoolYear ||
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Approval
                  </p>

                  <p className="mt-1 text-lg font-black text-green-700">
                    {clearancePass.approvedSteps}/
                    {clearancePass.totalSteps}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Completed
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatDate(
                      clearancePass.completedAt
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Verification
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1.5 text-xs font-black ${
                      clearancePass.verificationStatus ===
                      "Verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {clearancePass.verificationStatus ||
                      "Ready"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Clearance Reference
                  </p>

                  <p className="mt-1 break-all font-mono text-base font-black text-blue-800">
                    {clearancePass.clearanceReference}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Verification Code
                  </p>

                  <p className="mt-1 break-all font-mono text-base font-black tracking-wider text-slate-800">
                    {clearancePass.verificationCode}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Present the reference and verification code to the Registrar or authorized enrollment personnel.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowClearancePass(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={
                    handlePrintClearancePass
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <FaPrint />
                  Print / PDF
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendPassEmail
                  }
                  disabled={
                    sendingPassEmail
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingPassEmail ? (
                    <FaSyncAlt className="animate-spin" />
                  ) : (
                    <FaEnvelope />
                  )}

                  {sendingPassEmail
                    ? "Sending..."
                    : "Email Pass"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default RequestClearance