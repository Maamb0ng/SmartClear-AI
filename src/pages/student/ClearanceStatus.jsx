import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";
import { supabase } from "../../services/supabase";
import { sendClearancePassEmail } from "../../services/clearancePassEmailService";

import {
  FaArrowLeft,
  FaBook,
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaClipboardCheck,
  FaEnvelope,
  FaExclamationCircle,
  FaGraduationCap,
  FaPrint,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
  FaUserGraduate,
} from "react-icons/fa";

/* ============================================================
   HELPERS
============================================================ */

const escapeHtml = (value) =>
  String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function ClearanceStatus() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [clearanceRequest, setClearanceRequest] = useState(null);
  const [steps, setSteps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [clearancePass, setClearancePass] = useState(null);
  const [loadingPass, setLoadingPass] = useState(false);
  const [showClearancePass, setShowClearancePass] = useState(false);

  const [sendingPassEmail, setSendingPassEmail] = useState(false);
  const [passEmailResult, setPassEmailResult] = useState(null);

  /* ============================================================
     LOAD CLEARANCE
  ============================================================ */

  const loadClearanceStatus = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        throw new Error(
          "Please log in to view your clearance status."
        );
      }

      const {
        data: studentData,
        error: studentError,
      } = await supabase
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
          school_year
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (studentError) {
        throw studentError;
      }

      if (studentData.role !== "Student") {
        throw new Error(
          "Only student accounts can view this page."
        );
      }

      setStudent(studentData);

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("clearance_requests")
        .select(`
          id,
          student_id,
          school_year,
          semester,
          status,
          remarks,
          requested_at,
          updated_at,
          completed_at
        `)
        .eq("student_id", studentData.id)
        .order("requested_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (requestError) {
        throw requestError;
      }

      setClearanceRequest(requestData || null);

      if (!requestData) {
        setSteps([]);
        return;
      }

      const {
        data: stepData,
        error: stepError,
      } = await supabase
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
          ),
          users!clearance_steps_approver_id_fkey (
            id,
            full_name,
            employee_id
          )
        `)
        .eq(
          "clearance_request_id",
          requestData.id
        );

      if (stepError) {
        throw stepError;
      }

      const sortedSteps = (stepData || []).sort(
        (a, b) => {
          const first =
            a.offices?.office_name ||
            a.subjects?.subject_name ||
            "";

          const second =
            b.offices?.office_name ||
            b.subjects?.subject_name ||
            "";

          return first.localeCompare(second);
        }
      );

      setSteps(sortedSteps);
    } catch (error) {
      console.error(
        "Clearance status error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Clearance Status",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClearanceStatus();
  }, [loadClearanceStatus]);

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics = useMemo(() => {
    const total = steps.length;

    const approved = steps.filter(
      (step) => step.status === "Approved"
    ).length;

    const pending = steps.filter(
      (step) => step.status === "Pending"
    ).length;

    const rejected = steps.filter(
      (step) => step.status === "Rejected"
    ).length;

    const percentage =
      total > 0
        ? Math.round((approved / total) * 100)
        : 0;

    return {
      total,
      approved,
      pending,
      rejected,
      percentage,
    };
  }, [steps]);

  const officeSteps = useMemo(
    () =>
      steps.filter(
        (step) => !step.subject_id
      ),
    [steps]
  );

  const subjectSteps = useMemo(
    () =>
      steps.filter(
        (step) => Boolean(step.subject_id)
      ),
    [steps]
  );

  /* ============================================================
     DIGITAL CLEARANCE PASS
  ============================================================ */

  const loadDigitalClearancePass = useCallback(
    async ({
      openModal = true,
      showError = true,
    } = {}) => {
      if (
        !clearanceRequest?.id ||
        clearanceRequest.status !== "Completed"
      ) {
        if (showError) {
          await Swal.fire({
            icon: "info",
            title: "Clearance Not Completed",
            text:
              "Your Digital Clearance Pass becomes available after every subject and office clearance step is approved.",
          });
        }

        return null;
      }

      try {
        setLoadingPass(true);

        const { data, error } =
          await supabase.rpc(
            "get_my_clearance_pass",
            {
              p_request_id:
                clearanceRequest.id,
            }
          );

        if (error) {
          throw error;
        }

        if (
          !data?.success ||
          !data?.clearedForEnrollment
        ) {
          throw new Error(
            "Your Digital Clearance Pass is not ready for enrollment verification."
          );
        }

        setClearancePass(data);

        if (openModal) {
          setShowClearancePass(true);
        }

        return data;
      } catch (error) {
        console.error(
          "Load Digital Clearance Pass:",
          error
        );

        if (showError) {
          await Swal.fire({
            icon: "error",
            title: "Unable to Load Digital Pass",
            text:
              error?.message ||
              "Your Digital Clearance Pass could not be loaded.",
          });
        }

        return null;
      } finally {
        setLoadingPass(false);
      }
    },
    [
      clearanceRequest?.id,
      clearanceRequest?.status,
    ]
  );

  /* ============================================================
     EMAIL PASS
  ============================================================ */

  const handleSendPassEmail = useCallback(
    async ({
      force = true,
      showSuccess = true,
    } = {}) => {
      if (
        !clearanceRequest?.id ||
        clearanceRequest.status !== "Completed"
      ) {
        if (showSuccess) {
          await Swal.fire({
            icon: "info",
            title: "Clearance Not Completed",
            text:
              "The pass can only be emailed after your clearance is completed.",
          });
        }

        return null;
      }

      try {
        setSendingPassEmail(true);

        const result =
          await sendClearancePassEmail({
            requestId: clearanceRequest.id,
            force,
          });

        setPassEmailResult(result);

        if (showSuccess) {
          await Swal.fire({
            icon: "success",
            title:
              result?.alreadySent &&
              !result?.resent
                ? "Pass Already Emailed"
                : "Digital Pass Emailed",
            text:
              result?.alreadySent &&
              !result?.resent
                ? `The Digital Clearance Pass was already sent to ${
                    result.recipientEmail ||
                    student?.email ||
                    "your email"
                  }.`
                : `The Digital Clearance Pass was sent to ${
                    result?.recipientEmail ||
                    student?.email ||
                    "your email"
                  }.`,
          });
        }

        return result;
      } catch (error) {
        console.error(
          "Send clearance pass email:",
          error
        );

        if (showSuccess) {
          await Swal.fire({
            icon: "error",
            title: "Unable to Email Digital Pass",
            text:
              error?.message ||
              "The Digital Clearance Pass could not be emailed.",
          });
        }

        return null;
      } finally {
        setSendingPassEmail(false);
      }
    },
    [
      clearanceRequest?.id,
      clearanceRequest?.status,
      student?.email,
    ]
  );

  /* ============================================================
     AUTO LOAD / EMAIL COMPLETED PASS
  ============================================================ */

  useEffect(() => {
    if (
      clearanceRequest?.status !== "Completed" ||
      !clearanceRequest?.id
    ) {
      setClearancePass(null);
      setPassEmailResult(null);
      return;
    }

    loadDigitalClearancePass({
      openModal: false,
      showError: false,
    });

    handleSendPassEmail({
      force: false,
      showSuccess: false,
    });
  }, [
    clearanceRequest?.id,
    clearanceRequest?.status,
    loadDigitalClearancePass,
    handleSendPassEmail,
  ]);

  /* ============================================================
     FORMATTERS
  ============================================================ */

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString(
      "en-PH",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const getStepName = (step) =>
    step.offices?.office_name ||
    step.subjects?.subject_name ||
    "Unassigned Clearance Step";

  const getStepCode = (step) =>
    step.offices?.office_code ||
    step.subjects?.subject_code ||
    "No code";

  const getApproverName = (step) =>
    step.users?.full_name ||
    "No approver assigned";

  const getStepType = (step) =>
    step.subject_id ? "Subject" : "Office";

  const getStatusIcon = (status) => {
    if (status === "Approved") {
      return <FaCheckCircle />;
    }

    if (status === "Rejected") {
      return <FaTimesCircle />;
    }

    return <FaClock />;
  };

  const getStatusClass = (status) => {
    if (status === "Approved") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "Rejected") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const getOverallStatusClass = (status) => {
    if (status === "Completed") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "Rejected") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (status === "In Progress") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  /* ============================================================
     PRINT / SAVE PDF
  ============================================================ */

  const handlePrintClearancePass = () => {
    if (!clearancePass) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=760"
    );

    if (!printWindow) {
      Swal.fire({
        icon: "warning",
        title: "Popup Blocked",
        text:
          "Allow popups for this website before printing the Digital Clearance Pass.",
      });

      return;
    }

    const courseDisplay = [
      clearancePass.courseCode,
      clearancePass.courseName,
    ]
      .filter(Boolean)
      .join(" — ");

    const classDisplay = [
      clearancePass.yearLevel,
      clearancePass.blockCode
        ? `Block ${clearancePass.blockCode}`
        : null,
    ]
      .filter(Boolean)
      .join(" — ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>${escapeHtml(
            clearancePass.clearanceReference
          )}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #f1f5f9;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .pass {
              max-width: 820px;
              margin: 0 auto;
              overflow: hidden;
              border: 1px solid #cbd5e1;
              border-radius: 20px;
              background: white;
            }

            .header {
              padding: 30px;
              background: linear-gradient(
                135deg,
                #1d4ed8,
                #4338ca
              );
              color: white;
              text-align: center;
            }

            .header h1 {
              margin: 0;
              font-size: 30px;
            }

            .header p {
              margin: 8px 0 0;
              color: #dbeafe;
            }

            .status {
              display: inline-block;
              margin-top: 18px;
              padding: 10px 16px;
              border-radius: 999px;
              background: #dcfce7;
              color: #15803d;
              font-size: 13px;
              font-weight: 700;
            }

            .content {
              padding: 30px;
            }

            .name {
              font-size: 26px;
              font-weight: 700;
              text-align: center;
            }

            .student-id {
              margin-top: 6px;
              color: #64748b;
              text-align: center;
            }

            .grid {
              display: grid;
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-top: 26px;
            }

            .field {
              padding: 16px;
              border-radius: 12px;
              background: #f8fafc;
            }

            .label {
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .value {
              margin-top: 7px;
              font-size: 15px;
              font-weight: 700;
            }

            .verify {
              margin-top: 22px;
              padding: 22px;
              border: 2px dashed #93c5fd;
              border-radius: 14px;
              background: #eff6ff;
              text-align: center;
            }

            .reference {
              margin-top: 8px;
              color: #1d4ed8;
              font-size: 20px;
              font-weight: 700;
            }

            .code {
              margin-top: 10px;
              padding: 12px;
              border-radius: 10px;
              background: white;
              font-family: monospace;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: .1em;
            }

            .footer {
              padding: 18px 30px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 11px;
              line-height: 1.6;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
                background: white;
              }

              .pass {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="pass">
            <div class="header">
              <h1>SmartClear AI</h1>
              <p>Official Digital Clearance Pass</p>

              <div class="status">
                CLEARED FOR ENROLLMENT
              </div>
            </div>

            <div class="content">
              <div class="name">
                ${escapeHtml(
                  clearancePass.studentName
                )}
              </div>

              <div class="student-id">
                Student Number:
                ${escapeHtml(
                  clearancePass.studentId
                )}
              </div>

              <div class="grid">
                <div class="field">
                  <div class="label">Program</div>
                  <div class="value">
                    ${escapeHtml(courseDisplay)}
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    Year and Block
                  </div>
                  <div class="value">
                    ${escapeHtml(classDisplay)}
                  </div>
                </div>

                <div class="field">
                  <div class="label">Semester</div>
                  <div class="value">
                    ${escapeHtml(
                      clearancePass.semester
                    )}
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    School Year
                  </div>
                  <div class="value">
                    ${escapeHtml(
                      clearancePass.schoolYear
                    )}
                  </div>
                </div>

                <div class="field">
                  <div class="label">Completed</div>
                  <div class="value">
                    ${escapeHtml(
                      formatDate(
                        clearancePass.completedAt
                      )
                    )}
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    Approved Requirements
                  </div>
                  <div class="value">
                    ${escapeHtml(
                      `${clearancePass.approvedSteps}/${clearancePass.totalSteps}`
                    )}
                  </div>
                </div>
              </div>

              <div class="verify">
                <div class="label">
                  Clearance Reference
                </div>

                <div class="reference">
                  ${escapeHtml(
                    clearancePass.clearanceReference
                  )}
                </div>

                <div
                  class="label"
                  style="margin-top:18px"
                >
                  Verification Code
                </div>

                <div class="code">
                  ${escapeHtml(
                    clearancePass.verificationCode
                  )}
                </div>

                <p
                  style="
                    margin:14px 0 0;
                    color:#475569;
                    font-size:12px;
                  "
                >
                  Present this reference and
                  verification code to the Registrar
                  or authorized enrollment personnel.
                </p>
              </div>
            </div>

            <div class="footer">
              Generated by SmartClear AI. Validity
              must be confirmed through the official
              clearance verification system.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClearanceStatus();
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading clearance status...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-5">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/student/dashboard"
                    )
                  }
                  className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-blue-100 transition hover:text-white"
                >
                  <FaArrowLeft />

                  Back to Dashboard
                </button>

                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Clearance Status
                </h1>

                <p className="mt-1 text-sm text-blue-100">
                  Track your office and
                  subject clearance in one
                  place.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-60 sm:w-auto"
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
          </div>

          {/* STUDENT STRIP */}

          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <StudentInfo
              label="Student"
              value={
                student?.full_name ||
                "No Name"
              }
            />

            <StudentInfo
              label="Student ID"
              value={
                student?.student_id ||
                "Not assigned"
              }
            />

            <StudentInfo
              label="Program"
              value={
                student?.course ||
                "Not assigned"
              }
            />

            <StudentInfo
              label="Year / Section"
              value={[
                student?.year_level,
                student?.section,
              ]
                .filter(Boolean)
                .join(" • ") ||
                "Not assigned"}
            />
          </div>
        </section>

        {/* ====================================================
            NO REQUEST
        ==================================================== */}

        {!clearanceRequest ? (
          <section className="rounded-2xl border border-dashed border-blue-200 bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              <FaClipboardCheck />
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-900">
              No Clearance Request Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Submit a clearance request
              first. Your office and subject
              approval progress will appear
              here.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student/request-clearance"
                )
              }
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Request Clearance
            </button>
          </section>
        ) : (
          <>
            {/* ====================================================
                PROGRESS
            ==================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Clearance Progress
                    </h2>

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${getOverallStatusClass(
                        clearanceRequest.status
                      )}`}
                    >
                      {clearanceRequest.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      clearanceRequest.semester
                    }{" "}
                    •{" "}
                    {
                      clearanceRequest.school_year
                    }
                  </p>
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {statistics.percentage}%
                  </span>

                  <span className="pb-1 text-xs font-semibold text-slate-400">
                    complete
                  </span>
                </div>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${statistics.percentage}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <ProgressStat
                  label="Requirements"
                  value={statistics.total}
                  icon={FaClipboardCheck}
                  tone="slate"
                />

                <ProgressStat
                  label="Approved"
                  value={statistics.approved}
                  icon={FaCheckCircle}
                  tone="green"
                />

                <ProgressStat
                  label="Pending"
                  value={statistics.pending}
                  icon={FaClock}
                  tone="amber"
                />

                <ProgressStat
                  label="Needs Action"
                  value={statistics.rejected}
                  icon={FaExclamationCircle}
                  tone="red"
                />
              </div>

              {clearanceRequest.remarks && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                      Clearance Remark
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      {
                        clearanceRequest.remarks
                      }
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ====================================================
                COMPLETED / DIGITAL PASS
            ==================================================== */}

            {clearanceRequest.status ===
              "Completed" && (
              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
                      <FaGraduationCap />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-emerald-950">
                          Clearance Completed
                        </h2>

                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                          Cleared
                        </span>
                      </div>

                      <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-800">
                        All required clearance
                        steps are approved. Your
                        Digital Clearance Pass is
                        ready for enrollment
                        verification.
                      </p>

                      {clearanceRequest.completed_at && (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                          Completed{" "}
                          {formatDate(
                            clearanceRequest.completed_at
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loadingPass}
                    onClick={() =>
                      loadDigitalClearancePass({
                        openModal: true,
                        showError: true,
                      })
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {loadingPass ? (
                      <FaSyncAlt className="animate-spin" />
                    ) : (
                      <FaShieldAlt />
                    )}

                    Digital Clearance Pass
                  </button>
                </div>

                <div className="flex flex-col gap-3 border-t border-emerald-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span>
                    Pass delivery:{" "}
                    <strong className="text-slate-700">
                      {passEmailResult
                        ? passEmailResult?.recipientEmail ||
                          student?.email
                        : student?.email ||
                          "Student email"}
                    </strong>
                  </span>

                  <button
                    type="button"
                    disabled={sendingPassEmail}
                    onClick={() =>
                      handleSendPassEmail({
                        force: true,
                        showSuccess: true,
                      })
                    }
                    className="inline-flex items-center gap-2 font-black text-emerald-700 transition hover:text-emerald-900 disabled:opacity-50"
                  >
                    {sendingPassEmail ? (
                      <FaSyncAlt className="animate-spin" />
                    ) : (
                      <FaEnvelope />
                    )}

                    Email Again
                  </button>
                </div>
              </section>
            )}

            {/* ====================================================
                OFFICE CLEARANCES
            ==================================================== */}

            <ClearanceGroup
              title="Office Clearances"
              description="Clearance requirements handled by school offices."
              icon={FaBuilding}
              steps={officeSteps}
              getStepName={getStepName}
              getStepCode={getStepCode}
              getApproverName={getApproverName}
              getStatusIcon={getStatusIcon}
              getStatusClass={getStatusClass}
              formatDate={formatDate}
            />

            {/* ====================================================
                SUBJECT CLEARANCES
            ==================================================== */}

            <ClearanceGroup
              title="Subject Clearances"
              description="Clearance requirements handled by your assigned faculty."
              icon={FaBook}
              steps={subjectSteps}
              getStepName={getStepName}
              getStepCode={getStepCode}
              getApproverName={getApproverName}
              getStatusIcon={getStatusIcon}
              getStatusClass={getStatusClass}
              formatDate={formatDate}
            />
          </>
        )}

        {/* ====================================================
            DIGITAL PASS MODAL
        ==================================================== */}

        {showClearancePass &&
          clearancePass && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
                <button
                  type="button"
                  onClick={() =>
                    setShowClearancePass(
                      false
                    )
                  }
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>

                <div className="flex items-center gap-3 pr-12">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">
                    <FaShieldAlt />
                  </div>

                  <div>
                    <h2 className="text-xl font-black sm:text-2xl">
                      Digital Clearance Pass
                    </h2>

                    <p className="text-xs text-blue-100">
                      SmartClear AI • Official
                      Clearance Record
                    </p>
                  </div>
                </div>
              </div>

              {/* MODAL CONTENT */}

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Student
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                      {
                        clearancePass.studentName
                      }
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Student ID:{" "}
                      {
                        clearancePass.studentId
                      }
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                    <FaCheckCircle />

                    CLEARED FOR ENROLLMENT
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <PassInfo
                    label="Program"
                    value={
                      clearancePass.courseCode ||
                      "N/A"
                    }
                    secondary={
                      clearancePass.courseName
                    }
                  />

                  <PassInfo
                    label="Year & Block"
                    value={`${clearancePass.yearLevel || "N/A"}${
                      clearancePass.blockCode
                        ? ` • Block ${clearancePass.blockCode}`
                        : ""
                    }`}
                  />

                  <PassInfo
                    label="Clearance Cycle"
                    value={
                      clearancePass.semester ||
                      "N/A"
                    }
                    secondary={
                      clearancePass.schoolYear
                    }
                  />

                  <PassInfo
                    label="Approved"
                    value={`${clearancePass.approvedSteps}/${clearancePass.totalSteps}`}
                  />

                  <PassInfo
                    label="Completed"
                    value={formatDate(
                      clearancePass.completedAt
                    )}
                  />

                  <PassInfo
                    label="Verification"
                    value={
                      clearancePass.verificationStatus ||
                      "Ready"
                    }
                  />
                </div>

                {/* VERIFICATION */}

                <div className="mt-5 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                        Clearance Reference
                      </p>

                      <p className="mt-1 break-all font-mono text-base font-black text-blue-900">
                        {
                          clearancePass.clearanceReference
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                        Verification Code
                      </p>

                      <p className="mt-1 break-all font-mono text-base font-black tracking-wider text-slate-900">
                        {
                          clearancePass.verificationCode
                        }
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-blue-700">
                    Present the reference and
                    verification code to the
                    Registrar or authorized
                    enrollment personnel.
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowClearancePass(
                        false
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={
                      handlePrintClearancePass
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <FaPrint />

                    Print / PDF
                  </button>

                  <button
                    type="button"
                    disabled={
                      sendingPassEmail
                    }
                    onClick={() =>
                      handleSendPassEmail({
                        force: true,
                        showSuccess: true,
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {sendingPassEmail ? (
                      <FaSyncAlt className="animate-spin" />
                    ) : (
                      <FaEnvelope />
                    )}

                    Email Pass
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   STUDENT INFO
============================================================ */

function StudentInfo({
  label,
  value,
}) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PROGRESS STAT
============================================================ */

function ProgressStat({
  label,
  value,
  icon: Icon,
  tone,
}) {
  const tones = {
    slate:
      "bg-slate-50 text-slate-600",
    green:
      "bg-emerald-50 text-emerald-600",
    amber:
      "bg-amber-50 text-amber-600",
    red:
      "bg-rose-50 text-rose-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          tones[tone] ||
          tones.slate
        }`}
      >
        <Icon />
      </div>

      <div>
        <p className="text-xl font-black leading-none text-slate-900">
          {value}
        </p>

        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CLEARANCE GROUP
============================================================ */

function ClearanceGroup({
  title,
  description,
  icon: Icon,
  steps,
  getStepName,
  getStepCode,
  getApproverName,
  getStatusIcon,
  getStatusClass,
  formatDate,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon />
          </div>

          <div>
            <h2 className="font-black text-slate-900">
              {title}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {steps.length}
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-bold text-slate-600">
            No requirements found.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {steps.map((step) => (
            <article
              key={step.id}
              className="p-4 transition hover:bg-slate-50/70 sm:px-6 sm:py-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                {/* NAME */}

                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {step.subject_id ? (
                      <FaBook />
                    ) : (
                      <FaBuilding />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900">
                      {getStepName(step)}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {getStepCode(step)}
                    </p>
                  </div>
                </div>

                {/* APPROVER */}

                <div className="lg:w-52">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Approver
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {getApproverName(step)}
                  </p>
                </div>

                {/* REVIEWED */}

                <div className="lg:w-48">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Reviewed
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {step.reviewed_at
                      ? formatDate(
                          step.reviewed_at
                        )
                      : "Not reviewed yet"}
                  </p>
                </div>

                {/* STATUS */}

                <div className="lg:w-32 lg:text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                      step.status
                    )}`}
                  >
                    {getStatusIcon(
                      step.status
                    )}

                    {step.status}
                  </span>
                </div>
              </div>

              {/* REMARK ONLY WHEN NEEDED */}

              {step.remarks && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 ${
                    step.status ===
                    "Rejected"
                      ? "border-rose-100 bg-rose-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Remark
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {step.remarks}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   PASS INFO
============================================================ */

function PassInfo({
  label,
  value,
  secondary,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value || "N/A"}
      </p>

      {secondary && (
        <p className="mt-0.5 break-words text-xs text-slate-500">
          {secondary}
        </p>
      )}
    </div>
  );
}

export default ClearanceStatus;