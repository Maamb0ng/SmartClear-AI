import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Swal from "sweetalert2";
import { motion } from "framer-motion";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaGraduationCap,
  FaKey,
  FaMoneyBillWave,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";

const FINANCIAL_OFFICE_WORDS = [
  "treasurer",
  "accounting",
  "cashier",
  "finance",
];

const uniqueIds = (items = []) => [
  ...new Set(items.filter(Boolean)),
];

const isFinancialOffice = (
  officeName = "",
  officeCode = ""
) => {
  const normalized = `${officeName} ${officeCode}`
    .trim()
    .toLowerCase();

  return FINANCIAL_OFFICE_WORDS.some(
    (keyword) =>
      normalized.includes(keyword)
  );
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString(
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

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
    }
  ).format(numericValue);
};

const normalizeYearLevel = (value) => {
  const rawValue = String(
    value || "Unassigned Year"
  ).trim();

  if (/^\d+$/.test(rawValue)) {
    return `${rawValue}${
      rawValue === "1"
        ? "st"
        : rawValue === "2"
        ? "nd"
        : rawValue === "3"
        ? "rd"
        : "th"
    } Year`;
  }

  return rawValue;
};

const getYearSortValue = (value) => {
  const match = String(value || "").match(
    /\d+/
  );

  return match
    ? Number(match[0])
    : 999;
};

