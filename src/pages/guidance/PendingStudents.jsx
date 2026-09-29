import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaCalendarAlt,
  FaClock,
  FaPlus,
  FaRedo,
  FaSearch,
  FaSpinner,
  FaUsers,
  FaQuestionCircle,
  FaPlay,
  FaStop,
  FaCheckCircle,
  FaClipboardList,
  FaUserPlus,
  FaTimes,
  FaIdCard,
  FaGraduationCap,
  FaHourglassHalf,
} from "react-icons/fa";

import GuidanceLayout from "../../layouts/GuidanceLayout";

import {
  addStudentToGuidanceBatch,
  createGuidanceBatch,
  getGuidanceBatches,
  getGuidanceEligibleStudents,
  getGuidanceBatchStudents,
  updateGuidanceBatch,
} from "../../services/guidanceService";

// ============================================================
// INITIAL FORM
// ============================================================

const INITIAL_FORM = {
  batch_name: "",
  school_year: "",
  semester: "",
  schedule_date: "",
  start_time: "",
  end_time: "",
  question: "",
  instructions: "",
  max_students: 30,
};

// ============================================================
// NORMALIZERS
// ============================================================

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeSchoolYear = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");

const normalizeSemester = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// ============================================================
// DATE / TIME HELPERS
// ============================================================

