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
  uploadGuidanceAttachment,
  getGuidanceAttachmentsWithUrls,
  deleteGuidanceAttachment,
  formatGuidanceAttachmentSize,
  requestGuidanceReschedule,
  getGuidanceRescheduleRequests,
} from "../../services/guidanceService";

import {
  FaBook,
  FaBuilding,
  FaCheckCircle,
  FaChevronDown,
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

const GUIDANCE_OFFICE_CODE = "GUI";

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

const isAdviserStep = (step) =>
  String(step?.step_type || "").trim().toLowerCase() === "adviser";

const getStepName = (step) => {
  if (isAdviserStep(step)) return "Faculty Adviser";
  if (step?.subjects?.subject_name) return step.subjects.subject_name;
  if (step?.offices?.office_name) return step.offices.office_name;

  return "Unassigned Clearance Requirement";
};

const getStepCode = (step) => {
  if (isAdviserStep(step)) return "Block Adviser";

  return (
    step?.subjects?.subject_code ||
    step?.offices?.office_code ||
    "No code"
  );
};

const getStepType = (step) => {
  if (isAdviserStep(step)) return "Adviser";

  return step?.subject_id ? "Subject" : "Office";
};

const getOverallStatusStyle = (status) => {
  if (status === "Completed") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-blue-100 text-blue-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";

  return "bg-yellow-100 text-yellow-700";
};

const getRequirement = (step) => step?.subjectRequirement || null;

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

  const submissionType = getRequirement(step)?.submission_type;

  return submissionType === "Text" || submissionType === "File or Text";
};

const stepAllowsFile = (step) => {
  if (!step?.subject_id) return true;

  const submissionType = getRequirement(step)?.submission_type;

  return submissionType === "File" || submissionType === "File or Text";
};

const isSubmissionWindowOpen = (step) => {
  if (isAdviserStep(step)) return false;

  if (!step?.subject_id) {
    return !getSubmissionBlockedReason(step);
  }

  const requirement = getRequirement(step);

  return Boolean(
    subjectNeedsStudentSubmission(step) &&
      requirement?.is_open === true &&
      !isPastDeadline(requirement)
  );
};

const getSubmissionBlockedReason = (step) => {
  if (isAdviserStep(step)) {
    return {
      key: "faculty-review",
      title: "Faculty Adviser Review",
      message:
        "No student submission is required for this step. Your assigned Faculty Adviser will review and clear your adviser requirement directly.",
    };
  }

  if (!step?.subject_id) {
    const settings = step.officeSubmissionSetting;
    const mode = settings?.approval_mode || "direct";

    if (mode === "direct" || mode === "manual") {
      return {
        key: "office-review",
        title:
          mode === "direct"
            ? "Office Direct Approval"
            : "Office Manual Verification",
        message:
          "No student submission is required. The assigned office approver will review and approve this clearance step.",
      };
    }

    // Rejected requirements-based office steps may be corrected and resubmitted
    // after the initial office/batch submission window has closed.
    // The server-side RPC and trigger remain authoritative.
    if (mode === "requirements" && step.status === "Rejected") {
      return null;
    }

    if (!step.officeRequirements?.length) {
      return {
        key: "office-no-items",
        title: "Waiting for Office Requirements",
        message:
          "The office has not published active requirements or questions yet.",
      };
    }

    if (!settings?.submission_enabled) {
      return {
        key: "office-closed",
        title: "Office Submission Closed",
        message: "The office has not opened student submission yet.",
      };
    }

    const now = Date.now();

    if (settings.opens_at && now < new Date(settings.opens_at).getTime()) {
      return {
        key: "office-upcoming",
        title: "Submission Not Yet Open",
        message: `The office will open submissions on ${new Date(
          settings.opens_at
        ).toLocaleString()}.`,
      };
    }

    if (settings.closes_at && now >= new Date(settings.closes_at).getTime()) {
      return {
        key: "office-deadline",
        title: "Submission Deadline Passed",
        message: `The office submission deadline was ${new Date(
          settings.closes_at
        ).toLocaleString()}.`,
      };
    }

    // The server remains authoritative for batch membership and timing.
    // The local check is only for user feedback, not authorization.
    if (step.officeBatch) {
      const batch = step.officeBatch;

      if (String(batch.status || "").trim().toLowerCase() !== "open") {
        return {
          key: "office-batch-closed",
          title: "Office Batch Closed",
          message: "Your assigned office batch is not open.",
        };
      }

      if (!batch.schedule_date || !batch.start_time || !batch.end_time) {
        return {
          key: "office-batch-unscheduled",
          title: "Batch Schedule Missing",
          message: "The assigned office batch has no complete schedule.",
        };
      }

      const start = Date.parse(
        `${batch.schedule_date}T${batch.start_time}+08:00`
      );
      const end = Date.parse(
        `${batch.end_date || batch.schedule_date}T${batch.end_time}+08:00`
      );

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return {
          key: "office-batch-invalid",
          title: "Invalid Batch Schedule",
          message: "Contact the office to correct this batch schedule.",
        };
      }

      if (now < start) {
        return {
          key: "office-batch-upcoming",
          title: "Batch Not Yet Open",
          message: "Your office batch submission time has not started.",
        };
      }

      if (now >= end) {
        return {
          key: "office-batch-ended",
          title: "Batch Schedule Ended",
          message: "Your assigned office batch submission time has ended.",
        };
      }
    }

    // Offices without batch scheduling are validated by the backend.
    return null;
  }

  const requirement = getRequirement(step);

  if (!requirement || !requirement.is_active) {
    return {
      key: "waiting",
      title: "Waiting for Teacher to Open Submission",
      message:
        "You cannot submit this requirement yet because the assigned teacher has not posted and activated the submission instructions.",
    };
  }

  if (requirement.submission_type === "No Submission") {
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
  if (step.status === "Approved") return "Approved";
  if (step.status === "Rejected") return "Needs Correction";
  if (step.status === "Pending" && step.submission) return "Under Review";

  if (step.status === "Pending") {
    // Manual/direct office steps are reviewed by staff, not submitted by students.
    // Only show "Not Submitted" for steps that actually require a submission.
    if (!step.subject_id && !isAdviserStep(step)) {
      const mode = String(
        step.officeSubmissionSetting?.approval_mode || "direct"
      ).toLowerCase();
      if (mode === "manual" || mode === "direct") {
        return "Awaiting Office Review";
      }
    }
    if (isAdviserStep(step)) return "Awaiting Adviser Review";
    return isSubmissionWindowOpen(step) ? "Ready to Submit" : "Not Submitted";
  }

  return step.status;
};

const getDisplayedStepStatusStyle = (step) => {
  if (step.status === "Approved") return "bg-green-100 text-green-700";
  if (step.status === "Pending" && step.submission) {
    return "bg-blue-100 text-blue-700";
  }
  if (step.status === "Rejected") return "bg-red-100 text-red-700";

  const blockedReason = getSubmissionBlockedReason(step);

  if (blockedReason?.key === "deadline") return "bg-red-100 text-red-700";
  if (blockedReason?.key === "faculty-review") {
    return "bg-slate-200 text-slate-700";
  }
  if (blockedReason) return "bg-amber-100 text-amber-700";

  return "bg-emerald-100 text-emerald-700";
};

const getStepWorkflowRank = (step) => {
  const blockedReason = getSubmissionBlockedReason(step);

  if (
    (step.status === "Rejected" ||
      (step.status === "Pending" && !step.submission)) &&
    !blockedReason
  ) {
    return 0;
  }

  if (blockedReason) return 1;
  if (step.status === "Pending" && step.submission) return 2;
  if (step.status === "Approved") return 3;

  return 4;
};

const isGuidanceStep = (step) =>
  !step?.subject_id &&
  String(step?.offices?.office_code || "").trim().toUpperCase() ===
    GUIDANCE_OFFICE_CODE;

const getGuidanceDisplayStatus = (step) => {
  const assignment = step?.guidanceAssignment;

  if (
    step?.status === "Approved" ||
    assignment?.guidance_status === "Approved"
  ) {
    return "Approved";
  }

  if (!assignment) return "Waiting for Schedule";

  if (assignment.guidance_status === "Needs Follow-up") {
    return "Needs Follow-up";
  }

  if (
    assignment.guidance_status === "For Review" ||
    assignment.guidance_status === "Answered"
  ) {
    return "For Guidance Review";
  }

  const scheduleState = getGuidanceScheduleState(assignment?.batch);

  if (scheduleState === "open") return "Session Open";
  if (["ended", "completed", "closed"].includes(scheduleState) && assignment?.guidance_status === "Scheduled") {
    return "Awaiting Next Guidance Batch";
  }
  if (scheduleState === "ended") return "Session Ended";
  if (scheduleState === "cancelled") return "Schedule Cancelled";
  if (scheduleState === "closed") return "Session Closed";
  if (scheduleState === "completed") return "Batch Completed";
  if (scheduleState === "upcoming") return "Scheduled";

  return "Waiting for Guidance to Open";
};

