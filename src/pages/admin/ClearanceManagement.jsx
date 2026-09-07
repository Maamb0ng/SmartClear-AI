import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";
import { supabase } from "../../services/supabase";

import {
  FaBook,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClipboardCheck,
  FaClock,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaGraduationCap,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const STORAGE_BUCKET =
  "clearance-requirements";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const uniqueIds = (items = []) => [
  ...new Set(items.filter(Boolean)),
];

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const shortClearanceId = (id) => {
  if (!id) return "N/A";

  return `CLR-${id
    .slice(0, 8)
    .toUpperCase()}`;
};

const getRequestStatusClass = (
  status
) => {
  if (status === "Completed") {
    return "bg-green-100 text-green-700";
  }

  if (status === "In Progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "Rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
};

const getStepStatusClass = (status) => {
  if (status === "Approved") {
    return "bg-green-100 text-green-700";
  }

  if (status === "Rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
};

const getDisplayedStepStatus = (step) => {
  if (
    step.status === "Pending" &&
    step.submission
  ) {
    return "Under Review";
  }

  if (step.status === "Pending") {
    return "Waiting for Student";
  }

  return step.status;
};

function ClearanceManagement() {
  const [clearances, setClearances] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [courseFilter, setCourseFilter] =
    useState("All");

  const [yearFilter, setYearFilter] =
    useState("All");

  const [blockFilter, setBlockFilter] =
    useState("All");

  const [
    selectedClearance,
    setSelectedClearance,
  ] = useState(null);

  const [
    expandedGroups,
    setExpandedGroups,
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadClearances();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD ALL CLEARANCE MONITORING DATA
  |--------------------------------------------------------------------------
  */

  const loadClearances = async () => {
    try {
      setLoading(true);

      /*
      |--------------------------------------------------------------------------
      | CLEARANCE REQUESTS
      |--------------------------------------------------------------------------
      */

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
          remarks,
          requested_at,
          updated_at,
          completed_at
        `)
        .order("requested_at", {
          ascending: false,
        });

      if (requestError) {
        throw requestError;
      }

      const safeRequests = requests || [];

      if (safeRequests.length === 0) {
        setClearances([]);
        return;
      }

      const requestIds = uniqueIds(
        safeRequests.map(
          (request) => request.id
        )
      );

      const studentIds = uniqueIds(
        safeRequests.map(
          (request) =>
            request.student_id
        )
      );

      const sectionIds = uniqueIds(
        safeRequests.map(
          (request) =>
            request.section_id
        )
      );

      /*
      |--------------------------------------------------------------------------
      | STUDENTS, SECTIONS, STEPS
      |--------------------------------------------------------------------------
      */

      const [
        studentResult,
        sectionResult,
        stepResult,
      ] = await Promise.all([
        studentIds.length > 0
          ? supabase
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
                school_year,
                status
              `)
              .in("id", studentIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        sectionIds.length > 0
          ? supabase
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
              .in("id", sectionIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        requestIds.length > 0
          ? supabase
              .from("clearance_steps")
              .select(`
                id,
                clearance_request_id,
                office_id,
                subject_id,
                approver_id,
                status,
                remarks,
                reviewed_at,
                offices (
                  id,
                  office_name,
                  office_code
                ),
                subjects (
                  id,
                  subject_name,
                  subject_code
                )
              `)
              .in(
                "clearance_request_id",
                requestIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (studentResult.error) {
        throw studentResult.error;
      }

      if (sectionResult.error) {
        throw sectionResult.error;
      }

      if (stepResult.error) {
        throw stepResult.error;
      }

      const students =
        studentResult.data || [];

      const sections =
        sectionResult.data || [];

      const steps =
        stepResult.data || [];

      const courseIds = uniqueIds(
        sections.map(
          (section) =>
            section.course_id
        )
      );

      const approverIds = uniqueIds(
        steps.map(
          (step) =>
            step.approver_id
        )
      );

      const stepIds = uniqueIds(
        steps.map((step) => step.id)
      );

      /*
      |--------------------------------------------------------------------------
      | COURSES, APPROVERS, SUBMISSIONS
      |--------------------------------------------------------------------------
      */

      const [
        courseResult,
        approverResult,
        submissionResult,
      ] = await Promise.all([
        courseIds.length > 0
          ? supabase
              .from("courses")
              .select(`
                id,
                course_code,
                course_name
              `)
              .in("id", courseIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        approverIds.length > 0
          ? supabase
              .from("users")
              .select(`
                id,
                employee_id,
                full_name,
                email,
                role,
                status
              `)
              .in("id", approverIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        stepIds.length > 0
          ? supabase
              .from(
                "clearance_submissions"
              )
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
              .in(
                "clearance_step_id",
                stepIds
              )
              .eq("is_current", true)
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (courseResult.error) {
        throw courseResult.error;
      }

      if (approverResult.error) {
        throw approverResult.error;
      }

      if (submissionResult.error) {
        throw submissionResult.error;
      }

      const courses =
        courseResult.data || [];

      const approvers =
        approverResult.data || [];

      const rawSubmissions =
        submissionResult.data || [];

      /*
      |--------------------------------------------------------------------------
      | CREATE SIGNED URLS FOR ADMIN MONITORING
      |--------------------------------------------------------------------------
      */

      const submissions =
        await Promise.all(
          rawSubmissions.map(
            async (submission) => {
              if (
                !submission.attachment_url
              ) {
                return {
                  ...submission,
                  signed_url: null,
                };
              }

              const {
                data,
                error,
              } = await supabase.storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(
                  submission.attachment_url,
                  60 * 10
                );

              if (error) {
                console.warn(
                  "Unable to create signed URL:",
                  error
                );

                return {
                  ...submission,
                  signed_url: null,
                };
              }

              return {
                ...submission,
                signed_url:
                  data?.signedUrl ||
                  null,
              };
            }
          )
        );

      /*
      |--------------------------------------------------------------------------
      | LOOKUP MAPS
      |--------------------------------------------------------------------------
      */

      const studentMap = new Map(
        students.map((student) => [
          student.id,
          student,
        ])
      );

      const sectionMap = new Map(
        sections.map((section) => [
          section.id,
          section,
        ])
      );

      const courseMap = new Map(
        courses.map((course) => [
          course.id,
          course,
        ])
      );

      const approverMap = new Map(
        approvers.map((approver) => [
          approver.id,
          approver,
        ])
      );

      const submissionMap = new Map(
        submissions.map(
          (submission) => [
            submission.clearance_step_id,
            submission,
          ]
        )
      );

      const stepsByRequest = new Map();

      steps.forEach((step) => {
        const enrichedStep = {
          ...step,

          approver:
            approverMap.get(
              step.approver_id
            ) || null,

          submission:
            submissionMap.get(
              step.id
            ) || null,
        };

        if (
          !stepsByRequest.has(
            step.clearance_request_id
          )
        ) {
          stepsByRequest.set(
            step.clearance_request_id,
            []
          );
        }

        stepsByRequest
          .get(
            step.clearance_request_id
          )
          .push(enrichedStep);
      });

      /*
      |--------------------------------------------------------------------------
      | ENRICH CLEARANCE REQUESTS
      |--------------------------------------------------------------------------
      */

      const completeRequests =
        safeRequests.map((request) => {
          const student =
            studentMap.get(
              request.student_id
            ) || null;

          const section =
            sectionMap.get(
              request.section_id
            ) || null;

          const course =
            section?.course_id
              ? courseMap.get(
                  section.course_id
                ) || null
              : null;

          const requestSteps =
            stepsByRequest.get(
              request.id
            ) || [];

          const totalSteps =
            requestSteps.length;

          const approvedSteps =
            requestSteps.filter(
              (step) =>
                step.status ===
                "Approved"
            ).length;

          const rejectedSteps =
            requestSteps.filter(
              (step) =>
                step.status ===
                "Rejected"
            ).length;

          const pendingSteps =
            requestSteps.filter(
              (step) =>
                step.status ===
                "Pending"
            ).length;

          const submittedSteps =
            requestSteps.filter(
              (step) =>
                Boolean(step.submission)
            ).length;

          const progress =
            totalSteps > 0
              ? Math.round(
                  (approvedSteps /
                    totalSteps) *
                    100
                )
              : 0;

          const courseCode =
            course?.course_code ||
            section?.course ||
            student?.course ||
            "Unassigned Course";

          const courseName =
            course?.course_name || "";

          const yearLevel =
            section?.year_level ||
            student?.year_level ||
            "Unassigned Year";

          const blockCode =
            section?.block_code ||
            student?.section ||
            "Unassigned Block";

          const isFullyApproved =
            totalSteps > 0 &&
            approvedSteps === totalSteps;

          const readyForEnrollment =
            request.status ===
              "Completed" &&
            isFullyApproved;

          const groupKey = [
            courseCode,
            yearLevel,
            blockCode,
            request.school_year,
            request.semester,
          ].join("|");

          return {
            ...request,

            student,
            section,
            course,
            steps: requestSteps,

            courseCode,
            courseName,
            yearLevel,
            blockCode,
            groupKey,

            totalSteps,
            approvedSteps,
            rejectedSteps,
            pendingSteps,
            submittedSteps,
            progress,

            isFullyApproved,
            readyForEnrollment,
          };
        });

      setClearances(completeRequests);

      const allGroupKeys = uniqueIds(
        completeRequests.map(
          (item) => item.groupKey
        )
      );

      setExpandedGroups((current) =>
        current.length > 0
          ? current
          : allGroupKeys
      );
    } catch (error) {
      console.error(
        "Clearance monitoring error:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "Unable to Load Clearances",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER OPTIONS
  |--------------------------------------------------------------------------
  */

  const filterOptions = useMemo(() => {
    return {
      courses: uniqueIds(
        clearances.map(
          (item) => item.courseCode
        )
      ).sort(),

      years: uniqueIds(
        clearances.map(
          (item) => item.yearLevel
        )
      ).sort(),

      blocks: uniqueIds(
        clearances.map(
          (item) => item.blockCode
        )
      ).sort(),
    };
  }, [clearances]);

  /*
  |--------------------------------------------------------------------------
  | FILTER CLEARANCES
  |--------------------------------------------------------------------------
  */

  const filteredClearances =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      return clearances.filter(
        (item) => {
          const searchContent = [
            item.id,
            shortClearanceId(item.id),
            item.student?.full_name,
            item.student?.student_id,
            item.student?.email,
            item.courseCode,
            item.courseName,
            item.yearLevel,
            item.blockCode,
            item.school_year,
            item.semester,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchContent.includes(
              keyword
            );

          const matchesStatus =
            statusFilter === "All" ||
            item.status ===
              statusFilter;

          const matchesCourse =
            courseFilter === "All" ||
            item.courseCode ===
              courseFilter;

          const matchesYear =
            yearFilter === "All" ||
            item.yearLevel ===
              yearFilter;

          const matchesBlock =
            blockFilter === "All" ||
            item.blockCode ===
              blockFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCourse &&
            matchesYear &&
            matchesBlock
          );
        }
      );
    }, [
      clearances,
      search,
      statusFilter,
      courseFilter,
      yearFilter,
      blockFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | DASHBOARD STATISTICS
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    return {
      total: clearances.length,

      inProgress:
        clearances.filter(
          (item) =>
            item.status ===
            "In Progress"
        ).length,

      completed:
        clearances.filter(
          (item) =>
            item.status ===
            "Completed"
        ).length,

      ready:
        clearances.filter(
          (item) =>
            item.readyForEnrollment
        ).length,
    };
  }, [clearances]);

  /*
  |--------------------------------------------------------------------------
  | GROUP COURSE → YEAR → BLOCK
  |--------------------------------------------------------------------------
  */

  const groupedClearances =
    useMemo(() => {
      const groupMap = new Map();

      filteredClearances.forEach(
        (clearance) => {
          if (
            !groupMap.has(
              clearance.groupKey
            )
          ) {
            groupMap.set(
              clearance.groupKey,
              {
                key:
                  clearance.groupKey,

                courseCode:
                  clearance.courseCode,

                courseName:
                  clearance.courseName,

                yearLevel:
                  clearance.yearLevel,

                blockCode:
                  clearance.blockCode,

                semester:
                  clearance.semester,

                schoolYear:
                  clearance.school_year,

                items: [],
              }
            );
          }

          groupMap
            .get(clearance.groupKey)
            .items.push(clearance);
        }
      );

      return [
        ...groupMap.values(),
      ].sort((first, second) => {
        const courseCompare =
          first.courseCode.localeCompare(
            second.courseCode
          );

        if (courseCompare !== 0) {
          return courseCompare;
        }

        const yearCompare =
          first.yearLevel.localeCompare(
            second.yearLevel
          );

        if (yearCompare !== 0) {
          return yearCompare;
        }

        return first.blockCode.localeCompare(
          second.blockCode
        );
      });
    }, [filteredClearances]);

  /*
  |--------------------------------------------------------------------------
  | GROUP EXPANSION
  |--------------------------------------------------------------------------
  */

  const toggleGroup = (groupKey) => {
    setExpandedGroups((current) =>
      current.includes(groupKey)
        ? current.filter(
            (key) => key !== groupKey
          )
        : [...current, groupKey]
    );
  };

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClearances();
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading clearance monitoring...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
                <FaClipboardCheck />
                Administrator Monitoring
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Clearance Monitoring
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Monitor student progress across subject and office requirements without interfering with assigned approver decisions.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
          >
            <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </motion.button>
        </div>
      </motion.section>


      {/* Statistics */}

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Requests
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.total}
              </h2>
            </div>

            <div className="rounded-2xl bg-blue-700 p-5 text-3xl text-white">
              <FaClipboardCheck />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                In Progress
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.inProgress}
              </h2>
            </div>

            <div className="rounded-2xl bg-yellow-500 p-5 text-3xl text-white">
              <FaClock />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Completed
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.completed}
              </h2>
            </div>

            <div className="rounded-2xl bg-green-600 p-5 text-3xl text-white">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Ready for Enrollment
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.ready}
              </h2>
            </div>

            <div className="rounded-2xl bg-indigo-600 p-5 text-3xl text-white">
              <FaGraduationCap />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}

      <div className="mb-7 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search student, ID, course, block, or clearance reference..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            <FaFilter />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Statuses
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Course
              </label>

              <select
                value={courseFilter}
                onChange={(event) =>
                  setCourseFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Courses
                </option>

                {filterOptions.courses.map(
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Year Level
              </label>

              <select
                value={yearFilter}
                onChange={(event) =>
                  setYearFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Year Levels
                </option>

                {filterOptions.years.map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Block
              </label>

              <select
                value={blockFilter}
                onChange={(event) =>
                  setBlockFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Blocks
                </option>

                {filterOptions.blocks.map(
                  (block) => (
                    <option
                      key={block}
                      value={block}
                    >
                      Block {block}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Monitoring */}

      <div className="space-y-6">
        {groupedClearances.length ===
        0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-14 text-center shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
            <FaUsers className="mx-auto text-6xl text-slate-200" />

            <h2 className="mt-5 text-2xl font-bold text-slate-700">
              No Clearance Requests Found
            </h2>

            <p className="mt-2 text-slate-500">
              No requests match the current
              search and filters.
            </p>
          </div>
        ) : (
          groupedClearances.map(
            (group) => {
              const isExpanded =
                expandedGroups.includes(
                  group.key
                );

              const completedCount =
                group.items.filter(
                  (item) =>
                    item.status ===
                    "Completed"
                ).length;

              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
                >
                  {/* Group Header */}

                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        group.key
                      )
                    }
                    className="flex w-full flex-col justify-between gap-4 bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-left text-white md:flex-row md:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                        {group.courseCode} •{" "}
                        {group.yearLevel}
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        Block{" "}
                        {group.blockCode}
                      </h2>

                      <p className="mt-2 text-sm text-blue-100">
                        {group.semester} •{" "}
                        {group.schoolYear}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur">
                        {group.items.length}{" "}
                        student(s) •{" "}
                        {completedCount}{" "}
                        completed
                      </div>

                      {isExpanded ? (
                        <FaChevronUp />
                      ) : (
                        <FaChevronDown />
                      )}
                    </div>
                  </button>

                  {/* Student List */}

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-4 text-left text-sm">
                              Student
                            </th>

                            <th className="p-4 text-left text-sm">
                              Submitted
                            </th>

                            <th className="p-4 text-left text-sm">
                              Progress
                            </th>

                            <th className="p-4 text-left text-sm">
                              Requirements
                            </th>

                            <th className="p-4 text-left text-sm">
                              Status
                            </th>

                            <th className="p-4 text-center text-sm">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {group.items.map(
                            (item) => (
                              <tr
                                key={item.id}
                                className="border-t border-slate-100 transition hover:bg-slate-50"
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
                                      <FaUserGraduate className="text-blue-700" />
                                    </div>

                                    <div>
                                      <p className="font-bold text-slate-800">
                                        {item
                                          .student
                                          ?.full_name ||
                                          "No Name"}
                                      </p>

                                      <p className="text-xs text-slate-500">
                                        {item
                                          .student
                                          ?.student_id ||
                                          "No Student ID"}
                                      </p>

                                      <p className="mt-1 text-xs font-semibold text-blue-700">
                                        {shortClearanceId(
                                          item.id
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-4 text-sm text-slate-600">
                                  {formatDate(
                                    item.requested_at
                                  )}
                                </td>

                                <td className="p-4">
                                  <div className="min-w-40">
                                    <div className="mb-2 flex items-center justify-between text-xs">
                                      <span className="font-semibold text-slate-700">
                                        {
                                          item.approvedSteps
                                        }
                                        /
                                        {
                                          item.totalSteps
                                        }
                                      </span>

                                      <span className="text-slate-500">
                                        {
                                          item.progress
                                        }
                                        %
                                      </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className={`h-full rounded-full ${
                                          item.progress ===
                                          100
                                            ? "bg-green-600"
                                            : "bg-blue-600"
                                        }`}
                                        style={{
                                          width: `${item.progress}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                                      {
                                        item.approvedSteps
                                      }{" "}
                                      Approved
                                    </span>

                                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
                                      {
                                        item.pendingSteps
                                      }{" "}
                                      Pending
                                    </span>

                                    <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                                      {
                                        item.rejectedSteps
                                      }{" "}
                                      Rejected
                                    </span>
                                  </div>
                                </td>

                                <td className="p-4">
                                  {item.readyForEnrollment ? (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                                      <FaGraduationCap />
                                      Ready for Enrollment
                                    </span>
                                  ) : (
                                    <span
                                      className={`rounded-full px-4 py-2 text-sm font-semibold ${getRequestStatusClass(
                                        item.status
                                      )}`}
                                    >
                                      {
                                        item.status
                                      }
                                    </span>
                                  )}
                                </td>

                                <td className="p-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedClearance(
                                        item
                                      )
                                    }
                                    title="View clearance details"
                                    className="rounded-xl bg-blue-700 p-3 text-white transition hover:bg-blue-800"
                                  >
                                    <FaEye />
                                  </button>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            }
          )
        )}
      </div>

      {/* Details Modal */}

      {selectedClearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[1.75rem] border border-white/80 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-7">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Clearance Monitoring
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-800">
                  {selectedClearance
                    .student?.full_name ||
                    "Student Clearance"}
                </h2>

                <p className="mt-2 text-slate-500">
                  {shortClearanceId(
                    selectedClearance.id
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedClearance(
                    null
                  )
                }
                className="rounded-xl bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-7">
              {/* Completion Banner */}

              {selectedClearance.readyForEnrollment && (
                <div className="mb-7 rounded-2xl border border-green-200 bg-green-50 p-6">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl text-white">
                      <FaGraduationCap />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-green-800">
                        Cleared and Ready
                        for Enrollment
                      </h3>

                      <p className="mt-2 text-green-700">
                        All required subject
                        and office clearance
                        steps have been
                        approved.
                      </p>

                      <p className="mt-2 text-sm text-green-600">
                        Completed:{" "}
                        {formatDate(
                          selectedClearance
                            .completed_at
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <FaUserGraduate className="mb-3 text-2xl text-blue-700" />

                  <p className="text-sm text-slate-500">
                    Student
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedClearance
                      .student?.full_name ||
                      "No Name"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedClearance
                      .student?.student_id ||
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <FaGraduationCap className="mb-3 text-2xl text-indigo-700" />

                  <p className="text-sm text-slate-500">
                    Official Class
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      selectedClearance.courseCode
                    }{" "}
                    —{" "}
                    {
                      selectedClearance.yearLevel
                    }
                  </p>

                  <p className="text-sm text-slate-500">
                    Block{" "}
                    {
                      selectedClearance.blockCode
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <FaCalendarAlt className="mb-3 text-2xl text-purple-700" />

                  <p className="text-sm text-slate-500">
                    Clearance Cycle
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {
                      selectedClearance.semester
                    }
                  </p>

                  <p className="text-sm text-slate-500">
                    {
                      selectedClearance.school_year
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <FaClipboardCheck className="mb-3 text-2xl text-green-700" />

                  <p className="text-sm text-slate-500">
                    Progress
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {
                      selectedClearance.approvedSteps
                    }
                    /
                    {
                      selectedClearance.totalSteps
                    }
                  </p>

                  <p className="text-sm text-slate-500">
                    {
                      selectedClearance.progress
                    }
                    % completed
                  </p>
                </div>
              </div>

              {/* Steps */}

              <div className="mt-8">
                <h3 className="text-2xl font-bold text-slate-800">
                  Clearance Requirements
                </h3>

                <p className="mt-2 text-slate-500">
                  Administrator monitoring
                  only. Reviews are performed
                  by the assigned approvers.
                </p>

                {selectedClearance.steps
                  .length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-slate-500">
                    No clearance steps were
                    generated.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {selectedClearance.steps.map(
                      (step) => {
                        const stepName =
                          step.subjects
                            ?.subject_name ||
                          step.offices
                            ?.office_name ||
                          "Clearance Requirement";

                        const stepCode =
                          step.subjects
                            ?.subject_code ||
                          step.offices
                            ?.office_code ||
                          "No code";

                        return (
                          <div
                            key={step.id}
                            className="rounded-2xl border border-slate-200 p-5"
                          >
                            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                              <div className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700">
                                  {step.subject_id ? (
                                    <FaBook />
                                  ) : (
                                    <FaBuilding />
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-bold text-slate-800">
                                    {
                                      stepName
                                    }
                                  </h4>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {
                                      stepCode
                                    }
                                  </p>

                                  <p className="mt-2 text-sm text-slate-600">
                                    Approver:{" "}
                                    <strong>
                                      {step
                                        .approver
                                        ?.full_name ||
                                        "Assigned Approver"}
                                    </strong>
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStepStatusClass(
                                  step.status
                                )}`}
                              >
                                {getDisplayedStepStatus(
                                  step
                                )}
                              </span>
                            </div>

                            {step.submission && (
                              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                <div className="flex flex-col justify-between gap-4 md:flex-row">
                                  <div>
                                    <p className="font-semibold text-slate-700">
                                      Submission
                                      Version{" "}
                                      {
                                        step
                                          .submission
                                          .version
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatDate(
                                        step
                                          .submission
                                          .submitted_at
                                      )}
                                    </p>

                                    {step
                                      .submission
                                      .submission_text && (
                                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                        {
                                          step
                                            .submission
                                            .submission_text
                                        }
                                      </p>
                                    )}
                                  </div>

                                  {step
                                    .submission
                                    .signed_url && (
                                    <a
                                      href={
                                        step
                                          .submission
                                          .signed_url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-fit w-fit items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                                    >
                                      <FaFileAlt />
                                      View
                                      Attachment
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {step.remarks && (
                              <div
                                className={`mt-4 rounded-xl p-4 text-sm ${
                                  step.status ===
                                  "Rejected"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-green-50 text-green-700"
                                }`}
                              >
                                <strong>
                                  Approver
                                  Remarks:
                                </strong>{" "}
                                {
                                  step.remarks
                                }
                              </div>
                            )}

                            {step.reviewed_at && (
                              <p className="mt-3 text-xs text-slate-400">
                                Reviewed:{" "}
                                {formatDate(
                                  step.reviewed_at
                                )}
                              </p>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClearance(
                      null
                    )
                  }
                  className="rounded-xl bg-slate-800 px-7 py-3 font-semibold text-white transition hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </motion.main>
    </AdminLayout>
  );
}

export default ClearanceManagement;