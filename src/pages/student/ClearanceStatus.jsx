import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";

import { supabase } from "../../services/supabase";

import { sendClearancePassEmail } from "../../services/clearancePassEmailService";

import {
  getMyTreasurerSchedule,
  getMyTreasurerRescheduleRequests,
  requestTreasurerReschedule,
} from "../../services/treasurerService";

import {
  FaArrowLeft,
  FaBook,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardCheck,
  FaClock,
  FaEnvelope,
  FaExclamationCircle,
  FaGraduationCap,
  FaPrint,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
  FaUserGraduate,
} from "react-icons/fa";

/* ============================================================
   CONSTANTS
============================================================ */

const TABS = [
  { key: "all", label: "All" },
  { key: "Rejected", label: "Needs Action" },
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
];

const GROUP_DEFS = [
  {
    key: "adviser",
    title: "Faculty Adviser",
    description: "Approval handled by your officially assigned block adviser.",
    icon: FaUserGraduate,
  },
  {
    key: "office",
    title: "Office Clearances",
    description: "Requirements handled by school offices.",
    icon: FaBuilding,
  },
  {
    key: "subject",
    title: "Subject Clearances",
    description: "Requirements handled by your assigned faculty.",
    icon: FaBook,
  },
];

const STATUS_RANK = { Rejected: 0, Pending: 1, Approved: 2 };

const STATUS_ACCENT = {
  Approved: "border-l-emerald-500",
  Rejected: "border-l-rose-500",
  Pending: "border-l-amber-400",
};

/* ============================================================
   HELPERS
============================================================ */

const escapeHtml = (value) =>
  String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function formatScheduleDate(value, short = false) {
  if (!value) return "Not scheduled";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString(
    "en-PH",
    short
      ? { month: "short", day: "numeric", year: "numeric" }
      : { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );
}

function formatScheduleTime(value) {
  if (!value) return "N/A";

  const [h, m = "0"] = String(value).split(":");

  if (!Number.isFinite(Number(h)) || !Number.isFinite(Number(m))) {
    return String(value);
  }

  const date = new Date();

  date.setHours(Number(h), Number(m), 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const formatDate = (date) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getTreasurerStatusClass = (status) => {
  if (status === "Cleared") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "With Balance") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "Needs Action") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "For Review") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700";
};

const getStepName = (step) =>
  step.step_type === "Adviser"
    ? "Faculty Adviser"
    : step.offices?.office_name ||
      step.subjects?.subject_name ||
      "Unassigned Clearance Step";

const getStepCode = (step) =>
  step.step_type === "Adviser"
    ? "Block Adviser"
    : step.offices?.office_code || step.subjects?.subject_code || "No code";

const getApproverName = (step) =>
  step.users?.full_name || "No approver assigned";

const getStepGroupKey = (step) =>
  step.step_type === "Adviser" ? "adviser" : step.subject_id ? "subject" : "office";

const getStatusIcon = (status) => {
  if (status === "Approved") return <FaCheckCircle />;
  if (status === "Rejected") return <FaTimesCircle />;

  return <FaClock />;
};

const getStatusLabel = (status) =>
  status === "Rejected" ? "Needs Action" : status;

