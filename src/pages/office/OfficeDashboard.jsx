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
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function OfficeDashboard() {
  // =========================================================
  // TEMPORARY FRONTEND DATA
  // These values will later come from Supabase.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
    staffName: "Office Staff",
    description: "Student clearance and office requirement management",
  };

  const stats = [
    {
      label: "Waiting for Schedule",
      value: 18,
      helper: "Students not yet assigned to a batch",
      icon: FaUserClock,
      iconClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      link: "/office/students",
    },
    {
      label: "Scheduled",
      value: 24,
      helper: "Students currently assigned to batches",
      icon: FaCalendarAlt,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      link: "/office/schedule",
    },
    {
      label: "Needs Action",
      value: 6,
      helper: "Students with unresolved requirements",
      icon: FaExclamationCircle,
      iconClass:
        "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      link: "/office/students",
    },
    {
      label: "Approved",
      value: 42,
      helper: "Students cleared by this office",
      icon: FaCheckCircle,
      iconClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      link: "/office/reviewed",
    },
  ];

  const todayBatches = [
    {
      id: "batch-001",
      name: "Library Clearance - Batch 1",
      time: "9:00 AM - 11:00 AM",
      students: 15,
      reviewed: 8,
      status: "Open",
    },
    {
      id: "batch-002",
      name: "Library Clearance - Batch 2",
      time: "1:00 PM - 3:00 PM",
      students: 12,
      reviewed: 0,
      status: "Open",
    },
  ];

  const upcomingBatches = [
    {
      id: "batch-003",
      name: "BSIT Clearance - Batch 3",
      date: "Oct 3, 2026",
      time: "9:00 AM - 12:00 PM",
      students: 20,
    },
    {
      id: "batch-004",
      name: "General Clearance - Batch 4",
      date: "Oct 5, 2026",
      time: "1:00 PM - 4:00 PM",
      students: 18,
    },
  ];

  const requirements = [
    {
      id: "req-001",
      title: "Return all borrowed books",
      type: "Requirement",
      required: false,
    },
    {
      id: "req-002",
      title: "Settle lost or unpaid library materials",
      type: "Requirement",
      required: false,
    },
    {
      id: "req-003",
      title: "Do you have any outstanding library obligation?",
      type: "Question",
      required: false,
    },
  ];

  const recentReviews = [
    {
      id: "review-001",
      student: "Juan Dela Cruz",
      course: "BSIT",
      section: "4-D",
      status: "Approved",
      time: "10:42 AM",
    },
    {
      id: "review-002",
      student: "Maria Santos",
      course: "BSIT",
      section: "4-D",
      status: "Needs Action",
      time: "10:31 AM",
    },
    {
      id: "review-003",
      student: "Carlo Reyes",
      course: "BSBA",
      section: "3-A",
      status: "Approved",
      time: "10:15 AM",
    },
  ];

  const getReviewStatusClass = (status) => {
    if (status === "Approved") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (status === "Needs Action") {
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* ===================================================
            PAGE HEADER
        =================================================== */}

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
                      {office.code}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Active Office
                    </span>
                  </div>

                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {office.name} Clearance
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    {office.description}
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

        {/* ===================================================
            STATISTICS
        =================================================== */}

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

        {/* ===================================================
            MAIN DASHBOARD GRID
        =================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          {/* =================================================
              TODAY'S SCHEDULE
          ================================================= */}

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
                  const progress =
                    batch.students > 0
                      ? Math.round(
                          (batch.reviewed / batch.students) * 100
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
                              {batch.name}
                            </h3>

                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              {batch.status}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <FaClock />
                              {batch.time}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <FaUsers />
                              {batch.students} students
                            </span>
                          </div>
                        </div>

                        <Link
                          to="/office/students"
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
                            {batch.reviewed}/{batch.students}
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

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

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
              <Link
                to="/office/schedule"
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <FaPlus />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Create Batch
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Set a new clearance schedule.
                  </p>
                </div>

                <FaArrowRight className="text-xs text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
              </Link>

              <Link
                to="/office/requirements"
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                  <FaClipboardList />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Requirements
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Manage optional checks and questions.
                  </p>
                </div>

                <FaArrowRight className="text-xs text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500" />
              </Link>

              <Link
                to="/office/students"
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-800 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <FaUsers />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Student Queue
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Review pending students.
                  </p>
                </div>

                <FaArrowRight className="text-xs text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-500" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===================================================
            SECONDARY GRID
        =================================================== */}

        <section className="grid gap-6 xl:grid-cols-3">
          {/* UPCOMING BATCHES */}

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
              {upcomingBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"
                >
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {batch.name}
                  </p>

                  <div className="mt-2 space-y-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <FaCalendarAlt />
                      {batch.date}
                    </p>

                    <p className="flex items-center gap-2">
                      <FaClock />
                      {batch.time}
                    </p>

                    <p className="flex items-center gap-2">
                      <FaUsers />
                      {batch.students} students
                    </p>
                  </div>
                </div>
              ))}

              <Link
                to="/office/schedule"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Manage All Batches
                <FaArrowRight />
              </Link>
            </div>
          </div>

          {/* ACTIVE REQUIREMENTS */}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Office Requirements
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Optional requirements and questions.
                </p>
              </div>

              <FaClipboardCheck className="text-slate-300 dark:text-slate-600" />
            </div>

            <div className="space-y-3 p-5">
              {requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {requirement.type}
                      </span>

                      <p className="mt-2 text-sm font-bold leading-5 text-slate-800 dark:text-slate-200">
                        {requirement.title}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] font-bold text-slate-400">
                      Optional
                    </span>
                  </div>
                </div>
              ))}

              <Link
                to="/office/requirements"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Manage Requirements
                <FaArrowRight />
              </Link>
            </div>
          </div>

          {/* RECENT REVIEWS */}

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

            <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {review.student}
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {review.course} • {review.section} • {review.time}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${getReviewStatusClass(
                        review.status
                      )}`}
                    >
                      {review.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

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

export default OfficeDashboard;