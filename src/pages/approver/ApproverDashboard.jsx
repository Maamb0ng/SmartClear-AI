import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  createSubjectRequirement,
  deleteSubjectRequirement,
  getSubjectRequirements,
  setSubjectRequirementOpenStatus,
  setSubjectRequirementStatus,
  updateSubjectRequirement,
} from "../../services/subjectRequirementService";

import {
  FaBookOpen,
  FaBuilding,
  FaCheckCircle,
  FaClipboardList,
  FaCog,
  FaEdit,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaFileAlt,
  FaGraduationCap,
  FaKey,
  FaPlus,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaThumbtack,
  FaTimesCircle,
  FaTrash,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const STORAGE_BUCKET = "clearance-requirements";
const uniqueIds = (items = []) => [
  ...new Set(items.filter(Boolean)),
];

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusClass = (status) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-700";

    case "Rejected":
      return "bg-red-100 text-red-700";

    case "Pending":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const DEFAULT_REQUIREMENT_FORM = {
  title: "",
  description: "",
  submissionType: "No Submission",
  isRequired: true,
  deadline: "",
  allowedFileTypes: "pdf,jpg,jpeg,png,doc,docx",
  maxFileSizeMb: 5,
};

const requirementNeedsSubmission = (requirement) =>
  Boolean(
    requirement?.is_active &&
      requirement?.submission_type !== "No Submission"
  );

const toDateTimeLocalValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
};

const normalizeAllowedFileTypes = (value) =>
  String(value || "")
    .split(",")
    .map((item) =>
      item.trim().toLowerCase().replace(/^\./, "")
    )
    .filter(Boolean);


const normalizeKeyPart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const buildClassOfferingKey = ({
  sectionId,
  subjectId,
  schoolYear,
  semester,
}) =>
  [
    sectionId,
    subjectId,
    normalizeKeyPart(schoolYear),
    normalizeKeyPart(semester),
  ].join("|");

const getOrdinalYearLabel = (yearNumber) => {
  const numericYear = Number(yearNumber);

  if (!Number.isFinite(numericYear)) {
    return "Unassigned Year";
  }

  const remainder100 =
    numericYear % 100;

  let suffix = "th";

  if (
    remainder100 < 11 ||
    remainder100 > 13
  ) {
    const remainder10 =
      numericYear % 10;

    if (remainder10 === 1) {
      suffix = "st";
    } else if (remainder10 === 2) {
      suffix = "nd";
    } else if (remainder10 === 3) {
      suffix = "rd";
    }
  }

  return `${numericYear}${suffix} Year`;
};

const normalizeYearLevel = (value) => {
  const rawValue =
    String(value || "").trim();

  if (!rawValue) {
    return "Unassigned Year";
  }

  const normalizedValue =
    rawValue.toLowerCase();

  if (
    normalizedValue.includes(
      "unassigned"
    )
  ) {
    return "Unassigned Year";
  }

  const wordYearMap = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
  };

  const wordMatch =
    Object.entries(
      wordYearMap
    ).find(([word]) =>
      normalizedValue.includes(
        word
      )
    );

  if (wordMatch) {
    return getOrdinalYearLabel(
      wordMatch[1]
    );
  }

  const numberMatch =
    normalizedValue.match(/\d+/);

  if (numberMatch) {
    return getOrdinalYearLabel(
      Number(numberMatch[0])
    );
  }

  return rawValue;
};

const getYearSortValue = (value) => {
  const normalizedValue =
    normalizeYearLevel(value);

  const numberMatch =
    normalizedValue.match(/\d+/);

  if (numberMatch) {
    return Number(
      numberMatch[0]
    );
  }

  return Number.MAX_SAFE_INTEGER;
};

const formatBlockLabel = (value) => {
  const blockCode =
    String(value || "").trim();

  if (
    !blockCode ||
    blockCode
      .toLowerCase()
      .includes("unassigned")
  ) {
    return "Unassigned Block";
  }

  return `Block ${blockCode}`;
};

