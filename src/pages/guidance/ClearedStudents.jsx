import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaFilter,
  FaGraduationCap,
  FaIdCard,
  FaRedo,
  FaSearch,
  FaSpinner,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

import GuidanceLayout from "../../layouts/GuidanceLayout";

import {
  getCurrentGuidanceUser,
  getGuidanceBatches,
  getGuidanceBatchStudents,
  getGuidanceOffice,
} from "../../services/guidanceService";

/* ============================================================
   HELPERS
============================================================ */

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatScheduleDate = (value) => {
  if (!value) return "—";

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) return "—";

  const cleanValue = String(value)
    .split(".")[0];

  const parts = cleanValue.split(":");

  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isNaN(hour)) {
    return value;
  }

  const date = new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const getStudentName = (student) =>
  student?.full_name ||
  "Unknown Student";

const getStudentNumber = (student) =>
  student?.student_id ||
  "No Student ID";

const getAcademicLabel = (student) => {
  const values = [
    student?.course,

    student?.year_level
      ? `Year ${student.year_level}`
      : "",

    student?.block
      ? `Block ${student.block}`
      : "",
  ].filter(Boolean);

  return (
    values.join(" • ") ||
    "Academic information unavailable"
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

function ClearedStudents() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [profile, setProfile] =
    useState(null);

  const [
    guidanceOffice,
    setGuidanceOffice,
  ] = useState(null);

  const [records, setRecords] =
    useState([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    batchFilter,
    setBatchFilter,
  ] = useState("All");

  /* ============================================================
     LOAD CLEARED STUDENTS
  ============================================================ */

  const loadClearedStudents =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          const [
            userResult,
            officeResult,
            batchesResult,
          ] = await Promise.all([
            getCurrentGuidanceUser(),
            getGuidanceOffice(),
            getGuidanceBatches(),
          ]);

          if (!userResult.success) {
            throw new Error(
              userResult.error ||
                "Unable to load Guidance account."
            );
          }

          if (!officeResult.success) {
            throw new Error(
              officeResult.error ||
                "Unable to load Guidance office."
            );
          }

          if (!batchesResult.success) {
            throw new Error(
              batchesResult.error ||
                "Unable to load Guidance batches."
            );
          }

          setProfile(
            userResult.data
          );

          setGuidanceOffice(
            officeResult.data
          );

          const batches =
            batchesResult.data || [];

          /*
           * Each batch loads its own students.
           *
           * Important:
           * We use guidance_batch_students as
           * the Guidance workflow source.
           */

          const batchResults =
            await Promise.all(
              batches.map(
                async (batch) => {
                  const result =
                    await getGuidanceBatchStudents(
                      batch.id
                    );

                  if (!result.success) {
                    throw new Error(
                      result.error ||
                        `Unable to load students for ${batch.batch_name}.`
                    );
                  }

                  return {
                    batch,
                    students:
                      result.data || [],
                  };
                }
              )
            );

          const clearedRecords = [];

          batchResults.forEach(
            ({
              batch,
              students,
            }) => {
              students.forEach(
                (assignment) => {
                  const status =
                    normalizeValue(
                      assignment
                        ?.guidance_status
                    );

                  /*
                   * Only individually approved
                   * Guidance students belong here.
                   */

                  if (
                    status !==
                    "approved"
                  ) {
                    return;
                  }

                  clearedRecords.push({
                    id:
                      assignment.id,

                    batchStudentId:
                      assignment.id,

                    clearanceStepId:
                      assignment
                        .clearance_step_id,

                    batch,

                    assignment,

                    student:
                      assignment.student ||
                      null,
                  });
                }
              );
            }
          );

          /*
           * Newest Guidance approval first.
           */

          clearedRecords.sort(
            (a, b) => {
              const aDate =
                new Date(
                  a.assignment
                    ?.reviewed_at ||
                    a.assignment
                      ?.updated_at ||
                    a.assignment
                      ?.created_at ||
                    0
                ).getTime();

              const bDate =
                new Date(
                  b.assignment
                    ?.reviewed_at ||
                    b.assignment
                      ?.updated_at ||
                    b.assignment
                      ?.created_at ||
                    0
                ).getTime();

              return bDate - aDate;
            }
          );

          setRecords(
            clearedRecords
          );
        } catch (error) {
          console.error(
            "Unable to load cleared Guidance students:",
            error
          );

          setRecords([]);

          await Swal.fire({
            icon: "error",

            title:
              "Unable to Load Cleared Students",

            text:
              error?.message ||
              "Something went wrong while loading cleared Guidance records.",

            confirmButtonColor:
              "#059669",
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadClearedStudents();
  }, [loadClearedStudents]);

  /* ============================================================
     BATCH FILTER OPTIONS
  ============================================================ */

  const batchOptions =
    useMemo(() => {
      const names = [
        ...new Set(
          records
            .map(
              (record) =>
                record.batch
                  ?.batch_name
            )
            .filter(Boolean)
        ),
      ];

      return names.sort(
        (a, b) =>
          String(a).localeCompare(
            String(b)
          )
      );
    }, [records]);

  /* ============================================================
     FILTER RECORDS
  ============================================================ */

  const filteredRecords =
    useMemo(() => {
      const query =
        normalizeValue(
          searchTerm
        );

      return records.filter(
        (record) => {
          const {
            student,
            batch,
            assignment,
          } = record;

          const searchable =
            [
              student?.full_name,
              student?.student_id,
              student?.email,
              student?.course,
              student?.year_level,
              student?.block,

              batch?.batch_name,
              batch?.school_year,
              batch?.semester,

              assignment
                ?.guidance_remarks,
            ]
              .map(
                normalizeValue
              )
              .join(" ");

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesBatch =
            batchFilter ===
              "All" ||
            batch?.batch_name ===
              batchFilter;

          return (
            matchesSearch &&
            matchesBatch
          );
        }
      );
    }, [
      records,
      searchTerm,
      batchFilter,
    ]);

  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh =
    async () => {
      setRefreshing(true);

      await loadClearedStudents({
        silent: true,
      });
    };

  /* ============================================================
     VIEW STUDENT
  ============================================================ */

  const handleViewStudent = (
    record
  ) => {
    if (
      !record
        ?.clearanceStepId
    ) {
      Swal.fire({
        icon: "warning",

        title:
          "Record Unavailable",

        text:
          "The clearance step for this student could not be found.",

        confirmButtonColor:
          "#059669",
      });

      return;
    }

    navigate(
      `/guidance/student/${record.clearanceStepId}`
    );
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-4xl text-emerald-600" />

            <p className="mt-4 text-sm font-bold text-slate-700">
              Loading cleared
              students...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving approved
              Guidance records.
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <GuidanceLayout>
      <div className="space-y-6">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-50">
                  <FaCheckCircle />

                  Guidance Records
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                  Cleared Students
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90">
                  Students
                  individually approved
                  by Guidance after
                  completing their
                  scheduled clearance
                  requirement.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaRedo
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
          </div>

          {/* SUMMARY */}

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-8">
            <SummaryCard
              icon={
                FaCheckCircle
              }
              label="Cleared"
              value={
                records.length
              }
              tone="emerald"
            />

            <SummaryCard
              icon={FaUsers}
              label="Batches"
              value={
                batchOptions.length
              }
              tone="blue"
            />

            <SummaryCard
              icon={
                FaUserGraduate
              }
              label="Counselor"
              value={
                profile?.full_name ||
                "Guidance Counselor"
              }
              tone="indigo"
              small
            />
          </div>
        </motion.div>

        {/* ====================================================
            SEARCH / FILTER
        ==================================================== */}

        <motion.div
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
            duration: 0.35,
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* SEARCH */}

            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target
                      .value
                  )
                }
                placeholder="Search student, ID, course, block, batch or remarks..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {/* BATCH FILTER */}

            <div className="relative lg:w-64">
              <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

              <select
                value={
                  batchFilter
                }
                onChange={(
                  event
                ) =>
                  setBatchFilter(
                    event.target
                      .value
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="All">
                  All Batches
                </option>

                {batchOptions.map(
                  (
                    batchName
                  ) => (
                    <option
                      key={
                        batchName
                      }
                      value={
                        batchName
                      }
                    >
                      {
                        batchName
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing{" "}

              <span className="font-bold text-slate-800">
                {
                  filteredRecords.length
                }
              </span>{" "}

              of{" "}

              <span className="font-bold text-slate-800">
                {
                  records.length
                }
              </span>{" "}

              cleared student
              {records.length ===
              1
                ? ""
                : "s"}
              .
            </p>

            {(searchTerm ||
              batchFilter !==
                "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm(
                    ""
                  );

                  setBatchFilter(
                    "All"
                  );
                }}
                className="text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>

        {/* ====================================================
            RECORDS
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.14,
            duration: 0.4,
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FaCheckCircle />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Guidance Clearance
                  History
                </h2>

                <p className="text-xs text-slate-500">
                  Most recently
                  approved students
                  appear first.
                </p>
              </div>
            </div>
          </div>

          {filteredRecords.length ===
          0 ? (
            /* EMPTY */

            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-500">
                {records.length ===
                0 ? (
                  <FaCheckCircle />
                ) : (
                  <FaSearch />
                )}
              </div>

              <h3 className="mt-4 text-base font-black text-slate-800">
                {records.length ===
                0
                  ? "No Cleared Students Yet"
                  : "No Matching Records"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {records.length ===
                0
                  ? "Students approved through the Guidance batch workflow will appear here."
                  : "No cleared student matches your current search or batch filter."}
              </p>
            </div>
          ) : (
            <>
              {/* ================================================
                  DESKTOP TABLE
              ================================================ */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <TableHead>
                        Student
                      </TableHead>

                      <TableHead>
                        Academic
                        Information
                      </TableHead>

                      <TableHead>
                        Batch
                      </TableHead>

                      <TableHead>
                        Cleared On
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map(
                      (
                        record,
                        index
                      ) => (
                        <motion.tr
                          key={
                            record.id
                          }
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.025,
                          }}
                          className="transition hover:bg-slate-50/80"
                        >
                          {/* STUDENT */}

                          <td className="px-6 py-5">
                            <StudentIdentity
                              student={
                                record.student
                              }
                            />
                          </td>

                          {/* ACADEMIC */}

                          <td className="px-6 py-5">
                            <div className="flex items-start gap-2">
                              <FaGraduationCap className="mt-0.5 shrink-0 text-blue-500" />

                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  {getAcademicLabel(
                                    record.student
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {record
                                    .batch
                                    ?.semester ||
                                    "Semester not specified"}

                                  {" • "}

                                  {record
                                    .batch
                                    ?.school_year ||
                                    "School year not specified"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* BATCH */}

                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-slate-800">
                              {record
                                .batch
                                ?.batch_name ||
                                "—"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatScheduleDate(
                                record
                                  .batch
                                  ?.schedule_date
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatTime(
                                record
                                  .batch
                                  ?.start_time
                              )}

                              {" – "}

                              {formatTime(
                                record
                                  .batch
                                  ?.end_time
                              )}
                            </p>
                          </td>

                          {/* CLEARED ON */}

                          <td className="px-6 py-5">
                            <p className="text-sm font-semibold text-slate-700">
                              {formatDateTime(
                                record
                                  .assignment
                                  ?.reviewed_at ||
                                  record
                                    .assignment
                                    ?.updated_at
                              )}
                            </p>
                          </td>

                          {/* STATUS */}

                          <td className="px-6 py-5">
                            <ClearedBadge />
                          </td>

                          {/* ACTION */}

                          <td className="px-6 py-5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleViewStudent(
                                  record
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              View Record

                              <FaArrowRight />
                            </button>
                          </td>
                        </motion.tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* ================================================
                  MOBILE
              ================================================ */}

              <div className="grid gap-4 p-4 lg:hidden">
                {filteredRecords.map(
                  (
                    record,
                    index
                  ) => (
                    <motion.div
                      key={
                        record.id
                      }
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.03,
                      }}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      {/* TOP */}

                      <div className="flex items-start justify-between gap-3">
                        <StudentIdentity
                          student={
                            record.student
                          }
                        />

                        <ClearedBadge />
                      </div>

                      {/* INFO */}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <MobileInfo
                          icon={
                            FaGraduationCap
                          }
                          label="Academic"
                          value={getAcademicLabel(
                            record.student
                          )}
                        />

                        <MobileInfo
                          icon={
                            FaUsers
                          }
                          label="Batch"
                          value={
                            record
                              .batch
                              ?.batch_name ||
                            "—"
                          }
                        />

                        <MobileInfo
                          icon={
                            FaCalendarAlt
                          }
                          label="Schedule"
                          value={`${formatScheduleDate(
                            record
                              .batch
                              ?.schedule_date
                          )} • ${formatTime(
                            record
                              .batch
                              ?.start_time
                          )} – ${formatTime(
                            record
                              .batch
                              ?.end_time
                          )}`}
                        />

                        <MobileInfo
                          icon={
                            FaCheckCircle
                          }
                          label="Cleared On"
                          value={formatDateTime(
                            record
                              .assignment
                              ?.reviewed_at ||
                              record
                                .assignment
                                ?.updated_at
                          )}
                        />
                      </div>

                      {/* RESPONSE */}

                      {record
                        .assignment
                        ?.response && (
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                            Student
                            Response
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-700">
                            {
                              record
                                .assignment
                                .response
                            }
                          </p>
                        </div>
                      )}

                      {/* REMARKS */}

                      {record
                        .assignment
                        ?.guidance_remarks && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Guidance
                            Remarks
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-700">
                            {
                              record
                                .assignment
                                .guidance_remarks
                            }
                          </p>
                        </div>
                      )}

                      {/* VIEW */}

                      <button
                        type="button"
                        onClick={() =>
                          handleViewStudent(
                            record
                          )
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                      >
                        View Record

                        <FaArrowRight />
                      </button>
                    </motion.div>
                  )
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* FOOTER */}

        <p className="text-center text-[11px] text-slate-400">
          {guidanceOffice
            ?.office_name ||
            "Guidance Office"}

          {" • "}

          Individual Guidance
          clearance decisions
        </p>
      </div>
    </GuidanceLayout>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "emerald",
  small = false,
}) {
  const tones = {
    emerald:
      "border-emerald-100 bg-emerald-50 text-emerald-700",

    blue:
      "border-blue-100 bg-blue-50 text-blue-700",

    indigo:
      "border-indigo-100 bg-indigo-50 text-indigo-700",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        tones[tone] ||
        tones.emerald
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            {label}
          </p>

          <p
            className={`mt-1 truncate font-black text-slate-900 ${
              small
                ? "text-sm"
                : "text-2xl"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STUDENT IDENTITY
============================================================ */

function StudentIdentity({
  student,
}) {
  const name =
    getStudentName(student);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-black text-emerald-700">
        {name
          .charAt(0)
          .toUpperCase()}
      </div>

      <div className="min-w-0">
        <p className="max-w-[220px] truncate text-sm font-black text-slate-900">
          {name}
        </p>

        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
          <FaIdCard className="text-[10px]" />

          {getStudentNumber(
            student
          )}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CLEARED BADGE
============================================================ */

function ClearedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
      <FaCheckCircle />

      Cleared
    </span>
  );
}

/* ============================================================
   MOBILE INFO
============================================================ */

function MobileInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0 text-xs text-slate-400" />

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TABLE HEAD
============================================================ */

function TableHead({
  children,
}) {
  return (
    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

export default ClearedStudents;