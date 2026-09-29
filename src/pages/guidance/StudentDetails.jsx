import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { motion } from "framer-motion";
import Swal from "sweetalert2";

import GuidanceLayout from "../../layouts/GuidanceLayout";

import {
  getCurrentGuidanceUser,
  getGuidanceOffice,
  getGuidanceBatches,
  getGuidanceBatchStudents,
  reviewGuidanceStudent,
} from "../../services/guidanceService";

import {
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaFileAlt,
  FaGraduationCap,
  FaHashtag,
  FaIdCard,
  FaInfoCircle,
  FaQuestionCircle,
  FaRedoAlt,
  FaSpinner,
  FaSyncAlt,
  FaUndoAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

/* ============================================================
   HELPERS
============================================================ */

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
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
  if (!value) return "N/A";

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) return "N/A";

  const cleanTime = String(value)
    .split(".")[0];

  const [hourValue, minuteValue] =
    cleanTime.split(":");

  const hour = Number(hourValue);
  const minute = Number(
    minuteValue || 0
  );

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

const getGuidanceStatusConfig = (
  status
) => {
  const normalized =
    normalizeStatus(status);

  if (normalized === "approved") {
    return {
      label: "Approved",
      icon: FaCheckCircle,
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      panel:
        "border-emerald-200 bg-emerald-50/70",
      iconBox:
        "bg-emerald-100 text-emerald-600",
    };
  }

  if (
    normalized ===
    "needs follow-up"
  ) {
    return {
      label: "Needs Follow-up",
      icon: FaUndoAlt,
      badge:
        "border-rose-200 bg-rose-50 text-rose-700",
      panel:
        "border-rose-200 bg-rose-50/70",
      iconBox:
        "bg-rose-100 text-rose-600",
    };
  }

  if (
    normalized === "for review" ||
    normalized === "answered"
  ) {
    return {
      label: "For Guidance Review",
      icon: FaFileAlt,
      badge:
        "border-blue-200 bg-blue-50 text-blue-700",
      panel:
        "border-blue-200 bg-blue-50/70",
      iconBox:
        "bg-blue-100 text-blue-600",
    };
  }

  if (normalized === "scheduled") {
    return {
      label: "Scheduled",
      icon: FaCalendarAlt,
      badge:
        "border-violet-200 bg-violet-50 text-violet-700",
      panel:
        "border-violet-200 bg-violet-50/70",
      iconBox:
        "bg-violet-100 text-violet-600",
    };
  }

  return {
    label: status || "Pending",
    icon: FaClock,
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    panel:
      "border-amber-200 bg-amber-50/70",
    iconBox:
      "bg-amber-100 text-amber-600",
  };
};

/* ============================================================
   PAGE
============================================================ */

