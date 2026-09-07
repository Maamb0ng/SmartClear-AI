import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";
import { supabase } from "../../services/supabase";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  FaClipboardCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaRobot,
  FaArrowRight,
  FaBell,
  FaBuilding,
  FaBook,
  FaUserGraduate,
  FaSyncAlt,
  FaHourglassHalf,
} from "react-icons/fa";

function StudentDashboard() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);

  const [clearanceRequest, setClearanceRequest] =
    useState(null);

  const [steps, setSteps] = useState([]);

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load student dashboard
  |--------------------------------------------------------------------------
  */

  const loadDashboard = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Load student profile
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
          semester,
          school_year,
          section_id,

          assigned_section:sections!users_section_id_fkey (
            id,
            course_id,
            course,
            year_level,
            block_code,
            school_year,
            semester,
            is_active,

            assigned_course:courses!sections_course_id_fkey (
              id,
              course_code,
              course_name,
              is_active
            )
          )
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (studentError) {
        throw studentError;
      }

      if (!studentData) {
        throw new Error(
          "Student profile was not found."
        );
      }

      if (studentData.role !== "Student") {
        throw new Error(
          "Only student accounts can access this dashboard."
        );
      }

      if (studentData.status !== "Active") {
        throw new Error(
          "Your student account is not currently active."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize student information
      |--------------------------------------------------------------------------
      | New section relationship is used first.
      | Old text fields remain as fallback.
      |--------------------------------------------------------------------------
      */

      const normalizedStudent = {
        ...studentData,

        display_course:
          studentData.assigned_section
            ?.assigned_course?.course_code ||
          studentData.assigned_section?.course ||
          studentData.course ||
          "",

        display_course_name:
          studentData.assigned_section
            ?.assigned_course?.course_name ||
          "",

        display_year_level:
          studentData.assigned_section
            ?.year_level ||
          studentData.year_level ||
          "",

        display_block:
          studentData.assigned_section
            ?.block_code ||
          studentData.section ||
          "",

        display_school_year:
          studentData.assigned_section
            ?.school_year ||
          studentData.school_year ||
          "",

        display_semester:
          studentData.assigned_section
            ?.semester ||
          studentData.semester ||
          "",

        section_is_active:
          studentData.assigned_section
            ?.is_active ?? null,

        course_is_active:
          studentData.assigned_section
            ?.assigned_course?.is_active ??
          null,
      };

      setStudent(normalizedStudent);

      /*
      |--------------------------------------------------------------------------
      | Load latest clearance request
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
          school_year,
          semester,
          status,
          remarks,
          requested_at,
          updated_at
        `)
        .eq("student_id", normalizedStudent.id)
        .order("requested_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (requestError) {
        throw requestError;
      }

      setClearanceRequest(requestData || null);

      /*
      |--------------------------------------------------------------------------
      | Load clearance steps
      |--------------------------------------------------------------------------
      */

      if (requestData) {
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

        if (stepError) {
          throw stepError;
        }

        setSteps(stepData || []);
      } else {
        setSteps([]);
      }

      /*
      |--------------------------------------------------------------------------
      | Load recent notifications
      |--------------------------------------------------------------------------
      */

      const {
        data: notificationData,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          title,
          message,
          type,
          is_read,
          created_at
        `)
        .eq("user_id", normalizedStudent.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

      if (notificationError) {
        console.error(
          "Notification loading error:",
          notificationError
        );

        setNotifications([]);
      } else {
        setNotifications(
          notificationData || []
        );
      }
    } catch (error) {
      console.error(
        "Student dashboard error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Unable to Load Dashboard",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
  |--------------------------------------------------------------------------
  | Clearance statistics
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
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

    const progress =
      total > 0
        ? Math.round(
            (approved / total) * 100
          )
        : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      progress,
    };
  }, [steps]);

  /*
  |--------------------------------------------------------------------------
  | Request state
  |--------------------------------------------------------------------------
  */

  const isWaitingForAdmin =
    clearanceRequest?.status === "Pending" &&
    steps.length === 0;

  const hasGeneratedSteps =
    steps.length > 0;

  /*
  |--------------------------------------------------------------------------
  | Unread notifications
  |--------------------------------------------------------------------------
  */

  const unreadNotificationCount =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !notification.is_read
      ).length;
    }, [notifications]);

  /*
  |--------------------------------------------------------------------------
  | Recent activities
  |--------------------------------------------------------------------------
  */

  const recentActivities = useMemo(() => {
    const stepActivities = steps
      .filter(
        (step) =>
          step.status !== "Pending" ||
          step.reviewed_at
      )
      .map((step) => {
        const assignmentName =
          step.offices?.office_name ||
          step.subjects?.subject_name ||
          "Clearance approver";

        let activity = `${assignmentName} is reviewing your clearance.`;

        if (step.status === "Approved") {
          activity = `${assignmentName} approved your clearance.`;
        }

        if (step.status === "Rejected") {
          activity = `${assignmentName} rejected your clearance.`;
        }

        return {
          id: `step-${step.id}`,
          activity,
          time:
            step.reviewed_at ||
            clearanceRequest?.updated_at,
          status: step.status,
        };
      });

    const requestActivities =
      clearanceRequest
        ? [
            {
              id: `request-${clearanceRequest.id}`,

              activity:
                clearanceRequest.status ===
                "Pending"
                  ? "Your clearance request was submitted and is waiting for administrator review."
                  : clearanceRequest.status ===
                    "In Progress"
                  ? "Your clearance request was accepted and processing has started."
                  : clearanceRequest.status ===
                    "Completed"
                  ? "Your clearance request was completed."
                  : clearanceRequest.status ===
                    "Rejected"
                  ? "Your clearance request was rejected."
                  : "Your clearance request was submitted successfully.",

              time:
                clearanceRequest.updated_at ||
                clearanceRequest.requested_at,

              status:
                clearanceRequest.status,
            },
          ]
        : [];

    return [
      ...stepActivities,
      ...requestActivities,
    ]
      .filter((activity) => activity.time)
      .sort(
        (firstActivity, secondActivity) =>
          new Date(secondActivity.time) -
          new Date(firstActivity.time)
      )
      .slice(0, 5);
  }, [steps, clearanceRequest]);

  /*
  |--------------------------------------------------------------------------
  | Refresh dashboard
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadDashboard();
    } catch (error) {
      console.error(
        "Refresh dashboard error:",
        error
      );

      setRefreshing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Mark notification as read
  |--------------------------------------------------------------------------
  */

  const markNotificationAsRead =
    async (notificationId) => {
      if (!student?.id) {
        return;
      }

      try {
        const { error } = await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("id", notificationId)
          .eq("user_id", student.id);

        if (error) {
          throw error;
        }

        setNotifications(
          (previousNotifications) =>
            previousNotifications.map(
              (notification) =>
                notification.id ===
                notificationId
                  ? {
                      ...notification,
                      is_read: true,
                    }
                  : notification
            )
        );
      } catch (error) {
        console.error(
          "Mark notification read error:",
          error
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Style helpers
  |--------------------------------------------------------------------------
  */

  const getActivityStatusClass = (
    status
  ) => {
    if (
      status === "Approved" ||
      status === "Completed"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    if (status === "In Progress") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const getNotificationTypeClass = (
    type
  ) => {
    if (type === "Success") {
      return "bg-green-100 text-green-700";
    }

    if (type === "Warning") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (type === "Error") {
      return "bg-red-100 text-red-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  /*
  |--------------------------------------------------------------------------
  | Formatting helpers
  |--------------------------------------------------------------------------
  */

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const getStepName = (step) => {
    return (
      step.offices?.office_name ||
      step.subjects?.subject_name ||
      "Unassigned Step"
    );
  };

  const getStepIcon = (step) => {
    if (step.subject_id) {
      return <FaBook />;
    }

    return <FaBuilding />;
  };

  /*
  |--------------------------------------------------------------------------
  | Loading screen
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading student dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative min-w-0 space-y-4 overflow-hidden pb-8 sm:space-y-6 sm:pb-10"
      >
        {/* Dark dashboard atmosphere */}

        <div className="pointer-events-none absolute -right-44 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -left-40 top-[32rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Hero */}

        <motion.section
          initial={{
            opacity: 0,
            y: -18,
            scale: 0.99,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#061b51] text-white shadow-[0_20px_45px_rgba(2,12,40,0.22)] sm:rounded-[1.75rem] sm:shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{
              backgroundImage: `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0c4a8a]/84" />

          <motion.div
            animate={{
              x: [0, 24, 0],
              y: [0, -12, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 p-4 sm:gap-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between xl:p-8">
            <div className="flex min-w-0 items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-md">
                  <FaUserGraduate className="text-cyan-300" />
                  Student Portal
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl xl:text-4xl">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                    {student?.full_name ||
                      "Student"}
                  </span>
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
                  Track your clearance progress, view recent decisions, and stay
                  updated with your assigned offices and faculty approvers.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-50/90">
                  <span className="max-w-full break-words rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                    {student?.student_id ||
                      "No Student ID"}
                  </span>

                  <span
                    title={
                      student?.display_course_name ||
                      ""
                    }
                    className="max-w-full break-words rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur"
                  >
                    {student?.display_course ||
                      "No Program Assigned"}
                  </span>

                  <span className="max-w-full break-words rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                    {student?.display_year_level ||
                      "No Year Level"}

                    {student?.display_block
                      ? ` • Block ${student.display_block}`
                      : ""}
                  </span>

                  {(student?.display_semester ||
                    student?.display_school_year) && (
                    <span className="max-w-full break-words rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                      {student?.display_semester ||
                        "No Semester"}

                      {student?.display_school_year
                        ? ` • S.Y. ${student.display_school_year}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{
                y: -2,
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.98,
              }}
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto xl:self-center"
            >
              <FaSyncAlt
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh Data"}
            </motion.button>
          </div>
        </motion.section>

        {/* Statistics */}

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[
            {
              title: "Pending",
              value: statistics.pending,
              icon: FaClock,
              description:
                "Awaiting action",
              tone:
                "from-amber-400/20 to-orange-400/5",
              iconClass:
                "bg-amber-400/15 text-amber-300",
            },
            {
              title: "Approved",
              value: statistics.approved,
              icon: FaCheckCircle,
              description:
                "Completed approvals",
              tone:
                "from-emerald-400/20 to-teal-400/5",
              iconClass:
                "bg-emerald-400/15 text-emerald-300",
            },
            {
              title: "Rejected",
              value: statistics.rejected,
              icon: FaTimesCircle,
              description:
                "Needs attention",
              tone:
                "from-rose-400/20 to-red-400/5",
              iconClass:
                "bg-rose-400/15 text-rose-300",
            },
            {
              title: "Total Steps",
              value: statistics.total,
              icon: FaClipboardCheck,
              description:
                "Clearance checkpoints",
              tone:
                "from-blue-400/20 to-cyan-400/5",
              iconClass:
                "bg-blue-400/15 text-cyan-300",
            },
          ].map(
            (
              statistic,
              index
            ) => {
              const Icon =
                statistic.icon;

              return (
                <motion.article
                  key={
                    statistic.title
                  }
                  initial={{
                    opacity: 0,
                    y: 18,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.08 +
                      index * 0.07,
                    duration: 0.45,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className={`relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] p-4 text-white shadow-[0_18px_38px_rgba(2,12,40,0.16)] sm:p-5`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${statistic.tone}`}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/65">
                        {
                          statistic.title
                        }
                      </p>

                      <p className="mt-3 text-2xl font-black sm:text-3xl">
                        {
                          statistic.value
                        }
                      </p>

                      <p className="mt-1 text-xs text-blue-100/60">
                        {
                          statistic.description
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${statistic.iconClass}`}
                    >
                      <Icon className="text-lg" />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* Main dashboard grid */}

        <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[1.65fr_0.75fr]">
          {/* Progress card */}

          <motion.article
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.18,
              duration: 0.5,
            }}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:rounded-[1.75rem]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                    Current Clearance
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                    Clearance Progress
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {clearanceRequest
                      ? `${clearanceRequest.semester} • ${clearanceRequest.school_year}`
                      : "No clearance request submitted yet."}
                  </p>
                </div>

                {clearanceRequest && (
                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${getActivityStatusClass(
                      clearanceRequest.status
                    )}`}
                  >
                    {
                      clearanceRequest.status
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {!clearanceRequest ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5 text-center sm:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <FaClipboardCheck className="text-2xl" />
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-900">
                    No Clearance Request
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Submit your clearance request to begin the approval process.
                  </p>

                  <motion.button
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    type="button"
                    onClick={() =>
                      navigate(
                        "/student/request-clearance"
                      )
                    }
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] sm:w-auto"
                  >
                    Request Clearance
                    <FaArrowRight />
                  </motion.button>
                </div>
              ) : isWaitingForAdmin ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{
                        rotate: [0, 8, -8, 0],
                      }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"
                    >
                      <FaHourglassHalf className="text-2xl" />
                    </motion.div>

                    <h3 className="mt-4 text-lg font-black text-slate-900">
                      Preparing Clearance Steps
                    </h3>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Your request was submitted successfully. The system is
                      waiting for the required subject and office clearance
                      steps to become available.
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      Submitted:{" "}
                      {formatDate(
                        clearanceRequest.requested_at
                      )}
                    </p>

                    {clearanceRequest.remarks && (
                      <div className="mt-4 w-full rounded-xl border border-amber-100 bg-white p-4 text-left">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Remarks
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {
                            clearanceRequest.remarks
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/student/clearance-status"
                      )
                    }
                    className="mx-auto mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-200 hover:text-amber-800 sm:w-auto sm:bg-transparent sm:px-0 sm:py-0"
                  >
                    View Request Details
                    <FaArrowRight />
                  </button>
                </div>
              ) : hasGeneratedSteps ? (
                <>
                  <div className="flex items-start justify-between gap-4 sm:items-end">
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        Overall Completion
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          statistics.approved
                        }{" "}
                        of{" "}
                        {
                          statistics.total
                        }{" "}
                        steps approved
                      </p>
                    </div>

                    <p className="shrink-0 text-2xl font-black text-[#082a70] sm:text-3xl">
                      {
                        statistics.progress
                      }
                      %
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{
                        width: 0,
                      }}
                      animate={{
                        width: `${statistics.progress}%`,
                      }}
                      transition={{
                        duration: 0.9,
                        delay: 0.2,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-400"
                    />
                  </div>

                  <div className="mt-4 flex flex-col justify-between gap-1 text-xs text-slate-500 sm:flex-row">
                    <p>
                      {
                        statistics.pending
                      }{" "}
                      pending •{" "}
                      {
                        statistics.rejected
                      }{" "}
                      rejected
                    </p>

                    <p>
                      Updated:{" "}
                      {formatDate(
                        clearanceRequest.updated_at
                      )}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {steps
                      .slice(0, 6)
                      .map(
                        (
                          step,
                          index
                        ) => (
                          <motion.div
                            key={
                              step.id
                            }
                            initial={{
                              opacity: 0,
                              y: 10,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay:
                                0.1 +
                                index *
                                  0.05,
                            }}
                            whileHover={{
                              y: -2,
                            }}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                {
                                  getStepIcon(
                                    step
                                  )
                                }
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {
                                    getStepName(
                                      step
                                    )
                                  }
                                </p>

                                <p className="text-[11px] text-slate-500">
                                  {step.subject_id
                                    ? "Subject"
                                    : "Office"}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${getActivityStatusClass(
                                step.status
                              )}`}
                            >
                              {
                                step.status
                              }
                            </span>
                          </motion.div>
                        )
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/student/clearance-status"
                      )
                    }
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 hover:text-blue-800 sm:w-auto sm:bg-transparent sm:px-0 sm:py-0"
                  >
                    View Complete Status
                    <FaArrowRight />
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                    <FaClipboardCheck className="text-2xl" />
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-900">
                    No Clearance Steps Available
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    This request currently has no generated subject or office
                    approval steps.
                  </p>

                  {clearanceRequest.remarks && (
                    <p className="mt-3 text-sm text-slate-600">
                      Remarks:{" "}
                      {
                        clearanceRequest.remarks
                      }
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/student/clearance-status"
                      )
                    }
                    className="mt-5 text-sm font-bold text-blue-700 hover:text-blue-800"
                  >
                    View Request Details
                  </button>
                </div>
              )}
            </div>
          </motion.article>

          {/* AI assistant card */}

          <motion.article
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.24,
              duration: 0.5,
            }}
            whileHover={{
              y: -4,
            }}
            className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#061b51] via-[#082a70] to-[#0b4f92] p-5 text-white shadow-[0_20px_50px_rgba(2,12,40,0.22)] sm:rounded-[1.75rem] sm:p-6"
          >
            <motion.div
              animate={{
                x: [0, 18, 0],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl"
            />

            <div className="relative z-10 flex h-full flex-col">
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-300 backdrop-blur"
              >
                <FaRobot className="text-3xl" />
              </motion.div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                SmartClear AI
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Student Assistant
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-100/80">
                Ask about your clearance status, pending requirements, assigned
                subjects, offices, and school procedures.
              </p>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                type="button"
                onClick={() =>
                  navigate(
                    "/student/assistant"
                  )
                }
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#082a70] shadow-lg transition xl:mt-auto"
              >
                Open Assistant
                <FaArrowRight />
              </motion.button>
            </div>
          </motion.article>
        </section>

        {/* Activity and notifications */}

        <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          {/* Recent activities */}

          <motion.article
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.3,
              duration: 0.5,
            }}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem]"
          >
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Timeline
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Recent Activities
              </h2>
            </div>

            <div className="p-4 sm:p-6">
              {recentActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No clearance activities yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map(
                    (
                      activity,
                      index
                    ) => (
                      <motion.div
                        key={
                          activity.id
                        }
                        initial={{
                          opacity: 0,
                          x: -12,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay:
                            0.34 +
                            index *
                              0.05,
                        }}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />

                          <div>
                            <h3 className="text-sm font-bold text-slate-800">
                              {
                                activity.activity
                              }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(
                                activity.time
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${getActivityStatusClass(
                            activity.status
                          )}`}
                        >
                          {
                            activity.status
                          }
                        </span>
                      </motion.div>
                    )
                  )}
                </div>
              )}
            </div>
          </motion.article>

          {/* Notifications */}

          <motion.article
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.34,
              duration: 0.5,
            }}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  Updates
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Notifications
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    unreadNotificationCount
                  }{" "}
                  unread
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                <FaBell />
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">
                  No notifications yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(
                    (
                      notification,
                      index
                    ) => (
                      <motion.button
                        key={
                          notification.id
                        }
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay:
                            0.38 +
                            index *
                              0.05,
                        }}
                        whileHover={{
                          y: -2,
                        }}
                        type="button"
                        onClick={() =>
                          markNotificationAsRead(
                            notification.id
                          )
                        }
                        className={`w-full rounded-xl border p-3.5 text-left transition ${
                          notification.is_read
                            ? "border-slate-200 bg-slate-50/60"
                            : "border-blue-200 bg-blue-50/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="line-clamp-1 text-sm font-bold text-slate-800">
                            {
                              notification.title
                            }
                          </h3>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${getNotificationTypeClass(
                              notification.type
                            )}`}
                          >
                            {
                              notification.type
                            }
                          </span>
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">
                          {
                            notification.message
                          }
                        </p>

                        <p className="mt-2 text-[10px] text-slate-400">
                          {formatDate(
                            notification.created_at
                          )}
                        </p>
                      </motion.button>
                    )
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/student/notifications"
                  )
                }
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071b4b] text-sm font-bold text-white transition hover:bg-[#0a2a70]"
              >
                View All Notifications
                <FaArrowRight />
              </button>
            </div>
          </motion.article>
        </section>
      </motion.main>
    </DashboardLayout>
  );
}

export default StudentDashboard;