const getStatusClass = (status) => {
  if (status === "Approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getOverallStatusClass = (status) => {
  if (status === "Completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "In Progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getUnansweredQuestions = (step) =>
  (step.officeRequirements || []).filter(
    (requirement) =>
      String(requirement.requirement_type || "").toLowerCase() === "question" &&
      String(requirement.response_type || "").toLowerCase() === "yes-no" &&
      !requirement.student_response_value
  );

// One-line summary shown on a collapsed row so students see what matters
// without opening every requirement.
const getStepHint = (step) => {
  if (step.status === "Rejected") {
    return {
      text: step.remarks
        ? `Needs action: ${step.remarks}`
        : "Needs action — see the approver's remark",
      tone: "text-rose-700",
    };
  }

  const unanswered =
    step.status !== "Approved" ? getUnansweredQuestions(step).length : 0;

  if (unanswered > 0) {
    return {
      text: `${unanswered} question${
        unanswered === 1 ? "" : "s"
      } need${unanswered === 1 ? "s" : ""} your answer`,
      tone: "text-amber-700",
    };
  }

  if (step.officeSchedule && step.status !== "Approved") {
    return {
      text: `Scheduled ${formatScheduleDate(
        step.officeSchedule.schedule_date,
        true
      )} • ${formatScheduleTime(
        step.officeSchedule.start_time
      )} – ${formatScheduleTime(step.officeSchedule.end_time)}`,
      tone: "text-indigo-700",
    };
  }

  if (step.status === "Approved") {
    return {
      text: `Approved ${formatDate(step.reviewed_at)}`,
      tone: "text-emerald-700",
    };
  }

  return { text: "Waiting for approver review", tone: "text-slate-500" };
};

/* ============================================================
   PAGE
============================================================ */

function ClearanceStatus() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchKeyword = useMemo(
    () => new URLSearchParams(location.search).get("search")?.trim() || "",
    [location.search]
  );

  const normalizedSearch = searchKeyword.toLocaleLowerCase();

  const [student, setStudent] = useState(null);
  const [clearanceRequest, setClearanceRequest] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [clearanceHistory, setClearanceHistory] = useState([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState("");
  const viewingArchive = Boolean(clearanceRequest && (!activeTerm ||
    clearanceRequest.school_year !== activeTerm.school_year ||
    clearanceRequest.semester !== activeTerm.semester));

  const [steps, setSteps] = useState([]);

  const [treasurerSchedule, setTreasurerSchedule] = useState(null);
  const [treasurerScheduleError, setTreasurerScheduleError] = useState("");
  const [treasurerRescheduleRequests, setTreasurerRescheduleRequests] =
    useState([]);
  const [submittingTreasurerReschedule, setSubmittingTreasurerReschedule] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [clearancePass, setClearancePass] = useState(null);
  const [loadingPass, setLoadingPass] = useState(false);
  const [showClearancePass, setShowClearancePass] = useState(false);
  const [sendingPassEmail, setSendingPassEmail] = useState(false);
  const [passEmailResult, setPassEmailResult] = useState(null);

  const [savingOfficeResponseKey, setSavingOfficeResponseKey] = useState(null);

  // Page organizer state
  const [statusTab, setStatusTab] = useState("all");
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState([]);

  /* ============================================================
     LOAD CLEARANCE
  ============================================================ */

  const loadClearanceStatus = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        throw new Error("Please log in to view your clearance status.");
      }

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
          semester,
          school_year
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (studentError) throw studentError;

      if (studentData.role !== "Student") {
        throw new Error("Only student accounts can view this page.");
      }

      setStudent(studentData);

      const { data: activeRows, error: termError } = await supabase
        .from("academic_terms")
        .select("id, school_year, semester, is_active")
        .eq("is_active", true)
        .limit(1);
      if (termError) throw termError;
      const term = activeRows?.[0] || null;
      setActiveTerm(term);

      const { data: allRequests, error: requestError } = await supabase
        .from("clearance_requests")
        .select("id, student_id, school_year, semester, status, remarks, requested_at, updated_at, completed_at")
        .eq("student_id", studentData.id)
        .order("requested_at", { ascending: false });
      if (requestError) throw requestError;

      const isCurrent = (request) => Boolean(term) &&
        request.school_year === term.school_year && request.semester === term.semester;
      const records = allRequests || [];
      const archived = records.filter((request) => !isCurrent(request));
      setClearanceHistory(archived);
      const requestData = selectedArchiveId
        ? archived.find((request) => request.id === selectedArchiveId) || null
        : records.find(isCurrent) || null;
      setClearanceRequest(requestData);
      setClearancePass(null);
      setShowClearancePass(false);

      try {
        setTreasurerScheduleError("");
        const scheduleRows = await getMyTreasurerSchedule();

        // Prefer the schedule belonging to the current clearance request.
        // The batch-student row is moved (not recreated) during a reschedule,
        // so this always reads the approved destination batch after refresh.
        const normalizeCycle = (value) =>
          String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
        const getBatch = (row) =>
          Array.isArray(row?.treasurer_batches)
            ? row.treasurer_batches[0]
            : row?.treasurer_batches;

        const matchingSchedule = (scheduleRows || []).find((row) => {
          const batch = getBatch(row);
          if (!batch) return false;
          if (!requestData) return true;
          return (
            normalizeCycle(batch.school_year) === normalizeCycle(requestData.school_year) &&
            normalizeCycle(batch.semester) === normalizeCycle(requestData.semester)
          );
        });

        setTreasurerSchedule(matchingSchedule || null);
        if (!matchingSchedule && (scheduleRows || []).length) {
          console.warn("Treasurer assignments exist, but none matches this clearance cycle.", {
            clearanceSchoolYear: requestData?.school_year,
            clearanceSemester: requestData?.semester,
            assignedBatches: scheduleRows.map((row) => ({
              batchName: getBatch(row)?.batch_name,
              schoolYear: getBatch(row)?.school_year,
              semester: getBatch(row)?.semester,
            })),
          });
        }

        try {
          const requests = await getMyTreasurerRescheduleRequests();

          setTreasurerRescheduleRequests(requests || []);
        } catch (rescheduleLoadError) {
          console.warn(
            "Unable to load Treasurer reschedule requests:",
            rescheduleLoadError
          );
          setTreasurerRescheduleRequests([]);
        }
      } catch (scheduleError) {
        console.warn("Unable to load Treasurer schedule:", scheduleError);

        setTreasurerSchedule(null);
        setTreasurerScheduleError(scheduleError?.message || "Unable to load Treasurer schedule.");
        setTreasurerRescheduleRequests([]);
      }

      if (!requestData) {
        setSteps([]);

        return;
      }

      const { data: stepData, error: stepError } = await supabase
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
          ),
          users!clearance_steps_approver_id_fkey (
            id,
            full_name,
            employee_id
          )
        `)
        .eq("clearance_request_id", requestData.id);

      if (stepError) throw stepError;

      const sortedSteps = (stepData || []).sort((a, b) => {
        const first = a.offices?.office_name || a.subjects?.subject_name || "";
        const second = b.offices?.office_name || b.subjects?.subject_name || "";

        return first.localeCompare(second);
      });

      /* Student-side Generic Office details: read-only requirements + schedule. */

      const officeOnlySteps = sortedSteps.filter(
        (step) =>
          step.step_type !== "Adviser" && !step.subject_id && step.office_id
      );

      let officeRequirementRows = [];
      let officeRequirementResponseRows = [];
      let officeBatchAssignments = [];
      let officeBatchRows = [];

      if (officeOnlySteps.length) {
        const officeIds = [
          ...new Set(officeOnlySteps.map((step) => step.office_id).filter(Boolean)),
        ];
        const stepIds = officeOnlySteps.map((step) => step.id);

        const { data: requirementRows, error: requirementError } =
          await supabase
            .from("office_requirements")
            .select(
              `id, office_id, requirement_type, title, description, response_type, is_required, is_active, created_at`
            )
            .in("office_id", officeIds)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (requirementError) {
          console.warn(
            "Unable to load student office requirements:",
            requirementError
          );
        } else {
          officeRequirementRows = requirementRows || [];
        }

        const { data: responseRows, error: responseError } = await supabase
          .from("office_requirement_responses")
          .select(
            `id, clearance_step_id, requirement_id, student_response_value, student_responded_at`
          )
          .in("clearance_step_id", stepIds);

        if (responseError) {
          console.warn(
            "Unable to load student office requirement responses:",
            responseError
          );
        } else {
          officeRequirementResponseRows = responseRows || [];
        }

        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("office_batch_students")
          .select(`id, batch_id, clearance_step_id, student_id, assigned_at`)
          .in("clearance_step_id", stepIds)
          .eq("student_id", studentData.id)
          .order("assigned_at", { ascending: false });

        if (assignmentError) {
          console.warn(
            "Unable to load student office batch assignments:",
            assignmentError
          );
        } else {
          officeBatchAssignments = assignmentRows || [];

          const batchIds = [
            ...new Set(
              officeBatchAssignments.map((row) => row.batch_id).filter(Boolean)
            ),
          ];

          if (batchIds.length) {
            const { data: batchRows, error: batchError } = await supabase
              .from("office_batches")
              .select(
                `id, office_id, batch_name, schedule_date, start_time, end_time, note, capacity, status, created_at, updated_at`
              )
              .in("id", batchIds);

            if (batchError) {
              console.warn("Unable to load student office schedules:", batchError);
            } else {
              officeBatchRows = batchRows || [];
            }
          }
        }
      }

      const requirementsByOffice = new Map();

      for (const requirement of officeRequirementRows) {
        const list = requirementsByOffice.get(requirement.office_id) || [];

        list.push(requirement);
        requirementsByOffice.set(requirement.office_id, list);
      }

      const responseByStepAndRequirement = new Map();

      for (const response of officeRequirementResponseRows) {
        responseByStepAndRequirement.set(
          `${response.clearance_step_id}:${response.requirement_id}`,
          response
        );
      }

      const batchById = new Map(officeBatchRows.map((batch) => [batch.id, batch]));
      const assignmentByStep = new Map();

      for (const assignment of officeBatchAssignments) {
        if (!assignmentByStep.has(assignment.clearance_step_id)) {
          assignmentByStep.set(assignment.clearance_step_id, assignment);
        }
      }

      const enrichedSteps = sortedSteps.map((step) => {
        if (step.step_type === "Adviser" || step.subject_id || !step.office_id) {
          return step;
        }

        const assignment = assignmentByStep.get(step.id) || null;
        const batch = assignment?.batch_id
          ? batchById.get(assignment.batch_id) || null
          : null;

        const officeRequirements = (
          requirementsByOffice.get(step.office_id) || []
        ).map((requirement) => {
          const savedResponse =
            responseByStepAndRequirement.get(`${step.id}:${requirement.id}`) ||
            null;

          return {
            ...requirement,
            student_response_value: savedResponse?.student_response_value || null,
            student_responded_at: savedResponse?.student_responded_at || null,
          };
        });

        return {
          ...step,
          officeRequirements,
          officeSchedule: batch
            ? {
                ...batch,
                assignment_id: assignment.id,
                assigned_at: assignment.assigned_at,
              }
            : null,
        };
      });

      setSteps(enrichedSteps);
    } catch (error) {
      console.error("Clearance status error:", error);

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Clearance Status",
        text: error?.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedArchiveId]);

  useEffect(() => {
    loadClearanceStatus();
  }, [loadClearanceStatus]);

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics = useMemo(() => {
    const total = steps.length;
    const approved = steps.filter((step) => step.status === "Approved").length;
    const pending = steps.filter((step) => step.status === "Pending").length;
    const rejected = steps.filter((step) => step.status === "Rejected").length;
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, rejected, percentage };
  }, [steps]);

  /* ============================================================
     SEARCH + STATUS TABS + GROUPS
  ============================================================ */

  // Search only changes the displayed clearance steps; underlying data and
  // overall progress stay intact.
  const matchesClearanceSearch = useCallback(
    (step) => {
      if (!normalizedSearch) return true;

      const type =
        step.step_type === "Adviser"
          ? "Adviser"
          : step.subject_id
            ? "Subject"
            : "Office";

      const searchable = [
        type,
        step.step_type === "Adviser" ? "Faculty Adviser Block Adviser" : "",
        step.subjects?.subject_name,
        step.subjects?.subject_code,
        step.offices?.office_name,
        step.offices?.office_code,
        step.users?.full_name,
        step.status,
        step.remarks,
        ...(step.officeRequirements || []).flatMap((requirement) => [
          requirement.title,
          requirement.description,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(normalizedSearch);
    },
    [normalizedSearch]
  );

  const searchFilteredSteps = useMemo(
    () => steps.filter(matchesClearanceSearch),
    [steps, matchesClearanceSearch]
  );

  const searchResultCount = searchFilteredSteps.length;

  const clearClearanceSearch = () =>
    navigate("/student/clearance-status", { replace: true });

  const tabCounts = useMemo(
    () => ({
      all: searchFilteredSteps.length,
      Rejected: searchFilteredSteps.filter((step) => step.status === "Rejected")
        .length,
      Pending: searchFilteredSteps.filter((step) => step.status === "Pending")
        .length,
      Approved: searchFilteredSteps.filter((step) => step.status === "Approved")
        .length,
    }),
    [searchFilteredSteps]
  );

  const groups = useMemo(() => {
    const visibleSteps = searchFilteredSteps.filter(
      (step) => statusTab === "all" || step.status === statusTab
    );

    return GROUP_DEFS.map((definition) => {
      const allInGroup = steps.filter(
        (step) => getStepGroupKey(step) === definition.key
      );

      const items = visibleSteps
        .filter((step) => getStepGroupKey(step) === definition.key)
        .sort(
          (a, b) =>
            (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3) ||
            getStepName(a).localeCompare(getStepName(b))
        );

      return {
        ...definition,
        items,
        total: allInGroup.length,
        approved: allInGroup.filter((step) => step.status === "Approved").length,
      };
    }).filter((group) => group.items.length > 0);
  }, [steps, searchFilteredSteps, statusTab]);

  const toggleExpanded = (stepId) =>
    setExpandedStepId((current) => (current === stepId ? null : stepId));

  const toggleGroup = (key) =>
    setCollapsedGroups((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );

  /* ============================================================
     DIGITAL CLEARANCE PASS
  ============================================================ */

  const loadDigitalClearancePass = useCallback(
    async ({ openModal = true, showError = true } = {}) => {
      if (!clearanceRequest?.id || clearanceRequest.status !== "Completed") {
        if (showError) {
          await Swal.fire({
            icon: "info",
            title: "Clearance Not Completed",
            text: "Your Digital Clearance Pass becomes available after every subject and office clearance step is approved.",
          });
        }

        return null;
      }

      try {
        setLoadingPass(true);

        const { data, error } = await supabase.rpc("get_my_clearance_pass", {
          p_request_id: clearanceRequest.id,
        });

        if (error) throw error;

        if (!data?.success || !data?.clearedForEnrollment) {
          throw new Error(
            "Your Digital Clearance Pass is not ready for enrollment verification."
          );
        }

        setClearancePass(data);

        if (openModal) {
          setShowClearancePass(true);
        }

        return data;
      } catch (error) {
        console.error("Load Digital Clearance Pass:", error);

        if (showError) {
          await Swal.fire({
            icon: "error",
            title: "Unable to Load Digital Pass",
            text:
              error?.message ||
              "Your Digital Clearance Pass could not be loaded.",
          });
        }

        return null;
      } finally {
        setLoadingPass(false);
      }
    },
    [clearanceRequest?.id, clearanceRequest?.status]
  );

  /* ============================================================
     EMAIL PASS
  ============================================================ */

  const handleSendPassEmail = useCallback(
    async ({ force = true, showSuccess = true } = {}) => {
      if (!clearanceRequest?.id || clearanceRequest.status !== "Completed") {
        if (showSuccess) {
          await Swal.fire({
            icon: "info",
            title: "Clearance Not Completed",
            text: "The pass can only be emailed after your clearance is completed.",
          });
        }

        return null;
      }

      try {
        setSendingPassEmail(true);

        const result = await sendClearancePassEmail({
          requestId: clearanceRequest.id,
          force,
        });

        setPassEmailResult(result);

        if (showSuccess) {
          const recipient =
            result?.recipientEmail || student?.email || "your email";

          await Swal.fire({
            icon: "success",
            title:
              result?.alreadySent && !result?.resent
                ? "Pass Already Emailed"
                : "Digital Pass Emailed",
            text:
              result?.alreadySent && !result?.resent
                ? `The Digital Clearance Pass was already sent to ${recipient}.`
                : `The Digital Clearance Pass was sent to ${recipient}.`,
          });
        }

        return result;
      } catch (error) {
        console.error("Send clearance pass email:", error);

        if (showSuccess) {
          await Swal.fire({
            icon: "error",
            title: "Unable to Email Digital Pass",
            text:
              error?.message ||
              "The Digital Clearance Pass could not be emailed.",
          });
        }

        return null;
      } finally {
        setSendingPassEmail(false);
      }
    },
    [clearanceRequest?.id, clearanceRequest?.status, student?.email]
  );

  /* ============================================================
     AUTO LOAD / EMAIL COMPLETED PASS
  ============================================================ */

  useEffect(() => {
    if (clearanceRequest?.status !== "Completed" || !clearanceRequest?.id) {
      setClearancePass(null);
      setPassEmailResult(null);

      return;
    }

    loadDigitalClearancePass({ openModal: false, showError: false });

    if (!viewingArchive) handleSendPassEmail({ force: false, showSuccess: false });
  }, [
    clearanceRequest?.id,
    clearanceRequest?.status,
    loadDigitalClearancePass,
    handleSendPassEmail,
    viewingArchive,
  ]);

  /* ============================================================
     PRINT / SAVE PDF
  ============================================================ */

  const handlePrintClearancePass = () => {
    if (!clearancePass) return;

    const printWindow = window.open("", "_blank", "width=900,height=760");

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
              padding: 32px;
              background: #f1f5f9;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .pass {
              max-width: 820px;
              margin: 0 auto;
              overflow: hidden;
              border: 1px solid #cbd5e1;
              border-radius: 20px;
              background: white;
            }

            .header {
              padding: 30px;
              background: linear-gradient(135deg, #1d4ed8, #4338ca);
              color: white;
              text-align: center;
            }

            .header h1 { margin: 0; font-size: 30px; }
            .header p { margin: 8px 0 0; color: #dbeafe; }

            .status {
              display: inline-block;
              margin-top: 18px;
              padding: 10px 16px;
              border-radius: 999px;
              background: #dcfce7;
              color: #15803d;
              font-size: 13px;
              font-weight: 700;
            }

            .content { padding: 30px; }

            .name {
              font-size: 26px;
              font-weight: 700;
              text-align: center;
            }

            .student-id {
              margin-top: 6px;
              color: #64748b;
              text-align: center;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-top: 26px;
            }

            .field {
              padding: 16px;
              border-radius: 12px;
              background: #f8fafc;
            }

            .label {
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .value {
              margin-top: 7px;
              font-size: 15px;
              font-weight: 700;
            }

            .verify {
              margin-top: 22px;
              padding: 22px;
              border: 2px dashed #93c5fd;
              border-radius: 14px;
              background: #eff6ff;
              text-align: center;
            }

            .reference {
              margin-top: 8px;
              color: #1d4ed8;
              font-size: 20px;
              font-weight: 700;
            }

            .code {
              margin-top: 10px;
              padding: 12px;
              border-radius: 10px;
              background: white;
              font-family: monospace;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: .1em;
            }

            .footer {
              padding: 18px 30px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 11px;
              line-height: 1.6;
              text-align: center;
            }

            @media print {
              body { padding: 0; background: white; }
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
              <div class="name">${escapeHtml(clearancePass.studentName)}</div>

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

              <div class="verify">
                <div class="label">Clearance Reference</div>

                <div class="reference">
                  ${escapeHtml(clearancePass.clearanceReference)}
                </div>

                <div class="label" style="margin-top:18px">
                  Verification Code
                </div>

                <div class="code">
                  ${escapeHtml(clearancePass.verificationCode)}
                </div>

                <p style="margin:14px 0 0;color:#475569;font-size:12px;">
                  Present this reference and verification code to the
                  Registrar or authorized enrollment personnel.
                </p>
              </div>
            </div>

            <div class="footer">
              Generated by SmartClear AI. Validity must be confirmed
              through the official clearance verification system.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadClearanceStatus();
  };

  /* ============================================================
     OFFICE QUESTION RESPONSE
  ============================================================ */

  const handleOfficeQuestionResponse = async (stepId, requirementId, answer) => {
    if (viewingArchive) return;
    const responseKey = `${stepId}:${requirementId}`;

    try {
      setSavingOfficeResponseKey(responseKey);

      const { error } = await supabase.rpc("submit_office_student_response", {
        p_clearance_step_id: stepId,
        p_requirement_id: requirementId,
        p_response_value: answer,
      });

      if (error) throw error;

      const respondedAt = new Date().toISOString();

      setSteps((currentSteps) =>
        currentSteps.map((step) => {
          if (step.id !== stepId) return step;

          return {
            ...step,
            officeRequirements: (step.officeRequirements || []).map(
              (requirement) =>
                requirement.id === requirementId
                  ? {
                      ...requirement,
                      student_response_value: answer,
                      student_responded_at: respondedAt,
                    }
                  : requirement
            ),
          };
        })
      );

      Swal.fire({
        icon: "success",
        title: "Answer Saved",
        text: `Your answer “${answer}” was submitted successfully.`,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Unable to save office question response:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to Save Answer",
        text: error?.message || "Please try again.",
      });
    } finally {
      setSavingOfficeResponseKey(null);
    }
  };

  /* ============================================================
     TREASURER RESCHEDULE REQUEST
  ============================================================ */

  const handleTreasurerRescheduleRequest = async () => {
    if (viewingArchive) return;
    if (!treasurerSchedule?.id) return;

    const batch = Array.isArray(treasurerSchedule.treasurer_batches)
      ? treasurerSchedule.treasurer_batches[0]
      : treasurerSchedule.treasurer_batches;

    const pending = treasurerRescheduleRequests.some(
      (request) =>
        request.batch_student_id === treasurerSchedule.id &&
        request.status === "Pending"
    );

    if (pending) {
      await Swal.fire({
        icon: "info",
        title: "Request Already Pending",
        text: "Please wait for the Treasurer to review your existing request.",
      });

      return;
    }

    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { value: formValues } = await Swal.fire({
      title: "Request Treasurer Reschedule",
      html: `<div style="text-align:left"><label for="preferred-date" style="display:block;margin-bottom:6px;font-weight:600">Preferred Date</label><input id="preferred-date" type="date" min="${localToday}" class="swal2-input" style="margin:0 0 16px;width:100%"/><label for="reschedule-reason" style="display:block;margin-bottom:6px;font-weight:600">Reason</label><textarea id="reschedule-reason" class="swal2-textarea" maxlength="1000" placeholder="Explain why you cannot attend the current schedule" style="margin:0;width:100%;min-height:100px"></textarea></div>`,
      showCancelButton: true,
      confirmButtonText: "Submit Request",
      confirmButtonColor: "#4f46e5",
      focusConfirm: false,
      preConfirm: () => {
        const preferredDate = document.getElementById("preferred-date")?.value;
        const reason = document
          .getElementById("reschedule-reason")
          ?.value?.trim();

        if (!preferredDate || !reason || reason.length < 10) {
          Swal.showValidationMessage(
            "Select a preferred date and enter at least 10 characters for your reason."
          );

          return false;
        }

        if (preferredDate === batch?.schedule_date) {
          Swal.showValidationMessage(
            "Choose a date different from your current schedule."
          );

          return false;
        }

        return { preferredDate, reason };
      },
    });

    if (!formValues) return;

    try {
      setSubmittingTreasurerReschedule(true);

      await requestTreasurerReschedule({
        batchStudentId: treasurerSchedule.id,
        ...formValues,
      });

      const requests = await getMyTreasurerRescheduleRequests();

      setTreasurerRescheduleRequests(requests || []);

      await Swal.fire({
        icon: "success",
        title: "Reschedule Request Submitted",
        text: "Your request is pending Treasurer review. Your current schedule remains unchanged until approved.",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Request Failed",
        text: error?.message || "Unable to submit request.",
      });
    } finally {
      setSubmittingTreasurerReschedule(false);
    }
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading clearance status...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ============================================================
     DERIVED TREASURER VALUES
  ============================================================ */

  const treasurerBatch = treasurerSchedule
    ? Array.isArray(treasurerSchedule.treasurer_batches)
      ? treasurerSchedule.treasurer_batches[0]
      : treasurerSchedule.treasurer_batches
    : null;

  const scheduleRequests = treasurerSchedule
    ? treasurerRescheduleRequests.filter(
        (request) => request.batch_student_id === treasurerSchedule.id
      )
    : [];

  const latestRescheduleRequest = scheduleRequests[0] || null;
  const hasPendingReschedule = scheduleRequests.some(
    (request) => request.status === "Pending"
  );

  const hasTreasurerDetails = Boolean(
    treasurerBatch?.student_note ||
      treasurerSchedule?.treasurer_remarks ||
      latestRescheduleRequest ||
      (treasurerSchedule?.financial_status === "With Balance" &&
        Number(treasurerSchedule?.balance_amount) > 0)
  );

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* HEADER + STUDENT STRIP */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate("/student/dashboard")}
                  className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-blue-100 transition hover:text-white"
                >
                  <FaArrowLeft />
                  Back to Dashboard
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Clearance Status
                  </h1>

                  {clearanceRequest && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${getOverallStatusClass(
                        clearanceRequest.status
                      )}`}
                    >
                      {clearanceRequest.status}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-blue-100">
                  {clearanceRequest
                    ? `${clearanceRequest.semester} • ${clearanceRequest.school_year}`
                    : "Track your office and subject clearance in one place."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-60 sm:w-auto"
              >
                <FaSyncAlt className={refreshing ? "animate-spin" : ""} />

                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <StudentInfo label="Student" value={student?.full_name || "No Name"} />

            <StudentInfo
              label="Student ID"
              value={student?.student_id || "Not assigned"}
            />

            <StudentInfo
              label="Program"
              value={student?.course || "Not assigned"}
            />

            <StudentInfo
              label="Year / Section"
              value={
                [student?.year_level, student?.section]
                  .filter(Boolean)
                  .join(" • ") || "Not assigned"
              }
            />
          </div>
        </section>

        {/* ACTIVE TERM / PREVIOUS SEMESTER ARCHIVE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Academic Clearance Cycle</h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeTerm ? `Active: ${activeTerm.semester} • ${activeTerm.school_year}` : "No active academic semester."}
              </p>
            </div>
            <select
              aria-label="Choose clearance cycle"
              value={selectedArchiveId}
              onChange={(event) => {
                setSelectedArchiveId(event.target.value);
                setExpandedStepId(null);
                setStatusTab("all");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 sm:w-auto"
            >
              <option value="">Current Semester</option>
              {clearanceHistory.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.semester} • {request.school_year} — {request.status}
                </option>
              ))}
            </select>
          </div>
          {viewingArchive && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Previous semester clearance — read-only view. Your earlier approvals are preserved.
            </p>
          )}
        </section>

        {/* SEARCH BANNER */}

        {searchKeyword && (
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm"
            role="status"
          >
            <div className="min-w-0">
              <p className="text-sm font-black text-blue-900">
                Search results for “{searchKeyword}”
              </p>

              <p className="mt-1 text-xs font-medium text-blue-700">
                {searchResultCount} matching clearance{" "}
                {searchResultCount === 1 ? "record" : "records"} found.
              </p>
            </div>

            <button
              type="button"
              onClick={clearClearanceSearch}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <FaTimes /> Clear Search
            </button>
          </section>
        )}

        {!clearanceRequest ? (
          <section className="rounded-2xl border border-dashed border-blue-200 bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              <FaClipboardCheck />
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-900">
              No Clearance Request Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {activeTerm
                ? "No clearance request for the active semester. Submit a new request to begin."
                : "No semester is active. Wait for the Administrator to open a new term."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/student/request-clearance")}
              disabled={!activeTerm}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Request Clearance
            </button>
          </section>
        ) : (
          <>
            {/* COMPLETED / DIGITAL PASS */}

            {clearanceRequest.status === "Completed" && (
              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
                      <FaGraduationCap />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-emerald-950">
                          Clearance Completed
                        </h2>

                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                          Cleared
                        </span>
                      </div>

                      <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-800">
                        All required steps are approved. Your Digital Clearance
                        Pass is ready for enrollment verification.
                        {clearanceRequest.completed_at &&
                          ` Completed ${formatDate(
                            clearanceRequest.completed_at
                          )}.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loadingPass}
                    onClick={() =>
                      loadDigitalClearancePass({
                        openModal: true,
                        showError: true,
                      })
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {loadingPass ? <FaSyncAlt className="animate-spin" /> : <FaShieldAlt />}
                    Digital Clearance Pass
                  </button>
                </div>

                <div className="flex flex-col gap-2 border-t border-emerald-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span>
                    Pass delivery:{" "}
                    <strong className="text-slate-700">
                      {passEmailResult
                        ? passEmailResult?.recipientEmail || student?.email
                        : student?.email || "Student email"}
                    </strong>
                  </span>

                  <button
                    type="button"
                    disabled={sendingPassEmail || viewingArchive}
                    onClick={() =>
                      handleSendPassEmail({ force: true, showSuccess: true })
                    }
                    className="inline-flex items-center gap-2 font-black text-emerald-700 transition hover:text-emerald-900 disabled:opacity-50"
                  >
                    {sendingPassEmail ? <FaSyncAlt className="animate-spin" /> : <FaEnvelope />}
                    Email Again
                  </button>
                </div>
              </section>
            )}

            {/* PROGRESS + STATUS TABS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-900">
                    Clearance Progress
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {statistics.approved} of {statistics.total} requirements
                    approved
                    {clearanceRequest.updated_at &&
                      ` • updated ${formatDate(clearanceRequest.updated_at)}`}
                  </p>
                </div>

                <div className="flex items-end gap-1.5">
                  <span className="text-3xl font-black text-slate-900">
                    {statistics.percentage}%
                  </span>
                </div>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${statistics.percentage}%` }}
                />
              </div>

              {clearanceRequest.remarks && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                      Clearance Remark
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      {clearanceRequest.remarks}
                    </p>
                  </div>
                </div>
              )}

              {steps.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Filter requirements by status"
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {TABS.map((tab) => {
                    const isActive = statusTab === tab.key;
                    const count = tabCounts[tab.key];
                    const highlight = tab.key === "Rejected" && count > 0;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setStatusTab(tab.key)}
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
                                ? "bg-rose-100 text-rose-700"
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

            {/* TREASURER SCHEDULE */}

            {!viewingArchive && !treasurerSchedule && (
              <section className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 shadow-sm sm:px-6">
                <div className="flex items-start gap-3">
                  <FaCalendarAlt className="mt-1 shrink-0 text-indigo-600" />
                  <div>
                    <h2 className="text-sm font-black text-indigo-950">Treasurer Schedule</h2>
                    <p className="mt-1 text-sm text-indigo-800">
                      {treasurerScheduleError
                        ? `Unable to load your Treasurer schedule: ${treasurerScheduleError}`
                        : "No Treasurer batch schedule is linked to this clearance cycle yet. Please contact the Treasurer if you have already been assigned."}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {!viewingArchive && treasurerSchedule && (
              <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-indigo-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">
                      <FaCalendarAlt />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">
                        Treasurer Schedule
                      </p>

                      <h2 className="mt-0.5 truncate text-lg font-black text-slate-900">
                        {treasurerBatch?.batch_name ||
                          "Financial Clearance Schedule"}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${getTreasurerStatusClass(
                        treasurerSchedule.financial_status
                      )}`}
                    >
                      {treasurerSchedule.financial_status || "Scheduled"}
                    </span>

                    <button
                      type="button"
                      onClick={handleTreasurerRescheduleRequest}
                      disabled={
                        hasPendingReschedule ||
                        submittingTreasurerReschedule ||
                        ["Cancelled", "Completed"].includes(treasurerBatch?.status)
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingTreasurerReschedule
                        ? "Submitting..."
                        : hasPendingReschedule
                          ? "Request Pending"
                          : "Request Reschedule"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-px bg-indigo-100 sm:grid-cols-2 lg:grid-cols-5">
                  <InfoCell
                    label="Batch"
                    value={treasurerBatch?.batch_name || "Not assigned"}
                  />
                  <InfoCell
                    label="Date"
                    value={formatScheduleDate(treasurerBatch?.schedule_date)}
                  />

                  <InfoCell
                    label="Visit Time"
                    value={`${formatScheduleTime(
                      treasurerBatch?.start_time
                    )} – ${formatScheduleTime(treasurerBatch?.end_time)}`}
                  />

                  <InfoCell
                    label="Semester"
                    value={treasurerBatch?.semester || "N/A"}
                  />

                  <InfoCell
                    label="School Year"
                    value={treasurerBatch?.school_year || "N/A"}
                  />
                </div>

                {hasTreasurerDetails && (
                  <details className="group border-t border-indigo-100">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50/60 sm:px-6">
                      <span>
                        Notes, balance, and reschedule request
                        {hasPendingReschedule && " • request pending"}
                      </span>

                      <FaChevronDown className="text-[10px] transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="space-y-3 px-5 pb-5 pt-1 sm:px-6">
                      {treasurerBatch?.student_note && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Note from Treasurer
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {treasurerBatch.student_note}
                          </p>
                        </div>
                      )}

                      {treasurerSchedule.treasurer_remarks && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Review Remark
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {treasurerSchedule.treasurer_remarks}
                          </p>
                        </div>
                      )}

                      {treasurerSchedule.financial_status === "With Balance" &&
                        Number(treasurerSchedule.balance_amount) > 0 && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                            Recorded outstanding balance:{" "}
                            {new Intl.NumberFormat("en-PH", {
                              style: "currency",
                              currency: "PHP",
                            }).format(Number(treasurerSchedule.balance_amount))}
                          </div>
                        )}

                      {latestRescheduleRequest && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                          <p className="font-black">
                            Latest Request: {latestRescheduleRequest.status}
                          </p>

                          <p className="mt-1">
                            Preferred date:{" "}
                            {formatScheduleDate(
                              latestRescheduleRequest.preferred_date
                            )}
                          </p>

                          <p className="mt-1">
                            Reason: {latestRescheduleRequest.reason}
                          </p>

                          {latestRescheduleRequest.review_remarks && (
                            <p className="mt-1">
                              Treasurer response:{" "}
                              {latestRescheduleRequest.review_remarks}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-xs leading-5 text-slate-500">
                        Reschedule requests are reviewed by the Treasurer. The
                        official schedule does not change automatically.
                      </p>
                    </div>
                  </details>
                )}
              </section>
            )}

            {/* CLEARANCE REQUIREMENTS BY GROUP */}

            {steps.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-600">
                  No clearance requirements were generated yet.
                </p>
              </section>
            ) : groups.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
                <FaCheckCircle className="mx-auto text-3xl text-slate-300" />

                <p className="mt-3 text-sm font-bold text-slate-700">
                  Nothing matches this view
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Try another status tab or clear your search.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setStatusTab("all");

                    if (searchKeyword) clearClearanceSearch();
                  }}
                  className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Show all requirements
                </button>
              </section>
            ) : (
              groups.map((group) => (
                <ClearanceGroup
                  key={group.key}
                  group={group}
                  collapsed={collapsedGroups.includes(group.key)}
                  onToggleGroup={() => toggleGroup(group.key)}
                  expandedStepId={expandedStepId}
                  onToggleStep={toggleExpanded}
                  onOfficeQuestionResponse={viewingArchive ? null : handleOfficeQuestionResponse}
                  savingOfficeResponseKey={savingOfficeResponseKey}
                />
              ))
            )}
          </>
        )}

        {/* DIGITAL PASS MODAL */}

        {showClearancePass && clearancePass && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowClearancePass(false)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>

                <div className="flex items-center gap-3 pr-12">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">
                    <FaShieldAlt />
                  </div>

                  <div>
                    <h2 className="text-xl font-black sm:text-2xl">
                      Digital Clearance Pass
                    </h2>

                    <p className="text-xs text-blue-100">
                      SmartClear AI • Official Clearance Record
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Student
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                      {clearancePass.studentName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Student ID: {clearancePass.studentId}
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                    <FaCheckCircle />
                    CLEARED FOR ENROLLMENT
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <PassInfo
                    label="Program"
                    value={clearancePass.courseCode || "N/A"}
                    secondary={clearancePass.courseName}
                  />

                  <PassInfo
                    label="Year & Block"
                    value={`${clearancePass.yearLevel || "N/A"}${
                      clearancePass.blockCode
                        ? ` • Block ${clearancePass.blockCode}`
                        : ""
                    }`}
                  />

                  <PassInfo
                    label="Clearance Cycle"
                    value={clearancePass.semester || "N/A"}
                    secondary={clearancePass.schoolYear}
                  />

                  <PassInfo
                    label="Approved"
                    value={`${clearancePass.approvedSteps}/${clearancePass.totalSteps}`}
                  />

                  <PassInfo
                    label="Completed"
                    value={formatDate(clearancePass.completedAt)}
                  />

                  <PassInfo
                    label="Verification"
                    value={clearancePass.verificationStatus || "Ready"}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                        Clearance Reference
                      </p>

                      <p className="mt-1 break-all font-mono text-base font-black text-blue-900">
                        {clearancePass.clearanceReference}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                        Verification Code
                      </p>

                      <p className="mt-1 break-all font-mono text-base font-black tracking-wider text-slate-900">
                        {clearancePass.verificationCode}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-blue-700">
                    Present the reference and verification code to the
                    Registrar or authorized enrollment personnel.
                  </p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <FaPrint />
                    Print / PDF
                  </button>

                  <button
                    type="button"
                    disabled={sendingPassEmail || viewingArchive}
                    onClick={() =>
                      handleSendPassEmail({ force: true, showSuccess: true })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {sendingPassEmail ? <FaSyncAlt className="animate-spin" /> : <FaEnvelope />}
                    Email Pass
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   STUDENT INFO
============================================================ */

function StudentInfo({ label, value }) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   INFO CELL (compact schedule facts)
============================================================ */

function InfoCell({ label, value }) {
  return (
    <div className="min-w-0 bg-white px-5 py-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value || "N/A"}
      </p>
    </div>
  );
}

/* ============================================================
   CLEARANCE GROUP (Adviser / Offices / Subjects)
============================================================ */

function ClearanceGroup({
  group,
  collapsed,
  onToggleGroup,
  expandedStepId,
  onToggleStep,
  onOfficeQuestionResponse,
  savingOfficeResponseKey,
}) {
  const Icon = group.icon;
  const percentage =
    group.total > 0 ? Math.round((group.approved / group.total) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggleGroup}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50/70 sm:px-6"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-black text-slate-900">{group.title}</h2>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {group.description}
          </p>
        </div>

        <div className="hidden w-32 shrink-0 sm:block">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>
              {group.approved}/{group.total} approved
            </span>

            <span>{percentage}%</span>
          </div>

          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {group.items.length}
        </span>

        <FaChevronDown
          className={`shrink-0 text-xs text-slate-400 transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>

      {!collapsed && (
        <div className="space-y-2.5 p-3 sm:p-4">
          {group.items.map((step) => (
            <ClearanceRow
              key={step.id}
              step={step}
              expanded={expandedStepId === step.id}
              onToggle={() => onToggleStep(step.id)}
              onOfficeQuestionResponse={onOfficeQuestionResponse}
              savingOfficeResponseKey={savingOfficeResponseKey}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   CLEARANCE ROW (one compact line, expands for details)
============================================================ */

function ClearanceRow({
  step,
  expanded,
  onToggle,
  onOfficeQuestionResponse,
  savingOfficeResponseKey,
}) {
  const hint = getStepHint(step);
  const hasOfficeDetails =
    step.step_type !== "Adviser" &&
    !step.subject_id &&
    ((step.officeRequirements || []).length > 0 || step.officeSchedule);

  return (
    <article
      className={`overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white transition ${
        STATUS_ACCENT[step.status] || "border-l-slate-300"
      } ${expanded ? "shadow-md" : "hover:shadow-sm"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-3 p-3.5 text-left sm:flex-row sm:items-center sm:gap-4 sm:p-4"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {step.step_type === "Adviser" ? (
              <FaUserGraduate />
            ) : step.subject_id ? (
              <FaBook />
            ) : (
              <FaBuilding />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-sm font-black text-slate-900 sm:text-base">
              {getStepName(step)}
            </h3>

            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
              {getStepCode(step)} • {getApproverName(step)}
            </p>

            <p className={`mt-1.5 truncate text-xs font-medium ${hint.tone}`}>
              {hint.text}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
              step.status
            )}`}
          >
            {getStatusIcon(step.status)}
            {getStatusLabel(step.status)}
          </span>

          <FaChevronDown
            className={`text-xs text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <DetailFact label="Approver" value={getApproverName(step)} />

            <DetailFact
              label="Reviewed"
              value={
                step.reviewed_at
                  ? formatDate(step.reviewed_at)
                  : "Not reviewed yet"
              }
            />

            <DetailFact label="Status" value={getStatusLabel(step.status)} />
          </div>

          {step.remarks && (
            <div
              className={`rounded-xl border px-4 py-3 ${
                step.status === "Rejected"
                  ? "border-rose-100 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Remark
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {step.remarks}
              </p>
            </div>
          )}

          {hasOfficeDetails && (
            <div className="grid gap-3 lg:grid-cols-2">
              {(step.officeRequirements || []).length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                      Office Requirements
                    </p>

                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-blue-700 shadow-sm">
                      {step.officeRequirements.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {step.officeRequirements.map((requirement) => {
                      const responseKey = `${step.id}:${requirement.id}`;
                      const isSaving = savingOfficeResponseKey === responseKey;
                      const isYesNoQuestion =
                        String(requirement.requirement_type || "").toLowerCase() ===
                          "question" &&
                        String(requirement.response_type || "").toLowerCase() ===
                          "yes-no";

                      return (
                        <div
                          key={requirement.id}
                          className="rounded-lg border border-blue-100 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-800">
                              {requirement.title}
                            </p>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                              {requirement.requirement_type || "Requirement"}
                            </span>

                            {requirement.is_required && (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-600">
                                Required
                              </span>
                            )}
                          </div>

                          {requirement.description && (
                            <p className="mt-1.5 text-xs leading-5 text-slate-600">
                              {requirement.description}
                            </p>
                          )}

                          {isYesNoQuestion && (
                            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Your Answer
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {["Yes", "No"].map((answer) => {
                                  const selected =
                                    requirement.student_response_value === answer;

                                  return (
                                    <button
                                      key={answer}
                                      type="button"
                                      disabled={isSaving || !onOfficeQuestionResponse}
                                      onClick={() =>
                                        onOfficeQuestionResponse?.(
                                          step.id,
                                          requirement.id,
                                          answer
                                        )
                                      }
                                      className={`rounded-lg border px-4 py-2 text-xs font-black transition ${
                                        selected
                                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                                      } ${isSaving ? "cursor-wait opacity-60" : ""}`}
                                    >
                                      {isSaving && selected ? "Saving..." : answer}
                                    </button>
                                  );
                                })}
                              </div>

                              {requirement.student_response_value && (
                                <p className="mt-2 text-[10px] font-bold text-emerald-700">
                                  Saved answer: {requirement.student_response_value}
                                  {requirement.student_responded_at
                                    ? ` • ${formatDate(
                                        requirement.student_responded_at
                                      )}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[10px] leading-4 text-blue-700">
                    Answer office questions when shown. Final verification is
                    still completed by the assigned approver.
                  </p>
                </div>
              )}

              {step.officeSchedule && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <FaCalendarAlt />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                        Office Schedule
                      </p>

                      <p className="mt-1 font-black text-slate-900">
                        {step.officeSchedule.batch_name ||
                          `${getStepName(step)} Schedule`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Date
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {formatScheduleDate(step.officeSchedule.schedule_date)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Time
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {formatScheduleTime(step.officeSchedule.start_time)} –{" "}
                        {formatScheduleTime(step.officeSchedule.end_time)}
                      </p>
                    </div>
                  </div>

                  {step.officeSchedule.note && (
                    <div className="mt-2 rounded-lg bg-white p-3">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        Office Note
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-700">
                        {step.officeSchedule.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ============================================================
   DETAIL FACT
============================================================ */

function DetailFact({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PASS INFO
============================================================ */

function PassInfo({ label, value, secondary }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value || "N/A"}
      </p>

      {secondary && (
        <p className="mt-0.5 break-words text-xs text-slate-500">{secondary}</p>
      )}
    </div>
  );
}

export default ClearanceStatus;
