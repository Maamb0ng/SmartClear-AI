import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  createSection,
  deleteSection,
  getSections,
  setSectionStatus,
  updateSection,
} from "../../services/sectionService";

import {
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from "react-icons/fa";

const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

const SEMESTERS = [
  "1st Semester",
  "2nd Semester",
  "Summer",
];

const defaultFormData = {
  course: "",
  year_level: "",
  block_code: "",
  school_year: "2026-2027",
  semester: "1st Semester",
  is_active: true,
};

function BlockManagement() {
  const [sections, setSections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [showModal, setShowModal] =
    useState(false);

  const [editingSection, setEditingSection] =
    useState(null);

  const [formData, setFormData] =
    useState(defaultFormData);

  const loadSections = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getSections();

      setSections(data || []);
    } catch (error) {
      console.error(
        "Load sections error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Unable to Load Blocks",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const availableCourses = useMemo(() => {
    return [
      ...new Set(
        sections
          .map((section) => section.course)
          .filter(Boolean)
      ),
    ].sort();
  }, [sections]);

  const statistics = useMemo(() => {
    const total = sections.length;

    const active = sections.filter(
      (section) => section.is_active
    ).length;

    const inactive = sections.filter(
      (section) => !section.is_active
    ).length;

    return {
      total,
      active,
      inactive,
    };
  }, [sections]);

  const filteredSections = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return sections.filter((section) => {
      const matchesSearch =
        !keyword ||
        section.course
          ?.toLowerCase()
          .includes(keyword) ||
        section.year_level
          ?.toLowerCase()
          .includes(keyword) ||
        section.block_code
          ?.toLowerCase()
          .includes(keyword) ||
        section.school_year
          ?.toLowerCase()
          .includes(keyword) ||
        section.semester
          ?.toLowerCase()
          .includes(keyword);

      const matchesCourse =
        courseFilter === "All" ||
        section.course === courseFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" &&
          section.is_active) ||
        (statusFilter === "Inactive" &&
          !section.is_active);

      return (
        matchesSearch &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [
    sections,
    search,
    courseFilter,
    statusFilter,
  ]);

  const resetForm = () => {
    setEditingSection(null);
    setFormData(defaultFormData);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (section) => {
    setEditingSection(section);

    setFormData({
      course: section.course || "",
      year_level:
        section.year_level || "",
      block_code:
        section.block_code || "",
      school_year:
        section.school_year || "",
      semester: section.semester || "",
      is_active:
        section.is_active ?? true,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  const handleInputChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    let newValue =
      type === "checkbox"
        ? checked
        : value;

    if (
      name === "course" ||
      name === "block_code"
    ) {
      newValue =
        typeof newValue === "string"
          ? newValue.toUpperCase()
          : newValue;
    }

    setFormData((previousData) => ({
      ...previousData,
      [name]: newValue,
    }));
  };

  const validateForm = () => {
    if (!formData.course.trim()) {
      return "Course is required.";
    }

    if (!formData.year_level) {
      return "Year level is required.";
    }

    if (!formData.block_code.trim()) {
      return "Block code is required.";
    }

    if (!formData.school_year.trim()) {
      return "School year is required.";
    }

    if (!formData.semester) {
      return "Semester is required.";
    }

    const schoolYearPattern =
      /^\d{4}-\d{4}$/;

    if (
      !schoolYearPattern.test(
        formData.school_year.trim()
      )
    ) {
      return "School year must use the format 2026-2027.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Information",
        text: validationError,
      });

      return;
    }

    try {
      setSaving(true);

      if (editingSection) {
        await updateSection(
          editingSection.id,
          formData
        );

        await Swal.fire({
          icon: "success",
          title: "Block Updated",
          text:
            "The block information was updated successfully.",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await createSection(formData);

        await Swal.fire({
          icon: "success",
          title: "Block Added",
          text: `${formData.course} ${formData.year_level} - Block ${formData.block_code} was added successfully.`,
          timer: 1600,
          showConfirmButton: false,
        });
      }

      setShowModal(false);
      resetForm();

      await loadSections();
    } catch (error) {
      console.error(
        "Save section error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.message ||
          "Unable to save the block.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    section
  ) => {
    const newStatus =
      !section.is_active;

    const confirmation =
      await Swal.fire({
        icon: "question",
        title: newStatus
          ? "Activate Block?"
          : "Deactivate Block?",
        text: newStatus
          ? `${section.course} ${section.year_level} - Block ${section.block_code} will become available again.`
          : `${section.course} ${section.year_level} - Block ${section.block_code} will no longer appear in new student registrations.`,
        showCancelButton: true,
        confirmButtonText: newStatus
          ? "Activate"
          : "Deactivate",
        cancelButtonText: "Cancel",
        confirmButtonColor: newStatus
          ? "#16a34a"
          : "#d97706",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await setSectionStatus(
        section.id,
        newStatus
      );

      await Swal.fire({
        icon: "success",
        title: newStatus
          ? "Block Activated"
          : "Block Deactivated",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadSections();
    } catch (error) {
      console.error(
        "Change status error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Change Status",
        text:
          error?.message ||
          "The block status could not be changed.",
      });
    }
  };

  const handleDelete = async (
    section
  ) => {
    const confirmation =
      await Swal.fire({
        icon: "warning",
        title: "Delete Block?",
        html: `
          <div style="text-align:left">
            <p>
              You are about to delete:
            </p>

            <p style="margin-top:10px">
              <strong>
                ${section.course}
                ${section.year_level}
                — Block ${section.block_code}
              </strong>
            </p>

            <p style="margin-top:10px;color:#b45309">
              Blocks assigned to students cannot be deleted.
              Deactivate them instead.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await deleteSection(section.id);

      await Swal.fire({
        icon: "success",
        title: "Block Deleted",
        text:
          "The block was deleted successfully.",
        timer: 1300,
        showConfirmButton: false,
      });

      await loadSections();
    } catch (error) {
      console.error(
        "Delete section error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "Unable to delete the block.",
      });
    }
  };

  return (
    <AdminLayout>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-48 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-[34rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <motion.section
        initial={{ opacity: 0, y: -18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.62,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${campusImage})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0c4a8a]/82" />

        <motion.div
          animate={{
            x: [0, 24, 0],
            y: [0, -14, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <motion.div
              whileHover={{ rotate: 4, scale: 1.04 }}
              className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
            >
              <img
                src={schoolLogo}
                alt="Consolatrix College of Toledo City seal"
                className="h-full w-full rounded-full object-cover"
              />
            </motion.div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-cyan-200 backdrop-blur-md">
                <FaLayerGroup />
                Academic Setup
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Block Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Create and maintain official student blocks by course, year level, semester, and school year.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={openAddModal}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
          >
            <FaPlus />
            Add Block
          </motion.button>
        </div>
      </motion.section>


      {/* Statistics */}

      <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }} className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Total Blocks
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {statistics.total}
            </h2>

            <FaLayerGroup className="text-xl text-blue-700" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Active
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-green-700">
              {statistics.active}
            </h2>

            <FaToggleOn className="text-2xl text-green-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Inactive
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-red-700">
              {statistics.inactive}
            </h2>

            <FaToggleOff className="text-2xl text-red-600" />
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] md:grid-cols-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search blocks..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-700"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(event) =>
            setCourseFilter(
              event.target.value
            )
          }
          className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700"
        >
          <option value="All">
            All Courses
          </option>

          {availableCourses.map(
            (course) => (
              <option
                key={course}
                value={course}
              >
                {course}
              </option>
            )
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700"
        >
          <option value="All">
            All Statuses
          </option>

          <option value="Active">
            Active
          </option>

          <option value="Inactive">
            Inactive
          </option>
        </select>
      </div>

      {/* Blocks Table */}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading blocks...
          </div>
        ) : filteredSections.length ===
          0 ? (
          <div className="p-12 text-center">
            <FaLayerGroup className="mx-auto text-4xl text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-700">
              No Blocks Found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a new block or change
              your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Course
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Year Level
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Block
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    School Year
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Semester
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSections.map(
                  (section) => (
                    <tr
                      key={section.id}
                      className="border-t transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">
                          {section.course}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {section.year_level}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-bold text-blue-700">
                          Block{" "}
                          {section.block_code}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {section.school_year}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {section.semester}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            section.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {section.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                section
                              )
                            }
                            title="Edit block"
                            className="rounded-md bg-yellow-500 p-2 text-white transition hover:bg-yellow-600"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(
                                section
                              )
                            }
                            title={
                              section.is_active
                                ? "Deactivate block"
                                : "Activate block"
                            }
                            className={`rounded-md p-2 text-white transition ${
                              section.is_active
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {section.is_active ? (
                              <FaToggleOff />
                            ) : (
                              <FaToggleOn />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                section
                              )
                            }
                            title="Delete block"
                            className="rounded-md bg-red-600 p-2 text-white transition hover:bg-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingSection
                    ? "Edit Block"
                    : "Add New Block"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the course,
                  year level, and block.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Course
                  </label>

                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={
                      handleInputChange
                    }
                    placeholder="Example: BSIT"
                    maxLength={30}
                    required
                    className="w-full rounded-lg border px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Year Level
                  </label>

                  <select
                    name="year_level"
                    value={
                      formData.year_level
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  >
                    <option value="">
                      Select Year Level
                    </option>

                    {YEAR_LEVELS.map(
                      (yearLevel) => (
                        <option
                          key={yearLevel}
                          value={yearLevel}
                        >
                          {yearLevel}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Block / Section Code
                  </label>

                  <input
                    type="text"
                    name="block_code"
                    value={
                      formData.block_code
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="Example: A"
                    maxLength={10}
                    required
                    className="w-full rounded-lg border px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    School Year
                  </label>

                  <input
                    type="text"
                    name="school_year"
                    value={
                      formData.school_year
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="2026-2027"
                    maxLength={9}
                    required
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Semester
                  </label>

                  <select
                    name="semester"
                    value={
                      formData.semester
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  >
                    {SEMESTERS.map(
                      (semester) => (
                        <option
                          key={semester}
                          value={semester}
                        >
                          {semester}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={
                    formData.is_active
                  }
                  onChange={
                    handleInputChange
                  }
                  className="h-5 w-5 accent-blue-700"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Active Block
                  </p>

                  <p className="text-xs text-slate-500">
                    Active blocks appear in
                    student registration.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingSection
                    ? "Update Block"
                    : "Add Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </motion.main>
    </AdminLayout>
  );
}

export default BlockManagement;