const formatDate = (date) => {
  if (!date) {
    return "No date";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatTime = (time) => {
  if (!time) {
    return "—";
  }

  const [hourString, minuteString] =
    String(time).split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString || 0);

  if (Number.isNaN(hour)) {
    return time;
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

// ============================================================
// GUIDANCE SCHEDULE STATE
// ============================================================

const cleanDatabaseTime = (time) => {
  if (!time) {
    return "";
  }

  return String(time).split(".")[0];
};

const createScheduleDate = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const cleanTime = cleanDatabaseTime(time);

  const result = new Date(
    `${date}T${cleanTime}+08:00`
  );

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
};

const getBatchScheduleState = (batch) => {
  if (!batch) {
    return "Unknown";
  }

  const databaseStatus = batch.status || "Draft";

  if (databaseStatus === "Cancelled") {
    return "Cancelled";
  }

  if (databaseStatus === "Completed") {
    return "Completed";
  }

  if (databaseStatus === "Closed") {
    return "Closed";
  }

  if (databaseStatus === "Draft") {
    return "Draft";
  }

  const start = createScheduleDate(
    batch.schedule_date,
    batch.start_time
  );

  const end = createScheduleDate(
    batch.schedule_date,
    batch.end_time
  );

  if (!start || !end) {
    return databaseStatus;
  }

  const now = new Date();

  if (databaseStatus === "Open") {
    if (now < start) {
      return "Upcoming";
    }

    if (now >= start && now <= end) {
      return "Session Open";
    }

    if (now > end) {
      return "Session Ended";
    }
  }

  return databaseStatus;
};

const getScheduleDescription = (batch) => {
  const state = getBatchScheduleState(batch);

  switch (state) {
    case "Draft":
      return "This schedule is still a draft. Add students first, then publish it when ready.";

    case "Upcoming":
      return "The schedule is published. Student responses will automatically unlock when the scheduled time starts.";

    case "Session Open":
      return "The scheduled session is active now. Assigned students may submit their Guidance response.";

    case "Session Ended":
      return "The scheduled response window has ended. New student submissions are blocked.";

    case "Closed":
      return "This batch was manually closed. Students cannot submit responses.";

    case "Completed":
      return "This Guidance batch has been completed.";

    case "Cancelled":
      return "This Guidance batch has been cancelled.";

    default:
      return "Guidance schedule information is available for this batch.";
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Session Open":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Upcoming":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Session Ended":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "Closed":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Completed":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "Draft":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

// ============================================================
// PAGE
// ============================================================

function PendingStudents() {
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [batches, setBatches] = useState([]);

  const [batchCounts, setBatchCounts] = useState({});

  const [
    eligibleStudents,
    setEligibleStudents,
  ] = useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    showStudentModal,
    setShowStudentModal,
  ] = useState(false);

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState(null);

  const [
    selectedStudents,
    setSelectedStudents,
  ] = useState([]);

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  // =========================================================
  // SORT STUDENTS
  // =========================================================

  const sortEligibleStudents =
    useCallback((students) => {
      return [...(students || [])].sort(
        (a, b) => {
          const nameA = String(
            a.student?.full_name || ""
          );

          const nameB = String(
            b.student?.full_name || ""
          );

          const nameCompare =
            nameA.localeCompare(nameB);

          if (nameCompare !== 0) {
            return nameCompare;
          }

          return (
            new Date(
              b.requestedAt || 0
            ).getTime() -
            new Date(
              a.requestedAt || 0
            ).getTime()
          );
        }
      );
    }, []);

  // =========================================================
  // LOAD ELIGIBLE STUDENTS
  // =========================================================

  const loadEligibleStudents =
    useCallback(async () => {
      const result =
        await getGuidanceEligibleStudents();

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to load eligible Guidance students."
        );
      }

      const sorted =
        sortEligibleStudents(
          result.data || []
        );

      setEligibleStudents(sorted);

      return sorted;
    }, [sortEligibleStudents]);

  // =========================================================
  // LOAD PER-BATCH GUIDANCE COUNTS
  // =========================================================

  const loadBatchCounts = useCallback(async (batchList = []) => {
    const entries = await Promise.all(
      (batchList || []).map(async (batch) => {
        const result = await getGuidanceBatchStudents(batch.id);

        if (!result.success) {
          throw new Error(
            result.error ||
              `Unable to load students for ${batch.batch_name || "Guidance batch"}.`
          );
        }

        const students = result.data || [];

        const counts = students.reduce(
          (acc, item) => {
            const status = String(item.guidance_status || "Scheduled")
              .trim()
              .toLowerCase();

            acc.assigned += 1;

            if (status === "scheduled") {
              acc.scheduled += 1;
            } else if (status === "for review" || status === "answered") {
              acc.forReview += 1;
            } else if (status === "needs follow-up") {
              acc.needsFollowUp += 1;
            } else if (status === "approved") {
              acc.approved += 1;
            }

            return acc;
          },
          {
            assigned: 0,
            scheduled: 0,
            forReview: 0,
            needsFollowUp: 0,
            approved: 0,
          }
        );

        return [batch.id, counts];
      })
    );

    const nextCounts = Object.fromEntries(entries);
    setBatchCounts(nextCounts);
    return nextCounts;
  }, []);

  // =========================================================
  // LOAD PAGE
  // =========================================================

  const loadPage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const [
          batchResult,
          eligibleResult,
        ] = await Promise.all([
          getGuidanceBatches(),
          getGuidanceEligibleStudents(),
        ]);

        if (!batchResult.success) {
          throw new Error(
            batchResult.error
          );
        }

        if (!eligibleResult.success) {
          throw new Error(
            eligibleResult.error
          );
        }

        const loadedBatches =
          batchResult.data || [];

        await loadBatchCounts(
          loadedBatches
        );

        setBatches(
          loadedBatches
        );

        setEligibleStudents(
          sortEligibleStudents(
            eligibleResult.data || []
          )
        );
      } catch (error) {
        console.error(
          "Guidance schedule page:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Guidance Schedule",
          text:
            error?.message ||
            "Something went wrong while loading the Guidance schedule.",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadBatchCounts, sortEligibleStudents]
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // =========================================================
  // AUTOMATIC UI CLOCK REFRESH
  // =========================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setBatches((current) => [
        ...current,
      ]);
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // =========================================================
  // FILTER BATCHES
  // =========================================================

  const filteredBatches =
    useMemo(() => {
      const query =
        normalize(searchTerm);

      if (!query) {
        return batches;
      }

      return batches.filter(
        (batch) => {
          const scheduleState =
            getBatchScheduleState(batch);

          return (
            normalize(
              batch.batch_name
            ).includes(query) ||
            normalize(
              batch.school_year
            ).includes(query) ||
            normalize(
              batch.semester
            ).includes(query) ||
            normalize(
              batch.status
            ).includes(query) ||
            normalize(
              scheduleState
            ).includes(query)
          );
        }
      );
    }, [batches, searchTerm]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    return {
      total: batches.length,

      open: batches.filter(
        (batch) =>
          getBatchScheduleState(
            batch
          ) === "Session Open"
      ).length,

      upcoming: batches.filter(
        (batch) =>
          getBatchScheduleState(
            batch
          ) === "Upcoming"
      ).length,

      waiting:
        eligibleStudents.length,
    };
  }, [
    batches,
    eligibleStudents,
  ]);

  // =========================================================
  // CREATE BATCH
  // =========================================================

  const handleCreateBatch =
    async (event) => {
      event.preventDefault();

      if (
        formData.end_time <=
        formData.start_time
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Invalid Schedule",
          text:
            "The end time must be later than the start time.",
          confirmButtonColor: "#2563eb",
        });

        return;
      }

      const start =
        createScheduleDate(
          formData.schedule_date,
          formData.start_time
        );

      const end =
        createScheduleDate(
          formData.schedule_date,
          formData.end_time
        );

      if (!start || !end) {
        await Swal.fire({
          icon: "warning",
          title: "Invalid Schedule",
          text:
            "Please provide a valid Guidance schedule.",
          confirmButtonColor: "#2563eb",
        });

        return;
      }

      try {
        setSaving(true);

        const result =
          await createGuidanceBatch({
            ...formData,

            school_year:
              formData.school_year.trim(),

            semester:
              formData.semester.trim(),

            max_students:
              Number(
                formData.max_students
              ),

            status: "Draft",
          });

        if (!result.success) {
          throw new Error(
            result.error
          );
        }

        setShowCreateModal(false);

        setFormData(INITIAL_FORM);

        await Swal.fire({
          icon: "success",
          title: "Batch Created",
          text:
            "The Guidance schedule was created successfully as a Draft.",
          confirmButtonColor: "#2563eb",
        });

        await loadPage({
          silent: true,
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Unable to Create Batch",
          text:
            error?.message ||
            "Please try again.",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // CHANGE DATABASE STATUS
  // =========================================================

  const changeBatchStatus =
    async (batch, status) => {
      let title = "Update Batch?";

      let text =
        "Are you sure you want to update this batch?";

      let confirmText = "Continue";

      if (status === "Open") {
        title =
          "Publish this schedule?";

        text =
          "Students assigned to this batch will see the schedule. Responses will only be accepted during the scheduled date and time.";

        confirmText =
          "Publish Schedule";
      }

      if (status === "Closed") {
        title =
          "Close this batch now?";

        text =
          "Students will immediately be blocked from submitting new Guidance responses.";

        confirmText =
          "Close Now";
      }

      if (status === "Completed") {
        title =
          "Complete this batch?";

        text =
          "This batch will be marked as completed.";

        confirmText =
          "Complete Batch";
      }

      const confirmation =
        await Swal.fire({
          icon: "question",
          title,
          text,
          showCancelButton: true,
          confirmButtonText:
            confirmText,
          cancelButtonText: "Cancel",
          confirmButtonColor:
            "#2563eb",
        });

      if (!confirmation.isConfirmed) {
        return;
      }

      const updateResult =
        await updateGuidanceBatch(
          batch.id,
          {
            status,
          }
        );

      if (!updateResult.success) {
        await Swal.fire({
          icon: "error",
          title: "Update Failed",
          text:
            updateResult.error,
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      await loadPage({
        silent: true,
      });
    };

  // =========================================================
  // EXTEND SESSION
  // =========================================================

  const extendBatchTime =
    async (batch, minutes) => {
      const currentEnd =
        createScheduleDate(
          batch.schedule_date,
          batch.end_time
        );

      if (!currentEnd) {
        await Swal.fire({
          icon: "error",
          title:
            "Invalid End Time",
          text:
            "Unable to determine the current session end time.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const newEnd = new Date(
        currentEnd.getTime() +
          minutes * 60 * 1000
      );

      const newDate =
        newEnd.toLocaleDateString(
          "en-CA",
          {
            timeZone:
              "Asia/Manila",
          }
        );

      if (
        newDate !==
        batch.schedule_date
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Cannot Extend",
          text:
            "This batch currently supports same-day schedules only.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const newTime =
        newEnd.toLocaleTimeString(
          "en-GB",
          {
            timeZone:
              "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        );

      const confirmation =
        await Swal.fire({
          icon: "question",
          title: `Extend ${minutes} minutes?`,
          html: `
            <div style="font-size:14px;line-height:1.6">
              Current end:
              <strong>${formatTime(
                batch.end_time
              )}</strong>
              <br/>
              New end:
              <strong>${formatTime(
                newTime
              )}</strong>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText:
            `Extend ${minutes} min`,
          cancelButtonText: "Cancel",
          confirmButtonColor:
            "#2563eb",
        });

      if (!confirmation.isConfirmed) {
        return;
      }

      try {
        setSaving(true);

        const result =
          await updateGuidanceBatch(
            batch.id,
            {
              end_time: newTime,
            }
          );

        if (!result.success) {
          throw new Error(
            result.error
          );
        }

        await loadPage({
          silent: true,
        });

        await Swal.fire({
          icon: "success",
          title:
            "Session Extended",
          text: `The session now ends at ${formatTime(
            newTime
          )}.`,
          confirmButtonColor:
            "#2563eb",
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Unable to Extend Session",
          text:
            error?.message ||
            "Please try again.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // OPEN STUDENT SELECTOR
  // =========================================================

  const openStudentSelector =
    async (batch) => {
      try {
        setSelectedBatch(batch);

        setSelectedStudents([]);

        setStudentSearch("");

        setShowStudentModal(true);

        await loadEligibleStudents();
      } catch (error) {
        console.error(
          "Open Guidance student selector:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Students",
          text:
            error?.message ||
            "Unable to load students waiting for Guidance scheduling.",
          confirmButtonColor:
            "#2563eb",
        });
      }
    };

  // =========================================================
  // ELIGIBLE STUDENTS FOR BATCH
  // =========================================================

  const eligibleForSelectedBatch =
    useMemo(() => {
      if (!selectedBatch) {
        return [];
      }

      const batchSchoolYear =
        normalizeSchoolYear(
          selectedBatch.school_year
        );

      const batchSemester =
        normalizeSemester(
          selectedBatch.semester
        );

      return eligibleStudents.filter(
        (item) => {
          const studentSchoolYear =
            normalizeSchoolYear(
              item.schoolYear
            );

          const studentSemester =
            normalizeSemester(
              item.semester
            );

          return (
            studentSchoolYear ===
              batchSchoolYear &&
            studentSemester ===
              batchSemester
          );
        }
      );
    }, [
      eligibleStudents,
      selectedBatch,
    ]);

  // =========================================================
  // SEARCH STUDENTS
  // =========================================================

  const displayedEligibleStudents =
    useMemo(() => {
      const query =
        normalize(studentSearch);

      if (!query) {
        return eligibleForSelectedBatch;
      }

      return eligibleForSelectedBatch.filter(
        (item) => {
          const student =
            item.student || {};

          const section =
            item.section || {};

          const searchable = [
            student.full_name,
            student.student_id,
            student.email,
            section.course,
            student.course,
            section.year_level,
            student.year_level,
            section.block_code,
            student.block,
            item.clearanceReference,
          ]
            .map(normalize)
            .join(" ");

          return searchable.includes(
            query
          );
        }
      );
    }, [
      eligibleForSelectedBatch,
      studentSearch,
    ]);

  // =========================================================
  // SELECT STUDENTS
  // =========================================================

  const toggleStudent = (
    clearanceStepId
  ) => {
    setSelectedStudents(
      (current) =>
        current.includes(
          clearanceStepId
        )
          ? current.filter(
              (id) =>
                id !==
                clearanceStepId
            )
          : [
              ...current,
              clearanceStepId,
            ]
    );
  };

  const toggleAllStudents = () => {
    if (
      displayedEligibleStudents.length ===
      0
    ) {
      return;
    }

    const visibleIds =
      displayedEligibleStudents.map(
        (item) =>
          item.clearanceStepId
      );

    const allSelected =
      visibleIds.every((id) =>
        selectedStudents.includes(id)
      );

    if (allSelected) {
      setSelectedStudents(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
      );

      return;
    }

    setSelectedStudents(
      (current) => [
        ...new Set([
          ...current,
          ...visibleIds,
        ]),
      ]
    );
  };

  // =========================================================
  // ADD STUDENTS
  // =========================================================

  const handleAddStudents =
    async () => {
      if (!selectedBatch) {
        return;
      }

      if (
        selectedStudents.length === 0
      ) {
        await Swal.fire({
          icon: "info",
          title: "Select Students",
          text:
            "Please select at least one student.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const currentAssigned =
        batchCounts[selectedBatch.id]?.assigned || 0;

      const remainingSlots = Math.max(
        Number(selectedBatch.max_students) - currentAssigned,
        0
      );

      if (
        selectedStudents.length >
        remainingSlots
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Batch Capacity Exceeded",
          text:
            remainingSlots > 0
              ? `This batch only has ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} remaining.`
              : "This Guidance batch is already full.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const confirmation =
        await Swal.fire({
          icon: "question",
          title:
            "Add Selected Students?",
          text: `${selectedStudents.length} clearance request(s) will be scheduled in ${selectedBatch.batch_name}.`,
          showCancelButton: true,
          confirmButtonText:
            "Add Students",
          cancelButtonText: "Cancel",
          confirmButtonColor:
            "#2563eb",
        });

      if (!confirmation.isConfirmed) {
        return;
      }

      try {
        setSaving(true);

        const selectedRecords =
          eligibleForSelectedBatch.filter(
            (item) =>
              selectedStudents.includes(
                item.clearanceStepId
              )
          );

        let addedCount = 0;

        for (const item of selectedRecords) {
          const result =
            await addStudentToGuidanceBatch(
              {
                batchId:
                  selectedBatch.id,

                clearanceStepId:
                  item.clearanceStepId,

                studentId:
                  item.studentId,
              }
            );

          if (!result.success) {
            throw new Error(
              result.error
            );
          }

          addedCount += 1;
        }

        setShowStudentModal(false);
        setSelectedBatch(null);
        setSelectedStudents([]);
        setStudentSearch("");

        await Swal.fire({
          icon: "success",
          title:
            "Students Scheduled",
          text: `${addedCount} clearance request(s) were added to the Guidance batch.`,
          confirmButtonColor:
            "#2563eb",
        });

        await loadPage({
          silent: true,
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Unable to Add Students",
          text:
            error?.message ||
            "Please try again.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);

      await loadPage({
        silent: true,
      });
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-4xl text-blue-600" />

            <p className="mt-4 text-sm font-bold text-slate-700">
              Loading Guidance schedule...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving batches and
              pending students.
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <GuidanceLayout>
      <div className="space-y-6">
        {/* HEADER */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              <FaCalendarAlt />
              Guidance Workspace
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Schedule & Batches
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Schedule Guidance clearance
              sessions and organize students
              into manageable batches.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FaRedo
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCreateModal(true)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FaPlus />
              Create Batch
            </button>
          </div>
        </motion.div>

        {/* STATS */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Batches"
            value={stats.total}
            icon={FaClipboardList}
            tone="blue"
          />

          <StatCard
            label="Open Now"
            value={stats.open}
            icon={FaPlay}
            tone="emerald"
          />

          <StatCard
            label="Upcoming"
            value={stats.upcoming}
            icon={FaHourglassHalf}
            tone="amber"
          />

          <StatCard
            label="Waiting for Schedule"
            value={stats.waiting}
            icon={FaUsers}
            tone="violet"
          />
        </div>

        {/* SEARCH */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search batch, school year, semester or status..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* BATCHES */}

        {filteredBatches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              <FaCalendarAlt />
            </div>

            <h2 className="mt-4 text-lg font-black text-slate-900">
              No Guidance Batches
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first Guidance
              schedule to organize students
              into manageable batches.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowCreateModal(true)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <FaPlus />
              Create First Batch
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredBatches.map(
              (batch) => {
                const sessionState =
                  getBatchScheduleState(
                    batch
                  );

                const counts =
                  batchCounts[batch.id] || {
                    assigned: 0,
                    scheduled: 0,
                    forReview: 0,
                    needsFollowUp: 0,
                    approved: 0,
                  };

                return (
                  <motion.div
                    key={batch.id}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusStyle(
                            sessionState
                          )}`}
                        >
                          {sessionState}
                        </span>

                        <h2 className="mt-3 text-lg font-black text-slate-900">
                          {batch.batch_name}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {batch.school_year} •{" "}
                          {batch.semester}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FaUsers />
                      </div>
                    </div>

                    {/* DATE + TIME */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <InfoItem
                        icon={FaCalendarAlt}
                        label="Schedule"
                        value={formatDate(
                          batch.schedule_date
                        )}
                      />

                      <InfoItem
                        icon={FaClock}
                        label="Time"
                        value={`${formatTime(
                          batch.start_time
                        )} – ${formatTime(
                          batch.end_time
                        )}`}
                      />
                    </div>

                    {/* SESSION STATE */}

                    <div
                      className={`mt-3 rounded-xl border p-4 ${getStatusStyle(
                        sessionState
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        <FaClock className="mt-0.5 shrink-0" />

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                            Session Control
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5">
                            {getScheduleDescription(
                              batch
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QUESTION */}

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <FaQuestionCircle className="mt-0.5 shrink-0 text-blue-600" />

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Guidance Question /
                            Requirement
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                            {batch.question}
                          </p>
                        </div>
                      </div>
                    </div>

                    {batch.instructions && (
                      <div className="mt-3 rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Instructions
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {batch.instructions}
                        </p>
                      </div>
                    )}

                    {/* BATCH PROGRESS */}

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Student Progress
                        </p>

                        <p className="text-[10px] font-bold text-slate-400">
                          {counts.assigned} / {batch.max_students} assigned
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <BatchCount
                          label="Assigned"
                          value={counts.assigned}
                          tone="blue"
                        />

                        <BatchCount
                          label="Scheduled"
                          value={counts.scheduled}
                          tone="slate"
                        />

                        <BatchCount
                          label="For Review"
                          value={counts.forReview}
                          tone="amber"
                        />

                        <BatchCount
                          label="Follow-up"
                          value={counts.needsFollowUp}
                          tone="red"
                        />

                        <BatchCount
                          label="Approved"
                          value={counts.approved}
                          tone="emerald"
                        />
                      </div>
                    </div>

                    {/* CAPACITY */}

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Batch Capacity
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          Up to{" "}
                          {batch.max_students}{" "}
                          students
                        </p>
                      </div>

                      <FaUsers className="text-slate-300" />
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {batch.status !==
                        "Completed" &&
                        batch.status !==
                          "Cancelled" && (
                          <button
                            type="button"
                            onClick={() =>
                              openStudentSelector(
                                batch
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            <FaUserPlus />
                            Add Students
                          </button>
                        )}

                      {batch.status ===
                        "Draft" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeBatchStatus(
                              batch,
                              "Open"
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          <FaPlay />
                          Publish Schedule
                        </button>
                      )}

                      {batch.status ===
                        "Open" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              extendBatchTime(
                                batch,
                                15
                              )
                            }
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <FaClock />
                            +15 min
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              extendBatchTime(
                                batch,
                                30
                              )
                            }
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            <FaClock />
                            +30 min
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              changeBatchStatus(
                                batch,
                                "Closed"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600"
                          >
                            <FaStop />
                            Close Now
                          </button>
                        </>
                      )}

                      {batch.status ===
                        "Closed" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              changeBatchStatus(
                                batch,
                                "Open"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <FaPlay />
                            Reopen
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              changeBatchStatus(
                                batch,
                                "Completed"
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            <FaCheckCircle />
                            Complete
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          CREATE BATCH MODAL
      ===================================================== */}

      {showCreateModal && (
        <ModalOverlay
          onClose={() => {
            if (!saving) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <ModalHeader
              title="Create Guidance Batch"
              subtitle="Set the schedule and clearance question."
              onClose={() => {
                if (!saving) {
                  setShowCreateModal(false);
                }
              }}
            />

            <form
              onSubmit={handleCreateBatch}
              className="max-h-[75vh] overflow-y-auto p-5 sm:p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Batch Name"
                  required
                >
                  <input
                    required
                    type="text"
                    value={
                      formData.batch_name
                    }
                    onChange={(event) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          batch_name:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Example: BSIT Batch 01"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Maximum Students"
                  required
                >
                  <input
                    required
                    min="1"
                    type="number"
                    value={
                      formData.max_students
                    }
                    onChange={(event) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          max_students:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="School Year"
                  required
                >
                  <input
                    required
                    type="text"
                    value={
                      formData.school_year
                    }
                    onChange={(event) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          school_year:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="2026-2027"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Semester"
                  required
                >
                  <select
                    required
                    value={
                      formData.semester
                    }
                    onChange={(event) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          semester:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Select semester
                    </option>

                    <option value="1st Semester">
                      1st Semester
                    </option>

                    <option value="2nd Semester">
                      2nd Semester
                    </option>

                    <option value="Summer">
                      Summer
                    </option>
                  </select>
                </Field>

                <Field
                  label="Schedule Date"
                  required
                >
                  <input
                    required
                    type="date"
                    value={
                      formData.schedule_date
                    }
                    onChange={(event) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          schedule_date:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Start"
                    required
                  >
                    <input
                      required
                      type="time"
                      value={
                        formData.start_time
                      }
                      onChange={(event) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            start_time:
                              event.target
                                .value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="End"
                    required
                  >
                    <input
                      required
                      type="time"
                      value={
                        formData.end_time
                      }
                      onChange={(event) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            end_time:
                              event.target
                                .value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Guidance Question / Requirement"
                    required
                  >
                    <textarea
                      required
                      rows="3"
                      value={
                        formData.question
                      }
                      onChange={(event) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            question:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Enter the question or requirement students need to complete..."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Instructions">
                    <textarea
                      rows="3"
                      value={
                        formData.instructions
                      }
                      onChange={(event) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            instructions:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Optional instructions for students..."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPlus />
                  )}

                  {saving
                    ? "Creating..."
                    : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* =====================================================
          ADD STUDENTS MODAL
      ===================================================== */}

      {showStudentModal &&
        selectedBatch && (
          <ModalOverlay
            onClose={() => {
              if (!saving) {
                setShowStudentModal(
                  false
                );
              }
            }}
          >
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <ModalHeader
                title="Add Students"
                subtitle={
                  selectedBatch.batch_name
                }
                onClose={() => {
                  if (!saving) {
                    setShowStudentModal(
                      false
                    );
                  }
                }}
              />

              <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
                {/* BATCH INFO */}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-blue-800">
                        {
                          selectedBatch.school_year
                        }{" "}
                        •{" "}
                        {
                          selectedBatch.semester
                        }
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-blue-600">
                        {formatDate(
                          selectedBatch.schedule_date
                        )}{" "}
                        •{" "}
                        {formatTime(
                          selectedBatch.start_time
                        )}{" "}
                        –{" "}
                        {formatTime(
                          selectedBatch.end_time
                        )}
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-blue-600">
                        Maximum{" "}
                        {
                          selectedBatch.max_students
                        }{" "}
                        students in this batch
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm">
                      {
                        eligibleForSelectedBatch.length
                      }{" "}
                      Eligible
                    </div>
                  </div>
                </div>

                {/* EMPTY */}

                {eligibleForSelectedBatch.length ===
                0 ? (
                  <div className="py-14 text-center">
                    <FaUsers className="mx-auto text-4xl text-slate-300" />

                    <h3 className="mt-4 font-black text-slate-800">
                      No Eligible Students
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      No unscheduled pending
                      Guidance students match{" "}
                      <strong>
                        {
                          selectedBatch.school_year
                        }{" "}
                        /{" "}
                        {
                          selectedBatch.semester
                        }
                      </strong>
                      .
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
                      Waiting for schedule:{" "}
                      {
                        eligibleStudents.length
                      }
                    </p>

                    <button
                      type="button"
                      onClick={
                        loadEligibleStudents
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      <FaRedo />
                      Reload Students
                    </button>
                  </div>
                ) : (
                  <>
                    {/* SEARCH */}

                    <div className="mt-5">
                      <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

                        <input
                          type="text"
                          value={
                            studentSearch
                          }
                          onChange={(event) =>
                            setStudentSearch(
                              event.target
                                .value
                            )
                          }
                          placeholder="Search name, student ID, course, block or clearance reference..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    {/* SELECT ALL */}

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Students Waiting
                          for Schedule
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            displayedEligibleStudents.length
                          }{" "}
                          request
                          {displayedEligibleStudents.length ===
                          1
                            ? ""
                            : "s"}{" "}
                          shown
                        </p>
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={
                            toggleAllStudents
                          }
                          disabled={
                            displayedEligibleStudents.length ===
                            0
                          }
                          className="text-xs font-black text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {displayedEligibleStudents.length >
                            0 &&
                          displayedEligibleStudents.every(
                            (item) =>
                              selectedStudents.includes(
                                item.clearanceStepId
                              )
                          )
                            ? "Clear Visible"
                            : "Select All"}
                        </button>

                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {
                            selectedStudents.length
                          }{" "}
                          selected
                        </p>
                      </div>
                    </div>

                    {/* STUDENTS */}

                    {displayedEligibleStudents.length ===
                    0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                        <FaSearch className="mx-auto text-2xl text-slate-300" />

                        <p className="mt-3 text-sm font-black text-slate-700">
                          No matching students
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Try another search
                          term.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                        {displayedEligibleStudents.map(
                          (item) => {
                            const selected =
                              selectedStudents.includes(
                                item.clearanceStepId
                              );

                            const course =
                              item.section
                                ?.course ||
                              item.student
                                ?.course ||
                              "Course";

                            const yearLevel =
                              item.section
                                ?.year_level ||
                              item.student
                                ?.year_level ||
                              "—";

                            const block =
                              item.section
                                ?.block_code ||
                              item.student
                                ?.block ||
                              "";

                            return (
                              <button
                                type="button"
                                key={
                                  item.clearanceStepId
                                }
                                onClick={() =>
                                  toggleStudent(
                                    item.clearanceStepId
                                  )
                                }
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                  selected
                                    ? "border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                      selected
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {selected && (
                                      <FaCheckCircle className="text-[10px]" />
                                    )}
                                  </div>

                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700">
                                    {String(
                                      item
                                        .student
                                        ?.full_name ||
                                        "S"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-black text-slate-900">
                                          {item
                                            .student
                                            ?.full_name ||
                                            "Student"}
                                        </p>

                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                                          <span className="inline-flex items-center gap-1">
                                            <FaIdCard className="text-slate-400" />

                                            {item
                                              .student
                                              ?.student_id ||
                                              "No Student ID"}
                                          </span>

                                          <span className="inline-flex items-center gap-1">
                                            <FaGraduationCap className="text-slate-400" />

                                            {
                                              course
                                            }{" "}
                                            • Year{" "}
                                            {
                                              yearLevel
                                            }

                                            {block
                                              ? ` • ${block}`
                                              : ""}
                                          </span>
                                        </div>
                                      </div>

                                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                                        Pending
                                      </span>
                                    </div>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                          Requested
                                        </p>

                                        <p className="mt-1 text-[11px] font-bold text-slate-600">
                                          {formatDateTime(
                                            item.requestedAt
                                          )}
                                        </p>
                                      </div>

                                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                          Clearance
                                          Reference
                                        </p>

                                        <p className="mt-1 truncate text-[11px] font-bold text-slate-600">
                                          {item.clearanceReference ||
                                            "Not generated"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* FOOTER */}

                <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-slate-400">
                    {
                      selectedStudents.length
                    }{" "}
                    request
                    {selectedStudents.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    selected
                  </p>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setShowStudentModal(
                          false
                        )
                      }
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        selectedStudents.length ===
                          0
                      }
                      onClick={
                        handleAddStudents
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaUserPlus />
                      )}

                      {saving
                        ? "Adding..."
                        : `Add ${
                            selectedStudents.length
                          } Request${
                            selectedStudents.length ===
                            1
                              ? ""
                              : "s"
                          }`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}
    </GuidanceLayout>
  );
}

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100";

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  required = false,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

// ============================================================
// MODAL
// ============================================================

function ModalOverlay({
  children,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 flex min-h-full w-full items-center justify-center py-6">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// MODAL HEADER
// ============================================================

function ModalHeader({
  title,
  subtitle,
  onClose,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
      >
        <FaTimes />
      </button>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}) {
  const tones = {
    blue: {
      box:
        "bg-blue-50 text-blue-600",
    },

    emerald: {
      box:
        "bg-emerald-50 text-emerald-600",
    },

    amber: {
      box:
        "bg-amber-50 text-amber-600",
    },

    violet: {
      box:
        "bg-violet-50 text-violet-600",
    },
  };

  const current =
    tones[tone] || tones.blue;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${current.box}`}
        >
          <Icon />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="text-xs" />
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-700">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BATCH COUNT
// ============================================================

function BatchCount({
  label,
  value,
  tone = "slate",
}) {
  const tones = {
    blue:
      "border-blue-100 bg-blue-50 text-blue-700",
    slate:
      "border-slate-200 bg-slate-50 text-slate-700",
    amber:
      "border-amber-100 bg-amber-50 text-amber-700",
    red:
      "border-red-100 bg-red-50 text-red-700",
    emerald:
      "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-3 text-center ${
        tones[tone] || tones.slate
      }`}
    >
      <p className="text-lg font-black leading-none">
        {value}
      </p>

      <p className="mt-1.5 text-[9px] font-black uppercase tracking-wide opacity-75">
        {label}
      </p>
    </div>
  );
}

export default PendingStudents;