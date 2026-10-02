import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

import TreasurerLayout from "../../layouts/TreasurerLayout";

import {
  getTreasurerBatches,
  getTreasurerBatchStudents,
  reviewTreasurerStudent,
} from "../../services/treasurerService";

import {
  FaBalanceScale,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

const INITIAL_REVIEW_FORM = {
  decision: "Cleared",
  balanceAmount: "",
  remarks: "",
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";

  const raw = String(value).slice(0, 5);
  const [hour, minute] = raw.split(":");

  if (hour === undefined || minute === undefined) {
    return String(value);
  }

  const date = new Date();

  date.setHours(
    Number(hour),
    Number(minute),
    0,
    0
  );

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Cleared":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "With Balance":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "Needs Action":
      return "bg-red-50 text-red-700 ring-red-200";

    case "For Review":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "Scheduled":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};

const getBatchStatusStyle = (status) => {
  switch (status) {
    case "Open":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "Completed":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "Cancelled":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};

function StudentReview() {
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedBatchId, setSelectedBatchId] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Pending");

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [showReviewModal, setShowReviewModal] =
    useState(false);

  const [savingReview, setSavingReview] =
    useState(false);

  const [reviewForm, setReviewForm] =
    useState(INITIAL_REVIEW_FORM);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result =
        await getTreasurerBatches();

      const safeBatches = Array.isArray(result)
        ? result
        : [];

      setBatches(safeBatches);

      if (!safeBatches.length) {
        setSelectedBatchId("");
        setStudents([]);
        return;
      }

      const currentStillExists =
        safeBatches.some(
          (batch) =>
            batch.id === selectedBatchId
        );

      const preferredBatch =
        currentStillExists
          ? selectedBatchId
          : safeBatches.find(
              (batch) =>
                batch.status === "Open"
            )?.id || safeBatches[0].id;

      setSelectedBatchId(preferredBatch);

      await loadBatchStudents(
        preferredBatch
      );
    } catch (error) {
      console.error(
        "Treasurer review load error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Load",
        text:
          error?.message ||
          "Unable to load Treasurer student reviews.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBatchStudents = async (
    batchId
  ) => {
    if (!batchId) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);

      const result =
        await getTreasurerBatchStudents(
          batchId
        );

      setStudents(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (error) {
      console.error(
        "Load Treasurer batch students error:",
        error
      );

      setStudents([]);

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Students",
        text:
          error?.message ||
          "Unable to load students in this Treasurer batch.",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBatchChange = async (
    event
  ) => {
    const batchId = event.target.value;

    setSelectedBatchId(batchId);
    setSearchTerm("");
    setStatusFilter("Pending");

    await loadBatchStudents(batchId);
  };

  const selectedBatch = useMemo(
    () =>
      batches.find(
        (batch) =>
          batch.id === selectedBatchId
      ) || null,
    [batches, selectedBatchId]
  );

  const summary = useMemo(() => {
    return {
      total: students.length,

      pending: students.filter(
        (student) =>
          student.financial_status ===
            "Scheduled" ||
          student.financial_status ===
            "For Review"
      ).length,

      cleared: students.filter(
        (student) =>
          student.financial_status ===
          "Cleared"
      ).length,

      balance: students.filter(
        (student) =>
          student.financial_status ===
          "With Balance"
      ).length,

      needsAction: students.filter(
        (student) =>
          student.financial_status ===
          "Needs Action"
      ).length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return students
      .filter((item) => {
        if (statusFilter === "Pending") {
          if (
            ![
              "Scheduled",
              "For Review",
            ].includes(
              item.financial_status
            )
          ) {
            return false;
          }
        } else if (
          statusFilter !== "All" &&
          item.financial_status !==
            statusFilter
        ) {
          return false;
        }

        if (!query) return true;

        const student = item.users || {};

        return [
          student.student_id,
          student.full_name,
          student.email,
          student.course,
          student.year_level,
          student.section,
          student.semester,
          student.school_year,
          item.financial_status,
          item.treasurer_remarks,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) =>
        String(
          a.users?.full_name || ""
        ).localeCompare(
          String(
            b.users?.full_name || ""
          )
        )
      );
  }, [
    students,
    searchTerm,
    statusFilter,
  ]);

  const openReview = (item) => {
    setSelectedStudent(item);

    let defaultDecision = "Cleared";

    if (
      [
        "Cleared",
        "With Balance",
        "Needs Action",
      ].includes(item.financial_status)
    ) {
      defaultDecision =
        item.financial_status;
    }

    setReviewForm({
      decision: defaultDecision,

      balanceAmount:
        item.balance_amount !== null &&
        item.balance_amount !== undefined
          ? String(item.balance_amount)
          : "",

      remarks:
        item.treasurer_remarks || "",
    });

    setShowReviewModal(true);
  };

  const closeReview = () => {
    if (savingReview) return;

    setShowReviewModal(false);
    setSelectedStudent(null);
    setReviewForm(
      INITIAL_REVIEW_FORM
    );
  };

  const handleDecisionChange = (
    value
  ) => {
    setReviewForm((previous) => ({
      ...previous,
      decision: value,

      balanceAmount:
        value === "With Balance"
          ? previous.balanceAmount
          : "",
    }));
  };

  const submitReview = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedStudent) {
      return;
    }

    const decision =
      reviewForm.decision;

    const remarks =
      reviewForm.remarks.trim();

    let balanceAmount = null;

    if (decision === "With Balance") {
      balanceAmount = Number(
        reviewForm.balanceAmount
      );

      if (
        !Number.isFinite(
          balanceAmount
        ) ||
        balanceAmount <= 0
      ) {
        await Swal.fire({
          icon: "warning",
          title: "Balance Required",
          text: "Enter the student's outstanding balance.",
        });

        return;
      }
    }

    if (
      decision === "Needs Action" &&
      !remarks
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Remarks Required",
        text: "Explain what the student needs to do before being cleared.",
      });

      return;
    }

    const studentName =
      selectedStudent.users
        ?.full_name || "Student";

    const confirmation =
      await Swal.fire({
        icon:
          decision === "Cleared"
            ? "question"
            : "warning",

        title:
          decision === "Cleared"
            ? "Clear Student?"
            : decision ===
              "With Balance"
            ? "Record Outstanding Balance?"
            : "Mark as Needs Action?",

        html: `
          <div style="text-align:left;line-height:1.7">
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Decision:</strong> ${decision}</p>
            ${
              decision ===
              "With Balance"
                ? `<p><strong>Outstanding Balance:</strong> ${formatCurrency(
                    balanceAmount
                  )}</p>`
                : ""
            }
          </div>
        `,

        showCancelButton: true,
        confirmButtonText:
          "Confirm Decision",
        cancelButtonText: "Cancel",

        confirmButtonColor:
          decision === "Cleared"
            ? "#059669"
            : decision ===
              "With Balance"
            ? "#d97706"
            : "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setSavingReview(true);

      await reviewTreasurerStudent({
        batchStudentId:
          selectedStudent.id,

        decision,

        balanceAmount:
          decision === "With Balance"
            ? balanceAmount
            : null,

        remarks,
      });

      setShowReviewModal(false);
      setSelectedStudent(null);
      setReviewForm(
        INITIAL_REVIEW_FORM
      );

      await Swal.fire({
        icon: "success",
        title: "Review Saved",
        text:
          decision === "Cleared"
            ? "The student's Treasurer clearance step has been approved."
            : decision ===
              "With Balance"
            ? "The outstanding balance was recorded. The Treasurer clearance remains pending."
            : "The student was marked as needing action. The Treasurer clearance remains pending.",
        timer: 2200,
        showConfirmButton: false,
      });

      await loadBatchStudents(
        selectedBatchId
      );
    } catch (error) {
      console.error(
        "Treasurer student review error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Save Review",
        text:
          error?.message ||
          "The Treasurer decision could not be saved.",
      });
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <TreasurerLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

            <p className="mt-4 text-sm font-bold text-slate-500">
              Loading Treasurer review...
            </p>
          </div>
        </div>
      </TreasurerLayout>
    );
  }

  return (
    <TreasurerLayout>
      <div className="space-y-5 pt-10 md:pt-12">
        {/* HEADER */}
        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg"
        >
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-300">
                  <FaClipboardCheck />
                  F2F Verification
                </div>

                <h1 className="text-2xl font-black md:text-3xl">
                  Student Review
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Verify students during their
                  scheduled face-to-face visit
                  using the school&apos;s official
                  financial records.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadBatches(true)
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/15 disabled:opacity-60"
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
          </div>
        </motion.section>

        {/* IMPORTANT NOTICE */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <FaBalanceScale className="mt-1 shrink-0 text-blue-700" />

            <div>
              <p className="font-black text-blue-900">
                Financial Clearance Verification
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                SmartClear AI does not collect
                online payments. The Treasurer
                verifies the student&apos;s financial
                status using official school
                records during the face-to-face
                visit.
              </p>
            </div>
          </div>
        </section>

        {/* BATCH SELECTOR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <label className="mb-2 block text-sm font-black text-slate-700">
                Select Schedule Batch
              </label>

              <select
                value={selectedBatchId}
                onChange={
                  handleBatchChange
                }
                disabled={
                  batches.length === 0
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-xl"
              >
                {batches.length === 0 ? (
                  <option value="">
                    No batches available
                  </option>
                ) : (
                  batches.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batch.batch_name} —{" "}
                      {formatDate(
                        batch.schedule_date
                      )}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedBatch && (
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-inset ${getBatchStatusStyle(
                  selectedBatch.status
                )}`}
              >
                {selectedBatch.status}
              </span>
            )}
          </div>

          {selectedBatch && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Schedule
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {formatDate(
                    selectedBatch.schedule_date
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Time
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {formatTime(
                    selectedBatch.start_time
                  )}{" "}
                  -{" "}
                  {formatTime(
                    selectedBatch.end_time
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Clearance Cycle
                </p>

                <p className="mt-1 font-black text-slate-800">
                  {selectedBatch.semester} •{" "}
                  {selectedBatch.school_year}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* SUMMARY */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Students",
              value: summary.total,
              icon: <FaUsers />,
              className:
                "bg-slate-50 text-slate-700",
            },
            {
              label: "For Review",
              value: summary.pending,
              icon: <FaClipboardCheck />,
              className:
                "bg-blue-50 text-blue-700",
            },
            {
              label: "Cleared",
              value: summary.cleared,
              icon: <FaCheckCircle />,
              className:
                "bg-emerald-50 text-emerald-700",
            },
            {
              label: "With Balance",
              value: summary.balance,
              icon: <FaBalanceScale />,
              className:
                "bg-amber-50 text-amber-700",
            },
            {
              label: "Needs Action",
              value: summary.needsAction,
              icon: (
                <FaExclamationTriangle />
              ),
              className:
                "bg-red-50 text-red-700",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.03,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {item.value}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.className}`}
                >
                  {item.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* STUDENT QUEUE */}
        <motion.section
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Batch Students
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Each student is reviewed
                  individually.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px]">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value
                      )
                    }
                    placeholder="Search student..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <option value="Pending">
                    For Review
                  </option>

                  <option value="All">
                    All Statuses
                  </option>

                  <option value="Cleared">
                    Cleared
                  </option>

                  <option value="With Balance">
                    With Balance
                  </option>

                  <option value="Needs Action">
                    Needs Action
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {loadingStudents ? (
              <div className="py-14 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

                <p className="mt-3 text-sm font-bold text-slate-500">
                  Loading students...
                </p>
              </div>
            ) : !selectedBatch ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />

                <h3 className="mt-4 font-black text-slate-800">
                  No Schedule Batch
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Create a Treasurer batch
                  before reviewing students.
                </p>
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <FaUserGraduate className="mx-auto text-4xl text-slate-300" />

                <h3 className="mt-4 font-black text-slate-800">
                  No Students Found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  No students match the
                  selected status or search.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map(
                  (item) => {
                    const student =
                      item.users || {};

                    return (
                      <motion.article
                        layout
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm md:p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-black text-slate-900">
                                {student.full_name ||
                                  "Student"}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${getStatusStyle(
                                  item.financial_status
                                )}`}
                              >
                                {
                                  item.financial_status
                                }
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {student.student_id ||
                                "No Student ID"}{" "}
                              •{" "}
                              {student.course ||
                                "N/A"}{" "}
                              • Year{" "}
                              {student.year_level ||
                                "N/A"}{" "}
                              •{" "}
                              {student.section ||
                                "No Block"}
                            </p>

                            {item.financial_status ===
                              "With Balance" && (
                              <p className="mt-2 text-sm font-black text-amber-700">
                                Outstanding:{" "}
                                {formatCurrency(
                                  item.balance_amount
                                )}
                              </p>
                            )}

                            {item.treasurer_remarks && (
                              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                <span className="font-black">
                                  Remarks:
                                </span>{" "}
                                {
                                  item.treasurer_remarks
                                }
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openReview(item)
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800"
                          >
                            <FaClipboardCheck />

                            {[
                              "Cleared",
                              "With Balance",
                              "Needs Action",
                            ].includes(
                              item.financial_status
                            )
                              ? "Update Review"
                              : "Review Student"}
                          </button>
                        </div>
                      </motion.article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {showReviewModal &&
          selectedStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                }}
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              >
                <div className="border-b border-slate-200 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                        Treasurer F2F Review
                      </p>

                      <h2 className="mt-1 text-xl font-black text-slate-900">
                        {selectedStudent.users
                          ?.full_name ||
                          "Student"}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedStudent.users
                          ?.student_id ||
                          "No Student ID"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeReview}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={submitReview}
                  className="space-y-5 p-5 md:p-6"
                >
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Treasurer Decision
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          value: "Cleared",
                          label: "Cleared",
                          description:
                            "Financial requirement is complete.",
                          icon: (
                            <FaCheckCircle />
                          ),
                        },
                        {
                          value:
                            "With Balance",
                          label:
                            "With Balance",
                          description:
                            "Student still has an outstanding balance.",
                          icon: (
                            <FaBalanceScale />
                          ),
                        },
                        {
                          value:
                            "Needs Action",
                          label:
                            "Needs Action",
                          description:
                            "Student must coordinate with Treasurer.",
                          icon: (
                            <FaExclamationTriangle />
                          ),
                        },
                      ].map((option) => {
                        const active =
                          reviewForm.decision ===
                          option.value;

                        return (
                          <button
                            key={
                              option.value
                            }
                            type="button"
                            onClick={() =>
                              handleDecisionChange(
                                option.value
                              )
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:border-blue-200"
                            }`}
                          >
                            <div
                              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
                                active
                                  ? "bg-blue-700 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {
                                option.icon
                              }
                            </div>

                            <p className="font-black text-slate-900">
                              {
                                option.label
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {
                                option.description
                              }
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {reviewForm.decision ===
                    "With Balance" && (
                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-700">
                        Outstanding Balance
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">
                          ₱
                        </span>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            reviewForm.balanceAmount
                          }
                          onChange={(
                            event
                          ) =>
                            setReviewForm(
                              (
                                previous
                              ) => ({
                                ...previous,
                                balanceAmount:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        This amount is for
                        clearance reference
                        only. SmartClear does
                        not process or collect
                        the payment.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Remarks
                      {reviewForm.decision ===
                        "Needs Action" && (
                        <span className="ml-1 text-red-600">
                          *
                        </span>
                      )}
                    </label>

                    <textarea
                      rows={4}
                      value={
                        reviewForm.remarks
                      }
                      onChange={(event) =>
                        setReviewForm(
                          (previous) => ({
                            ...previous,
                            remarks:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder={
                        reviewForm.decision ===
                        "Cleared"
                          ? "Optional Treasurer remarks..."
                          : reviewForm.decision ===
                            "With Balance"
                          ? "Example: Please settle the remaining balance at the Treasurer's Office."
                          : "Explain what the student needs to do..."
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-900">
                      Face-to-Face Verification
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Confirm the student&apos;s
                      financial status using
                      the school&apos;s official
                      records before saving
                      the decision.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeReview}
                      disabled={
                        savingReview
                      }
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        savingReview
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingReview ? (
                        <>
                          <FaSyncAlt className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaClipboardCheck />
                          Save Decision
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </TreasurerLayout>
  );
}

export default StudentReview;