function ReadyForEnrollment() {
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [authorized, setAuthorized] =
    useState(false);

  const [records, setRecords] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Awaiting");

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState(null);

  const [
    clearanceReference,
    setClearanceReference,
  ] = useState("");

  const [
    verificationCode,
    setVerificationCode,
  ] = useState("");

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  useEffect(() => {
    loadReadyStudents();
  }, []);

  const loadReadyStudents = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "Unable to identify the logged-in account."
        );
      }

      const {
        data: approverProfile,
        error: profileError,
      } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          role,
          status
        `)
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        approverProfile.role !==
          "Approver" ||
        approverProfile.status !==
          "Active"
      ) {
        setAuthorized(false);
        setRecords([]);
        return;
      }

      const {
        data: officeAssignments,
        error: assignmentError,
      } = await supabase
        .from("approver_assignments")
        .select(`
          id,
          office_id,
          is_active,
          offices (
            id,
            office_name,
            office_code
          )
        `)
        .eq(
          "approver_id",
          approverProfile.id
        )
        .eq("is_active", true)
        .not("office_id", "is", null);

      if (assignmentError) {
        throw assignmentError;
      }

      const financialAssignments =
        (officeAssignments || []).filter(
          (assignment) =>
            isFinancialOffice(
              assignment.offices
                ?.office_name,
              assignment.offices
                ?.office_code
            )
        );

      if (
        financialAssignments.length ===
        0
      ) {
        setAuthorized(false);
        setRecords([]);
        return;
      }

      setAuthorized(true);

      const financialOfficeIds =
        uniqueIds(
          financialAssignments.map(
            (assignment) =>
              assignment.office_id
          )
        );

      const {
        data: assignedFinancialSteps,
        error: financialStepError,
      } = await supabase
        .from("clearance_steps")
        .select(`
          id,
          clearance_request_id,
          office_id,
          approver_id,
          status,
          financial_decision,
          remaining_balance,
          payment_due_date,
          consent_confirmed,
          financial_notes,
          financial_reviewed_at,
          offices (
            id,
            office_name,
            office_code
          )
        `)
        .eq(
          "approver_id",
          approverProfile.id
        )
        .in(
          "office_id",
          financialOfficeIds
        );

      if (financialStepError) {
        throw financialStepError;
      }

      const approvedFinancialSteps =
        (
          assignedFinancialSteps || []
        ).filter(
          (step) =>
            step.status === "Approved"
        );

      const requestIds = uniqueIds(
        approvedFinancialSteps.map(
          (step) =>
            step.clearance_request_id
        )
      );

      if (requestIds.length === 0) {
        setRecords([]);
        return;
      }

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
          completed_at,
          clearance_reference,
          verification_status,
          pass_generated_at,
          verified_at,
          verified_by
        `)
        .in("id", requestIds)
        .eq("status", "Completed");

      if (requestError) {
        throw requestError;
      }

      const completedRequests =
        requests || [];

      if (
        completedRequests.length === 0
      ) {
        setRecords([]);
        return;
      }

      const completedRequestIds =
        uniqueIds(
          completedRequests.map(
            (request) => request.id
          )
        );

      const studentIds = uniqueIds(
        completedRequests.map(
          (request) =>
            request.student_id
        )
      );

      const sectionIds = uniqueIds(
        completedRequests.map(
          (request) =>
            request.section_id
        )
      );

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
                section
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
                block_code
              `)
              .in("id", sectionIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        supabase
          .from("clearance_steps")
          .select(`
            id,
            clearance_request_id,
            office_id,
            subject_id,
            status,
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
            completedRequestIds
          ),
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

      const allSteps =
        stepResult.data || [];

      const courseIds = uniqueIds(
        sections.map(
          (section) =>
            section.course_id
        )
      );

      const {
        data: courses,
        error: courseError,
      } =
        courseIds.length > 0
          ? await supabase
              .from("courses")
              .select(`
                id,
                course_code,
                course_name
              `)
              .in("id", courseIds)
          : {
              data: [],
              error: null,
            };

      if (courseError) {
        throw courseError;
      }

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
        (courses || []).map((course) => [
          course.id,
          course,
        ])
      );

      const financialStepMap =
        new Map(
          approvedFinancialSteps.map(
            (step) => [
              step.clearance_request_id,
              step,
            ]
          )
        );

      const stepsByRequest =
        new Map();

      allSteps.forEach((step) => {
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
          .push(step);
      });

      const readyRecords =
        completedRequests
          .map((request) => {
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

            const pendingSteps =
              requestSteps.filter(
                (step) =>
                  step.status ===
                  "Pending"
              ).length;

            const rejectedSteps =
              requestSteps.filter(
                (step) =>
                  step.status ===
                  "Rejected"
              ).length;

            const isFullyApproved =
              totalSteps > 0 &&
              approvedSteps ===
                totalSteps;

            if (!isFullyApproved) {
              return null;
            }

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

            const financialStep =
              financialStepMap.get(
                request.id
              ) || null;

            return {
              requestId: request.id,
              request,
              student,
              section,
              course,
              financialStep,
              steps: requestSteps,

              courseCode:
                course?.course_code ||
                section?.course ||
                student?.course ||
                "Unassigned Course",

              courseName:
                course?.course_name ||
                "",

              yearLevel:
                normalizeYearLevel(
                  section?.year_level ||
                    student?.year_level
                ),

              blockCode:
                section?.block_code ||
                student?.section ||
                "Unassigned Block",

              totalSteps,
              approvedSteps,
              pendingSteps,
              rejectedSteps,

              financialDecision:
                financialStep
                  ?.financial_decision ||
                "Approved",

              remainingBalance:
                financialStep
                  ?.remaining_balance,

              paymentDueDate:
                financialStep
                  ?.payment_due_date,

              isVerified:
                request.verification_status ===
                "Verified",
            };
          })
          .filter(Boolean)
          .sort((first, second) => {
            if (
              first.isVerified !==
              second.isVerified
            ) {
              return first.isVerified
                ? 1
                : -1;
            }

            return (
              first.student?.full_name ||
              ""
            ).localeCompare(
              second.student
                ?.full_name || ""
            );
          });

      setRecords(readyRecords);
    } catch (error) {
      console.error(
        "Ready-for-enrollment load error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Load Verification Queue",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const statistics = useMemo(() => {
    return {
      total: records.length,

      awaiting:
        records.filter(
          (record) =>
            !record.isVerified
        ).length,

      verified:
        records.filter(
          (record) =>
            record.isVerified
        ).length,

      conditional:
        records.filter((record) =>
          [
            "Payment Agreement",
            "Deferred Payment",
          ].includes(
            record.financialDecision
          )
        ).length,
    };
  }, [records]);

  const groupedRecords =
    useMemo(() => {
      const keyword = search
        .trim()
        .toLowerCase();

      const filteredRecords =
        records.filter((record) => {
          const matchesStatus =
            statusFilter === "All" ||
            (
              statusFilter ===
                "Awaiting" &&
              !record.isVerified
            ) ||
            (
              statusFilter ===
                "Verified" &&
              record.isVerified
            );

          if (!matchesStatus) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const searchableText = [
            record.student
              ?.full_name,
            record.student
              ?.student_id,
            record.student?.email,
            record.courseCode,
            record.courseName,
            record.yearLevel,
            record.blockCode,
            record.request
              ?.school_year,
            record.request?.semester,
            record.financialDecision,
            record.request
              ?.clearance_reference,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            keyword
          );
        });

      const groupMap = new Map();

      filteredRecords.forEach(
        (record) => {
          const key = [
            record.request
              ?.school_year,
            record.request?.semester,
            record.courseCode,
            record.yearLevel,
            record.blockCode,
          ].join("|");

          if (!groupMap.has(key)) {
            groupMap.set(key, {
              key,

              schoolYear:
                record.request
                  ?.school_year,

              semester:
                record.request
                  ?.semester,

              courseCode:
                record.courseCode,

              courseName:
                record.courseName,

              yearLevel:
                record.yearLevel,

              blockCode:
                record.blockCode,

              items: [],
            });
          }

          groupMap
            .get(key)
            .items.push(record);
        }
      );

      return [
        ...groupMap.values(),
      ].sort((first, second) => {
        const schoolYearCompare =
          String(
            second.schoolYear || ""
          ).localeCompare(
            String(
              first.schoolYear || ""
            ),
            undefined,
            {
              numeric: true,
            }
          );

        if (
          schoolYearCompare !== 0
        ) {
          return schoolYearCompare;
        }

        const courseCompare =
          first.courseCode.localeCompare(
            second.courseCode
          );

        if (
          courseCompare !== 0
        ) {
          return courseCompare;
        }

        const yearCompare =
          getYearSortValue(
            first.yearLevel
          ) -
          getYearSortValue(
            second.yearLevel
          );

        if (yearCompare !== 0) {
          return yearCompare;
        }

        return String(
          first.blockCode
        ).localeCompare(
          String(
            second.blockCode
          ),
          undefined,
          {
            numeric: true,
          }
        );
      });
    }, [
      records,
      search,
      statusFilter,
    ]);

  const openVerification = (
    record
  ) => {
    setSelectedRecord(record);

    setClearanceReference(
      record.request
        ?.clearance_reference || ""
    );

    setVerificationCode("");
  };

  const closeVerification = () => {
    if (verifying) {
      return;
    }

    setSelectedRecord(null);
    setClearanceReference("");
    setVerificationCode("");
  };

  const handleVerify = async (
    event
  ) => {
    event.preventDefault();

    const normalizedReference =
      clearanceReference
        .trim()
        .toUpperCase();

    const normalizedCode =
      verificationCode
        .trim()
        .toUpperCase();

    if (
      !normalizedReference ||
      !normalizedCode
    ) {
      await Swal.fire({
        icon: "warning",
        title:
          "Pass Details Required",
        text:
          "Enter the clearance reference and verification code shown on the student's Digital Clearance Pass.",
      });

      return;
    }

    try {
      setVerifying(true);

      const {
        data,
        error,
      } = await supabase.rpc(
        "verify_clearance_for_enrollment",
        {
          p_clearance_reference:
            normalizedReference,

          p_verification_code:
            normalizedCode,
        }
      );

      if (error) {
        throw error;
      }

      if (
        !data?.success ||
        !data?.valid
      ) {
        throw new Error(
          "The Digital Clearance Pass could not be verified."
        );
      }

      await Swal.fire({
        icon: "success",
        title:
          data.alreadyVerified
            ? "Already Verified"
            : "Ready for Enrollment",
        text:
          data.alreadyVerified
            ? "This Digital Clearance Pass was already verified."
            : "The completed clearance was successfully confirmed for enrollment.",
      });

      closeVerification();
      setRefreshing(true);
      await loadReadyStudents();
    } catch (error) {
      console.error(
        "Treasurer verification error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Verification Failed",
        text:
          error?.message ||
          "The clearance reference or verification code is invalid.",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <ApproverLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />

            <p className="mt-4 font-semibold text-slate-600">
              Loading final verification queue...
            </p>
          </div>
        </div>
      </ApproverLayout>
    );
  }

  if (!authorized) {
    return (
      <ApproverLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="max-w-xl rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-lg">
            <FaShieldAlt className="mx-auto text-6xl text-amber-400" />

            <h1 className="mt-5 text-2xl font-black text-slate-800">
              Treasurer Access Required
            </h1>

            <p className="mt-3 leading-7 text-slate-500">
              This page is available only to an active Approver account assigned to the Treasurer, Accounting, Cashier, or Finance office.
            </p>
          </div>
        </div>
      </ApproverLayout>
    );
  }

  return (
    <ApproverLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 14,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="pb-10"
      >
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-700 p-7 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                <FaGraduationCap />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                  Treasurer Final Confirmation
                </p>

                <h1 className="mt-1 text-3xl font-black">
                  Ready for Enrollment
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">
                  Review students whose complete subject, office, and financial clearance requirements are already approved.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadReadyStudents();
              }}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Completed Clearance",
              value: statistics.total,
              icon: <FaCheckCircle />,
              className:
                "bg-emerald-600",
            },
            {
              label:
                "Awaiting Verification",
              value:
                statistics.awaiting,
              icon: <FaKey />,
              className:
                "bg-amber-500",
            },
            {
              label:
                "Verified for Enrollment",
              value:
                statistics.verified,
              icon: <FaGraduationCap />,
              className:
                "bg-blue-600",
            },
            {
              label:
                "Conditional Clearance",
              value:
                statistics.conditional,
              icon:
                <FaMoneyBillWave />,
              className:
                "bg-violet-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-800">
                    {item.value}
                  </p>
                </div>

                <div
                  className={`flex h-13 w-13 items-center justify-center rounded-2xl text-xl text-white ${item.className}`}
                >
                  {item.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
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
                placeholder="Search student, ID, course, year level, block, or clearance reference..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "Awaiting",
                "Verified",
                "All",
              ].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      filter
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    statusFilter ===
                    filter
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {groupedRecords.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-md">
              <FaGraduationCap className="mx-auto text-6xl text-slate-300" />

              <h2 className="mt-5 text-2xl font-black text-slate-700">
                No Students Found
              </h2>

              <p className="mt-2 text-slate-500">
                Students appear here only when every required clearance step is Approved and the request status is Completed.
              </p>
            </div>
          ) : (
            groupedRecords.map(
              (group) => (
                <details
                  key={group.key}
                  open
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md"
                >
                  <summary className="cursor-pointer list-none bg-gradient-to-r from-slate-50 to-emerald-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                          {group.schoolYear ||
                            "No School Year"}{" "}
                          •{" "}
                          {group.semester ||
                            "No Semester"}
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-800">
                          {group.courseCode}{" "}
                          •{" "}
                          {group.yearLevel}{" "}
                          • Block{" "}
                          {group.blockCode}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700">
                          {group.items.length} student
                          {group.items.length ===
                          1
                            ? ""
                            : "s"}
                        </span>

                        <FaChevronDown className="text-slate-400" />
                      </div>
                    </div>
                  </summary>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-white">
                        <tr className="border-t border-slate-100">
                          <th className="p-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                            Student
                          </th>

                          <th className="p-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                            Clearance
                          </th>

                          <th className="p-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                            Financial Decision
                          </th>

                          <th className="p-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                            Completed
                          </th>

                          <th className="p-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                            Enrollment Status
                          </th>

                          <th className="p-4 text-center text-xs font-black uppercase tracking-wide text-slate-400">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.items.map(
                          (record) => (
                            <tr
                              key={
                                record.requestId
                              }
                              className="border-t border-slate-100 transition hover:bg-slate-50"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                    <FaUserGraduate />
                                  </div>

                                  <div>
                                    <p className="font-black text-slate-800">
                                      {record.student
                                        ?.full_name ||
                                        "No Name"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {record.student
                                        ?.student_id ||
                                        "No Student ID"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-black text-green-700">
                                  <FaCheckCircle />
                                  {record.approvedSteps}/
                                  {record.totalSteps} Approved
                                </span>
                              </td>

                              <td className="p-4">
                                <p className="font-bold text-slate-700">
                                  {record.financialDecision}
                                </p>

                                {Number(
                                  record.remainingBalance
                                ) > 0 && (
                                  <p className="mt-1 text-xs font-semibold text-amber-700">
                                    Balance:{" "}
                                    {formatCurrency(
                                      record.remainingBalance
                                    )}
                                  </p>
                                )}

                                {record.paymentDueDate && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Due:{" "}
                                    {new Date(
                                      record.paymentDueDate
                                    ).toLocaleDateString(
                                      "en-PH"
                                    )}
                                  </p>
                                )}
                              </td>

                              <td className="p-4 text-sm text-slate-600">
                                {formatDate(
                                  record.request
                                    ?.completed_at
                                )}
                              </td>

                              <td className="p-4">
                                {record.isVerified ? (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">
                                    <FaShieldAlt />
                                    Verified for Enrollment
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                                    <FaKey />
                                    Awaiting Pass Verification
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                {record.isVerified ? (
                                  <div>
                                    <p className="text-xs font-black text-green-700">
                                      Confirmed
                                    </p>

                                    <p className="mt-1 text-[10px] text-slate-400">
                                      {formatDate(
                                        record.request
                                          ?.verified_at
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openVerification(
                                        record
                                      )
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
                                  >
                                    <FaShieldAlt />
                                    Review & Verify
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              )
            )
          )}
        </div>

        {selectedRecord && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between bg-gradient-to-r from-emerald-700 to-teal-700 p-6 text-white">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-100">
                    Treasurer Final Confirmation
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Verify Ready for Enrollment
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeVerification
                  }
                  disabled={verifying}
                  className="rounded-xl bg-white/10 p-3 transition hover:bg-white/20 disabled:opacity-50"
                >
                  <FaTimes />
                </button>
              </div>

              <form
                onSubmit={handleVerify}
                className="space-y-5 p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Student
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-800">
                      {selectedRecord
                        .student?.full_name ||
                        "No Name"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRecord
                        .student?.student_id ||
                        "No Student ID"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Official Class
                    </p>

                    <p className="mt-2 font-black text-slate-800">
                      {selectedRecord.courseCode}{" "}
                      •{" "}
                      {selectedRecord.yearLevel}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Block{" "}
                      {selectedRecord.blockCode}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-green-600">
                      Overall Clearance
                    </p>

                    <p className="mt-2 font-black text-green-800">
                      {selectedRecord.approvedSteps}/
                      {selectedRecord.totalSteps} Approved
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Financial Decision
                    </p>

                    <p className="mt-2 font-black text-blue-800">
                      {selectedRecord.financialDecision}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                      Completed
                    </p>

                    <p className="mt-2 text-sm font-black text-purple-800">
                      {formatDate(
                        selectedRecord
                          .request
                          ?.completed_at
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Clearance Reference
                  </label>

                  <div className="relative">
                    <FaShieldAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={
                        clearanceReference
                      }
                      onChange={(event) =>
                        setClearanceReference(
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="Clearance reference from the Digital Pass"
                      disabled={verifying}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 font-mono font-black uppercase outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    />
                  </div>

                  {!selectedRecord.request
                    ?.clearance_reference && (
                    <p className="mt-2 text-xs leading-5 text-amber-700">
                      Ask the student to open the Digital Clearance Pass first so its permanent reference and verification code can be generated.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Verification Code
                  </label>

                  <div className="relative">
                    <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={
                        verificationCode
                      }
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="Enter the code shown on the student's Digital Pass"
                      autoComplete="off"
                      disabled={verifying}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 font-mono font-black uppercase tracking-[0.18em] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Confirming the pass records the logged-in Treasurer and the exact verification date and time. It does not change the recorded payment decision.
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={
                      closeVerification
                    }
                    disabled={verifying}
                    className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      verifying ||
                      !clearanceReference.trim() ||
                      !verificationCode.trim()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <FaSyncAlt className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <FaGraduationCap />
                        Confirm Ready to Enroll
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.main>
    </ApproverLayout>
  );
}

export default ReadyForEnrollment;