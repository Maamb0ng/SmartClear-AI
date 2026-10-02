import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import TreasurerLayout from "../../layouts/TreasurerLayout";

import {
  getTreasurerBatches,
  getTreasurerBatchStudents,
} from "../../services/treasurerService";

import {
  FaBalanceScale,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

const formatDate = (value) => {
  if (!value) return "N/A";

  const raw = String(value);

  const date = raw.includes("T")
    ? new Date(raw)
    : new Date(`${raw}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
      return {
        badge:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
        icon: "bg-emerald-50 text-emerald-700",
      };

    case "With Balance":
      return {
        badge:
          "bg-amber-50 text-amber-700 ring-amber-200",
        icon: "bg-amber-50 text-amber-700",
      };

    case "Needs Action":
      return {
        badge:
          "bg-red-50 text-red-700 ring-red-200",
        icon: "bg-red-50 text-red-700",
      };

    default:
      return {
        badge:
          "bg-slate-100 text-slate-700 ring-slate-200",
        icon: "bg-slate-100 text-slate-700",
      };
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Cleared":
      return <FaCheckCircle />;

    case "With Balance":
      return <FaBalanceScale />;

    case "Needs Action":
      return <FaExclamationTriangle />;

    default:
      return <FaUserGraduate />;
  }
};

function ReviewedStudents() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [batches, setBatches] = useState([]);
  const [records, setRecords] = useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [batchFilter, setBatchFilter] =
    useState("All");

  useEffect(() => {
    loadReviewedStudents();
  }, []);

  const loadReviewedStudents = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const batchResult =
        await getTreasurerBatches();

      const safeBatches = Array.isArray(
        batchResult
      )
        ? batchResult
        : [];

      setBatches(safeBatches);

      if (!safeBatches.length) {
        setRecords([]);
        return;
      }

      const results = await Promise.all(
        safeBatches.map(async (batch) => {
          try {
            const students =
              await getTreasurerBatchStudents(
                batch.id
              );

            return (
              Array.isArray(students)
                ? students
                : []
            ).map((student) => ({
              ...student,

              batch: {
                id: batch.id,
                batch_name:
                  batch.batch_name,
                schedule_date:
                  batch.schedule_date,
                school_year:
                  batch.school_year,
                semester:
                  batch.semester,
                status: batch.status,
              },
            }));
          } catch (error) {
            console.error(
              `Unable to load Treasurer batch ${batch.id}:`,
              error
            );

            return [];
          }
        })
      );

      const flattened =
        results.flat();

      setRecords(
        flattened.filter((record) =>
          [
            "Cleared",
            "With Balance",
            "Needs Action",
          ].includes(
            record.financial_status
          )
        )
      );
    } catch (error) {
      console.error(
        "Reviewed students load error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Load",
        text:
          error?.message ||
          "Unable to load reviewed Treasurer students.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const summary = useMemo(() => {
    return {
      total: records.length,

      cleared: records.filter(
        (record) =>
          record.financial_status ===
          "Cleared"
      ).length,

      balance: records.filter(
        (record) =>
          record.financial_status ===
          "With Balance"
      ).length,

      needsAction: records.filter(
        (record) =>
          record.financial_status ===
          "Needs Action"
      ).length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return records
      .filter((record) => {
        if (
          statusFilter !== "All" &&
          record.financial_status !==
            statusFilter
        ) {
          return false;
        }

        if (
          batchFilter !== "All" &&
          record.batch_id !== batchFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const student =
          record.users || {};

        return [
          student.student_id,
          student.full_name,
          student.email,
          student.course,
          student.year_level,
          student.section,
          record.financial_status,
          record.treasurer_remarks,
          record.batch?.batch_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.reviewed_at ||
            a.updated_at ||
            0
        ).getTime();

        const dateB = new Date(
          b.reviewed_at ||
            b.updated_at ||
            0
        ).getTime();

        return dateB - dateA;
      });
  }, [
    records,
    searchTerm,
    statusFilter,
    batchFilter,
  ]);

  if (loading) {
    return (
      <TreasurerLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

            <p className="mt-4 text-sm font-bold text-slate-500">
              Loading reviewed students...
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
                  <FaCheckCircle />
                  Clearance Records
                </div>

                <h1 className="text-2xl font-black md:text-3xl">
                  Reviewed Students
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  View students already reviewed
                  by the Treasurer during
                  face-to-face financial
                  clearance verification.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadReviewedStudents(true)
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

        {/* SUMMARY */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Reviewed",
              value: summary.total,
              icon: <FaUsers />,
              style:
                "bg-blue-50 text-blue-700",
            },
            {
              label: "Cleared",
              value: summary.cleared,
              icon: <FaCheckCircle />,
              style:
                "bg-emerald-50 text-emerald-700",
            },
            {
              label: "With Balance",
              value: summary.balance,
              icon: <FaBalanceScale />,
              style:
                "bg-amber-50 text-amber-700",
            },
            {
              label: "Needs Action",
              value: summary.needsAction,
              icon: (
                <FaExclamationTriangle />
              ),
              style:
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
                delay: index * 0.04,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {item.value}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.style}`}
                >
                  {item.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* RECORDS */}
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
                  Financial Clearance Reviews
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredRecords.length}{" "}
                  record
                  {filteredRecords.length === 1
                    ? ""
                    : "s"}{" "}
                  displayed.
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_210px]">
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

                <select
                  value={batchFilter}
                  onChange={(event) =>
                    setBatchFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <option value="All">
                    All Batches
                  </option>

                  {batches.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {filteredRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <FaUserGraduate className="mx-auto text-4xl text-slate-300" />

                <h3 className="mt-4 text-lg font-black text-slate-800">
                  No Reviewed Students
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Reviewed students will appear
                  here after the Treasurer saves
                  a Cleared, With Balance, or
                  Needs Action decision.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map(
                  (record, index) => {
                    const student =
                      record.users || {};

                    const statusStyle =
                      getStatusStyle(
                        record.financial_status
                      );

                    return (
                      <motion.article
                        key={record.id}
                        initial={{
                          opacity: 0,
                          y: 6,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay:
                            Math.min(
                              index,
                              10
                            ) * 0.025,
                        }}
                        className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm md:p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${statusStyle.icon}`}
                            >
                              {getStatusIcon(
                                record.financial_status
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-lg font-black text-slate-900">
                                  {student.full_name ||
                                    "Student"}
                                </h3>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${statusStyle.badge}`}
                                >
                                  {
                                    record.financial_status
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

                              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <FaCalendarAlt className="text-blue-600" />

                                  {record.batch
                                    ?.batch_name ||
                                    "Batch"}{" "}
                                  •{" "}
                                  {formatDate(
                                    record.batch
                                      ?.schedule_date
                                  )}
                                </span>

                                <span>
                                  Reviewed:{" "}
                                  {formatDateTime(
                                    record.reviewed_at
                                  )}
                                </span>
                              </div>

                              {record.financial_status ===
                                "With Balance" && (
                                <div className="mt-3 inline-flex rounded-lg bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">
                                  Outstanding
                                  Balance:&nbsp;
                                  {formatCurrency(
                                    record.balance_amount
                                  )}
                                </div>
                              )}

                              {record.treasurer_remarks && (
                                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    Treasurer
                                    Remarks
                                  </p>

                                  <p className="mt-1 text-sm leading-6 text-slate-700">
                                    {
                                      record.treasurer_remarks
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-left xl:text-right">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Clearance Cycle
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-700">
                              {record.batch
                                ?.semester ||
                                student.semester ||
                                "N/A"}
                            </p>

                            <p className="text-xs font-semibold text-slate-500">
                              {record.batch
                                ?.school_year ||
                                student.school_year ||
                                "N/A"}
                            </p>
                          </div>
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
    </TreasurerLayout>
  );
}

export default ReviewedStudents;