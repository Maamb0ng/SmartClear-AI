import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  createCourse,
  deleteCourse,
  getCoursesWithSections,
  setCourseStatus,
  updateCourse,
} from "../../services/courseService";

import {
  createSection,
  deleteSection,
  getSectionStudentCount,
  setSectionStatus,
  updateSection,
} from "../../services/sectionService";

import {
  getClassOfferingsBySection,
} from "../../services/classOfferingService";

import {
  FaBan,
  FaBook,
  FaBookOpen,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaGraduationCap,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
  FaUsers,
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

const SEMESTER_ORDER = {
  "1st Semester": 1,
  "2nd Semester": 2,
  Summer: 3,
};

const createDefaultCourseForm = () => ({
  course_code: "",
  course_name: "",
  is_active: true,
});

const createDefaultBlockForm = () => ({
  course_id: "",
  course: "",
  year_level: "1st Year",
  block_code: "",
  school_year: "",
  semester: "1st Semester",
  is_active: true,
});

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sectionInsights, setSectionInsights] =
    useState({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [
    expandedCourseIds,
    setExpandedCourseIds,
  ] = useState([]);

  const [
    selectedYearByCourse,
    setSelectedYearByCourse,
  ] = useState({});

  const [
    showCourseModal,
    setShowCourseModal,
  ] = useState(false);

  const [
    showBlockModal,
    setShowBlockModal,
  ] = useState(false);

  const [editingCourse, setEditingCourse] =
    useState(null);

  const [editingBlock, setEditingBlock] =
    useState(null);

  const [courseForm, setCourseForm] =
    useState(createDefaultCourseForm);

  const [blockForm, setBlockForm] =
    useState(createDefaultBlockForm);

  /*
  |--------------------------------------------------------------------------
  | Prevent repeated first-course initialization
  |--------------------------------------------------------------------------
  */

  const hasInitializedCourseView =
    useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Load block insights
  |--------------------------------------------------------------------------
  */

  const loadSectionInsights = useCallback(
    async (courseList) => {
      const sections = (courseList || []).flatMap(
        (course) => course.sections || []
      );

      if (sections.length === 0) {
        setSectionInsights({});
        return;
      }

      const insightEntries = await Promise.all(
        sections.map(async (section) => {
          try {
            const [studentCount, offerings] =
              await Promise.all([
                getSectionStudentCount(section.id),
                getClassOfferingsBySection(
                  section.id,
                  section.school_year,
                  section.semester
                ),
              ]);

            const teacherIds = new Set(
              (offerings || [])
                .map((offering) => offering.teacher_id)
                .filter(Boolean)
            );

            return [
              section.id,
              {
                students: studentCount || 0,
                subjects: offerings?.length || 0,
                teachers: teacherIds.size,
              },
            ];
          } catch (error) {
            console.error(
              `Unable to load insights for section ${section.id}:`,
              error
            );

            return [
              section.id,
              {
                students: 0,
                subjects: 0,
                teachers: 0,
              },
            ];
          }
        })
      );

      setSectionInsights(
        Object.fromEntries(insightEntries)
      );
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Load courses and blocks
  |--------------------------------------------------------------------------
  */

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);

      const data =
        await getCoursesWithSections();

      const safeCourses =
        data || [];

      setCourses(safeCourses);
      void loadSectionInsights(safeCourses);

      /*
      |--------------------------------------------------------------------------
      | Initialize the first course only once
      |--------------------------------------------------------------------------
      | Previously, expandedCourseIds.length was a dependency of loadCourses.
      | Clicking an accordion arrow changed that length, recreated loadCourses,
      | triggered useEffect again, and reloaded the whole page.
      |--------------------------------------------------------------------------
      */

      if (
        !hasInitializedCourseView.current &&
        safeCourses.length > 0
      ) {
        const firstCourseId =
          safeCourses[0].id;

        setExpandedCourseIds([
          firstCourseId,
        ]);

        setSelectedYearByCourse(
          (previousData) => ({
            ...previousData,
            [firstCourseId]:
              previousData[
                firstCourseId
              ] || "1st Year",
          })
        );

        hasInitializedCourseView.current =
          true;
      }
    } catch (error) {
      console.error(
        "Load courses error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Load Courses",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }, [loadSectionInsights]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    const totalCourses = courses.length;

    const activeCourses = courses.filter(
      (course) => course.is_active
    ).length;

    const allSections = courses.flatMap(
      (course) => course.sections || []
    );

    const totalBlocks = allSections.length;

    const activeBlocks = allSections.filter(
      (section) => section.is_active
    ).length;

    return {
      totalCourses,
      activeCourses,
      totalBlocks,
      activeBlocks,
    };
  }, [courses]);

  /*
  |--------------------------------------------------------------------------
  | Search and filters
  |--------------------------------------------------------------------------
  */

  const filteredCourses = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !keyword ||
        course.course_code
          ?.toLowerCase()
          .includes(keyword) ||
        course.course_name
          ?.toLowerCase()
          .includes(keyword) ||
        course.sections?.some(
          (section) =>
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
              .includes(keyword)
        );

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" &&
          course.is_active) ||
        (statusFilter === "Inactive" &&
          !course.is_active);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [courses, search, statusFilter]);

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const isCourseExpanded = (courseId) =>
    expandedCourseIds.includes(courseId);

  const getSelectedYear = (courseId) =>
    selectedYearByCourse[courseId] ||
    "1st Year";

  const getYearSections = (
    course,
    yearLevel
  ) => {
    return (course.sections || []).filter(
      (section) =>
        section.year_level === yearLevel
    );
  };

  const getYearBlockCount = (
    course,
    yearLevel
  ) => {
    return getYearSections(
      course,
      yearLevel
    ).length;
  };

  const groupSectionsByTerm = (
    sections
  ) => {
    const groups = {};

    sections.forEach((section) => {
      const groupKey = `${section.school_year}-${section.semester}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          school_year:
            section.school_year,
          semester: section.semester,
          sections: [],
        };
      }

      groups[groupKey].sections.push(
        section
      );
    });

    return Object.values(groups)
      .map((group) => ({
        ...group,

        sections: group.sections.sort(
          (firstSection, secondSection) =>
            (
              firstSection.block_code || ""
            ).localeCompare(
              secondSection.block_code ||
                ""
            )
        ),
      }))
      .sort((firstGroup, secondGroup) => {
        const schoolYearComparison =
          (
            secondGroup.school_year || ""
          ).localeCompare(
            firstGroup.school_year || ""
          );

        if (schoolYearComparison !== 0) {
          return schoolYearComparison;
        }

        return (
          SEMESTER_ORDER[
            firstGroup.semester
          ] || 99
        ) - (
          SEMESTER_ORDER[
            secondGroup.semester
          ] || 99
        );
      });
  };

  /*
  |--------------------------------------------------------------------------
  | Expand course and select year
  |--------------------------------------------------------------------------
  */

  const toggleCourseExpansion = (
    courseId
  ) => {
    setExpandedCourseIds(
      (previousIds) => {
        if (
          previousIds.includes(courseId)
        ) {
          return previousIds.filter(
            (id) => id !== courseId
          );
        }

        return [
          ...previousIds,
          courseId,
        ];
      }
    );

    setSelectedYearByCourse(
      (previousData) => ({
        ...previousData,

        [courseId]:
          previousData[courseId] ||
          "1st Year",
      })
    );
  };

  const handleYearSelection = (
    courseId,
    yearLevel
  ) => {
    setSelectedYearByCourse(
      (previousData) => ({
        ...previousData,
        [courseId]: yearLevel,
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Course modal
  |--------------------------------------------------------------------------
  */

  const openAddCourseModal = () => {
    setEditingCourse(null);

    setCourseForm(
      createDefaultCourseForm()
    );

    setShowCourseModal(true);
  };

  const openEditCourseModal = (
    course
  ) => {
    setEditingCourse(course);

    setCourseForm({
      course_code:
        course.course_code || "",

      course_name:
        course.course_name || "",

      is_active:
        course.is_active ?? true,
    });

    setShowCourseModal(true);
  };

  const closeCourseModal = () => {
    if (saving) {
      return;
    }

    setShowCourseModal(false);
    setEditingCourse(null);

    setCourseForm(
      createDefaultCourseForm()
    );
  };

  const handleCourseFormChange = (
    event
  ) => {
    const { name, value, type, checked } =
      event.target;

    setCourseForm((previousData) => ({
      ...previousData,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleCourseSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !courseForm.course_code.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Course Code Required",
        text:
          "Please enter the course code.",
      });

      return;
    }

    if (
      !courseForm.course_name.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Course Name Required",
        text:
          "Please enter the complete course name.",
      });

      return;
    }

    try {
      setSaving(true);

      if (editingCourse) {
        await updateCourse(
          editingCourse.id,
          courseForm
        );

        await Swal.fire({
          icon: "success",
          title: "Course Updated",
          text:
            "The course information was updated successfully.",
        });
      } else {
        await createCourse(courseForm);

        await Swal.fire({
          icon: "success",
          title: "Course Added",
          text:
            "The new course was added successfully.",
        });
      }

      closeCourseModal();
      await loadCourses();
    } catch (error) {
      console.error(
        "Save course error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.message ||
          "Unable to save the course.",
      });
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Course status
  |--------------------------------------------------------------------------
  */

  const handleCourseStatusChange =
    async (course) => {
      const newStatus =
        !course.is_active;

      const confirmation =
        await Swal.fire({
          icon: "question",

          title: newStatus
            ? "Activate Course?"
            : "Deactivate Course?",

          html: `
            <div style="text-align:left">
              <p>
                <strong>
                  ${course.course_code}
                </strong>
                — ${course.course_name}
              </p>

              ${
                !newStatus
                  ? `
                    <p style="margin-top:10px;color:#b45309">
                      The course will no longer appear in active course dropdowns.
                      Existing blocks and student records will remain.
                    </p>
                  `
                  : ""
              }
            </div>
          `,

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
        await setCourseStatus(
          course.id,
          newStatus
        );

        await Swal.fire({
          icon: "success",

          title: newStatus
            ? "Course Activated"
            : "Course Deactivated",

          timer: 1200,
          showConfirmButton: false,
        });

        await loadCourses();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title:
            "Unable to Change Course Status",
          text:
            error?.message ||
            "The course status could not be changed.",
        });
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete course
  |--------------------------------------------------------------------------
  */

  const handleDeleteCourse = async (
    course
  ) => {
    const confirmation =
      await Swal.fire({
        icon: "warning",
        title: "Delete Course?",

        html: `
          <div style="text-align:left">
            <p>
              <strong>
                ${course.course_code}
              </strong>
              — ${course.course_name}
            </p>

            <p style="margin-top:10px;color:#dc2626">
              The course can only be deleted when it has no existing blocks.
            </p>
          </div>
        `,

        showCancelButton: true,
        confirmButtonText: "Delete Course",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await deleteCourse(course.id);

      await Swal.fire({
        icon: "success",
        title: "Course Deleted",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadCourses();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "Unable to delete the course.",
      });
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Block modal
  |--------------------------------------------------------------------------
  */

  const openAddBlockModal = (
    course,
    yearLevel
  ) => {
    const yearSections =
      getYearSections(
        course,
        yearLevel
      );

    const latestSection =
      yearSections[0] ||
      course.sections?.[0];

    setEditingBlock(null);

    setBlockForm({
      course_id: course.id,

      course: course.course_code,

      year_level: yearLevel,

      block_code: "",

      school_year:
        latestSection?.school_year || "",

      semester:
        latestSection?.semester ||
        "1st Semester",

      is_active: true,
    });

    setShowBlockModal(true);
  };

  const openEditBlockModal = (
    course,
    section
  ) => {
    setEditingBlock(section);

    setBlockForm({
      course_id: course.id,

      course: course.course_code,

      year_level:
        section.year_level,

      block_code:
        section.block_code || "",

      school_year:
        section.school_year || "",

      semester:
        section.semester ||
        "1st Semester",

      is_active:
        section.is_active ?? true,
    });

    setShowBlockModal(true);
  };

  const closeBlockModal = () => {
    if (saving) {
      return;
    }

    setShowBlockModal(false);
    setEditingBlock(null);

    setBlockForm(
      createDefaultBlockForm()
    );
  };

  const handleBlockFormChange = (
    event
  ) => {
    const { name, value, type, checked } =
      event.target;

    setBlockForm((previousData) => ({
      ...previousData,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleBlockSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !blockForm.block_code.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Block Code Required",
        text:
          "Please enter the block code.",
      });

      return;
    }

    if (
      !blockForm.school_year.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "School Year Required",
        text:
          "Please enter the school year.",
      });

      return;
    }

    const payload = {
      course_id:
        blockForm.course_id,

      course:
        blockForm.course
          .trim()
          .toUpperCase(),

      year_level:
        blockForm.year_level,

      block_code:
        blockForm.block_code
          .trim()
          .toUpperCase(),

      school_year:
        blockForm.school_year.trim(),

      semester:
        blockForm.semester,

      is_active:
        blockForm.is_active,
    };

    try {
      setSaving(true);

      if (editingBlock) {
        await updateSection(
          editingBlock.id,
          payload
        );

        await Swal.fire({
          icon: "success",
          title: "Block Updated",
          text:
            "The block information was updated successfully.",
        });
      } else {
        await createSection(payload);

        await Swal.fire({
          icon: "success",
          title: "Block Added",
          text:
            "The new block was added successfully.",
        });
      }

      closeBlockModal();
      await loadCourses();
    } catch (error) {
      console.error(
        "Save block error:",
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

  /*
  |--------------------------------------------------------------------------
  | Block status
  |--------------------------------------------------------------------------
  */

  const handleBlockStatusChange =
    async (section) => {
      const newStatus =
        !section.is_active;

      const confirmation =
        await Swal.fire({
          icon: "question",

          title: newStatus
            ? "Activate Block?"
            : "Deactivate Block?",

          text: newStatus
            ? `Block ${section.block_code} will become active again.`
            : `Block ${section.block_code} will no longer appear in active block selections.`,

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

        await loadCourses();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title:
            "Unable to Change Block Status",
          text:
            error?.message ||
            "The block status could not be changed.",
        });
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete block
  |--------------------------------------------------------------------------
  */

  const handleDeleteBlock = async (
    section
  ) => {
    try {
      const studentCount =
        await getSectionStudentCount(
          section.id
        );

      if (studentCount > 0) {
        Swal.fire({
          icon: "warning",
          title:
            "Block Cannot Be Deleted",
          text: `Block ${section.block_code} has ${studentCount} assigned student${
            studentCount === 1 ? "" : "s"
          }. Deactivate the block instead.`,
        });

        return;
      }

      const confirmation =
        await Swal.fire({
          icon: "warning",
          title: "Delete Block?",

          html: `
            <div style="text-align:left">
              <p>
                <strong>
                  ${section.year_level}
                  — Block
                  ${section.block_code}
                </strong>
              </p>

              <p style="margin-top:8px">
                ${section.semester},
                ${section.school_year}
              </p>

              <p style="margin-top:10px;color:#dc2626">
                This action cannot be undone.
              </p>
            </div>
          `,

          showCancelButton: true,
          confirmButtonText: "Delete Block",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#dc2626",
        });

      if (!confirmation.isConfirmed) {
        return;
      }

      await deleteSection(section.id);

      await Swal.fire({
        icon: "success",
        title: "Block Deleted",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadCourses();
    } catch (error) {
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
                <FaGraduationCap />
                Academic Setup
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Course Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Organize courses, year levels, official blocks, semesters, and school years from one academic setup page.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={openAddCourseModal}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
          >
            <FaPlus />
            Add Course
          </motion.button>
        </div>
      </motion.section>


      {/* Statistics */}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Total Courses
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {statistics.totalCourses}
            </h2>

            <FaGraduationCap className="text-xl text-blue-700" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Active Courses
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-green-700">
              {
                statistics.activeCourses
              }
            </h2>

            <FaCheckCircle className="text-xl text-green-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Total Blocks
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-purple-700">
              {statistics.totalBlocks}
            </h2>

            <FaLayerGroup className="text-xl text-purple-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          <p className="text-sm text-slate-500">
            Active Blocks
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-indigo-700">
              {statistics.activeBlocks}
            </h2>

            <FaBookOpen className="text-xl text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Search */}

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] md:grid-cols-[1fr_220px]">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search course, year level, block, or school year..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-700"
          />
        </div>

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
            All Course Statuses
          </option>

          <option value="Active">
            Active Courses
          </option>

          <option value="Inactive">
            Inactive Courses
          </option>
        </select>
      </div>

      {/* Course list */}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            Loading courses...
          </div>
        ) : filteredCourses.length ===
          0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
            <FaGraduationCap className="mx-auto text-5xl text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-700">
              No Courses Found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a course to begin
              organizing year levels and
              blocks.
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const expanded =
              isCourseExpanded(
                course.id
              );

            const selectedYear =
              getSelectedYear(course.id);

            const selectedYearSections =
              getYearSections(
                course,
                selectedYear
              );

            const termGroups =
              groupSectionsByTerm(
                selectedYearSections
              );

            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]"
              >
                {/* Course header */}

                <div
                  className={`border-b p-4 ${
                    course.is_active
                      ? "bg-slate-50"
                      : "bg-red-50"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCourseExpansion(
                          course.id
                        )
                      }
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div
                        className={`rounded-xl p-3 ${
                          course.is_active
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <FaGraduationCap />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800">
                            {
                              course.course_code
                            }
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              course.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {course.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            course.course_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            course.sections
                              ?.length
                          }{" "}
                          block
                          {course.sections
                            ?.length !== 1
                            ? "s"
                            : ""}
                        </p>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditCourseModal(
                            course
                          )
                        }
                        title="Edit course"
                        className="rounded-lg bg-blue-600 p-2.5 text-white transition hover:bg-blue-700"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCourseStatusChange(
                            course
                          )
                        }
                        title={
                          course.is_active
                            ? "Deactivate course"
                            : "Activate course"
                        }
                        className={`rounded-lg p-2.5 text-white transition ${
                          course.is_active
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {course.is_active ? (
                          <FaToggleOff />
                        ) : (
                          <FaToggleOn />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCourse(
                            course
                          )
                        }
                        title="Delete course"
                        className="rounded-lg bg-red-600 p-2.5 text-white transition hover:bg-red-700"
                      >
                        <FaTrash />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleCourseExpansion(
                            course.id
                          )
                        }
                        title={
                          expanded
                            ? "Collapse"
                            : "Expand"
                        }
                        className="rounded-lg bg-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-300"
                      >
                        {expanded ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="p-4">
                    {/* Year level tabs */}

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {YEAR_LEVELS.map(
                        (yearLevel) => {
                          const blockCount =
                            getYearBlockCount(
                              course,
                              yearLevel
                            );

                          const selected =
                            selectedYear ===
                            yearLevel;

                          return (
                            <motion.button
                              key={yearLevel}
                              type="button"
                              onClick={() =>
                                handleYearSelection(
                                  course.id,
                                  yearLevel
                                )
                              }
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-blue-700 bg-gradient-to-br from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-900/15"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black">
                                    {yearLevel}
                                  </p>

                                  <p
                                    className={`mt-1 text-sm ${
                                      selected
                                        ? "text-blue-100"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    Official year level
                                  </p>
                                </div>

                                <span
                                  className={`inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-xs font-black ${
                                    selected
                                      ? "bg-white/15 text-white"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {blockCount}
                                </span>
                              </div>

                              <div
                                className={`mt-4 h-1.5 overflow-hidden rounded-full ${
                                  selected
                                    ? "bg-white/15"
                                    : "bg-slate-100"
                                }`}
                              >
                                <motion.div
                                  initial={false}
                                  animate={{
                                    width:
                                      blockCount > 0
                                        ? `${Math.min(
                                            100,
                                            28 + blockCount * 18
                                          )}%`
                                        : "8%",
                                  }}
                                  className={`h-full rounded-full ${
                                    selected
                                      ? "bg-cyan-300"
                                      : "bg-blue-600"
                                  }`}
                                />
                              </div>
                            </motion.button>
                          );
                        }
                      )}
                    </div>

                    {/* Selected year heading */}

                    <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {selectedYear}{" "}
                          Blocks
                        </h3>

                        <p className="text-sm text-slate-500">
                          Select a year
                          level above to
                          view its blocks.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openAddBlockModal(
                            course,
                            selectedYear
                          )
                        }
                        disabled={
                          !course.is_active
                        }
                        className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaPlus />
                        Add Block to{" "}
                        {selectedYear}
                      </button>
                    </div>

                    {/* Blocks */}

                    {termGroups.length ===
                    0 ? (
                      <div className="mt-4 rounded-xl border-2 border-dashed p-10 text-center">
                        <FaLayerGroup className="mx-auto text-4xl text-slate-300" />

                        <h4 className="mt-3 font-bold text-slate-700">
                          No Blocks for{" "}
                          {selectedYear}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          Add the first
                          block for this
                          course and year
                          level.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {termGroups.map(
                          (termGroup) => (
                            <div
                              key={
                                termGroup.key
                              }
                              className="rounded-xl border"
                            >
                              <div className="flex flex-col justify-between gap-2 border-b bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {
                                      termGroup.semester
                                    }
                                  </p>

                                  <p className="text-sm text-slate-500">
                                    School Year{" "}
                                    {
                                      termGroup.school_year
                                    }
                                  </p>
                                </div>

                                <span className="w-fit rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                  {
                                    termGroup
                                      .sections
                                      .length
                                  }{" "}
                                  block
                                  {termGroup
                                    .sections
                                    .length !==
                                  1
                                    ? "s"
                                    : ""}
                                </span>
                              </div>

                              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                                {termGroup.sections.map(
                                  (section, sectionIndex) => {
                                    const insight =
                                      sectionInsights[
                                        section.id
                                      ] || {
                                        students: 0,
                                        subjects: 0,
                                        teachers: 0,
                                      };

                                    return (
                                      <motion.article
                                        key={section.id}
                                        initial={{
                                          opacity: 0,
                                          y: 14,
                                        }}
                                        animate={{
                                          opacity: 1,
                                          y: 0,
                                        }}
                                        transition={{
                                          delay:
                                            sectionIndex *
                                            0.05,
                                          duration: 0.35,
                                        }}
                                        whileHover={{
                                          y: -4,
                                        }}
                                        className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition ${
                                          section.is_active
                                            ? "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10"
                                            : "border-red-200 bg-red-50"
                                        }`}
                                      >
                                        <div
                                          className={`absolute inset-x-0 top-0 h-1 ${
                                            section.is_active
                                              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"
                                              : "bg-red-500"
                                          }`}
                                        />

                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex min-w-0 items-center gap-3">
                                            <div
                                              className={`rounded-2xl p-3.5 ${
                                                section.is_active
                                                  ? "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
                                                  : "bg-red-100 text-red-700"
                                              }`}
                                            >
                                              <FaLayerGroup />
                                            </div>

                                            <div className="min-w-0">
                                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                Official Block
                                              </p>

                                              <h4 className="truncate text-lg font-black text-slate-900">
                                                {
                                                  course.course_code
                                                }{" "}
                                                ·{" "}
                                                {
                                                  section.year_level
                                                }{" "}
                                                · Block{" "}
                                                {
                                                  section.block_code
                                                }
                                              </h4>

                                              <span
                                                className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                  section.is_active
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                              >
                                                <span
                                                  className={`h-1.5 w-1.5 rounded-full ${
                                                    section.is_active
                                                      ? "bg-emerald-500"
                                                      : "bg-red-500"
                                                  }`}
                                                />
                                                {section.is_active
                                                  ? "Active"
                                                  : "Inactive"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-3 gap-2">
                                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <FaUsers className="text-blue-600" />
                                            <p className="mt-2 text-xl font-black text-slate-900">
                                              {
                                                insight.students
                                              }
                                            </p>
                                            <p className="text-[11px] font-semibold text-slate-500">
                                              Students
                                            </p>
                                          </div>

                                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <FaBook className="text-violet-600" />
                                            <p className="mt-2 text-xl font-black text-slate-900">
                                              {
                                                insight.subjects
                                              }
                                            </p>
                                            <p className="text-[11px] font-semibold text-slate-500">
                                              Subjects
                                            </p>
                                          </div>

                                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <FaChalkboardTeacher className="text-amber-600" />
                                            <p className="mt-2 text-xl font-black text-slate-900">
                                              {
                                                insight.teachers
                                              }
                                            </p>
                                            <p className="text-[11px] font-semibold text-slate-500">
                                              Teachers
                                            </p>
                                          </div>
                                        </div>

                                        <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-white p-3 text-xs">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                                              <FaCalendarAlt className="text-blue-600" />
                                              Semester
                                            </span>
                                            <span className="font-black text-slate-800">
                                              {
                                                section.semester
                                              }
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between gap-3">
                                            <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                                              <FaGraduationCap className="text-indigo-600" />
                                              School Year
                                            </span>
                                            <span className="font-black text-slate-800">
                                              {
                                                section.school_year
                                              }
                                            </span>
                                          </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                          <p className="text-[11px] font-semibold text-slate-400">
                                            Manage block settings
                                          </p>

                                          <div className="flex gap-2">
                                            <motion.button
                                              type="button"
                                              onClick={() =>
                                                openEditBlockModal(
                                                  course,
                                                  section
                                                )
                                              }
                                              whileHover={{
                                                y: -2,
                                              }}
                                              whileTap={{
                                                scale: 0.94,
                                              }}
                                              title="Edit block"
                                              className="rounded-lg bg-blue-600 p-2.5 text-white shadow-sm transition hover:bg-blue-700"
                                            >
                                              <FaEdit />
                                            </motion.button>

                                            <motion.button
                                              type="button"
                                              onClick={() =>
                                                handleBlockStatusChange(
                                                  section
                                                )
                                              }
                                              whileHover={{
                                                y: -2,
                                              }}
                                              whileTap={{
                                                scale: 0.94,
                                              }}
                                              title={
                                                section.is_active
                                                  ? "Deactivate block"
                                                  : "Activate block"
                                              }
                                              className={`rounded-lg p-2.5 text-white shadow-sm transition ${
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
                                            </motion.button>

                                            <motion.button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteBlock(
                                                  section
                                                )
                                              }
                                              whileHover={{
                                                y: -2,
                                              }}
                                              whileTap={{
                                                scale: 0.94,
                                              }}
                                              title="Delete block"
                                              className="rounded-lg bg-red-600 p-2.5 text-white shadow-sm transition hover:bg-red-700"
                                            >
                                              <FaTrash />
                                            </motion.button>
                                          </div>
                                        </div>
                                      </motion.article>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Course modal */}

      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingCourse
                    ? "Edit Course"
                    : "Add Course"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the course code
                  and complete course
                  name.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCourseModal}
                className="rounded-full bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleCourseSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Course Code
                </label>

                <input
                  type="text"
                  name="course_code"
                  value={
                    courseForm.course_code
                  }
                  onChange={
                    handleCourseFormChange
                  }
                  placeholder="Example: BSIT"
                  required
                  className="w-full rounded-lg border px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Complete Course Name
                </label>

                <input
                  type="text"
                  name="course_name"
                  value={
                    courseForm.course_name
                  }
                  onChange={
                    handleCourseFormChange
                  }
                  placeholder="Bachelor of Science in Information Technology"
                  required
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={
                    courseForm.is_active
                  }
                  onChange={
                    handleCourseFormChange
                  }
                  className="h-5 w-5 accent-blue-700"
                />

                <div>
                  <p className="font-semibold text-slate-700">
                    Active Course
                  </p>

                  <p className="text-xs text-slate-500">
                    Active courses appear
                    in course dropdowns.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeCourseModal}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingCourse
                    ? "Update Course"
                    : "Add Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block modal */}

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingBlock
                    ? "Edit Block"
                    : "Add Block"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {blockForm.course} —{" "}
                  {blockForm.year_level}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBlockModal}
                className="rounded-full bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleBlockSubmit}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Year Level
                  </label>

                  <select
                    name="year_level"
                    value={
                      blockForm.year_level
                    }
                    onChange={
                      handleBlockFormChange
                    }
                    required
                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  >
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
                    Block Code
                  </label>

                  <input
                    type="text"
                    name="block_code"
                    value={
                      blockForm.block_code
                    }
                    onChange={
                      handleBlockFormChange
                    }
                    placeholder="Example: A"
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
                      blockForm.school_year
                    }
                    onChange={
                      handleBlockFormChange
                    }
                    placeholder="Example: 2026-2027"
                    required
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Semester
                  </label>

                  <select
                    name="semester"
                    value={
                      blockForm.semester
                    }
                    onChange={
                      handleBlockFormChange
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
                    blockForm.is_active
                  }
                  onChange={
                    handleBlockFormChange
                  }
                  className="h-5 w-5 accent-blue-700"
                />

                <div>
                  <p className="font-semibold text-slate-700">
                    Active Block
                  </p>

                  <p className="text-xs text-slate-500">
                    Active blocks appear
                    in student and class
                    assignment dropdowns.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeBlockModal}
                  disabled={saving}
                  className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingBlock
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

export default CourseManagement;