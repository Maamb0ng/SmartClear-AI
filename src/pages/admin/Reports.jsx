import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";
import { supabase } from "../../services/supabase";

import {
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaClipboardCheck,
  FaDatabase,
  FaDownload,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaHistory,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
  FaUserGraduate,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const uniqueIds = (items = []) => [
  ...new Set(items.filter(Boolean)),
];

const formatDateTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateOnly = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getCurrentMonthStart = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
};

const isDateThisMonth = (date) => {
  if (!date) return false;

  return (
    new Date(date).getTime() >=
    getCurrentMonthStart().getTime()
  );
};

const formatActionName = (action) => {
  if (!action) return "Unknown Action";

  return action
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const formatEntityName = (entityType) => {
  if (!entityType) return "Unknown Entity";

  return entityType
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const getActionCategory = (action = "") => {
  if (action.startsWith("USER_")) {
    return "User Management";
  }

  if (action.startsWith("CLEARANCE_")) {
    return "Clearance";
  }

  if (
    action.includes("COURSE") ||
    action.includes("SECTION") ||
    action.includes("SUBJECT") ||
    action.includes("OFFICE") ||
    action.includes("CLASS_OFFERING") ||
    action.includes("APPROVER_ASSIGNMENT")
  ) {
    return "System Configuration";
  }

  return "Other";
};

const getActionBadgeClass = (action = "") => {
  if (
    action.includes("APPROVED") ||
    action.includes("COMPLETED") ||
    action.includes("VERIFIED") ||
    action.includes("ACTIVATED") ||
    action.includes("CREATED") ||
    action.includes("SUBMITTED")
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    action.includes("REJECTED") ||
    action.includes("DELETED") ||
    action.includes("DEACTIVATED")
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    action.includes("PENDING") ||
    action.includes("RETURNED") ||
    action.includes("STATUS_CHANGED")
  ) {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-blue-100 text-blue-700";
};

const getRoleBadgeClass = (role) => {
  switch (role) {
    case "Student":
      return "bg-blue-100 text-blue-700";

    case "Approver":
      return "bg-purple-100 text-purple-700";

    case "Administrator":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getRoleIcon = (role) => {
  switch (role) {
    case "Student":
      return <FaUserGraduate />;

    case "Approver":
      return <FaUserShield />;

    case "Administrator":
      return <FaShieldAlt />;

    default:
      return <FaUsers />;
  }
};

const percentage = (value, total) => {
  if (!total) return 0;

  return Math.round((value / total) * 100);
};

const escapeCsvValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (
  filename,
  columns,
  rows
) => {
  const header = columns
    .map((column) =>
      escapeCsvValue(column.label)
    )
    .join(",");

  const body = rows
    .map((row) =>
      columns
        .map((column) =>
          escapeCsvValue(
            typeof column.value ===
              "function"
              ? column.value(row)
              : row[column.value]
          )
        )
        .join(",")
    )
    .join("\n");

  const csvContent =
    "\uFEFF" + header + "\n" + body;

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const downloadUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(downloadUrl);
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

function Reports() {
  const [admin, setAdmin] = useState(null);

  const [users, setUsers] = useState([]);
  const [requests, setRequests] =
    useState([]);
  const [steps, setSteps] = useState([]);
  const [auditHistory, setAuditHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("analytics");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [roleFilter, setRoleFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [entityFilter, setEntityFilter] =
    useState("All");

  const [selectedHistory, setSelectedHistory] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD REPORT AND AUDIT DATA
  |--------------------------------------------------------------------------
  */

  const loadReportData = useCallback(
    async () => {
      try {
        /*
        |--------------------------------------------------------------------------
        | AUTHENTICATED ADMINISTRATOR
        |--------------------------------------------------------------------------
        */

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authUser) {
          throw new Error(
            "Please log in before accessing reports."
          );
        }

        const {
          data: adminProfile,
          error: adminError,
        } = await supabase
          .from("users")
          .select(`
            id,
            auth_id,
            full_name,
            email,
            role,
            status
          `)
          .eq("auth_id", authUser.id)
          .single();

        if (adminError) throw adminError;

        if (
          adminProfile.role !==
          "Administrator"
        ) {
          throw new Error(
            "This page is only available to Administrator accounts."
          );
        }

        if (
          adminProfile.status !== "Active"
        ) {
          throw new Error(
            "Your Administrator account is not active."
          );
        }

        setAdmin(adminProfile);

        /*
        |--------------------------------------------------------------------------
        | LOAD USERS, REQUESTS, STEPS, AND HISTORY
        |--------------------------------------------------------------------------
        */

        const [
          usersResponse,
          requestsResponse,
          stepsResponse,
          historyResponse,
        ] = await Promise.all([
          supabase
            .from("users")
            .select(`
              id,
              student_id,
              employee_id,
              full_name,
              email,
              role,
              status,
              course,
              year_level,
              section,
              semester,
              school_year,
              created_at
            `),

          supabase
            .from("clearance_requests")
            .select(`
              id,
              student_id,
              section_id,
              school_year,
              semester,
              status,
              requested_at,
              updated_at,
              completed_at,
              clearance_reference,
              verification_status,
              pass_generated_at,
              verified_at,
              verified_by
            `)
            .order("requested_at", {
              ascending: false,
            }),

          supabase
            .from("clearance_steps")
            .select(`
              id,
              clearance_request_id,
              office_id,
              subject_id,
              approver_id,
              status,
              remarks,
              reviewed_at
            `),

          supabase
            .from("history")
            .select(`
              id,
              actor_id,
              actor_auth_id,
              actor_role,
              subject_user_id,
              action,
              entity_type,
              entity_id,
              description,
              metadata,
              created_at
            `)
            .order("created_at", {
              ascending: false,
            })
            .limit(2000),
        ]);

        if (usersResponse.error) {
          throw usersResponse.error;
        }

        if (requestsResponse.error) {
          throw requestsResponse.error;
        }

        if (stepsResponse.error) {
          throw stepsResponse.error;
        }

        if (historyResponse.error) {
          throw historyResponse.error;
        }

        const safeUsers =
          usersResponse.data || [];

        const safeRequests =
          requestsResponse.data || [];

        const safeSteps =
          stepsResponse.data || [];

        const safeHistory =
          historyResponse.data || [];

        /*
        |--------------------------------------------------------------------------
        | ENRICH CLEARANCE REQUESTS
        |--------------------------------------------------------------------------
        */

        const userMap = new Map(
          safeUsers.map((user) => [
            user.id,
            user,
          ])
        );

        const stepMap = new Map();

        safeSteps.forEach((step) => {
          if (
            !stepMap.has(
              step.clearance_request_id
            )
          ) {
            stepMap.set(
              step.clearance_request_id,
              []
            );
          }

          stepMap
            .get(step.clearance_request_id)
            .push(step);
        });

        const enrichedRequests =
          safeRequests.map((request) => ({
            ...request,

            student:
              userMap.get(
                request.student_id
              ) || null,

            clearanceSteps:
              stepMap.get(request.id) || [],
          }));

        /*
        |--------------------------------------------------------------------------
        | ENRICH AUDIT HISTORY
        |--------------------------------------------------------------------------
        */

        const enrichedHistory =
          safeHistory.map((history) => ({
            ...history,

            actor:
              userMap.get(
                history.actor_id
              ) || null,

            subjectUser:
              userMap.get(
                history.subject_user_id
              ) || null,

            category:
              getActionCategory(
                history.action
              ),
          }));

        setUsers(safeUsers);
        setRequests(enrichedRequests);
        setSteps(safeSteps);
        setAuditHistory(enrichedHistory);
      } catch (error) {
        console.error(
          "Reports loading error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title: "Unable to Load Reports",
          text:
            error?.message ||
            "An unexpected error occurred while loading reports and audit history.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  /*
  |--------------------------------------------------------------------------
  | REPORT STATISTICS
  |--------------------------------------------------------------------------
  */

  const reportStatistics = useMemo(() => {
    const students = users.filter(
      (user) =>
        user.role === "Student"
    );

    const activeStudents =
      students.filter(
        (student) =>
          student.status === "Active"
      );

    const pendingRequests =
      requests.filter((request) =>
        [
          "Pending",
          "In Progress",
        ].includes(request.status)
      );

    const completedRequests =
      requests.filter(
        (request) =>
          request.status === "Completed"
      );

    const verifiedRequests =
      requests.filter(
        (request) =>
          request.verification_status ===
          "Verified"
      );

    const approvedSteps =
      steps.filter(
        (step) =>
          step.status === "Approved"
      );

    const pendingSteps =
      steps.filter(
        (step) =>
          step.status === "Pending"
      );

    const rejectedSteps =
      steps.filter(
        (step) =>
          step.status === "Rejected"
      );

    return {
      totalStudents: students.length,
      activeStudents:
        activeStudents.length,
      totalRequests: requests.length,
      pendingRequests:
        pendingRequests.length,
      completedRequests:
        completedRequests.length,
      verifiedRequests:
        verifiedRequests.length,
      approvedSteps:
        approvedSteps.length,
      pendingSteps:
        pendingSteps.length,
      rejectedSteps:
        rejectedSteps.length,
      totalSteps: steps.length,
    };
  }, [users, requests, steps]);

  /*
  |--------------------------------------------------------------------------
  | MONTHLY STATISTICS
  |--------------------------------------------------------------------------
  */

  const monthlyStatistics = useMemo(() => {
    const submitted =
      requests.filter((request) =>
        isDateThisMonth(
          request.requested_at
        )
      );

    const completed =
      requests.filter((request) =>
        isDateThisMonth(
          request.completed_at
        )
      );

    const verified =
      requests.filter((request) =>
        isDateThisMonth(
          request.verified_at
        )
      );

    const approvedSteps =
      steps.filter(
        (step) =>
          step.status === "Approved" &&
          isDateThisMonth(
            step.reviewed_at
          )
      );

    const rejectedSteps =
      steps.filter(
        (step) =>
          step.status === "Rejected" &&
          isDateThisMonth(
            step.reviewed_at
          )
      );

    return {
      submitted: submitted.length,
      completed: completed.length,
      verified: verified.length,
      approvedSteps:
        approvedSteps.length,
      rejectedSteps:
        rejectedSteps.length,
    };
  }, [requests, steps]);

  /*
  |--------------------------------------------------------------------------
  | AUDIT STATISTICS
  |--------------------------------------------------------------------------
  */

  const auditStatistics = useMemo(() => {
    const today = new Date();

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const todayEvents =
      auditHistory.filter(
        (history) =>
          history.created_at &&
          new Date(
            history.created_at
          ).getTime() >=
            todayStart.getTime()
      );

    const clearanceEvents =
      auditHistory.filter(
        (history) =>
          history.category ===
          "Clearance"
      );

    const adminEvents =
      auditHistory.filter(
        (history) =>
          history.actor_role ===
          "Administrator"
      );

    return {
      total: auditHistory.length,
      today: todayEvents.length,
      clearance:
        clearanceEvents.length,
      administrator:
        adminEvents.length,
    };
  }, [auditHistory]);

  /*
  |--------------------------------------------------------------------------
  | AUDIT FILTER OPTIONS
  |--------------------------------------------------------------------------
  */

  const roleOptions = useMemo(
    () =>
      uniqueIds(
        auditHistory.map(
          (history) =>
            history.actor_role
        )
      ).sort(),
    [auditHistory]
  );

  const entityOptions = useMemo(
    () =>
      uniqueIds(
        auditHistory.map(
          (history) =>
            history.entity_type
        )
      ).sort(),
    [auditHistory]
  );

  /*
  |--------------------------------------------------------------------------
  | FILTER AUDIT HISTORY
  |--------------------------------------------------------------------------
  */

  const filteredAuditHistory =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return auditHistory.filter(
        (history) => {
          const searchableContent = [
            history.action,
            formatActionName(
              history.action
            ),
            history.entity_type,
            history.entity_id,
            history.description,
            history.actor_role,
            history.actor?.full_name,
            history.actor?.email,
            history.actor?.student_id,
            history.actor?.employee_id,
            history.subjectUser
              ?.full_name,
            history.subjectUser
              ?.student_id,
            history.category,
            JSON.stringify(
              history.metadata || {}
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch
            );

          const matchesRole =
            roleFilter === "All" ||
            history.actor_role ===
              roleFilter;

          const matchesCategory =
            categoryFilter === "All" ||
            history.category ===
              categoryFilter;

          const matchesEntity =
            entityFilter === "All" ||
            history.entity_type ===
              entityFilter;

          return (
            matchesSearch &&
            matchesRole &&
            matchesCategory &&
            matchesEntity
          );
        }
      );
    }, [
      auditHistory,
      searchTerm,
      roleFilter,
      categoryFilter,
      entityFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | CLEAR AUDIT FILTERS
  |--------------------------------------------------------------------------
  */

  const clearAuditFilters = () => {
    setSearchTerm("");
    setRoleFilter("All");
    setCategoryFilter("All");
    setEntityFilter("All");
  };

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
  };

  /*
  |--------------------------------------------------------------------------
  | EXPORT REPORT
  |--------------------------------------------------------------------------
  */

  const exportAnalyticsReport = () => {
    if (requests.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Report Data",
        text:
          "There are no clearance requests to export.",
      });

      return;
    }

    const columns = [
      {
        label: "Clearance Reference",
        value: (request) =>
          request.clearance_reference ||
          "",
      },
      {
        label: "Student ID",
        value: (request) =>
          request.student
            ?.student_id || "",
      },
      {
        label: "Student Name",
        value: (request) =>
          request.student?.full_name ||
          "",
      },
      {
        label: "Course",
        value: (request) =>
          request.student?.course || "",
      },
      {
        label: "Year Level",
        value: (request) =>
          request.student?.year_level ||
          "",
      },
      {
        label: "Block",
        value: (request) =>
          request.student?.section || "",
      },
      {
        label: "Semester",
        value: "semester",
      },
      {
        label: "School Year",
        value: "school_year",
      },
      {
        label: "Request Status",
        value: "status",
      },
      {
        label: "Verification Status",
        value: "verification_status",
      },
      {
        label: "Approved Steps",
        value: (request) =>
          request.clearanceSteps.filter(
            (step) =>
              step.status ===
              "Approved"
          ).length,
      },
      {
        label: "Pending Steps",
        value: (request) =>
          request.clearanceSteps.filter(
            (step) =>
              step.status ===
              "Pending"
          ).length,
      },
      {
        label: "Rejected Steps",
        value: (request) =>
          request.clearanceSteps.filter(
            (step) =>
              step.status ===
              "Rejected"
          ).length,
      },
      {
        label: "Requested At",
        value: (request) =>
          formatDateTime(
            request.requested_at
          ),
      },
      {
        label: "Completed At",
        value: (request) =>
          formatDateTime(
            request.completed_at
          ),
      },
      {
        label: "Verified At",
        value: (request) =>
          formatDateTime(
            request.verified_at
          ),
      },
    ];

    downloadCsv(
      `smartclear-clearance-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      columns,
      requests
    );

    Swal.fire({
      icon: "success",
      title: "Report Exported",
      text:
        "The clearance report was downloaded successfully.",
      timer: 1800,
      showConfirmButton: false,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | EXPORT AUDIT HISTORY
  |--------------------------------------------------------------------------
  */

  const exportAuditHistory = () => {
    if (
      filteredAuditHistory.length === 0
    ) {
      Swal.fire({
        icon: "info",
        title: "No Audit Records",
        text:
          "There are no audit records matching the current filters.",
      });

      return;
    }

    const columns = [
      {
        label: "Date and Time",
        value: (history) =>
          formatDateTime(
            history.created_at
          ),
      },
      {
        label: "Action",
        value: (history) =>
          formatActionName(
            history.action
          ),
      },
      {
        label: "Action Code",
        value: "action",
      },
      {
        label: "Category",
        value: "category",
      },
      {
        label: "Actor Name",
        value: (history) =>
          history.actor?.full_name ||
          "System",
      },
      {
        label: "Actor Role",
        value: (history) =>
          history.actor_role ||
          "System",
      },
      {
        label: "Affected User",
        value: (history) =>
          history.subjectUser
            ?.full_name || "",
      },
      {
        label: "Entity Type",
        value: "entity_type",
      },
      {
        label: "Entity ID",
        value: "entity_id",
      },
      {
        label: "Description",
        value: "description",
      },
      {
        label: "Metadata",
        value: "metadata",
      },
    ];

    downloadCsv(
      `smartclear-audit-history-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      columns,
      filteredAuditHistory
    );

    Swal.fire({
      icon: "success",
      title: "Audit History Exported",
      text:
        "The filtered audit records were downloaded successfully.",
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handleExport = () => {
    if (activeTab === "analytics") {
      exportAnalyticsReport();
    } else {
      exportAuditHistory();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading reports and audit history...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative pb-10"
      >
      <motion.section
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${campusImage})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/82" />

        <motion.div
          animate={{
            x: [0, 24, 0],
            y: [0, -14, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-4 p-6 sm:p-7">
          <motion.div
            whileHover={{
              rotate: 4,
              scale: 1.04,
            }}
            className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
          >
            <img
              src={schoolLogo}
              alt="Consolatrix College seal"
              className="h-full w-full rounded-full object-cover"
            />
          </motion.div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
              <FaChartBar className="text-cyan-300" />
              Analytics & Accountability
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Reports & Audit History
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/75">
              Review real-time clearance analytics, system performance, exportable reports, and recorded administrator activities.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Tabs */}

      <div className="mb-8 flex gap-3 overflow-x-auto rounded-2xl bg-white p-3 shadow-lg">
        <button
          type="button"
          onClick={() =>
            setActiveTab("analytics")
          }
          className={`flex min-w-fit items-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            activeTab === "analytics"
              ? "bg-blue-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FaChartBar />
          Reports & Analytics
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("audit")
          }
          className={`flex min-w-fit items-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            activeTab === "audit"
              ? "bg-blue-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FaHistory />
          Audit History

          {auditStatistics.today > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === "audit"
                  ? "bg-white text-blue-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {auditStatistics.today} today
            </span>
          )}
        </button>
      </div>

      {activeTab === "analytics" ? (
        <>
          {/* Main Statistics */}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500">
                    Total Students
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      reportStatistics.totalStudents
                    }
                  </h2>

                  <p className="mt-2 text-sm text-green-700">
                    {
                      reportStatistics.activeStudents
                    }{" "}
                    active
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-600 p-5 text-3xl text-white">
                  <FaUsers />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500">
                    Pending Requests
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      reportStatistics.pendingRequests
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Out of{" "}
                    {
                      reportStatistics.totalRequests
                    }{" "}
                    requests
                  </p>
                </div>

                <div className="rounded-2xl bg-yellow-500 p-5 text-3xl text-white">
                  <FaClipboardCheck />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500">
                    Completed Clearances
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      reportStatistics.completedRequests
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    All steps approved
                  </p>
                </div>

                <div className="rounded-2xl bg-green-600 p-5 text-3xl text-white">
                  <FaCheckCircle />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500">
                    Enrollment Verified
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      reportStatistics.verifiedRequests
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Registrar verified
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-600 p-5 text-3xl text-white">
                  <FaShieldAlt />
                </div>
              </div>
            </div>
          </div>

          {/* Analytics */}

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            {/* Step Analytics */}

            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-slate-800">
                <FaChartBar />
                Clearance Step Analytics
              </h2>

              <p className="mb-7 text-sm text-slate-500">
                Current approval status of all
                generated subject and office
                clearance steps.
              </p>

              <div className="space-y-7">
                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold text-slate-700">
                      Approved
                    </span>

                    <span className="font-bold text-green-700">
                      {
                        reportStatistics.approvedSteps
                      }{" "}
                      (
                      {percentage(
                        reportStatistics.approvedSteps,
                        reportStatistics.totalSteps
                      )}
                      %)
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-600 transition-all"
                      style={{
                        width: `${percentage(
                          reportStatistics.approvedSteps,
                          reportStatistics.totalSteps
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold text-slate-700">
                      Pending
                    </span>

                    <span className="font-bold text-yellow-700">
                      {
                        reportStatistics.pendingSteps
                      }{" "}
                      (
                      {percentage(
                        reportStatistics.pendingSteps,
                        reportStatistics.totalSteps
                      )}
                      %)
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-yellow-500 transition-all"
                      style={{
                        width: `${percentage(
                          reportStatistics.pendingSteps,
                          reportStatistics.totalSteps
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold text-slate-700">
                      Rejected
                    </span>

                    <span className="font-bold text-red-700">
                      {
                        reportStatistics.rejectedSteps
                      }{" "}
                      (
                      {percentage(
                        reportStatistics.rejectedSteps,
                        reportStatistics.totalSteps
                      )}
                      %)
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all"
                      style={{
                        width: `${percentage(
                          reportStatistics.rejectedSteps,
                          reportStatistics.totalSteps
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Total clearance steps
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-800">
                  {
                    reportStatistics.totalSteps
                  }
                </p>
              </div>
            </div>

            {/* Monthly Summary */}

            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-slate-800">
                <FaCalendarAlt />
                Monthly Summary
              </h2>

              <p className="mb-7 text-sm text-slate-500">
                SmartClear AI activities recorded
                during the current month.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-center gap-3">
                    <FaFileAlt className="text-xl text-blue-700" />

                    <span className="font-semibold text-slate-700">
                      Clearance Requests Submitted
                    </span>
                  </div>

                  <strong className="text-2xl text-blue-700">
                    {
                      monthlyStatistics.submitted
                    }
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 p-5">
                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="text-xl text-green-700" />

                    <span className="font-semibold text-slate-700">
                      Clearances Completed
                    </span>
                  </div>

                  <strong className="text-2xl text-green-700">
                    {
                      monthlyStatistics.completed
                    }
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 p-5">
                  <div className="flex items-center gap-3">
                    <FaShieldAlt className="text-xl text-purple-700" />

                    <span className="font-semibold text-slate-700">
                      Enrollment Passes Verified
                    </span>
                  </div>

                  <strong className="text-2xl text-purple-700">
                    {
                      monthlyStatistics.verified
                    }
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <FaClipboardCheck className="text-xl text-green-700" />

                    <span className="font-semibold text-slate-700">
                      Requirements Approved
                    </span>
                  </div>

                  <strong className="text-2xl text-green-700">
                    {
                      monthlyStatistics.approvedSteps
                    }
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <FaTimesCircle className="text-xl text-red-700" />

                    <span className="font-semibold text-slate-700">
                      Requirements Rejected
                    </span>
                  </div>

                  <strong className="text-2xl text-red-700">
                    {
                      monthlyStatistics.rejectedSteps
                    }
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Clearance Requests */}

          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Recent Clearance Requests
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest student clearance requests
                and their progress.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left text-sm">
                      Student
                    </th>

                    <th className="p-4 text-left text-sm">
                      Clearance Cycle
                    </th>

                    <th className="p-4 text-left text-sm">
                      Progress
                    </th>

                    <th className="p-4 text-left text-sm">
                      Status
                    </th>

                    <th className="p-4 text-left text-sm">
                      Requested
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-14 text-center text-slate-500"
                      >
                        No clearance requests
                        found.
                      </td>
                    </tr>
                  ) : (
                    requests
                      .slice(0, 10)
                      .map((request) => {
                        const approved =
                          request.clearanceSteps.filter(
                            (step) =>
                              step.status ===
                              "Approved"
                          ).length;

                        const total =
                          request.clearanceSteps
                            .length;

                        return (
                          <tr
                            key={request.id}
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >
                            <td className="p-4">
                              <p className="font-bold text-slate-800">
                                {request.student
                                  ?.full_name ||
                                  "Unknown Student"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {request.student
                                  ?.student_id ||
                                  "No Student ID"}
                              </p>
                            </td>

                            <td className="p-4 text-sm text-slate-600">
                              <p>
                                {
                                  request.semester
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {
                                  request.school_year
                                }
                              </p>
                            </td>

                            <td className="p-4">
                              <p className="text-sm font-semibold text-slate-700">
                                {approved} / {total}
                              </p>

                              <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-blue-700"
                                  style={{
                                    width: `${percentage(
                                      approved,
                                      total
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>

                            <td className="p-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  request.status ===
                                  "Completed"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {request.status}
                              </span>

                              {request.verification_status ===
                                "Verified" && (
                                <span className="ml-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                                  Verified
                                </span>
                              )}
                            </td>

                            <td className="p-4 text-sm text-slate-600">
                              {formatDateOnly(
                                request.requested_at
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Audit Statistics */}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Total Audit Events
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {auditStatistics.total}
                  </h2>
                </div>

                <div className="rounded-2xl bg-blue-700 p-5 text-3xl text-white">
                  <FaHistory />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Events Today
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {auditStatistics.today}
                  </h2>
                </div>

                <div className="rounded-2xl bg-green-600 p-5 text-3xl text-white">
                  <FaCalendarAlt />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Clearance Events
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      auditStatistics.clearance
                    }
                  </h2>
                </div>

                <div className="rounded-2xl bg-purple-600 p-5 text-3xl text-white">
                  <FaClipboardCheck />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Administrator Actions
                  </p>

                  <h2 className="mt-2 text-4xl font-bold text-slate-800">
                    {
                      auditStatistics.administrator
                    }
                  </h2>
                </div>

                <div className="rounded-2xl bg-red-600 p-5 text-3xl text-white">
                  <FaShieldAlt />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}

          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search action, actor, affected user, description, entity, or metadata..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (current) => !current
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                <FaFilter />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Actor Role
                  </label>

                  <select
                    value={roleFilter}
                    onChange={(event) =>
                      setRoleFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="All">
                      All Roles
                    </option>

                    {roleOptions.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {role}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Action Category
                  </label>

                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="All">
                      All Categories
                    </option>

                    <option value="User Management">
                      User Management
                    </option>

                    <option value="Clearance">
                      Clearance
                    </option>

                    <option value="System Configuration">
                      System Configuration
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Entity Type
                  </label>

                  <select
                    value={entityFilter}
                    onChange={(event) =>
                      setEntityFilter(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="All">
                      All Entities
                    </option>

                    {entityOptions.map(
                      (entity) => (
                        <option
                          key={entity}
                          value={entity}
                        >
                          {formatEntityName(
                            entity
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    onClick={clearAuditFilters}
                    className="rounded-xl border border-slate-300 px-5 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit History Table */}

          <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.09)]">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  System Audit Trail
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    filteredAuditHistory.length
                  }{" "}
                  of {auditHistory.length} event(s)
                  displayed
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                Latest 2,000 records
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left text-sm">
                      Date & Time
                    </th>

                    <th className="p-4 text-left text-sm">
                      Actor
                    </th>

                    <th className="p-4 text-left text-sm">
                      Action
                    </th>

                    <th className="p-4 text-left text-sm">
                      Affected Record
                    </th>

                    <th className="p-4 text-left text-sm">
                      Description
                    </th>

                    <th className="p-4 text-left text-sm">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAuditHistory.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-16 text-center"
                      >
                        <FaHistory className="mx-auto text-5xl text-slate-300" />

                        <p className="mt-4 font-semibold text-slate-600">
                          No audit records found.
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Try changing the search
                          or filter settings.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditHistory.map(
                      (history) => (
                        <tr
                          key={history.id}
                          className="border-t border-slate-100 align-top transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap p-4">
                            <p className="font-semibold text-slate-700">
                              {formatDateOnly(
                                history.created_at
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(
                                history.created_at
                              ).toLocaleTimeString(
                                "en-PH",
                                {
                                  hour: "numeric",
                                  minute:
                                    "2-digit",
                                  second:
                                    "2-digit",
                                }
                              )}
                            </p>
                          </td>

                          <td className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 rounded-xl bg-slate-100 p-2 text-slate-600">
                                {getRoleIcon(
                                  history.actor_role
                                )}
                              </div>

                              <div>
                                <p className="font-bold text-slate-800">
                                  {history.actor
                                    ?.full_name ||
                                    "System Process"}
                                </p>

                                <span
                                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getRoleBadgeClass(
                                    history.actor_role
                                  )}`}
                                >
                                  {history.actor_role ||
                                    "System"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getActionBadgeClass(
                                history.action
                              )}`}
                            >
                              {formatActionName(
                                history.action
                              )}
                            </span>

                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              {history.category}
                            </p>
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-slate-700">
                              {formatEntityName(
                                history.entity_type
                              )}
                            </p>

                            {history.subjectUser && (
                              <p className="mt-1 text-sm text-blue-700">
                                {
                                  history
                                    .subjectUser
                                    .full_name
                                }
                              </p>
                            )}

                            {history.entity_id && (
                              <p className="mt-2 max-w-[180px] truncate text-xs text-slate-400">
                                {history.entity_id}
                              </p>
                            )}
                          </td>

                          <td className="max-w-md p-4">
                            <p className="text-sm text-slate-600">
                              {history.description ||
                                "No description provided."}
                            </p>
                          </td>

                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedHistory(
                                  history
                                )
                              }
                              className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-200"
                            >
                              <FaEye />
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Audit Details Modal */}

      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Audit Event Details
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-800">
                  {formatActionName(
                    selectedHistory.action
                  )}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(
                    selectedHistory.created_at
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedHistory(null)
                }
                className="rounded-xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Actor
                  </p>

                  <p className="mt-2 font-bold text-slate-800">
                    {selectedHistory.actor
                      ?.full_name ||
                      "System Process"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedHistory.actor
                      ?.email || "N/A"}
                  </p>

                  <span
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${getRoleBadgeClass(
                      selectedHistory.actor_role
                    )}`}
                  >
                    {selectedHistory.actor_role ||
                      "System"}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Affected User
                  </p>

                  <p className="mt-2 font-bold text-slate-800">
                    {selectedHistory.subjectUser
                      ?.full_name ||
                      "Not applicable"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedHistory.subjectUser
                      ?.student_id ||
                      selectedHistory.subjectUser
                        ?.employee_id ||
                      selectedHistory.subjectUser
                        ?.email ||
                      "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-3 text-slate-700">
                  {selectedHistory.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Entity Type
                  </p>

                  <p className="mt-2 font-bold text-slate-700">
                    {formatEntityName(
                      selectedHistory.entity_type
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Entity ID
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-slate-700">
                    {selectedHistory.entity_id ||
                      "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <FaDatabase className="text-blue-700" />

                  <p className="font-bold text-slate-700">
                    Event Metadata
                  </p>
                </div>

                {selectedHistory.metadata &&
                Object.keys(
                  selectedHistory.metadata
                ).length > 0 ? (
                  <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-green-300">
                    {JSON.stringify(
                      selectedHistory.metadata,
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <p className="mt-4 text-slate-500">
                    No additional metadata was
                    recorded.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-blue-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Audit Record ID
                </p>

                <p className="mt-2 break-all font-mono text-sm text-blue-800">
                  {selectedHistory.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
          </motion.main>
    </AdminLayout>
  );
}

export default Reports;