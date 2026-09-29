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
  FaClock,
  FaExclamationCircle,
  FaFilter,
  FaGraduationCap,
  FaIdCard,
  FaQuestionCircle,
  FaRedo,
  FaSearch,
  FaSpinner,
  FaUndoAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

import GuidanceLayout from "../../layouts/GuidanceLayout";

import {
  getCurrentGuidanceUser,
  getGuidanceOffice,
  getGuidanceBatches,
  getGuidanceBatchStudents,
} from "../../services/guidanceService";

/* ============================================================
   HELPERS
============================================================ */

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

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
  if (!value) {
    return "—";
  }

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
  if (!value) {
    return "—";
  }

  const cleanValue = String(value)
    .split(".")[0];

  const parts =
    cleanValue.split(":");

  const hour =
    Number(parts[0]);

  const minute =
    Number(parts[1] || 0);

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
  student?.name ||
  "Unknown Student";

const getStudentNumber = (student) =>
  student?.student_id ||
  student?.student_number ||
  student?.school_id ||
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

function ReturnedStudents() {
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
     LOAD NEEDS FOLLOW-UP STUDENTS
  ============================================================ */

  const loadFollowUpStudents =
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
           * Load every student assignment
           * under each Guidance batch.
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

          const followUpRecords = [];

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
                   * IMPORTANT:
                   *
                   * Needs Follow-up is NOT
                   * clearance_steps.status = Rejected.
                   *
                   * It is a Guidance workflow
                   * state stored in:
                   *
                   * guidance_batch_students
                   * .guidance_status
                   */

                  if (
                    status !==
                    "needs follow-up"
                  ) {
                    return;
                  }

                  followUpRecords.push({
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
           * Most recently reviewed /
           * returned first.
           */

          followUpRecords.sort(
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
            followUpRecords
          );
        } catch (error) {
          console.error(
            "Unable to load Guidance follow-up students:",
            error
          );

          setRecords([]);

          await Swal.fire({
            icon: "error",

            title:
              "Unable to Load Follow-up Students",

            text:
              error?.message ||
              "Something went wrong while loading Guidance follow-up records.",

            confirmButtonColor:
              "#e11d48",
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadFollowUpStudents();
  }, [loadFollowUpStudents]);

  /* ============================================================
     BATCH OPTIONS
  ============================================================ */

  const batchOptions =
    useMemo(() => {
      const values = [
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

      return values.sort(
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
          const student =
            record.student;

          const batch =
            record.batch;

          const assignment =
            record.assignment;

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
              batch?.question,

              assignment?.response,

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

      await loadFollowUpStudents({
        silent: true,
      });
    };

  /* ============================================================
     VIEW RECORD
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
          "#e11d48",
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
            <FaSpinner className="mx-auto animate-spin text-4xl text-rose-600" />

            <p className="mt-4 text-sm font-bold text-slate-700">
              Loading follow-up
              students...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving Guidance
              follow-up records.
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
          <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-rose-50">
                  <FaUndoAlt />

                  Guidance Clearance
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                  Needs Follow-up
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-50/90">
                  Students who need to
                  provide additional
                  information or complete
                  another Guidance
                  requirement before
                  clearance approval.
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

          {/* ====================================================
              SUMMARY
          ==================================================== */}

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-8">

            <SummaryCard
              icon={FaUndoAlt}
              label="Needs Follow-up"
              value={records.length}
              tone="rose"
            />

            <SummaryCard
              icon={FaUsers}
              label="Affected Batches"
              value={batchOptions.length}
              tone="amber"
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
            INFORMATION
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.05,
          }}
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
        >
          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <FaExclamationCircle />
            </div>

            <div>
              <p className="text-sm font-black text-amber-900">
                Follow-up students
                remain pending for
                Guidance clearance.
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                After the student
                provides the requested
                follow-up response, the
                record returns to the
                Student Queue for
                Guidance review.
              </p>
            </div>

          </div>
        </motion.div>

        {/* ====================================================
            FILTERS
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
                placeholder="Search student, ID, course, batch, response or follow-up reason..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
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
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
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

              follow-up record
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
                className="text-xs font-bold text-rose-700 transition hover:text-rose-900"
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

          {/* TITLE */}

          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <FaUndoAlt />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Follow-up Records
                </h2>

                <p className="text-xs text-slate-500">
                  Students currently
                  waiting to complete a
                  Guidance follow-up.
                </p>
              </div>

            </div>
          </div>

          {/* ====================================================
              EMPTY
          ==================================================== */}

          {filteredRecords.length ===
          0 ? (
            <div className="px-6 py-16 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500">
                {records.length ===
                0 ? (
                  <FaUndoAlt />
                ) : (
                  <FaSearch />
                )}
              </div>

              <h3 className="mt-4 text-base font-black text-slate-800">
                {records.length ===
                0
                  ? "No Students Need Follow-up"
                  : "No Matching Records"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {records.length ===
                0
                  ? "There are currently no Guidance students requiring follow-up."
                  : "No follow-up student matches your current search or batch filter."}
              </p>

            </div>
          ) : (
            <>
              {/* ====================================================
                  DESKTOP TABLE
              ==================================================== */}

              <div className="hidden overflow-x-auto xl:block">

                <table className="w-full">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">

                      <TableHead>
                        Student
                      </TableHead>

                      <TableHead>
                        Batch
                      </TableHead>

                      <TableHead>
                        Student Response
                      </TableHead>

                      <TableHead>
                        Follow-up Reason
                      </TableHead>

                      <TableHead>
                        Returned On
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

                            <p className="mt-2 max-w-[220px] text-[11px] font-semibold text-slate-500">
                              {getAcademicLabel(
                                record.student
                              )}
                            </p>
                          </td>

                          {/* BATCH */}

                          <td className="px-6 py-5">

                            <p className="text-sm font-black text-slate-800">
                              {record
                                .batch
                                ?.batch_name ||
                                "—"}
                            </p>

                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                              <FaCalendarAlt className="text-[10px]" />

                              {formatScheduleDate(
                                record
                                  .batch
                                  ?.schedule_date
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <FaClock className="text-[9px]" />

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
                            </div>

                          </td>

                          {/* RESPONSE */}

                          <td className="px-6 py-5">

                            <div className="max-w-[280px] rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">

                              <p className="line-clamp-4 text-xs leading-5 text-slate-700">
                                {record
                                  .assignment
                                  ?.response ||
                                  "No response submitted."}
                              </p>

                            </div>

                          </td>

                          {/* REASON */}

                          <td className="px-6 py-5">

                            <div className="max-w-[300px] rounded-xl border border-rose-100 bg-rose-50 px-3 py-3">

                              <div className="flex items-start gap-2">

                                <FaExclamationCircle className="mt-0.5 shrink-0 text-rose-500" />

                                <p className="line-clamp-4 text-xs leading-5 text-rose-800">
                                  {record
                                    .assignment
                                    ?.guidance_remarks ||
                                    "Follow-up required by Guidance."}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* DATE */}

                          <td className="px-6 py-5">

                            <p className="text-sm font-semibold text-slate-600">
                              {formatDateTime(
                                record
                                  .assignment
                                  ?.reviewed_at ||
                                  record
                                    .assignment
                                    ?.updated_at
                              )}
                            </p>

                            <NeedsFollowUpBadge />

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
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
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

              {/* ====================================================
                  TABLET / MOBILE CARDS
              ==================================================== */}

              <div className="grid gap-4 p-4 xl:hidden">

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
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >

                      {/* TOP */}

                      <div className="flex items-start justify-between gap-3">

                        <StudentIdentity
                          student={
                            record.student
                          }
                        />

                        <NeedsFollowUpBadge />

                      </div>

                      {/* ACADEMIC */}

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">

                        <div className="flex items-start gap-2">

                          <FaGraduationCap className="mt-0.5 shrink-0 text-sm text-blue-500" />

                          <div>

                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Academic
                              Information
                            </p>

                            <p className="mt-1 text-xs font-bold leading-5 text-slate-700">
                              {getAcademicLabel(
                                record.student
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-500">
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

                      </div>

                      {/* BATCH */}

                      <div className="mt-3 rounded-xl border border-slate-200 p-3">

                        <div className="flex items-start gap-2">

                          <FaUsers className="mt-0.5 shrink-0 text-sm text-indigo-500" />

                          <div>

                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Guidance Batch
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-800">
                              {record
                                .batch
                                ?.batch_name ||
                                "—"}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">

                              <span className="inline-flex items-center gap-1">
                                <FaCalendarAlt />

                                {formatScheduleDate(
                                  record
                                    .batch
                                    ?.schedule_date
                                )}
                              </span>

                              <span className="inline-flex items-center gap-1">
                                <FaClock />

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
                              </span>

                            </div>

                          </div>

                        </div>

                      </div>

                      {/* QUESTION */}

                      <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">

                        <div className="flex items-start gap-2">

                          <FaQuestionCircle className="mt-0.5 shrink-0 text-violet-500" />

                          <div>

                            <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">
                              Guidance Question
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-700">
                              {record
                                .batch
                                ?.question ||
                                "No question provided."}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* PREVIOUS RESPONSE */}

                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">

                        <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                          Previous Student
                          Response
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-700">
                          {record
                            .assignment
                            ?.response ||
                            "No response submitted."}
                        </p>

                      </div>

                      {/* FOLLOW-UP REASON */}

                      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3">

                        <div className="flex items-start gap-2">

                          <FaExclamationCircle className="mt-0.5 shrink-0 text-rose-500" />

                          <div>

                            <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">
                              Follow-up Reason
                            </p>

                            <p className="mt-1 text-xs leading-5 text-rose-800">
                              {record
                                .assignment
                                ?.guidance_remarks ||
                                "Follow-up required by Guidance."}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* RETURNED DATE */}

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">

                        <div>

                          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                            Sent for
                            Follow-up
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {formatDateTime(
                              record
                                .assignment
                                ?.reviewed_at ||
                                record
                                  .assignment
                                  ?.updated_at
                            )}
                          </p>

                        </div>

                      </div>

                      {/* VIEW */}

                      <button
                        type="button"
                        onClick={() =>
                          handleViewStudent(
                            record
                          )
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
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

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <p className="text-center text-[11px] text-slate-400">
          {guidanceOffice
            ?.office_name ||
            "Guidance Office"}

          {" • "}

          Follow-up students remain
          pending until individually
          approved by Guidance
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
  tone = "rose",
  small = false,
}) {
  const tones = {
    rose:
      "border-rose-100 bg-rose-50 text-rose-700",

    amber:
      "border-amber-100 bg-amber-50 text-amber-700",

    indigo:
      "border-indigo-100 bg-indigo-50 text-indigo-700",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        tones[tone] ||
        tones.rose
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

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 font-black text-rose-700">
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
   NEEDS FOLLOW-UP BADGE
============================================================ */

function NeedsFollowUpBadge() {
  return (
    <span className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700">
      <FaUndoAlt />

      Needs Follow-up
    </span>
  );
}

/* ============================================================
   TABLE HEADER
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

export default ReturnedStudents;