import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaClock,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUserClock,
  FaUsers,
  FaWallet,
  FaArrowRight,
} from "react-icons/fa";

import TreasurerLayout from "../../layouts/TreasurerLayout";
import {
  getCurrentTreasurer,
  getTreasurerEligibleStudents,
  getTreasurerBatches,
  getTreasurerBatchStudents,
} from "../../services/treasurerService";

const formatDate = (value) => {
  if (!value) return "No date";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "N/A";

  const parts = String(value).split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || 0);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "₱0.00";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const statusTone = (status) => {
  switch (status) {
    case "Cleared":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "With Balance":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Needs Action":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "For Review":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Scheduled":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
};

const batchTone = (status) => {
  switch (status) {
    case "Open":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Completed":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "Closed":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
};

const getBatchDateTime = (batch) => {
  if (!batch?.schedule_date) return null;

  const time = batch.start_time || "00:00:00";
  const value = new Date(`${batch.schedule_date}T${time}`);

  return Number.isNaN(value.getTime()) ? null : value;
};

function TreasurerDashboard() {
  const navigate = useNavigate();

  const [treasurer, setTreasurer] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const [currentTreasurer, eligible, batchRows] = await Promise.all([
          getCurrentTreasurer(),
          getTreasurerEligibleStudents(),
          getTreasurerBatches(),
        ]);

        const safeBatches = Array.isArray(batchRows) ? batchRows : [];

        const studentGroups = await Promise.all(
          safeBatches.map(async (batch) => {
            const students = await getTreasurerBatchStudents(batch.id);

            return (Array.isArray(students) ? students : []).map((student) => ({
              ...student,
              batch,
            }));
          })
        );

        setTreasurer(currentTreasurer || null);
        setEligibleStudents(Array.isArray(eligible) ? eligible : []);
        setBatches(safeBatches);
        setBatchStudents(studentGroups.flat());
      } catch (error) {
        console.error("Treasurer dashboard load error:", error);

        await Swal.fire({
          icon: "error",
          title: "Unable to Load Dashboard",
          text:
            error?.message ||
            "Something went wrong while loading the Treasurer dashboard.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const count = (status) =>
      batchStudents.filter((item) => item.financial_status === status).length;

    return {
      unscheduled: eligibleStudents.length,
      scheduled: count("Scheduled"),
      forReview: count("For Review"),
      cleared: count("Cleared"),
      withBalance: count("With Balance"),
      needsAction: count("Needs Action"),
    };
  }, [eligibleStudents, batchStudents]);

  const todayKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const todayStudents = useMemo(
    () =>
      batchStudents
        .filter(
          (item) =>
            item.batch?.schedule_date === todayKey &&
            !["Cleared", "With Balance", "Needs Action"].includes(
              item.financial_status
            )
        )
        .sort((a, b) =>
          String(a.users?.full_name || "").localeCompare(
            String(b.users?.full_name || "")
          )
        ),
    [batchStudents, todayKey]
  );

  const upcomingBatches = useMemo(() => {
    const now = new Date();

    return batches
      .filter((batch) => {
        if (["Completed", "Cancelled"].includes(batch.status)) return false;

        const date = getBatchDateTime(batch);
        if (!date) return false;

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return endOfDay >= now;
      })
      .sort((a, b) => {
        const first = getBatchDateTime(a)?.getTime() || 0;
        const second = getBatchDateTime(b)?.getTime() || 0;
        return first - second;
      })
      .slice(0, 5);
  }, [batches]);

  const recentReviewed = useMemo(
    () =>
      batchStudents
        .filter((item) =>
          ["Cleared", "With Balance", "Needs Action"].includes(
            item.financial_status
          )
        )
        .sort((a, b) => {
          const first = new Date(a.reviewed_at || a.updated_at || 0).getTime();
          const second = new Date(b.reviewed_at || b.updated_at || 0).getTime();
          return second - first;
        })
        .slice(0, 5),
    [batchStudents]
  );

  const cards = [
    {
      label: "Unscheduled",
      value: summary.unscheduled,
      icon: <FaUserClock />,
      tone: "bg-slate-50 text-slate-700 ring-slate-200",
    },
    {
      label: "Scheduled",
      value: summary.scheduled,
      icon: <FaCalendarAlt />,
      tone: "bg-violet-50 text-violet-700 ring-violet-200",
    },
    {
      label: "For Review",
      value: summary.forReview,
      icon: <FaClipboardCheck />,
      tone: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    {
      label: "Cleared",
      value: summary.cleared,
      icon: <FaCheckCircle />,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    {
      label: "With Balance",
      value: summary.withBalance,
      icon: <FaWallet />,
      tone: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    {
      label: "Needs Action",
      value: summary.needsAction,
      icon: <FaExclamationTriangle />,
      tone: "bg-rose-50 text-rose-700 ring-rose-200",
    },
  ];

  if (loading) {
    return (
      <TreasurerLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="mt-4 font-semibold text-slate-600">
              Loading Treasurer Dashboard...
            </p>
          </div>
        </div>
      </TreasurerLayout>
    );
  }

  return (
    <TreasurerLayout>
      <div className="space-y-5 pt-10 md:pt-12">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg"
        >
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  <FaClipboardCheck />
                  Treasurer Workspace
                </div>

                <h1 className="text-2xl font-black md:text-3xl">
                  Financial Clearance Overview
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Welcome, {treasurer?.full_name || "Treasurer"}. Schedule
                  students for face-to-face verification, review their official
                  school financial record, and record the individual clearance
                  result.
                </p>

                <p className="mt-3 max-w-2xl text-xs font-semibold leading-5 text-slate-400">
                  SmartClear does not accept online payments. Financial
                  verification is completed by the Treasurer using the school's
                  official records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/treasurer/schedule")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <FaCalendarAlt />
                  Schedule & Batches
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/treasurer/review")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  <FaClipboardCheck />
                  Student Review
                </button>

                <button
                  type="button"
                  onClick={() => loadDashboard(false)}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {item.value}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-inset ${item.tone}`}
                >
                  {item.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Today's Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Students scheduled for face-to-face Treasurer verification.
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                {todayStudents.length} student
                {todayStudents.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="p-5 md:p-6">
              {todayStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />
                  <h3 className="mt-4 font-black text-slate-800">
                    No Students Scheduled Today
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Create or manage Treasurer batches from Schedule & Batches.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayStudents.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                          {item.users?.full_name || "Student"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.users?.student_id || "No Student ID"}
                          {" • "}
                          {item.users?.course || "N/A"}
                          {item.users?.year_level
                            ? ` • Year ${item.users.year_level}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.batch?.batch_name || "Treasurer Batch"}
                          {" • "}
                          {formatTime(item.batch?.start_time)} –{" "}
                          {formatTime(item.batch?.end_time)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${statusTone(
                          item.financial_status
                        )}`}
                      >
                        {item.financial_status || "Scheduled"}
                      </span>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => navigate("/treasurer/review")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    Open Student Review
                    <FaArrowRight />
                  </button>
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Upcoming Batches
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Next Treasurer schedules.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/treasurer/schedule")}
                className="text-sm font-black text-emerald-700 hover:text-emerald-800"
              >
                Manage
              </button>
            </div>

            <div className="p-5 md:p-6">
              {upcomingBatches.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center">
                  <FaClock className="mx-auto text-3xl text-slate-300" />
                  <p className="mt-3 font-black text-slate-700">
                    No upcoming batches
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Schedule students when the Treasurer is available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-900">
                            {batch.batch_name}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {formatDate(batch.schedule_date)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatTime(batch.start_time)} –{" "}
                            {formatTime(batch.end_time)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${batchTone(
                            batch.status
                          )}`}
                        >
                          {batch.status || "Draft"}
                        </span>
                      </div>

                      {batch.student_note && (
                        <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                          {batch.student_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Recent Reviews
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest individual face-to-face financial clearance results.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/treasurer/reviewed")}
              className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 hover:text-emerald-800"
            >
              View Reviewed Students
              <FaArrowRight />
            </button>
          </div>

          <div className="p-5 md:p-6">
            {recentReviewed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <FaUsers className="mx-auto text-4xl text-slate-300" />
                <h3 className="mt-4 font-black text-slate-800">
                  No Reviewed Students Yet
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Reviewed students will appear here after Treasurer
                  verification.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {recentReviewed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                          {item.users?.full_name || "Student"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.users?.student_id || "No Student ID"}
                          {" • "}
                          {item.users?.course || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.batch?.batch_name || "Treasurer Batch"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${statusTone(
                          item.financial_status
                        )}`}
                      >
                        {item.financial_status}
                      </span>
                    </div>

                    {item.financial_status === "With Balance" &&
                      Number(item.balance_amount) > 0 && (
                        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">
                          Outstanding balance:{" "}
                          {formatCurrency(item.balance_amount)}
                        </div>
                      )}

                    {item.treasurer_remarks && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {item.treasurer_remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </TreasurerLayout>
  );
}

export default TreasurerDashboard;
