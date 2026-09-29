import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import GuidanceLayout from "../../layouts/GuidanceLayout";
import { supabase } from "../../services/supabase";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaHandsHelping,
  FaSyncAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

const GUIDANCE_OFFICE_CODE = "GUI";

const normalizeStatus = (value) =>
  String(value || "").trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(
    String(value).length === 10
      ? `${value}T00:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";

  const [hours, minutes] = String(value)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getBatchStatusStyle = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "open") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "completed") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized === "closed") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (normalized === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

function GuidanceDashboard() {
  const navigate = useNavigate();

  const [counselor, setCounselor] =
    useState(null);

  const [guidanceOffice, setGuidanceOffice] =
    useState(null);

  const [batches, setBatches] =
    useState([]);

  const [batchStudents, setBatchStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadDashboard = useCallback(
    async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authUser) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("users")
          .select(`
            id,
            auth_id,
            full_name,
            employee_id,
            email,
            role,
            status
          `)
          .eq("auth_id", authUser.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (
          profile.role !== "Approver" ||
          profile.status !== "Active"
        ) {
          throw new Error(
            "This portal is only available to an active Guidance Office account."
          );
        }

        const {
          data: officeAssignments,
          error: assignmentError,
        } = await supabase
          .from("approver_assignments")
          .select(`
            id,
            approver_id,
            office_id,
            is_active,
            offices (
              id,
              office_name,
              office_code,
              is_active
            )
          `)
          .eq("approver_id", profile.id)
          .eq("is_active", true)
          .not("office_id", "is", null);

        if (assignmentError) {
          throw assignmentError;
        }

        const guidanceAssignment = (
          officeAssignments || []
        ).find((assignment) => {
          const office = assignment.offices;

          const code = String(
            office?.office_code || ""
          )
            .trim()
            .toUpperCase();

          const name = String(
            office?.office_name || ""
          )
            .trim()
            .toLowerCase();

          return (
            office?.is_active !== false &&
            (code === GUIDANCE_OFFICE_CODE ||
              name.includes("guidance"))
          );
        });

        if (!guidanceAssignment?.offices) {
          throw new Error(
            "This account is not assigned to the Guidance Office."
          );
        }

        const office =
          guidanceAssignment.offices;

        setCounselor(profile);
        setGuidanceOffice(office);

        const {
          data: batchRows,
          error: batchError,
        } = await supabase
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
          .eq("office_id", office.id)
          .order("schedule_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          });

        if (batchError) throw batchError;

        const safeBatches = batchRows || [];
        setBatches(safeBatches);

        if (safeBatches.length === 0) {
          setBatchStudents([]);
          return;
        }

        const batchIds = safeBatches.map(
          (batch) => batch.id
        );

        const {
          data: assignmentRows,
          error: queueError,
        } = await supabase
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
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
          `)
          .in("batch_id", batchIds)
          .order("updated_at", {
            ascending: false,
          });

        if (queueError) throw queueError;

        const safeAssignments =
          assignmentRows || [];

        if (safeAssignments.length === 0) {
          setBatchStudents([]);
          return;
        }

        const studentIds = [
          ...new Set(
            safeAssignments
              .map((item) => item.student_id)
              .filter(Boolean)
          ),
        ];

        let students = [];

        if (studentIds.length > 0) {
          const {
            data: studentRows,
            error: studentError,
          } = await supabase
            .from("users")
            .select(`
              id,
              student_id,
              full_name,
              email,
              course,
              year_level,
              block,
              section,
              section_id,
              semester,
              school_year
            `)
            .in("id", studentIds);

          if (studentError) {
            throw studentError;
          }

          students = studentRows || [];
        }

        const studentMap = new Map(
          students.map((student) => [
            student.id,
            student,
          ])
        );

        const batchMap = new Map(
          safeBatches.map((batch) => [
            batch.id,
            batch,
          ])
        );

        setBatchStudents(
          safeAssignments.map((item) => ({
            ...item,
            student:
              studentMap.get(item.student_id) ||
              null,
            batch:
              batchMap.get(item.batch_id) ||
              null,
          }))
        );
      } catch (error) {
        console.error(
          "Guidance overview error:",
          error
        );

        setBatches([]);
        setBatchStudents([]);

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Guidance Overview",
          text:
            error?.message ||
            "An unexpected error occurred.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statistics = useMemo(() => {
    const waitingForReview =
      batchStudents.filter((item) =>
        ["for review", "answered"].includes(
          normalizeStatus(
            item.guidance_status
          )
        )
      ).length;

    const needsFollowUp =
      batchStudents.filter(
        (item) =>
          normalizeStatus(
            item.guidance_status
          ) === "needs follow-up"
      ).length;

    const cleared =
      batchStudents.filter(
        (item) =>
          normalizeStatus(
            item.guidance_status
          ) === "approved"
      ).length;

    const scheduled =
      batchStudents.filter(
        (item) =>
          normalizeStatus(
            item.guidance_status
          ) === "scheduled"
      ).length;

    return {
      waitingForReview,
      needsFollowUp,
      cleared,
      scheduled,
    };
  }, [batchStudents]);

  const openBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          normalizeStatus(batch.status) ===
          "open"
      ),
    [batches]
  );

  const upcomingBatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return batches
      .filter((batch) => {
        if (
          ["completed", "cancelled"].includes(
            normalizeStatus(batch.status)
          )
        ) {
          return false;
        }

        if (!batch.schedule_date) {
          return true;
        }

        const schedule = new Date(
          `${batch.schedule_date}T00:00:00`
        );

        return (
          !Number.isNaN(
            schedule.getTime()
          ) && schedule >= today
        );
      })
      .slice(0, 4);
  }, [batches]);

  const needsAttention = useMemo(
    () =>
      batchStudents
        .filter((item) =>
          [
            "for review",
            "answered",
            "needs follow-up",
          ].includes(
            normalizeStatus(
              item.guidance_status
            )
          )
        )
        .slice(0, 5),
    [batchStudents]
  );

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading Guidance Overview...
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  return (
    <GuidanceLayout>
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-6"
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
                  <FaHandsHelping />
                  <span>
                    {guidanceOffice
                      ?.office_name ||
                      "Guidance Office"}
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Guidance Overview
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Welcome,{" "}
                  <span className="font-semibold text-slate-700">
                    {counselor
                      ?.full_name ||
                      "Guidance Counselor"}
                  </span>
                  . View the current Guidance
                  clearance workload, schedules,
                  and students that need attention.
                </p>
              </div>

              <button
                type="button"
                disabled={refreshing}
                onClick={() =>
                  loadDashboard(true)
                }
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
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
                  : "Refresh"}
              </button>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="For Review"
              value={
                statistics.waitingForReview
              }
              description="Responses waiting for Guidance review"
              icon={FaClipboardList}
              iconClass="bg-blue-50 text-blue-600"
              onClick={() =>
                navigate(
                  "/guidance/requirements"
                )
              }
            />

            <StatCard
              title="Scheduled"
              value={statistics.scheduled}
              description="Students assigned to Guidance batches"
              icon={FaCalendarAlt}
              iconClass="bg-amber-50 text-amber-600"
              onClick={() =>
                navigate(
                  "/guidance/pending"
                )
              }
            />

            <StatCard
              title="Needs Follow-up"
              value={
                statistics.needsFollowUp
              }
              description="Students requiring another response"
              icon={
                FaExclamationTriangle
              }
              iconClass="bg-red-50 text-red-600"
              onClick={() =>
                navigate(
                  "/guidance/returned"
                )
              }
            />

            <StatCard
              title="Cleared"
              value={statistics.cleared}
              description="Individually approved by Guidance"
              icon={FaCheckCircle}
              iconClass="bg-emerald-50 text-emerald-600"
              onClick={() =>
                navigate(
                  "/guidance/cleared"
                )
              }
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
            <motion.section
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.08,
              }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Schedule & Batches
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Upcoming and active Guidance
                    sessions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/guidance/pending"
                    )
                  }
                  className="shrink-0 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Manage
                </button>
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-blue-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <FaClock />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Open Batches
                    </p>

                    <p className="text-xl font-bold text-slate-900">
                      {openBatches.length}
                    </p>
                  </div>
                </div>

                {upcomingBatches.length ===
                0 ? (
                  <EmptyState
                    icon={FaCalendarAlt}
                    title="No Upcoming Batches"
                    description="Create a Guidance batch when you are ready to schedule students."
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingBatches.map(
                      (batch) => (
                        <button
                          key={batch.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              "/guidance/pending"
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {
                                  batch.batch_name
                                }
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {formatDate(
                                  batch.schedule_date
                                )}
                                {batch.start_time
                                  ? ` • ${formatTime(
                                      batch.start_time
                                    )}`
                                  : ""}
                                {batch.end_time
                                  ? ` – ${formatTime(
                                      batch.end_time
                                    )}`
                                  : ""}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {batch.semester} •{" "}
                                {batch.school_year}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getBatchStatusStyle(
                                batch.status
                              )}`}
                            >
                              {batch.status}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.12,
              }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Needs Attention
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Preview of students waiting for
                    review or follow-up.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/guidance/requirements"
                    )
                  }
                  className="shrink-0 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Open Queue
                </button>
              </div>

              {needsAttention.length ===
              0 ? (
                <div className="p-5 sm:p-6">
                  <EmptyState
                    icon={FaCheckCircle}
                    title="Queue is Clear"
                    description="There are no Guidance responses requiring attention right now."
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {needsAttention.map(
                    (item) => (
                      <AttentionRow
                        key={item.id}
                        item={item}
                        onOpen={() =>
                          navigate(
                            "/guidance/requirements"
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </motion.section>
          </div>

          <motion.section
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.16,
            }}
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600">
                  <FaUsers />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Student Queue
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    The full student list and
                    clearance actions are kept in
                    one workspace instead of
                    duplicating the queue on the
                    Overview page.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/guidance/requirements"
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                <FaUserGraduate />
                Open Student Queue
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </GuidanceLayout>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  onClick,
}) {
  return (
    <motion.button
      type="button"
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.2,
      }}
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${iconClass}`}
        >
          <Icon />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </motion.button>
  );
}

function AttentionRow({
  item,
  onOpen,
}) {
  const needsFollowUp =
    normalizeStatus(
      item.guidance_status
    ) === "needs follow-up";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 sm:px-6"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          needsFollowUp
            ? "bg-red-50 text-red-600"
            : "bg-blue-50 text-blue-600"
        }`}
      >
        {needsFollowUp ? (
          <FaExclamationTriangle />
        ) : (
          <FaUserGraduate />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">
          {item.student?.full_name ||
            "Unknown Student"}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-500">
          {item.student?.student_id ||
            "No Student ID"}
          {item.batch?.batch_name
            ? ` • ${item.batch.batch_name}`
            : ""}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold sm:text-xs ${
          needsFollowUp
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
        }`}
      >
        {needsFollowUp
          ? "Follow-up"
          : "For Review"}
      </span>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-slate-400 shadow-sm">
        <Icon />
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default GuidanceDashboard;
