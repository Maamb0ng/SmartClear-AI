import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaIdCard,
  FaLayerGroup,
  FaLock,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaUser,
  FaUserCheck,
  FaUserGraduate,
  FaUserTag,
} from "react-icons/fa";

import {
  registerUser,
} from "../../services/authService";

import {
  supabase,
} from "../../services/supabase";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

/*
=====================================
REGISTRATION OPTIONS
=====================================
*/

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

const BLOCKS = Array.from(
  { length: 6 },
  (_, index) =>
    String.fromCharCode(65 + index)
);

const currentYear =
  new Date().getFullYear();

const SCHOOL_YEARS = Array.from(
  { length: 10 },
  (_, index) => {
    const startYear =
      currentYear - 3 + index;

    return `${startYear}-${startYear + 1}`;
  }
);

const createDefaultFormData = () => ({
  full_name: "",
  role: "Student",

  student_number: "",
  employee_id: "",

  student_type: "Regular",
  irregular_subject_ids: [],

  course_id: "",
  year_level: "",
  school_year: "",
  semester: "",
  section: "",

  email: "",
  password: "",
  confirmPassword: "",
});

const pageVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 45 : -45,
    scale: 0.985,
  }),

  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },

  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -45 : 45,
    scale: 0.985,
  }),
};

function SelectField({
  label,
  name,
  value,
  onChange,
  icon: Icon,
  children,
  disabled = false,
  required = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {children}
        </select>

        <FaChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
      </div>
    </div>
  );
}

