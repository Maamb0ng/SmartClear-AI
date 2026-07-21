import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  supabase,
} from "../../services/supabase";

import {
  FaCheckCircle,
  FaChevronRight,
  FaExclamationTriangle,
  FaFilter,
  FaGraduationCap,
  FaIdCard,
  FaLayerGroup,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

const YEAR_ORDER = {
  "1st Year": 1,
  "2nd Year": 2,
  "3rd Year": 3,
  "4th Year": 4,
};

const normalizeValue = (
  value
) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getStatusClass = (
  status
) => {
  if (status === "Active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Inactive") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getInitials = (
  name
) => {
  const words = String(
    name || "Student"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "ST";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[
      words.length - 1
    ][0]
  }`.toUpperCase();
};

function StudentManagement() {
  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    sections,
    setSections,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    activating,
    setActivating,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    courseFilter,
    setCourseFilter,
  ] = useState("All");

  const [
    yearFilter,
    setYearFilter,
  ] = useState("All");

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);

  const [
    selectedSectionId,
    setSelectedSectionId,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD STUDENTS AND OFFICIAL SECTIONS
  |--------------------------------------------------------------------------
  */

  const loadData =
    useCallback(
      async ({
        refresh = false,
      } = {}) => {
        try {
          if (refresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          const [
            studentResult,
            sectionResult,
          ] =
            await Promise.all([
              supabase
                .from("users")
                .select(`
                  id,
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
                .eq(
                  "role",
                  "Student"
                )
                .order(
                  "full_name",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  "sections"
                )
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
                .eq(
                  "is_active",
                  true
                ),
            ]);

          if (
            studentResult.error
          ) {
            throw studentResult.error;
          }

          if (
            sectionResult.error
          ) {
            throw sectionResult.error;
          }

          const formattedSections =
            (
              sectionResult.data ||
              []
            )
              .map(
                (
                  sectionRecord
                ) => {
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
                      courseRecord
                        ?.course_code ||
                      sectionRecord.course ||
                      "Unassigned",

                    courseName:
                      courseRecord
                        ?.course_name ||
                      "",
                  };
                }
              )
              .sort(
                (
                  first,
                  second
                ) => {
                  const courseComparison =
                    first.courseCode.localeCompare(
                      second.courseCode
                    );

                  if (
                    courseComparison !==
                    0
                  ) {
                    return courseComparison;
                  }

                  const yearComparison =
                    (YEAR_ORDER[
                      first.year_level
                    ] || 99) -
                    (YEAR_ORDER[
                      second.year_level
                    ] || 99);

                  if (
                    yearComparison !==
                    0
                  ) {
                    return yearComparison;
                  }

                  const semesterComparison =
                    String(
                      first.semester ||
                        ""
                    ).localeCompare(
                      String(
                        second.semester ||
                          ""
                      )
                    );

                  if (
                    semesterComparison !==
                    0
                  ) {
                    return semesterComparison;
                  }

                  return String(
                    first.block_code ||
                      ""
                  ).localeCompare(
                    String(
                      second.block_code ||
                        ""
                    ),
                    undefined,
                    {
                      numeric:
                        true,
                    }
                  );
                }
              );

          const nextStudents =
            studentResult.data ||
            [];

          setStudents(
            nextStudents
          );

          setSections(
            formattedSections
          );

          setSelectedStudent(
            (
              current
            ) => {
              if (
                !current?.id
              ) {
                return current;
              }

              return (
                nextStudents.find(
                  (
                    student
                  ) =>
                    student.id ===
                    current.id
                ) ||
                null
              );
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Load student management error:",
            error
          );

          await Swal.fire({
            icon:
              "error",
            title:
              "Unable to Load Student Management",
            text:
              error?.message ||
              "An unexpected error occurred while loading students and sections.",
            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadData();
  }, [
    loadData,
  ]);

  /*
  |--------------------------------------------------------------------------
  | DERIVED DATA
  |--------------------------------------------------------------------------
  */

  const statistics =
    useMemo(() => {
      return {
        total:
          students.length,

        active:
          students.filter(
            (
              student
            ) =>
              student.status ===
              "Active"
          ).length,

        pending:
          students.filter(
            (
              student
            ) =>
              student.status !==
                "Active" &&
              student.status !==
                "Inactive"
          ).length,

        unassigned:
          students.filter(
            (
              student
            ) =>
              !student.section_id
          ).length,
      };
    }, [
      students,
    ]);

  const courseOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (
                student
              ) =>
                student.course
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [
      students,
    ]);

  const yearOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (
                student
              ) =>
                student.year_level
            )
            .filter(Boolean)
        ),
      ].sort(
        (
          first,
          second
        ) =>
          (YEAR_ORDER[
            first
          ] || 99) -
          (YEAR_ORDER[
            second
          ] || 99)
      );
    }, [
      students,
    ]);

  const filteredStudents =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return students.filter(
        (
          student
        ) => {
          const searchable =
            [
              student.full_name,
              student.student_id,
              student.email,
              student.course,
              student.year_level,
              student.section,
              student.semester,
              student.school_year,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            (statusFilter ===
              "Unassigned" &&
              !student.section_id) ||
            (statusFilter !==
              "Unassigned" &&
              student.status ===
                statusFilter);

          const matchesCourse =
            courseFilter ===
              "All" ||
            student.course ===
              courseFilter;

          const matchesYear =
            yearFilter ===
              "All" ||
            student.year_level ===
              yearFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCourse &&
            matchesYear
          );
        }
      );
    }, [
      students,
      search,
      statusFilter,
      courseFilter,
      yearFilter,
    ]);

  const selectedOfficialSection =
    useMemo(() => {
      return sections.find(
        (
          sectionRecord
        ) =>
          sectionRecord.id ===
          selectedSectionId
      );
    }, [
      sections,
      selectedSectionId,
    ]);

  const currentOfficialSection =
    useMemo(() => {
      if (
        !selectedStudent
          ?.section_id
      ) {
        return null;
      }

      return (
        sections.find(
          (
            sectionRecord
          ) =>
            sectionRecord.id ===
            selectedStudent.section_id
        ) ||
        null
      );
    }, [
      sections,
      selectedStudent,
    ]);

  const findMatchingSection =
    useCallback(
      (
        student
      ) => {
        if (!student) {
          return null;
        }

        const matches =
          sections.filter(
            (
              sectionRecord
            ) =>
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

        return matches.length ===
          1
          ? matches[0]
          : null;
      },
      [
        sections,
      ]
    );

  const automaticMatch =
    useMemo(
      () =>
        findMatchingSection(
          selectedStudent
        ),
      [
        findMatchingSection,
        selectedStudent,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | STUDENT SELECTION
  |--------------------------------------------------------------------------
  */

  const openStudent = (
    student
  ) => {
    const matchedSection =
      student.section_id
        ? sections.find(
            (
              sectionRecord
            ) =>
              sectionRecord.id ===
              student.section_id
          )
        : findMatchingSection(
            student
          );

    setSelectedStudent(
      student
    );

    setSelectedSectionId(
      matchedSection?.id ||
        ""
    );
  };

  const clearSelection =
    () => {
      setSelectedStudent(
        null
      );

      setSelectedSectionId(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | LOCAL STATE UPDATE
  |--------------------------------------------------------------------------
  */

  const updateLocalStudent =
    (
      studentId,
      values
    ) => {
      setStudents(
        (
          current
        ) =>
          current.map(
            (
              student
            ) =>
              student.id ===
              studentId
                ? {
                    ...student,
                    ...values,
                  }
                : student
          )
      );

      setSelectedStudent(
        (
          current
        ) =>
          current?.id ===
          studentId
            ? {
                ...current,
                ...values,
              }
            : current
      );
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE OR ACTIVATE
  |--------------------------------------------------------------------------
  */

  const saveOfficialAssignment =
    async ({
      activate = false,
    } = {}) => {
      if (
        !selectedStudent
      ) {
        return;
      }

      if (
        !selectedOfficialSection
      ) {
        await Swal.fire({
          icon:
            "warning",
          title:
            "Official Class Required",
          text:
            "Select an active official section before saving or activating this student.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      if (activate) {
        const confirmation =
          await Swal.fire({
            icon:
              "question",
            title:
              "Save and Activate Student?",
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
            showCancelButton:
              true,
            confirmButtonText:
              "Save and Activate",
            cancelButtonText:
              "Cancel",
            confirmButtonColor:
              "#059669",
          });

        if (
          !confirmation.isConfirmed
        ) {
          return;
        }
      }

      try {
        if (activate) {
          setActivating(
            true
          );
        } else {
          setSaving(
            true
          );
        }

        const updatePayload = {
          section_id:
            selectedOfficialSection.id,

          course:
            selectedOfficialSection.courseCode,

          year_level:
            selectedOfficialSection.year_level,

          section:
            selectedOfficialSection.block_code,

          semester:
            selectedOfficialSection.semester,

          school_year:
            selectedOfficialSection.school_year,

          ...(activate
            ? {
                status:
                  "Active",
              }
            : {}),
        };

        const {
          error,
        } = await supabase
          .from("users")
          .update(
            updatePayload
          )
          .eq(
            "id",
            selectedStudent.id
          );

        if (error) {
          throw error;
        }

        updateLocalStudent(
          selectedStudent.id,
          updatePayload
        );

        await Swal.fire({
          icon:
            "success",
          title: activate
            ? "Student Activated"
            : "Official Assignment Saved",
          text: activate
            ? "The student can now log in and use the clearance workflow."
            : "The student's official section and academic term were updated.",
          timer:
            2100,
          showConfirmButton:
            false,
        });
      } catch (
        error
      ) {
        console.error(
          "Save official student assignment error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title: activate
            ? "Activation Failed"
            : "Save Failed",
          text:
            error?.message ||
            "Unable to update the student record.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(
          false
        );

        setActivating(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DISPLAY HELPERS
  |--------------------------------------------------------------------------
  */

  const getSectionLabel =
    (
      sectionRecord
    ) => {
      if (
        !sectionRecord
      ) {
        return "Not assigned";
      }

      return [
        sectionRecord.courseCode,
        sectionRecord.year_level,
        `Block ${sectionRecord.block_code}`,
        sectionRecord.semester,
        sectionRecord.school_year,
      ]
        .filter(Boolean)
        .join(" • ");
    };

  const clearFilters =
    () => {
      setSearch("");
      setStatusFilter(
        "All"
      );
      setCourseFilter(
        "All"
      );
      setYearFilter(
        "All"
      );
    };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

              <FaUserGraduate className="text-xl text-blue-700" />
            </div>

            <p className="mt-4 font-bold text-slate-700">
              Loading student records...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration:
            0.45,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="space-y-5 pb-8"
      >
        {/* Compact branded header */}

        <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#061b51] text-white shadow-[0_18px_45px_rgba(2,12,40,0.2)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/80" />

          <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <img
                src={
                  schoolLogo
                }
                alt="Consolatrix College seal"
                className="hidden h-14 w-14 shrink-0 rounded-full border border-white/25 bg-white p-1 object-cover shadow-lg sm:block"
              />

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">
                  <FaUserGraduate />
                  Account Verification
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                  Student Management
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100/70">
                  Verify submitted information, assign the official section,
                  and activate eligible student accounts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadData({
                  refresh:
                    true,
                })
              }
              disabled={
                refreshing
              }
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50 lg:self-center"
            >
              <FaSyncAlt
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
        </section>

        {/* Summary */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label:
                "Total Students",
              value:
                statistics.total,
              icon:
                FaUsers,
              className:
                "bg-blue-50 text-blue-700",
            },
            {
              label:
                "Active",
              value:
                statistics.active,
              icon:
                FaCheckCircle,
              className:
                "bg-emerald-50 text-emerald-700",
            },
            {
              label:
                "Pending",
              value:
                statistics.pending,
              icon:
                FaUserGraduate,
              className:
                "bg-amber-50 text-amber-700",
            },
            {
              label:
                "No Official Class",
              value:
                statistics.unassigned,
              icon:
                FaExclamationTriangle,
              className:
                "bg-red-50 text-red-700",
            },
          ].map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              return (
                <motion.article
                  key={
                    item.label
                  }
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.05,
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.className}`}
                  >
                    <Icon />
                  </div>

                  <div className="min-w-0">
                    <p className="text-2xl font-black text-slate-900">
                      {
                        item.value
                      }
                    </p>

                    <p className="truncate text-xs font-semibold text-slate-500">
                      {
                        item.label
                      }
                    </p>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* Search and filters */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px_auto]">
            <label className="relative block">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search name, student ID, email, course, or block..."
                className="h-11 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="relative">
              <FaFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

                <option value="Unassigned">
                  No Official Class
                </option>
              </select>
            </label>

            <select
              value={
                courseFilter
              }
              onChange={(
                event
              ) =>
                setCourseFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="All">
                All Courses
              </option>

              {courseOptions.map(
                (
                  course
                ) => (
                  <option
                    key={
                      course
                    }
                    value={
                      course
                    }
                  >
                    {
                      course
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                yearFilter
              }
              onChange={(
                event
              ) =>
                setYearFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="All">
                All Year Levels
              </option>

              {yearOptions.map(
                (
                  year
                ) => (
                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {
                      year
                    }
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Student workspace */}

        <section className="grid min-h-[620px] gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
          {/* Student directory */}

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <h2 className="font-black text-slate-900">
                  Student Directory
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {
                    filteredStudents.length
                  }{" "}
                  record
                  {filteredStudents.length ===
                  1
                    ? ""
                    : "s"}
                </p>
              </div>

              {selectedStudent && (
                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className="max-h-[70vh] min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {filteredStudents.length ===
              0 ? (
                <div className="flex min-h-48 items-center justify-center px-6 text-center">
                  <div>
                    <FaUserGraduate className="mx-auto text-4xl text-slate-300" />

                    <p className="mt-3 font-bold text-slate-600">
                      No students found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Change the search or filter options.
                    </p>
                  </div>
                </div>
              ) : (
                filteredStudents.map(
                  (
                    student,
                    index
                  ) => {
                    const active =
                      selectedStudent?.id ===
                      student.id;

                    return (
                      <motion.button
                        key={
                          student.id
                        }
                        initial={{
                          opacity: 0,
                          x: -8,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay:
                            Math.min(
                              index *
                                0.025,
                              0.25
                            ),
                        }}
                        type="button"
                        onClick={() =>
                          openStudent(
                            student
                          )
                        }
                        className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                            active
                              ? "bg-blue-700 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {getInitials(
                            student.full_name
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {student.full_name ||
                              "No Name"}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {student.student_id ||
                              "No Student ID"}
                            {" • "}
                            {student.course ||
                              "No Course"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
                                student.status
                              )}`}
                            >
                              {student.status ||
                                "Pending"}
                            </span>

                            {!student.section_id && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>

                        <FaChevronRight
                          className={`shrink-0 text-xs ${
                            active
                              ? "text-blue-600"
                              : "text-slate-300 group-hover:text-slate-500"
                          }`}
                        />
                      </motion.button>
                    );
                  }
                )
              )}
            </div>
          </aside>

          {/* Verification workspace */}

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <AnimatePresence
              mode="wait"
            >
              {!selectedStudent ? (
                <motion.div
                  key="empty"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="flex min-h-[620px] items-center justify-center p-8 text-center"
                >
                  <div className="max-w-sm">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-3xl text-slate-400">
                      <FaUserGraduate />
                    </div>

                    <h2 className="mt-5 text-2xl font-black text-slate-800">
                      Select a Student
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose a student from the directory to review their
                      submitted information and assign the correct official
                      section.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={
                    selectedStudent.id
                  }
                  initial={{
                    opacity: 0,
                    x: 12,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -12,
                  }}
                  transition={{
                    duration:
                      0.22,
                  }}
                >
                  {/* Selected student header */}

                  <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071b4b] text-lg font-black text-cyan-200">
                        {getInitials(
                          selectedStudent.full_name
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-black text-slate-900 sm:text-2xl">
                          {selectedStudent.full_name ||
                            "No Name"}
                        </h2>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {selectedStudent.student_id ||
                            "No Student ID"}
                          {" • "}
                          {selectedStudent.email ||
                            "No email"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex self-start rounded-full border px-3 py-1.5 text-xs font-black sm:self-center ${getStatusClass(
                        selectedStudent.status
                      )}`}
                    >
                      {selectedStudent.status ||
                        "Pending"}
                    </span>
                  </div>

                  <div className="space-y-5 p-5 sm:p-6">
                    {!selectedStudent.section_id && (
                      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-600" />

                        <div>
                          <p className="font-black text-amber-900">
                            Official class not yet assigned
                          </p>

                          <p className="mt-1 text-sm leading-6 text-amber-700">
                            The student cannot use the clearance workflow until
                            a real section record is saved and the account is
                            activated.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-5 lg:grid-cols-2">
                      {/* Submitted data */}

                      <section className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <FaIdCard />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                              Registration Data
                            </p>

                            <h3 className="font-black text-slate-900">
                              Submitted Information
                            </h3>
                          </div>
                        </div>

                        <dl className="mt-5 divide-y divide-slate-100">
                          {[
                            [
                              "Course",
                              selectedStudent.course,
                            ],
                            [
                              "Year Level",
                              selectedStudent.year_level,
                            ],
                            [
                              "Block",
                              selectedStudent.section
                                ? `Block ${selectedStudent.section}`
                                : null,
                            ],
                            [
                              "Semester",
                              selectedStudent.semester,
                            ],
                            [
                              "School Year",
                              selectedStudent.school_year,
                            ],
                          ].map(
                            ([
                              label,
                              value,
                            ]) => (
                              <div
                                key={
                                  label
                                }
                                className="flex items-start justify-between gap-4 py-3"
                              >
                                <dt className="text-sm font-semibold text-slate-500">
                                  {
                                    label
                                  }
                                </dt>

                                <dd className="text-right text-sm font-black text-slate-800">
                                  {value ||
                                    "Not provided"}
                                </dd>
                              </div>
                            )
                          )}
                        </dl>

                        {automaticMatch &&
                          !selectedStudent.section_id && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                              A unique matching official section was found
                              automatically and selected for verification.
                            </div>
                          )}
                      </section>

                      {/* Official section */}

                      <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <FaLayerGroup />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-500">
                              Verified Record
                            </p>

                            <h3 className="font-black text-slate-900">
                              Official Section Assignment
                            </h3>
                          </div>
                        </div>

                        <label className="mt-5 block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Select Official Class
                          </span>

                          <select
                            value={
                              selectedSectionId
                            }
                            onChange={(
                              event
                            ) =>
                              setSelectedSectionId(
                                event.target.value
                              )
                            }
                            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="">
                              Select course, year, block, semester, and school year
                            </option>

                            {sections.map(
                              (
                                sectionRecord
                              ) => (
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
                        </label>

                        {selectedOfficialSection ? (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                              <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />

                              <div className="min-w-0">
                                <p className="font-black text-emerald-900">
                                  Selected Official Class
                                </p>

                                <p className="mt-1 text-sm leading-6 text-emerald-700">
                                  {getSectionLabel(
                                    selectedOfficialSection
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                            No official section is selected.
                          </div>
                        )}

                        {currentOfficialSection && (
                          <p className="mt-3 text-xs text-slate-500">
                            Current saved assignment:{" "}
                            <span className="font-bold text-slate-700">
                              {getSectionLabel(
                                currentOfficialSection
                              )}
                            </span>
                          </p>
                        )}

                        {sections.length ===
                          0 && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            No active official sections are available. Create
                            the required section under Academic Setup first.
                          </div>
                        )}
                      </section>
                    </div>

                    {/* Assignment explanation */}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <FaGraduationCap className="mt-0.5 shrink-0 text-blue-700" />

                        <p className="text-sm leading-6 text-slate-600">
                          Subjects and teachers are assigned automatically from
                          the selected section's official class offerings.
                          Students are not assigned subjects individually on
                          this page.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white p-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        clearSelection
                      }
                      disabled={
                        saving ||
                        activating
                      }
                      className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        saveOfficialAssignment()
                      }
                      disabled={
                        saving ||
                        activating ||
                        !selectedOfficialSection
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaSave />

                      {saving
                        ? "Saving..."
                        : "Save Assignment"}
                    </button>

                    {selectedStudent.status !==
                      "Active" && (
                      <button
                        type="button"
                        onClick={() =>
                          saveOfficialAssignment({
                            activate:
                              true,
                          })
                        }
                        disabled={
                          saving ||
                          activating ||
                          !selectedOfficialSection
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaCheckCircle />

                        {activating
                          ? "Activating..."
                          : "Save & Activate"}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </motion.main>
    </AdminLayout>
  );
}

export default StudentManagement;