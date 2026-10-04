import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  FaArrowRight,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaClipboardList,
  FaClock,
  FaExclamationCircle,
  FaLayerGroup,
  FaPlus,
  FaRedo,
  FaSpinner,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

import {
  getOfficeStaffContext,
  getOfficeStudentQueue,
  getOfficeReviewedStudents,
  getOfficeRequirements,
  getOfficeBatches,
} from "../../services/officeStaffService";

function OfficeDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [context, setContext] = useState(null);
  const [queue, setQueue] = useState([]);
  const [reviewedStudents, setReviewedStudents] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [batches, setBatches] = useState([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        contextData,
        queueData,
        reviewedData,
        requirementsData,
        batchesData,
      ] = await Promise.all([
        getOfficeStaffContext(),
        getOfficeStudentQueue(),
        getOfficeReviewedStudents(),
        getOfficeRequirements(),
        getOfficeBatches(),
      ]);

      setContext(contextData || null);

      setQueue(
        Array.isArray(queueData)
          ? queueData
          : queueData?.students || queueData?.queue || []
      );

      setReviewedStudents(
        Array.isArray(reviewedData)
          ? reviewedData
          : reviewedData?.students ||
            reviewedData?.reviewedStudents ||
            reviewedData?.reviewed ||
            []
      );

      setRequirements(
        Array.isArray(requirementsData)
          ? requirementsData
          : requirementsData?.requirements || []
      );

      setBatches(
        Array.isArray(batchesData)
          ? batchesData
          : batchesData?.batches || []
      );
    } catch (err) {
      console.error(
        "Failed to load Office Staff dashboard:",
        err
      );

      setError(
        err?.message ||
          "Unable to load the Office Staff dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const office =
    context?.office ||
    context?.offices?.[0] ||
    null;

  const profile =
    context?.profile ||
    null;

  const officeName =
    office?.office_name ||
    office?.name ||
    "Office";

  const officeCode =
    office?.office_code ||
    office?.code ||
    "OFFICE";

  const staffName =
    profile?.full_name ||
    "Office Staff";

  const activeRequirements =
    useMemo(
      () =>
        requirements.filter(
          (requirement) =>
            requirement.is_active !== false
        ),
      [requirements]
    );

  const assignedStepIds =
    useMemo(() => {
      const ids = new Set();

      batches.forEach((batch) => {
        const students =
          batch.students ||
          batch.batchStudents ||
          batch.assignedStudents ||
          [];

        if (Array.isArray(students)) {
          students.forEach((student) => {
            const stepId =
              student.clearance_step_id ||
              student.stepId ||
              student.step_id;

            if (stepId) {
              ids.add(stepId);
            }
          });
        }
      });

      return ids;
    }, [batches]);

  const scheduledCount =
    useMemo(() => {
      const directTotal = batches.reduce(
        (total, batch) =>
          total +
          Number(
            batch.assignedCount ??
              batch.assigned_count ??
              batch.studentCount ??
              batch.students_count ??
              0
          ),
        0
      );

      return Math.max(
        directTotal,
        assignedStepIds.size
      );
    }, [batches, assignedStepIds]);

  const needsActionCount =
    useMemo(
      () =>
        queue.filter((student) => {
          const status = String(
            student.displayStatus ||
              student.clearanceStatus ||
              student.status ||
              ""
          ).toLowerCase();

          return (
            status === "needs action" ||
            status === "rejected"
          );
        }).length,
      [queue]
    );

  const waitingForScheduleCount =
    useMemo(
      () =>
        queue.filter((student) => {
          const status = String(
            student.displayStatus ||
              student.clearanceStatus ||
              student.status ||
              ""
          ).toLowerCase();

          const stepId =
            student.stepId ||
            student.clearance_step_id ||
            student.step_id ||
            student.id;

          const alreadyScheduled =
            student.batchId ||
            student.batch_id ||
            student.isScheduled === true ||
            assignedStepIds.has(stepId);

          return (
            !alreadyScheduled &&
            status !== "approved"
          );
        }).length,
      [queue, assignedStepIds]
    );

  const approvedCount =
    useMemo(
      () =>
        reviewedStudents.filter(
          (student) =>
            String(
              student.displayStatus ||
                student.clearanceStatus ||
                student.status ||
                ""
            ).toLowerCase() === "approved"
        ).length,
      [reviewedStudents]
    );

  const stats = [
    {
      label: "Waiting for Schedule",
      value: waitingForScheduleCount,
      helper:
        "Students not yet assigned to a batch",
      icon: FaUserClock,
      iconClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      link: "/office/students",
    },
    {
      label: "Scheduled",
      value: scheduledCount,
      helper:
        "Students currently assigned to batches",
      icon: FaCalendarAlt,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      link: "/office/schedule",
    },
    {
      label: "Needs Action",
      value: needsActionCount,
      helper:
        "Students with unresolved requirements",
      icon: FaExclamationCircle,
      iconClass:
        "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      link: "/office/students",
    },
    {
      label: "Approved",
      value: approvedCount,
      helper:
        "Students cleared by this office",
      icon: FaCheckCircle,
      iconClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      link: "/office/reviewed",
    },
  ];

  const todayKey = getLocalDateKey(
    new Date()
  );

  const todayBatches =
    useMemo(
      () =>
        batches
          .filter((batch) => {
            const date =
              batch.schedule_date ||
              batch.scheduleDate ||
              batch.date;

            return date === todayKey;
          })
          .sort(compareBatchDateTime),
      [batches, todayKey]
    );

  const upcomingBatches =
    useMemo(
      () =>
        batches
          .filter((batch) => {
            const date =
              batch.schedule_date ||
              batch.scheduleDate ||
              batch.date;

            return (
              date &&
              date > todayKey &&
              String(
                batch.status || ""
              ).toLowerCase() !==
                "cancelled"
            );
          })
          .sort(compareBatchDateTime)
          .slice(0, 3),
      [batches, todayKey]
    );

  const recentReviews =
    useMemo(
      () =>
        [...reviewedStudents]
          .sort((a, b) => {
            const aDate = new Date(
              a.reviewed_at ||
                a.reviewedAt ||
                a.updated_at ||
                0
            ).getTime();

            const bDate = new Date(
              b.reviewed_at ||
                b.reviewedAt ||
                b.updated_at ||
                0
            ).getTime();

            return bDate - aDate;
          })
          .slice(0, 4),
      [reviewedStudents]
    );

  const getReviewStatusClass = (
    status
  ) => {
    const normalized = String(
      status || ""
    ).toLowerCase();

    if (normalized === "approved") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (
      normalized === "needs action" ||
      normalized === "rejected"
    ) {
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  if (loading) {
    return (
      <OfficeStaffLayout>
        <div className="mx-auto flex min-h-[65vh] w-full max-w-[1600px] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-3xl text-blue-600 dark:text-blue-400" />

            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200">
              Loading Office Dashboard
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Retrieving your office clearance data.
            </p>
          </div>
        </div>
      </OfficeStaffLayout>
    );
  }

  if (error) {
    return (
      <OfficeStaffLayout>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900">
            <FaExclamationCircle className="mx-auto text-3xl text-red-500" />

            <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              Unable to Load Dashboard
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <FaRedo />
              Try Again
            </button>
          </div>
        </div>
      </OfficeStaffLayout>
    );
  }

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative overflow-hidden px-5 py-6 sm:px-6 lg:px-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl dark:bg-emerald-500/10" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-lg dark:bg-blue-600">
                  <FaBuilding />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {officeCode}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Active Office
                    </span>
                  </div>

                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {officeName} Clearance
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    Welcome, {staffName}. Manage {officeName} clearance schedules, requirements, and student reviews.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/office/schedule"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FaCalendarAlt />
                  Manage Schedule
                </Link>

                <Link
                  to="/office/students"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  <FaUsers />
                  Review Students
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.label}
                to={stat.link}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                  >
                    <Icon />
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    {stat.helper}
                  </p>

                  <FaArrowRight className="shrink-0 text-xs text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />

                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Today's Schedule
                  </h2>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Clearance batches scheduled for today.
                </p>
              </div>

              <Link
                to="/office/schedule"
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
              >
                View Schedule
                <FaArrowRight />
              </Link>
            </div>

            <div className="space-y-3 p-5">
              {todayBatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                  <FaCalendarAlt className="mx-auto mb-3 text-2xl text-slate-300" />

                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No batches scheduled today
                  </p>
                </div>
              ) : (
                todayBatches.map((batch) => {
                  const students = Number(
                    batch.assignedCount ??
                      batch.assigned_count ??
                      batch.studentCount ??
                      batch.students_count ??
                      0
                  );

                  const reviewed = Number(
                    batch.reviewedCount ??
                      batch.reviewed_count ??
                      0
                  );

                  const progress =
                    students > 0
                      ? Math.round(
                          (reviewed / students) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={batch.id}
                      className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-800 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                              {getBatchName(
                                batch
                              )}
                            </h3>

                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              {batch.status ||
                                "Open"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <FaClock />
                              {formatBatchTime(
                                batch
                              )}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <FaUsers />
                              {students} students
                            </span>
                          </div>
                        </div>

                        <Link
                          to="/office/schedule"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
                        >
                          Open Batch
                          <FaArrowRight />
                        </Link>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">
                            Review Progress
                          </span>

                          <span className="text-slate-700 dark:text-slate-300">
                            {reviewed}/{students}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Quick Actions
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Common office clearance tasks.
              </p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-1">
              <QuickAction
                to="/office/schedule"
                icon={FaPlus}
                title="Create Batch"
                description="Set a new clearance schedule."
                tone="blue"
              />

              <QuickAction
                to="/office/requirements"
                icon={FaClipboardList}
                title="Requirements"
                description="Manage office checks and questions."
                tone="violet"
              />

              <QuickAction
                to="/office/students"
                icon={FaUsers}
                title="Student Queue"
                description="Review pending students."
                tone="amber"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Upcoming Batches
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Next clearance schedules.
                </p>
              </div>

              <FaLayerGroup className="text-slate-300 dark:text-slate-600" />
            </div>

            <div className="space-y-3 p-5">
              {upcomingBatches.length ===
              0 ? (
                <EmptyState
                  icon={FaCalendarAlt}
                  title="No upcoming batches"
                  description="Future office schedules will appear here."
                />
              ) : (
                upcomingBatches.map(
                  (batch) => (
                    <div
                      key={batch.id}
                      className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"
                    >
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {getBatchName(
                          batch
                        )}
                      </p>

                      <div className="mt-2 space-y-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-2">
                          <FaCalendarAlt />
                          {formatDate(
                            batch.schedule_date ||
                              batch.scheduleDate ||
                              batch.date
                          )}
                        </p>

                        <p className="flex items-center gap-2">
                          <FaClock />
                          {formatBatchTime(
                            batch
                          )}
                        </p>

                        <p className="flex items-center gap-2">
                          <FaUsers />
                          {Number(
                            batch.assignedCount ??
                              batch.assigned_count ??
                              batch.studentCount ??
                              batch.students_count ??
                              0
                          )}{" "}
                          students
                        </p>
                      </div>
                    </div>
                  )
                )
              )}

              <Link
                to="/office/schedule"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Manage All Batches
                <FaArrowRight />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Office Requirements
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Active requirements and questions.
                </p>
              </div>

              <FaClipboardCheck className="text-slate-300 dark:text-slate-600" />
            </div>

            <div className="space-y-3 p-5">
              {activeRequirements.length ===
              0 ? (
                <EmptyState
                  icon={FaClipboardList}
                  title="No active requirements"
                  description="Create an office requirement or question to display it here."
                />
              ) : (
                activeRequirements
                  .slice(0, 4)
                  .map(
                    (requirement) => (
                      <div
                        key={
                          requirement.id
                        }
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {requirement.requirement_type ||
                                requirement.type ||
                                "Requirement"}
                            </span>

                            <p className="mt-2 text-sm font-bold leading-5 text-slate-800 dark:text-slate-200">
                              {requirement.title ||
                                "Requirement"}
                            </p>
                          </div>

                          <span className="shrink-0 text-[10px] font-bold text-slate-400">
                            {requirement.is_required ===
                            true
                              ? "Required"
                              : "Optional"}
                          </span>
                        </div>
                      </div>
                    )
                  )
              )}

              <Link
                to="/office/requirements"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Manage Requirements
                <FaArrowRight />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Recent Reviews
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Latest clearance decisions.
                </p>
              </div>

              <FaClipboardCheck className="text-slate-300 dark:text-slate-600" />
            </div>

            {recentReviews.length ===
            0 ? (
              <div className="p-5">
                <EmptyState
                  icon={FaClipboardCheck}
                  title="No reviewed students yet"
                  description="Approved and Needs Action decisions will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
                {recentReviews.map(
                  (review) => {
                    const status =
                      review.displayStatus ||
                      review.clearanceStatus ||
                      (review.status ===
                      "Rejected"
                        ? "Needs Action"
                        : review.status) ||
                      "Reviewed";

                    return (
                      <div
                        key={
                          review.stepId ||
                          review.id
                        }
                        className="py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                              {review.name ||
                                review.studentName ||
                                review.student ||
                                "Student"}
                            </p>

                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {review.course ||
                                "—"}{" "}
                              •{" "}
                              {review.yearLevel ||
                                review.year_level ||
                                "—"}{" "}
                              •{" "}
                              {formatReviewTime(
                                review.reviewed_at ||
                                  review.reviewedAt
                              )}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${getReviewStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="p-5 pt-2">
              <Link
                to="/office/reviewed"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                View Reviewed Students
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </OfficeStaffLayout>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  tone,
}) {
  const tones = {
    blue: {
      wrapper:
        "hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/5",
      icon:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      arrow:
        "group-hover:text-blue-500",
    },
    violet: {
      wrapper:
        "hover:border-violet-200 hover:bg-violet-50/50 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/5",
      icon:
        "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
      arrow:
        "group-hover:text-violet-500",
    },
    amber: {
      wrapper:
        "hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/5",
      icon:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      arrow:
        "group-hover:text-amber-500",
    },
  };

  const selected =
    tones[tone] || tones.blue;

  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition dark:border-slate-800 ${selected.wrapper}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected.icon}`}
      >
        <Icon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-white">
          {title}
        </p>

        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <FaArrowRight
        className={`text-xs text-slate-300 transition group-hover:translate-x-1 ${selected.arrow}`}
      />
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
      <Icon className="mx-auto text-2xl text-slate-300 dark:text-slate-600" />

      <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function getBatchName(batch) {
  return (
    batch.batch_name ||
    batch.batchName ||
    batch.name ||
    "Office Clearance Batch"
  );
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function compareBatchDateTime(a, b) {
  const aDate =
    a.schedule_date ||
    a.scheduleDate ||
    a.date ||
    "";

  const bDate =
    b.schedule_date ||
    b.scheduleDate ||
    b.date ||
    "";

  const aTime =
    a.start_time ||
    a.startTime ||
    "";

  const bTime =
    b.start_time ||
    b.startTime ||
    "";

  return `${aDate} ${aTime}`.localeCompare(
    `${bDate} ${bTime}`
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const normalized = String(
    value
  ).slice(0, 5);

  const [hourValue, minute] =
    normalized.split(":");

  const hour = Number(hourValue);

  if (
    Number.isNaN(hour) ||
    minute === undefined
  ) {
    return value;
  }

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function formatBatchTime(batch) {
  const start =
    batch.start_time ||
    batch.startTime;

  const end =
    batch.end_time ||
    batch.endTime;

  if (!start && !end) {
    return "—";
  }

  if (!end) {
    return formatTime(start);
  }

  return `${formatTime(
    start
  )} - ${formatTime(end)}`;
}

function formatReviewTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export default OfficeDashboard;
