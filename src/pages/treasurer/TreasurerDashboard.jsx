import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

import TreasurerLayout from "../../layouts/TreasurerLayout";
import PaymentRecordsImport from "../../components/treasurer/PaymentRecordsImport";
import UpdatePaymentModal from "../../components/treasurer/UpdatePaymentModal";
import PaymentHistoryModal from "../../components/treasurer/PaymentHistoryModal";
import { supabase } from "../../services/supabase";

import {
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaFileAlt,
  FaGraduationCap,
  FaHistory,
  FaMoneyBillWave,
  FaSearch,
  FaSyncAlt,
  FaTimesCircle,
  FaWallet,
} from "react-icons/fa";

const DEFAULT_FINANCIAL_FORM = {
  decision: "Fully Paid",
  remainingBalance: "",
  paymentDueDate: "",
  consentConfirmed: false,
  remarks: "",
};

const uniqueIds = (items = []) => [
  ...new Set(items.filter(Boolean)),
];

const normalizeYearLevel = (value) => {
  const raw = String(value ?? "").trim();

  if (!raw) return "N/A";

  const numeric = Number.parseInt(raw, 10);

  if (Number.isFinite(numeric)) {
    return String(numeric);
  }

  return raw;
};

const getYearSortValue = (value) => {
  const parsed = Number.parseInt(
    String(value || "").replace(/\D/g, ""),
    10
  );

  return Number.isFinite(parsed) ? parsed : 999;
};

const normalizeKeyPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildPaymentRecordKey = ({
  studentId,
  schoolYear,
  semester,
}) =>
  [
    String(studentId || "").trim(),
    normalizeKeyPart(schoolYear),
    normalizeKeyPart(semester),
  ].join("|");

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₱0.00";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "N/A";

  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const paymentStatusClass = (status) => {
  switch (status) {
    case "Cleared":
      return "bg-emerald-100 text-emerald-700";
    case "With Balance":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const clearanceStatusClass = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700";
    case "Rejected":
      return "bg-red-100 text-red-700";
    case "Pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const financialDecisionClass = (decision) => {
  switch (decision) {
    case "Fully Paid":
      return "bg-emerald-100 text-emerald-700";
    case "Payment Agreement":
    case "Deferred Payment":
      return "bg-blue-100 text-blue-700";
    case "Not Cleared":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const isFinancialOffice = (office) => {
  const code = String(
    office?.office_code || ""
  )
    .trim()
    .toUpperCase();

  const name = String(
    office?.office_name || ""
  )
    .trim()
    .toLowerCase();

  return (
    code === "FIN" ||
    [
      "treasurer",
      "cashier",
      "accounting",
      "finance",
    ].some((keyword) => name.includes(keyword))
  );
};

function TreasurerDashboard() {
  const navigate = useNavigate();

  const [approver, setApprover] = useState(null);
  const [financialSteps, setFinancialSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingStepId, setReviewingStepId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [cycleFilter, setCycleFilter] = useState("All");

  const [selectedFinancialStep, setSelectedFinancialStep] =
    useState(null);
  const [showFinancialModal, setShowFinancialModal] =
    useState(false);
  const [savingFinancialDecision, setSavingFinancialDecision] =
    useState(false);
  const [financialForm, setFinancialForm] =
    useState(DEFAULT_FINANCIAL_FORM);

  const [showPaymentImport, setShowPaymentImport] =
    useState(false);
  const [selectedPaymentStep, setSelectedPaymentStep] =
    useState(null);
  const [showUpdatePayment, setShowUpdatePayment] =
    useState(false);
  const [showPaymentHistory, setShowPaymentHistory] =
    useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        navigate("/login", { replace: true });
        return;
      }

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

      if (approverProfile?.role !== "Approver") {
        throw new Error(
          "This page is only available to approver accounts."
        );
      }

      if (approverProfile?.status !== "Active") {
        throw new Error(
          "Your approver account is not active."
        );
      }

      const {
        data: assignments,
        error: assignmentError,
      } = await supabase
        .from("approver_assignments")
        .select(`
          id,
          office_id,
          approver_id,
          is_active,
          offices (
            id,
            office_name,
            office_code,
            is_active
          )
        `)
        .eq("approver_id", approverProfile.id)
        .eq("is_active", true)
        .not("office_id", "is", null);

      if (assignmentError) {
        throw assignmentError;
      }

      const financialAssignments = (
        assignments || []
      ).filter(
        (assignment) =>
          assignment.offices?.is_active !== false &&
          isFinancialOffice(assignment.offices)
      );

      if (!financialAssignments.length) {
        throw new Error(
          "This account is not assigned to the Treasurer / Cashier office."
        );
      }

      setApprover(approverProfile);

      const financialOfficeIds = uniqueIds(
        financialAssignments.map(
          (assignment) => assignment.office_id
        )
      );

      const {
        data: rawSteps,
        error: stepError,
      } = await supabase
        .from("clearance_steps")
        .select(`
          id,
          clearance_request_id,
          office_id,
          approver_id,
          status,
          remarks,
          reviewed_at,
          financial_decision,
          remaining_balance,
          payment_due_date,
          consent_confirmed,
          financial_notes,
          financial_reviewed_at,
          financial_reviewed_by
        `)
        .eq("approver_id", approverProfile.id)
        .in("office_id", financialOfficeIds);

      if (stepError) throw stepError;

      const safeSteps = rawSteps || [];
      const requestIds = uniqueIds(
        safeSteps.map(
          (step) => step.clearance_request_id
        )
      );

      if (!requestIds.length) {
        setFinancialSteps([]);
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
          requested_at,
          updated_at,
          completed_at
        `)
        .in("id", requestIds);

      if (requestError) throw requestError;

      const safeRequests = requests || [];
      const studentIds = uniqueIds(
        safeRequests.map(
          (request) => request.student_id
        )
      );
      const sectionIds = uniqueIds(
        safeRequests.map(
          (request) => request.section_id
        )
      );

      let students = [];
      let sections = [];
      let courses = [];
      let paymentRecords = [];

      if (studentIds.length) {
        const {
          data: studentRows,
          error: studentError,
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

        if (studentError) throw studentError;

        students = studentRows || [];

        const {
          data: paymentRows,
          error: paymentError,
        } = await supabase
          .from("payment_records")
          .select(`
            id,
            student_id,
            school_year,
            semester,
            amount_due,
            amount_paid,
            balance,
            payment_status,
            reference_number,
            remarks,
            imported_at,
            updated_at
          `)
          .in("student_id", studentIds);

        if (paymentError) {
          console.warn(
            "Unable to load payment records:",
            paymentError
          );
        } else {
          paymentRecords = paymentRows || [];
        }
      }

      if (sectionIds.length) {
        const {
          data: sectionRows,
          error: sectionError,
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

        if (sectionError) throw sectionError;

        sections = sectionRows || [];
      }

      const courseIds = uniqueIds(
        sections.map(
          (section) => section.course_id
        )
      );

      if (courseIds.length) {
        const {
          data: courseRows,
          error: courseError,
        } = await supabase
          .from("courses")
          .select(`
            id,
            course_code,
            course_name
          `)
          .in("id", courseIds);

        if (courseError) throw courseError;

        courses = courseRows || [];
      }

      const requestMap = new Map(
        safeRequests.map((request) => [
          request.id,
          request,
        ])
      );

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

      const paymentMap = new Map(
        paymentRecords.map((record) => [
          buildPaymentRecordKey({
            studentId: record.student_id,
            schoolYear: record.school_year,
            semester: record.semester,
          }),
          record,
        ])
      );

      const enriched = safeSteps
        .map((step) => {
          const request = requestMap.get(
            step.clearance_request_id
          );

          if (!request) return null;

          const student = studentMap.get(
            request.student_id
          );

          if (!student) return null;

          const section = sectionMap.get(
            request.section_id
          );

          const course = section?.course_id
            ? courseMap.get(section.course_id)
            : null;

          const paymentRecord =
            paymentMap.get(
              buildPaymentRecordKey({
                studentId: request.student_id,
                schoolYear: request.school_year,
                semester: request.semester,
              })
            ) || null;

          return {
            ...step,
            request,
            student,
            section,
            course,
            paymentRecord,

            courseCode:
              course?.course_code ||
              section?.course ||
              student?.course ||
              "N/A",

            courseName:
              course?.course_name || "",

            yearLevel: normalizeYearLevel(
              section?.year_level ||
                student?.year_level
            ),

            blockCode: String(
              section?.block_code ||
                student?.section ||
                "N/A"
            ).trim(),

            schoolYear:
              request.school_year ||
              student?.school_year ||
              "N/A",

            semester:
              request.semester ||
              student?.semester ||
              "N/A",
          };
        })
        .filter(Boolean);

      setFinancialSteps(enriched);
    } catch (error) {
      console.error(
        "Treasurer dashboard load error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Treasurer Dashboard",
        text:
          error?.message ||
          "Something went wrong while loading the Treasurer dashboard.",
      });
    } finally {
      setLoading(false);
    }
  };

  const courseOptions = useMemo(
    () =>
      [...new Set(
        financialSteps
          .map((step) => step.courseCode)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b)),
    [financialSteps]
  );

  const yearOptions = useMemo(
    () =>
      [...new Set(
        financialSteps
          .map((step) => step.yearLevel)
          .filter(Boolean)
      )].sort(
        (a, b) =>
          getYearSortValue(a) -
          getYearSortValue(b)
      ),
    [financialSteps]
  );

  const cycleOptions = useMemo(
    () =>
      [...new Set(
        financialSteps
          .map((step) =>
            [
              step.semester,
              step.schoolYear,
            ]
              .filter(Boolean)
              .join(" • ")
          )
          .filter(Boolean)
      )].sort((a, b) => b.localeCompare(a)),
    [financialSteps]
  );

  const filteredFinancialSteps = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return financialSteps
      .filter((step) => {
        if (
          statusFilter !== "All" &&
          step.status !== statusFilter
        ) {
          return false;
        }

        if (
          courseFilter !== "All" &&
          step.courseCode !== courseFilter
        ) {
          return false;
        }

        if (
          yearFilter !== "All" &&
          step.yearLevel !== yearFilter
        ) {
          return false;
        }

        const cycleLabel = [
          step.semester,
          step.schoolYear,
        ]
          .filter(Boolean)
          .join(" • ");

        if (
          cycleFilter !== "All" &&
          cycleLabel !== cycleFilter
        ) {
          return false;
        }

        if (!query) return true;

        return [
          step.student?.full_name,
          step.student?.student_id,
          step.student?.email,
          step.courseCode,
          step.courseName,
          step.yearLevel,
          step.blockCode,
          step.semester,
          step.schoolYear,
          step.financial_decision,
          step.paymentRecord?.payment_status,
          step.paymentRecord?.reference_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const order = {
          Pending: 0,
          Rejected: 1,
          Approved: 2,
        };

        const statusDifference =
          (order[a.status] ?? 3) -
          (order[b.status] ?? 3);

        if (statusDifference !== 0) {
          return statusDifference;
        }

        return String(
          a.student?.full_name || ""
        ).localeCompare(
          String(
            b.student?.full_name || ""
          )
        );
      });
  }, [
    financialSteps,
    searchTerm,
    statusFilter,
    courseFilter,
    yearFilter,
    cycleFilter,
  ]);

  const summary = useMemo(
    () => ({
      pending: financialSteps.filter(
        (step) => step.status === "Pending"
      ).length,

      cleared: financialSteps.filter(
        (step) => step.status === "Approved"
      ).length,

      agreements: financialSteps.filter(
        (step) =>
          [
            "Payment Agreement",
            "Deferred Payment",
          ].includes(step.financial_decision)
      ).length,

      notCleared: financialSteps.filter(
        (step) =>
          step.status === "Rejected" ||
          step.financial_decision ===
            "Not Cleared"
      ).length,
    }),
    [financialSteps]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setCourseFilter("All");
    setYearFilter("All");
    setCycleFilter("All");
  };

  const openFinancialReview = (step) => {
    const paymentBalance = Number(
      step.paymentRecord?.balance
    );

    const existingBalance = Number(
      step.remaining_balance
    );

    const currentBalance = Number.isFinite(
      paymentBalance
    )
      ? paymentBalance
      : Number.isFinite(existingBalance)
      ? existingBalance
      : 0;

    let defaultDecision =
      step.financial_decision ||
      (step.paymentRecord?.payment_status ===
      "Cleared"
        ? "Fully Paid"
        : "Not Cleared");

    if (
      defaultDecision ===
        "Payment Agreement" ||
      defaultDecision ===
        "Deferred Payment"
    ) {
      // keep previous conditional decision
    } else if (currentBalance <= 0) {
      defaultDecision = "Fully Paid";
    } else if (!step.financial_decision) {
      defaultDecision = "Not Cleared";
    }

    setSelectedFinancialStep(step);
    setFinancialForm({
      decision: defaultDecision,
      remainingBalance:
        currentBalance > 0
          ? String(currentBalance)
          : "",
      paymentDueDate:
        step.payment_due_date || "",
      consentConfirmed: Boolean(
        step.consent_confirmed
      ),
      remarks:
        step.financial_notes ||
        step.remarks ||
        "",
    });
    setShowFinancialModal(true);
  };

  const closeFinancialReview = () => {
    if (savingFinancialDecision) return;

    setShowFinancialModal(false);
    setSelectedFinancialStep(null);
    setFinancialForm(
      DEFAULT_FINANCIAL_FORM
    );
  };

  const handleFinancialDecisionChange = (
    value
  ) => {
    setFinancialForm((previous) => {
      const next = {
        ...previous,
        decision: value,
      };

      if (value === "Fully Paid") {
        next.remainingBalance = "";
        next.paymentDueDate = "";
        next.consentConfirmed = false;
      }

      if (value === "Not Cleared") {
        next.paymentDueDate = "";
        next.consentConfirmed = false;
      }

      return next;
    });
  };

  const submitFinancialReview = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedFinancialStep) return;

    const decision =
      financialForm.decision;

    const isConditional = [
      "Payment Agreement",
      "Deferred Payment",
    ].includes(decision);

    const balance =
      decision === "Fully Paid"
        ? 0
        : Number(
            financialForm.remainingBalance
          );

    const remarks =
      financialForm.remarks.trim();

    if (
      decision !== "Fully Paid" &&
      (
        !Number.isFinite(balance) ||
        balance < 0
      )
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Valid Balance Required",
        text:
          "Enter the student's current remaining balance.",
      });

      return;
    }

    if (
      isConditional &&
      balance <= 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Remaining Balance Required",
        text:
          "Conditional clearance requires a remaining balance greater than zero.",
      });

      return;
    }

    if (
      isConditional &&
      !financialForm.paymentDueDate
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Payment Date Required",
        text:
          "Select the agreed date when the remaining balance will be paid.",
      });

      return;
    }

    if (
      isConditional &&
      !financialForm.consentConfirmed
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Consent Confirmation Required",
        text:
          "Confirm that the student or parent accepted the payment agreement.",
      });

      return;
    }

    if (
      (
        isConditional ||
        decision === "Not Cleared"
      ) &&
      !remarks
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Remarks Required",
        text:
          decision === "Not Cleared"
            ? "Explain why the student is not financially cleared."
            : "Record the payment agreement details.",
      });

      return;
    }

    const confirmation =
      await Swal.fire({
        icon:
          decision === "Not Cleared"
            ? "warning"
            : "question",
        title:
          decision === "Not Cleared"
            ? "Mark as Not Cleared?"
            : "Save Financial Decision?",
        html: `
          <div style="text-align:left;line-height:1.65">
            <p><strong>Student:</strong> ${
              selectedFinancialStep.student
                ?.full_name || "Student"
            }</p>
            <p><strong>Decision:</strong> ${decision}</p>
            <p><strong>Balance:</strong> ${formatCurrency(
              balance
            )}</p>
            ${
              isConditional
                ? `<p><strong>Payment due:</strong> ${financialForm.paymentDueDate}</p>`
                : ""
            }
          </div>
        `,
        showCancelButton: true,
        confirmButtonText:
          decision === "Not Cleared"
            ? "Confirm Not Cleared"
            : "Save Decision",
        confirmButtonColor:
          decision === "Not Cleared"
            ? "#dc2626"
            : "#15803d",
        cancelButtonText: "Cancel",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setSavingFinancialDecision(true);
      setReviewingStepId(
        selectedFinancialStep.id
      );

      const { data, error } =
        await supabase.rpc(
          "review_financial_clearance_step",
          {
            p_step_id:
              selectedFinancialStep.id,
            p_decision: decision,
            p_remaining_balance:
              decision === "Fully Paid"
                ? 0
                : balance,
            p_payment_due_date:
              isConditional
                ? financialForm.paymentDueDate
                : null,
            p_consent_confirmed:
              isConditional
                ? financialForm.consentConfirmed
                : false,
            p_remarks:
              remarks || null,
          }
        );

      if (error) throw error;

      setShowFinancialModal(false);
      setSelectedFinancialStep(null);
      setFinancialForm(DEFAULT_FINANCIAL_FORM);

      await Swal.fire({
        icon:
          decision === "Not Cleared"
            ? "info"
            : "success",
        title:
          data?.requestCompleted
            ? "Clearance Completed"
            : "Financial Decision Saved",
        text:
          data?.requestCompleted
            ? "All required clearance steps for this student are now approved."
            : "The Treasurer clearance decision was saved successfully.",
      });

      await loadDashboard();
    } catch (error) {
      console.error(
        "Financial review error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Save Decision",
        text:
          error?.message ||
          "The financial clearance decision could not be saved.",
      });
    } finally {
      setSavingFinancialDecision(false);
      setReviewingStepId(null);
    }
  };

  const exportPaymentRecords = async () => {
    try {
      if (!filteredFinancialSteps.length) {
        await Swal.fire({
          icon: "info",
          title: "No Records to Export",
          text:
            "There are no financial records matching the current filters.",
        });
        return;
      }

      const escapeCsv = (value) => {
        const normalized =
          value === null ||
          value === undefined
            ? ""
            : String(value);

        return `"${normalized.replace(
          /"/g,
          '""'
        )}"`;
      };

      const headers = [
        "Student ID",
        "Student Name",
        "Course",
        "Year Level",
        "Block",
        "School Year",
        "Semester",
        "Amount Due",
        "Amount Paid",
        "Balance",
        "Payment Status",
        "OR / Reference Number",
        "Payment Remarks",
        "Clearance Status",
        "Treasurer Decision",
        "Clearance Remarks",
        "Financial Record Updated",
      ];

      const rows =
        filteredFinancialSteps.map(
          (item) => {
            const record =
              item.paymentRecord || {};

            return [
              item.student?.student_id ||
                "",
              item.student?.full_name ||
                "",
              item.courseCode || "",
              item.yearLevel || "",
              item.blockCode || "",
              item.schoolYear ||
                record.school_year ||
                "",
              item.semester ||
                record.semester ||
                "",
              Number(
                record.amount_due || 0
              ).toFixed(2),
              Number(
                record.amount_paid || 0
              ).toFixed(2),
              Number(
                record.balance || 0
              ).toFixed(2),
              record.payment_status ||
                "No Record",
              record.reference_number ||
                "",
              record.remarks || "",
              item.status || "",
              item.financial_decision ||
                "",
              item.remarks || "",
              record.updated_at
                ? new Date(
                    record.updated_at
                  ).toLocaleString(
                    "en-PH"
                  )
                : "",
            ];
          }
        );

      const csv = [
        headers
          .map(escapeCsv)
          .join(","),
        ...rows.map((row) =>
          row
            .map(escapeCsv)
            .join(",")
        ),
      ].join("\r\n");

      const blob = new Blob(
        ["\uFEFF", csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

      const url =
        URL.createObjectURL(blob);
      const link =
        document.createElement("a");

      const now = new Date();
      const datePart = [
        now.getFullYear(),
        String(
          now.getMonth() + 1
        ).padStart(2, "0"),
        String(now.getDate()).padStart(
          2,
          "0"
        ),
      ].join("-");

      link.href = url;
      link.download = `SmartClear-Payment-Records-${datePart}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await Swal.fire({
        icon: "success",
        title: "Payment Records Exported",
        text: `${filteredFinancialSteps.length} record(s) were exported.`,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "Export payment records error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Export Failed",
        text:
          error?.message ||
          "Unable to export the payment records.",
      });
    }
  };

  if (loading) {
    return (
      <TreasurerLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="mt-4 font-semibold text-slate-600">
              Loading Treasurer Dashboard...
            </p>
          </div>
        </div>
      </TreasurerLayout>
    );
  }

  return (
    <TreasurerLayout>
      <div className="space-y-5 pt-10 md:pt-12">
        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg"
        >
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  <FaMoneyBillWave />
                  Treasurer Workspace
                </div>

                <h1 className="text-2xl font-black md:text-3xl">
                  Financial Clearance Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Welcome,{" "}
                  {approver?.full_name ||
                    "Treasurer"}. Review
                  financial clearance,
                  track balances, record
                  payments, and maintain
                  payment history in one
                  workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/treasurer/ready-for-enrollment"
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <FaGraduationCap />
                  Ready for Enrollment
                </button>

                <button
                  type="button"
                  onClick={loadDashboard}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  <FaSyncAlt />
                  Refresh Queue
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pending Review",
              value: summary.pending,
              icon: (
                <FaClipboardList />
              ),
              tone:
                "bg-amber-50 text-amber-700 ring-amber-200",
            },
            {
              label:
                "Financially Cleared",
              value: summary.cleared,
              icon: (
                <FaCheckCircle />
              ),
              tone:
                "bg-emerald-50 text-emerald-700 ring-emerald-200",
            },
            {
              label: "With Agreement",
              value: summary.agreements,
              icon: <FaFileAlt />,
              tone:
                "bg-blue-50 text-blue-700 ring-blue-200",
            },
            {
              label: "Not Cleared",
              value: summary.notCleared,
              icon: (
                <FaTimesCircle />
              ),
              tone:
                "bg-red-50 text-red-700 ring-red-200",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.25,
                delay:
                  index * 0.04,
              }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {item.value}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg ring-1 ring-inset ${item.tone}`}
                >
                  {item.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Student Financial Queue
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Payment records and
                  clearance decisions are
                  intentionally tracked
                  separately.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    exportPaymentRecords
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FaDownload />
                  Export Records
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowPaymentImport(
                      true
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800"
                >
                  <FaFileAlt />
                  Import Payment Records
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_170px_160px_160px_210px_auto]">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search student name or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">
                  All Statuses
                </option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Approved">
                  Approved
                </option>
                <option value="Rejected">
                  Rejected
                </option>
              </select>

              <select
                value={courseFilter}
                onChange={(event) =>
                  setCourseFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">
                  All Courses
                </option>
                {courseOptions.map(
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
                value={yearFilter}
                onChange={(event) =>
                  setYearFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">
                  All Years
                </option>
                {yearOptions.map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      Year {year}
                    </option>
                  )
                )}
              </select>

              <select
                value={cycleFilter}
                onChange={(event) =>
                  setCycleFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">
                  All Clearance Cycles
                </option>
                {cycleOptions.map(
                  (cycle) => (
                    <option
                      key={cycle}
                      value={cycle}
                    >
                      {cycle}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {filteredFinancialSteps.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <FaWallet className="mx-auto text-4xl text-slate-300" />
                <h3 className="mt-4 text-lg font-black text-slate-800">
                  No Financial Records
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No student financial
                  clearance record matches
                  the current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFinancialSteps.map(
                  (item) => {
                    const paymentRecord =
                      item.paymentRecord;
                    const balance = Number(
                      paymentRecord?.balance ||
                        0
                    );

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md md:p-5"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-black text-slate-900">
                                {item.student
                                  ?.full_name ||
                                  "Student"}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-black ${clearanceStatusClass(
                                  item.status
                                )}`}
                              >
                                {item.status ||
                                  "Pending"}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-black ${paymentStatusClass(
                                  paymentRecord?.payment_status
                                )}`}
                              >
                                {paymentRecord?.payment_status ||
                                  "No Record"}
                              </span>

                              {item.financial_decision && (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-black ${financialDecisionClass(
                                    item.financial_decision
                                  )}`}
                                >
                                  {
                                    item.financial_decision
                                  }
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {item.student
                                ?.student_id ||
                                "No Student ID"}{" "}
                              •{" "}
                              {
                                item.courseCode
                              }{" "}
                              • Year{" "}
                              {
                                item.yearLevel
                              }{" "}
                              • Block{" "}
                              {
                                item.blockCode
                              }
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {
                                item.semester
                              }{" "}
                              •{" "}
                              {
                                item.schoolYear
                              }
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Amount Due
                                </p>
                                <p className="mt-1 font-black text-slate-800">
                                  {paymentRecord
                                    ? formatCurrency(
                                        paymentRecord.amount_due
                                      )
                                    : "No Record"}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Amount Paid
                                </p>
                                <p className="mt-1 font-black text-slate-800">
                                  {paymentRecord
                                    ? formatCurrency(
                                        paymentRecord.amount_paid
                                      )
                                    : "No Record"}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Balance
                                </p>
                                <p
                                  className={`mt-1 font-black ${
                                    balance > 0
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {paymentRecord
                                    ? formatCurrency(
                                        paymentRecord.balance
                                      )
                                    : "No Record"}
                                </p>
                              </div>
                            </div>

                            {paymentRecord?.reference_number && (
                              <p className="mt-3 text-xs font-semibold text-slate-500">
                                OR / Payment
                                Reference:{" "}
                                <span className="text-slate-700">
                                  {
                                    paymentRecord.reference_number
                                  }
                                </span>
                              </p>
                            )}

                            {paymentRecord?.updated_at && (
                              <p className="mt-1 text-xs text-slate-400">
                                Payment record
                                updated{" "}
                                {formatDate(
                                  paymentRecord.updated_at
                                )}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 xl:max-w-[430px] xl:justify-end">
                            {paymentRecord &&
                              balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentStep(
                                      item
                                    );
                                    setShowUpdatePayment(
                                      true
                                    );
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
                                >
                                  <FaMoneyBillWave />
                                  Update Payment
                                </button>
                              )}

                            {paymentRecord && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPaymentStep(
                                    item
                                  );
                                  setShowPaymentHistory(
                                    true
                                  );
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                <FaHistory />
                                History
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openFinancialReview(
                                  item
                                )
                              }
                              disabled={
                                reviewingStepId ===
                                item.id
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaClipboardList />
                              Review / Update
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {showPaymentImport && (
        <PaymentRecordsImport
          onClose={() =>
            setShowPaymentImport(false)
          }
          onImported={async () => {
            setShowPaymentImport(false);
            await loadDashboard();
          }}
        />
      )}

      {showUpdatePayment &&
        selectedPaymentStep?.paymentRecord && (
          <UpdatePaymentModal
            studentName={
              selectedPaymentStep.student
                ?.full_name || "Student"
            }
            studentNumber={
              selectedPaymentStep.student
                ?.student_id || ""
            }
            paymentRecord={
              selectedPaymentStep.paymentRecord
            }
            onClose={() => {
              setShowUpdatePayment(false);
              setSelectedPaymentStep(null);
            }}
            onUpdated={async () => {
              await loadDashboard();
            }}
          />
        )}

      {showPaymentHistory &&
        selectedPaymentStep?.paymentRecord && (
          <PaymentHistoryModal
            studentName={
              selectedPaymentStep.student
                ?.full_name || "Student"
            }
            studentNumber={
              selectedPaymentStep.student
                ?.student_id || ""
            }
            paymentRecord={
              selectedPaymentStep.paymentRecord
            }
            onClose={() => {
              setShowPaymentHistory(false);
              setSelectedPaymentStep(null);
            }}
          />
        )}

      {showFinancialModal &&
        selectedFinancialStep && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
              <div className="border-b border-slate-200 p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                      Treasurer Review
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">
                      {
                        selectedFinancialStep
                          .student?.full_name
                      }
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {
                        selectedFinancialStep
                          .student?.student_id
                      }{" "}
                      •{" "}
                      {
                        selectedFinancialStep.courseCode
                      }{" "}
                      • Year{" "}
                      {
                        selectedFinancialStep.yearLevel
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeFinancialReview
                    }
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <form
                onSubmit={
                  submitFinancialReview
                }
                className="space-y-5 p-5 md:p-6"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Due
                    </p>
                    <p className="mt-1 font-black text-slate-800">
                      {selectedFinancialStep.paymentRecord
                        ? formatCurrency(
                            selectedFinancialStep.paymentRecord.amount_due
                          )
                        : "No Record"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Paid
                    </p>
                    <p className="mt-1 font-black text-slate-800">
                      {selectedFinancialStep.paymentRecord
                        ? formatCurrency(
                            selectedFinancialStep.paymentRecord.amount_paid
                          )
                        : "No Record"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Balance
                    </p>
                    <p className="mt-1 font-black text-slate-800">
                      {selectedFinancialStep.paymentRecord
                        ? formatCurrency(
                            selectedFinancialStep.paymentRecord.balance
                          )
                        : "No Record"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Clearance Decision
                  </label>

                  <select
                    value={
                      financialForm.decision
                    }
                    onChange={(event) =>
                      handleFinancialDecisionChange(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="Fully Paid">
                      Fully Paid
                    </option>
                    <option value="Payment Agreement">
                      With Agreement
                    </option>
                    <option value="Deferred Payment">
                      Deferred Payment
                    </option>
                    <option value="Not Cleared">
                      Not Cleared
                    </option>
                  </select>
                </div>

                {financialForm.decision !==
                  "Fully Paid" && (
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Remaining Balance
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        financialForm.remainingBalance
                      }
                      onChange={(event) =>
                        setFinancialForm(
                          (previous) => ({
                            ...previous,
                            remainingBalance:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                )}

                {[
                  "Payment Agreement",
                  "Deferred Payment",
                ].includes(
                  financialForm.decision
                ) && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-700">
                        Agreed Payment Date
                      </label>

                      <input
                        type="date"
                        value={
                          financialForm.paymentDueDate
                        }
                        onChange={(event) =>
                          setFinancialForm(
                            (previous) => ({
                              ...previous,
                              paymentDueDate:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <input
                        type="checkbox"
                        checked={
                          financialForm.consentConfirmed
                        }
                        onChange={(event) =>
                          setFinancialForm(
                            (previous) => ({
                              ...previous,
                              consentConfirmed:
                                event.target
                                  .checked,
                            })
                          )
                        }
                        className="mt-1"
                      />

                      <span className="text-sm font-semibold leading-6 text-blue-900">
                        Student or parent
                        confirmed and accepted
                        the recorded payment
                        agreement.
                      </span>
                    </label>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Remarks
                  </label>

                  <textarea
                    rows={4}
                    value={
                      financialForm.remarks
                    }
                    onChange={(event) =>
                      setFinancialForm(
                        (previous) => ({
                          ...previous,
                          remarks:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Record financial clearance notes or agreement details..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                  Payment status is an
                  accounting record. Saving
                  this clearance decision
                  does not create an official
                  receipt and does not alter
                  the recorded payment
                  transactions.
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={
                      closeFinancialReview
                    }
                    disabled={
                      savingFinancialDecision
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      savingFinancialDecision
                    }
                    className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingFinancialDecision
                      ? "Saving..."
                      : "Save Decision"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
    </TreasurerLayout>
  );
}

export default TreasurerDashboard;
