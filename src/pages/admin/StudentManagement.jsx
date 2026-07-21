import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";

import Swal from "sweetalert2";
import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";
import { supabase } from "../../services/supabase";

import {
  FaSearch,
  FaUserGraduate,
  FaEdit,
  FaSave,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa";

import {
  getSubjects,
  getAdvisers,
  getStudentSubjects,
  saveStudentSubjects,
  getStudentAdviser,
  saveStudentAdviser,
} from "../../services/studentService";

const YEAR_ORDER = {
  "1st Year": 1,
  "2nd Year": 2,
  "3rd Year": 3,
  "4th Year": 4,
};

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

function StudentManagement() {
  const [students, setStudents] =
    useState([]);

  const [subjects, setSubjects] =
    useState([]);

  const [advisers, setAdvisers] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [activating, setActivating] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);

  const [
    selectedSubjects,
    setSelectedSubjects,
  ] = useState([]);

  const [
    selectedAdviser,
    setSelectedAdviser,
  ] = useState("");

  const [
    selectedSectionId,
    setSelectedSectionId,
  ] = useState("");

  const [form, setForm] = useState({
    course: "",
    year_level: "",
    section: "",
    semester: "",
    school_year: "",
  });

  /*
  =====================================
  LOAD STUDENTS AND SETTINGS
  =====================================
  */

  const loadData = async () => {
    try {
      const [
        studentResult,
        subjectData,
        adviserData,
        sectionResult,
      ] = await Promise.all([
        supabase
          .from("users")
          .select(`
            id,
            auth_id,
            student_id,
            full_name,
            email,
            role,
            status,
            course,
            year_level,
            section,
            semester,
            school_year,
            section_id
          `)
          .eq("role", "Student")
          .order("full_name", {
            ascending: true,
          }),

        getSubjects(),

        getAdvisers(),

        supabase
          .from("sections")
          .select(`
            id,
            course_id,
            course,
            year_level,
            block_code,
            semester,
            school_year,
            is_active,

            course_record:courses!sections_course_id_fkey (
              id,
              course_code,
              course_name,
              is_active
            )
          `)
          .eq("is_active", true),
      ]);

      if (studentResult.error) {
        throw studentResult.error;
      }

      if (sectionResult.error) {
        throw sectionResult.error;
      }

      const formattedSections = (
        sectionResult.data || []
      )
        .map((sectionRecord) => {
          const courseRecord =
            Array.isArray(
              sectionRecord.course_record
            )
              ? sectionRecord
                  .course_record[0]
              : sectionRecord.course_record;

          return {
            ...sectionRecord,

            courseCode:
              courseRecord?.course_code ||
              sectionRecord.course ||
              "Unassigned",

            courseName:
              courseRecord?.course_name ||
              "",
          };
        })
        .sort((first, second) => {
          const courseComparison =
            first.courseCode.localeCompare(
              second.courseCode
            );

          if (courseComparison !== 0) {
            return courseComparison;
          }

          const yearComparison =
            (YEAR_ORDER[
              first.year_level
            ] || 99) -
            (YEAR_ORDER[
              second.year_level
            ] || 99);

          if (yearComparison !== 0) {
            return yearComparison;
          }

          const semesterComparison = (
            first.semester || ""
          ).localeCompare(
            second.semester || ""
          );

          if (
            semesterComparison !== 0
          ) {
            return semesterComparison;
          }

          return (
            first.block_code || ""
          ).localeCompare(
            second.block_code || "",
            undefined,
            {
              numeric: true,
            }
          );
        });

      setStudents(
        studentResult.data || []
      );

      setSubjects(subjectData || []);
      setAdvisers(adviserData || []);
      setSections(formattedSections);
    } catch (error) {
      console.error(
        "Load student management error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Unable to Load Data",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*
  =====================================
  FILTER STUDENTS
  =====================================
  */

  const filteredStudents =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      return students.filter(
        (student) => {
          return (
            !keyword ||
            (
              student.full_name || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            (
              student.student_id || ""
            )
              .toLowerCase()
              .includes(keyword) ||
            (student.email || "")
              .toLowerCase()
              .includes(keyword) ||
            (student.course || "")
              .toLowerCase()
              .includes(keyword) ||
            (student.section || "")
              .toLowerCase()
              .includes(keyword)
          );
        }
      );
    }, [students, search]);

  /*
  =====================================
  SELECTED OFFICIAL SECTION
  =====================================
  */

  const selectedOfficialSection =
    useMemo(() => {
      return sections.find(
        (sectionRecord) =>
          sectionRecord.id ===
          selectedSectionId
      );
    }, [
      sections,
      selectedSectionId,
    ]);

  /*
  =====================================
  MATCH SUBMITTED INFORMATION
  =====================================
  */

  const findMatchingSection = (
    student
  ) => {
    if (!student) {
      return null;
    }

    const matchingSections =
      sections.filter(
        (sectionRecord) => {
          return (
            normalizeValue(
              sectionRecord.courseCode
            ) ===
              normalizeValue(
                student.course
              ) &&
            normalizeValue(
              sectionRecord.year_level
            ) ===
              normalizeValue(
                student.year_level
              ) &&
            normalizeValue(
              sectionRecord.block_code
            ) ===
              normalizeValue(
                student.section
              ) &&
            normalizeValue(
              sectionRecord.school_year
            ) ===
              normalizeValue(
                student.school_year
              ) &&
            normalizeValue(
              sectionRecord.semester
            ) ===
              normalizeValue(
                student.semester
              )
          );
        }
      );

    if (
      matchingSections.length === 1
    ) {
      return matchingSections[0];
    }

    return null;
  };

  /*
  =====================================
  OPEN STUDENT
  =====================================
  */

  const openStudent = async (
    student
  ) => {
    try {
      setSelectedStudent(student);

      setForm({
        course: student.course || "",
        year_level:
          student.year_level || "",
        section:
          student.section || "",
        semester:
          student.semester || "",
        school_year:
          student.school_year || "",
      });

      let officialSectionId =
        student.section_id || "";

      if (!officialSectionId) {
        const automaticMatch =
          findMatchingSection(student);

        if (automaticMatch) {
          officialSectionId =
            automaticMatch.id;
        }
      }

      setSelectedSectionId(
        officialSectionId
      );

      const [
        assignedSubjects,
        adviser,
      ] = await Promise.all([
        getStudentSubjects(
          student.id
        ),

        getStudentAdviser(
          student.id
        ),
      ]);

      setSelectedSubjects(
        assignedSubjects || []
      );

      setSelectedAdviser(
        adviser || ""
      );
    } catch (error) {
      console.error(
        "Open student error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Load Student",
        text:
          error?.message ||
          "Unable to load the selected student.",
      });
    }
  };

  /*
  =====================================
  OFFICIAL SECTION CHANGE
  =====================================
  */

  const handleSectionChange = (
    event
  ) => {
    const sectionId =
      event.target.value;

    setSelectedSectionId(sectionId);

    const officialSection =
      sections.find(
        (sectionRecord) =>
          sectionRecord.id === sectionId
      );

    if (!officialSection) {
      return;
    }

    setForm({
      course:
        officialSection.courseCode,

      year_level:
        officialSection.year_level ||
        "",

      section:
        officialSection.block_code ||
        "",

      semester:
        officialSection.semester ||
        "",

      school_year:
        officialSection.school_year ||
        "",
    });
  };

  /*
  =====================================
  SUBJECT SELECTION
  =====================================
  */

  const toggleSubject = (
    subjectId
  ) => {
    setSelectedSubjects(
      (previousSubjects) => {
        if (
          previousSubjects.includes(
            subjectId
          )
        ) {
          return previousSubjects.filter(
            (id) => id !== subjectId
          );
        }

        return [
          ...previousSubjects,
          subjectId,
        ];
      }
    );
  };

  /*
  =====================================
  UPDATE LOCAL STUDENT
  =====================================
  */

  const updateLocalStudent = (
    updatedValues
  ) => {
    setStudents(
      (previousStudents) =>
        previousStudents.map(
          (student) =>
            student.id ===
            selectedStudent.id
              ? {
                  ...student,
                  ...updatedValues,
                }
              : student
        )
    );

    setSelectedStudent(
      (previousStudent) => ({
        ...previousStudent,
        ...updatedValues,
      })
    );
  };

  /*
  =====================================
  SAVE OFFICIAL ASSIGNMENT
  =====================================
  */

  const handleSave = async () => {
    if (!selectedStudent) {
      return;
    }

    if (!selectedSectionId) {
      Swal.fire({
        icon: "warning",
        title:
          "Official Class Required",
        text:
          "Please assign the student to an official course, year level, semester, school year, and block.",
      });

      return;
    }

    if (!selectedOfficialSection) {
      Swal.fire({
        icon: "error",
        title:
          "Invalid Class Assignment",
        text:
          "The selected official class could not be found.",
      });

      return;
    }

    try {
      setSaving(true);

      const studentUpdate = {
        section_id:
          selectedOfficialSection.id,

        course:
          selectedOfficialSection
            .courseCode,

        year_level:
          selectedOfficialSection
            .year_level,

        section:
          selectedOfficialSection
            .block_code,

        semester:
          selectedOfficialSection
            .semester,

        school_year:
          selectedOfficialSection
            .school_year,
      };

      const {
        error: updateError,
      } = await supabase
        .from("users")
        .update(studentUpdate)
        .eq(
          "id",
          selectedStudent.id
        );

      if (updateError) {
        throw updateError;
      }

      /*
      Existing student subject and
      adviser functions are retained.
      */

      await saveStudentSubjects(
        selectedStudent.id,
        selectedSubjects
      );

      await saveStudentAdviser(
        selectedStudent.id,
        selectedAdviser
      );

      updateLocalStudent(
        studentUpdate
      );

      await Swal.fire({
        icon: "success",
        title: "Student Updated",
        text:
          "The official class assignment and section ID were saved.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "Save student error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Save Student",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  /*
  =====================================
  ACTIVATE STUDENT
  =====================================
  */

  const handleActivate = async () => {
    if (!selectedStudent) {
      return;
    }

    if (!selectedSectionId) {
      Swal.fire({
        icon: "warning",
        title:
          "Cannot Activate Student",
        text:
          "Assign the student to an official class first.",
      });

      return;
    }

    if (!selectedOfficialSection) {
      Swal.fire({
        icon: "error",
        title:
          "Invalid Class Assignment",
        text:
          "The selected official class could not be found.",
      });

      return;
    }

    const confirmation =
      await Swal.fire({
        icon: "question",
        title:
          "Activate Student Account?",
        html: `
          <div style="text-align:left">
            <p>
              <strong>Student:</strong>
              ${
                selectedStudent.full_name ||
                selectedStudent.student_id
              }
            </p>

            <p style="margin-top:8px">
              <strong>Official Class:</strong>
              ${
                selectedOfficialSection.courseCode
              }
              ${
                selectedOfficialSection.year_level
              }
              — Block
              ${
                selectedOfficialSection.block_code
              }
            </p>

            <p style="margin-top:8px">
              <strong>Term:</strong>
              ${
                selectedOfficialSection.semester
              },
              ${
                selectedOfficialSection.school_year
              }
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText:
          "Activate Account",
        cancelButtonText: "Cancel",
        confirmButtonColor:
          "#16a34a",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setActivating(true);

      const studentUpdate = {
        section_id:
          selectedOfficialSection.id,

        course:
          selectedOfficialSection
            .courseCode,

        year_level:
          selectedOfficialSection
            .year_level,

        section:
          selectedOfficialSection
            .block_code,

        semester:
          selectedOfficialSection
            .semester,

        school_year:
          selectedOfficialSection
            .school_year,

        status: "Active",
      };

      const {
        error: activationError,
      } = await supabase
        .from("users")
        .update(studentUpdate)
        .eq(
          "id",
          selectedStudent.id
        );

      if (activationError) {
        throw activationError;
      }

      updateLocalStudent(
        studentUpdate
      );

      await Swal.fire({
        icon: "success",
        title:
          "Student Activated",
        text:
          "The student can now log in and submit a clearance request.",
      });
    } catch (error) {
      console.error(
        "Activate student error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Activation Failed",
        text:
          error?.message ||
          "Unable to activate the student.",
      });
    } finally {
      setActivating(false);
    }
  };

  /*
  =====================================
  REFRESH
  =====================================
  */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  /*
  =====================================
  DISPLAY HELPERS
  =====================================
  */

  const getStatusClass = (
    status
  ) => {
    if (status === "Active") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Inactive") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const getSectionLabel = (
    sectionRecord
  ) => {
    return [
      sectionRecord.courseCode,

      sectionRecord.year_level,

      `Block ${
        sectionRecord.block_code
      }`,

      sectionRecord.semester,

      sectionRecord.school_year,
    ]
      .filter(Boolean)
      .join(" — ");
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
        className="relative pb-10"
      >
      <div className="space-y-6">
        <motion.section
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
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

        <div className="relative z-10 flex items-center gap-4 p-6 sm:p-7">
          <motion.div
            whileHover={{
              rotate: 4,
              scale: 1.04,
            }}
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
              <FaUserGraduate className="text-cyan-300" />
              Account Verification
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Student Management
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/75">
              Verify student information, assign the official course and section, and activate accounts for clearance access.
            </p>
          </div>
        </div>
      </motion.section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left panel */}

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:col-span-4">
            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-4 text-slate-400" />

              <input
                type="text"
                placeholder="Search student..."
                className="w-full rounded-xl border py-3 pl-11 pr-4 outline-none focus:border-blue-600"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="max-h-[700px] space-y-3 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-slate-500">
                  Loading students...
                </p>
              ) : filteredStudents.length ===
                0 ? (
                <p className="py-8 text-center text-slate-500">
                  No students found.
                </p>
              ) : (
                filteredStudents.map(
                  (student) => (
                    <button
                      type="button"
                      key={student.id}
                      onClick={() =>
                        openStudent(student)
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                        selectedStudent?.id ===
                        student.id
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FaUserGraduate className="mt-1 text-2xl text-blue-600" />

                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-semibold text-slate-800">
                            {student.full_name ||
                              "No Name"}
                          </h2>

                          <p className="text-sm text-slate-500">
                            {student.student_id ||
                              "No Student ID"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                student.status
                              )}`}
                            >
                              {student.status ||
                                "Pending"}
                            </span>

                            {!student.section_id && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                No Official Class
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>

          {/* Right panel */}

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] xl:col-span-8">
            {selectedStudent ? (
              <>
                <div className="mb-8 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">
                      {selectedStudent.full_name ||
                        "No Name"}
                    </h2>

                    <p className="mt-1 text-slate-500">
                      {selectedStudent.student_id}
                    </p>

                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusClass(
                        selectedStudent.status
                      )}`}
                    >
                      {selectedStudent.status ||
                        "Pending"}
                    </span>
                  </div>

                  <FaEdit className="text-4xl text-blue-600" />
                </div>

                {!selectedStudent.section_id && (
                  <div className="mb-6 flex gap-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-5">
                    <FaExclamationTriangle className="mt-1 text-2xl text-yellow-600" />

                    <div>
                      <h3 className="font-bold text-yellow-800">
                        Official class not
                        assigned
                      </h3>

                      <p className="mt-1 text-sm text-yellow-700">
                        This student cannot
                        submit a clearance
                        request until an actual
                        section ID is assigned.
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted information */}

                <div>
                  <h3 className="mb-4 text-xl font-bold text-slate-800">
                    Submitted Academic
                    Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Course
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedStudent.course ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Year Level
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedStudent.year_level ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Block
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedStudent.section
                          ? `Block ${selectedStudent.section}`
                          : "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Semester
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedStudent.semester ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        School Year
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedStudent.school_year ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Official assignment */}

                <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                      <FaLayerGroup />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        Official Class
                        Assignment
                      </h3>

                      <p className="text-sm text-slate-500">
                        Select the real class
                        record connected to the
                        sections table.
                      </p>
                    </div>
                  </div>

                  <select
                    value={selectedSectionId}
                    onChange={
                      handleSectionChange
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-600"
                  >
                    <option value="">
                      Select Official Course,
                      Year, Semester and Block
                    </option>

                    {sections.map(
                      (sectionRecord) => (
                        <option
                          key={
                            sectionRecord.id
                          }
                          value={
                            sectionRecord.id
                          }
                        >
                          {getSectionLabel(
                            sectionRecord
                          )}
                        </option>
                      )
                    )}
                  </select>

                  {selectedOfficialSection && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-semibold text-green-800">
                        Selected Official Class
                      </p>

                      <p className="mt-2 text-green-700">
                        {getSectionLabel(
                          selectedOfficialSection
                        )}
                      </p>

                      <p className="mt-2 break-all text-xs text-green-600">
                        Section ID:{" "}
                        {
                          selectedOfficialSection.id
                        }
                      </p>
                    </div>
                  )}

                  {sections.length === 0 && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      No active official
                      sections are available.
                      Create the required block
                      under Course Management
                      first.
                    </div>
                  )}
                </div>

                {/* Adviser */}

                <div className="mt-8">
                  <label className="mb-2 block text-lg font-bold text-slate-800">
                    Adviser
                  </label>

                  <select
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-600"
                    value={selectedAdviser}
                    onChange={(event) =>
                      setSelectedAdviser(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Adviser
                    </option>

                    {advisers.map(
                      (adviser) => (
                        <option
                          key={adviser.id}
                          value={adviser.id}
                        >
                          {adviser.full_name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Subject assignments */}

                <div className="mt-10">
                  <h3 className="mb-2 text-xl font-bold text-slate-800">
                    Assign Subjects
                  </h3>

                  <p className="mb-4 text-sm text-slate-500">
                    Existing student subject
                    assignments are retained.
                    Clearance teacher
                    assignments are generated
                    from Class Assignments.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {subjects.map(
                      (subject) => (
                        <label
                          key={subject.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(
                              subject.id
                            )}
                            onChange={() =>
                              toggleSubject(
                                subject.id
                              )
                            }
                            className="h-5 w-5 accent-blue-600"
                          />

                          <div>
                            <p className="font-semibold text-slate-800">
                              {
                                subject.subject_name
                              }
                            </p>

                            <p className="text-sm text-slate-500">
                              {
                                subject.subject_code
                              }
                            </p>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                </div>

                {/* Actions */}

                <div className="mt-10 flex flex-wrap gap-3 border-t pt-6">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={
                      saving ||
                      activating ||
                      !selectedSectionId
                    }
                    className="flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave />

                    {saving
                      ? "Saving..."
                      : "Save Student"}
                  </button>

                  {selectedStudent.status !==
                    "Active" && (
                    <button
                      type="button"
                      onClick={
                        handleActivate
                      }
                      disabled={
                        saving ||
                        activating ||
                        !selectedSectionId
                      }
                      className="flex items-center gap-3 rounded-xl bg-green-600 px-7 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaCheckCircle />

                      {activating
                        ? "Activating..."
                        : "Save and Activate"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[600px] items-center justify-center">
                <div className="text-center">
                  <FaUserGraduate className="mx-auto mb-5 text-7xl text-slate-300" />

                  <h2 className="text-2xl font-bold text-slate-500">
                    Select a Student
                  </h2>

                  <p className="mt-2 text-slate-400">
                    Choose a student from the
                    left panel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
          </motion.main>
    </AdminLayout>
  );
}

export default StudentManagement;