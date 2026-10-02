import { useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function StudentQueue() {
  // =========================================================
  // MOCK FRONTEND DATA
  // Later: Supabase clearance_steps + batches + users.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  const students = [
    {
      id: "student-001",
      name: "Juan Dela Cruz",
      studentId: "2023-00125",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      status: "Scheduled",
      batch: "Library Clearance - Batch 1",
      schedule: "Oct 1, 2026",
      time: "9:00 AM - 11:00 AM",
      requirements: 2,
      issues: 0,
    },
    {
      id: "student-002",
      name: "Maria Santos",
      studentId: "2023-00148",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      status: "Needs Action",
      batch: "Library Clearance - Batch 1",
      schedule: "Oct 1, 2026",
      time: "9:00 AM - 11:00 AM",
      requirements: 2,
      issues: 1,
    },
    {
      id: "student-003",
      name: "Carlo Reyes",
      studentId: "2024-00316",
      course: "BSBA",
      yearLevel: "3rd Year",
      section: "3-A",
      status: "Waiting for Schedule",
      batch: null,
      schedule: null,
      time: null,
      requirements: 2,
      issues: 0,
    },
    {
      id: "student-004",
      name: "Angela Flores",
      studentId: "2023-00209",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-A",
      status: "Scheduled",
      batch: "Library Clearance - Batch 2",
      schedule: "Oct 1, 2026",
      time: "1:00 PM - 3:00 PM",
      requirements: 2,
      issues: 0,
    },
    {
      id: "student-005",
      name: "Mark Villanueva",
      studentId: "2025-00401",
      course: "BEED",
      yearLevel: "2nd Year",
      section: "2-B",
      status: "Waiting for Schedule",
      batch: null,
      schedule: null,
      time: null,
      requirements: 2,
      issues: 0,
    },
    {
      id: "student-006",
      name: "Nicole Garcia",
      studentId: "2023-00244",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      status: "Needs Action",
      batch: "Library Clearance - Batch 1",
      schedule: "Oct 1, 2026",
      time: "9:00 AM - 11:00 AM",
      requirements: 2,
      issues: 1,
    },
  ];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [courseFilter, setCourseFilter] =
    useState("All");

  const courses = useMemo(() => {
    return [
      "All",
      ...new Set(
        students.map((student) => student.course)
      ),
    ];
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name
          .toLowerCase()
          .includes(query) ||
        student.studentId
          .toLowerCase()
          .includes(query) ||
        student.section
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        student.status === statusFilter;

      const matchesCourse =
        courseFilter === "All" ||
        student.course === courseFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse
      );
    });
  }, [search, statusFilter, courseFilter]);

  const counts = useMemo(() => {
    return {
      total: students.length,
      waiting: students.filter(
        (student) =>
          student.status ===
          "Waiting for Schedule"
      ).length,
      scheduled: students.filter(
        (student) =>
          student.status === "Scheduled"
      ).length,
      needsAction: students.filter(
        (student) =>
          student.status === "Needs Action"
      ).length,
    };
  }, []);

  const getStatusStyle = (status) => {
    if (status === "Scheduled") {
      return {
        badge:
          "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
        icon: FaCalendarAlt,
      };
    }

    if (status === "Needs Action") {
      return {
        badge:
          "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        icon: FaExclamationTriangle,
      };
    }

    return {
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      icon: FaUserClock,
    };
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {office.code}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {office.name} Clearance
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Student Queue
            </h1>

            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Manage students waiting for a
              schedule, review scheduled students,
              and follow up unresolved clearance
              requirements.
            </p>
          </div>
        </section>

        {/* ===================================================
            STATUS SUMMARY
        =================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Queue"
            value={counts.total}
            icon={FaUsers}
            iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />

          <SummaryCard
            label="Waiting for Schedule"
            value={counts.waiting}
            icon={FaUserClock}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />

          <SummaryCard
            label="Scheduled"
            value={counts.scheduled}
            icon={FaCalendarAlt}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />

          <SummaryCard
            label="Needs Action"
            value={counts.needsAction}
            icon={FaExclamationTriangle}
            iconClass="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          />
        </section>

        {/* ===================================================
            FILTERS
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student name, ID, or section..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <FaFilter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-auto"
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Waiting for Schedule">
                    Waiting for Schedule
                  </option>

                  <option value="Scheduled">
                    Scheduled
                  </option>

                  <option value="Needs Action">
                    Needs Action
                  </option>
                </select>
              </div>

              <select
                value={courseFilter}
                onChange={(event) =>
                  setCourseFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {courses.map((course) => (
                  <option
                    key={course}
                    value={course}
                  >
                    {course === "All"
                      ? "All Courses"
                      : course}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ===================================================
            STUDENT LIST
        =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Clearance Students
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {filteredStudents.length} student
                {filteredStudents.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FaUsers />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FaSearch className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No students found
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Try changing your search or
                filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map(
                (student) => {
                  const statusStyle =
                    getStatusStyle(
                      student.status
                    );

                  const StatusIcon =
                    statusStyle.icon;

                  return (
                    <article
                      key={student.id}
                      className="group p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        {/* STUDENT */}

                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-blue-600">
                            {getInitials(
                              student.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                                {student.name}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${statusStyle.badge}`}
                              >
                                <StatusIcon />

                                {student.status}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {
                                student.studentId
                              }{" "}
                              • {student.course} •{" "}
                              {
                                student.yearLevel
                              }{" "}
                              • Block{" "}
                              {student.section}
                            </p>
                          </div>
                        </div>

                        {/* BATCH / SCHEDULE */}

                        <div className="grid gap-3 sm:grid-cols-2 xl:w-[480px]">
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Batch
                            </p>

                            <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
                              {student.batch ||
                                "Not assigned"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Schedule
                            </p>

                            {student.schedule ? (
                              <>
                                <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <FaCalendarAlt className="text-slate-400" />
                                  {
                                    student.schedule
                                  }
                                </p>

                                <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                  <FaClock />
                                  {student.time}
                                </p>
                              </>
                            ) : (
                              <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                Waiting for batch
                              </p>
                            )}
                          </div>
                        </div>

                        {/* REQUIREMENT SUMMARY */}

                        <div className="flex items-center gap-3 xl:w-[170px]">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                            <FaClipboardList />
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {
                                student.requirements
                              }{" "}
                              checks
                            </p>

                            <p
                              className={`mt-0.5 text-[10px] font-bold ${
                                student.issues > 0
                                  ? "text-red-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {student.issues > 0
                                ? `${student.issues} unresolved`
                                : "No recorded issue"}
                            </p>
                          </div>
                        </div>

                        {/* ACTION */}

                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
                        >
                          Review
                          <FaChevronRight />
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            INFO
        =================================================== */}

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

            <div>
              <p className="text-sm font-black text-blue-900 dark:text-blue-300">
                Office-specific review
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-blue-700/80 dark:text-blue-300/70">
                Each Office Staff account will
                only see students assigned to its
                own clearance office. Approval from
                this portal will affect only that
                office's clearance step.
              </p>
            </div>
          </div>
        </section>
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// SMALL COMPONENTS
// ===========================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon />
        </div>
      </div>
    </div>
  );
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default StudentQueue;