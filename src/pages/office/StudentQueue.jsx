import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaSyncAlt,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";
import { getOfficeStudentQueue } from "../../services/officeStaffService";

function StudentQueue() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [office, setOffice] = useState({
    name: "Office",
    code: "OFFICE",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");

  async function loadQueue(silent = false) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await getOfficeStudentQueue();

      const primaryOffice = result?.primaryOffice || null;

      setOffice({
        name: primaryOffice?.office_name || "Office",
        code: primaryOffice?.office_code || "OFFICE",
      });

      setStudents(
        Array.isArray(result?.students)
          ? result.students
          : []
      );
    } catch (loadError) {
      console.error(
        "Unable to load Office Staff student queue:",
        loadError
      );

      setStudents([]);
      setError(
        loadError?.message ||
          "Unable to load the student queue."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const courses = useMemo(() => {
    const values = students
      .map((student) => student.course)
      .filter(Boolean)
      .filter((course) => course !== "—");

    return ["All", ...new Set(values)];
  }, [students]);

  const statusOptions = useMemo(() => {
    const values = students
      .map((student) => student.status)
      .filter(Boolean);

    return ["All", ...new Set(values)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const searchable = [
        student.name,
        student.studentId,
        student.course,
        student.yearLevel,
        student.section,
        student.email,
        student.schoolYear,
        student.semester,
      ]
        .map((value) =>
          String(value || "").toLowerCase()
        )
        .join(" ");

      const matchesSearch =
        !query || searchable.includes(query);

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
  }, [
    students,
    search,
    statusFilter,
    courseFilter,
  ]);

  const counts = useMemo(() => {
    const pendingStatuses = new Set([
      "pending",
      "under review",
      "in progress",
    ]);

    return {
      total: students.length,

      pending: students.filter((student) =>
        pendingStatuses.has(
          String(student.status || "")
            .trim()
            .toLowerCase()
        )
      ).length,

      needsAction: students.filter(
        (student) =>
          String(student.status || "")
            .trim()
            .toLowerCase() === "needs action"
      ).length,

      other: students.filter((student) => {
        const status = String(
          student.status || ""
        )
          .trim()
          .toLowerCase();

        return (
          !pendingStatuses.has(status) &&
          status !== "needs action"
        );
      }).length,
    };
  }, [students]);

  function getStatusStyle(status) {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();

    if (normalized === "needs action") {
      return {
        badge:
          "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        icon: FaExclamationTriangle,
      };
    }

    if (
      normalized === "under review" ||
      normalized === "in progress"
    ) {
      return {
        badge:
          "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
        icon: FaClipboardList,
      };
    }

    return {
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      icon: FaUserClock,
    };
  }

  function handleReview(student) {
    navigate(
      `/office/student/${student.stepId}`
    );
  }

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
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
              Review actual student clearance
              requests assigned to your office.
              Only your office clearance steps are
              shown here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadQueue(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-blue-400 lg:self-auto"
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
              : "Refresh Queue"}
          </button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Queue"
            value={counts.total}
            icon={FaUsers}
            iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />

          <SummaryCard
            label="Pending Review"
            value={counts.pending}
            icon={FaUserClock}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />

          <SummaryCard
            label="Needs Action"
            value={counts.needsAction}
            icon={FaExclamationTriangle}
            iconClass="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          />

          <SummaryCard
            label="Other Queue Status"
            value={counts.other}
            icon={FaClipboardList}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />
        </section>

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
                placeholder="Search student name, ID, course, or block..."
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
                  {statusOptions.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status === "All"
                          ? "All Status"
                          : status}
                      </option>
                    )
                  )}
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

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Clearance Students
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {loading
                  ? "Loading assigned students..."
                  : `${filteredStudents.length} student${
                      filteredStudents.length !==
                      1
                        ? "s"
                        : ""
                    } found`}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FaUsers />
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => loadQueue()}
            />
          ) : filteredStudents.length ===
            0 ? (
            <EmptyState
              hasFilters={
                Boolean(search.trim()) ||
                statusFilter !== "All" ||
                courseFilter !== "All"
              }
              officeName={office.name}
            />
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
                      key={student.stepId}
                      className="group p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
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
                              {student.studentId} •{" "}
                              {student.course} •{" "}
                              {student.yearLevel} •
                              Block{" "}
                              {student.section}
                            </p>

                            {(student.semester ||
                              student.schoolYear) && (
                              <p className="mt-1 text-[10px] font-bold text-slate-400">
                                {student.semester ||
                                  "Semester not set"}
                                {student.schoolYear
                                  ? ` • ${student.schoolYear}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                          <InfoBox
                            label="Clearance Office"
                            value={
                              student.officeName ||
                              office.name
                            }
                          />

                          <InfoBox
                            label="Request Status"
                            value={
                              student.requestStatus ||
                              "In Progress"
                            }
                          />
                        </div>

                        <div className="flex items-center gap-3 xl:w-[170px]">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                            <FaClipboardList />
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                              Office Step
                            </p>

                            <p
                              className={`mt-0.5 text-[10px] font-bold ${
                                student.issues > 0
                                  ? "text-red-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {student.issues > 0
                                ? "Needs follow-up"
                                : "Ready for review"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleReview(
                              student
                            )
                          }
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

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

            <div>
              <p className="text-sm font-black text-blue-900 dark:text-blue-300">
                Office-specific review
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-blue-700/80 dark:text-blue-300/70">
                This queue now uses actual
                clearance data. Your account only
                receives clearance steps belonging
                to the office assigned to you.
                Decisions will be handled from the
                exact clearance step instead of
                updating every pending signatory.
              </p>
            </div>
          </div>
        </section>
      </div>
    </OfficeStaffLayout>
  );
}

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

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
        {value || "—"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-700" />

            <div className="flex-1">
              <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-2.5 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}) {
  return (
    <div className="px-5 py-16 text-center">
      <FaExclamationTriangle className="mx-auto mb-4 text-3xl text-red-400" />

      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
        Unable to load student queue
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-500">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
      >
        <FaSyncAlt />
        Try Again
      </button>
    </div>
  );
}

function EmptyState({
  hasFilters,
  officeName,
}) {
  return (
    <div className="px-5 py-16 text-center">
      <FaSearch className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
        {hasFilters
          ? "No students found"
          : "No students in this office queue"}
      </h3>

      <p className="mx-auto mt-1 max-w-lg text-sm font-medium text-slate-500">
        {hasFilters
          ? "Try changing your search or filters."
          : `There are currently no unresolved ${officeName} clearance steps assigned to this office.`}
      </p>
    </div>
  );
}

function getInitials(name) {
  return String(name || "Student")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default StudentQueue;
