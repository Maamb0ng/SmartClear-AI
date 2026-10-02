import { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHistory,
  FaSearch,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function ReviewedStudents() {
  // =========================================================
  // MOCK OFFICE
  // Later: authenticated user's assigned office.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  // =========================================================
  // MOCK REVIEW HISTORY
  // Later: clearance_steps + users + reviewer information.
  // =========================================================

  const reviewedStudents = [
    {
      id: "review-001",
      studentName: "Juan Dela Cruz",
      studentId: "2023-00125",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      semester: "1st Semester",
      schoolYear: "2026-2027",
      status: "Approved",
      remarks: "No outstanding library obligation.",
      reviewedAt: "Oct 1, 2026 • 10:42 AM",
      reviewedBy: "Office Staff",
    },
    {
      id: "review-002",
      studentName: "Maria Santos",
      studentId: "2023-00148",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      semester: "1st Semester",
      schoolYear: "2026-2027",
      status: "Needs Action",
      remarks:
        "Please return the borrowed book before requesting another review.",
      reviewedAt: "Oct 1, 2026 • 10:31 AM",
      reviewedBy: "Office Staff",
    },
    {
      id: "review-003",
      studentName: "Carlo Reyes",
      studentId: "2024-00316",
      course: "BSBA",
      yearLevel: "3rd Year",
      section: "3-A",
      semester: "1st Semester",
      schoolYear: "2026-2027",
      status: "Approved",
      remarks: "Library record verified.",
      reviewedAt: "Oct 1, 2026 • 10:15 AM",
      reviewedBy: "Office Staff",
    },
    {
      id: "review-004",
      studentName: "Angela Flores",
      studentId: "2023-00209",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-A",
      semester: "1st Semester",
      schoolYear: "2026-2027",
      status: "Approved",
      remarks: "",
      reviewedAt: "Sep 30, 2026 • 2:16 PM",
      reviewedBy: "Office Staff",
    },
    {
      id: "review-005",
      studentName: "Nicole Garcia",
      studentId: "2023-00244",
      course: "BSIT",
      yearLevel: "4th Year",
      section: "4-D",
      semester: "1st Semester",
      schoolYear: "2026-2027",
      status: "Needs Action",
      remarks:
        "Outstanding lost book must be resolved before clearance approval.",
      reviewedAt: "Sep 30, 2026 • 1:48 PM",
      reviewedBy: "Office Staff",
    },
  ];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [courseFilter, setCourseFilter] =
    useState("All");

  const [selectedReview, setSelectedReview] =
    useState(null);

  // =========================================================
  // COURSES
  // =========================================================

  const courses = useMemo(() => {
    return [
      "All",
      ...new Set(
        reviewedStudents.map(
          (student) => student.course
        )
      ),
    ];
  }, []);

  // =========================================================
  // FILTERING
  // =========================================================

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviewedStudents.filter(
      (student) => {
        const matchesSearch =
          !query ||
          student.studentName
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
      }
    );
  }, [search, statusFilter, courseFilter]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    return {
      total: reviewedStudents.length,

      approved: reviewedStudents.filter(
        (student) =>
          student.status === "Approved"
      ).length,

      needsAction: reviewedStudents.filter(
        (student) =>
          student.status === "Needs Action"
      ).length,
    };
  }, []);

  // =========================================================
  // STATUS
  // =========================================================

  const getStatusStyle = (status) => {
    if (status === "Approved") {
      return {
        badge:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        icon: FaCheckCircle,
      };
    }

    return {
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      icon: FaExclamationTriangle,
    };
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1550px] space-y-6">
        {/* ===================================================
            HEADER
        =================================================== */}

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {office.code}
            </span>

            <span className="text-xs font-bold text-slate-400">
              {office.name} Clearance
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Reviewed Students
          </h1>

          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            View students already reviewed by your
            office, including approved clearances
            and students who still need to resolve
            an office obligation.
          </p>
        </section>

        {/* ===================================================
            STATS
        =================================================== */}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Reviewed"
            value={stats.total}
            icon={FaClipboardCheck}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />

          <StatCard
            label="Approved"
            value={stats.approved}
            icon={FaCheckCircle}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />

          <StatCard
            label="Needs Action"
            value={stats.needsAction}
            icon={FaExclamationTriangle}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
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
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Approved">
                    Approved
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
            REVIEW HISTORY
        =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Review History
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {filteredStudents.length} record
                {filteredStudents.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <FaHistory />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FaUsers className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No reviewed students found
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Try changing the current filters.
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
                      className="p-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        {/* STUDENT */}

                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-blue-600">
                            {getInitials(
                              student.studentName
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                                {
                                  student.studentName
                                }
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

                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              {student.semester} •{" "}
                              {student.schoolYear}
                            </p>
                          </div>
                        </div>

                        {/* REMARK */}

                        <div className="xl:w-[390px]">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Office Remark
                          </p>

                          <p
                            className={`mt-1 text-xs font-semibold leading-5 ${
                              student.remarks
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-slate-400"
                            }`}
                          >
                            {student.remarks ||
                              "No remarks provided."}
                          </p>
                        </div>

                        {/* REVIEW INFO */}

                        <div className="xl:w-[210px]">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Reviewed
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {student.reviewedAt}
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            by{" "}
                            {student.reviewedBy}
                          </p>
                        </div>

                        {/* VIEW */}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReview(
                              student
                            )
                          }
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        >
                          <FaEye />
                          View
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
            REVIEW DETAILS MODAL
        =================================================== */}

        {selectedReview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close review details"
              onClick={() =>
                setSelectedReview(null)
              }
              className="absolute inset-0"
            />

            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-blue-600">
                      {getInitials(
                        selectedReview.studentName
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
                        {
                          selectedReview.studentName
                        }
                      </h2>

                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {
                          selectedReview.studentId
                        }{" "}
                        • {selectedReview.course}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const style =
                      getStatusStyle(
                        selectedReview.status
                      );

                    const Icon = style.icon;

                    return (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${style.badge}`}
                      >
                        <Icon />
                        {
                          selectedReview.status
                        }
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    label="Year Level"
                    value={
                      selectedReview.yearLevel
                    }
                  />

                  <DetailItem
                    label="Block"
                    value={
                      selectedReview.section
                    }
                  />

                  <DetailItem
                    label="Semester"
                    value={
                      selectedReview.semester
                    }
                  />

                  <DetailItem
                    label="School Year"
                    value={
                      selectedReview.schoolYear
                    }
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Office Remarks
                  </p>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {selectedReview.remarks ||
                      "No remarks provided."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Review Information
                  </p>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-slate-500">
                        Reviewed by
                      </span>

                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {
                          selectedReview.reviewedBy
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-slate-500">
                        Date & Time
                      </span>

                      <span className="text-right text-xs font-black text-slate-800 dark:text-slate-200">
                        {
                          selectedReview.reviewedAt
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-slate-500">
                        Office
                      </span>

                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {office.name}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReview(null)
                  }
                  className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// COMPONENTS
// ===========================================================

function StatCard({
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

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-200">
        {value}
      </p>
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

export default ReviewedStudents;