const getGuidanceStatusStyle = (step) => {
  const status = getGuidanceDisplayStatus(step);

  if (status === "Approved") return "bg-green-100 text-green-700";
  if (status === "Needs Follow-up") return "bg-red-100 text-red-700";
  if (status === "For Guidance Review") return "bg-blue-100 text-blue-700";
  if (status === "Session Open") return "bg-emerald-100 text-emerald-700";
  if (
    status === "Session Ended" ||
    status === "Schedule Cancelled" ||
    status === "Session Closed"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
};

const formatGuidanceSchedule = (batch) => {
  if (!batch?.schedule_date) {
    return "Schedule will be announced by Guidance.";
  }

  const date = new Date(`${batch.schedule_date}T00:00:00`);

  const dateText = Number.isNaN(date.getTime())
    ? batch.schedule_date
    : date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const formatTime = (value) => {
    if (!value) return null;

    const [hours, minutes] = String(value).split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return value;
    }

    const time = new Date();
    time.setHours(hours, minutes, 0, 0);

    return time.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const start = formatTime(batch.start_time);
  const end = formatTime(batch.end_time);

  const deadlineDate = batch.deadline_date || batch.schedule_date;
  const deadlineLabel = deadlineDate !== batch.schedule_date
    ? new Date(`${deadlineDate}T00:00:00`).toLocaleDateString("en-PH", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;
  return [dateText, start && end
    ? `${start} – ${deadlineLabel ? `${deadlineLabel} ` : ""}${end}`
    : start || end]
    .filter(Boolean)
    .join(" • ");
};

const getGuidanceScheduleState = (batch) => {
  if (!batch?.schedule_date || !batch?.start_time || !batch?.end_time) {
    return "unscheduled";
  }

  if (batch.status === "Cancelled") return "cancelled";
  if (batch.status === "Completed") return "completed";
  if (batch.status === "Closed") return "closed";
  if (batch.status === "Draft") return "draft";

  const start = new Date(`${batch.schedule_date}T${batch.start_time}+08:00`);
  const end = new Date(`${batch.deadline_date || batch.schedule_date}T${batch.end_time}+08:00`);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unscheduled";
  }

  if (now < start) return "upcoming";
  if (now > end) return "ended";

  return batch.status === "Open" ? "open" : "not-open";
};

const getGuidanceScheduleMessage = (batch) => {
  const state = getGuidanceScheduleState(batch);

  if (state === "upcoming") {
    return {
      title: "Scheduled Guidance Session",
      message: `Your response will open during your scheduled session: ${formatGuidanceSchedule(
        batch
      )}.`,
    };
  }

  if (["ended", "completed", "closed"].includes(state)) {
    return {
      title: "Awaiting Next Guidance Batch",
      message:
        "Your previous Guidance batch is no longer accepting responses. Since you have not submitted, your clearance remains pending while awaiting an eligible Open Guidance batch.",
    };
  }

  if (state === "cancelled") {
    return {
      title: "Guidance Schedule Cancelled",
      message:
        "This Guidance schedule has been cancelled. Wait for Guidance to assign a new schedule.",
    };
  }

  if (state === "draft" || state === "not-open") {
    return {
      title: "Waiting for Guidance to Open",
      message:
        "Your batch is assigned, but Guidance has not opened it for student responses.",
    };
  }

  if (state === "unscheduled") {
    return {
      title: "Schedule Not Available",
      message:
        "Guidance has not provided a complete date and time for this batch yet.",
    };
  }

  return null;
};

const normalizeFileType = (value) =>
  String(value || "").trim().toLowerCase();

const getStepMaxFileSizeMb = (step) => {
  const configuredSize = Number(getRequirement(step)?.max_file_size_mb);

  if (Number.isFinite(configuredSize) && configuredSize > 0) {
    return configuredSize;
  }

  return DEFAULT_MAX_FILE_SIZE_MB;
};

const getStepAllowedFileTypes = (step) => {
  const configuredTypes = getRequirement(step)?.allowed_file_types;

  if (Array.isArray(configuredTypes) && configuredTypes.length > 0) {
    return configuredTypes.map(normalizeFileType).filter(Boolean);
  }

  return DEFAULT_ALLOWED_FILE_TYPES;
};

const fileMatchesAllowedType = (file, allowedTypes) => {
  const fileType = normalizeFileType(file?.type);
  const fileName = normalizeFileType(file?.name);

  const fileExtension = fileName.includes(".")
    ? `.${fileName.split(".").pop()}`
    : "";

  return allowedTypes.some((allowedType) => {
    const normalized = normalizeFileType(allowedType);

    if (!normalized) return false;
    if (normalized.startsWith(".")) return fileExtension === normalized;
    if (normalized.includes("/")) return fileType === normalized;

    return (
      fileExtension === `.${normalized}` ||
      fileType.endsWith(`/${normalized}`)
    );
  });
};

const getFileAcceptValue = (step) => {
  const configuredTypes = getRequirement(step)?.allowed_file_types;

  if (!Array.isArray(configuredTypes) || configuredTypes.length === 0) {
    return DEFAULT_FILE_ACCEPT;
  }

  return configuredTypes
    .map(normalizeFileType)
    .filter(Boolean)
    .map((type) => {
      if (type.startsWith(".") || type.includes("/")) return type;

      return `.${type}`;
    })
    .join(",");
};

const formatAllowedFileTypes = (step) =>
  getStepAllowedFileTypes(step)
    .map((type) =>
      type
        .replace("application/", "")
        .replace("image/", "")
        .replace(".", "")
        .toUpperCase()
    )
    .join(", ");

const sanitizeFileName = (fileName) => {
  const lastDotIndex = fileName.lastIndexOf(".");

  const extension =
    lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";

  const nameWithoutExtension =
    lastDotIndex >= 0 ? fileName.slice(0, lastDotIndex) : fileName;

  const safeName = nameWithoutExtension
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeName || "requirement"}${extension}`;
};

const escapeHtml = (value) =>
  String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const createUniqueId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);

    globalThis.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
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

/*
|--------------------------------------------------------------------------
| CHECK IF CLASS OFFERING COLUMN IS NOT YET AVAILABLE
|--------------------------------------------------------------------------
|
| Temporary compatibility helper.
|
| Once clearance_steps.class_offering_id is already added to Supabase,
| the page automatically uses exact class offering routing.
|
| If the database migration has not yet been applied, the page can still
| load using the existing routing temporarily.
|--------------------------------------------------------------------------
*/

const isMissingClassOfferingColumnError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const hint = String(error?.hint || "").toLowerCase();

  const combined = `${message} ${details} ${hint}`;

  return (
    combined.includes("class_offering_id") &&
    (combined.includes("does not exist") ||
      combined.includes("column") ||
      combined.includes("schema cache"))
  );
};

/*
|--------------------------------------------------------------------------
| ORGANIZER HELPERS (tabs, grouping, one-line hints)
|--------------------------------------------------------------------------
*/

const STEP_TABS = [
  { key: "action", label: "Needs Action" },
  { key: "waiting", label: "Waiting" },
  { key: "review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
];

const TYPE_ORDER = ["Subject", "Adviser", "Office"];

const TYPE_LABELS = {
  Subject: "Subjects",
  Adviser: "Faculty Adviser",
  Office: "Offices",
};

const BUCKET_ACCENT = {
  action: "border-l-blue-500",
  waiting: "border-l-amber-400",
  review: "border-l-sky-400",
  approved: "border-l-green-500",
};

const getStepBucket = (step) => {
  if (step.status === "Approved") return "approved";

  if (isGuidanceStep(step)) {
    const assignment = step.guidanceAssignment;

    if (!assignment) return "waiting";

    if (assignment.guidance_status === "Needs Follow-up") return "action";

    if (
      assignment.guidance_status === "For Review" ||
      assignment.guidance_status === "Answered"
    ) {
      return "review";
    }

    return getGuidanceScheduleState(assignment.batch) === "open"
      ? "action"
      : "waiting";
  }

  if (step.status === "Rejected") return "action";
  if (step.status === "Pending" && step.submission) return "review";

  return getSubmissionBlockedReason(step) ? "waiting" : "action";
};

const getStepHint = (step) => {
  if (step.status === "Approved") {
    return {
      text: `Approved ${formatDate(step.reviewed_at)}`,
      tone: "text-green-700",
    };
  }

  if (step.status === "Rejected") {
    return {
      text: `Needs correction: ${
        step.remarks || "No rejection reason was provided."
      }`,
      tone: "text-red-700",
    };
  }

  if (isGuidanceStep(step)) {
    const assignment = step.guidanceAssignment;

    if (!assignment) {
      return {
        text: "Waiting for Guidance to assign your schedule.",
        tone: "text-amber-700",
      };
    }

    if (assignment.guidance_status === "Needs Follow-up") {
      return {
        text: `Follow-up requested: ${
          assignment.guidance_remarks ||
          "Guidance requested an updated response."
        }`,
        tone: "text-red-700",
      };
    }

    if (assignment.batch?.schedule_date) {
      return {
        text: `${
          assignment.batch.batch_name || "Guidance batch"
        } • ${formatGuidanceSchedule(assignment.batch)}`,
        tone: "text-slate-500",
      };
    }

    return {
      text: "Schedule will be announced by Guidance.",
      tone: "text-amber-700",
    };
  }

  if (step.submission) {
    return {
      text: `Submitted ${formatDate(
        step.submission.submitted_at
      )} — waiting for approver`,
      tone: "text-blue-700",
    };
  }

  const blocked = getSubmissionBlockedReason(step);

  if (blocked) {
    return {
      text: blocked.title,
      tone:
        blocked.key === "deadline"
          ? "text-red-700"
          : blocked.key.includes("review")
            ? "text-slate-500"
            : "text-amber-700",
    };
  }

  const requirement = getRequirement(step);

  if (requirement?.deadline) {
    return {
      text: `Due ${formatDate(requirement.deadline)}`,
      tone: "text-slate-500",
    };
  }

  return { text: "Ready to submit", tone: "text-emerald-700" };
};

function RequestClearance() {
  const [student, setStudent] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [clearanceRequest, setClearanceRequest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [guidanceRescheduleRequests, setGuidanceRescheduleRequests] = useState([]);
  const [requestingGuidanceReschedule, setRequestingGuidanceReschedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [submissionText, setSubmissionText] = useState("");

  // Answers are submitted atomically through the validated office RPC.
  const [officeAnswers, setOfficeAnswers] = useState({});

  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingStepId, setSubmittingStepId] = useState(null);
  const [selectedGuidanceStep, setSelectedGuidanceStep] = useState(null);
  const [guidanceResponse, setGuidanceResponse] = useState("");
  const [submittingGuidance, setSubmittingGuidance] = useState(false);
  const [guidanceAttachments, setGuidanceAttachments] = useState([]);
  const [loadingGuidanceAttachments, setLoadingGuidanceAttachments] =
    useState(false);
  const [uploadingGuidanceAttachment, setUploadingGuidanceAttachment] =
    useState(false);
  const [deletingGuidanceAttachmentId, setDeletingGuidanceAttachmentId] =
    useState(null);
  const [clearancePass, setClearancePass] = useState(null);
  const [loadingPass, setLoadingPass] = useState(false);
  const [showClearancePass, setShowClearancePass] = useState(false);
  const [sendingPassEmail, setSendingPassEmail] = useState(false);

  // Page organizer state
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [statusTab, setStatusTab] = useState("auto");
  const [typeFilter, setTypeFilter] = useState("all");

  /*
  |--------------------------------------------------------------------------
  | CREATE PRIVATE SIGNED URL
  |--------------------------------------------------------------------------
  */

  const addSignedUrls = useCallback(async (submissions = []) => {
    return Promise.all(
      submissions.map(async (submission) => {
        if (!submission.attachment_url) {
          return { ...submission, signed_url: null };
        }

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(submission.attachment_url, 60 * 10);

        if (error) {
          console.error("Unable to create signed URL:", error);

          return { ...submission, signed_url: null };
        }

        return { ...submission, signed_url: data?.signedUrl || null };
      })
    );
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD CLEARANCE STEPS WITH CLASS OFFERING SUPPORT
  |--------------------------------------------------------------------------
  |
  | Preferred exact routing:
  | clearance_step -> class_offering_id -> exact subject + teacher + section + term
  |
  | Legacy fallback keeps the page working before the DB migration.
  |--------------------------------------------------------------------------
  */

  const loadClearanceSteps = useCallback(async (requestId) => {
    const preferredResponse = await supabase
      .from("clearance_steps")
      .select(`
        id,
        clearance_request_id,
        office_id,
        subject_id,
        class_offering_id,
        step_type,
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
      .eq("clearance_request_id", requestId);

    if (!preferredResponse.error) {
      return {
        data: preferredResponse.data || [],
        exactRoutingSupported: true,
      };
    }

    if (!isMissingClassOfferingColumnError(preferredResponse.error)) {
      throw preferredResponse.error;
    }

    console.warn(
      "clearance_steps.class_offering_id is not available yet. Using temporary legacy routing."
    );

    const legacyResponse = await supabase
      .from("clearance_steps")
      .select(`
        id,
        clearance_request_id,
        office_id,
        subject_id,
        step_type,
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
      .eq("clearance_request_id", requestId);

    if (legacyResponse.error) {
      throw legacyResponse.error;
    }

    return {
      data: (legacyResponse.data || []).map((step) => ({
        ...step,
        class_offering_id: null,
      })),
      exactRoutingSupported: false,
    };
  }, []);

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
        throw new Error("Please log in before accessing this page.");
      }

      /* LOAD STUDENT PROFILE */

      const { data: studentData, error: studentError } = await supabase
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
        throw new Error("Only student accounts can request clearance.");
      }

      setStudent(studentData);

      /* LOAD OFFICIAL ACTIVE ACADEMIC TERM */
      const { data: activeTermData, error: termError } = await supabase
        .from("academic_terms")
        .select("id, school_year, semester, status, is_active")
        .eq("is_active", true)
        .eq("status", "Active")
        .maybeSingle();

      if (termError) throw termError;
      setActiveTerm(activeTermData || null);

      // Never show a previous semester's clearance as the current request.
      if (!activeTermData) {
        setClearanceRequest(null);
        setSteps([]);
        setClearancePass(null);
        return;
      }

      /* LOAD CURRENT SEMESTER CLEARANCE REQUEST */

      const { data: requestData, error: requestError } = await supabase
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
        .eq("semester", activeTermData.semester)
        .eq("school_year", activeTermData.school_year)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;

      setClearanceRequest(requestData || null);

      if (!requestData) {
        setSteps([]);
        setClearancePass(null);
        return;
      }

      /* LOAD CLEARANCE STEPS */

      const { data: safeSteps, exactRoutingSupported } =
        await loadClearanceSteps(requestData.id);

      if (safeSteps.length === 0) {
        setSteps([]);
        return;
      }

      const stepIds = safeSteps.map((step) => step.id);

      const subjectIds = [
        ...new Set(safeSteps.map((step) => step.subject_id).filter(Boolean)),
      ];

      const linkedClassOfferingIds = [
        ...new Set(
          safeSteps.map((step) => step.class_offering_id).filter(Boolean)
        ),
      ];

      /* LOAD EXACT CLASS OFFERINGS */

      let classOfferings = [];

      // 1. Direct class_offering_id lookup
      if (linkedClassOfferingIds.length > 0) {
        const { data: exactOfferingData, error: exactOfferingError } =
          await supabase
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
            .in("id", linkedClassOfferingIds);

        if (exactOfferingError) {
          console.warn(
            "Exact class offerings could not be loaded:",
            exactOfferingError
          );
        } else {
          classOfferings = [...classOfferings, ...(exactOfferingData || [])];
        }
      }

      // 2. Legacy fallback for old steps without class_offering_id
      const legacySubjectIds = subjectIds.filter((subjectId) =>
        safeSteps.some(
          (step) =>
            step.subject_id === subjectId && !step.class_offering_id
        )
      );

      if (
        legacySubjectIds.length > 0 &&
        requestData.section_id &&
        requestData.semester &&
        requestData.school_year
      ) {
        const { data: legacyOfferingData, error: legacyOfferingError } =
          await supabase
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
            .in("subject_id", legacySubjectIds);

        if (legacyOfferingError) {
          console.warn(
            "Legacy class offerings could not be loaded:",
            legacyOfferingError
          );
        } else {
          classOfferings = [...classOfferings, ...(legacyOfferingData || [])];
        }
      }

      // Remove duplicate offerings
      const uniqueOfferingMap = new Map();

      classOfferings.forEach((offering) => {
        if (offering?.id) {
          uniqueOfferingMap.set(offering.id, offering);
        }
      });

      classOfferings = [...uniqueOfferingMap.values()];

      /* LOAD TEACHER-PROVIDED SUBJECT REQUIREMENTS */

      let subjectRequirements = [];

      const classOfferingIds = classOfferings.map((offering) => offering.id);

      if (classOfferingIds.length > 0) {
        const { data: requirementData, error: requirementError } =
          await supabase
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

      /* LOAD ACTIVE OFFICE REQUIREMENTS / QUESTIONS */

      let officeRequirements = [];

      const officeIds = [
        ...new Set(safeSteps.map((step) => step.office_id).filter(Boolean)),
      ];

      if (officeIds.length > 0) {
        const { data: officeRequirementData, error: officeRequirementError } =
          await supabase
            .from("office_requirements")
            .select(
              "id, office_id, requirement_type, title, description, response_type, is_required, attachment_required, is_active, created_at"
            )
            .in("office_id", officeIds)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (officeRequirementError) {
          console.error(
            "Unable to load office requirements:",
            officeRequirementError
          );
        } else {
          officeRequirements = officeRequirementData || [];
        }
      }

      // Office batches are independent per office and attached to exact
      // clearance steps. Missing assignments are not treated as permission.
      let officeBatchAssignments = [];

      const officeStepIds = safeSteps
        .filter((step) => step.office_id)
        .map((step) => step.id);

      if (officeStepIds.length > 0) {
        const { data: batchData, error: batchError } = await supabase
          .from("office_batch_students")
          .select(`
            id,
            clearance_step_id,
            office_batches (
              id, office_id, batch_name, schedule_date, end_date,
              start_time, end_time, note, status
            )
          `)
          .in("clearance_step_id", officeStepIds);

        if (batchError) {
          console.error("Unable to load office batch assignments:", batchError);
        } else {
          officeBatchAssignments = batchData || [];
        }
      }

      // Office approval modes and schedules are display-only until the
      // server validates every office student submission.
      let officeSubmissionSettings = [];

      if (officeIds.length > 0) {
        const { data: settingData, error: settingError } = await supabase
          .from("office_submission_settings")
          .select(
            "office_id, approval_mode, submission_enabled, opens_at, closes_at"
          )
          .in("office_id", officeIds);

        if (settingError) {
          console.error(
            "Unable to load office submission settings:",
            settingError
          );
        } else {
          officeSubmissionSettings = settingData || [];
        }
      }

      /* LOAD CURRENT SUBMISSIONS */

      const { data: submissionData, error: submissionError } = await supabase
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

      const submissionsWithUrls = await addSignedUrls(submissionData || []);

      const submissionMap = new Map(
        submissionsWithUrls.map((submission) => [
          submission.clearance_step_id,
          submission,
        ])
      );

      /* BUILD CLASS OFFERING MAPS */

      const classOfferingByIdMap = new Map(
        classOfferings.map((offering) => [offering.id, offering])
      );

      // Legacy maps: kept only while old steps do not have class_offering_id.
      const classOfferingByTeacherMap = new Map(
        classOfferings.map((offering) => [
          [offering.subject_id, offering.teacher_id].join("|"),
          offering,
        ])
      );

      const classOfferingBySubjectMap = new Map(
        classOfferings.map((offering) => [offering.subject_id, offering])
      );

      /* RESOLVE EXACT CLASS OFFERING FOR EACH STEP */

      const resolvedSteps = safeSteps.map((step) => {
        if (!step.subject_id) {
          return { ...step, resolvedClassOffering: null };
        }

        if (step.class_offering_id) {
          return {
            ...step,
            resolvedClassOffering:
              classOfferingByIdMap.get(step.class_offering_id) || null,
          };
        }

        const legacyOffering =
          classOfferingByTeacherMap.get(
            [step.subject_id, step.approver_id].join("|")
          ) ||
          classOfferingBySubjectMap.get(step.subject_id) ||
          null;

        return { ...step, resolvedClassOffering: legacyOffering };
      });

      /* LOAD APPROVER NAMES */

      const approverIds = [
        ...new Set(
          [
            ...resolvedSteps.map((step) => step.approver_id),
            ...resolvedSteps.map(
              (step) => step.resolvedClassOffering?.teacher_id
            ),
          ].filter(Boolean)
        ),
      ];

      const approverMap = new Map();

      if (approverIds.length > 0) {
        const { data: approverData, error: approverError } = await supabase
          .from("users")
          .select(`
            id,
            full_name,
            employee_id
          `)
          .in("id", approverIds);

        if (approverError) {
          console.warn("Approver names could not be loaded:", approverError);
        } else {
          (approverData || []).forEach((approver) => {
            approverMap.set(approver.id, approver);
          });
        }
      }

      /* REQUIREMENT MAPS */

      const subjectRequirementMap = new Map(
        subjectRequirements.map((requirement) => [
          requirement.class_offering_id,
          requirement,
        ])
      );

      const officeBatchMap = new Map();

      officeBatchAssignments.forEach((assignment) => {
        const batch = assignment.office_batches;

        if (batch && !officeBatchMap.has(assignment.clearance_step_id)) {
          officeBatchMap.set(assignment.clearance_step_id, batch);
        }
      });

      const officeSettingsMap = new Map(
        officeSubmissionSettings.map((setting) => [setting.office_id, setting])
      );

      const officeRequirementMap = new Map();

      officeRequirements.forEach((requirement) => {
        const items = officeRequirementMap.get(requirement.office_id) || [];

        items.push(requirement);
        officeRequirementMap.set(requirement.office_id, items);
      });

      /* FINAL ENRICHED STEPS */

      const enrichedSteps = resolvedSteps
        .map((step) => {
          const classOffering = step.resolvedClassOffering;

          // For subject steps with an exact class offering, the teacher
          // attached to that offering is the authoritative teacher.
          const assignedApproverId =
            step.subject_id && classOffering?.teacher_id
              ? classOffering.teacher_id
              : step.approver_id;

          const routingMismatch = Boolean(
            step.subject_id &&
              classOffering?.teacher_id &&
              step.approver_id &&
              classOffering.teacher_id !== step.approver_id
          );

          if (routingMismatch) {
            console.warn("Clearance routing mismatch detected:", {
              clearanceStepId: step.id,
              subjectId: step.subject_id,
              classOfferingId: classOffering.id,
              stepApproverId: step.approver_id,
              classOfferingTeacherId: classOffering.teacher_id,
            });
          }

          return {
            ...step,

            submission: submissionMap.get(step.id) || null,

            approver: approverMap.get(assignedApproverId) || null,

            assignedApproverId,

            classOffering,

            routingMismatch,

            exactRouting: Boolean(step.class_offering_id && classOffering),

            officeBatch: step.office_id
              ? officeBatchMap.get(step.id) || null
              : null,

            officeSubmissionSetting: step.office_id
              ? officeSettingsMap.get(step.office_id) || null
              : null,

            officeRequirements: step.office_id
              ? officeRequirementMap.get(step.office_id) || []
              : [],

            subjectRequirement: classOffering
              ? subjectRequirementMap.get(classOffering.id) || null
              : null,
          };
        })
        .sort((first, second) => {
          const firstIsSubject = Boolean(first.subject_id);
          const secondIsSubject = Boolean(second.subject_id);

          if (firstIsSubject !== secondIsSubject) {
            return firstIsSubject ? -1 : 1;
          }

          return getStepName(first).localeCompare(getStepName(second));
        });

      /* LOAD GUIDANCE SCHEDULE / BATCH ASSIGNMENTS */

      const guidanceSteps = enrichedSteps.filter(isGuidanceStep);
      let finalSteps = enrichedSteps;

      if (guidanceSteps.length > 0) {
        const guidanceStepIds = guidanceSteps.map((step) => step.id);

        const { data: guidanceAssignmentData, error: guidanceAssignmentError } =
          await supabase
            .from("guidance_batch_students")
            .select(`
              id,
              batch_id,
              clearance_step_id,
              student_id,
              response,
              response_submitted_at,
              guidance_status,
              guidance_remarks,
              reviewed_at,
              guidance_batches (
                id,
                batch_name,
                school_year,
                semester,
                schedule_date,
                deadline_date,
                start_time,
                end_time,
                question,
                instructions,
                max_students,
                status
              )
            `)
            .in("clearance_step_id", guidanceStepIds);

        if (guidanceAssignmentError) {
          console.warn(
            "Guidance schedule could not be loaded:",
            guidanceAssignmentError
          );
        } else {
          const guidanceMap = new Map(
            (guidanceAssignmentData || []).map((assignment) => [
              assignment.clearance_step_id,
              {
                ...assignment,
                batch: assignment.guidance_batches || null,
              },
            ])
          );

          finalSteps = enrichedSteps.map((step) =>
            isGuidanceStep(step)
              ? {
                  ...step,
                  guidanceAssignment: guidanceMap.get(step.id) || null,
                }
              : step
          );
        }
      }

      if (!exactRoutingSupported) {
        console.warn(
          "SmartClear AI is currently using legacy clearance routing because clearance_steps.class_offering_id has not been added yet."
        );
      }

      setSteps(finalSteps);
      // Rescheduling status is displayed independently of the clearance step.
      const rescheduleResult = await getGuidanceRescheduleRequests();
      if (rescheduleResult.success) {
        setGuidanceRescheduleRequests(rescheduleResult.data || []);
      }
    } catch (error) {
      console.error("Load student clearance error:", error);

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
  }, [addSignedUrls, loadClearanceSteps]);

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
    const approved = steps.filter((step) => step.status === "Approved").length;
    const rejected = steps.filter((step) => step.status === "Rejected").length;
    const pending = steps.filter((step) => step.status === "Pending").length;
    const submitted = steps.filter((step) => Boolean(step.submission)).length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, rejected, pending, submitted, percentage };
  }, [steps]);

  const organizedSteps = useMemo(
    () =>
      [...steps].sort((first, second) => {
        const rankDifference =
          getStepWorkflowRank(first) - getStepWorkflowRank(second);

        if (rankDifference !== 0) return rankDifference;

        return getStepName(first).localeCompare(getStepName(second));
      }),
    [steps]
  );

  /*
  |--------------------------------------------------------------------------
  | ORGANIZER: BUCKETS, TABS, TYPE FILTER AND GROUPS
  |--------------------------------------------------------------------------
  */

  const stepViews = useMemo(
    () =>
      organizedSteps.map((step) => ({
        step,
        bucket: getStepBucket(step),
        type: getStepType(step),
      })),
    [organizedSteps]
  );

  const bucketCounts = useMemo(() => {
    const counts = {
      action: 0,
      waiting: 0,
      review: 0,
      approved: 0,
      all: stepViews.length,
    };

    stepViews.forEach((view) => {
      counts[view.bucket] += 1;
    });

    return counts;
  }, [stepViews]);

  // Opens on "Needs Action" when there is work to do, otherwise on "All".
  const activeTab =
    statusTab === "auto"
      ? bucketCounts.action > 0
        ? "action"
        : "all"
      : statusTab;

  const tabViews = useMemo(
    () =>
      stepViews.filter(
        (view) => activeTab === "all" || view.bucket === activeTab
      ),
    [stepViews, activeTab]
  );

  const typeCounts = useMemo(() => {
    const counts = {};

    TYPE_ORDER.forEach((type) => {
      counts[type] = tabViews.filter((view) => view.type === type).length;
    });

    return counts;
  }, [tabViews]);

  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => typeCounts[type] > 0),
    [typeCounts]
  );

  const groupedViews = useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        items: tabViews.filter(
          (view) =>
            view.type === type &&
            (typeFilter === "all" || typeFilter === type)
        ),
      })).filter((group) => group.items.length > 0),
    [tabViews, typeFilter]
  );

  const toggleExpanded = (stepId) =>
    setExpandedStepId((current) => (current === stepId ? null : stepId));

  /*
  |--------------------------------------------------------------------------
  | CURRENT CLEARANCE CYCLE CHECK
  |--------------------------------------------------------------------------
  */

  const hasCurrentCycleRequest =
    clearanceRequest &&
    clearanceRequest.school_year === activeTerm?.school_year &&
    clearanceRequest.semester === activeTerm?.semester &&
    ["Pending", "In Progress", "Completed"].includes(clearanceRequest.status);

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
        text: "Unable to find your student profile.",
      });

      return;
    }

    if (student.status !== "Active") {
      await Swal.fire({
        icon: "warning",
        title: "Account Not Active",
        text: "Your account must be activated by the administrator before requesting clearance.",
      });

      return;
    }

    if (!student.section_id) {
      await Swal.fire({
        icon: "warning",
        title: "Official Block Not Assigned",
        text: "The administrator must assign your official course, year level, and block first.",
      });

      return;
    }

    if (!activeTerm) {
      await Swal.fire({
        icon: "warning",
        title: "No Active Semester",
        text: "Clearance requests are unavailable until the administrator opens an academic semester.",
      });
      return;
    }

    if (
      student.school_year !== activeTerm.school_year ||
      student.semester !== activeTerm.semester
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Academic Assignment Mismatch",
        text: `Your official student assignment (${student.semester || "Not assigned"}, ${student.school_year || "Not assigned"}) does not match the active semester (${activeTerm.semester}, ${activeTerm.school_year}). Please contact the administrator.`,
      });
      return;
    }

    if (hasCurrentCycleRequest) {
      await Swal.fire({
        icon: "info",
        title: "Clearance Request Exists",
        text: "You already have a clearance request for your current semester and school year.",
      });

      return;
    }

    const schoolYear = activeTerm.school_year;
    const semester = activeTerm.semester;

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Submit Clearance Request?",
      html: `
        <div style="text-align:left">
          <p>
            <strong>School Year:</strong>
            ${escapeHtml(schoolYear)}
          </p>

          <p>
            <strong>Semester:</strong>
            ${escapeHtml(semester)}
          </p>

          <p style="margin-top:12px;color:#64748b">
            Your subject and office requirements will be assigned
            automatically to the correct approvers based on your
            official class assignment.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Submit Request",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setSubmittingRequest(true);

      const result = await requestClearance(student.id, schoolYear, semester);

      if (!result.success) {
        throw new Error("The clearance request was not created.");
      }

      await Swal.fire({
        icon: "success",
        title: "Request Submitted",
        text: `${result.stepCount || 0} clearance requirement${
          result.stepCount === 1 ? "" : "s"
        } were assigned successfully.`,
      });

      await loadStudentClearance();
    } catch (error) {
      console.error("Request clearance error:", error);

      await Swal.fire({
        icon: "error",
        title: "Request Failed",
        text: error?.message || "Unable to submit your clearance request.",
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REQUEST MANUAL / DIRECT OFFICE RECHECK
  |--------------------------------------------------------------------------
  */

  const handleOfficeRecheck = async (step) => {
    const mode = String(
      step.officeSubmissionSetting?.approval_mode || "direct"
    ).toLowerCase();

    if (
      !step.office_id ||
      step.subject_id ||
      step.status !== "Rejected" ||
      !["manual", "direct"].includes(mode) ||
      submittingStepId
    ) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Request Office Recheck?",
      html: `<p class="text-sm">Please make sure you have addressed the office's concern before requesting another review.</p>`,
      showCancelButton: true,
      confirmButtonText: "Request Recheck",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setSubmittingStepId(step.id);

      const { error } = await supabase.rpc(
        "request_office_clearance_recheck",
        { p_step_id: step.id }
      );

      if (error) throw error;

      await loadStudentClearance();

      await Swal.fire({
        icon: "success",
        title: "Recheck Requested",
        text: "Your office clearance has returned to Pending, and the assigned reviewer has been notified.",
      });
    } catch (error) {
      console.error("Office recheck error:", error);

      await Swal.fire({
        icon: "error",
        title: "Recheck Failed",
        text: error?.message || "Unable to request another office review.",
      });
    } finally {
      setSubmittingStepId(null);
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
        text: "This clearance requirement has already been approved.",
      });

      return;
    }

    const blockedReason = getSubmissionBlockedReason(step);

    if (blockedReason) {
      await Swal.fire({
        icon: blockedReason.key === "deadline" ? "warning" : "info",
        title: blockedReason.title,
        text: blockedReason.message,
      });

      return;
    }

    if (step.status === "Pending" && step.submission) {
      await Swal.fire({
        icon: "info",
        title: "Waiting for Review",
        text: "Your current submission is already waiting for the assigned approver.",
      });

      return;
    }

    setSelectedStep(step);

    setSubmissionText(
      step.status === "Rejected" ? step.submission?.submission_text || "" : ""
    );

    setSelectedFile(null);
    setOfficeAnswers({});
  };

  const closeSubmissionModal = () => {
    if (submittingStepId) return;

    setSelectedStep(null);
    setSubmissionText("");
    setOfficeAnswers({});
    setSelectedFile(null);
  };

  /*
  |--------------------------------------------------------------------------
  | FILE VALIDATION
  |--------------------------------------------------------------------------
  */

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (selectedStep && !stepAllowsFile(selectedStep)) {
      event.target.value = "";
      setSelectedFile(null);

      await Swal.fire({
        icon: "warning",
        title: "File Not Allowed",
        text: "This requirement accepts a text response only.",
      });

      return;
    }

    const allowedTypes = getStepAllowedFileTypes(selectedStep);

    if (!fileMatchesAllowedType(file, allowedTypes)) {
      event.target.value = "";
      setSelectedFile(null);

      await Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: `Allowed file types: ${formatAllowedFileTypes(selectedStep)}.`,
      });

      return;
    }

    const maxFileSizeMb = getStepMaxFileSizeMb(selectedStep);
    const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

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
    if (!selectedStep || !student) {
      return;
    }

    const cleanText = submissionText.trim();

    const blockedReason = getSubmissionBlockedReason(selectedStep);

    if (blockedReason) {
      await Swal.fire({
        icon: blockedReason.key === "deadline" ? "warning" : "info",
        title: blockedReason.title,
        text: blockedReason.message,
      });

      return;
    }

    const isOfficeSubmission = Boolean(
      selectedStep.office_id && !selectedStep.subject_id
    );

    const officeItems = isOfficeSubmission
      ? selectedStep.officeRequirements || []
      : [];

    const normalizedOfficeAnswers = {};

    if (isOfficeSubmission) {
      for (const item of officeItems) {
        if (String(item.requirement_type || "").toLowerCase() !== "question") {
          continue;
        }

        const answer = String(officeAnswers[item.id] ?? "").trim();
        const responseType = String(item.response_type || "").toLowerCase();
        const isConfirmation =
          responseType === "check" || responseType === "checkbox";

        if (
          item.is_required &&
          (!answer || (isConfirmation && answer !== "Yes"))
        ) {
          await Swal.fire({
            icon: "warning",
            title: "Required Answer Missing",
            text: isConfirmation
              ? `Please check the confirmation: ${item.title}`
              : `Please answer: ${item.title}`,
          });

          return;
        }

        if (answer.length > 10000) {
          await Swal.fire({
            icon: "warning",
            title: "Answer Too Long",
            text: `Maximum 10,000 characters: ${item.title}`,
          });

          return;
        }

        if (answer) normalizedOfficeAnswers[item.id] = answer;
      }
    }

    if (
      isOfficeSubmission &&
      officeItems.some((item) => item.attachment_required === true) &&
      !selectedFile
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Attachment Required",
        text: "Upload the required attachment before submitting this office requirement.",
      });

      return;
    }

    const allowsText = stepAllowsText(selectedStep);
    const allowsFile = stepAllowsFile(selectedStep);

    if (!allowsText && cleanText) {
      await Swal.fire({
        icon: "warning",
        title: "Text Response Not Allowed",
        text: "This requirement accepts a file attachment only.",
      });

      return;
    }

    if (!allowsFile && selectedFile) {
      await Swal.fire({
        icon: "warning",
        title: "File Not Allowed",
        text: "This requirement accepts a text response only.",
      });

      return;
    }

    if (!isOfficeSubmission && allowsText && !allowsFile && !cleanText) {
      await Swal.fire({
        icon: "warning",
        title: "Text Response Required",
        text: "Enter the required response before submitting.",
      });

      return;
    }

    if (!isOfficeSubmission && !allowsText && allowsFile && !selectedFile) {
      await Swal.fire({
        icon: "warning",
        title: "Attachment Required",
        text: "Upload the required attachment before submitting.",
      });

      return;
    }

    if (
      !isOfficeSubmission &&
      allowsText &&
      allowsFile &&
      !cleanText &&
      !selectedFile
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Submission Required",
        text: "Enter a response or upload the requested attachment.",
      });

      return;
    }

    // Office question answers already constitute the student's text submission.
    // Keep the RPC's submission_text populated for backends that require text or a file.
    const hasOfficeQuestions = isOfficeSubmission && officeItems.some(
      (item) => String(item.requirement_type || "").toLowerCase() === "question"
    );
    const officeAnswerSummary = hasOfficeQuestions
      ? officeItems
          .filter((item) => String(item.requirement_type || "").toLowerCase() === "question")
          .map((item) => {
            const answer = String(normalizedOfficeAnswers[item.id] ?? "").trim();
            return answer ? `${item.title}: ${answer}` : null;
          })
          .filter(Boolean)
          .join("\n")
      : "";
    const effectiveSubmissionText = cleanText || officeAnswerSummary;

    const isResubmission = selectedStep.status === "Rejected";

    const confirmation = await Swal.fire({
      icon: "question",
      title: isResubmission ? "Resubmit Requirement?" : "Submit Requirement?",
      text: `${getStepName(selectedStep)} — ${
        selectedFile ? selectedFile.name : "Message only"
      }`,
      showCancelButton: true,
      confirmButtonText: isResubmission ? "Resubmit" : "Submit",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    let uploadedFilePath = null;

    try {
      setSubmittingStepId(selectedStep.id);

      /* UPLOAD PRIVATE ATTACHMENT */

      if (selectedFile) {
        const safeFileName = sanitizeFileName(selectedFile.name);

        const uniqueName = `${Date.now()}-${createUniqueId()}-${safeFileName}`;

        uploadedFilePath = [student.id, selectedStep.id, uniqueName].join("/");

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(uploadedFilePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: selectedFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      /* SAVE SUBMISSION THROUGH SECURE RPC */

      const { data, error: submissionError } = isOfficeSubmission
        ? await supabase.rpc("submit_office_clearance_answers", {
            p_step_id: selectedStep.id,
            p_answers: normalizedOfficeAnswers,
            p_submission_text: effectiveSubmissionText || null,
            p_attachment_url: uploadedFilePath || null,
            p_attachment_name: selectedFile?.name || null,
          })
        : await supabase.rpc("submit_clearance_requirement", {
            p_step_id: selectedStep.id,
            p_submission_text: effectiveSubmissionText || null,
            p_attachment_url: uploadedFilePath || null,
            p_attachment_name: selectedFile?.name || null,
          });

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
      setOfficeAnswers({});
      setSelectedFile(null);

      await loadStudentClearance();
    } catch (error) {
      console.error("Submit requirement error:", error);

      await Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text:
          error?.message || "Unable to submit the clearance requirement.",
      });
    } finally {
      setSubmittingStepId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GUIDANCE RESPONSE
  |--------------------------------------------------------------------------
  */

  const loadGuidanceAttachments = async (batchStudentId) => {
    if (!batchStudentId) {
      setGuidanceAttachments([]);
      return;
    }

    try {
      setLoadingGuidanceAttachments(true);

      const result = await getGuidanceAttachmentsWithUrls(batchStudentId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setGuidanceAttachments(result.data || []);
    } catch (error) {
      console.error("Load Guidance attachments error:", error);
      setGuidanceAttachments([]);

      await Swal.fire({
        icon: "error",
        title: "Attachments Could Not Be Loaded",
        text: error?.message || "Unable to load your Guidance attachments.",
      });
    } finally {
      setLoadingGuidanceAttachments(false);
    }
  };

  const openGuidanceModal = async (step) => {
    const assignment = step?.guidanceAssignment;

    if (!assignment) {
      await Swal.fire({
        icon: "info",
        title: "Waiting for Guidance Schedule",
        text: "Guidance has not assigned you to a schedule or batch yet.",
      });
      return;
    }

    if (
      assignment.guidance_status === "Approved" ||
      step.status === "Approved"
    ) {
      await Swal.fire({
        icon: "info",
        title: "Guidance Already Approved",
        text: "Your Guidance clearance has already been approved.",
      });
      return;
    }

    if (assignment.guidance_status === "For Review") {
      await Swal.fire({
        icon: "info",
        title: "Waiting for Guidance Review",
        text: "Your response and attachments are locked while Guidance reviews your submission.",
      });
      return;
    }

    const scheduleState = getGuidanceScheduleState(assignment?.batch);

    if (scheduleState !== "open") {
      const scheduleMessage = getGuidanceScheduleMessage(assignment?.batch);

      await Swal.fire({
        icon: scheduleState === "ended" ? "warning" : "info",
        title: scheduleMessage?.title || "Guidance Response Not Open",
        text:
          scheduleMessage?.message ||
          "Your Guidance response window is not currently open.",
      });
      return;
    }

    setSelectedGuidanceStep(step);
    setGuidanceResponse(assignment.response || "");
    setGuidanceAttachments([]);

    await loadGuidanceAttachments(assignment.id);
  };

  const closeGuidanceModal = () => {
    if (submittingGuidance || uploadingGuidanceAttachment) return;

    setSelectedGuidanceStep(null);
    setGuidanceResponse("");
    setGuidanceAttachments([]);
  };

  const handleGuidanceAttachmentChange = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file || !selectedGuidanceStep?.guidanceAssignment?.id) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      await Swal.fire({
        icon: "warning",
        title: "Unsupported File",
        text: "Only JPG, PNG, and PDF files are allowed.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      await Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text: "Guidance attachments must not exceed 10 MB.",
      });
      return;
    }

    try {
      setUploadingGuidanceAttachment(true);

      const result = await uploadGuidanceAttachment({
        batchStudentId: selectedGuidanceStep.guidanceAssignment.id,
        file,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      await loadGuidanceAttachments(selectedGuidanceStep.guidanceAssignment.id);

      await Swal.fire({
        icon: "success",
        title: "Attachment Added",
        text: `${file.name} is ready with your Guidance response.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Upload Guidance attachment error:", error);

      await Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: error?.message || "Unable to upload the Guidance attachment.",
      });
    } finally {
      setUploadingGuidanceAttachment(false);
    }
  };

  const handleDeleteGuidanceAttachment = async (attachment) => {
    if (!attachment?.id) return;

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Remove Attachment?",
      text: attachment.file_name || "This file will be removed.",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Keep File",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setDeletingGuidanceAttachmentId(attachment.id);

      const result = await deleteGuidanceAttachment(attachment.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      setGuidanceAttachments((current) =>
        current.filter((item) => item.id !== attachment.id)
      );
    } catch (error) {
      console.error("Delete Guidance attachment error:", error);

      await Swal.fire({
        icon: "error",
        title: "Unable to Remove File",
        text:
          error?.message || "The Guidance attachment could not be removed.",
      });
    } finally {
      setDeletingGuidanceAttachmentId(null);
    }
  };

  const handleSubmitGuidanceResponse = async () => {
    if (!selectedGuidanceStep) return;

    const assignment = selectedGuidanceStep.guidanceAssignment;
    const cleanResponse = guidanceResponse.trim();

    if (!assignment?.id) {
      await Swal.fire({
        icon: "error",
        title: "Guidance Assignment Missing",
        text: "Your Guidance schedule assignment could not be found.",
      });
      return;
    }

    const scheduleState = getGuidanceScheduleState(assignment?.batch);

    if (scheduleState !== "open") {
      const scheduleMessage = getGuidanceScheduleMessage(assignment?.batch);

      await Swal.fire({
        icon: scheduleState === "ended" ? "warning" : "info",
        title: scheduleMessage?.title || "Guidance Response Not Open",
        text:
          scheduleMessage?.message ||
          "Your Guidance response window is not currently open.",
      });
      return;
    }

    if (!cleanResponse) {
      await Swal.fire({
        icon: "warning",
        title: "Response Required",
        text: "Enter your answer or response before submitting.",
      });
      return;
    }

    if (uploadingGuidanceAttachment) {
      await Swal.fire({
        icon: "info",
        title: "Attachment Still Uploading",
        text: "Wait for the attachment upload to finish before submitting.",
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title:
        assignment.guidance_status === "Needs Follow-up"
          ? "Submit Follow-up Response?"
          : "Submit Guidance Response?",
      text:
        guidanceAttachments.length > 0
          ? `Your response and ${guidanceAttachments.length} attachment${
              guidanceAttachments.length === 1 ? "" : "s"
            } will be locked and sent to Guidance for review.`
          : "Your response will be sent to Guidance for individual review.",
      showCancelButton: true,
      confirmButtonText: "Submit Response",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#4f46e5",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setSubmittingGuidance(true);

      const { data, error } = await supabase.rpc("submit_guidance_response", {
        p_batch_student_id: assignment.id,
        p_response: cleanResponse,
      });

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: "Guidance Response Submitted",
        text:
          data?.message ||
          "Your response was sent to Guidance for individual review.",
      });

      setSelectedGuidanceStep(null);
      setGuidanceResponse("");
      setGuidanceAttachments([]);

      await loadStudentClearance();
    } catch (error) {
      console.error("Submit Guidance response error:", error);

      await Swal.fire({
        icon: "error",
        title: "Guidance Submission Failed",
        text: error?.message || "Unable to submit your Guidance response.",
      });
    } finally {
      setSubmittingGuidance(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD DIGITAL CLEARANCE PASS
  |--------------------------------------------------------------------------
  */

  const handleOpenClearancePass = async () => {
    if (!clearanceRequest || clearanceRequest.status !== "Completed") {
      await Swal.fire({
        icon: "info",
        title: "Clearance Not Completed",
        text: "Your Digital Clearance Pass becomes available after all required subject and office approvals are completed.",
      });

      return;
    }

    try {
      setLoadingPass(true);

      const { data, error } = await supabase.rpc("get_my_clearance_pass", {
        p_request_id: clearanceRequest.id,
      });

      if (error) throw error;

      if (!data?.success || !data?.clearedForEnrollment) {
        throw new Error(
          "Your clearance pass is not ready for enrollment verification."
        );
      }

      setClearancePass(data);
      setShowClearancePass(true);
    } catch (error) {
      console.error("Load clearance pass error:", error);

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
    if (!clearanceRequest?.id || clearanceRequest.status !== "Completed") {
      await Swal.fire({
        icon: "info",
        title: "Clearance Not Completed",
        text: "The Digital Clearance Pass can only be emailed after all clearance steps are approved.",
      });

      return;
    }

    try {
      setSendingPassEmail(true);

      const result = await sendClearancePassEmail({
        requestId: clearanceRequest.id,
        force: true,
      });

      await Swal.fire({
        icon: "success",
        title: "Digital Pass Emailed",
        text: `The Digital Clearance Pass was sent to ${
          result?.recipientEmail || student?.email || "your registered email"
        }.`,
      });
    } catch (error) {
      console.error("Email Digital Clearance Pass error:", error);

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
    if (!clearancePass) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=750");

    if (!printWindow) {
      Swal.fire({
        icon: "warning",
        title: "Popup Blocked",
        text: "Allow popups for this website before printing the Digital Clearance Pass.",
      });

      return;
    }

    const courseDisplay = [clearancePass.courseCode, clearancePass.courseName]
      .filter(Boolean)
      .join(" — ");

    const classDisplay = [
      clearancePass.yearLevel,
      clearancePass.blockCode ? `Block ${clearancePass.blockCode}` : null,
    ]
      .filter(Boolean)
      .join(" — ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(clearancePass.clearanceReference)}</title>

          <style>
            * { box-sizing: border-box; }

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

            .header h1 { margin: 0; font-size: 32px; }
            .header p { margin: 10px 0 0; color: #dbeafe; }

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

            .content { padding: 32px; }

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
              body { padding: 16px; }
              .grid { grid-template-columns: 1fr; }
            }

            @media print {
              body { padding: 0; background: #ffffff; }
              .pass { border-radius: 0; }
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
                Student Number: ${escapeHtml(clearancePass.studentId)}
              </div>

              <div class="grid">
                <div class="field">
                  <div class="label">Program</div>
                  <div class="value">${escapeHtml(courseDisplay)}</div>
                </div>

                <div class="field">
                  <div class="label">Year and Block</div>
                  <div class="value">${escapeHtml(classDisplay)}</div>
                </div>

                <div class="field">
                  <div class="label">Semester</div>
                  <div class="value">${escapeHtml(clearancePass.semester)}</div>
                </div>

                <div class="field">
                  <div class="label">School Year</div>
                  <div class="value">${escapeHtml(clearancePass.schoolYear)}</div>
                </div>

                <div class="field">
                  <div class="label">Completed</div>
                  <div class="value">
                    ${escapeHtml(formatDate(clearancePass.completedAt))}
                  </div>
                </div>

                <div class="field">
                  <div class="label">Approved Requirements</div>
                  <div class="value">
                    ${escapeHtml(
                      `${clearancePass.approvedSteps}/${clearancePass.totalSteps}`
                    )}
                  </div>
                </div>
              </div>

              <div class="verification">
                <div class="label">Clearance Reference</div>

                <div class="reference">
                  ${escapeHtml(clearancePass.clearanceReference)}
                </div>

                <div class="label" style="margin-top:20px;">
                  Verification Code
                </div>

                <div class="code">
                  ${escapeHtml(clearancePass.verificationCode)}
                </div>

                <p style="margin:18px 0 0;color:#475569;font-size:13px;">
                  Present this reference and verification code
                  to the Registrar or authorized enrollment
                  personnel.
                </p>
              </div>
            </div>

            <div class="footer">
              This pass was generated by SmartClear AI.
              Its validity must be confirmed through the
              official clearance verification system.
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
  | STEP DETAILS (shown only when a row is expanded)
  |--------------------------------------------------------------------------
  */

  const renderStepDetails = (step) => {
    const guidanceStep = isGuidanceStep(step);
    const blockedReason = guidanceStep
      ? null
      : getSubmissionBlockedReason(step);
    const assignment = step.guidanceAssignment;
    const showBlockedNotice =
      Boolean(blockedReason) && step.status !== "Approved" && !step.submission;

    return (
      <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 p-3 sm:p-5">
        {/* WHY IT CANNOT BE SUBMITTED */}

        {showBlockedNotice && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <FaClock className="mt-0.5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-bold text-amber-800">
                {blockedReason.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                {blockedReason.message}
              </p>
            </div>
          </div>
        )}

        {/* REJECTION */}

        {step.status === "Rejected" && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-bold text-red-700">
                Requirement Rejected
              </p>

              <p className="mt-1 text-sm text-red-700">
                {step.remarks ||
                  "The approver did not provide a rejection reason."}
              </p>
            </div>
          </div>
        )}

        {/* GUIDANCE WORKFLOW */}

        {guidanceStep && (
          <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50">
            <div className="border-b border-indigo-100 bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                Guidance Clearance
              </p>

              <h4 className="mt-1.5 text-base font-bold text-slate-800">
                {assignment?.batch?.batch_name ||
                  "Waiting for Guidance Schedule"}
              </h4>

              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {assignment?.batch
                  ? formatGuidanceSchedule(assignment.batch)
                  : "Guidance will assign your schedule or batch. No action is required from you yet."}
              </p>

              {assignment?.batch && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700">
                    Your Batch: {assignment.batch.batch_name}
                  </span>

                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {assignment.batch.semester} • {assignment.batch.school_year}
                  </span>
                </div>
              )}
            </div>

            {assignment?.batch && (
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Guidance Question / Requirement
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                    {assignment.batch.question ||
                      "No question has been posted."}
                  </p>

                  {assignment.batch.instructions && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {assignment.batch.instructions}
                    </p>
                  )}
                </div>

                {assignment.response && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Your Response
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {assignment.response}
                    </p>

                    {assignment.response_submitted_at && (
                      <p className="mt-2 text-xs text-slate-500">
                        Submitted {formatDate(assignment.response_submitted_at)}
                      </p>
                    )}
                  </div>
                )}

                {assignment.guidance_status === "Needs Follow-up" && (
                  <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                    <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600" />

                    <div>
                      <p className="text-sm font-bold text-red-700">
                        Needs Follow-up
                      </p>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        {assignment.guidance_remarks ||
                          "Guidance requested a follow-up response."}
                      </p>
                    </div>
                  </div>
                )}

                {!["Approved", "For Review", "Answered"].includes(
                  assignment.guidance_status
                ) &&
                  getGuidanceScheduleState(assignment.batch) !== "open" && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                      <FaClock className="mt-0.5 shrink-0 text-amber-600" />

                      <div>
                        <p className="text-sm font-bold text-amber-700">
                          {getGuidanceScheduleMessage(assignment.batch)
                            ?.title || "Guidance Session Not Open"}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          {getGuidanceScheduleMessage(assignment.batch)
                            ?.message ||
                            "Wait for your scheduled Guidance session."}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* INDEPENDENT OFFICE BATCH SCHEDULE (DISPLAY ONLY) */}

        {!step.subject_id && !guidanceStep && step.office_id && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <h4 className="text-sm font-bold text-slate-800">
              Office Batch Assignment
            </h4>

            {(() => {
              const batch = step.officeBatch;
              const approvalMode = String(
                step.officeSubmissionSetting?.approval_mode || "direct"
              ).toLowerCase();
              const needsSubmission =
                approvalMode !== "direct" && approvalMode !== "manual";
              const isPending =
                String(step.status || "").toLowerCase() === "pending";
              const hasSubmitted = Boolean(step.submission);
              const waitingForNextBatch =
                needsSubmission && isPending && !hasSubmitted;

              if (!batch) {
                return (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-semibold text-amber-800">
                      {waitingForNextBatch
                        ? "Awaiting Next Batch"
                        : "No batch assigned"}
                    </p>

                    <p className="text-slate-600">
                      {waitingForNextBatch
                        ? "This office has not assigned an available batch yet. Your clearance remains pending."
                        : "Contact this office if a batch schedule is required."}
                    </p>
                  </div>
                );
              }

              const start =
                batch.schedule_date && batch.start_time
                  ? new Date(`${batch.schedule_date}T${batch.start_time}+08:00`)
                  : null;
              const endDate = batch.end_date || batch.schedule_date;
              const end =
                endDate && batch.end_time
                  ? new Date(`${endDate}T${batch.end_time}+08:00`)
                  : null;
              const now = new Date();
              const active =
                String(batch.status || "").toLowerCase() === "open";
              const expired = Boolean(end && now > end);
              const state =
                hasSubmitted && isPending
                  ? "Pending Review"
                  : waitingForNextBatch && (expired || !active)
                    ? "Awaiting Next Batch"
                    : !active
                      ? "Closed"
                      : start && now < start
                        ? "Upcoming"
                        : start && end && now >= start && now <= end
                          ? "Scheduled Now"
                          : "Schedule Unavailable";
              const dateLabel =
                endDate && endDate !== batch.schedule_date
                  ? `${batch.schedule_date} – ${endDate}`
                  : batch.schedule_date || "Not scheduled";

              return (
                <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold">Batch:</span>{" "}
                    {batch.batch_name}
                  </p>

                  <p>
                    <span className="font-semibold">Date:</span> {dateLabel}
                  </p>

                  <p>
                    <span className="font-semibold">Time:</span>{" "}
                    {batch.start_time || "—"} – {batch.end_time || "—"}
                  </p>

                  <p>
                    <span className="font-semibold">Schedule status:</span>{" "}
                    <span
                      className={
                        state === "Awaiting Next Batch"
                          ? "font-semibold text-amber-800"
                          : state === "Pending Review"
                            ? "font-semibold text-blue-700"
                            : "font-semibold text-violet-800"
                      }
                    >
                      {state}
                    </span>
                  </p>

                  {state === "Awaiting Next Batch" && (
                    <p className="text-amber-800 sm:col-span-2">
                      Your previous schedule has ended. Please wait for this
                      office to open a new batch; you do not need to submit a
                      new clearance request.
                    </p>
                  )}

                  {batch.note && (
                    <p className="sm:col-span-2">
                      <span className="font-semibold">Office note:</span>{" "}
                      {batch.note}
                    </p>
                  )}

                  <p className="text-xs text-violet-800 sm:col-span-2">
                    Submission is allowed only when the office and server-side
                    batch checks pass.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* OFFICE REQUIREMENTS AND QUESTIONS */}

        {!step.subject_id &&
          !guidanceStep &&
          step.officeRequirements?.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-bold text-slate-800">
                Office Requirements &amp; Questions
              </h4>

              <p className="mt-1 text-xs text-slate-600">
                These are the active instructions published by this office.
              </p>

              <div className="mt-3 space-y-2">
                {step.officeRequirements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-blue-100 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.title}
                      </p>

                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {item.requirement_type === "Question"
                          ? "Question"
                          : "Requirement"}
                      </span>

                      {item.is_required && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          Required
                        </span>
                      )}

                      {String(item.requirement_type || "").toLowerCase() !==
                        "question" && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                          Attachment:{" "}
                          {item.attachment_required ? "Required" : "Optional"}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">
                        {item.description}
                      </p>
                    )}

                    {item.requirement_type === "Question" && (
                      <p className="mt-1.5 text-xs text-blue-700">
                        {item.response_type === "yes-no"
                          ? "Select Yes or No when submitting this office requirement."
                          : item.response_type === "text"
                            ? "Enter your written answer when submitting this office requirement."
                            : "Complete the confirmation when submitting this office requirement."}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* TEACHER SUBJECT REQUIREMENT */}

        {step.subject_id &&
          (step.subjectRequirement ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Teacher-Provided Requirement
                  </p>

                  <h4 className="mt-1.5 text-base font-bold text-slate-800">
                    {step.subjectRequirement.title}
                  </h4>

                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {step.subjectRequirement.description ||
                      "No additional instructions provided."}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700">
                    {step.subjectRequirement.submission_type}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
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
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      step.subjectRequirement.submission_type ===
                      "No Submission"
                        ? "bg-slate-200 text-slate-700"
                        : isPastDeadline(step.subjectRequirement)
                          ? "bg-red-100 text-red-700"
                          : step.subjectRequirement.is_open
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {step.subjectRequirement.submission_type ===
                    "No Submission"
                      ? "Teacher Review Only"
                      : isPastDeadline(step.subjectRequirement)
                        ? "Deadline Passed"
                        : step.subjectRequirement.is_open
                          ? "Submission Open"
                          : "Submission Not Open"}
                  </span>
                </div>
              </div>

              {step.subjectRequirement.deadline && (
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Deadline: {formatDate(step.subjectRequirement.deadline)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-bold text-amber-700">
                  Submission Not Available Yet
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  You cannot submit this subject requirement yet. The assigned
                  teacher must post the instructions and open the submission
                  window first.
                </p>
              </div>
            </div>
          ))}

        {/* CURRENT SUBMISSION */}

        {step.submission && (
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700">
                  Current Submission — Version {step.submission.version}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Submitted {formatDate(step.submission.submitted_at)}
                </p>

                {!step.subject_id &&
                  !guidanceStep &&
                  step.officeRequirements?.length > 0 && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                        Submitted For
                      </p>
                      {step.officeRequirements.length === 1 ? (
                        <>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {step.officeRequirements[0].title}
                          </p>
                          {step.officeRequirements[0].description && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                              {step.officeRequirements[0].description}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="mt-1 text-xs text-slate-600">
                            This submission belongs to the office clearance step covering
                            the following requirements. Individual attachments are not
                            separately linked to each requirement.
                          </p>
                          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-800">
                            {step.officeRequirements.map((item) => (
                              <li key={item.id}>{item.title}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                {step.subject_id && step.subjectRequirement?.title && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Submitted For
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {step.subjectRequirement.title}
                    </p>
                  </div>
                )}

                {step.submission.submission_text && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {step.submission.submission_text}
                  </p>
                )}
              </div>

              {step.submission.signed_url && (
                <a
                  href={step.submission.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 sm:w-fit"
                >
                  <FaEye />
                  View Attachment
                </a>
              )}
            </div>

            {step.submission.attachment_name && (
              <div className="mt-3 flex min-w-0 items-start gap-2 break-all text-xs text-slate-500">
                <FaFileAlt />

                {step.submission.attachment_name}
              </div>
            )}
          </div>
        )}

        {/* APPROVED */}

        {!guidanceStep && step.status === "Approved" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3.5">
            <p className="text-sm font-bold text-green-700">Approved</p>

            <p className="mt-1 text-sm text-green-700">
              {step.remarks || "Requirement verified and approved."}
            </p>

            <p className="mt-2 text-xs text-green-600">
              Reviewed: {formatDate(step.reviewed_at)}
            </p>
          </div>
        )}
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | STEP ROW (one compact line, expands for details)
  |--------------------------------------------------------------------------
  */

  const handleGuidanceRescheduleRequest = async (step) => {
    const assignment = step?.guidanceAssignment;
    if (!assignment?.id || requestingGuidanceReschedule) return;
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Request a New Guidance Schedule?",
      text: "Your previous batch deadline has passed. Guidance must approve and assign your next batch.",
      input: "textarea",
      inputPlaceholder: "Reason (optional)",
      showCancelButton: true,
      confirmButtonText: "Send Request",
      confirmButtonColor: "#4f46e5",
    });
    if (!confirmation.isConfirmed) return;
    setRequestingGuidanceReschedule(assignment.id);
    const result = await requestGuidanceReschedule(assignment.id, confirmation.value || "");
    setRequestingGuidanceReschedule(null);
    if (!result.success) {
      await Swal.fire("Request Failed", result.error || "Please try again.", "error");
      return;
    }
    const refreshed = await getGuidanceRescheduleRequests();
    if (refreshed.success) setGuidanceRescheduleRequests(refreshed.data || []);
    await Swal.fire("Request Sent", "Wait for Guidance to assign your next batch.", "success");
  };

  const renderStepRow = ({ step, bucket }) => {
    const guidanceStep = isGuidanceStep(step);

    const displayedStatus = guidanceStep
      ? getGuidanceDisplayStatus(step)
      : getDisplayedStepStatus(step);

    const statusStyle = guidanceStep
      ? getGuidanceStatusStyle(step)
      : getDisplayedStepStatusStyle(step);

    const submissionWindowOpen = guidanceStep
      ? false
      : isSubmissionWindowOpen(step);

    const canSubmit =
      !guidanceStep &&
      step.status === "Pending" &&
      !step.submission &&
      submissionWindowOpen;

    const officeMode = String(
      step.officeSubmissionSetting?.approval_mode || "direct"
    ).toLowerCase();

    const canRequestRecheck =
      !guidanceStep &&
      Boolean(step.office_id) &&
      !step.subject_id &&
      step.status === "Rejected" &&
      ["manual", "direct"].includes(officeMode);

    const canResubmit =
      !guidanceStep &&
      step.status === "Rejected" &&
      !canRequestRecheck &&
      (submissionWindowOpen ||
        (Boolean(step.office_id) &&
          !step.subject_id &&
          officeMode === "requirements"));

    const canAnswerGuidance =
      guidanceStep &&
      Boolean(step.guidanceAssignment) &&
      getGuidanceScheduleState(step.guidanceAssignment.batch) === "open" &&
      !["For Review", "Answered", "Approved"].includes(
        step.guidanceAssignment.guidance_status
      ) &&
      step.status !== "Approved";

    const rescheduleRequest = guidanceStep && step.guidanceAssignment
      ? guidanceRescheduleRequests.find((request) =>
          request.batch_student_id === step.guidanceAssignment.id &&
          request.status === "Pending"
        )
      : null;
    const canRequestGuidanceReschedule =
      guidanceStep &&
      Boolean(step.guidanceAssignment) &&
      step.guidanceAssignment.guidance_status === "Scheduled" &&
      !step.guidanceAssignment.response_submitted_at &&
      !step.guidanceAssignment.response &&
      !step.guidanceAssignment.attachment_path &&
      !step.guidanceAssignment.acknowledgment_confirmed &&
      !["Approved", "Rejected"].includes(step.status) &&
      ["ended", "completed", "closed"].includes(
        getGuidanceScheduleState(step.guidanceAssignment.batch)
      ) &&
      (() => {
        const batch = step.guidanceAssignment.batch;
        if (!batch?.schedule_date || !batch?.end_time) return false;
        const deadline = new Date(
          `${batch.deadline_date || batch.schedule_date}T${batch.end_time}+08:00`
        );
        return !Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime();
      })();
    const isExpanded = expandedStepId === step.id;
    const hint = getStepHint(step);

    return (
      <div
        key={step.id}
        className={`overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white transition ${
          BUCKET_ACCENT[bucket] || "border-l-slate-300"
        } ${isExpanded ? "shadow-md" : "hover:shadow-sm"}`}
      >
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          <button
            type="button"
            onClick={() => toggleExpanded(step.id)}
            aria-expanded={isExpanded}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg text-blue-700 sm:h-11 sm:w-11">
              {isAdviserStep(step) ? (
                <FaUserCheck />
              ) : step.subject_id ? (
                <FaBook />
              ) : (
                <FaBuilding />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="break-words text-sm font-bold text-slate-800 sm:text-base">
                  {getStepName(step)}
                </h3>

                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {getStepType(step)}
                </span>
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {getStepCode(step)} •{" "}
                {step.approver?.full_name || "Assigned Approver"}
              </p>

              {hint && (
                <p className={`mt-1.5 truncate text-xs font-medium ${hint.tone}`}>
                  {hint.text}
                </p>
              )}
            </div>
          </button>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}
            >
              {displayedStatus}
            </span>

            {canSubmit && (
              <button
                type="button"
                onClick={() => openSubmissionModal(step)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <FaUpload />
                Submit
              </button>
            )}

            {canRequestRecheck && (
              <button
                type="button"
                disabled={Boolean(submittingStepId)}
                onClick={() => handleOfficeRecheck(step)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSyncAlt />
                {submittingStepId === step.id
                  ? "Requesting..."
                  : "Request Recheck"}
              </button>
            )}

            {canResubmit && (
              <button
                type="button"
                onClick={() => openSubmissionModal(step)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <FaSyncAlt />
                Resubmit
              </button>
            )}

            {canRequestGuidanceReschedule && (
              <button
                type="button"
                disabled={Boolean(rescheduleRequest) || Boolean(requestingGuidanceReschedule)}
                onClick={() => handleGuidanceRescheduleRequest(step)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSyncAlt />
                {rescheduleRequest ? "Reschedule Requested" :
                  requestingGuidanceReschedule === step.guidanceAssignment.id
                    ? "Sending..." : "Request Reschedule"}
              </button>
            )}

            {canAnswerGuidance && (
              <button
                type="button"
                onClick={() => openGuidanceModal(step)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
              >
                <FaPaperPlane />
                {step.guidanceAssignment.guidance_status === "Needs Follow-up"
                  ? "Follow-up"
                  : "Answer"}
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleExpanded(step.id)}
              aria-label={isExpanded ? "Hide details" : "Show details"}
              aria-expanded={isExpanded}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <FaChevronDown
                className={`text-xs transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {isExpanded && renderStepDetails(step)}
      </div>
    );
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

  const cycleSemester = activeTerm?.semester || "No active semester";
  const cycleSchoolYear = activeTerm?.school_year || null;

  return (
    <DashboardLayout>
      {/* HEADER + STUDENT INFORMATION */}

      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg sm:rounded-3xl">
        <div className="flex flex-col gap-4 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                Request Clearance
              </h1>

              {clearanceRequest && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getOverallStatusStyle(
                    clearanceRequest.status
                  )}`}
                >
                  {clearanceRequest.status}
                </span>
              )}
            </div>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-blue-100">
              Submit your clearance requirements and monitor every subject and
              office approval.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {!hasCurrentCycleRequest && activeTerm && (
              <button
                type="button"
                onClick={handleRequestClearance}
                disabled={submittingRequest}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-center font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <FaPaperPlane />

                {submittingRequest
                  ? "Submitting..."
                  : "Submit Clearance Request"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/15 lg:grid-cols-4">
          {[
            {
              label: "Student",
              value: student?.full_name || "No Name",
              sub: student?.student_id || "Not assigned",
            },
            {
              label: "Program",
              value: student?.course || "Not assigned",
              sub: null,
            },
            {
              label: "Year and Block",
              value: student?.year_level || "No year level",
              sub: student?.section ? `Block ${student.section}` : null,
            },
            {
              label: "Clearance Cycle",
              value: cycleSemester || "Not assigned",
              sub: cycleSchoolYear || null,
            },
          ].map((item) => (
            <div key={item.label} className="min-w-0 bg-blue-900/30 px-4 py-3 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                {item.label}
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold">
                {item.value}
              </p>

              {item.sub && (
                <p className="truncate text-xs text-blue-200">{item.sub}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!clearanceRequest ? (
        <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-6 text-center shadow-sm sm:rounded-3xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-700">
            <FaClipboardCheck />
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-800 sm:text-2xl">
            No Clearance Request Yet
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            {activeTerm
              ? "Submit a clearance request to generate your official subject and office requirements."
              : "No academic semester is currently open for clearance requests. Please wait for the administrator to activate a semester."}
          </p>

          <button
            type="button"
            onClick={handleRequestClearance}
            disabled={submittingRequest || !activeTerm}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-7"
          >
            <FaPaperPlane />

            {submittingRequest ? "Submitting..." : "Submit Clearance Request"}
          </button>
        </div>
      ) : (
        <>
          {/* COMPLETED BANNER */}

          {clearanceRequest.status === "Completed" && (
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm sm:flex-row sm:items-center sm:rounded-3xl sm:p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl text-white">
                <FaCheckCircle />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-green-800 sm:text-xl">
                  Clearance Completed
                </h2>

                <p className="mt-0.5 text-sm text-green-700">
                  All your required subject and office clearances have been
                  approved. You are cleared for enrollment verification.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenClearancePass}
                disabled={loadingPass}
                className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-center font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
          )}

          {/* PROGRESS + TABS */}

          <section className="mb-5 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Clearance Progress
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {progress.approved} of {progress.total} approved •{" "}
                  {progress.submitted} submitted • {progress.rejected} rejected
                </p>
              </div>

              <span className="text-3xl font-black text-blue-700">
                {progress.percentage}%
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Last updated: {formatDate(clearanceRequest.updated_at)}
            </p>

            {steps.length > 0 && (
              <div
                role="tablist"
                aria-label="Filter clearance requirements"
                className="mt-4 flex flex-wrap gap-2"
              >
                {STEP_TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const count = bucketCounts[tab.key];
                  const highlight = tab.key === "action" && count > 0;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setStatusTab(tab.key);
                        setTypeFilter("all");
                      }}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                        isActive
                          ? "bg-blue-700 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-black ${
                          isActive
                            ? "bg-white/20 text-white"
                            : highlight
                              ? "bg-amber-100 text-amber-800"
                              : "bg-white text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* CLEARANCE REQUIREMENTS */}

          <section className="min-w-0 rounded-2xl bg-white p-3 shadow-lg sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Clearance Requirements
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tap a requirement to see its instructions, schedule, and
                  history.
                </p>
              </div>

              {availableTypes.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {["all", ...availableTypes].map((type) => {
                    const isActive = typeFilter === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        aria-pressed={isActive}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          isActive
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {type === "all"
                          ? "All types"
                          : `${TYPE_LABELS[type]} (${typeCounts[type]})`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {steps.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
                No clearance requirements were generated.
              </div>
            ) : groupedViews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FaCheckCircle className="mx-auto text-3xl text-slate-300" />

                <p className="mt-3 font-bold text-slate-700">
                  Nothing to show in this tab
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  There are no requirements in this view right now.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setStatusTab("all");
                    setTypeFilter("all");
                  }}
                  className="mt-4 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Show all requirements
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedViews.map((group) => (
                  <div key={group.type}>
                    <div className="mb-2.5 flex items-center gap-3 px-1">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                        {TYPE_LABELS[group.type]}
                      </span>

                      <span className="h-px flex-1 bg-slate-200" />

                      <span className="text-xs font-bold text-slate-400">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {group.items.map((view) => renderStepRow(view))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* GUIDANCE RESPONSE MODAL */}

      {selectedGuidanceStep && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-4 sm:p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                  Guidance Clearance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                  {selectedGuidanceStep.guidanceAssignment?.batch?.batch_name ||
                    "Guidance Requirement"}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {formatGuidanceSchedule(
                    selectedGuidanceStep.guidanceAssignment?.batch
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeGuidanceModal}
                disabled={submittingGuidance}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Question / Requirement
                </p>

                <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-slate-800">
                  {selectedGuidanceStep.guidanceAssignment?.batch?.question ||
                    "No question has been posted."}
                </p>

                {selectedGuidanceStep.guidanceAssignment?.batch
                  ?.instructions && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {
                      selectedGuidanceStep.guidanceAssignment.batch
                        .instructions
                    }
                  </p>
                )}
              </div>

              {selectedGuidanceStep.guidanceAssignment?.guidance_status ===
                "Needs Follow-up" && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="font-bold text-red-700">Guidance Follow-up</p>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    {selectedGuidanceStep.guidanceAssignment
                      ?.guidance_remarks ||
                      "Guidance requested an updated response."}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Your Response
                </label>

                <textarea
                  value={guidanceResponse}
                  onChange={(event) => setGuidanceResponse(event.target.value)}
                  rows={6}
                  placeholder="Type your response here..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <FaUpload className="text-indigo-600" />
                      Supporting Attachment
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Optional supporting evidence. JPG, PNG, or PDF only, up
                      to 10 MB per file.
                    </p>
                  </div>

                  <label
                    htmlFor="guidanceAttachment"
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      uploadingGuidanceAttachment
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {uploadingGuidanceAttachment ? (
                      <>
                        <FaSyncAlt className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FaUpload />
                        Add File
                      </>
                    )}

                    <input
                      id="guidanceAttachment"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={handleGuidanceAttachmentChange}
                      disabled={
                        uploadingGuidanceAttachment || submittingGuidance
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-2">
                  {loadingGuidanceAttachments ? (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      <FaSyncAlt className="animate-spin text-indigo-600" />
                      Loading attachments...
                    </div>
                  ) : guidanceAttachments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center">
                      <FaFileAlt className="mx-auto text-xl text-slate-300" />

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        No attachment added
                      </p>
                    </div>
                  ) : (
                    guidanceAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <FaFileAlt />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-700">
                            {attachment.file_name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatGuidanceAttachmentSize(attachment.file_size)}
                          </p>
                        </div>

                        {attachment.signedUrl && (
                          <a
                            href={attachment.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-indigo-600 transition hover:bg-indigo-50"
                            title="Open attachment"
                          >
                            <FaEye />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteGuidanceAttachment(attachment)
                          }
                          disabled={
                            deletingGuidanceAttachmentId === attachment.id ||
                            submittingGuidance ||
                            uploadingGuidanceAttachment
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Remove attachment"
                        >
                          {deletingGuidanceAttachmentId === attachment.id ? (
                            <FaSyncAlt className="animate-spin" />
                          ) : (
                            <FaTimes />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-5 text-indigo-700">
                  <FaShieldAlt className="mt-0.5 shrink-0" />
                  Files are stored privately and become locked after you submit
                  your response for Guidance review.
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeGuidanceModal}
                  disabled={submittingGuidance}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitGuidanceResponse}
                  disabled={submittingGuidance || uploadingGuidanceAttachment}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingGuidance ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Submit to Guidance
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}

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
                  {getStepType(selectedStep)} • {getStepCode(selectedStep)}
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
              {selectedStep.status === "Rejected" && selectedStep.remarks && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="font-bold text-red-700">Rejection Reason</p>

                  <p className="mt-2 text-sm text-red-700">
                    {selectedStep.remarks}
                  </p>
                </div>
              )}

              {/* Teacher instructions displayed before the student submits. */}
              {selectedStep.subject_id && selectedStep.subjectRequirement && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Teacher-Provided Requirement
                  </p>
                  <h3 className="mt-2 break-words text-base font-bold text-slate-800">
                    {selectedStep.subjectRequirement.title || "Subject Requirement"}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {selectedStep.subjectRequirement.description ||
                      "No additional instructions provided by the teacher."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-3 py-1.5 text-blue-700">
                      {selectedStep.subjectRequirement.submission_type || "Submission"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1.5 text-slate-700">
                      {selectedStep.subjectRequirement.is_required ? "Required" : "Optional"}
                    </span>
                  </div>
                  {selectedStep.subjectRequirement.deadline && (
                    <p className="mt-3 text-xs font-medium text-slate-600">
                      Deadline: {formatDate(selectedStep.subjectRequirement.deadline)}
                    </p>
                  )}
                </section>
              )}

              {/* Always show all published office requirements inside the modal,
                  including non-question items that previously appeared only
                  in the collapsed office card. */}
              {!selectedStep.subject_id &&
                selectedStep.office_id &&
                selectedStep.officeRequirements?.some(
                  (item) => String(item.requirement_type || "").toLowerCase() !== "question"
                ) && (
                  <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <FaClipboardCheck className="mt-1 shrink-0 text-indigo-700" />
                      <div>
                        <h3 className="font-bold text-slate-800">
                          Requirements from {getStepName(selectedStep)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Please review these instructions before submitting.
                          You do not need to open the office dropdown first.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedStep.officeRequirements.filter((item) => String(item.requirement_type || "").toLowerCase() !== "question").map((item, index) => {
                        const isQuestion =
                          String(item.requirement_type || "").toLowerCase() ===
                          "question";
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-indigo-100 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-indigo-700">
                                {index + 1}.
                              </span>
                              <p className="flex-1 text-sm font-semibold text-slate-800">
                                {item.title}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {isQuestion ? "Question" : "Requirement"}
                              </span>
                              {item.is_required && (
                                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                                  Required
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                                {item.description}
                              </p>
                            )}
                            {item.attachment_required && (
                              <p className="mt-2 text-xs font-semibold text-indigo-700">
                                Supporting attachment required
                              </p>
                            )}
                            {isQuestion && (
                              <p className="mt-2 text-xs text-indigo-700">
                                Answer this question in the section below.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* Office question answers are submitted through submit_office_clearance_answers RPC. */}
              {!selectedStep.subject_id &&
                selectedStep.officeRequirements?.some(
                  (item) =>
                    String(item.requirement_type || "").toLowerCase() ===
                    "question"
                ) && (
                  <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
                    <h3 className="font-bold text-slate-800">
                      Office Questions &amp; Requirements
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      Answer the questions below. Required answers are checked
                      before submission and validated again by the server.
                    </p>

                    <div className="mt-4 space-y-4">
                      {selectedStep.officeRequirements
                        .filter(
                          (item) =>
                            String(item.requirement_type || "").toLowerCase() ===
                            "question"
                        )
                        .map((item) => {
                          const kind = String(
                            item.response_type || ""
                          ).toLowerCase();
                          const isYesNo = kind === "yes-no" || kind === "yes_no";
                          const isCheckbox =
                            kind === "checkbox" || kind === "check";

                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-blue-100 bg-white p-4"
                            >
                              <label
                                htmlFor={`office-answer-${item.id}`}
                                className="block text-sm font-semibold text-slate-800"
                              >
                                {item.title}
                                {item.is_required ? " *" : ""}
                              </label>

                              {item.description && (
                                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                                  {item.description}
                                </p>
                              )}

                              {isYesNo ? (
                                <select
                                  id={`office-answer-${item.id}`}
                                  value={officeAnswers[item.id] || ""}
                                  onChange={(event) =>
                                    setOfficeAnswers((previous) => ({
                                      ...previous,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                                >
                                  <option value="">Select an answer</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              ) : isCheckbox ? (
                                <label className="mt-3 flex items-center gap-3 text-sm text-slate-700">
                                  <input
                                    id={`office-answer-${item.id}`}
                                    type="checkbox"
                                    checked={officeAnswers[item.id] === "Yes"}
                                    onChange={(event) =>
                                      setOfficeAnswers((previous) => ({
                                        ...previous,
                                        [item.id]: event.target.checked
                                          ? "Yes"
                                          : "No",
                                      }))
                                    }
                                  />
                                  I confirm this requirement
                                </label>
                              ) : (
                                <textarea
                                  id={`office-answer-${item.id}`}
                                  rows={3}
                                  value={officeAnswers[item.id] || ""}
                                  onChange={(event) =>
                                    setOfficeAnswers((previous) => ({
                                      ...previous,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Enter your answer"
                                  className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm"
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </section>
                )}

              {stepAllowsText(selectedStep) && !(
                selectedStep.office_id &&
                !selectedStep.subject_id &&
                (selectedStep.officeRequirements || []).some(
                  (item) => String(item.requirement_type || "").toLowerCase() === "question"
                )
              ) && (
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
                    onChange={(event) => setSubmissionText(event.target.value)}
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
                    Attachment{" "}
                    {selectedStep.office_id && !selectedStep.subject_id
                      ? (selectedStep.officeRequirements || []).some(
                          (item) => item.attachment_required === true
                        )
                        ? "(Required)"
                        : "(Optional)"
                      : ""}
                  </label>

                  <label
                    htmlFor="requirementFile"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-5 text-center transition hover:bg-blue-100 sm:p-8"
                  >
                    <FaUpload className="text-4xl text-blue-700" />

                    <p className="mt-4 font-semibold text-slate-700">
                      Allowed: {formatAllowedFileTypes(selectedStep)}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Maximum file size: {getStepMaxFileSizeMb(selectedStep)} MB
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
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        disabled={Boolean(submittingStepId)}
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
                  Your attachment is stored privately. Only you, the assigned
                  approver, and authorized administrators can access it.
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

                      {selectedStep.status === "Rejected"
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

      {/* DIGITAL CLEARANCE PASS MODAL */}

      {showClearancePass && clearancePass && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-3">
          <div className="max-h-[100dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
              <button
                type="button"
                onClick={() => setShowClearancePass(false)}
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
                    Student Number: {clearancePass.studentId}
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
                    {clearancePass.courseCode || "N/A"}
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
                    {clearancePass.yearLevel || "N/A"}

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
                    {clearancePass.semester || "N/A"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {clearancePass.schoolYear || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Approval
                  </p>

                  <p className="mt-1 text-lg font-black text-green-700">
                    {clearancePass.approvedSteps}/{clearancePass.totalSteps}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Completed
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatDate(clearancePass.completedAt)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Verification
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1.5 text-xs font-black ${
                      clearancePass.verificationStatus === "Verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {clearancePass.verificationStatus || "Ready"}
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
                Present the reference and verification code to the Registrar
                or authorized enrollment personnel.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setShowClearancePass(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handlePrintClearancePass}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <FaPrint />
                  Print / PDF
                </button>

                <button
                  type="button"
                  onClick={handleSendPassEmail}
                  disabled={sendingPassEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingPassEmail ? (
                    <FaSyncAlt className="animate-spin" />
                  ) : (
                    <FaEnvelope />
                  )}

                  {sendingPassEmail ? "Sending..." : "Email Pass"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default RequestClearance;