function StudentDetails() {
  const { stepId } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [reviewing, setReviewing] =
    useState(false);

  const [counselor, setCounselor] =
    useState(null);

  const [
    guidanceOffice,
    setGuidanceOffice,
  ] = useState(null);

  const [record, setRecord] =
    useState(null);

  /* ============================================================
     LOAD EXACT GUIDANCE RECORD
  ============================================================ */

  const loadStudentDetails =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          if (!stepId) {
            throw new Error(
              "No Guidance clearance record was selected."
            );
          }

          /*
           * Current Guidance user
           */

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
                "Unable to load Guidance Office."
            );
          }

          if (!batchesResult.success) {
            throw new Error(
              batchesResult.error ||
                "Unable to load Guidance batches."
            );
          }

          setCounselor(
            userResult.data
          );

          setGuidanceOffice(
            officeResult.data
          );

          const batches =
            batchesResult.data || [];

          let matchedRecord = null;

          /*
           * Search Guidance batch assignments
           * for the exact clearance_step_id
           * coming from the route.
           */

          for (const batch of batches) {
            const studentsResult =
              await getGuidanceBatchStudents(
                batch.id
              );

            if (
              !studentsResult.success
            ) {
              throw new Error(
                studentsResult.error ||
                  `Unable to load students for ${batch.batch_name}.`
              );
            }

            const students =
              studentsResult.data || [];

            const assignment =
              students.find(
                (item) =>
                  String(
                    item
                      ?.clearance_step_id
                  ) ===
                  String(stepId)
              );

            if (assignment) {
              matchedRecord = {
                batch,
                assignment,
                student:
                  assignment.student ||
                  null,
                section:
                  assignment.section ||
                  null,
                request:
                  assignment
                    .clearance_request ||
                  assignment.request ||
                  null,
              };

              break;
            }
          }

          if (!matchedRecord) {
            throw new Error(
              "This student is not assigned to a Guidance batch or the Guidance record could not be found."
            );
          }

          setRecord(
            matchedRecord
          );
        } catch (error) {
          console.error(
            "Guidance StudentDetails:",
            error
          );

          setRecord(null);

          if (!silent) {
            await Swal.fire({
              icon: "error",
              title:
                "Unable to Open Student",
              text:
                error?.message ||
                "The Guidance record could not be loaded.",
              confirmButtonColor:
                "#2563eb",
            });
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [stepId]
    );

  useEffect(() => {
    loadStudentDetails();
  }, [loadStudentDetails]);

  /* ============================================================
     DERIVED DATA
  ============================================================ */

  const assignment =
    record?.assignment;

  const batch =
    record?.batch;

  const student =
    record?.student;

  const section =
    record?.section;

  const guidanceStatus =
    assignment?.guidance_status ||
    "Scheduled";

  const statusConfig =
    useMemo(
      () =>
        getGuidanceStatusConfig(
          guidanceStatus
        ),
      [guidanceStatus]
    );

  const StatusIcon =
    statusConfig.icon;

  const canReview =
    normalizeStatus(
      guidanceStatus
    ) === "for review" ||
    normalizeStatus(
      guidanceStatus
    ) === "answered";

  const course =
    section?.course ||
    student?.course ||
    "N/A";

  const yearLevel =
    section?.year_level ||
    student?.year_level ||
    "N/A";

  const block =
    section?.block_code ||
    student?.block ||
    student?.section ||
    "N/A";

  const semester =
    batch?.semester ||
    record?.request?.semester ||
    student?.semester ||
    "N/A";

  const schoolYear =
    batch?.school_year ||
    record?.request?.school_year ||
    student?.school_year ||
    "N/A";

  /* ============================================================
     APPROVE STUDENT
  ============================================================ */

  const handleApprove =
    async () => {
      if (!assignment?.id) {
        return;
      }

      if (!canReview) {
        await Swal.fire({
          icon: "info",
          title:
            "Not Ready for Review",
          text:
            "This student does not currently have a response waiting for Guidance review.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const result =
        await Swal.fire({
          icon: "question",

          title:
            "Approve Guidance Clearance?",

          html: `
            <div style="text-align:left">
              <p>
                You are about to approve
                <strong>${student?.full_name || "this student"}</strong>
                for Guidance clearance.
              </p>

              <p style="margin-top:10px;font-size:13px;color:#64748b;">
                This decision applies only to this student's individual Guidance clearance.
              </p>
            </div>
          `,

          input: "textarea",

          inputLabel:
            "Guidance remarks (optional)",

          inputPlaceholder:
            "Example: Guidance requirement completed.",

          inputAttributes: {
            maxlength: "500",
          },

          showCancelButton: true,

          confirmButtonText:
            "Approve Student",

          cancelButtonText:
            "Cancel",

          confirmButtonColor:
            "#059669",
        });

      if (!result.isConfirmed) {
        return;
      }

      try {
        setReviewing(true);

        const reviewResult =
          await reviewGuidanceStudent(
            assignment.id,
            "Approved",
            result.value?.trim() ||
              null
          );

        if (
          !reviewResult.success
        ) {
          throw new Error(
            reviewResult.error ||
              "Unable to approve student."
          );
        }

        await Swal.fire({
          icon: "success",

          title:
            "Guidance Approved",

          text:
            `${student?.full_name || "The student"} has been individually approved by Guidance.`,

          confirmButtonColor:
            "#059669",
        });

        await loadStudentDetails(
          true
        );
      } catch (error) {
        console.error(
          "Guidance approval:",
          error
        );

        await Swal.fire({
          icon: "error",

          title:
            "Unable to Approve",

          text:
            error?.message ||
            "The Guidance decision could not be saved.",

          confirmButtonColor:
            "#dc2626",
        });
      } finally {
        setReviewing(false);
      }
    };

  /* ============================================================
     NEEDS FOLLOW-UP
  ============================================================ */

  const handleFollowUp =
    async () => {
      if (!assignment?.id) {
        return;
      }

      if (!canReview) {
        await Swal.fire({
          icon: "info",

          title:
            "Not Ready for Review",

          text:
            "This student does not currently have a response waiting for Guidance review.",

          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const result =
        await Swal.fire({
          icon: "warning",

          title:
            "Request Follow-up?",

          html: `
            <div style="text-align:left">
              <p>
                Tell
                <strong>${student?.full_name || "the student"}</strong>
                what still needs to be completed.
              </p>

              <p style="margin-top:10px;font-size:13px;color:#64748b;">
                Keep the reason limited to the student's clearance requirement.
              </p>
            </div>
          `,

          input: "textarea",

          inputLabel:
            "Follow-up reason",

          inputPlaceholder:
            "Example: Please provide the missing Guidance requirement.",

          inputAttributes: {
            maxlength: "500",
          },

          showCancelButton: true,

          confirmButtonText:
            "Send Follow-up",

          cancelButtonText:
            "Cancel",

          confirmButtonColor:
            "#e11d48",

          preConfirm: (value) => {
            const remarks =
              value?.trim();

            if (!remarks) {
              Swal.showValidationMessage(
                "Please provide a follow-up reason."
              );

              return false;
            }

            return remarks;
          },
        });

      if (!result.isConfirmed) {
        return;
      }

      try {
        setReviewing(true);

        const reviewResult =
          await reviewGuidanceStudent(
            assignment.id,
            "Needs Follow-up",
            result.value.trim()
          );

        if (
          !reviewResult.success
        ) {
          throw new Error(
            reviewResult.error ||
              "Unable to request follow-up."
          );
        }

        await Swal.fire({
          icon: "success",

          title:
            "Follow-up Requested",

          text:
            "The student has been moved to Needs Follow-up.",

          confirmButtonColor:
            "#2563eb",
        });

        await loadStudentDetails(
          true
        );
      } catch (error) {
        console.error(
          "Guidance follow-up:",
          error
        );

        await Swal.fire({
          icon: "error",

          title:
            "Unable to Save Follow-up",

          text:
            error?.message ||
            "The Guidance follow-up could not be saved.",

          confirmButtonColor:
            "#dc2626",
        });
      } finally {
        setReviewing(false);
      }
    };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-4xl text-blue-600" />

            <p className="mt-4 text-sm font-bold text-slate-700">
              Loading Guidance
              record...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving student,
              batch and response
              information.
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  /* ============================================================
     NOT FOUND
  ============================================================ */

  if (!record) {
    return (
      <GuidanceLayout>
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/guidance/requirements"
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-600"
          >
            <FaArrowLeft />

            Back to Student Queue
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
              <FaExclamationTriangle />
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900">
              Guidance Record Not
              Available
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The selected student is
              not currently associated
              with an accessible
              Guidance batch record.
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
      <div className="mx-auto max-w-7xl space-y-6">

        {/* TOP ACTIONS */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <FaArrowLeft />

            Back
          </button>

          <button
            type="button"
            disabled={
              refreshing ||
              reviewing
            }
            onClick={() =>
              loadStudentDetails(
                true
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* ====================================================
            HEADER
        ==================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white sm:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl">
                  <FaUserGraduate />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                    Guidance Student
                    Record
                  </p>

                  <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">
                    {student?.full_name ||
                      "Student"}
                  </h1>

                  <p className="mt-2 text-sm text-blue-100">
                    Student ID:{" "}
                    <span className="font-black text-white">
                      {student?.student_id ||
                        "N/A"}
                    </span>
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex self-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-black lg:self-auto ${statusConfig.badge}`}
              >
                <StatusIcon />

                {statusConfig.label}
              </span>

            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <HeaderInfo
              icon={
                FaGraduationCap
              }
              label="Course"
              value={course}
            />

            <HeaderInfo
              icon={FaHashtag}
              label="Year / Block"
              value={`${yearLevel} • ${block}`}
            />

            <HeaderInfo
              icon={
                FaCalendarAlt
              }
              label="Semester"
              value={semester}
            />

            <HeaderInfo
              icon={FaIdCard}
              label="School Year"
              value={schoolYear}
            />
          </div>
        </motion.section>

        {/* ====================================================
            CONTENT GRID
        ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

          {/* LEFT */}

          <div className="space-y-6">

            {/* STUDENT INFO */}

            <ContentCard
              title="Student Information"
              description="Academic information associated with this Guidance clearance."
              icon={FaUserGraduate}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={
                    FaUserGraduate
                  }
                  label="Full Name"
                  value={
                    student?.full_name
                  }
                />

                <DetailItem
                  icon={FaIdCard}
                  label="Student ID"
                  value={
                    student?.student_id
                  }
                />

                <DetailItem
                  icon={FaEnvelope}
                  label="Email"
                  value={
                    student?.email
                  }
                />

                <DetailItem
                  icon={
                    FaGraduationCap
                  }
                  label="Course"
                  value={course}
                />

                <DetailItem
                  icon={FaHashtag}
                  label="Year Level"
                  value={yearLevel}
                />

                <DetailItem
                  icon={FaBuilding}
                  label="Block / Section"
                  value={block}
                />
              </div>
            </ContentCard>

            {/* ====================================================
                BATCH + SCHEDULE
            ==================================================== */}

            <ContentCard
              title="Guidance Batch & Schedule"
              description="The Guidance session assigned to this student."
              icon={FaUsers}
            >
              <div className="grid gap-4 sm:grid-cols-2">

                <DetailItem
                  icon={FaUsers}
                  label="Batch"
                  value={
                    batch?.batch_name
                  }
                />

                <DetailItem
                  icon={
                    FaCalendarAlt
                  }
                  label="Schedule Date"
                  value={formatScheduleDate(
                    batch?.schedule_date
                  )}
                />

                <DetailItem
                  icon={FaClock}
                  label="Start Time"
                  value={formatTime(
                    batch?.start_time
                  )}
                />

                <DetailItem
                  icon={FaClock}
                  label="End Time"
                  value={formatTime(
                    batch?.end_time
                  )}
                />

                <DetailItem
                  icon={
                    FaGraduationCap
                  }
                  label="Semester"
                  value={
                    batch?.semester ||
                    semester
                  }
                />

                <DetailItem
                  icon={FaIdCard}
                  label="School Year"
                  value={
                    batch?.school_year ||
                    schoolYear
                  }
                />

              </div>
            </ContentCard>

            {/* ====================================================
                QUESTION
            ==================================================== */}

            <ContentCard
              title="Guidance Requirement"
              description="Question or requirement assigned to this Guidance batch."
              icon={
                FaQuestionCircle
              }
            >
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-violet-600">
                  Question /
                  Requirement
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                  {batch?.question ||
                    "No Guidance question was provided."}
                </p>
              </div>

              {batch?.instructions && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Instructions
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {
                      batch.instructions
                    }
                  </p>
                </div>
              )}
            </ContentCard>

            {/* ====================================================
                STUDENT RESPONSE
            ==================================================== */}

            <ContentCard
              title="Student Response"
              description="Response submitted by the student for this Guidance requirement."
              icon={FaFileAlt}
            >
              {assignment?.response ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {
                      assignment.response
                    }
                  </p>

                  {assignment
                    ?.response_submitted_at && (
                    <div className="mt-4 border-t border-blue-100 pt-3">
                      <p className="text-xs text-blue-600">
                        Submitted{" "}
                        <span className="font-bold">
                          {formatDateTime(
                            assignment.response_submitted_at
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <FaFileAlt className="mx-auto text-2xl text-slate-300" />

                  <p className="mt-3 text-sm font-bold text-slate-600">
                    No response
                    submitted yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    The student's
                    response will appear
                    here once submitted.
                  </p>
                </div>
              )}
            </ContentCard>

            {/* ====================================================
                GUIDANCE REMARKS
            ==================================================== */}

            <ContentCard
              title="Guidance Remarks"
              description="Latest clearance-related remarks recorded by Guidance."
              icon={FaInfoCircle}
            >
              {assignment
                ?.guidance_remarks ? (
                <div
                  className={`rounded-2xl border p-4 ${
                    normalizeStatus(
                      guidanceStatus
                    ) ===
                    "needs follow-up"
                      ? "border-rose-100 bg-rose-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {
                      assignment.guidance_remarks
                    }
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No Guidance remarks
                  have been recorded.
                </p>
              )}

              {assignment
                ?.reviewed_at && (
                <p className="mt-3 text-xs text-slate-400">
                  Last reviewed:{" "}
                  <span className="font-semibold text-slate-600">
                    {formatDateTime(
                      assignment.reviewed_at
                    )}
                  </span>
                </p>
              )}
            </ContentCard>

          </div>

          {/* ====================================================
              RIGHT
          ==================================================== */}

          <div className="space-y-6">

            {/* STATUS */}

            <motion.section
              initial={{
                opacity: 0,
                x: 12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className={`rounded-2xl border p-5 ${statusConfig.panel}`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${statusConfig.iconBox}`}
              >
                <StatusIcon />
              </div>

              <h2 className="mt-4 text-lg font-black text-slate-900">
                Guidance Status
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Current Guidance
                workflow state for this
                individual student.
              </p>

              <div className="mt-4 rounded-xl border border-white/80 bg-white/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Current Status
                </p>

                <p className="mt-1 text-lg font-black text-slate-900">
                  {statusConfig.label}
                </p>
              </div>
            </motion.section>

            {/* ====================================================
                REVIEW ACTIONS
            ==================================================== */}

            <motion.section
              initial={{
                opacity: 0,
                x: 12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.08,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-black text-slate-900">
                Guidance Review
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review the student's
                submitted response
                before making an
                individual clearance
                decision.
              </p>

              {canReview ? (
                <div className="mt-5 space-y-3">

                  <button
                    type="button"
                    disabled={
                      reviewing
                    }
                    onClick={
                      handleApprove
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewing ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaCheckCircle />
                    )}

                    Approve Guidance
                  </button>

                  <button
                    type="button"
                    disabled={
                      reviewing
                    }
                    onClick={
                      handleFollowUp
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaUndoAlt />

                    Needs Follow-up
                  </button>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <div className="flex items-start gap-2">
                      <FaInfoCircle className="mt-0.5 shrink-0 text-blue-500" />

                      <p className="text-xs leading-5 text-blue-700">
                        Each student is
                        reviewed
                        individually.
                        Batch membership
                        does not
                        automatically
                        approve the
                        student.
                      </p>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon className="mt-0.5 shrink-0 text-slate-500" />

                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {normalizeStatus(
                          guidanceStatus
                        ) === "approved"
                          ? "Review Completed"
                          : normalizeStatus(
                                guidanceStatus
                              ) ===
                              "needs follow-up"
                            ? "Waiting for Student Follow-up"
                            : "Waiting for Student Response"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {normalizeStatus(
                          guidanceStatus
                        ) === "approved"
                          ? "This student has already been approved by Guidance."
                          : normalizeStatus(
                                guidanceStatus
                              ) ===
                              "needs follow-up"
                            ? "The student must complete the requested follow-up before another Guidance review."
                            : "Review actions become available after the student submits a response."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>

            {/* ====================================================
                BATCH SUMMARY
            ==================================================== */}

            <motion.section
              initial={{
                opacity: 0,
                x: 12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.12,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-black text-slate-900">
                Batch Details
              </h2>

              <div className="mt-4 space-y-4">
                <SmallInfo
                  label="Batch"
                  value={
                    batch?.batch_name
                  }
                />

                <SmallInfo
                  label="Schedule"
                  value={formatScheduleDate(
                    batch?.schedule_date
                  )}
                />

                <SmallInfo
                  label="Time"
                  value={`${formatTime(
                    batch?.start_time
                  )} – ${formatTime(
                    batch?.end_time
                  )}`}
                />

                <SmallInfo
                  label="Batch Status"
                  value={
                    batch?.status ||
                    "N/A"
                  }
                />

                <SmallInfo
                  label="Semester"
                  value={semester}
                />

                <SmallInfo
                  label="School Year"
                  value={schoolYear}
                />
              </div>
            </motion.section>

            {/* ====================================================
                REVIEW INFORMATION
            ==================================================== */}

            <motion.section
              initial={{
                opacity: 0,
                x: 12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.16,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-black text-slate-900">
                Review Information
              </h2>

              <div className="mt-4 space-y-4">
                <SmallInfo
                  label="Office"
                  value={
                    guidanceOffice
                      ?.office_name ||
                    "Guidance"
                  }
                />

                <SmallInfo
                  label="Counselor"
                  value={
                    counselor
                      ?.full_name ||
                    "Guidance Counselor"
                  }
                />

                <SmallInfo
                  label="Response Submitted"
                  value={formatDateTime(
                    assignment
                      ?.response_submitted_at
                  )}
                />

                <SmallInfo
                  label="Last Reviewed"
                  value={formatDateTime(
                    assignment
                      ?.reviewed_at
                  )}
                />
              </div>
            </motion.section>

            {/* BACK TO QUEUE */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/guidance/requirements"
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
            >
              <FaArrowLeft />

              Back to Student Queue
            </button>

          </div>
        </div>
      </div>
    </GuidanceLayout>
  );
}

/* ============================================================
   CONTENT CARD
============================================================ */

function ContentCard({
  title,
  description,
  icon: Icon,
  children,
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {children}
    </motion.section>
  );
}

/* ============================================================
   HEADER INFO
============================================================ */

function HeaderInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        <Icon />

        <span>{label}</span>
      </div>

      <p className="mt-2 truncate text-sm font-black text-slate-800">
        {value || "N/A"}
      </p>
    </div>
  );
}

/* ============================================================
   DETAIL ITEM
============================================================ */

function DetailItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-black text-slate-800">
            {value || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SMALL INFO
============================================================ */

function SmallInfo({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <span className="max-w-[190px] break-words text-right text-xs font-black text-slate-700">
        {value || "N/A"}
      </span>
    </div>
  );
}

export default StudentDetails;