function Register() {
  const navigate = useNavigate();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    loadingCourses,
    setLoadingCourses,
  ] = useState(true);

  const [
    courses,
    setCourses,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    loadingSubjects,
    setLoadingSubjects,
  ] = useState(true);

  const [
    subjectSearch,
    setSubjectSearch,
  ] = useState("");

  const [
    subjectLoadError,
    setSubjectLoadError,
  ] = useState("");

  const [
    formData,
    setFormData,
  ] = useState(
    createDefaultFormData
  );

  const [
    currentStep,
    setCurrentStep,
  ] = useState(0);

  const [
    direction,
    setDirection,
  ] = useState(1);

  /*
  =====================================
  LOAD COURSES
  =====================================
  */

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);

        const {
          data,
          error,
        } = await supabase
          .from("courses")
          .select(`
            id,
            course_code,
            course_name,
            is_active
          `)
          .eq("is_active", true)
          .order("course_code", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setCourses(data || []);
      } catch (error) {
        console.error(
          "Load courses error:",
          error
        );

        setCourses([]);

        Swal.fire({
          icon: "error",
          title:
            "Unable to Load Courses",
          text:
            error?.message ||
            "Unable to load the available courses.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoadingSubjects(true);
        setSubjectLoadError("");

        const {
          data,
          error,
        } = await supabase
          .from("subjects")
          .select(`
            id,
            subject_code,
            subject_name,
            program,
            year_level,
            semester,
            units,
            is_active
          `)
          .eq(
            "is_active",
            true
          )
          .order(
            "subject_code",
            {
              ascending:
                true,
            }
          );

        if (error) {
          throw error;
        }

        setSubjects(
          data || []
        );
      } catch (error) {
        console.error(
          "Load irregular subjects error:",
          error
        );

        setSubjects([]);
        setSubjectLoadError(
          error?.message ||
            "Unable to load subjects."
        );
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, []);

  /*
  =====================================
  DYNAMIC STEPS
  =====================================
  */

  const steps = useMemo(() => {
    const baseSteps = [
      {
        key: "account",
        label: "Account",
        icon: FaUser,
      },
    ];

    if (
      formData.role === "Student"
    ) {
      baseSteps.push({
        key: "academic",
        label: "Academic",
        icon: FaGraduationCap,
      });
    }

    baseSteps.push({
      key: "security",
      label: "Security",
      icon: FaShieldAlt,
    });

    return baseSteps;
  }, [formData.role]);

  const currentStepKey =
    steps[currentStep]?.key ||
    "account";

  useEffect(() => {
    if (
      currentStep >
      steps.length - 1
    ) {
      setCurrentStep(
        steps.length - 1
      );
    }
  }, [
    currentStep,
    steps.length,
  ]);

  /*
  =====================================
  SELECTED COURSE
  =====================================
  */

  const selectedCourse =
    useMemo(() => {
      return courses.find(
        (course) =>
          course.id ===
          formData.course_id
      );
    }, [
      courses,
      formData.course_id,
    ]);

  const filteredSubjects =
    useMemo(() => {
      const keyword =
        subjectSearch
          .trim()
          .toLowerCase();

      if (!keyword) {
        return subjects;
      }

      return subjects.filter(
        (
          subject
        ) => {
          const searchable =
            [
              subject.subject_code,
              subject.subject_name,
              subject.program,
              subject.year_level,
              subject.semester,
              subject.units,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            keyword
          );
        }
      );
    }, [
      subjects,
      subjectSearch,
    ]);

  const toggleIrregularSubject = (
    subjectId
  ) => {
    setFormData(
      (previousData) => {
        const alreadySelected =
          previousData.irregular_subject_ids.includes(
            subjectId
          );

        return {
          ...previousData,

          irregular_subject_ids:
            alreadySelected
              ? previousData.irregular_subject_ids.filter(
                  (id) =>
                    id !== subjectId
                )
              : [
                  ...previousData.irregular_subject_ids,
                  subjectId,
                ],
        };
      }
    );
  };

  const selectStudentType = (
    studentType
  ) => {
    setFormData(
      (previousData) => ({
        ...previousData,

        student_type:
          studentType,

        irregular_subject_ids:
          studentType ===
          "Irregular"
            ? previousData.irregular_subject_ids
            : [],
      })
    );

    if (
      studentType === "Regular"
    ) {
      setSubjectSearch("");
    }
  };

  /*
  =====================================
  INPUT HANDLERS
  =====================================
  */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previousData) => ({
        ...previousData,
        [name]: value,
      })
    );
  };

  const handleRoleChange = (
    event
  ) => {
    const selectedRole =
      event.target.value;

    setFormData(
      (previousData) => ({
        ...previousData,

        role: selectedRole,

        student_number:
          selectedRole ===
          "Student"
            ? previousData.student_number
            : "",

        employee_id:
          selectedRole ===
          "Approver"
            ? previousData.employee_id
            : "",

        student_type:
          selectedRole ===
          "Student"
            ? previousData.student_type
            : "Regular",

        irregular_subject_ids:
          selectedRole ===
          "Student"
            ? previousData.irregular_subject_ids
            : [],

        course_id:
          selectedRole ===
          "Student"
            ? previousData.course_id
            : "",

        year_level:
          selectedRole ===
          "Student"
            ? previousData.year_level
            : "",

        school_year:
          selectedRole ===
          "Student"
            ? previousData.school_year
            : "",

        semester:
          selectedRole ===
          "Student"
            ? previousData.semester
            : "",

        section:
          selectedRole ===
          "Student"
            ? previousData.section
            : "",
      })
    );

    setCurrentStep(0);
    setDirection(-1);
  };

  /*
  =====================================
  STEP VALIDATION
  =====================================
  */

  const showValidationWarning = (
    title,
    text
  ) => {
    Swal.fire({
      icon: "warning",
      title,
      text,
      confirmButtonColor:
        "#2563eb",
    });
  };

  const validateCurrentStep = () => {
    if (
      currentStepKey === "account"
    ) {
      if (
        !formData.full_name.trim()
      ) {
        showValidationWarning(
          "Full Name Required",
          "Please enter your complete name."
        );

        return false;
      }

      if (
        formData.role ===
          "Student" &&
        !formData.student_number.trim()
      ) {
        showValidationWarning(
          "Student Number Required",
          "Please enter your student number."
        );

        return false;
      }

      if (
        formData.role ===
          "Approver" &&
        !formData.employee_id.trim()
      ) {
        showValidationWarning(
          "Employee ID Required",
          "Please enter your employee ID."
        );

        return false;
      }

      if (
        !formData.email
          .trim()
      ) {
        showValidationWarning(
          "Email Required",
          "Please enter your official email address."
        );

        return false;
      }
    }

    if (
      currentStepKey ===
      "academic"
    ) {
      if (!formData.course_id) {
        showValidationWarning(
          "Course Required",
          "Please select your course."
        );

        return false;
      }

      if (!formData.year_level) {
        showValidationWarning(
          "Year Level Required",
          "Please select your year level."
        );

        return false;
      }

      if (!formData.school_year) {
        showValidationWarning(
          "School Year Required",
          "Please select your school year."
        );

        return false;
      }

      if (!formData.semester) {
        showValidationWarning(
          "Semester Required",
          "Please select your semester."
        );

        return false;
      }

      if (!formData.section) {
        showValidationWarning(
          "Block Required",
          "Please select your block."
        );

        return false;
      }

      if (
        formData.student_type ===
          "Irregular" &&
        formData.irregular_subject_ids
          .length === 0
      ) {
        showValidationWarning(
          "Irregular Subject Required",
          "Please select at least one subject in which you are currently irregular."
        );

        return false;
      }
    }

    if (
      currentStepKey ===
      "security"
    ) {
      if (
        formData.password.length <
        6
      ) {
        showValidationWarning(
          "Password Too Short",
          "Your password must contain at least 6 characters."
        );

        return false;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        Swal.fire({
          icon: "error",
          title:
            "Passwords Do Not Match",
          text:
            "Please make sure both passwords are identical.",
          confirmButtonColor:
            "#2563eb",
        });

        return false;
      }
    }

    return true;
  };

  const goToNextStep = () => {
    if (
      !validateCurrentStep()
    ) {
      return;
    }

    setDirection(1);
    setCurrentStep(
      (previousStep) =>
        Math.min(
          previousStep + 1,
          steps.length - 1
        )
    );
  };

  const goToPreviousStep = () => {
    setDirection(-1);
    setCurrentStep(
      (previousStep) =>
        Math.max(
          previousStep - 1,
          0
        )
    );
  };

  /*
  =====================================
  SUBMIT REGISTRATION
  =====================================
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      currentStepKey !==
      "security"
    ) {
      goToNextStep();
      return;
    }

    if (
      !validateCurrentStep()
    ) {
      return;
    }

    const fullName =
      formData.full_name.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    try {
      setSubmitting(true);

      await registerUser({
        full_name: fullName,
        role: formData.role,

        student_number:
          formData.role ===
          "Student"
            ? formData.student_number.trim()
            : null,

        employee_id:
          formData.role ===
          "Approver"
            ? formData.employee_id.trim()
            : null,

        student_type:
          formData.role ===
          "Student"
            ? formData.student_type
            : null,

        irregular_subject_ids:
          formData.role ===
            "Student" &&
          formData.student_type ===
            "Irregular"
            ? formData.irregular_subject_ids
            : [],

        course_id:
          formData.role ===
          "Student"
            ? formData.course_id
            : null,

        year_level:
          formData.role ===
          "Student"
            ? formData.year_level
            : null,

        school_year:
          formData.role ===
          "Student"
            ? formData.school_year
            : null,

        semester:
          formData.role ===
          "Student"
            ? formData.semester
            : null,

        section:
          formData.role ===
          "Student"
            ? formData.section
            : null,

        email,
        password:
          formData.password,
      });

      await Swal.fire({
        icon: "success",
        title:
          "Registration Successful",

        html:
          formData.role ===
          "Approver"
            ? `
              <p>
                Your approver account is
                awaiting administrator
                approval and assignment.
              </p>
            `
            : `
              <div style="text-align:left">
                <p>
                  Your student account is
                  awaiting administrator
                  approval.
                </p>

                <p style="margin-top:12px">
                  <strong>Classification:</strong>
                  ${formData.student_type}
                </p>

                <p style="margin-top:6px">
                  <strong>Course:</strong>
                  ${
                    selectedCourse
                      ?.course_code ||
                    "N/A"
                  }
                </p>

                <p style="margin-top:6px">
                  <strong>Year Level:</strong>
                  ${formData.year_level}
                </p>

                <p style="margin-top:6px">
                  <strong>Block:</strong>
                  ${formData.section}
                </p>

                <p style="margin-top:6px">
                  <strong>Term:</strong>
                  ${formData.semester},
                  ${formData.school_year}
                </p>

                ${
                  formData.student_type ===
                  "Irregular"
                    ? `
                      <p style="margin-top:6px">
                        <strong>Irregular Subjects:</strong>
                        ${formData.irregular_subject_ids.length}
                        selected for Administrator verification.
                      </p>
                    `
                    : ""
                }
              </div>
            `,

        confirmButtonText:
          "Continue to Login",
        confirmButtonColor:
          "#2563eb",
      });

      navigate("/login");
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Registration Failed",
        text:
          error?.message ||
          "Unable to create your account. Please try again.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep =
    currentStep ===
    steps.length - 1;

  const progress =
    ((currentStep + 1) /
      steps.length) *
    100;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_34%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.72fr_1.28fr]">
        {/* COMPACT LEFT PANEL */}

        <motion.section
          initial={{
            opacity: 0,
            x: -45,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative hidden overflow-hidden bg-[#061b51] text-white lg:sticky lg:top-0 lg:block lg:h-screen"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#061b51]/90 via-[#082a70]/87 to-[#03143f]/96" />

          <motion.div
            animate={{
              scale: [1, 1.12, 1],
              opacity: [
                0.12,
                0.23,
                0.12,
              ],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300 blur-3xl"
          />

          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full border border-white/10"
          />

          <div className="relative z-10 flex h-full flex-col px-8 py-7 xl:px-10">
            <div className="flex items-center gap-3.5">
              <motion.div
                whileHover={{
                  scale: 1.06,
                  rotate: 4,
                }}
                className="h-16 w-16 overflow-hidden rounded-full border border-white/30 bg-white p-1 shadow-xl"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <h1 className="text-xl font-black tracking-tight xl:text-2xl">
                  SmartClear AI
                </h1>

                <p className="mt-0.5 text-xs text-blue-100/80">
                  Digital Clearance Registration
                </p>
              </div>
            </div>

            <div className="my-auto">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.18,
                  duration: 0.55,
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md"
              >
                <FaCheckCircle className="text-cyan-300" />
                Secure registration
              </motion.div>

              <motion.h2
                initial={{
                  opacity: 0,
                  y: 24,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.26,
                  duration: 0.6,
                }}
                className="mt-5 text-3xl font-black leading-tight xl:text-4xl"
              >
                Start your digital
                <span className="block bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                  clearance journey.
                </span>
              </motion.h2>

              <motion.p
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.34,
                  duration: 0.55,
                }}
                className="mt-4 max-w-md text-sm leading-6 text-blue-100/80"
              >
                Complete one short step at a time. Your information will be
                verified by the administrator before activation.
              </motion.p>

              <div className="mt-7 space-y-2.5">
                {[
                  "Official academic details",
                  "Administrator verification",
                  "Secure role-based account",
                ].map(
                  (item, index) => (
                    <motion.div
                      key={item}
                      initial={{
                        opacity: 0,
                        x: -18,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          0.42 +
                          index * 0.08,
                        duration: 0.45,
                      }}
                      whileHover={{
                        x: 5,
                      }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-3 backdrop-blur-md"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-300">
                        <FaCheck className="text-xs" />
                      </div>

                      <span className="text-sm font-semibold text-white/90">
                        {item}
                      </span>
                    </motion.div>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="text-xs font-semibold text-white">
                Consolatrix College of Toledo City, Inc.
              </p>

              <p className="mt-1 text-[11px] text-blue-100/65">
                Smarter • Faster • Paperless
              </p>
            </div>
          </div>
        </motion.section>

        {/* COMPACT WIZARD PANEL */}

        <section className="relative flex min-h-screen items-start justify-center px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-12">
          <motion.div
            initial={{
              opacity: 0,
              y: 22,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="my-auto w-full max-w-3xl"
          >
            <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 shadow-[0_24px_65px_rgba(15,23,42,0.15)] backdrop-blur-xl">
              {/* HEADER */}

              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 shadow lg:hidden">
                    <img
                      src={schoolLogo}
                      alt="Consolatrix College of Toledo City seal"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                      Create Account
                    </h2>

                    <p className="text-xs text-slate-500">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FaArrowLeft />
                  <span className="hidden sm:inline">
                    Login
                  </span>
                </Link>
              </div>

              {/* PROGRESS */}

              <div className="px-5 pt-4 sm:px-7">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={false}
                    animate={{
                      width:
                        `${progress}%`,
                    }}
                    transition={{
                      duration: 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400"
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {steps.map(
                    (
                      step,
                      index
                    ) => {
                      const Icon =
                        step.icon;

                      const active =
                        index ===
                        currentStep;

                      const complete =
                        index <
                        currentStep;

                      return (
                        <motion.div
                          key={
                            step.key
                          }
                          animate={{
                            scale:
                              active
                                ? 1.02
                                : 1,
                          }}
                          className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition ${
                            active
                              ? "bg-blue-50 text-blue-700"
                              : complete
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                              active
                                ? "bg-blue-100"
                                : complete
                                ? "bg-emerald-100"
                                : "bg-slate-100"
                            }`}
                          >
                            {complete ? (
                              <FaCheck className="text-[10px]" />
                            ) : (
                              <Icon className="text-[10px]" />
                            )}
                          </div>

                          <span className="hidden sm:inline">
                            {step.label}
                          </span>
                        </motion.div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* FORM BODY */}

              <form
                onSubmit={handleSubmit}
                className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6"
              >
                <div className="relative min-h-[300px]">
                  <AnimatePresence
                    mode="wait"
                    custom={
                      direction
                    }
                  >
                    <motion.div
                      key={
                        currentStepKey
                      }
                      custom={
                        direction
                      }
                      variants={
                        pageVariants
                      }
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        duration: 0.32,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {/* ACCOUNT STEP */}

                      {currentStepKey ===
                        "account" && (
                        <div>
                          <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                              Basic Information
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Enter your identity and contact details.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Input
                                label="Full Name"
                                name="full_name"
                                placeholder="Enter your complete name"
                                value={
                                  formData.full_name
                                }
                                onChange={
                                  handleChange
                                }
                                leftIcon={
                                  <FaUser />
                                }
                                required
                              />
                            </div>

                            <SelectField
                              label="Account Type"
                              name="role"
                              value={
                                formData.role
                              }
                              onChange={
                                handleRoleChange
                              }
                              icon={
                                FaUserTag
                              }
                              required
                            >
                              <option value="Student">
                                Student
                              </option>

                              <option value="Approver">
                                Approver / Teacher / Office Staff
                              </option>
                            </SelectField>

                            {formData.role ===
                            "Student" ? (
                              <Input
                                label="Student Number"
                                name="student_number"
                                placeholder="Enter student number"
                                value={
                                  formData.student_number
                                }
                                onChange={
                                  handleChange
                                }
                                leftIcon={
                                  <FaIdCard />
                                }
                                required
                              />
                            ) : (
                              <Input
                                label="Employee ID"
                                name="employee_id"
                                placeholder="Enter employee ID"
                                value={
                                  formData.employee_id
                                }
                                onChange={
                                  handleChange
                                }
                                leftIcon={
                                  <FaIdCard />
                                }
                                required
                              />
                            )}

                            <div className="sm:col-span-2">
                              <Input
                                label="Email Address"
                                type="email"
                                name="email"
                                placeholder="Enter your official school email"
                                value={
                                  formData.email
                                }
                                onChange={
                                  handleChange
                                }
                                leftIcon={
                                  <FaEnvelope />
                                }
                                required
                              />
                            </div>
                          </div>

                          <p className="mt-4 text-xs leading-5 text-slate-500">
                            Administrator accounts cannot be created through public registration.
                          </p>
                        </div>
                      )}

                      {/* ACADEMIC STEP */}

                      {currentStepKey ===
                        "academic" && (
                        <div>
                          <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                              Academic Information
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Select your current class and clearance term.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <SelectField
                                label="Course"
                                name="course_id"
                                value={
                                  formData.course_id
                                }
                                onChange={
                                  handleChange
                                }
                                icon={
                                  FaGraduationCap
                                }
                                disabled={
                                  loadingCourses
                                }
                                required
                              >
                                <option value="">
                                  {loadingCourses
                                    ? "Loading Courses..."
                                    : "Select Course"}
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
                                      }{" "}
                                      —{" "}
                                      {
                                        course.course_name
                                      }
                                    </option>
                                  )
                                )}
                              </SelectField>
                            </div>

                            <SelectField
                              label="Year Level"
                              name="year_level"
                              value={
                                formData.year_level
                              }
                              onChange={
                                handleChange
                              }
                              icon={
                                FaBookOpen
                              }
                              required
                            >
                              <option value="">
                                Select Year Level
                              </option>

                              {YEAR_LEVELS.map(
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
                            </SelectField>

                            <SelectField
                              label="School Year"
                              name="school_year"
                              value={
                                formData.school_year
                              }
                              onChange={
                                handleChange
                              }
                              icon={
                                FaCalendarAlt
                              }
                              required
                            >
                              <option value="">
                                Select School Year
                              </option>

                              {SCHOOL_YEARS.map(
                                (schoolYear) => (
                                  <option
                                    key={
                                      schoolYear
                                    }
                                    value={
                                      schoolYear
                                    }
                                  >
                                    {
                                      schoolYear
                                    }
                                  </option>
                                )
                              )}
                            </SelectField>

                            <SelectField
                              label="Semester"
                              name="semester"
                              value={
                                formData.semester
                              }
                              onChange={
                                handleChange
                              }
                              icon={
                                FaCalendarAlt
                              }
                              required
                            >
                              <option value="">
                                Select Semester
                              </option>

                              {SEMESTERS.map(
                                (semester) => (
                                  <option
                                    key={
                                      semester
                                    }
                                    value={
                                      semester
                                    }
                                  >
                                    {
                                      semester
                                    }
                                  </option>
                                )
                              )}
                            </SelectField>

                            <SelectField
                              label="Block"
                              name="section"
                              value={
                                formData.section
                              }
                              onChange={
                                handleChange
                              }
                              icon={
                                FaLayerGroup
                              }
                              required
                            >
                              <option value="">
                                Select Block
                              </option>

                              {BLOCKS.map(
                                (block) => (
                                  <option
                                    key={
                                      block
                                    }
                                    value={
                                      block
                                    }
                                  >
                                    Block{" "}
                                    {
                                      block
                                    }
                                  </option>
                                )
                              )}
                            </SelectField>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
                              Student Classification
                            </p>

                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {[
                                {
                                  value: "Regular",
                                  title: "Regular Student",
                                  description:
                                    "Your subjects follow your official home section.",
                                },
                                {
                                  value: "Irregular",
                                  title: "Irregular Student",
                                  description:
                                    "Select the subjects in which you are currently irregular.",
                                },
                              ].map(
                                (option) => {
                                  const selected =
                                    formData.student_type ===
                                    option.value;

                                  return (
                                    <motion.button
                                      key={option.value}
                                      type="button"
                                      whileTap={{
                                        scale: 0.985,
                                      }}
                                      onClick={() =>
                                        selectStudentType(
                                          option.value
                                        )
                                      }
                                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                                        selected
                                          ? "border-blue-500 bg-blue-50 shadow-sm"
                                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span
                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                          selected
                                            ? "bg-blue-700 text-white"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        <FaUserGraduate />
                                      </span>

                                      <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-slate-900">
                                          {option.title}
                                        </span>

                                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                                          {option.description}
                                        </span>
                                      </span>

                                      <span
                                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                          selected
                                            ? "border-blue-700 bg-blue-700 text-white"
                                            : "border-slate-300 bg-white"
                                        }`}
                                      >
                                        {selected && (
                                          <FaCheck className="text-[9px]" />
                                        )}
                                      </span>
                                    </motion.button>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <AnimatePresence>
                            {formData.student_type ===
                              "Irregular" && (
                              <motion.section
                                initial={{
                                  opacity: 0,
                                  y: 12,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: -8,
                                }}
                                className="mt-5 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50"
                              >
                                <div className="border-b border-amber-100 bg-white/70 p-4">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <h3 className="font-black text-slate-900">
                                        Select Irregular Subjects
                                      </h3>

                                      <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Your selections will still be verified by the Administrator.
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 self-start sm:self-center">
                                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                        {subjectSearch.trim()
                                          ? `${filteredSubjects.length} shown`
                                          : `${subjects.length} available`}
                                      </span>

                                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                                        {formData.irregular_subject_ids.length} selected
                                      </span>
                                    </div>
                                  </div>

                                  <label className="relative mt-3 block">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                                    <input
                                      type="search"
                                      value={subjectSearch}
                                      onChange={(event) =>
                                        setSubjectSearch(
                                          event.target.value
                                        )
                                      }
                                      placeholder="Search code, subject, program, year, or semester..."
                                      className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-20 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                                    />

                                    {subjectSearch && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSubjectSearch(
                                            ""
                                          )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </label>
                                </div>

                                <div className="h-64 space-y-2 overflow-y-scroll overscroll-contain p-3 touch-pan-y [scrollbar-gutter:stable] sm:h-80 sm:p-4 lg:h-96">
                                  {loadingSubjects ? (
                                    <div className="py-10 text-center text-sm font-semibold text-slate-500">
                                      Loading subjects...
                                    </div>
                                  ) : subjectLoadError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
                                      <FaBookOpen className="mx-auto text-3xl text-red-300" />

                                      <p className="mt-3 text-sm font-black text-red-700">
                                        Unable to load subjects
                                      </p>

                                      <p className="mt-1 break-words text-xs leading-5 text-red-500">
                                        {subjectLoadError}
                                      </p>
                                    </div>
                                  ) : filteredSubjects.length ===
                                    0 ? (
                                    <div className="py-10 text-center">
                                      <FaBookOpen className="mx-auto text-3xl text-slate-300" />

                                      <p className="mt-3 text-sm font-bold text-slate-600">
                                        No matching subjects found
                                      </p>

                                      <p className="mt-1 text-xs leading-5 text-slate-400">
                                        {subjects.length === 0
                                          ? "No active subjects are readable on the public registration page. Apply the included Supabase read policy."
                                          : "Clear the search field or search using another code, name, program, year level, or semester."}
                                      </p>
                                    </div>
                                  ) : (
                                    filteredSubjects.map(
                                      (subject) => {
                                        const selected =
                                          formData.irregular_subject_ids.includes(
                                            subject.id
                                          );

                                        const subjectCode =
                                          subject.subject_code ||
                                          subject.code ||
                                          "SUBJECT";

                                        const subjectName =
                                          subject.subject_name ||
                                          subject.name ||
                                          subject.title ||
                                          "Unnamed Subject";

                                        return (
                                          <motion.button
                                            key={subject.id}
                                            type="button"
                                            whileTap={{
                                              scale: 0.99,
                                            }}
                                            onClick={() =>
                                              toggleIrregularSubject(
                                                subject.id
                                              )
                                            }
                                            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${
                                              selected
                                                ? "border-blue-400 bg-blue-50"
                                                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                                            }`}
                                          >
                                            <span
                                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                                selected
                                                  ? "border-blue-700 bg-blue-700 text-white"
                                                  : "border-slate-300 bg-white"
                                              }`}
                                            >
                                              {selected && (
                                                <FaCheck className="text-[9px]" />
                                              )}
                                            </span>

                                            <span className="min-w-0 flex-1">
                                              <span className="block text-sm font-black text-slate-900">
                                                {subjectCode} — {subjectName}
                                              </span>

                                              <span className="mt-1 block text-xs text-slate-500">
                                                {[
                                                  subject.year_level,
                                                  subject.semester,
                                                ]
                                                  .filter(Boolean)
                                                  .join(" • ") ||
                                                  "For Administrator verification"}
                                              </span>
                                            </span>
                                          </motion.button>
                                        );
                                      }
                                    )
                                  )}
                                </div>
                              </motion.section>
                            )}
                          </AnimatePresence>

                          <AnimatePresence>
                            {selectedCourse &&
                              formData.year_level &&
                              formData.school_year &&
                              formData.semester &&
                              formData.section && (
                                <motion.div
                                  initial={{
                                    opacity: 0,
                                    y: 8,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    y: -8,
                                  }}
                                  className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                                >
                                  <FaCheckCircle className="shrink-0 text-emerald-600" />

                                  <div>
                                    <p className="text-sm font-bold text-emerald-800">
                                      {
                                        selectedCourse.course_code
                                      }{" "}
                                      •{" "}
                                      {
                                        formData.year_level
                                      }{" "}
                                      • Block{" "}
                                      {
                                        formData.section
                                      }
                                    </p>

                                    <p className="text-xs text-emerald-600">
                                      {
                                        formData.semester
                                      }{" "}
                                      •{" "}
                                      {
                                        formData.school_year
                                      }
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* SECURITY STEP */}

                      {currentStepKey ===
                        "security" && (
                        <div>
                          <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                              Login Security
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Create a password for your SmartClear account.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                              label="Password"
                              type={
                                showPassword
                                  ? "text"
                                  : "password"
                              }
                              name="password"
                              placeholder="Create a password"
                              value={
                                formData.password
                              }
                              onChange={
                                handleChange
                              }
                              leftIcon={
                                <FaLock />
                              }
                              rightIcon={
                                showPassword
                                  ? <FaEyeSlash />
                                  : <FaEye />
                              }
                              onRightIconClick={() =>
                                setShowPassword(
                                  (
                                    previousValue
                                  ) =>
                                    !previousValue
                                )
                              }
                              required
                            />

                            <Input
                              label="Confirm Password"
                              type={
                                showConfirmPassword
                                  ? "text"
                                  : "password"
                              }
                              name="confirmPassword"
                              placeholder="Confirm your password"
                              value={
                                formData.confirmPassword
                              }
                              onChange={
                                handleChange
                              }
                              leftIcon={
                                <FaLock />
                              }
                              rightIcon={
                                showConfirmPassword ? (
                                  <FaEyeSlash />
                                ) : (
                                  <FaEye />
                                )
                              }
                              onRightIconClick={() =>
                                setShowConfirmPassword(
                                  (
                                    previousValue
                                  ) =>
                                    !previousValue
                                )
                              }
                              required
                            />
                          </div>

                          <motion.div
                            initial={{
                              opacity: 0,
                              y: 10,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay: 0.12,
                            }}
                            className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                <FaUserCheck />
                              </div>

                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  Account review required
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  After registration, the administrator will verify your information before activating your account.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* ACTIONS */}

                <div className="mt-4 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={
                      goToPreviousStep
                    }
                    disabled={
                      currentStep === 0 ||
                      submitting
                    }
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    <FaArrowLeft />
                    Back
                  </button>

                  {isLastStep ? (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={
                        submitting ||
                        loadingCourses
                      }
                      className="group w-full !rounded-xl !bg-gradient-to-r !from-blue-700 !via-blue-600 !to-indigo-600 shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 sm:min-w-44 sm:w-auto"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {submitting
                          ? "Creating..."
                          : "Create Account"}

                        {!submitting && (
                          <FaUserCheck className="transition-transform group-hover:scale-110" />
                        )}
                      </span>
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        goToNextStep
                      }
                      className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(37,99,235,0.3)] sm:min-w-36 sm:w-auto"
                    >
                      Continue

                      <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              © {new Date().getFullYear()} SmartClear AI
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default Register;