function ApproverDashboard() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [approver, setApprover] = useState(null);
  const [assignedSteps, setAssignedSteps] = useState([]);
  const [
    assignedClassOfferings,
    setAssignedClassOfferings,
  ] = useState([]);

  const [loading, setLoading] = useState(true);
  const [reviewingStepId, setReviewingStepId] =
    useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceMode, setWorkspaceMode] =
    useState("class");

  const [classDirectoryOrder, setClassDirectoryOrder] =
    useState("year");

  const [selectedDirectoryYear, setSelectedDirectoryYear] =
    useState("");

  const [selectedDirectoryCourse, setSelectedDirectoryCourse] =
    useState("");

  const [showHiddenBlocks, setShowHiddenBlocks] =
    useState(false);

  const [pinnedBlocks, setPinnedBlocks] = useState([]);
  const [hiddenBlocks, setHiddenBlocks] = useState([]);

  const [selectedBlockKey, setSelectedBlockKey] =
    useState(null);

  const [selectedTargetKey, setSelectedTargetKey] =
    useState(null);

  const [selectedSubmission, setSelectedSubmission] =
    useState(null);

  const [selectedStudentOverview, setSelectedStudentOverview] =
    useState(null);

  const [selectedRequirement, setSelectedRequirement] =
    useState(null);

  const [loadingRequirement, setLoadingRequirement] =
    useState(false);

  const [showRequirementModal, setShowRequirementModal] =
    useState(false);

  const [savingRequirement, setSavingRequirement] =
    useState(false);

  const [requirementForm, setRequirementForm] =
    useState(DEFAULT_REQUIREMENT_FORM);

  const [focusedStepId, setFocusedStepId] =
    useState(null);

  const [handledNotificationId, setHandledNotificationId] =
    useState(null);

  const [isRegistrarVerifier, setIsRegistrarVerifier] =
    useState(false);

  const [clearanceReference, setClearanceReference] =
    useState("");

  const [verificationCode, setVerificationCode] =
    useState("");

  const [verifyingClearance, setVerifyingClearance] =
    useState(false);

  const [verificationResult, setVerificationResult] =
    useState(null);

  const [reviewStatusFilter, setReviewStatusFilter] =
    useState("All");

  const [reviewSubmissionFilter, setReviewSubmissionFilter] =
    useState("All");

  const [reviewSort, setReviewSort] =
    useState("priority");

  /*
  |--------------------------------------------------------------------------
  | LOAD SAVED APPROVER VIEW SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!approver?.id) return;

    try {
      const savedPinned = JSON.parse(
        localStorage.getItem(
          `smartclear-pinned-blocks-${approver.id}`
        ) || "[]"
      );

      const savedHidden = JSON.parse(
        localStorage.getItem(
          `smartclear-hidden-blocks-${approver.id}`
        ) || "[]"
      );

      setPinnedBlocks(
        Array.isArray(savedPinned) ? savedPinned : []
      );

      setHiddenBlocks(
        Array.isArray(savedHidden) ? savedHidden : []
      );
    } catch (error) {
      console.error(
        "Unable to load approver preferences:",
        error
      );

      setPinnedBlocks([]);
      setHiddenBlocks([]);
    }
  }, [approver?.id]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD APPROVER DATA
  |--------------------------------------------------------------------------
  */

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        throw new Error(
          "You are not logged in."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD APPROVER PROFILE
      |--------------------------------------------------------------------------
      */

      const {
        data: approverProfile,
        error: profileError,
      } = await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          full_name,
          employee_id,
          email,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (profileError) throw profileError;

      if (
        approverProfile.role !== "Approver"
      ) {
        throw new Error(
          "This dashboard is only available to approver accounts."
        );
      }

      if (
        approverProfile.status !== "Active"
      ) {
        throw new Error(
          "Your approver account is not active."
        );
      }

      setApprover(approverProfile);

      /*
      |--------------------------------------------------------------------------
      | CHECK REGISTRAR VERIFICATION AUTHORIZATION
      |--------------------------------------------------------------------------
      |
      | The verification panel is shown only when this Approver has an active
      | office assignment whose office name contains "Registrar".
      |
      |--------------------------------------------------------------------------
      */

      const {
        data: officeAssignments,
        error: officeAssignmentError,
      } = await supabase
        .from("approver_assignments")
        .select(`
          id,
          office_id,
          subject_id,
          approver_id,
          is_active,
          offices (
            id,
            office_name
          )
        `)
        .eq("approver_id", approverProfile.id)
        .eq("is_active", true)
        .not("office_id", "is", null)
        .is("subject_id", null);

      if (officeAssignmentError) {
        console.warn(
          "Unable to check Registrar assignment:",
          officeAssignmentError
        );

        setIsRegistrarVerifier(false);
      } else {
        const hasRegistrarAssignment = (
          officeAssignments || []
        ).some((assignment) =>
          assignment.offices?.office_name
            ?.trim()
            .toLowerCase()
            .includes("registrar")
        );

        setIsRegistrarVerifier(
          hasRegistrarAssignment
        );

      }

      /*
      |--------------------------------------------------------------------------
      | LOAD ALL ACTIVE CLASS OFFERINGS OF THE CURRENT TEACHER
      |--------------------------------------------------------------------------
      |
      | This is loaded independently from clearance_steps so an officially
      | assigned class still appears even when no student has submitted a
      | clearance request yet.
      |--------------------------------------------------------------------------
      */

      const {
        data: teacherClassOfferingRows,
        error: teacherClassOfferingError,
      } = await supabase
        .from("class_offerings")
        .select(`
          id,
          section_id,
          subject_id,
          teacher_id,
          semester,
          school_year,
          is_active
        `)
        .eq(
          "teacher_id",
          approverProfile.id
        )
        .eq("is_active", true);

      if (teacherClassOfferingError) {
        throw teacherClassOfferingError;
      }

      const teacherClassOfferings =
        teacherClassOfferingRows || [];

      /*
      |--------------------------------------------------------------------------
      | LOAD ONLY STEPS ASSIGNED TO CURRENT APPROVER
      |--------------------------------------------------------------------------
      */

      const {
        data: steps,
        error: stepError,
      } = await supabase
        .from("clearance_steps")
        .select(`
          id,
          clearance_request_id,
          office_id,
          subject_id,
          class_offering_id,
          approver_id,
          status,
          remarks,
          reviewed_at
        `)
        .eq(
          "approver_id",
          approverProfile.id
        );

      if (stepError) throw stepError;

      const safeSteps = steps || [];

      const requestIds = uniqueIds(
        safeSteps.map(
          (step) =>
            step.clearance_request_id
        )
      );

      const stepIds = uniqueIds(
        safeSteps.map((step) => step.id)
      );

      const subjectIds = uniqueIds([
        ...safeSteps.map(
          (step) => step.subject_id
        ),
        ...teacherClassOfferings.map(
          (offering) =>
            offering.subject_id
        ),
      ]);

      const officeIds = uniqueIds(
        safeSteps.map(
          (step) => step.office_id
        )
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD CLEARANCE REQUESTS
      |--------------------------------------------------------------------------
      */

      let safeRequests = [];

      if (requestIds.length > 0) {
        const {
          data: requests,
          error: requestError,
        } = await supabase
          .from("clearance_requests")
          .select(`
            id,
            student_id,
            section_id,
            school_year,
            semester,
            status,
            requested_at,
            updated_at,
            completed_at
          `)
          .in("id", requestIds);

        if (requestError) {
          throw requestError;
        }

        safeRequests =
          requests || [];
      }

      const studentIds = uniqueIds(
        safeRequests.map(
          (request) => request.student_id
        )
      );

      const sectionIds = uniqueIds([
        ...safeRequests.map(
          (request) => request.section_id
        ),
        ...teacherClassOfferings.map(
          (offering) =>
            offering.section_id
        ),
      ]);

      /*
      |--------------------------------------------------------------------------
      | LOAD STUDENTS
      |--------------------------------------------------------------------------
      */

      let students = [];

      if (studentIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select(`
            id,
            student_id,
            full_name,
            email,
            course,
            year_level,
            section,
            semester,
            school_year
          `)
          .in("id", studentIds);

        if (error) throw error;

        students = data || [];
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD OFFICIAL SECTIONS
      |--------------------------------------------------------------------------
      */

      let sections = [];

      if (sectionIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("sections")
          .select(`
            id,
            course_id,
            course,
            year_level,
            block_code,
            school_year,
            semester,
            is_active
          `)
          .in("id", sectionIds);

        if (error) throw error;

        sections = data || [];
      }

      const courseIds = uniqueIds(
        sections.map(
          (section) => section.course_id
        )
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD COURSES
      |--------------------------------------------------------------------------
      */

      let courses = [];

      if (courseIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("courses")
          .select(`
            id,
            course_code,
            course_name
          `)
          .in("id", courseIds);

        if (error) throw error;

        courses = data || [];
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD SUBJECTS
      |--------------------------------------------------------------------------
      */

      const classOfferings =
        teacherClassOfferings;

      let subjects = [];

      if (subjectIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("subjects")
          .select(`
            id,
            subject_code,
            subject_name
          `)
          .in("id", subjectIds);

        if (error) throw error;

        subjects = data || [];
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD OFFICES
      |--------------------------------------------------------------------------
      */

      let offices = [];

      if (officeIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("offices")
          .select(`
            id,
            office_name,
            office_code
          `)
          .in("id", officeIds);

        if (error) throw error;

        offices = data || [];
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD CURRENT STUDENT SUBMISSIONS
      |--------------------------------------------------------------------------
      */

      let submissions = [];

if (stepIds.length > 0) {
  const {
    data,
    error,
  } = await supabase
    .from("clearance_submissions")
    .select(`
      id,
      clearance_step_id,
      student_id,
      submission_text,
      attachment_url,
      attachment_name,
      version,
      is_current,
      submitted_at,
      updated_at
    `)
    .in("clearance_step_id", stepIds)
    .eq("is_current", true);

  if (error) throw error;

  const rawSubmissions = data || [];

  submissions = await Promise.all(
    rawSubmissions.map(async (submission) => {
      if (!submission.attachment_url) {
        return {
          ...submission,
          signed_url: null,
        };
      }

      const {
        data: signedUrlData,
        error: signedUrlError,
      } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(
          submission.attachment_url,
          60 * 10
        );

      if (signedUrlError) {
        console.warn(
          "Unable to create attachment signed URL:",
          signedUrlError
        );

        return {
          ...submission,
          signed_url: null,
        };
      }

      return {
        ...submission,
        signed_url:
          signedUrlData?.signedUrl || null,
      };
    })
  );
}

      /*
      |--------------------------------------------------------------------------
      | CREATE LOOKUP MAPS
      |--------------------------------------------------------------------------
      */

      const requestMap = new Map(
        safeRequests.map((item) => [
          item.id,
          item,
        ])
      );

      const studentMap = new Map(
        students.map((item) => [
          item.id,
          item,
        ])
      );

      const sectionMap = new Map(
        sections.map((item) => [
          item.id,
          item,
        ])
      );

      const courseMap = new Map(
        courses.map((item) => [
          item.id,
          item,
        ])
      );

      const subjectMap = new Map(
        subjects.map((item) => [
          item.id,
          item,
        ])
      );

      const officeMap = new Map(
        offices.map((item) => [
          item.id,
          item,
        ])
      );

      const classOfferingMap = new Map(
        classOfferings.map(
          (offering) => [
            buildClassOfferingKey({
              sectionId:
                offering.section_id,
              subjectId:
                offering.subject_id,
              schoolYear:
                offering.school_year,
              semester:
                offering.semester,
            }),
            offering,
          ]
        )
      );

      const classOfferingIdMap = new Map(
        classOfferings.map((offering) => [
          String(offering.id),
          offering,
        ])
      );

      const submissionMap = new Map(
        submissions.map((item) => [
          item.clearance_step_id,
          item,
        ])
      );


      /*
      |--------------------------------------------------------------------------
      | ENRICH ALL OFFICIALLY ASSIGNED CLASS OFFERINGS
      |--------------------------------------------------------------------------
      |
      | These seed the dashboard navigation even when the class currently has
      | zero clearance requests or zero student steps.
      |--------------------------------------------------------------------------
      */

      const enrichedClassOfferings =
        classOfferings
          .map((offering) => {
            const section =
              sectionMap.get(
                offering.section_id
              );

            const subject =
              subjectMap.get(
                offering.subject_id
              );

            if (
              !section ||
              !subject
            ) {
              return null;
            }

            const course =
              section.course_id
                ? courseMap.get(
                    section.course_id
                  )
                : null;

            const courseCode =
              course?.course_code ||
              section.course ||
              "Unassigned Course";

            const courseName =
              course?.course_name ||
              "";

            const yearLevel =
              normalizeYearLevel(
                section.year_level
              );

            const blockCode =
              String(
                section.block_code ||
                  "Unassigned Block"
              ).trim();

            const blockBaseKey =
              section.id ||
              [
                courseCode,
                yearLevel,
                blockCode,
                offering.school_year,
                offering.semester,
              ].join("|");

            return {
              ...offering,
              section,
              course,
              subject,

              courseCode,
              courseName,
              yearLevel,
              blockCode,

              schoolYear:
                offering.school_year,
              semester:
                offering.semester,

              targetType: "Subject",
              targetName:
                subject.subject_name ||
                "Subject",
              targetCode:
                subject.subject_code ||
                "",

              blockKey:
                `class|${blockBaseKey}|${normalizeKeyPart(
                  offering.school_year
                )}|${normalizeKeyPart(
                  offering.semester
                )}`,

              targetKey:
                `subject-${subject.id}`,
            };
          })
          .filter(Boolean);

      /*
      |--------------------------------------------------------------------------
      | ENRICH EVERY ASSIGNED STEP
      |--------------------------------------------------------------------------
      */

      const enrichedSteps = safeSteps
        .map((step) => {
          const request = requestMap.get(
            step.clearance_request_id
          );

          if (!request) return null;

          const student = studentMap.get(
            request.student_id
          );

          const section = sectionMap.get(
            request.section_id
          );

          const course = section?.course_id
            ? courseMap.get(
                section.course_id
              )
            : null;

          const subject = step.subject_id
            ? subjectMap.get(
                step.subject_id
              )
            : null;

          const exactClassOffering =
            step.class_offering_id
              ? classOfferingIdMap.get(
                  String(step.class_offering_id)
                ) || null
              : null;

          const legacyClassOffering =
            subject &&
            request.section_id
              ? classOfferingMap.get(
                  buildClassOfferingKey({
                    sectionId:
                      request.section_id,
                    subjectId:
                      subject.id,
                    schoolYear:
                      request.school_year,
                    semester:
                      request.semester,
                  })
                ) || null
              : null;

          const classOffering =
            exactClassOffering ||
            legacyClassOffering;

          /*
          |--------------------------------------------------------------------------
          | STRICT SUBJECT OWNERSHIP
          |--------------------------------------------------------------------------
          |
          | A subject step is shown only when the exact active class offering
          | belongs to the logged-in teacher for the same section, subject,
          | school year, and semester.
          |
          | This prevents stale clearance_steps from appearing on the wrong
          | teacher dashboard.
          |--------------------------------------------------------------------------
          */

          if (
            subject &&
            !classOffering
          ) {
            return null;
          }

          if (
            subject &&
            (
              String(classOffering.teacher_id || "") !==
                String(approverProfile.id) ||
              String(classOffering.subject_id || "") !==
                String(subject.id)
            )
          ) {
            return null;
          }

          const office = step.office_id
            ? officeMap.get(
                step.office_id
              )
            : null;

          const submission =
            submissionMap.get(step.id) ||
            null;


          const courseCode =
            course?.course_code ||
            section?.course ||
            student?.course ||
            "Unassigned Course";

          const courseName =
            course?.course_name || "";

          const yearLevel =
            normalizeYearLevel(
              section?.year_level ||
                student?.year_level
            );

          const blockCode =
            String(
              section?.block_code ||
                student?.section ||
                "Unassigned Block"
            ).trim();

          const targetType = subject
            ? "Subject"
            : "Office";

          const targetName =
            subject?.subject_name ||
            office?.office_name ||
            "Clearance Requirement";

          const targetCode =
            subject?.subject_code ||
            office?.office_code ||
            "";


          /*
          |--------------------------------------------------------------------------
          | BLOCK KEY
          |--------------------------------------------------------------------------
          |
          | Includes term to avoid combining different school years or semesters.
          |--------------------------------------------------------------------------
          */

          const blockBaseKey =
            request.section_id ||
            [
              courseCode,
              yearLevel,
              blockCode,
              request.school_year,
              request.semester,
            ].join("|");

          const blockKey =
            targetType === "Subject"
              ? `class|${blockBaseKey}|${normalizeKeyPart(
                  request.school_year
                )}|${normalizeKeyPart(
                  request.semester
                )}`
              : `office|${blockBaseKey}|${normalizeKeyPart(
                  request.school_year
                )}|${normalizeKeyPart(
                  request.semester
                )}`;

          const targetKey = subject
            ? `subject-${subject.id}`
            : office
              ? `office-${office.id}`
              : `step-${step.id}`;

          return {
            ...step,

            request,
            student,
            section,
            course,
            subject,
            office,
            submission,
            classOffering,
            classOfferingId:
              classOffering?.id || null,

            category:
              targetType === "Subject"
                ? "class"
                : "office",

            courseCode,
            courseName,
            yearLevel,
            blockCode,

            schoolYear:
              request.school_year,
            semester:
              request.semester,

            targetType,
            targetName,
            targetCode,

            blockKey,
            targetKey,
          };
        })
        .filter(Boolean);

      setAssignedClassOfferings(
        enrichedClassOfferings
      );

      setAssignedSteps(
        enrichedSteps
      );
    } catch (error) {
      console.error(
        "Approver dashboard error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Load Dashboard",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE CUSTOM VIEW SETTINGS
  |--------------------------------------------------------------------------
  */

  const savePinnedBlocks = (
    nextPinned
  ) => {
    setPinnedBlocks(nextPinned);

    if (approver?.id) {
      localStorage.setItem(
        `smartclear-pinned-blocks-${approver.id}`,
        JSON.stringify(nextPinned)
      );
    }
  };

  const saveHiddenBlocks = (
    nextHidden
  ) => {
    setHiddenBlocks(nextHidden);

    if (approver?.id) {
      localStorage.setItem(
        `smartclear-hidden-blocks-${approver.id}`,
        JSON.stringify(nextHidden)
      );
    }
  };

  const togglePinnedBlock = (
    blockKey
  ) => {
    const nextPinned =
      pinnedBlocks.includes(blockKey)
        ? pinnedBlocks.filter(
            (key) => key !== blockKey
          )
        : [...pinnedBlocks, blockKey];

    savePinnedBlocks(nextPinned);
  };

  const toggleHiddenBlock = (
    blockKey
  ) => {
    const nextHidden =
      hiddenBlocks.includes(blockKey)
        ? hiddenBlocks.filter(
            (key) => key !== blockKey
          )
        : [...hiddenBlocks, blockKey];

    saveHiddenBlocks(nextHidden);
  };

  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const studentIds = new Set(
      assignedSteps
        .map(
          (step) => step.student?.id
        )
        .filter(Boolean)
    );

    return [
      {
        title: "Pending Reviews",
        value: assignedSteps.filter(
          (step) =>
            step.status === "Pending"
        ).length,
        color: "bg-yellow-500",
        icon: <FaClipboardList />,
      },
      {
        title: "Approved Reviews",
        value: assignedSteps.filter(
          (step) =>
            step.status === "Approved"
        ).length,
        color: "bg-green-600",
        icon: <FaCheckCircle />,
      },
      {
        title: "Rejected Reviews",
        value: assignedSteps.filter(
          (step) =>
            step.status === "Rejected"
        ).length,
        color: "bg-red-600",
        icon: <FaTimesCircle />,
      },
      {
        title: "Students Assigned",
        value: studentIds.size,
        color: "bg-blue-700",
        icon: <FaUsers />,
      },
    ];
  }, [assignedSteps]);

  const workflowSummary = useMemo(() => {
    const uniqueStudents = new Set(
      assignedSteps
        .map((step) => step.student?.id)
        .filter(Boolean)
    );

    return {
      students: uniqueStudents.size,
      forReview: assignedSteps.filter(
        (step) =>
          step.status === "Pending" && Boolean(step.submission)
      ).length,
      waiting: assignedSteps.filter(
        (step) =>
          step.status === "Pending" && !step.submission
      ).length,
      approved: assignedSteps.filter(
        (step) => step.status === "Approved"
      ).length,
      rejected: assignedSteps.filter(
        (step) => step.status === "Rejected"
      ).length,
    };
  }, [assignedSteps]);

  /*
  |--------------------------------------------------------------------------
  | SEARCH AND HIDDEN BLOCK FILTERING
  |--------------------------------------------------------------------------
  */

  const filteredSteps = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return assignedSteps.filter(
      (step) => {
        const isHidden =
          hiddenBlocks.includes(
            step.blockKey
          );

        if (
          isHidden &&
          !showHiddenBlocks
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchContent = [
          step.courseCode,
          step.courseName,
          step.yearLevel,
          step.blockCode,
          step.targetName,
          step.targetCode,
          step.student?.student_id,
          step.student?.full_name,
          step.student?.email,
          step.schoolYear,
          step.semester,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchContent.includes(
          normalizedSearch
        );
      }
    );
  }, [
    assignedSteps,
    hiddenBlocks,
    searchTerm,
    showHiddenBlocks,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FILTER OFFICIALLY ASSIGNED CLASSES
  |--------------------------------------------------------------------------
  */

  const filteredClassOfferings =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return assignedClassOfferings.filter(
        (offering) => {
          const isHidden =
            hiddenBlocks.includes(
              offering.blockKey
            );

          if (
            isHidden &&
            !showHiddenBlocks
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchContent = [
            offering.courseCode,
            offering.courseName,
            offering.yearLevel,
            offering.blockCode,
            offering.targetName,
            offering.targetCode,
            offering.schoolYear,
            offering.semester,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchContent.includes(
            normalizedSearch
          );
        }
      );
    }, [
      assignedClassOfferings,
      hiddenBlocks,
      searchTerm,
      showHiddenBlocks,
    ]);

  /*
  |--------------------------------------------------------------------------
  | STUDENT SEARCH RESULTS
  |--------------------------------------------------------------------------
  |
  | The dashboard search can also act as a student finder. Clicking a student
  | opens one organized overview containing every clearance subject assigned
  | to the currently logged-in approver for that student.
  |
  |--------------------------------------------------------------------------
  */

  const studentSearchResults = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return [];

    const studentMap = new Map();

    assignedSteps.forEach((step) => {
      const student = step.student;

      if (!student?.id) return;

      const searchable = [
        student.full_name,
        student.student_id,
        student.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(keyword)) return;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          student,
          courseCode: step.courseCode,
          courseName: step.courseName,
          yearLevel: step.yearLevel,
          blockCode: step.blockCode,
          subjectCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        });
      }

      const entry = studentMap.get(student.id);

      if (step.targetType === "Subject") {
        entry.subjectCount += 1;
      }

      if (step.status === "Pending") entry.pendingCount += 1;
      if (step.status === "Approved") entry.approvedCount += 1;
      if (step.status === "Rejected") entry.rejectedCount += 1;
    });

    return [...studentMap.values()]
      .sort((a, b) =>
        String(a.student?.full_name || "").localeCompare(
          String(b.student?.full_name || "")
        )
      )
      .slice(0, 8);
  }, [assignedSteps, searchTerm]);

  const selectedStudentItems = useMemo(() => {
    if (!selectedStudentOverview?.student?.id) return [];

    return assignedSteps
      .filter(
        (step) =>
          step.student?.id === selectedStudentOverview.student.id
      )
      .sort((a, b) => {
        if (a.targetType !== b.targetType) {
          return a.targetType === "Subject" ? -1 : 1;
        }

        return String(a.targetName || "").localeCompare(
          String(b.targetName || "")
        );
      });
  }, [assignedSteps, selectedStudentOverview]);

  /*
  |--------------------------------------------------------------------------
  | GROUP AS COURSE → YEAR → BLOCK → SUBJECT/OFFICE
  |--------------------------------------------------------------------------
  */

  const blocks = useMemo(() => {
    const blockMap = new Map();

    /*
    |--------------------------------------------------------------------------
    | SEED EVERY OFFICIAL CLASS ASSIGNMENT
    |--------------------------------------------------------------------------
    |
    | A class remains visible even when no student clearance step exists yet.
    |--------------------------------------------------------------------------
    */

    filteredClassOfferings.forEach(
      (offering) => {
        if (
          !blockMap.has(
            offering.blockKey
          )
        ) {
          blockMap.set(
            offering.blockKey,
            {
              key:
                offering.blockKey,

              category: "class",

              courseCode:
                offering.courseCode,

              courseName:
                offering.courseName,

              yearLevel:
                offering.yearLevel,

              blockCode:
                offering.blockCode,

              schoolYear:
                offering.schoolYear,

              semester:
                offering.semester,

              targetsMap:
                new Map(),
            }
          );
        }

        const block =
          blockMap.get(
            offering.blockKey
          );

        if (
          !block.targetsMap.has(
            offering.targetKey
          )
        ) {
          block.targetsMap.set(
            offering.targetKey,
            {
              key:
                offering.targetKey,
              type: "Subject",
              name:
                offering.targetName,
              code:
                offering.targetCode,
              classOfferingId:
                offering.id,
              items: [],
            }
          );
        }
      }
    );

    filteredSteps.forEach((step) => {
      if (
        !blockMap.has(step.blockKey)
      ) {
        blockMap.set(step.blockKey, {
          key: step.blockKey,

          category:
            step.category ||
            (
              step.targetType === "Subject"
                ? "class"
                : "office"
            ),

          courseCode:
            step.courseCode,

          courseName:
            step.courseName,

          yearLevel:
            step.yearLevel,

          blockCode:
            step.blockCode,

          schoolYear:
            step.schoolYear,

          semester:
            step.semester,

          targetsMap: new Map(),
        });
      }

      const block = blockMap.get(
        step.blockKey
      );

      if (
        !block.targetsMap.has(
          step.targetKey
        )
      ) {
        block.targetsMap.set(
  step.targetKey,
  {
    key: step.targetKey,
    type: step.targetType,
    name: step.targetName,
    code: step.targetCode,
    classOfferingId:
      step.classOfferingId || null,
    items: [],
  }
);
      }

      const target =
        block.targetsMap.get(
          step.targetKey
        );

      if (
        !target.classOfferingId &&
        step.classOfferingId
      ) {
        target.classOfferingId =
          step.classOfferingId;
      }

      target.items.push(step);
    });

    return [...blockMap.values()]
      .map((block) => ({
        ...block,

        targets: [
          ...block.targetsMap.values(),
        ]
          .map((target) => ({
            ...target,

            items: target.items.sort(
              (a, b) =>
                (
                  a.student?.full_name ||
                  ""
                ).localeCompare(
                  b.student?.full_name ||
                    ""
                )
            ),
          }))
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "Subject"
                ? -1
                : 1;
            }

            return a.name.localeCompare(
              b.name
            );
          }),
      }))
      .sort((a, b) => {
        const aPinned =
          pinnedBlocks.includes(a.key);

        const bPinned =
          pinnedBlocks.includes(b.key);

        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1;
        }

        const courseCompare =
          a.courseCode.localeCompare(
            b.courseCode
          );

        if (courseCompare !== 0) {
          return courseCompare;
        }

        const yearCompare =
          getYearSortValue(
            a.yearLevel
          ) -
          getYearSortValue(
            b.yearLevel
          );

        if (yearCompare !== 0) {
          return yearCompare;
        }

        const yearLabelCompare =
          a.yearLevel.localeCompare(
            b.yearLevel
          );

        if (
          yearLabelCompare !== 0
        ) {
          return yearLabelCompare;
        }

        return a.blockCode.localeCompare(
          b.blockCode,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }, [
    filteredClassOfferings,
    filteredSteps,
    pinnedBlocks,
  ]);

  /*
  |--------------------------------------------------------------------------
  | COURSE AND YEAR GROUPS FOR LEFT PANEL
  |--------------------------------------------------------------------------
  */

  const courseYearGroups = useMemo(() => {
    const groupMap = new Map();

    blocks.forEach((block) => {
      const normalizedYearLevel =
        normalizeYearLevel(
          block.yearLevel
        );

      const category =
        block.category === "office"
          ? "office"
          : "class";

      const key = [
        category,
        block.courseCode,
        normalizedYearLevel,
      ].join("|");

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          category,
          courseCode:
            block.courseCode,
          courseName:
            block.courseName,
          yearLevel:
            normalizedYearLevel,
          yearSortValue:
            getYearSortValue(
              normalizedYearLevel
            ),
          blocks: [],
        });
      }

      groupMap.get(key).blocks.push(
        block
      );
    });

    return [...groupMap.values()]
      .map((group) => ({
        ...group,
        blocks: [...group.blocks].sort(
          (first, second) =>
            first.blockCode.localeCompare(
              second.blockCode,
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              }
            )
        ),
      }))
      .sort((first, second) => {
        if (
          first.category !==
          second.category
        ) {
          return first.category ===
            "class"
            ? -1
            : 1;
        }

        const courseCompare =
          first.courseCode.localeCompare(
            second.courseCode,
            undefined,
            {
              sensitivity: "base",
            }
          );

        if (courseCompare !== 0) {
          return courseCompare;
        }

        const yearCompare =
          first.yearSortValue -
          second.yearSortValue;

        if (yearCompare !== 0) {
          return yearCompare;
        }

        return first.yearLevel.localeCompare(
          second.yearLevel
        );
      });
  }, [blocks]);

  /*
  |--------------------------------------------------------------------------
  | SEPARATE TEACHING CLASSES FROM OFFICE CLEARANCE
  |--------------------------------------------------------------------------
  */

  const classBlocks = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.category !== "office"
      ),
    [blocks]
  );

  const officeBlocks = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.category === "office"
      ),
    [blocks]
  );

  const visibleBlocks =
    workspaceMode === "office"
      ? officeBlocks
      : classBlocks;

  const visibleCourseYearGroups =
    useMemo(
      () =>
        courseYearGroups.filter(
          (group) =>
            workspaceMode === "office"
              ? group.category ===
                "office"
              : group.category !==
                "office"
        ),
      [
        courseYearGroups,
        workspaceMode,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | OPTIONAL CLASS DIRECTORY ORDER
  |--------------------------------------------------------------------------
  |
  | Teachers may browse classes in either order:
  | Year Level -> Course -> Block, or Course -> Year Level -> Block.
  | The default is Year Level first because it is easier when handling
  | several programs in the same academic level.
  |
  |--------------------------------------------------------------------------
  */

  const classDirectoryGroups = useMemo(
    () =>
      visibleCourseYearGroups.filter(
        (group) => group.category !== "office"
      ),
    [visibleCourseYearGroups]
  );

  const classYearOptions = useMemo(() => {
    const options = [
      ...new Set(
        classDirectoryGroups.map(
          (group) => group.yearLevel
        )
      ),
    ];

    return options.sort(
      (first, second) =>
        getYearSortValue(first) -
          getYearSortValue(second) ||
        first.localeCompare(second)
    );
  }, [classDirectoryGroups]);

  const classCourseOptions = useMemo(() => {
    const courseMap = new Map();

    classDirectoryGroups.forEach((group) => {
      if (!courseMap.has(group.courseCode)) {
        courseMap.set(group.courseCode, {
          code: group.courseCode,
          name: group.courseName,
        });
      }
    });

    return [...courseMap.values()].sort(
      (first, second) =>
        first.code.localeCompare(
          second.code,
          undefined,
          { sensitivity: "base" }
        )
    );
  }, [classDirectoryGroups]);

  const coursesForSelectedYear = useMemo(() => {
    const courseMap = new Map();

    classDirectoryGroups
      .filter(
        (group) =>
          group.yearLevel ===
          selectedDirectoryYear
      )
      .forEach((group) => {
        if (!courseMap.has(group.courseCode)) {
          courseMap.set(group.courseCode, {
            code: group.courseCode,
            name: group.courseName,
          });
        }
      });

    return [...courseMap.values()].sort(
      (first, second) =>
        first.code.localeCompare(
          second.code,
          undefined,
          { sensitivity: "base" }
        )
    );
  }, [
    classDirectoryGroups,
    selectedDirectoryYear,
  ]);

  const yearsForSelectedCourse = useMemo(() => {
    const options = [
      ...new Set(
        classDirectoryGroups
          .filter(
            (group) =>
              group.courseCode ===
              selectedDirectoryCourse
          )
          .map(
            (group) => group.yearLevel
          )
      ),
    ];

    return options.sort(
      (first, second) =>
        getYearSortValue(first) -
          getYearSortValue(second) ||
        first.localeCompare(second)
    );
  }, [
    classDirectoryGroups,
    selectedDirectoryCourse,
  ]);

  useEffect(() => {
    if (
      workspaceMode !== "class" ||
      classDirectoryGroups.length === 0
    ) {
      return;
    }

    if (classDirectoryOrder === "year") {
      const nextYear =
        classYearOptions.includes(
          selectedDirectoryYear
        )
          ? selectedDirectoryYear
          : classYearOptions[0] || "";

      if (
        nextYear !==
        selectedDirectoryYear
      ) {
        setSelectedDirectoryYear(
          nextYear
        );
      }

      const availableCourses = [
        ...new Set(
          classDirectoryGroups
            .filter(
              (group) =>
                group.yearLevel ===
                nextYear
            )
            .map(
              (group) =>
                group.courseCode
            )
        ),
      ].sort((first, second) =>
        first.localeCompare(
          second,
          undefined,
          { sensitivity: "base" }
        )
      );

      const nextCourse =
        availableCourses.includes(
          selectedDirectoryCourse
        )
          ? selectedDirectoryCourse
          : availableCourses[0] || "";

      if (
        nextCourse !==
        selectedDirectoryCourse
      ) {
        setSelectedDirectoryCourse(
          nextCourse
        );
      }

      return;
    }

    const allCourseCodes =
      classCourseOptions.map(
        (course) => course.code
      );

    const nextCourse =
      allCourseCodes.includes(
        selectedDirectoryCourse
      )
        ? selectedDirectoryCourse
        : allCourseCodes[0] || "";

    if (
      nextCourse !==
      selectedDirectoryCourse
    ) {
      setSelectedDirectoryCourse(
        nextCourse
      );
    }

    const availableYears = [
      ...new Set(
        classDirectoryGroups
          .filter(
            (group) =>
              group.courseCode ===
              nextCourse
          )
          .map(
            (group) =>
              group.yearLevel
          )
      ),
    ].sort(
      (first, second) =>
        getYearSortValue(first) -
          getYearSortValue(second) ||
        first.localeCompare(second)
    );

    const nextYear =
      availableYears.includes(
        selectedDirectoryYear
      )
        ? selectedDirectoryYear
        : availableYears[0] || "";

    if (
      nextYear !==
      selectedDirectoryYear
    ) {
      setSelectedDirectoryYear(
        nextYear
      );
    }
  }, [
    workspaceMode,
    classDirectoryOrder,
    classDirectoryGroups,
    classYearOptions,
    classCourseOptions,
    selectedDirectoryYear,
    selectedDirectoryCourse,
  ]);

  const displayedDirectoryGroups = useMemo(() => {
    if (workspaceMode === "office") {
      return visibleCourseYearGroups;
    }

    return classDirectoryGroups.filter(
      (group) =>
        group.yearLevel ===
          selectedDirectoryYear &&
        group.courseCode ===
          selectedDirectoryCourse
    );
  }, [
    workspaceMode,
    visibleCourseYearGroups,
    classDirectoryGroups,
    selectedDirectoryYear,
    selectedDirectoryCourse,
  ]);

  const displayedDirectoryBlocks = useMemo(
    () =>
      displayedDirectoryGroups.flatMap(
        (group) => group.blocks
      ),
    [displayedDirectoryGroups]
  );

  useEffect(() => {
    if (workspaceMode !== "class") {
      return;
    }

    if (
      displayedDirectoryBlocks.length === 0
    ) {
      setSelectedBlockKey(null);
      setSelectedTargetKey(null);
      return;
    }

    const selectedBlockIsVisible =
      displayedDirectoryBlocks.some(
        (block) =>
          block.key ===
          selectedBlockKey
      );

    if (!selectedBlockIsVisible) {
      setSelectedBlockKey(
        displayedDirectoryBlocks[0].key
      );
      setSelectedTargetKey(null);
    }
  }, [
    workspaceMode,
    displayedDirectoryBlocks,
    selectedBlockKey,
  ]);

  const classPendingCount =
    assignedSteps.filter(
      (step) =>
        step.category !== "office" &&
        step.status === "Pending"
    ).length;

  const officePendingCount =
    assignedSteps.filter(
      (step) =>
        step.category === "office" &&
        step.status === "Pending"
    ).length;

  /*
  |--------------------------------------------------------------------------
  | AUTOMATICALLY OPEN THE CORRECT WORKSPACE
  |--------------------------------------------------------------------------
  |
  | Office-only approvers should not land on an empty Assigned Classes screen.
  | When the approver has office work but no teaching classes, the dashboard
  | opens Office Clearances automatically.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      workspaceMode === "class" &&
      classBlocks.length === 0 &&
      officeBlocks.length > 0
    ) {
      setWorkspaceMode("office");
      return;
    }

    if (
      workspaceMode === "office" &&
      officeBlocks.length === 0 &&
      classBlocks.length > 0
    ) {
      setWorkspaceMode("class");
    }
  }, [
    workspaceMode,
    classBlocks.length,
    officeBlocks.length,
  ]);

  /*
  |--------------------------------------------------------------------------
  | MAINTAIN VALID BLOCK SELECTION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (visibleBlocks.length === 0) {
      setSelectedBlockKey(null);
      setSelectedTargetKey(null);
      return;
    }

    const selectedBlockExists =
      visibleBlocks.some(
        (block) =>
          block.key ===
          selectedBlockKey
      );

    if (!selectedBlockExists) {
      setSelectedBlockKey(
        visibleBlocks[0].key
      );
    }
  }, [
    visibleBlocks,
    selectedBlockKey,
  ]);

  const selectedBlock = useMemo(
    () =>
      visibleBlocks.find(
        (block) =>
          block.key ===
          selectedBlockKey
      ) || null,
    [
      visibleBlocks,
      selectedBlockKey,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | MAINTAIN VALID SUBJECT/OFFICE SELECTION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedBlock) {
      setSelectedTargetKey(null);
      return;
    }

    const selectedTargetExists =
      selectedBlock.targets.some(
        (target) =>
          target.key ===
          selectedTargetKey
      );

    if (!selectedTargetExists) {
      setSelectedTargetKey(
        selectedBlock.targets[0]?.key ||
          null
      );
    }
  }, [
    selectedBlock,
    selectedTargetKey,
  ]);

  const selectedTarget = useMemo(
    () =>
      selectedBlock?.targets.find(
        (target) =>
          target.key ===
          selectedTargetKey
      ) || null,
    [
      selectedBlock,
      selectedTargetKey,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | STUDENT REVIEW FILTERS AND SORTING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setReviewStatusFilter("All");
    setReviewSubmissionFilter("All");
    setReviewSort("priority");
  }, [selectedBlockKey, selectedTargetKey]);

  const selectedTargetSummary = useMemo(() => {
    const items = selectedTarget?.items || [];

    return {
      total: items.length,
      pending: items.filter((item) => item.status === "Pending").length,
      approved: items.filter((item) => item.status === "Approved").length,
      rejected: items.filter((item) => item.status === "Rejected").length,
      forReview: items.filter(
        (item) => item.status === "Pending" && Boolean(item.submission)
      ).length,
      noSubmission: items.filter(
        (item) => item.status === "Pending" && !item.submission
      ).length,
    };
  }, [selectedTarget]);

  const filteredSelectedItems = useMemo(() => {
    const items = [...(selectedTarget?.items || [])];

    const filtered = items.filter((item) => {
      if (
        reviewStatusFilter !== "All" &&
        item.status !== reviewStatusFilter
      ) {
        return false;
      }

      if (reviewSubmissionFilter === "For Review") {
        return item.status === "Pending" && Boolean(item.submission);
      }

      if (reviewSubmissionFilter === "No Submission") {
        return item.status === "Pending" && !item.submission;
      }

      if (reviewSubmissionFilter === "Submitted") {
        return Boolean(item.submission);
      }

      return true;
    });

    const statusPriority = {
      Pending: 0,
      Rejected: 1,
      Approved: 2,
    };

    return filtered.sort((first, second) => {
      if (reviewSort === "name-asc") {
        return (first.student?.full_name || "").localeCompare(
          second.student?.full_name || "",
          undefined,
          { sensitivity: "base" }
        );
      }

      if (reviewSort === "name-desc") {
        return (second.student?.full_name || "").localeCompare(
          first.student?.full_name || "",
          undefined,
          { sensitivity: "base" }
        );
      }

      const firstActivity = new Date(
        first.submission?.submitted_at ||
          first.reviewed_at ||
          first.request?.requested_at ||
          0
      ).getTime();

      const secondActivity = new Date(
        second.submission?.submitted_at ||
          second.reviewed_at ||
          second.request?.requested_at ||
          0
      ).getTime();

      if (reviewSort === "newest") {
        return secondActivity - firstActivity;
      }

      if (reviewSort === "oldest") {
        return firstActivity - secondActivity;
      }

      const firstForReview =
        first.status === "Pending" && Boolean(first.submission);
      const secondForReview =
        second.status === "Pending" && Boolean(second.submission);

      if (firstForReview !== secondForReview) {
        return firstForReview ? -1 : 1;
      }

      const statusDifference =
        (statusPriority[first.status] ?? 3) -
        (statusPriority[second.status] ?? 3);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (first.student?.full_name || "").localeCompare(
        second.student?.full_name || "",
        undefined,
        { sensitivity: "base" }
      );
    });
  }, [
    selectedTarget,
    reviewStatusFilter,
    reviewSubmissionFilter,
    reviewSort,
  ]);

  /*
  |--------------------------------------------------------------------------
  | LOAD AND MANAGE THE SELECTED SUBJECT REQUIREMENT
  |--------------------------------------------------------------------------
  */

  const refreshSelectedRequirement = async () => {
    if (
      selectedTarget?.type !== "Subject" ||
      !selectedTarget?.classOfferingId
    ) {
      setSelectedRequirement(null);
      return null;
    }

    const requirements =
      await getSubjectRequirements(
        selectedTarget.classOfferingId
      );

    const requirement =
      requirements.find(
        (item) => item.is_active
      ) ||
      requirements[0] ||
      null;

    setSelectedRequirement(requirement);

    return requirement;
  };

  useEffect(() => {
    let cancelled = false;

    const loadRequirement = async () => {
      if (
        selectedTarget?.type !== "Subject" ||
        !selectedTarget?.classOfferingId
      ) {
        setSelectedRequirement(null);
        setLoadingRequirement(false);
        return;
      }

      try {
        setLoadingRequirement(true);

        const requirements =
          await getSubjectRequirements(
            selectedTarget.classOfferingId
          );

        if (cancelled) return;

        const requirement =
          requirements.find(
            (item) => item.is_active
          ) ||
          requirements[0] ||
          null;

        setSelectedRequirement(requirement);
      } catch (error) {
        console.error(
          "Unable to load subject requirement:",
          error
        );

        if (!cancelled) {
          setSelectedRequirement(null);

          await Swal.fire({
            icon: "error",
            title: "Unable to Load Requirement",
            text:
              error?.message ||
              "The subject requirement could not be loaded.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingRequirement(false);
        }
      }
    };

    loadRequirement();

    return () => {
      cancelled = true;
    };
  }, [
    selectedTarget?.type,
    selectedTarget?.classOfferingId,
  ]);

  const openRequirementModal = async () => {
    if (
      selectedTarget?.type !== "Subject"
    ) {
      return;
    }

    if (
      !selectedTarget.classOfferingId
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Class Offering Not Found",
        text:
          "This subject is not connected to an active class offering. Refresh the dashboard or check the teacher assignment.",
      });

      return;
    }

    if (selectedRequirement) {
      setRequirementForm({
        title:
          selectedRequirement.title || "",
        description:
          selectedRequirement.description || "",
        submissionType:
          selectedRequirement.submission_type ||
          "No Submission",
        isRequired:
          selectedRequirement.is_required !== false,
        deadline:
          toDateTimeLocalValue(
            selectedRequirement.deadline
          ),
        allowedFileTypes: (
          selectedRequirement.allowed_file_types ||
          []
        ).join(","),
        maxFileSizeMb:
          selectedRequirement.max_file_size_mb ||
          5,
      });
    } else {
      setRequirementForm(
        DEFAULT_REQUIREMENT_FORM
      );
    }

    setShowRequirementModal(true);
  };

  const closeRequirementModal = () => {
    if (savingRequirement) return;

    setShowRequirementModal(false);
  };

  const handleRequirementFormChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setRequirementForm(
      (current) => ({
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  const saveRequirement = async (
    event
  ) => {
    event.preventDefault();

    if (
      !selectedTarget?.classOfferingId
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Class Offering Required",
        text:
          "The selected subject does not have a valid class offering.",
      });

      return;
    }

    if (
      !requirementForm.title.trim()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Requirement Title Required",
        text:
          "Enter a clear title for the subject requirement.",
      });

      return;
    }

    try {
      setSavingRequirement(true);

      const payload = {
        classOfferingId:
          selectedTarget.classOfferingId,
        title:
          requirementForm.title.trim(),
        description:
          requirementForm.description.trim(),
        submissionType:
          requirementForm.submissionType,
        isRequired:
          Boolean(
            requirementForm.isRequired
          ),
        deadline:
          requirementForm.deadline ||
          null,
        allowedFileTypes:
          normalizeAllowedFileTypes(
            requirementForm.allowedFileTypes
          ),
        maxFileSizeMb:
          Number(
            requirementForm.maxFileSizeMb
          ) || 5,
      };

      if (selectedRequirement) {
        await updateSubjectRequirement(
          selectedRequirement.id,
          payload
        );
      } else {
        await createSubjectRequirement(
          payload
        );
      }

      await refreshSelectedRequirement();

      setShowRequirementModal(false);

      await Swal.fire({
        icon: "success",
        title: selectedRequirement
          ? "Requirement Updated"
          : "Requirement Created",
        text:
          "Students assigned to this class can now view this subject requirement.",
      });
    } catch (error) {
      console.error(
        "Save subject requirement error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Save Requirement",
        text:
          error?.message ||
          "The subject requirement could not be saved.",
      });
    } finally {
      setSavingRequirement(false);
    }
  };

  const toggleRequirementStatus =
    async () => {
      if (!selectedRequirement) {
        return;
      }

      const nextStatus =
        !selectedRequirement.is_active;

      const confirmation =
        await Swal.fire({
          icon: "question",
          title: nextStatus
            ? "Activate Requirement?"
            : "Deactivate Requirement?",
          text: nextStatus
            ? "Students will see this requirement again."
            : "The requirement will remain saved, but students will no longer be required to submit it.",
          showCancelButton: true,
          confirmButtonText: nextStatus
            ? "Activate"
            : "Deactivate",
          confirmButtonColor: nextStatus
            ? "#15803d"
            : "#d97706",
        });

      if (!confirmation.isConfirmed) {
        return;
      }

      try {
        setLoadingRequirement(true);

        if (
          !nextStatus &&
          selectedRequirement.is_open
        ) {
          await setSubjectRequirementOpenStatus(
            selectedRequirement.id,
            false
          );
        }

        await setSubjectRequirementStatus(
          selectedRequirement.id,
          nextStatus
        );

        await refreshSelectedRequirement();

        await Swal.fire({
          icon: "success",
          title: nextStatus
            ? "Requirement Activated"
            : "Requirement Deactivated",
          timer: 1600,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error(
          "Update requirement status error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Update Requirement",
          text:
            error?.message ||
            "The requirement status could not be updated.",
        });
      } finally {
        setLoadingRequirement(false);
      }
    };

  const toggleRequirementOpenStatus = async () => {
    if (!selectedRequirement) {
      return;
    }

    if (!selectedRequirement.is_active) {
      await Swal.fire({
        icon: "warning",
        title: "Requirement Is Inactive",
        text:
          "Activate the requirement before opening student submissions.",
      });

      return;
    }

    if (
      selectedRequirement.submission_type ===
      "No Submission"
    ) {
      await Swal.fire({
        icon: "info",
        title: "No Submission Needed",
        text:
          "This requirement is configured for faculty review only, so there is no student submission window to open.",
      });

      return;
    }

    const nextOpenStatus =
      !selectedRequirement.is_open;

    const confirmation = await Swal.fire({
      icon: nextOpenStatus ? "question" : "warning",
      title: nextOpenStatus
        ? "Open Student Submissions?"
        : "Close Student Submissions?",
      text: nextOpenStatus
        ? "Students in this exact class can submit or resubmit this subject requirement."
        : "Students can still view the requirement and their existing submissions, but new submissions and resubmissions will be blocked.",
      showCancelButton: true,
      confirmButtonText: nextOpenStatus
        ? "Open Submission"
        : "Close Submission",
      confirmButtonColor: nextOpenStatus
        ? "#15803d"
        : "#dc2626",
      cancelButtonText: "Cancel",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setLoadingRequirement(true);

      await setSubjectRequirementOpenStatus(
        selectedRequirement.id,
        nextOpenStatus
      );

      await refreshSelectedRequirement();

      await Swal.fire({
        icon: "success",
        title: nextOpenStatus
          ? "Submissions Opened"
          : "Submissions Closed",
        text: nextOpenStatus
          ? "Students can now submit this requirement."
          : "New student submissions are now closed.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "Update submission availability error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Update Submission Status",
        text:
          error?.message ||
          "The student submission status could not be updated.",
      });
    } finally {
      setLoadingRequirement(false);
    }
  };

  const removeRequirement = async () => {
    if (!selectedRequirement) {
      return;
    }

    const confirmation =
      await Swal.fire({
        icon: "warning",
        title: "Delete Requirement?",
        text:
          "This permanently removes the subject requirement. Existing student clearance steps will remain available for faculty review.",
        showCancelButton: true,
        confirmButtonText:
          "Delete Requirement",
        confirmButtonColor: "#dc2626",
        cancelButtonText: "Cancel",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setLoadingRequirement(true);

      await deleteSubjectRequirement(
        selectedRequirement.id
      );

      setSelectedRequirement(null);

      await Swal.fire({
        icon: "success",
        title: "Requirement Deleted",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "Delete subject requirement error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Delete Requirement",
        text:
          error?.message ||
          "The subject requirement could not be deleted.",
      });
    } finally {
      setLoadingRequirement(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN THE EXACT REQUIREMENT FROM AN APPROVER NOTIFICATION
  |--------------------------------------------------------------------------
  |
  | Finalized flow:
  | Notification → grouped Approver Dashboard → exact block →
  | exact Subject/Office → exact student submission.
  |
  | The function first uses explicit IDs stored in the notification.
  | Older notifications that do not contain IDs are matched through
  | the student and requirement names in their title/message.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const navigationState =
      location.state;

    const notification =
      navigationState?.notification;

    const focus =
      navigationState?.focus || {};

    if (
      navigationState?.source !==
        "notification" ||
      !notification ||
      loading ||
      assignedSteps.length === 0
    ) {
      return;
    }

    const notificationKey =
      notification.id ||
      notification.created_at ||
      JSON.stringify(
        notification
      );

    if (
      handledNotificationId ===
      notificationKey
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | OPEN STUDENT OVERVIEW FROM PENDING REQUESTS PAGE
    |--------------------------------------------------------------------------
    |
    | PendingRequests sends a synthetic notification whose id starts with
    | "pending-request-". Instead of opening only one clearance step, clicking
    | "Open on Dashboard" should immediately show the student's complete
    | approver-assigned clearance overview.
    |--------------------------------------------------------------------------
    */

    const isPendingRequestNavigation =
      String(notification?.id || "").startsWith(
        "pending-request-"
      );

    if (isPendingRequestNavigation) {
      const requestedStudentId =
        String(focus?.studentId || "").trim();

      const requestedStudentName =
        String(focus?.studentName || "")
          .trim()
          .toLowerCase();

      const studentSteps = assignedSteps.filter(
        (step) => {
          const stepStudentId =
            String(step.student?.id || "").trim();

          const stepStudentName =
            String(step.student?.full_name || "")
              .trim()
              .toLowerCase();

          if (
            requestedStudentId &&
            stepStudentId === requestedStudentId
          ) {
            return true;
          }

          return Boolean(
            !requestedStudentId &&
              requestedStudentName &&
              stepStudentName === requestedStudentName
          );
        }
      );

      const firstStudentStep =
        studentSteps[0] || null;

      setHandledNotificationId(
        notificationKey
      );

      navigate(
        location.pathname,
        {
          replace: true,
          state: null,
        }
      );

      if (!firstStudentStep) {
        Swal.fire({
          icon: "info",
          title: "Student Not Found",
          text:
            "No clearance assignment for this student is currently assigned to your account.",
          confirmButtonColor: "#2563eb",
        });

        return;
      }

      setSearchTerm("");

      setSelectedStudentOverview({
        student:
          firstStudentStep.student,
        courseCode:
          firstStudentStep.courseCode,
        courseName:
          firstStudentStep.courseName,
        yearLevel:
          firstStudentStep.yearLevel,
        blockCode:
          firstStudentStep.blockCode,
        subjectCount:
          studentSteps.filter(
            (step) =>
              step.targetType ===
              "Subject"
          ).length,
        pendingCount:
          studentSteps.filter(
            (step) =>
              step.status ===
              "Pending"
          ).length,
        approvedCount:
          studentSteps.filter(
            (step) =>
              step.status ===
              "Approved"
          ).length,
        rejectedCount:
          studentSteps.filter(
            (step) =>
              step.status ===
              "Rejected"
          ).length,
      });

      return;
    }

    const normalizeValue = (
      value
    ) =>
      String(value || "")
        .trim()
        .toLowerCase();

    const parseObject = (
      value
    ) => {
      if (
        value &&
        typeof value ===
          "object"
      ) {
        return value;
      }

      if (
        typeof value ===
        "string"
      ) {
        try {
          return JSON.parse(
            value
          );
        } catch {
          return {};
        }
      }

      return {};
    };

    const payload = {
      ...parseObject(
        notification.metadata
      ),
      ...parseObject(
        notification.data
      ),
      ...parseObject(
        notification.payload
      ),
      ...focus,
    };

    const entityType =
      normalizeValue(
        notification.entity_type ||
          payload.entity_type
      );

    const entityId =
      notification.entity_id ||
      payload.entity_id ||
      null;

    const stepIds = [
      focus.stepId,
      focus.clearanceStepId,
      payload.step_id,
      payload.clearance_step_id,
      entityType.includes(
        "step"
      )
        ? entityId
        : null,
    ]
      .filter(Boolean)
      .map(String);

    const requestIds = [
      focus.requestId,
      focus.clearanceRequestId,
      payload.request_id,
      payload.clearance_request_id,
      entityType.includes(
        "request"
      )
        ? entityId
        : null,
    ]
      .filter(Boolean)
      .map(String);

    const studentIds = [
      focus.studentId,
      payload.student_id,
      payload.user_id,
    ]
      .filter(Boolean)
      .map(String);

    const targetNames = [
      focus.targetName,
      payload.target_name,
      payload.office_name,
      payload.subject_name,
      payload.requirement_name,
    ]
      .filter(Boolean)
      .map(normalizeValue);

    const studentNames = [
      focus.studentName,
      payload.student_name,
      payload.full_name,
    ]
      .filter(Boolean)
      .map(normalizeValue);

    const searchableNotification =
      normalizeValue(
        [
          notification.title,
          notification.message,
          payload.title,
          payload.message,
        ]
          .filter(Boolean)
          .join(" ")
      );

    let matchedStep =
      assignedSteps.find(
        (step) =>
          stepIds.includes(
            String(step.id)
          )
      ) || null;

    if (!matchedStep) {
      matchedStep =
        assignedSteps.find(
          (step) =>
            requestIds.includes(
              String(
                step
                  .clearance_request_id
              )
            )
        ) || null;
    }

    if (!matchedStep) {
      const rankedSteps =
        assignedSteps
          .map((step) => {
            let score = 0;

            const studentId =
              String(
                step.student?.id ||
                  ""
              );

            const studentNumber =
              normalizeValue(
                step.student
                  ?.student_id
              );

            const fullName =
              normalizeValue(
                step.student
                  ?.full_name
              );

            const firstName =
              fullName
                .split(/\s+/)
                .filter(Boolean)[0] ||
              "";

            const targetName =
              normalizeValue(
                step.targetName
              );

            if (
              studentIds.includes(
                studentId
              ) ||
              studentIds
                .map(normalizeValue)
                .includes(
                  studentNumber
                )
            ) {
              score += 250;
            }

            if (
              studentNames.some(
                (name) =>
                  name &&
                  fullName.includes(
                    name
                  )
              )
            ) {
              score += 180;
            }

            if (
              fullName &&
              searchableNotification.includes(
                fullName
              )
            ) {
              score += 170;
            } else if (
              firstName &&
              searchableNotification.includes(
                firstName
              )
            ) {
              score += 65;
            }

            if (
              targetNames.some(
                (name) =>
                  name &&
                  targetName.includes(
                    name
                  )
              )
            ) {
              score += 160;
            }

            if (
              targetName &&
              searchableNotification.includes(
                targetName
              )
            ) {
              score += 150;
            }

            if (
              studentNumber &&
              searchableNotification.includes(
                studentNumber
              )
            ) {
              score += 120;
            }

            if (
              /submitted|resubmitted|pending|review/.test(
                searchableNotification
              ) &&
              step.status ===
                "Pending"
            ) {
              score += 25;
            }

            return {
              step,
              score,
            };
          })
          .sort(
            (first, second) =>
              second.score -
              first.score
          );

      if (
        rankedSteps[0]?.score >=
        60
      ) {
        matchedStep =
          rankedSteps[0].step;
      }
    }

    setHandledNotificationId(
      notificationKey
    );

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      }
    );

    if (!matchedStep) {
      Swal.fire({
        icon: "info",
        title:
          "Dashboard Opened",
        text:
          "The related requirement could not be identified automatically. Use the dashboard search to locate it.",
        timer: 2400,
        showConfirmButton:
          false,
      });

      return;
    }

    setSearchTerm("");
    setShowHiddenBlocks(
      true
    );

    setHiddenBlocks(
      (
        currentHidden
      ) => {
        if (
          !currentHidden.includes(
            matchedStep.blockKey
          )
        ) {
          return currentHidden;
        }

        const nextHidden =
          currentHidden.filter(
            (key) =>
              key !==
              matchedStep.blockKey
          );

        if (
          approver?.id
        ) {
          localStorage.setItem(
            `smartclear-hidden-blocks-${approver.id}`,
            JSON.stringify(
              nextHidden
            )
          );
        }

        return nextHidden;
      }
    );

    setWorkspaceMode(
      matchedStep.category ===
        "office"
        ? "office"
        : "class"
    );

    setSelectedBlockKey(
      matchedStep.blockKey
    );

    setSelectedTargetKey(
      matchedStep.targetKey
    );

    setFocusedStepId(
      matchedStep.id
    );

    window.setTimeout(
      () => {
        const row =
          document.getElementById(
            `approver-step-${matchedStep.id}`
          );

        row?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        if (
          matchedStep.submission
        ) {
          setSelectedSubmission(
            matchedStep
          );
        }
      },
      320
    );

    window.setTimeout(
      () => {
        setFocusedStepId(
          null
        );
      },
      6000
    );
  }, [
    location.pathname,
    location.state,
    navigate,
    loading,
    assignedSteps,
    handledNotificationId,
    approver?.id,
  ]);


  /*
  |--------------------------------------------------------------------------
  | APPROVE STEP
  |--------------------------------------------------------------------------
  */

  const approveStep = async (item) => {


    /*
    Office approvers may approve their exact assigned office step directly.
    A student upload is not required unless the office separately requires it.
    */


    let requirement = null;
    let approvalRemarks = null;

    if (
      item.targetType === "Subject" &&
      item.classOfferingId
    ) {
      try {
        const requirements =
          await getSubjectRequirements(
            item.classOfferingId
          );

        requirement =
          requirements.find(
            (entry) =>
              entry.is_active
          ) ||
          requirements[0] ||
          null;
      } catch (error) {
        console.error(
          "Unable to check subject requirement:",
          error
        );

        await Swal.fire({
          icon: "error",
          title: "Unable to Check Requirement",
          text:
            error?.message ||
            "The subject requirement could not be checked before approval.",
        });

        return;
      }
    }

    if (
      item.targetType === "Subject" &&
      (
        !requirement ||
        !requirement.is_active
      )
    ) {
      const warning =
        await Swal.fire({
          icon: "warning",
          title: requirement
            ? "No Active Requirement"
            : "No Requirement Set",
          html: `
            <div style="text-align:left;line-height:1.6">
              <p>
                No active requirement is set for
                <strong>${item.targetName}</strong>.
              </p>
              <p style="margin-top:8px">
                Continuing will clear
                <strong>${item.student?.full_name || "this student"}</strong>
                without a student submission.
              </p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText:
            "Approve Without Requirement",
          confirmButtonColor: "#d97706",
          cancelButtonText: "Cancel",
        });

      if (!warning.isConfirmed) {
        return;
      }
    }

    if (
      item.targetType === "Subject" &&
      requirementNeedsSubmission(
        requirement
      ) &&
      !item.submission
    ) {
      if (
        requirement.is_required
      ) {
        const override =
          await Swal.fire({
            icon: "warning",
            title:
              "No Student Submission Found",
            html: `
              <div style="text-align:left;line-height:1.6">
                <p>
                  <strong>${requirement.title}</strong>
                  is required, but
                  <strong>${item.student?.full_name || "this student"}</strong>
                  has not submitted it.
                </p>
                <p style="margin-top:8px">
                  Enter an override reason before approving.
                </p>
              </div>
            `,
            input: "textarea",
            inputLabel:
              "Override reason",
            inputPlaceholder:
              "Example: Submitted personally, previously completed, approved exemption, or no remaining deficiency.",
            showCancelButton: true,
            confirmButtonText:
              "Approve Anyway",
            confirmButtonColor:
              "#d97706",
            cancelButtonText: "Cancel",
            inputValidator: (
              value
            ) => {
              if (!value?.trim()) {
                return "An override reason is required.";
              }

              return null;
            },
          });

        if (!override.isConfirmed) {
          return;
        }

        approvalRemarks =
          `Approved without student submission. Override reason: ${override.value.trim()}`;
      } else {
        const optionalWarning =
          await Swal.fire({
            icon: "warning",
            title:
              "Optional Submission Not Provided",
            text:
              "The student has not submitted the optional requirement. You may still continue with the approval.",
            showCancelButton: true,
            confirmButtonText:
              "Continue Approval",
            confirmButtonColor:
              "#d97706",
            cancelButtonText: "Cancel",
          });

        if (
          !optionalWarning.isConfirmed
        ) {
          return;
        }
      }
    }

    if (!approvalRemarks) {
      const result =
        await Swal.fire({
          icon: "question",
          title:
            item.targetType ===
            "Subject"
              ? "Approve Subject Clearance?"
              : "Approve Requirement?",
          text: `${item.student?.full_name || "This student"} — ${item.targetName}`,
          input: "textarea",
          inputLabel:
            "Approval remarks (optional)",
          inputPlaceholder:
            item.targetType ===
            "Subject"
              ? "No outstanding obligation for this subject."
              : "Requirement verified and approved.",
          showCancelButton: true,
          confirmButtonText: "Approve",
          confirmButtonColor:
            "#15803d",
          cancelButtonText: "Cancel",
        });

      if (!result.isConfirmed) {
        return;
      }

      approvalRemarks =
        result.value?.trim() ||
        null;
    }

    try {
      setReviewingStepId(item.id);

      const {
        data,
        error,
      } = await supabase.rpc(
        "approve_clearance_step",
        {
          p_step_id: item.id,
          p_remarks:
            approvalRemarks,
        }
      );

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: data?.requestCompleted
          ? "Clearance Completed"
          : "Requirement Approved",
        text: data?.requestCompleted
          ? "All required clearance steps for this student are now approved."
          : "The requirement was approved successfully.",
      });

      await loadDashboard();
    } catch (error) {
      console.error(
        "Approve clearance error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Approve",
        text:
          error?.message ||
          "The requirement could not be approved.",
      });
    } finally {
      setReviewingStepId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REJECT STEP
  |--------------------------------------------------------------------------
  */

  const rejectStep = async (item) => {


    /*
    Office approvers may reject their exact assigned office step directly
    and must provide a rejection reason.
    */


    const result = await Swal.fire({
      icon: "warning",
      title:
        item.targetType ===
        "Subject"
          ? "Reject Subject Clearance?"
          : "Reject Requirement?",
      text: `${item.student?.full_name || "This student"} — ${item.targetName}`,
      input: "textarea",
      inputLabel:
        "Rejection reason",
      inputPlaceholder:
        item.targetType ===
        "Subject"
          ? "State the student's outstanding subject obligation."
          : "Explain what is incorrect or incomplete...",
      inputAttributes: {
        "aria-label":
          "Rejection reason",
      },
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",

      inputValidator: (value) => {
        if (!value?.trim()) {
          return "A rejection reason is required.";
        }

        return null;
      },
    });

    if (!result.isConfirmed) return;

    try {
      setReviewingStepId(item.id);

      const {
        error,
      } = await supabase.rpc(
        "reject_clearance_step",
        {
          p_step_id: item.id,
          p_remarks:
            result.value.trim(),
        }
      );

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title:
          "Requirement Rejected",
        text:
          "The student was notified and can correct the requirement.",
      });

      await loadDashboard();
    } catch (error) {
      console.error(
        "Reject clearance error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Reject",
        text:
          error?.message ||
          "The requirement could not be rejected.",
      });
    } finally {
      setReviewingStepId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VERIFY DIGITAL CLEARANCE PASS
  |--------------------------------------------------------------------------
  */

  const handleVerifyClearance = async (event) => {
    event.preventDefault();

    const normalizedReference = clearanceReference
      .trim()
      .toUpperCase();

    const normalizedCode = verificationCode
      .trim()
      .toUpperCase();

    if (!normalizedReference || !normalizedCode) {
      await Swal.fire({
        icon: "warning",
        title: "Verification Details Required",
        text:
          "Enter both the clearance reference and verification code.",
      });

      return;
    }

    try {
      setVerifyingClearance(true);
      setVerificationResult(null);

      const { data, error } = await supabase.rpc(
        "verify_clearance_for_enrollment",
        {
          p_clearance_reference:
            normalizedReference,
          p_verification_code:
            normalizedCode,
        }
      );

      if (error) throw error;

      if (!data?.success || !data?.valid) {
        throw new Error(
          "The Digital Clearance Pass could not be verified."
        );
      }

      setClearanceReference(
        data.clearanceReference ||
          normalizedReference
      );

      setVerificationResult(data);

      await Swal.fire({
        icon: "success",
        title: data.alreadyVerified
          ? "Clearance Already Verified"
          : "Verified for Enrollment",
        text: data.alreadyVerified
          ? "This Digital Clearance Pass was already verified previously."
          : "The student's completed clearance was verified successfully.",
      });
    } catch (error) {
      console.error(
        "Verify clearance error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Verification Failed",
        text:
          error?.message ||
          "The clearance reference or verification code is invalid.",
      });
    } finally {
      setVerifyingClearance(false);
    }
  };

  const resetVerification = () => {
    if (verifyingClearance) return;

    setClearanceReference("");
    setVerificationCode("");
    setVerificationResult(null);
  };


  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <ApproverLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading assigned classes...
            </p>
          </div>
        </div>
      </ApproverLayout>
    );
  }

  return (
    <ApproverLayout>
        <>
      {/* Header */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">
            Teaching & Clearance Workspace
          </h1>

          <p className="mt-2 text-slate-500">
            Welcome,{" "}
            <span className="font-semibold text-slate-700">
              {approver?.full_name ||
                "Approver"}
            </span>
            . Select a year level, course, block, and subject to review only your official assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      {/* Registrar Verification */}

      {isRegistrarVerifier && (
        <div className="mb-8 overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                  <FaShieldAlt />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">
                    Registrar Authorization
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Digital Clearance Verification
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm text-emerald-100">
                    Enter the student's clearance reference and
                    verification code. The system verifies that all
                    required subject and office steps are approved,
                    then marks the pass as Verified for Enrollment.
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
                Authorized Registrar Personnel
              </span>
            </div>
          </div>

          <div className="p-6">
            <form
              onSubmit={handleVerifyClearance}
              className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label
                  htmlFor="clearanceReference"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Clearance Reference
                </label>

                <div className="relative">
                  <FaShieldAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    id="clearanceReference"
                    type="text"
                    value={clearanceReference}
                    onChange={(event) => {
                      setClearanceReference(
                        event.target.value.toUpperCase()
                      );
                      setVerificationResult(null);
                    }}
                    placeholder="Example: CLR-2026-ABC1234567"
                    autoComplete="off"
                    disabled={verifyingClearance}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 uppercase outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="verificationCode"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Verification Code
                </label>

                <div className="relative">
                  <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(event) => {
                      setVerificationCode(
                        event.target.value.toUpperCase()
                      );
                      setVerificationResult(null);
                    }}
                    placeholder="Enter the 12-character code"
                    autoComplete="off"
                    disabled={verifyingClearance}
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 font-mono uppercase tracking-widest outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={verifyingClearance}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
                >
                  {verifyingClearance ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FaShieldAlt />
                      Verify Pass
                    </>
                  )}
                </button>

                {(clearanceReference ||
                  verificationCode ||
                  verificationResult) && (
                  <button
                    type="button"
                    onClick={resetVerification}
                    disabled={verifyingClearance}
                    className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {verificationResult && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl text-white">
                      <FaGraduationCap />
                    </div>

                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                        Valid Digital Clearance Pass
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-green-800">
                        Verified for Enrollment
                      </h3>

                      <p className="mt-2 text-sm text-green-700">
                        {verificationResult.alreadyVerified
                          ? "This pass had already been verified. Its verified record remains valid."
                          : "All required subject and office approvals were confirmed successfully."}
                      </p>
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white">
                    {verificationResult.verificationStatus ||
                      "Verified"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FaUserGraduate />
                      <p className="text-xs font-semibold uppercase">
                        Student
                      </p>
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      {verificationResult.studentName ||
                        "No Name"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {verificationResult.studentId ||
                        "No Student ID"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Official Class
                    </p>

                    <p className="mt-2 font-bold text-slate-800">
                      {verificationResult.courseCode ||
                        "N/A"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {verificationResult.yearLevel ||
                        "N/A"}
                      {verificationResult.blockCode
                        ? ` — Block ${verificationResult.blockCode}`
                        : ""}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Clearance Cycle
                    </p>

                    <p className="mt-2 font-bold text-slate-800">
                      {verificationResult.semester ||
                        "N/A"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {verificationResult.schoolYear ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Approved Steps
                    </p>

                    <p className="mt-2 text-2xl font-bold text-green-700">
                      {verificationResult.approvedSteps ?? 0}/
                      {verificationResult.totalSteps ?? 0}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Completed {formatDate(
                        verificationResult.completedAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-green-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Clearance Reference
                    </p>

                    <p className="mt-2 break-all font-mono text-lg font-bold text-emerald-800">
                      {verificationResult.clearanceReference}
                    </p>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Verification Record
                    </p>

                    <p className="mt-2 font-bold text-slate-800">
                      Verified by {verificationResult.verifiedBy ||
                        approver?.full_name ||
                        "Authorized Personnel"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(
                        verificationResult.verifiedAt
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organized overview */}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-5 text-white lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                Approver Workspace
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Clearance Review Center
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                Choose a class or office queue, select the exact clearance requirement, then review only the students that need your action.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          {[
            { label: "Students", value: workflowSummary.students, helper: "Assigned to you", tone: "text-slate-900" },
            { label: "For Review", value: workflowSummary.forReview, helper: "Ready for your action", tone: "text-blue-700" },
            { label: "Waiting", value: workflowSummary.waiting, helper: "No submission yet", tone: "text-amber-700" },
            { label: "Approved", value: workflowSummary.approved, helper: "Completed by you", tone: "text-emerald-700" },
            { label: "Rejected", value: workflowSummary.rejected, helper: "Needs correction", tone: "text-rose-700" },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4 lg:px-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className={`mt-1 text-3xl font-black ${item.tone}`}>
                    {item.value}
                  </p>
                </div>
                <span className="text-right text-xs font-semibold leading-5 text-slate-400">
                  {item.helper}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Organized approver workspace */}

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Compact workspace toolbar */}

        <div className="border-b border-slate-200 bg-white p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                Step 1 · Choose Workspace
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                Find the clearance queue you want to manage
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Teaching classes and office clearances stay separated so student records do not get mixed.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="inline-flex w-full shrink-0 rounded-xl bg-slate-100 p-1 xl:w-auto">
              {[
                {
                  key: "class",
                  label: "Teaching Classes",
                  icon: <FaBookOpen />,
                  count: classBlocks.length,
                  pending: classPendingCount,
                },
                {
                  key: "office",
                  label: "Office Clearance",
                  icon: <FaBuilding />,
                  count: officeBlocks.length,
                  pending: officePendingCount,
                },
              ].map((workspace) => {
                const isActive = workspaceMode === workspace.key;

                return (
                  <button
                    key={workspace.key}
                    type="button"
                    onClick={() => {
                      setWorkspaceMode(workspace.key);
                      setSelectedBlockKey(null);
                      setSelectedTargetKey(null);
                    }}
                    className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-3 text-base font-semibold transition xl:flex-none ${
                      isActive
                        ? "text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="approver-workspace-active"
                        className="absolute inset-0 rounded-lg bg-slate-900 shadow-sm"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}

                    <span className="relative z-10 text-sm">
                      {workspace.icon}
                    </span>

                    <span className="relative z-10 truncate">
                      {workspace.label}
                    </span>

                    <span
                      className={`relative z-10 rounded-full px-2 py-0.5 text-sm ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-600 shadow-sm"
                      }`}
                    >
                      {workspace.count}
                      {workspace.pending > 0
                        ? ` · ${workspace.pending}`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-0 flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={
                  workspaceMode === "office"
                    ? "Search office queue, student, course, or block"
                    : "Search class, subject, student, course, or block"
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />

              {searchTerm.trim() && studentSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Matching Students
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Click a student to view all subjects assigned to you.
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {studentSearchResults.map((result) => (
                      <button
                        key={result.student.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentOverview(result);
                          setSearchTerm(
                            result.student?.full_name ||
                              result.student?.student_id ||
                              ""
                          );
                        }}
                        className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {result.student?.full_name || "Unnamed Student"}
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {result.student?.student_id || "No Student ID"}
                            {result.courseCode ? ` • ${result.courseCode}` : ""}
                            {result.yearLevel ? ` • ${result.yearLevel}` : ""}
                            {result.blockCode ? ` • Block ${result.blockCode}` : ""}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-blue-700">
                            {result.subjectCount} subject
                            {result.subjectCount !== 1 ? "s" : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            View assigned clearance
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowHiddenBlocks((current) => !current)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              {showHiddenBlocks ? <FaEye /> : <FaEyeSlash />}
              <span>
                {showHiddenBlocks
                  ? "Hide archived"
                  : `Archived (${hiddenBlocks.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Class directory and review workspace */}

        <div className="grid min-h-[620px] xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Clean class directory */}

          <aside className="border-b border-slate-200 bg-slate-50/60 xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                    Step 2 · Select Group
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    {workspaceMode === "office"
                      ? "Office Queues"
                      : "My Classes"}
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {workspaceMode === "office"
                      ? "Select a student clearance queue"
                      : "Choose a year level, course, and block"}
                  </p>
                </div>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700">
                  {visibleBlocks.length}
                </span>
              </div>

              {workspaceMode === "class" &&
                classDirectoryGroups.length > 0 && (
                  <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p className="mb-2 text-sm font-bold text-slate-700">
                        Arrange classes by
                      </p>

                      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                        {[
                          {
                            key: "year",
                            label: "Year first",
                          },
                          {
                            key: "course",
                            label: "Course first",
                          },
                        ].map((option) => {
                          const isActive =
                            classDirectoryOrder ===
                            option.key;

                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => {
                                setClassDirectoryOrder(
                                  option.key
                                );
                                setSelectedBlockKey(null);
                                setSelectedTargetKey(null);
                              }}
                              className={`relative overflow-hidden rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                                isActive
                                  ? "text-white"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {isActive && (
                                <motion.span
                                  layoutId="approver-class-directory-order"
                                  className="absolute inset-0 rounded-lg bg-blue-700 shadow-sm"
                                  transition={{
                                    type: "spring",
                                    stiffness: 420,
                                    damping: 34,
                                  }}
                                />
                              )}

                              <span className="relative z-10">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={classDirectoryOrder}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-3"
                      >
                        {classDirectoryOrder === "year" ? (
                          <>
                            <div>
                              <label
                                htmlFor="approverDirectoryYear"
                                className="mb-1.5 block text-sm font-bold text-slate-700"
                              >
                                Year level
                              </label>

                              <select
                                id="approverDirectoryYear"
                                value={selectedDirectoryYear}
                                onChange={(event) => {
                                  setSelectedDirectoryYear(
                                    event.target.value
                                  );
                                  setSelectedBlockKey(null);
                                  setSelectedTargetKey(null);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                              >
                                {classYearOptions.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="approverDirectoryCourse"
                                className="mb-1.5 block text-sm font-bold text-slate-700"
                              >
                                Course
                              </label>

                              <select
                                id="approverDirectoryCourse"
                                value={selectedDirectoryCourse}
                                onChange={(event) => {
                                  setSelectedDirectoryCourse(
                                    event.target.value
                                  );
                                  setSelectedBlockKey(null);
                                  setSelectedTargetKey(null);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                              >
                                {coursesForSelectedYear.map((course) => (
                                  <option key={course.code} value={course.code}>
                                    {course.code}
                                    {course.name ? ` — ${course.name}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label
                                htmlFor="approverDirectoryCourseFirst"
                                className="mb-1.5 block text-sm font-bold text-slate-700"
                              >
                                Course
                              </label>

                              <select
                                id="approverDirectoryCourseFirst"
                                value={selectedDirectoryCourse}
                                onChange={(event) => {
                                  setSelectedDirectoryCourse(
                                    event.target.value
                                  );
                                  setSelectedBlockKey(null);
                                  setSelectedTargetKey(null);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                              >
                                {classCourseOptions.map((course) => (
                                  <option key={course.code} value={course.code}>
                                    {course.code}
                                    {course.name ? ` — ${course.name}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="approverDirectoryYearSecond"
                                className="mb-1.5 block text-sm font-bold text-slate-700"
                              >
                                Year level
                              </label>

                              <select
                                id="approverDirectoryYearSecond"
                                value={selectedDirectoryYear}
                                onChange={(event) => {
                                  setSelectedDirectoryYear(
                                    event.target.value
                                  );
                                  setSelectedBlockKey(null);
                                  setSelectedTargetKey(null);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                              >
                                {yearsForSelectedCourse.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
            </div>

            <div className="max-h-[660px] overflow-y-auto p-4">
              {displayedDirectoryGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center">
                  <FaUsers className="mx-auto text-3xl text-slate-300" />

                  <p className="mt-3 text-base font-semibold text-slate-700">
                    {workspaceMode === "office"
                      ? "No office queue assigned"
                      : "No class found"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Check the selected year, course, search, archived items, or administrator assignments.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={`${workspaceMode}-${selectedDirectoryYear}-${selectedDirectoryCourse}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {displayedDirectoryGroups.map((group) => (
                      <div key={group.key}>
                        <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-slate-900">
                                {group.courseCode}
                              </p>

                              {group.courseName && (
                                <p className="mt-1 truncate text-sm text-slate-500">
                                  {group.courseName}
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                              {group.yearLevel}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {group.blocks.map((block) => {
                            const isSelected =
                              selectedBlockKey ===
                              block.key;

                            const isPinned =
                              pinnedBlocks.includes(
                                block.key
                              );

                            const isHidden =
                              hiddenBlocks.includes(
                                block.key
                              );

                            const blockItems =
                              block.targets.flatMap(
                                (target) =>
                                  target.items
                              );

                            const studentCount =
                              new Set(
                                blockItems
                                  .map(
                                    (item) =>
                                      item.student?.id
                                  )
                                  .filter(Boolean)
                              ).size;

                            const pendingCount =
                              blockItems.filter(
                                (item) =>
                                  item.status ===
                                  "Pending"
                              ).length;

                            return (
                              <motion.div
                                key={block.key}
                                layout
                                whileHover={{ x: 3 }}
                                transition={{ duration: 0.18 }}
                                className="group relative"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedBlockKey(
                                      block.key
                                    )
                                  }
                                  className={`relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
                                    isSelected
                                      ? "border-blue-300 bg-white shadow-md shadow-blue-100/60"
                                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.span
                                      layoutId="selected-approver-block"
                                      className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-blue-600"
                                      transition={{
                                        type: "spring",
                                        stiffness: 450,
                                        damping: 36,
                                      }}
                                    />
                                  )}

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 pl-1">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-base font-bold text-slate-900">
                                          {formatBlockLabel(
                                            block.blockCode
                                          )}
                                        </p>

                                        {isPinned && (
                                          <FaThumbtack className="shrink-0 text-xs text-blue-600" />
                                        )}
                                      </div>

                                      <p className="mt-1.5 truncate text-sm text-slate-500">
                                        {block.semester} · {block.schoolYear}
                                      </p>

                                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                        <span className="font-semibold text-slate-700">
                                          {studentCount} student{studentCount === 1 ? "" : "s"}
                                        </span>

                                        {pendingCount > 0 ? (
                                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                            {pendingCount} pending
                                          </span>
                                        ) : (
                                          <span className="font-semibold text-emerald-700">
                                            No pending review
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                                      {block.targets.length}
                                    </span>
                                  </div>
                                </button>

                                <div className="absolute right-3 top-3 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      togglePinnedBlock(
                                        block.key
                                      );
                                    }}
                                    title={
                                      isPinned
                                        ? "Unpin class"
                                        : "Pin class"
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm transition hover:text-blue-700"
                                  >
                                    <FaThumbtack />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleHiddenBlock(
                                        block.key
                                      );
                                    }}
                                    title={
                                      isHidden
                                        ? "Restore class"
                                        : "Archive class"
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm transition hover:text-slate-900"
                                  >
                                    {isHidden ? (
                                      <FaEye />
                                    ) : (
                                      <FaEyeSlash />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </aside>

          {/* Selected class workspace */}

          <main className="min-w-0 bg-white">
            {!selectedBlock ? (
              <div className="flex min-h-[620px] items-center justify-center p-8 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-sm"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                    <FaClipboardList />
                  </div>

                  <h2 className="mt-4 text-xl font-bold text-slate-800">
                    Select a {workspaceMode === "office" ? "queue" : "class"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose an item from the directory to view its requirement and student review queue.
                  </p>
                </motion.div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedBlock.key}-${selectedTargetKey || "none"}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Class identity and subject selector */}

                  <div className="border-b border-slate-200 px-5 py-5 lg:px-6">
                    <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-blue-700">
                          <span>
                            {selectedBlock.category === "office"
                              ? "Office Clearance"
                              : selectedBlock.courseCode}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span>{selectedBlock.yearLevel}</span>
                        </div>

                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
                          {formatBlockLabel(selectedBlock.blockCode)}
                        </h2>

                        <p className="mt-1.5 text-sm text-slate-500">
                          {selectedBlock.semester} · {selectedBlock.schoolYear}
                        </p>
                      </div>

                      <div className="w-full 2xl:max-w-xl">
                        <label
                          htmlFor="approverTargetSelect"
                          className="mb-2 block text-sm font-bold uppercase tracking-[0.1em] text-slate-500"
                        >
                          {selectedBlock.category === "office"
                            ? "Office queue"
                            : "Subject to review"}
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <select
                            id="approverTargetSelect"
                            value={selectedTargetKey || ""}
                            onChange={(event) =>
                              setSelectedTargetKey(event.target.value)
                            }
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                          >
                            {selectedBlock.targets.map((target) => (
                              <option key={target.key} value={target.key}>
                                {target.code ? `${target.code} — ` : ""}
                                {target.name}
                              </option>
                            ))}
                          </select>

                          <div className="flex shrink-0 items-center gap-2 text-sm">
                            <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-600">
                              {selectedTarget?.items.length || 0} students
                            </span>

                            <span className="rounded-lg bg-amber-50 px-3 py-2 font-bold text-amber-700">
                              {selectedTarget?.items.filter(
                                (item) => item.status === "Pending"
                              ).length || 0} pending
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compact subject requirement */}

                  {selectedTarget?.type === "Subject" && (
                    <div className="border-b border-slate-200 bg-slate-50/70 p-4 lg:p-5">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <FaCog />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">
                                Subject requirement
                              </p>

                              {loadingRequirement ? (
                                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                                  <FaSyncAlt className="animate-spin" />
                                  Loading requirement...
                                </div>
                              ) : !selectedTarget.classOfferingId ? (
                                <>
                                  <p className="mt-1 font-bold text-red-700">
                                    Class offering not found
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Check the official teacher assignment for this subject.
                                  </p>
                                </>
                              ) : selectedRequirement ? (
                                <>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-bold text-slate-900">
                                      {selectedRequirement.title}
                                    </h3>

                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                        selectedRequirement.is_active
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {selectedRequirement.is_active
                                        ? "Active"
                                        : "Inactive"}
                                    </span>

                                    {selectedRequirement.submission_type !==
                                      "No Submission" && (
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                          selectedRequirement.is_active &&
                                          selectedRequirement.is_open
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-rose-50 text-rose-700"
                                        }`}
                                      >
                                        {selectedRequirement.is_active &&
                                        selectedRequirement.is_open
                                          ? "Submission open"
                                          : "Submission closed"}
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1.5 line-clamp-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-500">
                                    {selectedRequirement.description ||
                                      "No additional instructions provided."}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                      {selectedRequirement.submission_type}
                                    </span>

                                    <span
                                      className={`rounded-full px-2.5 py-1 ${
                                        selectedRequirement.is_required
                                          ? "bg-rose-50 text-rose-700"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {selectedRequirement.is_required
                                        ? "Required"
                                        : "Optional"}
                                    </span>

                                    {selectedRequirement.deadline && (
                                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                        Due {formatDate(selectedRequirement.deadline)}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="mt-1 font-bold text-amber-700">
                                    No requirement has been set
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Approval remains available, but the teacher will receive a confirmation warning.
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={openRequirementModal}
                              disabled={
                                loadingRequirement ||
                                !selectedTarget.classOfferingId
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {selectedRequirement ? <FaEdit /> : <FaPlus />}
                              {selectedRequirement ? "Edit" : "Add requirement"}
                            </button>

                            {selectedRequirement && (
                              <>
                                {selectedRequirement.submission_type !==
                                  "No Submission" && (
                                  <button
                                    type="button"
                                    onClick={toggleRequirementOpenStatus}
                                    disabled={
                                      loadingRequirement ||
                                      !selectedRequirement.is_active
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {selectedRequirement.is_open
                                      ? "Close submissions"
                                      : "Open submissions"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={toggleRequirementStatus}
                                  disabled={loadingRequirement}
                                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {selectedRequirement.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={removeRequirement}
                                  disabled={loadingRequirement}
                                  title="Delete requirement"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student review queue */}

                  <div className="px-5 py-4 lg:px-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                          Step 4 · Review Students
                        </div>
                        <h3 className="text-lg font-black text-slate-900">
                          Student Review Queue
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Review submissions and record the official decision.
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {filteredSelectedItems.length}/{selectedTargetSummary.total} record(s)
                      </span>
                    </div>

                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">Filter and sort this clearance</p>
                          <p className="mt-0.5 text-xs text-slate-500">Show only the students you need to work on right now.</p>
                        </div>
                        {(reviewStatusFilter !== "All" || reviewSubmissionFilter !== "All" || reviewSort !== "priority") && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewStatusFilter("All");
                              setReviewSubmissionFilter("All");
                              setReviewSort("priority");
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_1fr]">
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                            Clearance Status
                          </label>
                          <select
                            value={reviewStatusFilter}
                            onChange={(event) =>
                              setReviewStatusFilter(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="All">All Statuses ({selectedTargetSummary.total})</option>
                            <option value="Pending">Pending ({selectedTargetSummary.pending})</option>
                            <option value="Approved">Approved ({selectedTargetSummary.approved})</option>
                            <option value="Rejected">Rejected ({selectedTargetSummary.rejected})</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                            Review State
                          </label>
                          <select
                            value={reviewSubmissionFilter}
                            onChange={(event) =>
                              setReviewSubmissionFilter(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="All">All Records</option>
                            <option value="For Review">For Review ({selectedTargetSummary.forReview})</option>
                            <option value="No Submission">No Submission ({selectedTargetSummary.noSubmission})</option>
                            <option value="Submitted">Has Submission</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                            Sort By
                          </label>
                          <select
                            value={reviewSort}
                            onChange={(event) =>
                              setReviewSort(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="priority">Priority — For Review First</option>
                            <option value="newest">Newest Activity</option>
                            <option value="oldest">Oldest Activity</option>
                            <option value="name-asc">Student Name A–Z</option>
                            <option value="name-desc">Student Name Z–A</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          ["For Review", selectedTargetSummary.forReview, "bg-blue-100 text-blue-700"],
                          ["Pending", selectedTargetSummary.pending, "bg-amber-100 text-amber-700"],
                          ["Approved", selectedTargetSummary.approved, "bg-emerald-100 text-emerald-700"],
                          ["Rejected", selectedTargetSummary.rejected, "bg-rose-100 text-rose-700"],
                        ].map(([label, count, tone]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (label === "For Review") {
                                setReviewStatusFilter("All");
                                setReviewSubmissionFilter("For Review");
                              } else {
                                setReviewSubmissionFilter("All");
                                setReviewStatusFilter(label);
                              }
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition hover:opacity-80 ${tone}`}
                          >
                            {label}: {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 md:hidden">
                      {!selectedTarget || filteredSelectedItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <FaUsers className="mx-auto text-3xl text-slate-300" />
                          <p className="mt-3 text-base font-bold text-slate-700">
                            No student records found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            No students match the selected clearance filters.
                          </p>
                        </div>
                      ) : (
                        filteredSelectedItems.map((item, index) => {
                          const isReviewing = reviewingStepId === item.id;
                          const canReview = item.status === "Pending";

                          return (
                            <motion.article
                              layout
                              id={`approver-step-${item.id}`}
                              key={item.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.025 }}
                              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                                focusedStepId === item.id
                                  ? "border-cyan-400 ring-2 ring-cyan-100"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="truncate text-base font-black text-slate-900">
                                    {item.student?.full_name || "No Name"}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Student ID: {item.student?.student_id || "N/A"}
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${statusClass(
                                    item.status
                                  )}`}
                                >
                                  {item.status}
                                </span>
                              </div>

                              {item.remarks && (
                                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                                  {item.remarks}
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedSubmission(item)}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                              >
                                {item.submission ? <FaFileAlt /> : <FaEye />}
                                {item.submission
                                  ? "Open Submission"
                                  : item.targetType === "Subject"
                                  ? "Open Faculty Review"
                                  : "Open Office Review"}
                              </button>

                              {item.status === "Pending" ? (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    disabled={!canReview || isReviewing}
                                    onClick={() => approveStep(item)}
                                    className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-40"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canReview || isReviewing}
                                    onClick={() => rejectStep(item)}
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-sm font-semibold text-slate-500">
                                  Reviewed {formatDate(item.reviewed_at)}
                                </p>
                              )}
                            </motion.article>
                          );
                        })
                      )}
                    </div>

                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                              <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-slate-500">
                                Student
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-slate-500">
                                Submission
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-slate-500">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-slate-500">
                                Last activity
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wide text-slate-500">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100 bg-white">
                            {!selectedTarget || filteredSelectedItems.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="px-4 py-16 text-center">
                                  <FaUsers className="mx-auto text-3xl text-slate-300" />
                                  <p className="mt-3 text-sm font-semibold text-slate-600">
                                    No student records found
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    No students match the selected clearance filters.
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              filteredSelectedItems.map((item) => {
                                const isReviewing = reviewingStepId === item.id;
                                const canReview = item.status === "Pending";

                                return (
                                  <motion.tr
                                    layout
                                    id={`approver-step-${item.id}`}
                                    key={item.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`transition ${
                                      focusedStepId === item.id
                                        ? "bg-cyan-50 ring-2 ring-inset ring-cyan-400"
                                        : "hover:bg-slate-50/70"
                                    }`}
                                  >
                                    <td className="px-4 py-4">
                                      <p className="font-bold text-slate-900">
                                        {item.student?.full_name || "No Name"}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        {item.student?.student_id || "No Student ID"}
                                      </p>
                                    </td>

                                    <td className="px-4 py-4">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSubmission(item)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                                      >
                                        {item.submission ? <FaFileAlt /> : <FaEye />}
                                        {item.submission
                                          ? "Open submission"
                                          : item.targetType === "Subject"
                                          ? "Faculty review"
                                          : "Office review"}
                                      </button>

                                      <p className="mt-1.5 max-w-[220px] text-sm leading-4 text-slate-400">
                                        {item.submission
                                          ? "Student requirement received."
                                          : item.targetType === "Subject"
                                          ? selectedRequirement?.is_active &&
                                            requirementNeedsSubmission(selectedRequirement)
                                            ? "Awaiting student submission."
                                            : "Direct faculty verification."
                                          : "Direct office verification."}
                                      </p>
                                    </td>

                                    <td className="px-4 py-4 align-top">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${statusClass(
                                          item.status
                                        )}`}
                                      >
                                        {item.status}
                                      </span>


                                      {item.remarks && (
                                        <p className="mt-1.5 max-w-[220px] line-clamp-2 text-sm leading-4 text-slate-500">
                                          {item.remarks}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-4 py-4 text-sm leading-6 text-slate-500">
                                      {item.targetType === "Subject" && !item.submission
                                        ? selectedRequirement?.is_active &&
                                          requirementNeedsSubmission(selectedRequirement)
                                          ? "Not submitted"
                                          : "Submission not required"
                                        : item.submission?.submitted_at
                                        ? formatDate(item.submission.submitted_at)
                                        : "Direct office review"}
                                    </td>

                                    <td className="px-4 py-4 text-right">
                                      {item.status === "Pending" ? (
                                        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                          <button
                                            type="button"
                                            disabled={!canReview || isReviewing}
                                            onClick={() => approveStep(item)}
                                            className="px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            Approve
                                          </button>

                                          <button
                                            type="button"
                                            disabled={!canReview || isReviewing}
                                            onClick={() => rejectStep(item)}
                                            className="border-l border-slate-200 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <p className="text-sm font-semibold text-slate-500">
                                          {formatDate(item.reviewed_at)}
                                        </p>
                                      )}
                                    </td>
                                  </motion.tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </motion.section>
        </>
      {/* Manage Subject Requirement Modal */}

      {showRequirementModal &&
        selectedTarget?.type === "Subject" && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                    Teacher Requirement
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-slate-800">
                    {selectedRequirement
                      ? "Edit Subject Requirement"
                      : "Add Subject Requirement"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {selectedTarget.code
                      ? `${selectedTarget.code} — `
                      : ""}
                    {selectedTarget.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeRequirementModal}
                  disabled={savingRequirement}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={saveRequirement}
                className="space-y-5 p-6"
              >
                <div>
                  <label
                    htmlFor="requirementTitle"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Requirement Title
                  </label>

                  <input
                    id="requirementTitle"
                    name="title"
                    type="text"
                    value={requirementForm.title}
                    onChange={handleRequirementFormChange}
                    placeholder="Example: Submit final project documentation"
                    disabled={savingRequirement}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="requirementDescription"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Instructions
                  </label>

                  <textarea
                    id="requirementDescription"
                    name="description"
                    value={requirementForm.description}
                    onChange={handleRequirementFormChange}
                    placeholder="Explain what the student must complete or submit."
                    rows="5"
                    disabled={savingRequirement}
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="submissionType"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Submission Type
                    </label>

                    <select
                      id="submissionType"
                      name="submissionType"
                      value={requirementForm.submissionType}
                      onChange={handleRequirementFormChange}
                      disabled={savingRequirement}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="No Submission">
                        No Submission — faculty checks directly
                      </option>

                      <option value="Text">
                        Text Message
                      </option>

                      <option value="File">
                        File Upload
                      </option>

                      <option value="File or Text">
                        File or Text
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="requirementDeadline"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Deadline
                    </label>

                    <input
                      id="requirementDeadline"
                      name="deadline"
                      type="datetime-local"
                      value={requirementForm.deadline}
                      onChange={handleRequirementFormChange}
                      disabled={savingRequirement}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {(requirementForm.submissionType === "File" ||
                  requirementForm.submissionType ===
                    "File or Text") && (
                  <div className="grid gap-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:grid-cols-[1fr_180px]">
                    <div>
                      <label
                        htmlFor="allowedFileTypes"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Allowed File Types
                      </label>

                      <input
                        id="allowedFileTypes"
                        name="allowedFileTypes"
                        type="text"
                        value={requirementForm.allowedFileTypes}
                        onChange={handleRequirementFormChange}
                        placeholder="pdf,jpg,jpeg,png,doc,docx"
                        disabled={savingRequirement}
                        className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />

                      <p className="mt-2 text-sm text-slate-500">
                        Separate each extension with a comma.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="maxFileSizeMb"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Maximum Size
                      </label>

                      <div className="relative">
                        <input
                          id="maxFileSizeMb"
                          name="maxFileSizeMb"
                          type="number"
                          min="1"
                          step="1"
                          value={requirementForm.maxFileSizeMb}
                          onChange={handleRequirementFormChange}
                          disabled={savingRequirement}
                          className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          MB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <input
                    name="isRequired"
                    type="checkbox"
                    checked={requirementForm.isRequired}
                    onChange={handleRequirementFormChange}
                    disabled={savingRequirement}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  />

                  <span>
                    <span className="block font-semibold text-slate-800">
                      Required requirement
                    </span>

                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      When enabled, approving without a student
                      submission requires the teacher to enter an
                      override reason.
                    </span>
                  </span>
                </label>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="mt-1 shrink-0 text-amber-600" />

                    <p className="text-sm leading-6 text-amber-800">
                      A teacher may still approve a student when no
                      requirement exists or no submission was provided.
                      The dashboard will show a warning first. A required
                      missing submission also needs an override reason,
                      which is saved in the approval remarks.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeRequirementModal}
                    disabled={savingRequirement}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingRequirement}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingRequirement ? (
                      <>
                        <FaSyncAlt className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {selectedRequirement
                          ? "Save Changes"
                          : "Create Requirement"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Submission Modal */}

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Student Requirement
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-800">
                  {
                    selectedSubmission.targetName
                  }
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {
                    selectedSubmission
                      .student?.full_name
                  }{" "}
                  •{" "}
                  {selectedSubmission
                    .student?.student_id ||
                    "No Student ID"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSubmission(null)
                }
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              {selectedSubmission.targetType === "Subject" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Teacher Requirement
                  </p>

                  {selectedRequirement?.is_active ? (
                    <>
                      <h3 className="mt-2 text-lg font-bold text-slate-800">
                        {selectedRequirement.title}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {selectedRequirement.description ||
                          "No additional instructions provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                          {selectedRequirement.submission_type}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            selectedRequirement.is_required
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {selectedRequirement.is_required
                            ? "Required"
                            : "Optional"}
                        </span>

                        {selectedRequirement.deadline && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            Deadline:{" "}
                            {formatDate(
                              selectedRequirement.deadline
                            )}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2 font-bold text-amber-700">
                        No active subject requirement
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        The teacher can still approve this student, but
                        a warning will appear before approval.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div
                className={`rounded-2xl border p-5 ${
                  selectedSubmission.submission
                    ? "border-emerald-200 bg-emerald-50"
                    : selectedSubmission.targetType ===
                      "Subject"
                    ? "border-violet-200 bg-violet-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      selectedSubmission.submission
                        ? "bg-emerald-100 text-emerald-700"
                        : selectedSubmission.targetType ===
                          "Subject"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedSubmission.submission ? (
                      <FaCheckCircle />
                    ) : selectedSubmission.targetType ===
                      "Subject" ? (
                      <FaBookOpen />
                    ) : (
                      <FaTimesCircle />
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">
                      {selectedSubmission.submission
                        ? "Student Submission Provided"
                        : selectedSubmission.targetType ===
                          "Subject"
                        ? selectedRequirement?.is_active &&
                          requirementNeedsSubmission(
                            selectedRequirement
                          )
                          ? "Student Submission Missing"
                          : selectedRequirement?.is_active
                          ? "Faculty Review — No Submission Required"
                          : "No Requirement Set"

                        : "Direct Office Verification"}

                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {selectedSubmission.submission
                        ? "The student provided a message, an attachment, or both for this requirement."
                        : selectedSubmission.targetType ===
                          "Subject"
                        ? selectedRequirement?.is_active &&
                          requirementNeedsSubmission(
                            selectedRequirement
                          )
                          ? selectedRequirement.is_required
                            ? "The required student submission has not been provided. Approval is still possible, but an override reason will be required."
                            : "The optional student submission has not been provided. The teacher may still continue with approval after a warning."
                          : selectedRequirement?.is_active
                          ? "This requirement is verified directly by the assigned teacher and does not need a student upload."
                          : "No active requirement is set. The teacher may still approve after confirming the warning."

                        : "No student upload is required for direct office verification. You may approve or reject this exact office clearance step."}

                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-700">
                  Submission Message
                </p>

                <p className="mt-3 whitespace-pre-wrap leading-6 text-slate-600">
                  {selectedSubmission.submission
                    ?.submission_text ||
                    (selectedSubmission.targetType ===
                    "Subject"
                      ? selectedRequirement?.is_active &&
                        requirementNeedsSubmission(
                          selectedRequirement
                        )
                        ? "The student has not provided a written submission for this subject requirement."
                        : "No student message is required. Review the student's subject obligations directly."

                      : "No student message was submitted. The assigned office approver may still verify this clearance directly.")}

                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-bold text-slate-700">
                  Attachment
                </p>

                {selectedSubmission.submission
                  ?.signed_url ? (
                  <a
                    href={
                      selectedSubmission
                        .submission
                        .signed_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
                  >
                    <FaFileAlt />

                    Open{" "}
                    {selectedSubmission
                      .submission
                      .attachment_name ||
                      "Attachment"}
                  </a>
                ) : (
                  <p className="mt-3 text-slate-500">
                    {selectedSubmission.targetType ===
                    "Subject"
                      ? selectedRequirement?.is_active &&
                        (
                          selectedRequirement.submission_type ===
                            "File" ||
                          selectedRequirement.submission_type ===
                            "File or Text"
                        )
                        ? "The student has not uploaded an attachment for this subject requirement."
                        : "No attachment is required for this subject clearance."

                      : "No attachment was uploaded. Direct office verification is still allowed."}

                  </p>
                )}
              </div>

              <div className="grid gap-4 rounded-2xl border border-slate-200 p-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Requirement Type
                  </p>

                  <p className="mt-1 font-bold text-slate-700">
                    {
                      selectedSubmission.targetType
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Version
                  </p>

                  <p className="mt-1 font-bold text-slate-700">
                    {selectedSubmission.submission
                      ? `Version ${
                          selectedSubmission
                            .submission
                            .version || 1
                        }`
                      : "Direct review"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Submitted
                  </p>

                  <p className="mt-1 font-bold text-slate-700">
                    {selectedSubmission.submission
                      ?.submitted_at
                      ? formatDate(
                          selectedSubmission
                            .submission
                            .submitted_at
                        )
                      : selectedSubmission.targetType ===
                        "Subject"
                      ? selectedRequirement?.is_active &&
                        requirementNeedsSubmission(
                          selectedRequirement
                        )
                        ? "Not submitted"
                        : "Not required"
                      : "Not submitted"}
                  </p>
                </div>
              </div>

              {selectedSubmission.status === "Pending" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        const item =
                          selectedSubmission;

                        setSelectedSubmission(
                          null
                        );

                        approveStep(item);
                      }}
                      className="flex-1 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                    >
                      {selectedSubmission.targetType ===
                      "Subject"
                        ? "Approve Subject Clearance"
                        : "Approve Office Clearance"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const item =
                          selectedSubmission;

                        setSelectedSubmission(
                          null
                        );

                        rejectStep(item);
                      }}
                      className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
                    >
                      {selectedSubmission.targetType ===
                      "Subject"
                        ? "Reject Subject Clearance"
                        : "Reject Office Clearance"}
                    </button>
                  </div>
              )}

            </div>
          </div>
        </div>
      )}

      {selectedStudentOverview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-violet-50 p-6">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                  <FaUserGraduate />
                  Student Clearance Overview
                </div>

                <h2 className="truncate text-2xl font-black text-slate-900">
                  {selectedStudentOverview.student?.full_name || "Student"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudentOverview.student?.student_id || "No Student ID"}
                  {selectedStudentOverview.courseCode
                    ? ` • ${selectedStudentOverview.courseCode}`
                    : ""}
                  {selectedStudentOverview.yearLevel
                    ? ` • ${selectedStudentOverview.yearLevel}`
                    : ""}
                  {selectedStudentOverview.blockCode
                    ? ` • Block ${selectedStudentOverview.blockCode}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentOverview(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close student overview"
              >
                <FaTimesCircle />
              </button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-6 grid gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Assigned Subjects",
                    value: selectedStudentItems.filter(
                      (item) => item.targetType === "Subject"
                    ).length,
                    tone: "bg-violet-50 text-violet-700",
                  },
                  {
                    label: "Pending",
                    value: selectedStudentItems.filter(
                      (item) => item.status === "Pending"
                    ).length,
                    tone: "bg-amber-50 text-amber-700",
                  },
                  {
                    label: "Approved",
                    value: selectedStudentItems.filter(
                      (item) => item.status === "Approved"
                    ).length,
                    tone: "bg-emerald-50 text-emerald-700",
                  },
                  {
                    label: "Rejected",
                    value: selectedStudentItems.filter(
                      (item) => item.status === "Rejected"
                    ).length,
                    tone: "bg-red-50 text-red-700",
                  },
                ].map((summary) => (
                  <div
                    key={summary.label}
                    className={`rounded-2xl border border-slate-100 p-4 ${summary.tone}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                      {summary.label}
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {summary.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Subjects Assigned to You
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Only clearance subjects handled by the logged-in teacher are shown here.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedStudentItems.filter(
                  (item) => item.targetType === "Subject"
                ).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <FaBookOpen className="mx-auto text-2xl text-slate-300" />
                    <p className="mt-3 font-bold text-slate-700">
                      No assigned subject clearance found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      This student has no subject clearance step assigned to this teacher.
                    </p>
                  </div>
                ) : (
                  selectedStudentItems
                    .filter((item) => item.targetType === "Subject")
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentOverview(null);
                          setWorkspaceMode("class");
                          setSelectedBlockKey(item.blockKey);
                          setSelectedTargetKey(item.targetKey);
                          setSearchTerm(
                            item.student?.full_name ||
                              item.student?.student_id ||
                              ""
                          );
                          setFocusedStepId(item.id);
                        }}
                        className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">
                              {item.targetCode || "SUBJECT"}
                            </span>
                            <h4 className="font-black text-slate-900">
                              {item.targetName}
                            </h4>
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            {item.courseCode} • {item.yearLevel} • Block {item.blockCode}
                            {item.semester ? ` • ${item.semester}` : ""}
                            {item.schoolYear ? ` • ${item.schoolYear}` : ""}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {item.submission?.submitted_at
                              ? `Submitted ${formatDate(
                                  item.submission.submitted_at
                                )}`
                              : item.status === "Pending"
                              ? "No current student submission"
                              : `Reviewed ${formatDate(item.reviewed_at)}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>

                          <span className="text-sm font-bold text-blue-700">
                            Open →
                          </span>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </ApproverLayout>
  );
}

export default ApproverDashboard;
