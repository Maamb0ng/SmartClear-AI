import { useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function ScheduleBatches() {
  // =========================================================
  // MOCK FRONTEND DATA
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [batches, setBatches] = useState([
    {
      id: "batch-001",
      name: "Library Clearance - Batch 1",
      date: "2026-10-01",
      startTime: "09:00",
      endTime: "11:00",
      note: "Please monitor your clearance status and comply with any unresolved library obligation.",
      capacity: 20,
      assigned: 15,
      reviewed: 8,
      status: "Open",
    },
    {
      id: "batch-002",
      name: "Library Clearance - Batch 2",
      date: "2026-10-01",
      startTime: "13:00",
      endTime: "15:00",
      note: "Students with borrowed or lost books must resolve their obligation before approval.",
      capacity: 20,
      assigned: 12,
      reviewed: 0,
      status: "Open",
    },
    {
      id: "batch-003",
      name: "BSIT Clearance - Batch 3",
      date: "2026-10-03",
      startTime: "09:00",
      endTime: "12:00",
      note: "Clearance review for assigned students.",
      capacity: 25,
      assigned: 20,
      reviewed: 0,
      status: "Open",
    },
    {
      id: "batch-004",
      name: "Completed Clearance Batch",
      date: "2026-09-28",
      startTime: "08:00",
      endTime: "11:00",
      note: "Completed batch.",
      capacity: 20,
      assigned: 18,
      reviewed: 18,
      status: "Completed",
    },
  ]);

  const emptyForm = {
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    note: "",
    capacity: 20,
    status: "Open",
  };

  const [formData, setFormData] = useState(emptyForm);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (value) => {
    if (!value) return "No date";

    return new Date(`${value}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const formatTime = (value) => {
    if (!value) return "";

    const [hour, minute] = value.split(":");
    const date = new Date();

    date.setHours(Number(hour), Number(minute), 0, 0);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    if (status === "Open") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (status === "Closed") {
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    }

    if (status === "Completed") {
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }

    if (status === "Cancelled") {
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch = batch.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: batches.length,
      open: batches.filter(
        (batch) => batch.status === "Open"
      ).length,
      students: batches.reduce(
        (total, batch) => total + batch.assigned,
        0
      ),
      reviewed: batches.reduce(
        (total, batch) => total + batch.reviewed,
        0
      ),
    };
  }, [batches]);

  // =========================================================
  // FORM
  // =========================================================

  const openCreateForm = () => {
    setEditingBatch(null);

    setFormData({
      ...emptyForm,
      name: `${office.name} Clearance - Batch ${
        batches.length + 1
      }`,
    });

    setShowForm(true);
  };

  const openEditForm = (batch) => {
    setEditingBatch(batch);

    setFormData({
      name: batch.name,
      date: batch.date,
      startTime: batch.startTime,
      endTime: batch.endTime,
      note: batch.note,
      capacity: batch.capacity,
      status: batch.status,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBatch(null);
    setFormData(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]:
        name === "capacity"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.date ||
      !formData.startTime ||
      !formData.endTime
    ) {
      window.alert(
        "Please complete the batch name, date, start time, and end time."
      );
      return;
    }

    if (formData.endTime <= formData.startTime) {
      window.alert(
        "End time must be later than the start time."
      );
      return;
    }

    if (Number(formData.capacity) < 1) {
      window.alert(
        "Batch capacity must be at least 1."
      );
      return;
    }

    if (
      editingBatch &&
      Number(formData.capacity) <
        Number(editingBatch.assigned)
    ) {
      window.alert(
        `Capacity cannot be lower than the ${editingBatch.assigned} students already assigned to this batch.`
      );
      return;
    }

    if (editingBatch) {
      setBatches((current) =>
        current.map((batch) =>
          batch.id === editingBatch.id
            ? {
                ...batch,
                ...formData,
              }
            : batch
        )
      );
    } else {
      const newBatch = {
        id: `batch-${Date.now()}`,
        ...formData,
        assigned: 0,
        reviewed: 0,
      };

      setBatches((current) => [
        newBatch,
        ...current,
      ]);
    }

    closeForm();
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
                Office Clearance
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Schedule & Batches
            </h1>

            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Organize students into clearance batches
              and control when your office will review
              or sign their clearance.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <FaPlus />
            Create Batch
          </button>
        </section>

        {/* ===================================================
            STATS
        =================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Batches"
            value={stats.total}
            icon={FaLayerGroup}
          />

          <StatCard
            label="Open Batches"
            value={stats.open}
            icon={FaCalendarAlt}
          />

          <StatCard
            label="Assigned Students"
            value={stats.students}
            icon={FaUsers}
          />

          <StatCard
            label="Reviewed"
            value={stats.reviewed}
            icon={FaCheckCircle}
          />
        </section>

        {/* ===================================================
            SEARCH + FILTER
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search batch..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Completed">
                Completed
              </option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </section>

        {/* ===================================================
            BATCH LIST
        =================================================== */}

        <section className="space-y-4">
          {filteredBatches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
              <FaCalendarAlt className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h2 className="text-base font-black text-slate-800 dark:text-slate-200">
                No batches found
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Create a clearance batch or change your
                current filters.
              </p>
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const progress =
                batch.assigned > 0
                  ? Math.round(
                      (batch.reviewed /
                        batch.assigned) *
                        100
                    )
                  : 0;

              return (
                <article
                  key={batch.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClass(
                              batch.status
                            )}`}
                          >
                            {batch.status}
                          </span>

                          <span className="text-xs font-bold text-slate-400">
                            {office.name}
                          </span>
                        </div>

                        <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                          {batch.name}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-2">
                            <FaCalendarAlt />
                            {formatDate(batch.date)}
                          </span>

                          <span className="flex items-center gap-2">
                            <FaClock />
                            {formatTime(
                              batch.startTime
                            )}{" "}
                            -{" "}
                            {formatTime(
                              batch.endTime
                            )}
                          </span>

                          <span className="flex items-center gap-2">
                            <FaUsers />
                            {batch.assigned}/
                            {batch.capacity} students
                          </span>
                        </div>

                        {batch.note && (
                          <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Student Note / Instruction
                            </p>

                            <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                              {batch.note}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(batch)
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        >
                          <FaEdit />
                          Manage Batch
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
                        >
                          <FaUsers />
                          View Students
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 dark:text-slate-400">
                          Review Progress
                        </span>

                        <span className="text-slate-700 dark:text-slate-300">
                          {batch.reviewed}/
                          {batch.assigned} reviewed
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
                </article>
              );
            })
          )}
        </section>

        {/* ===================================================
            CREATE / MANAGE MODAL
        =================================================== */}

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
            <button
              type="button"
              aria-label="Close batch form"
              onClick={closeForm}
              className="absolute inset-0"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {editingBatch
                      ? "Manage Batch"
                      : "Create Batch"}
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {office.name} clearance schedule
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                <Field label="Batch Name">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Example: Library Clearance - Batch 1"
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Schedule Date">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Maximum Students">
                    <input
                      type="number"
                      min="1"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Start Time">
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="End Time">
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Student Note / Instructions">
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Example: Please bring your School ID or resolve any outstanding office obligation."
                    className={`${inputClass} resize-none`}
                  />

                  <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
                    This note will be visible to
                    students assigned to this batch.
                  </p>
                </Field>

                {editingBatch && (
                  <Field label="Batch Status">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="Open">
                        Open
                      </option>

                      <option value="Closed">
                        Closed
                      </option>

                      <option value="Completed">
                        Completed
                      </option>

                      <option value="Cancelled">
                        Cancelled
                      </option>
                    </select>
                  </Field>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  >
                    <FaCheckCircle />

                    {editingBatch
                      ? "Save Changes"
                      : "Create Batch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// SMALL COMPONENTS
// ===========================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon />
        </div>
      </div>
    </div>
  );
}

export default ScheduleBatches;