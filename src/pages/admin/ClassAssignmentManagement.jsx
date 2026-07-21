import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";
import { supabase } from "../../services/supabase";

import {
  FaBookOpen,
  FaChalkboardTeacher,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaCheckCircle,
  FaFilter,
  FaGraduationCap,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";

const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

const SEMESTER_ORDER = {
  "1st Semester": 1,
  "2nd Semester": 2,
  Summer: 3,
};

const createDefaultFormData = () => ({
  course_id: "",
  course: "",
  year_level: "",
  school_year: "",
  semester: "",
  section_id: "",
  teacher_id: "",
  selected_subject_ids: [],
});

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const sectionMatchesCourse = (
  section,
  selectedCourse
) => {
  if (!section || !selectedCourse) {
    return false;
  }

  const sectionCourseId = String(
    section.course_id || ""
  ).trim();

  const selectedCourseId = String(
    selectedCourse.id || ""
  ).trim();

  if (
    sectionCourseId &&
    selectedCourseId &&
    sectionCourseId === selectedCourseId
  ) {
    return true;
  }

  const sectionCourseValues = [
    section.course,
    section.course_name,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const selectedCourseValues = [
    selectedCourse.course_code,
    selectedCourse.course_name,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return sectionCourseValues.some(
    (sectionValue) =>
      selectedCourseValues.includes(
        sectionValue
      )
  );
};

const getYearLevelOrder = (value) => {
  const match = String(value || "").match(/\d+/);

  return match ? Number(match[0]) : 99;
};

const compareNaturalText = (first, second) =>
  String(first || "").localeCompare(
    String(second || ""),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );

const cardMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24 },
  },
};

