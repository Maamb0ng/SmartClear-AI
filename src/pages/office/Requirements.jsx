import { useMemo, useState } from "react";
import {
  FaCheck,
  FaClipboardList,
  FaEdit,
  FaExclamationCircle,
  FaPlus,
  FaQuestionCircle,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function Requirements() {
  // =========================================================
  // MOCK OFFICE
  // Later: logged-in user's assigned office from Supabase.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  // =========================================================
  // MOCK REQUIREMENTS
  // Later: loaded from office requirements table.
  // =========================================================

  const [requirements, setRequirements] = useState([
    {
      id: "req-001",
      type: "Requirement",
      title: "No outstanding borrowed books",
      description:
        "Verify that the student has returned all borrowed library materials.",
      active: true,
    },
    {
      id: "req-002",
      type: "Requirement",
      title: "No unpaid or lost books",
      description:
        "Verify that the student has no unresolved lost or unpaid library materials.",
      active: true,
    },
    {
      id: "req-003",
      type: "Question",
      title:
        "Does the student have an unresolved library obligation?",
      description:
        "Use this question when additional confirmation is needed during review.",
      active: true,
    },
  ]);

  const emptyForm = {
    type: "Requirement",
    title: "",
    description: "",
    active: true,
  };

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [deleteItem, setDeleteItem] =
    useState(null);

  // =========================================================
  // FILTERS / STATS
  // =========================================================

  const filteredRequirements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requirements.filter((item) => {
      const matchesSearch =
        !query ||
        item.title
          .toLowerCase()
          .includes(query) ||
        item.description
          .toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "All" ||
        item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [requirements, search, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: requirements.length,

      requirements: requirements.filter(
        (item) =>
          item.type === "Requirement"
      ).length,

      questions: requirements.filter(
        (item) => item.type === "Question"
      ).length,

      active: requirements.filter(
        (item) => item.active
      ).length,
    };
  }, [requirements]);

  // =========================================================
  // FORM
  // =========================================================

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);

    setFormData({
      type: item.type,
      title: item.title,
      description: item.description,
      active: item.active,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      window.alert(
        "Please enter a requirement or question."
      );
      return;
    }

    if (editingItem) {
      setRequirements((current) =>
        current.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...formData,
              }
            : item
        )
      );
    } else {
      const newItem = {
        id: `requirement-${Date.now()}`,
        ...formData,
      };

      setRequirements((current) => [
        newItem,
        ...current,
      ]);
    }

    closeForm();
  };

  // =========================================================
  // ACTIVE / INACTIVE
  // =========================================================

  const toggleStatus = (itemId) => {
    setRequirements((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              active: !item.active,
            }
          : item
      )
    );
  };

  // =========================================================
  // DELETE
  // =========================================================

  const confirmDelete = () => {
    if (!deleteItem) return;

    setRequirements((current) =>
      current.filter(
        (item) => item.id !== deleteItem.id
      )
    );

    setDeleteItem(null);
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                {office.code}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {office.name}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Office Requirements
            </h1>

            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Configure the checks and questions
              your office may use when reviewing a
              student's clearance.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <FaPlus />
            Add Requirement
          </button>
        </section>

        {/* ===================================================
            INFO
        =================================================== */}

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
          <div className="flex items-start gap-3">
            <FaExclamationCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

            <div>
              <p className="text-sm font-black text-blue-900 dark:text-blue-300">
                Flexible office configuration
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-blue-700/80 dark:text-blue-300/70">
                Requirements are not permanently
                hardcoded. Each office can configure
                the checks or questions relevant to
                its own clearance process. If no
                requirement is active, staff may
                review and approve students directly.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================
            STATS
        =================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Items"
            value={stats.total}
            icon={FaClipboardList}
            iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />

          <StatCard
            label="Requirements"
            value={stats.requirements}
            icon={FaCheck}
            iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          />

          <StatCard
            label="Questions"
            value={stats.questions}
            icon={FaQuestionCircle}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />

          <StatCard
            label="Active"
            value={stats.active}
            icon={FaToggleOn}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />
        </section>

        {/* ===================================================
            FILTERS
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
                placeholder="Search requirements or questions..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">
                All Types
              </option>

              <option value="Requirement">
                Requirements
              </option>

              <option value="Question">
                Questions
              </option>
            </select>
          </div>
        </section>

        {/* ===================================================
            LIST
        =================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Configured Items
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {filteredRequirements.length} item
                {filteredRequirements.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <FaClipboardList />
            </div>
          </div>

          {filteredRequirements.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FaClipboardList className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No requirements configured
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">
                Your office can still review
                students directly, or you can create
                an optional requirement or question.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <FaPlus />
                Add First Item
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequirements.map(
                (item) => {
                  const isQuestion =
                    item.type === "Question";

                  return (
                    <article
                      key={item.id}
                      className={`p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${
                        !item.active
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        {/* ICON */}

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isQuestion
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                              : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                          }`}
                        >
                          {isQuestion ? (
                            <FaQuestionCircle />
                          ) : (
                            <FaClipboardList />
                          )}
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                                isQuestion
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                              }`}
                            >
                              {item.type}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                                item.active
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {item.active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                item.id
                              )
                            }
                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                              item.active
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/10"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            }`}
                          >
                            {item.active ? (
                              <FaToggleOff />
                            ) : (
                              <FaToggleOn />
                            )}

                            {item.active
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(item)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteItem(item)
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-500/20 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            CREATE / EDIT MODAL
        =================================================== */}

        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close requirement form"
              onClick={closeForm}
              className="absolute inset-0"
            />

            <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {editingItem
                      ? "Edit Item"
                      : "Add Office Item"}
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {office.name} clearance
                    configuration
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
                {/* TYPE */}

                <div>
                  <label className={labelClass}>
                    Item Type
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(
                          (current) => ({
                            ...current,
                            type: "Requirement",
                          })
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        formData.type ===
                        "Requirement"
                          ? "border-violet-500 bg-violet-50 ring-4 ring-violet-500/10 dark:bg-violet-500/10"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <FaClipboardList
                        className={
                          formData.type ===
                          "Requirement"
                            ? "text-violet-600"
                            : "text-slate-400"
                        }
                      />

                      <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                        Requirement
                      </p>

                      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
                        A check the staff can
                        verify during review.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData(
                          (current) => ({
                            ...current,
                            type: "Question",
                          })
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        formData.type ===
                        "Question"
                          ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10 dark:bg-blue-500/10"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <FaQuestionCircle
                        className={
                          formData.type ===
                          "Question"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />

                      <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                        Question
                      </p>

                      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
                        A Yes/No question used
                        during clearance review.
                      </p>
                    </button>
                  </div>
                </div>

                {/* TITLE */}

                <div>
                  <label className={labelClass}>
                    {formData.type ===
                    "Question"
                      ? "Question"
                      : "Requirement"}
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder={
                      formData.type ===
                      "Question"
                        ? "Example: Does the student have an unresolved obligation?"
                        : "Example: Present School ID"
                    }
                    className={inputClass}
                  />
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className={labelClass}>
                    Description / Instructions
                  </label>

                  <textarea
                    name="description"
                    value={
                      formData.description
                    }
                    onChange={handleChange}
                    rows="4"
                    placeholder="Add a short explanation for the reviewing staff..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* STATUS */}

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Active Item
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Active items appear in the
                      office review checklist.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData(
                        (current) => ({
                          ...current,
                          active:
                            !current.active,
                        })
                      )
                    }
                    className={`text-3xl transition ${
                      formData.active
                        ? "text-emerald-500"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    {formData.active ? (
                      <FaToggleOn />
                    ) : (
                      <FaToggleOff />
                    )}
                  </button>
                </label>

                {/* BUTTONS */}

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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                  >
                    <FaCheck />

                    {editingItem
                      ? "Save Changes"
                      : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================
            DELETE CONFIRMATION
        =================================================== */}

        {deleteItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close delete confirmation"
              onClick={() =>
                setDeleteItem(null)
              }
              className="absolute inset-0"
            />

            <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <FaTrash />
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                Delete this item?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                "{deleteItem.title}" will be
                removed from the office
                configuration.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteItem(null)
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                >
                  <FaTrash />
                  Delete
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
// STYLES
// ===========================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const labelClass =
  "mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

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

export default Requirements;