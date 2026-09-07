import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  FaBook,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import {
  addSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from "../../services/subjectService";

import { getOffices } from "../../services/officeService";

const PROGRAM_OPTIONS = ["BSIT", "BSCS", "BSED", "BSBA"];

const YEAR_LEVELS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
];

const SEMESTERS = [
  { value: 1, label: "1st Semester" },
  { value: 2, label: "2nd Semester" },
  { value: 3, label: "Summer" },
];

const DEFAULT_FORM = {
  subject_code: "",
  subject_name: "",
  program: "BSIT",
  year_level: 1,
  semester: 1,
  units: 3,
  assigned_office: "",
  is_active: true,
};

function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [offices, setOffices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("BSIT");
  const [selectedYear, setSelectedYear] = useState(1);

  const [expandedSemesters, setExpandedSemesters] = useState({
    1: true,
    2: true,
    3: true,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [formData, setFormData] = useState(DEFAULT_FORM);

  const loadSubjects = async () => {
    try {
      setLoading(true);

      const data = await getSubjects();
      setSubjects(data || []);
    } catch (error) {
      console.error("Load subjects error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to Load Subjects",
        text:
          error?.message ||
          "An unexpected error occurred while loading subjects.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    try {
      const data = await getOffices();
      setOffices(data || []);
    } catch (error) {
      console.error("Load offices error:", error);
    }
  };

  useEffect(() => {
    loadSubjects();
    loadOffices();
  }, []);

  const availablePrograms = useMemo(() => {
    const programsFromSubjects = subjects
      .map((subject) => subject.program)
      .filter(Boolean);

    return Array.from(
      new Set([...PROGRAM_OPTIONS, ...programsFromSubjects])
    );
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const sameProgram = subject.program === selectedProgram;
      const sameYear = Number(subject.year_level) === Number(selectedYear);

      if (!sameProgram || !sameYear) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const code = subject.subject_code?.toLowerCase() || "";
      const name = subject.subject_name?.toLowerCase() || "";
      const office =
        subject.offices?.office_name?.toLowerCase() || "";

      return (
        code.includes(keyword) ||
        name.includes(keyword) ||
        office.includes(keyword)
      );
    });
  }, [subjects, search, selectedProgram, selectedYear]);

  const groupedSubjects = useMemo(() => {
    return SEMESTERS.reduce((groups, semester) => {
      groups[semester.value] = filteredSubjects
        .filter(
          (subject) =>
            Number(subject.semester) === Number(semester.value)
        )
        .sort((first, second) =>
          (first.subject_code || "").localeCompare(
            second.subject_code || ""
          )
        );

      return groups;
    }, {});
  }, [filteredSubjects]);

  const statistics = useMemo(() => {
    const total = subjects.length;
    const active = subjects.filter(
      (subject) => subject.is_active
    ).length;

    return {
      total,
      active,
      inactive: total - active,
    };
  }, [subjects]);

  const getProgramCount = (program) =>
    subjects.filter((subject) => subject.program === program).length;

  const getYearCount = (year) =>
    subjects.filter(
      (subject) =>
        subject.program === selectedProgram &&
        Number(subject.year_level) === Number(year)
    ).length;

  const openAddModal = () => {
    setEditingSubject(null);

    setFormData({
      ...DEFAULT_FORM,
      program: selectedProgram,
      year_level: selectedYear,
    });

    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setFormData({
      subject_code: subject.subject_code || "",
      subject_name: subject.subject_name || "",
      program: subject.program || selectedProgram,
      year_level: Number(subject.year_level) || selectedYear,
      semester: Number(subject.semester) || 1,
      units: Number(subject.units) || 3,
      assigned_office: subject.assigned_office || "",
      is_active: subject.is_active ?? true,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingSubject(null);
    setFormData(DEFAULT_FORM);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleSemester = (semester) => {
    setExpandedSemesters((previous) => ({
      ...previous,
      [semester]: !previous[semester],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.subject_code.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Subject Code Required",
        text: "Please enter the subject code.",
      });

      return;
    }

    if (!formData.subject_name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Subject Name Required",
        text: "Please enter the complete subject name.",
      });

      return;
    }

    const units = Number(formData.units);

    if (!Number.isFinite(units) || units <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Units",
        text: "Units must be greater than zero.",
      });

      return;
    }

    const payload = {
      subject_code: formData.subject_code.trim().toUpperCase(),
      subject_name: formData.subject_name.trim(),
      program: formData.program,
      year_level: Number(formData.year_level),
      semester: Number(formData.semester),
      units,
      assigned_office: formData.assigned_office || null,
      is_active: formData.is_active,
    };

    try {
      setSaving(true);

      if (editingSubject) {
        await updateSubject(editingSubject.id, payload);

        await Swal.fire({
          icon: "success",
          title: "Subject Updated",
          text: "The subject was updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await addSubject(payload);

        await Swal.fire({
          icon: "success",
          title: "Subject Added",
          text: "The new subject was added successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setSelectedProgram(payload.program);
      setSelectedYear(payload.year_level);

      setShowModal(false);
      setEditingSubject(null);
      setFormData(DEFAULT_FORM);

      await loadSubjects();
    } catch (error) {
      console.error("Save subject error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to Save Subject",
        text:
          error?.message ||
          "An unexpected error occurred while saving the subject.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Subject?",
      html: `
        <div style="text-align:left">
          <p>
            <strong>${subject.subject_code}</strong>
            — ${subject.subject_name}
          </p>
          <p style="margin-top:10px;color:#dc2626">
            Delete this only when it is not used by any class assignment.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete Subject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteSubject(subject.id);

      await Swal.fire({
        icon: "success",
        title: "Subject Deleted",
        timer: 1400,
        showConfirmButton: false,
      });

      await loadSubjects();
    } catch (error) {
      console.error("Delete subject error:", error);

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "The subject may still be used by a class assignment.",
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

        <motion.section
          initial={{ opacity: 0, y: -18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.62,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage: `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/82" />

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
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ rotate: 4, scale: 1.04 }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
                  <FaLayerGroup className="text-cyan-300" />
                  Academic Setup
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Subject Management
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/75">
                  Subjects are grouped by course, year level, and
                  semester for easier academic setup.
                </p>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={openAddModal}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
            >
              <FaPlus />
              Add Subject
            </motion.button>
          </div>
        </motion.section>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            <p className="text-sm text-slate-500">Total Subjects</p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            <p className="text-sm text-slate-500">Active Subjects</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {statistics.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            <p className="text-sm text-slate-500">Inactive Subjects</p>
            <p className="mt-2 text-2xl font-black text-red-700">
              {statistics.inactive}
            </p>
          </div>
        </div>

        <section className="mb-5 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Select Course
          </p>

          <div className="flex flex-wrap gap-2">
            {availablePrograms.map((program) => {
              const active = selectedProgram === program;

              return (
                <motion.button
                  key={program}
                  type="button"
                  onClick={() => {
                    setSelectedProgram(program);
                    setSelectedYear(1);
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
                    active
                      ? "border-blue-700 bg-blue-700 text-white shadow-lg shadow-blue-900/15"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {program}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {getProgramCount(program)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mb-5 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Select Year Level
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {YEAR_LEVELS.map((year) => {
              const active = Number(selectedYear) === year.value;

              return (
                <motion.button
                  key={year.value}
                  type="button"
                  onClick={() => setSelectedYear(year.value)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  <span className="font-black">{year.label}</span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getYearCount(year.value)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] sm:flex-row">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-4 text-slate-400" />

            <input
              type="text"
              placeholder={`Search ${selectedProgram} ${selectedYear} subject...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <motion.button
            type="button"
            onClick={openAddModal}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15"
          >
            <FaPlus />
            Add to {selectedProgram}
          </motion.button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center text-slate-500">
              Loading subjects...
            </div>
          ) : (
            SEMESTERS.map((semester) => {
              const semesterSubjects =
                groupedSubjects[semester.value] || [];

              const isExpanded =
                expandedSemesters[semester.value];

              return (
                <motion.section
                  key={semester.value}
                  layout
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.07)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleSemester(semester.value)}
                    className="flex w-full items-center justify-between gap-4 bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                        <FaBook />
                      </div>

                      <div>
                        <h2 className="font-black text-slate-800">
                          {semester.label}
                        </h2>

                        <p className="text-sm text-slate-500">
                          {selectedProgram} ·{" "}
                          {
                            YEAR_LEVELS.find(
                              (year) => year.value === selectedYear
                            )?.label
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-black text-white">
                        {semesterSubjects.length} Subject
                        {semesterSubjects.length === 1 ? "" : "s"}
                      </span>

                      {isExpanded ? (
                        <FaChevronDown className="text-slate-500" />
                      ) : (
                        <FaChevronRight className="text-slate-500" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {semesterSubjects.length === 0 ? (
                          <div className="p-10 text-center">
                            <FaBook className="mx-auto text-4xl text-slate-300" />

                            <h3 className="mt-3 font-bold text-slate-700">
                              No subjects in this semester
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              Add a subject for {selectedProgram},{" "}
                              {
                                YEAR_LEVELS.find(
                                  (year) =>
                                    year.value === selectedYear
                                )?.label
                              }
                              .
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                            {semesterSubjects.map(
                              (subject, index) => (
                                <motion.article
                                  key={subject.id}
                                  initial={{
                                    opacity: 0,
                                    y: 10,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                  }}
                                  transition={{
                                    delay: index * 0.04,
                                  }}
                                  whileHover={{
                                    y: -4,
                                  }}
                                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-lg"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <span className="inline-flex rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                        {subject.subject_code}
                                      </span>

                                      <h3 className="mt-3 text-lg font-black leading-snug text-slate-800">
                                        {subject.subject_name}
                                      </h3>
                                    </div>

                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                        subject.is_active
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      <FaCheckCircle />
                                      {subject.is_active
                                        ? "Active"
                                        : "Inactive"}
                                    </span>
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                                    <div>
                                      <p className="text-xs text-slate-500">
                                        Units
                                      </p>
                                      <p className="font-black text-slate-700">
                                        {subject.units}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-slate-500">
                                        Office
                                      </p>
                                      <p className="truncate font-black text-slate-700">
                                        {subject.offices?.office_name ||
                                          "No Office"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex justify-end gap-2">
                                    <motion.button
                                      type="button"
                                      onClick={() =>
                                        openEditModal(subject)
                                      }
                                      whileTap={{ scale: 0.94 }}
                                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
                                    >
                                      <FaEdit />
                                      Edit
                                    </motion.button>

                                    <motion.button
                                      type="button"
                                      onClick={() =>
                                        handleDelete(subject)
                                      }
                                      whileTap={{ scale: 0.94 }}
                                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                    >
                                      <FaTrash />
                                      Delete
                                    </motion.button>
                                  </div>
                                </motion.article>
                              )
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-2xl"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      {editingSubject
                        ? "Edit Subject"
                        : "Add Subject"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Assign the subject to its correct course, year
                      level, and semester.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-full bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Subject Code
                      </label>

                      <input
                        type="text"
                        name="subject_code"
                        value={formData.subject_code}
                        onChange={handleChange}
                        placeholder="Example: IT 401"
                        required
                        className="w-full rounded-xl border border-slate-200 p-3 uppercase outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Units
                      </label>

                      <input
                        type="number"
                        name="units"
                        min="1"
                        step="1"
                        value={formData.units}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Subject Name
                      </label>

                      <input
                        type="text"
                        name="subject_name"
                        value={formData.subject_name}
                        onChange={handleChange}
                        placeholder="Example: Capstone Project 2"
                        required
                        className="w-full rounded-xl border border-slate-200 p-3 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Course
                      </label>

                      <select
                        name="program"
                        value={formData.program}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        {availablePrograms.map((program) => (
                          <option key={program} value={program}>
                            {program}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Year Level
                      </label>

                      <select
                        name="year_level"
                        value={formData.year_level}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        {YEAR_LEVELS.map((year) => (
                          <option
                            key={year.value}
                            value={year.value}
                          >
                            {year.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Semester
                      </label>

                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        {SEMESTERS.map((semester) => (
                          <option
                            key={semester.value}
                            value={semester.value}
                          >
                            {semester.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Assigned Office
                      </label>

                      <select
                        name="assigned_office"
                        value={formData.assigned_office}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        <option value="">No Office</option>

                        {offices.map((office) => (
                          <option
                            key={office.id}
                            value={office.id}
                          >
                            {office.office_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="h-5 w-5 accent-blue-700"
                      />

                      <div>
                        <p className="font-bold text-slate-700">
                          Active Subject
                        </p>

                        <p className="text-xs text-slate-500">
                          Active subjects appear in class assignment
                          selections.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={saving}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:from-blue-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaSave />

                      {saving
                        ? "Saving..."
                        : editingSubject
                        ? "Update Subject"
                        : "Add Subject"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </AdminLayout>
  );
}

export default SubjectManagement;