function ClassAssignmentManagement() {
  const [offerings, setOfferings] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [formData, setFormData] = useState(
    createDefaultFormData
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authUser) {
        throw new Error(
          "Please log in before managing class assignments."
        );
      }

      const {
        data: adminProfile,
        error: profileError,
      } = await supabase
        .from("users")
        .select("id, auth_id, role, status")
        .eq("auth_id", authUser.id)
        .single();

      if (profileError) throw profileError;

      if (
        adminProfile?.role?.trim() !==
        "Administrator"
      ) {
        throw new Error(
          "Only Administrator accounts can manage class assignments."
        );
      }

      if (
        adminProfile?.status?.trim() !== "Active"
      ) {
        throw new Error(
          "Your Administrator account is not active."
        );
      }

      const [
        offeringResponse,
        sectionResponse,
        courseResponse,
        subjectResponse,
        teacherResponse,
      ] = await Promise.all([
        supabase
          .from("class_offerings")
          .select(
            "id, section_id, subject_id, teacher_id, school_year, semester, is_active"
          )
          .order("school_year", { ascending: false }),

        supabase
          .from("sections")
          .select(
            "id, course_id, course, year_level, block_code, school_year, semester, is_active"
          )
          .order("school_year", { ascending: false }),

        supabase
          .from("courses")
          .select("id, course_code, course_name")
          .order("course_code", { ascending: true }),

        supabase
  .from("subjects")
  .select(
    "id, subject_code, subject_name, program, year_level, semester, units, is_active"
  )
  .eq("is_active", true)
  .order("subject_code", { ascending: true }),

        supabase
          .from("users")
          .select(
            "id, employee_id, full_name, email, role, status"
          )
          .eq("role", "Approver")
          .eq("status", "Active")
          .order("full_name", { ascending: true }),
      ]);

      if (offeringResponse.error) {
        throw offeringResponse.error;
      }
      if (sectionResponse.error) {
        throw sectionResponse.error;
      }
      if (courseResponse.error) {
        throw courseResponse.error;
      }
      if (subjectResponse.error) {
        throw subjectResponse.error;
      }
      if (teacherResponse.error) {
        throw teacherResponse.error;
      }

      const rawOfferings = offeringResponse.data || [];
      const rawSections = sectionResponse.data || [];
      const courseData = courseResponse.data || [];
      const subjectData = subjectResponse.data || [];
      const teacherData = teacherResponse.data || [];

      const courseMap = new Map(
        courseData.map((course) => [course.id, course])
      );
      const subjectMap = new Map(
        subjectData.map((subject) => [
          subject.id,
          subject,
        ])
      );
      const teacherMap = new Map(
        teacherData.map((teacher) => [
          teacher.id,
          teacher,
        ])
      );

      const normalizedSections = rawSections.map(
        (section) => {
          const relatedCourse = section.course_id
            ? courseMap.get(section.course_id)
            : null;

          return {
            ...section,
            course:
              relatedCourse?.course_code ||
              section.course ||
              "Unassigned Course",
            course_name:
              relatedCourse?.course_name || "",
          };
        }
      );

      const sectionMap = new Map(
        normalizedSections.map((section) => [
          section.id,
          section,
        ])
      );

      const enrichedOfferings = rawOfferings.map(
        (offering) => ({
          ...offering,
          section:
            sectionMap.get(offering.section_id) || null,
          subject:
            subjectMap.get(offering.subject_id) || null,
          teacher:
            teacherMap.get(offering.teacher_id) || null,
        })
      );

      setOfferings(enrichedOfferings);
      setSections(normalizedSections);
      setCourses(courseData);
      setSubjects(subjectData);
      setTeachers(teacherData);
    } catch (error) {
      console.error("Load class assignment error:", error);

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Class Assignments",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableCourses = useMemo(() => {
    return [
      ...new Set([
        ...courses
          .map((course) => course.course_code)
          .filter(Boolean),
        ...sections
          .map((section) => section.course)
          .filter(Boolean),
      ]),
    ].sort();
  }, [courses, sections]);

  const selectedCourseRecord = useMemo(() => {
    return (
      courses.find(
        (course) =>
          course.id === formData.course_id
      ) ||
      courses.find(
        (course) =>
          normalizeText(
            course.course_code
          ) ===
          normalizeText(formData.course)
      ) ||
      null
    );
  }, [
    courses,
    formData.course_id,
    formData.course,
  ]);

  const availableYearLevels = useMemo(() => {
    if (!selectedCourseRecord) {
      return [];
    }

    const foundYears = sections
      .filter((section) =>
        sectionMatchesCourse(
          section,
          selectedCourseRecord
        )
      )
      .map((section) => section.year_level)
      .filter(Boolean);

    return [...new Set(foundYears)].sort(
      (first, second) =>
        getYearLevelOrder(first) -
        getYearLevelOrder(second)
    );
  }, [
    sections,
    selectedCourseRecord,
  ]);


  /*
  |--------------------------------------------------------------------------
  | SEARCHABLE OFFICIAL CLASS LIST
  |--------------------------------------------------------------------------
  |
  | The admin no longer needs to choose Course → Year → School Year →
  | Semester → Block through five dependent dropdowns.
  |
  | Every official section is shown in one searchable list. Selecting one
  | section automatically fills the exact academic routing fields.
  |--------------------------------------------------------------------------
  */

  const officialClassOptions = useMemo(() => {
    const keyword =
      normalizeText(classSearch);

    if (
      !selectedCourseRecord ||
      !formData.year_level
    ) {
      return [];
    }

    return [...sections]
      .filter((section) => {
        const matchesCourse =
          sectionMatchesCourse(
            section,
            selectedCourseRecord
          );

        const matchesYearLevel =
          normalizeText(
            section.year_level
          ) ===
          normalizeText(
            formData.year_level
          );

        if (
          !matchesCourse ||
          !matchesYearLevel
        ) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return normalizeText(
          [
            section.course,
            section.course_name,
            section.year_level,
            section.block_code,
            section.school_year,
            section.semester,
            section.is_active
              ? "active"
              : "inactive",
          ]
            .filter(Boolean)
            .join(" ")
        ).includes(keyword);
      })
      .sort((first, second) => {
        if (
          first.is_active !==
          second.is_active
        ) {
          return first.is_active
            ? -1
            : 1;
        }

        const blockCompare =
          compareNaturalText(
            first.block_code,
            second.block_code
          );

        if (blockCompare !== 0) {
          return blockCompare;
        }

        const schoolYearCompare =
          compareNaturalText(
            second.school_year,
            first.school_year
          );

        if (
          schoolYearCompare !== 0
        ) {
          return schoolYearCompare;
        }

        return (
          (SEMESTER_ORDER[
            first.semester
          ] || 99) -
          (SEMESTER_ORDER[
            second.semester
          ] || 99)
        );
      });
  }, [
    sections,
    classSearch,
    selectedCourseRecord,
    formData.year_level,
  ]);

  const availableSchoolYears = useMemo(() => {
    if (!formData.course || !formData.year_level) {
      return [];
    }

    return [
      ...new Set(
        sections
          .filter(
            (section) =>
              section.course === formData.course &&
              section.year_level === formData.year_level
          )
          .map((section) => section.school_year)
          .filter(Boolean)
      ),
    ]
      .sort()
      .reverse();
  }, [
    sections,
    formData.course,
    formData.year_level,
  ]);

  const availableSemesters = useMemo(() => {
    if (
      !formData.course ||
      !formData.year_level ||
      !formData.school_year
    ) {
      return [];
    }

    return [
      ...new Set(
        sections
          .filter(
            (section) =>
              section.course === formData.course &&
              section.year_level === formData.year_level &&
              section.school_year ===
                formData.school_year
          )
          .map((section) => section.semester)
          .filter(Boolean)
      ),
    ].sort(
      (first, second) =>
        (SEMESTER_ORDER[first] || 99) -
        (SEMESTER_ORDER[second] || 99)
    );
  }, [
    sections,
    formData.course,
    formData.year_level,
    formData.school_year,
  ]);

  const availableBlocks = useMemo(() => {
    if (
      !formData.course ||
      !formData.year_level ||
      !formData.school_year ||
      !formData.semester
    ) {
      return [];
    }

    return sections
      .filter(
        (section) =>
          section.course === formData.course &&
          section.year_level === formData.year_level &&
          section.school_year ===
            formData.school_year &&
          section.semester === formData.semester
      )
      .sort((first, second) =>
        String(first.block_code || "").localeCompare(
          String(second.block_code || "")
        )
      );
  }, [
    sections,
    formData.course,
    formData.year_level,
    formData.school_year,
    formData.semester,
  ]);

  const existingSubjectIds = useMemo(() => {
    if (
      !formData.section_id ||
      !formData.school_year ||
      !formData.semester
    ) {
      return [];
    }

    return offerings
      .filter(
        (offering) =>
          offering.section_id === formData.section_id &&
          offering.school_year ===
            formData.school_year &&
          offering.semester === formData.semester
      )
      .map((offering) => offering.subject_id);
  }, [
    offerings,
    formData.section_id,
    formData.school_year,
    formData.semester,
  ]);

  const filteredSubjects = useMemo(() => {
  const keyword = normalizeText(subjectSearch);

  const selectedYearLevel = Number(
    String(formData.year_level || "").match(/\d+/)?.[0]
  );

  const selectedSemester =
    formData.semester === "1st Semester"
      ? 1
      : formData.semester === "2nd Semester"
      ? 2
      : formData.semester === "Summer"
      ? 3
      : null;

  if (
    !formData.course ||
    !selectedYearLevel ||
    !selectedSemester
  ) {
    return [];
  }

  return subjects.filter((subject) => {
    const matchesProgram =
      normalizeText(subject.program) ===
      normalizeText(formData.course);

    const matchesYearLevel =
      Number(subject.year_level) === selectedYearLevel;

    const matchesSemester =
      Number(subject.semester) === selectedSemester;

    const matchesKeyword =
      !keyword ||
      normalizeText(
        `${subject.subject_code} ${subject.subject_name}`
      ).includes(keyword);

    return (
      matchesProgram &&
      matchesYearLevel &&
      matchesSemester &&
      matchesKeyword
    );
  });
}, [
  subjects,
  subjectSearch,
  formData.course,
  formData.year_level,
  formData.semester,
]);

  const selectableSubjectIds = useMemo(() => {
  return filteredSubjects
    .filter(
      (subject) =>
        !existingSubjectIds.includes(subject.id)
    )
    .map((subject) => subject.id);
}, [filteredSubjects, existingSubjectIds]);

  const statistics = useMemo(() => {
    const active = offerings.filter(
      (offering) => offering.is_active
    ).length;

    const assignedBlocks = new Set(
      offerings.map(
        (offering) =>
          `${offering.section_id}-${offering.school_year}-${offering.semester}`
      )
    ).size;

    const assignedTeachers = new Set(
      offerings
        .map((offering) => offering.teacher_id)
        .filter(Boolean)
    ).size;

    return {
      total: offerings.length,
      active,
      assignedBlocks,
      assignedTeachers,
    };
  }, [offerings]);

  const filteredOfferings = useMemo(() => {
    const keyword = normalizeText(search);

    return offerings.filter((offering) => {
      const searchContent = normalizeText(
        [
          offering.section?.course,
          offering.section?.course_name,
          offering.section?.year_level,
          offering.section?.block_code,
          offering.subject?.subject_code,
          offering.subject?.subject_name,
          offering.teacher?.full_name,
          offering.teacher?.employee_id,
          offering.teacher?.email,
          offering.school_year,
          offering.semester,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const matchesSearch =
        !keyword || searchContent.includes(keyword);
      const matchesCourse =
        courseFilter === "All" ||
        offering.section?.course === courseFilter;
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" &&
          offering.is_active) ||
        (statusFilter === "Inactive" &&
          !offering.is_active);

      return (
        matchesSearch &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [
    offerings,
    search,
    courseFilter,
    statusFilter,
  ]);

  const groupedOfferings = useMemo(() => {
    const teacherGroups = new Map();

    filteredOfferings.forEach((offering) => {
      const teacherKey =
        offering.teacher_id ||
        `unassigned-${offering.id}`;

      if (!teacherGroups.has(teacherKey)) {
        teacherGroups.set(teacherKey, {
          key: `teacher-${teacherKey}`,
          teacher: offering.teacher,
          offerings: [],
          classGroupsMap: new Map(),
        });
      }

      const teacherGroup =
        teacherGroups.get(teacherKey);

      teacherGroup.offerings.push(offering);

      const classKey = [
        offering.section_id,
        offering.school_year,
        offering.semester,
      ].join("|");

      if (
        !teacherGroup.classGroupsMap.has(
          classKey
        )
      ) {
        teacherGroup.classGroupsMap.set(
          classKey,
          {
            key: classKey,
            section: offering.section,
            school_year:
              offering.school_year,
            semester:
              offering.semester,
            offerings: [],
          }
        );
      }

      teacherGroup.classGroupsMap
        .get(classKey)
        .offerings.push(offering);
    });

    return [...teacherGroups.values()]
      .map((teacherGroup) => {
        const classGroups = [
          ...teacherGroup.classGroupsMap.values(),
        ]
          .map((classGroup) => ({
            ...classGroup,
            offerings: [
              ...classGroup.offerings,
            ].sort((first, second) =>
              compareNaturalText(
                first.subject
                  ?.subject_code ||
                  first.subject
                    ?.subject_name,
                second.subject
                  ?.subject_code ||
                  second.subject
                    ?.subject_name
              )
            ),
          }))
          .sort((first, second) => {
            const courseCompare =
              compareNaturalText(
                first.section?.course,
                second.section?.course
              );

            if (courseCompare !== 0) {
              return courseCompare;
            }

            const yearCompare =
              getYearLevelOrder(
                first.section?.year_level
              ) -
              getYearLevelOrder(
                second.section?.year_level
              );

            if (yearCompare !== 0) {
              return yearCompare;
            }

            const blockCompare =
              compareNaturalText(
                first.section?.block_code,
                second.section?.block_code
              );

            if (blockCompare !== 0) {
              return blockCompare;
            }

            const semesterCompare =
              (SEMESTER_ORDER[
                first.semester
              ] || 99) -
              (SEMESTER_ORDER[
                second.semester
              ] || 99);

            if (semesterCompare !== 0) {
              return semesterCompare;
            }

            return compareNaturalText(
              second.school_year,
              first.school_year
            );
          });

        return {
          key: teacherGroup.key,
          teacher:
            teacherGroup.teacher,
          offerings: [
            ...teacherGroup.offerings,
          ],
          classGroups,
        };
      })
      .sort((first, second) =>
        compareNaturalText(
          first.teacher?.full_name ||
            first.teacher?.email ||
            "Unknown Teacher",
          second.teacher?.full_name ||
            second.teacher?.email ||
            "Unknown Teacher"
        )
      );
  }, [filteredOfferings]);

  const toggleGroup = (groupKey) => {
    setExpandedGroups((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey]
    );
  };

  const resetForm = () => {
    setFormData(createDefaultFormData());
    setClassSearch("");
    setSubjectSearch("");
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    resetForm();
  };

  const handleOfficialClassSelect = (section) => {
    if (!section?.id || !section.is_active) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      course_id:
        section.course_id ||
        selectedCourseRecord?.id ||
        "",
      course:
        selectedCourseRecord?.course_code ||
        section.course ||
        "",
      year_level:
        section.year_level || "",
      school_year: section.school_year || "",
      semester: section.semester || "",
      section_id: section.id,
      selected_subject_ids: [],
    }));

    setSubjectSearch("");
  };

  const handleCourseChange = (event) => {
    const nextCourseId =
      event.target.value;

    const nextCourse =
      courses.find(
        (course) =>
          course.id === nextCourseId
      ) || null;

    setFormData((previous) => ({
      ...createDefaultFormData(),
      teacher_id:
        previous.teacher_id,
      course_id:
        nextCourse?.id || "",
      course:
        nextCourse?.course_code || "",
    }));

    setClassSearch("");
    setSubjectSearch("");
  };

  const handleYearLevelChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      year_level:
        event.target.value,
      school_year: "",
      semester: "",
      section_id: "",
      selected_subject_ids: [],
    }));

    setClassSearch("");
    setSubjectSearch("");
  };

  const handleSchoolYearChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      school_year: event.target.value,
      semester: "",
      section_id: "",
      selected_subject_ids: [],
    }));
  };

  const handleSemesterChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      semester: event.target.value,
      section_id: "",
      selected_subject_ids: [],
    }));
  };

  const handleBlockChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      section_id: event.target.value,
      selected_subject_ids: [],
    }));
  };

  const handleTeacherChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      teacher_id: event.target.value,
    }));
  };

  const toggleSubject = (subjectId) => {
    if (existingSubjectIds.includes(subjectId)) return;

    setFormData((previous) => {
      const selected =
        previous.selected_subject_ids.includes(subjectId);

      return {
        ...previous,
        selected_subject_ids: selected
          ? previous.selected_subject_ids.filter(
              (id) => id !== subjectId
            )
          : [
              ...previous.selected_subject_ids,
              subjectId,
            ],
      };
    });
  };

  const handleSelectAllSubjects = () => {
    setFormData((previous) => {
      const allSelected =
        selectableSubjectIds.length > 0 &&
        selectableSubjectIds.every((subjectId) =>
          previous.selected_subject_ids.includes(subjectId)
        );

      return {
        ...previous,
        selected_subject_ids: allSelected
          ? []
          : selectableSubjectIds,
      };
    });
  };

  const validateForm = () => {
    if (
      !formData.course_id ||
      !formData.course
    ) {
      return "Please select an official course.";
    }
    if (!formData.year_level) {
      return "Please select a year level.";
    }
    if (!formData.school_year) {
      return "Please select a school year.";
    }
    if (!formData.semester) {
      return "Please select a semester.";
    }
    if (!formData.section_id) {
      return "Please select a block.";
    }
    if (!formData.teacher_id) {
      return "Please select a teacher.";
    }
    if (formData.selected_subject_ids.length === 0) {
      return "Please select at least one subject.";
    }
    if (
      formData.selected_subject_ids.some((id) =>
        existingSubjectIds.includes(id)
      )
    ) {
      return "One or more selected subjects are already assigned to this block.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete Assignment",
        text: validationError,
      });
      return;
    }

    const selectedSection = sections.find(
      (section) => section.id === formData.section_id
    );
    const selectedTeacher = teachers.find(
      (teacher) => teacher.id === formData.teacher_id
    );
    const selectedSubjects = subjects.filter((subject) =>
      formData.selected_subject_ids.includes(subject.id)
    );

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Save Class Assignments?",
      html: `
        <div style="text-align:left;line-height:1.6">
          <p><strong>Class:</strong> ${formData.course} ${formData.year_level} — Block ${selectedSection?.block_code || ""}</p>
          <p><strong>Teacher:</strong> ${selectedTeacher?.full_name || selectedTeacher?.email || "Unknown Teacher"}</p>
          <p><strong>Term:</strong> ${formData.semester}, ${formData.school_year}</p>
          <p><strong>Subjects:</strong> ${selectedSubjects
            .map(
              (subject) =>
                subject.subject_code || subject.subject_name
            )
            .join(", ")}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save Assignments",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setSaving(true);

      const {
        data: duplicateRows,
        error: duplicateError,
      } = await supabase
        .from("class_offerings")
        .select("id, subject_id")
        .eq("section_id", formData.section_id)
        .eq("school_year", formData.school_year)
        .eq("semester", formData.semester)
        .in(
          "subject_id",
          formData.selected_subject_ids
        );

      if (duplicateError) throw duplicateError;
      if ((duplicateRows || []).length > 0) {
        throw new Error(
          "One or more selected subjects already have an assignment for this block and term."
        );
      }

      const rows = formData.selected_subject_ids.map(
        (subjectId) => ({
          section_id: formData.section_id,
          subject_id: subjectId,
          teacher_id: formData.teacher_id,
          school_year: formData.school_year,
          semester: formData.semester,
          is_active: true,
        })
      );

      const {
        data: createdOfferings,
        error: createError,
      } = await supabase
        .from("class_offerings")
        .insert(rows)
        .select("id");

      if (createError) throw createError;

      await Swal.fire({
        icon: "success",
        title: "Assignments Saved",
        text: `${
          createdOfferings?.length || rows.length
        } subject${
          (createdOfferings?.length || rows.length) === 1
            ? ""
            : "s"
        } assigned successfully.`,
      });

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Save class assignment error:", error);

      await Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.message ||
          "Unable to save the class assignments.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (offering) => {
    const newStatus = !offering.is_active;

    const confirmation = await Swal.fire({
      icon: "question",
      title: newStatus
        ? "Activate Assignment?"
        : "Deactivate Assignment?",
      text: newStatus
        ? "This subject assignment will become active again."
        : "This subject will no longer generate new clearance steps.",
      showCancelButton: true,
      confirmButtonText: newStatus
        ? "Activate"
        : "Deactivate",
      cancelButtonText: "Cancel",
      confirmButtonColor: newStatus
        ? "#16a34a"
        : "#d97706",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("class_offerings")
        .update({ is_active: newStatus })
        .eq("id", offering.id);

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: newStatus
          ? "Assignment Activated"
          : "Assignment Deactivated",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadData();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to Change Status",
        text:
          error?.message ||
          "The assignment status could not be changed.",
      });
    }
  };

  const handleDelete = async (offering) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete Assignment?",
      html: `
        <div style="text-align:left;line-height:1.6">
          <p><strong>Subject:</strong> ${
            offering.subject?.subject_name ||
            "Unknown Subject"
          }</p>
          <p><strong>Teacher:</strong> ${
            offering.teacher?.full_name ||
            "Unknown Teacher"
          }</p>
          <p style="color:#b45309;margin-top:8px">Existing clearance steps will remain. This only affects future requests.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("class_offerings")
        .delete()
        .eq("id", offering.id);

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: "Assignment Deleted",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadData();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "Unable to delete the assignment.",
      });
    }
  };

  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === formData.teacher_id
  );

  const selectedOfficialClass = sections.find(
    (section) => section.id === formData.section_id
  );

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
                Class Assignments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Connect official classes, teachers, and subjects to the routing used by student clearance requests.
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
            New Class Assignment
          </motion.button>
        </div>
      </motion.section>


      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.06 },
          },
        }}
        className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Subject Assignments",
            value: statistics.total,
            icon: <FaBookOpen />,
            iconClass: "bg-blue-50 text-blue-700",
          },
          {
            label: "Active Assignments",
            value: statistics.active,
            icon: <FaCheckCircle />,
            iconClass: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Assigned Classes",
            value: statistics.assignedBlocks,
            icon: <FaLayerGroup />,
            iconClass: "bg-violet-50 text-violet-700",
          },
          {
            label: "Assigned Teachers",
            value: statistics.assignedTeachers,
            icon: <FaChalkboardTeacher />,
            iconClass: "bg-amber-50 text-amber-700",
          },
        ].map((item) => (
          <motion.div
            key={item.label}
            variants={cardMotion}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${item.iconClass}`}
              >
                {item.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search class, teacher, subject, or term..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <FaFilter />
            Filters
          </div>

          <select
            value={courseFilter}
            onChange={(event) =>
              setCourseFilter(event.target.value)
            }
            className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="All">All Courses</option>
            {availableCourses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="min-w-[170px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </motion.div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading class assignments...
          </p>
        </div>
      ) : groupedOfferings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
            <FaLayerGroup />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-800">
            No class assignments found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Create an assignment to connect a teacher and one or more subjects to an official class.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="space-y-4"
        >
          {groupedOfferings.map((group) => {
            const expanded =
              expandedGroups.includes(
                group.key
              );

            const activeCount =
              group.offerings.filter(
                (offering) =>
                  offering.is_active
              ).length;

            const inactiveCount =
              group.offerings.length -
              activeCount;

            const previewClasses =
              group.classGroups.slice(0, 4);

            const hiddenClassCount =
              Math.max(
                group.classGroups.length -
                  previewClasses.length,
                0
              );

            return (
              <motion.article
                key={group.key}
                variants={cardMotion}
                layout
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                        <FaUserTie />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-bold text-slate-900 md:text-xl">
                            {group.teacher
                              ?.full_name ||
                              group.teacher
                                ?.email ||
                              "Unknown Teacher"}
                          </h2>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {group.teacher
                              ?.employee_id ||
                              "Approver"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          All assigned classes are merged under this approver and organized by course, year level, block, and term.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                        {group.classGroups.length}{" "}
                        class
                        {group.classGroups.length ===
                        1
                          ? ""
                          : "es"}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {group.offerings.length}{" "}
                        subject
                        {group.offerings.length ===
                        1
                          ? ""
                          : "s"}
                      </span>

                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        {activeCount} active
                      </span>

                      {inactiveCount > 0 && (
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          {inactiveCount} inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {previewClasses.map(
                        (classGroup) => (
                          <span
                            key={
                              classGroup.key
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            <FaLayerGroup className="text-blue-600" />

                            {classGroup
                              .section?.course ||
                              "Course"}{" "}
                            —{" "}
                            {classGroup
                              .section
                              ?.year_level ||
                              "Year"}{" "}
                            — Block{" "}
                            {classGroup
                              .section
                              ?.block_code ||
                              "N/A"}
                          </span>
                        )
                      )}

                      {hiddenClassCount >
                        0 && (
                        <span className="inline-flex items-center rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500">
                          +{hiddenClassCount}{" "}
                          more class
                          {hiddenClassCount === 1
                            ? ""
                            : "es"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleGroup(
                          group.key
                        )
                      }
                      className="inline-flex min-w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {expanded ? (
                        <>
                          <FaChevronUp />
                          Hide classes
                        </>
                      ) : (
                        <>
                          <FaChevronDown />
                          Manage classes
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <AnimatePresence
                  initial={false}
                >
                  {expanded && (
                    <motion.div
                      key="details"
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.24,
                      }}
                      className="overflow-hidden border-t border-slate-100 bg-slate-50/70"
                    >
                      <div className="space-y-4 p-4 md:p-5">
                        {group.classGroups.map(
                          (classGroup) => {
                            const classActiveCount =
                              classGroup.offerings.filter(
                                (
                                  offering
                                ) =>
                                  offering.is_active
                              ).length;

                            const classInactiveCount =
                              classGroup.offerings
                                .length -
                              classActiveCount;

                            return (
                              <section
                                key={
                                  classGroup.key
                                }
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                              >
                                <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-4 md:p-5">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white">
                                          {classGroup
                                            .section
                                            ?.course ||
                                            "Unknown Course"}
                                        </span>

                                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                                          {classGroup
                                            .section
                                            ?.year_level ||
                                            "Unknown Year"}
                                        </span>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                          Block{" "}
                                          {classGroup
                                            .section
                                            ?.block_code ||
                                            "N/A"}
                                        </span>
                                      </div>

                                      <p className="mt-3 text-sm font-semibold text-slate-700">
                                        {
                                          classGroup.semester
                                        }{" "}
                                        •{" "}
                                        {
                                          classGroup.school_year
                                        }
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                        {
                                          classGroup
                                            .offerings
                                            .length
                                        }{" "}
                                        subject
                                        {classGroup
                                          .offerings
                                          .length ===
                                        1
                                          ? ""
                                          : "s"}
                                      </span>

                                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                        {
                                          classActiveCount
                                        }{" "}
                                        active
                                      </span>

                                      {classInactiveCount >
                                        0 && (
                                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                          {
                                            classInactiveCount
                                          }{" "}
                                          inactive
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 p-3 md:p-4">
                                  {classGroup.offerings.map(
                                    (
                                      offering
                                    ) => (
                                      <motion.div
                                        key={
                                          offering.id
                                        }
                                        layout
                                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                              offering.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                            }`}
                                          >
                                            <FaBookOpen />
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-800">
                                              {offering
                                                .subject
                                                ?.subject_name ||
                                                "Unknown Subject"}
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-500">
                                              {offering
                                                .subject
                                                ?.subject_code ||
                                                "No subject code"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                                          <span
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                              offering.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-amber-50 text-amber-700"
                                            }`}
                                          >
                                            {offering.is_active
                                              ? "Active"
                                              : "Inactive"}
                                          </span>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStatusChange(
                                                offering
                                              )
                                            }
                                            title={
                                              offering.is_active
                                                ? "Deactivate assignment"
                                                : "Activate assignment"
                                            }
                                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:-translate-y-0.5 ${
                                              offering.is_active
                                                ? "bg-amber-500 hover:bg-amber-600"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                            }`}
                                          >
                                            {offering.is_active ? (
                                              <FaToggleOff />
                                            ) : (
                                              <FaToggleOn />
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDelete(
                                                offering
                                              )
                                            }
                                            title="Delete assignment"
                                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-600 hover:text-white"
                                          >
                                            <FaTrash />
                                          </button>
                                        </div>
                                      </motion.div>
                                    )
                                  )}
                                </div>
                              </section>
                            );
                          }
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    New academic routing
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Assign Teacher Subjects
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select an approver, choose one official class from the searchable list, then assign subjects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-7 p-6">
                  <section>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                        <FaUserTie />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">
                          Teacher / Approver
                        </h3>

                        <p className="text-xs text-slate-500">
                          Select the teacher who will receive the subject clearance steps.
                        </p>
                      </div>
                    </div>

                    <select
                      value={formData.teacher_id}
                      onChange={handleTeacherChange}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">
                        Select an active approver
                      </option>

                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || teacher.email}
                          {teacher.employee_id
                            ? ` — ${teacher.employee_id}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {selectedTeacher && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-violet-700 shadow-sm">
                          <FaChalkboardTeacher />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {selectedTeacher.full_name ||
                              selectedTeacher.email}
                          </p>

                          <p className="text-xs text-slate-500">
                            {selectedTeacher.email}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </section>

                  <section className="border-t border-slate-100 pt-7">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <FaLayerGroup />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">
                          Official Class
                        </h3>

                        <p className="text-xs text-slate-500">
                          Select a course first, then choose the exact official class.
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <label>
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Course
                        </span>

                        <select
                          value={
                            formData.course_id
                          }
                          onChange={
                            handleCourseChange
                          }
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        >
                          <option value="">
                            Select course
                          </option>

                          {courses.map(
                            (course) => (
                              <option
                                key={
                                  course.id
                                }
                                value={
                                  course.id
                                }
                              >
                                {
                                  course.course_code
                                }
                                {course.course_name
                                  ? ` — ${course.course_name}`
                                  : ""}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Year Level
                        </span>

                        <select
                          value={
                            formData.year_level
                          }
                          onChange={
                            handleYearLevelChange
                          }
                          disabled={
                            !formData.course_id
                          }
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            Select year level
                          </option>

                          {availableYearLevels.map(
                            (yearLevel) => (
                              <option
                                key={
                                  yearLevel
                                }
                                value={
                                  yearLevel
                                }
                              >
                                {
                                  yearLevel
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    </div>

                    <label className="mb-4 block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Find Block
                      </span>

                      <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                          type="text"
                          value={
                            classSearch
                          }
                          onChange={(
                            event
                          ) =>
                            setClassSearch(
                              event.target
                                .value
                            )
                          }
                          disabled={
                            !formData.course_id ||
                            !formData.year_level
                          }
                          placeholder={
                            !formData.course_id
                              ? "Select a course first"
                              : !formData.year_level
                              ? "Select a year level first"
                              : "Search block, semester, or school year..."
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </label>

                    {selectedOfficialClass && (
                      <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                          Selected Official Class
                        </p>

                        <p className="mt-2 font-black text-slate-900">
                          {selectedOfficialClass.course} —{" "}
                          {selectedOfficialClass.year_level} — Block{" "}
                          {selectedOfficialClass.block_code}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {selectedOfficialClass.semester} •{" "}
                          {selectedOfficialClass.school_year}
                        </p>
                      </div>
                    )}

                    <div className="grid max-h-80 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                      {!formData.course_id ? (
                        <div className="col-span-full rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center text-sm text-blue-700">
                          Select a course to view its year levels and blocks.
                        </div>
                      ) : !formData.year_level ? (
                        <div className="col-span-full rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center text-sm text-blue-700">
                          Select a year level to view its blocks.
                        </div>
                      ) : officialClassOptions.length === 0 ? (
                        <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          No blocks found for {formData.course} — {formData.year_level}.
                        </div>
                      ) : (
                        officialClassOptions.map((section) => {
                          const selected =
                            formData.section_id === section.id;

                          return (
                            <motion.button
                              key={section.id}
                              type="button"
                              whileTap={
                                section.is_active
                                  ? { scale: 0.99 }
                                  : undefined
                              }
                              disabled={!section.is_active}
                              onClick={() =>
                                handleOfficialClassSelect(section)
                              }
                              className={`rounded-2xl border p-4 text-left transition ${
                                !section.is_active
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-55"
                                  : selected
                                  ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-slate-900">
                                    {section.course} — {section.year_level}
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    Block {section.block_code}
                                  </p>

                                  <p className="mt-2 text-xs text-slate-500">
                                    {section.semester} • {section.school_year}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    section.is_active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {section.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="border-t border-slate-100 pt-7">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <FaBookOpen />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">
                            Subjects handled
                          </h3>
                          <p className="text-xs text-slate-500">
                            {formData.selected_subject_ids.length} subject{formData.selected_subject_ids.length === 1 ? "" : "s"} selected
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectAllSubjects}
                        disabled={
                          selectableSubjectIds.length === 0
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {selectableSubjectIds.length > 0 &&
                        selectableSubjectIds.every((subjectId) =>
                          formData.selected_subject_ids.includes(
                            subjectId
                          )
                        )
                          ? "Clear selection"
                          : "Select all available"}
                      </button>
                    </div>

                    <div className="relative mb-4">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={subjectSearch}
                        onChange={(event) =>
                          setSubjectSearch(event.target.value)
                        }
                        placeholder="Search subject code or name..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                    </div>

                    {filteredSubjects.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                        No subjects found.
                      </div>
                    ) : (
                      <div className="grid max-h-80 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                        {filteredSubjects.map((subject) => {
                          const alreadyAssigned =
                            existingSubjectIds.includes(
                              subject.id
                            );
                          const selected =
                            formData.selected_subject_ids.includes(
                              subject.id
                            );

                          return (
                            <motion.button
                              whileTap={
                                alreadyAssigned
                                  ? undefined
                                  : { scale: 0.98 }
                              }
                              key={subject.id}
                              type="button"
                              disabled={alreadyAssigned}
                              onClick={() =>
                                toggleSubject(subject.id)
                              }
                              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                                alreadyAssigned
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                                  : selected
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white text-transparent"
                                }`}
                              >
                                <FaCheck />
                              </span>

                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-800">
                                  {subject.subject_name}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {subject.subject_code ||
                                    "No subject code"}
                                </span>
                                {alreadyAssigned && (
                                  <span className="mt-2 block text-xs font-semibold text-amber-700">
                                    Already assigned to this class
                                  </span>
                                )}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      formData.selected_subject_ids.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave />
                    {saving
                      ? "Saving assignments..."
                      : `Save ${formData.selected_subject_ids.length} subject${formData.selected_subject_ids.length === 1 ? "" : "s"}`}
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

export default ClassAssignmentManagement;