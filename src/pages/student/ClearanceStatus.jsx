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
} from "react-icons/fa";

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
  const [clearanceRequest, setClearanceRequest] =
    useState(null);
  const [steps, setSteps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [clearancePass, setClearancePass] =
    useState(null);

  const [loadingPass, setLoadingPass] =
    useState(false);

  const [showClearancePass, setShowClearancePass] =
    useState(false);

  const [sendingPassEmail, setSendingPassEmail] =
    useState(false);

  const [passEmailResult, setPassEmailResult] =
    useState(null);

  const loadClearanceStatus =
    useCallback(async () => {
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

        // Load student profile
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

        // Load latest clearance request
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

        setClearanceRequest(
          requestData || null
        );

        if (!requestData) {
          setSteps([]);
          return;
        }

        // Load real office and subject steps
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

        const sortedSteps = (
          stepData || []
        ).sort((firstStep, secondStep) => {
          const firstName =
            firstStep.offices?.office_name ||
            firstStep.subjects
              ?.subject_name ||
            "";

          const secondName =
            secondStep.offices?.office_name ||
            secondStep.subjects
              ?.subject_name ||
            "";

          return firstName.localeCompare(
            secondName
          );
        });

        setSteps(sortedSteps);
      } catch (error) {
        console.error(
          "Clearance status error:",
          error
        );

        Swal.fire({
          icon: "error",
          title:
            "Unable to Load Clearance Status",
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

  const statistics = useMemo(() => {
    const total = steps.length;

    const approved = steps.filter(
      (step) =>
        step.status === "Approved"
    ).length;

    const pending = steps.filter(
      (step) =>
        step.status === "Pending"
    ).length;

    const rejected = steps.filter(
      (step) =>
        step.status === "Rejected"
    ).length;

    const percentage =
      total > 0
        ? Math.round(
            (approved / total) * 100
          )
        : 0;

    return {
      total,
      approved,
      pending,
      rejected,
      percentage,
    };
  }, [steps]);

  const loadDigitalClearancePass =
    useCallback(
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

          const {
            data,
            error,
          } = await supabase.rpc(
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
            "Load Digital Clearance Pass error:",
            error
          );

          if (showError) {
            await Swal.fire({
              icon: "error",
              title:
                "Unable to Load Digital Pass",
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

  const handleSendPassEmail =
    useCallback(
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
              title:
                "Clearance Not Completed",
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
              requestId:
                clearanceRequest.id,
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
                  ? `The Digital Clearance Pass was already sent to ${result.recipientEmail || student?.email || "your email"}.`
                  : `The Digital Clearance Pass was sent to ${result?.recipientEmail || student?.email || "your email"}.`,
            });
          }

          return result;
        } catch (error) {
          console.error(
            "Send Digital Clearance Pass email error:",
            error
          );

          if (showSuccess) {
            await Swal.fire({
              icon: "error",
              title:
                "Unable to Email Digital Pass",
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

  /*
  |--------------------------------------------------------------------------
  | AUTOMATIC COMPLETED-PASS LOAD AND EMAIL FALLBACK
  |--------------------------------------------------------------------------
  |
  | The Edge Function is idempotent. Refreshing this page will not repeatedly
  | email the pass unless the student presses "Email Again".
  |--------------------------------------------------------------------------
  */

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
              padding: 40px;
              background: #f1f5f9;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .pass {
              max-width: 850px;
              margin: 0 auto;
              overflow: hidden;
              border: 2px solid #1d4ed8;
              border-radius: 24px;
              background: #ffffff;
            }

            .header {
              padding: 34px;
              background:
                linear-gradient(
                  135deg,
                  #1d4ed8,
                  #4338ca
                );
              color: #ffffff;
              text-align: center;
            }

            .header h1 {
              margin: 0;
              font-size: 32px;
            }

            .header p {
              margin: 10px 0 0;
              color: #dbeafe;
            }

            .status {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 18px;
              border-radius: 999px;
              background: #dcfce7;
              color: #15803d;
              font-size: 14px;
              font-weight: 700;
            }

            .content {
              padding: 32px;
            }

            .student-name {
              text-align: center;
              font-size: 30px;
              font-weight: 700;
            }

            .student-id {
              margin-top: 8px;
              text-align: center;
              color: #64748b;
            }

            .grid {
              display: grid;
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
              gap: 16px;
              margin-top: 28px;
            }

            .field {
              padding: 18px;
              border-radius: 14px;
              background: #f8fafc;
            }

            .label {
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .value {
              margin-top: 8px;
              font-size: 16px;
              font-weight: 700;
            }

            .verification {
              margin-top: 24px;
              padding: 24px;
              border: 2px dashed #2563eb;
              border-radius: 16px;
              background: #eff6ff;
              text-align: center;
            }

            .reference {
              margin-top: 12px;
              color: #1d4ed8;
              font-size: 22px;
              font-weight: 700;
            }

            .code {
              margin-top: 14px;
              padding: 14px;
              border-radius: 10px;
              background: #ffffff;
              font-family: monospace;
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.12em;
            }

            .footer {
              padding: 22px 32px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 12px;
              line-height: 1.6;
              text-align: center;
            }

            @media (
              max-width: 640px
            ) {
              body {
                padding: 16px;
              }

              .grid {
                grid-template-columns: 1fr;
              }
            }

            @media print {
              body {
                padding: 0;
                background: #ffffff;
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
              <p>
                Official Digital Clearance Pass
              </p>

              <div class="status">
                CLEARED FOR ENROLLMENT
              </div>
            </div>

            <div class="content">
              <div class="student-name">
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
                  <div class="label">
                    Program
                  </div>

                  <div class="value">
                    ${escapeHtml(
                      courseDisplay
                    )}
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    Year and Block
                  </div>

                  <div class="value">
                    ${escapeHtml(
                      classDisplay
                    )}
                  </div>
                </div>

                <div class="field">
                  <div class="label">
                    Semester
                  </div>

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
                  <div class="label">
                    Completed
                  </div>

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

              <div class="verification">
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
                  style="margin-top:20px"
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
                    margin:18px 0 0;
                    color:#475569;
                    font-size:13px;
                  "
                >
                  Present this reference and
                  verification code to the
                  Registrar or authorized
                  enrollment personnel.
                </p>
              </div>
            </div>

            <div class="footer">
              This pass was generated by
              SmartClear AI. Its validity must
              be confirmed through the official
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClearanceStatus();
  };

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

  const getStepName = (step) => {
    return (
      step.offices?.office_name ||
      step.subjects?.subject_name ||
      "Unassigned Clearance Step"
    );
  };

  const getStepCode = (step) => {
    return (
      step.offices?.office_code ||
      step.subjects?.subject_code ||
      "No code"
    );
  };

  const getApproverName = (step) => {
    return (
      step.users?.full_name ||
      "No approver assigned"
    );
  };

  const getStepType = (step) => {
    return step.subject_id
      ? "Subject"
      : "Office";
  };

  const getStepIcon = (step) => {
    if (step.subject_id) {
      return <FaBook />;
    }

    return <FaBuilding />;
  };

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
      return "bg-green-100 text-green-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const getOverallStatusClass = (
    status
  ) => {
    if (status === "Completed") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    if (status === "In Progress") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading clearance status...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-600 p-4 text-white shadow-lg sm:mb-7 sm:rounded-3xl sm:p-6 lg:p-7 md:flex-row md:items-center">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                "/student/dashboard"
              )
            }
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>

          <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
            Clearance Status
          </h1>

          <p className="mt-2 text-blue-100">
            View your real office and
            subject approval progress.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-semibold backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
            : "Refresh Status"}
        </button>
      </div>

      {/* Student Information */}

      <div className="mb-5 min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:mb-7 sm:rounded-3xl sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">
              Student Number
            </p>

            <h3 className="mt-1 font-semibold text-slate-800">
              {student?.student_id ||
                "Not assigned"}
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Full Name
            </p>

            <h3 className="mt-1 font-semibold text-slate-800">
              {student?.full_name ||
                "No Name"}
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Program
            </p>

            <h3 className="mt-1 font-semibold text-slate-800">
              {student?.course ||
                "Not assigned"}
            </h3>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Year and Section
            </p>

            <h3 className="mt-1 font-semibold text-slate-800">
              {student?.year_level ||
                "Not assigned"}
              {student?.section
                ? ` - ${student.section}`
                : ""}
            </h3>
          </div>
        </div>
      </div>

      {!clearanceRequest ? (
        /* No clearance request */

        <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-6 text-center shadow-sm sm:rounded-3xl sm:p-12">
          <FaClipboardCheck className="mx-auto text-6xl text-blue-600" />

          <h2 className="mt-6 text-2xl font-bold text-slate-800">
            No Clearance Request
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            You have not submitted a
            clearance request yet. Submit
            one to generate your office and
            subject approval steps.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/student/request-clearance"
              )
            }
            className="mt-7 w-full rounded-xl bg-blue-700 px-7 py-3 font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
          >
            Request Clearance
          </button>
        </div>
      ) : (
        <>
          {/* Digital Clearance Pass */}

          {clearanceRequest.status ===
            "Completed" && (
            <section className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg sm:mb-7 sm:rounded-3xl">
              <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-4 text-white sm:p-6 lg:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
                      <FaShieldAlt />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                        Official Digital Clearance Pass
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        Cleared for Enrollment
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                        All subject and office clearance steps have been approved.
                        Your pass is ready for Registrar verification.
                      </p>
                    </div>
                  </div>

                  <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700">
                    COMPLETED
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {loadingPass &&
                !clearancePass ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-5 text-slate-600">
                    <FaSyncAlt className="animate-spin text-blue-700" />

                    Loading your official pass...
                  </div>
                ) : clearancePass ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Clearance Reference
                        </p>

                        <p className="mt-2 break-all font-mono font-black text-blue-800">
                          {clearancePass.clearanceReference}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Verification Code
                        </p>

                        <p className="mt-2 break-all font-mono text-lg font-black tracking-wider text-slate-800">
                          {clearancePass.verificationCode}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Approved Steps
                        </p>

                        <p className="mt-2 text-2xl font-black text-emerald-700">
                          {clearancePass.approvedSteps}/
                          {clearancePass.totalSteps}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Completion Date
                        </p>

                        <p className="mt-2 font-bold text-slate-800">
                          {formatDate(
                            clearancePass.completedAt
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setShowClearancePass(
                            true
                          )
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 sm:w-auto"
                      >
                        <FaShieldAlt />
                        View Full Pass
                      </button>

                      <button
                        type="button"
                        onClick={
                          handlePrintClearancePass
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-100 sm:w-auto"
                      >
                        <FaPrint />
                        Print / Save PDF
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSendPassEmail({
                            force: true,
                            showSuccess:
                              true,
                          })
                        }
                        disabled={
                          sendingPassEmail
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {sendingPassEmail ? (
                          <FaSyncAlt className="animate-spin" />
                        ) : (
                          <FaEnvelope />
                        )}

                        {sendingPassEmail
                          ? "Sending..."
                          : "Email Again"}
                      </button>
                    </div>

                    <p className="mt-4 text-sm text-slate-500">
                      {passEmailResult?.recipientEmail
                        ? `Email delivery: ${passEmailResult.recipientEmail}`
                        : `The system automatically attempts to send this pass to ${student?.email || "your registered email"}.`}
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="font-bold text-amber-800">
                      The clearance is completed, but the Digital Pass could not be loaded.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        loadDigitalClearancePass({
                          openModal:
                            false,
                          showError:
                            true,
                        })
                      }
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-bold text-white transition hover:bg-amber-700 sm:w-auto"
                    >
                      <FaSyncAlt />
                      Retry Pass
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Request Summary */}

          <div className="mb-5 grid min-w-0 gap-3 sm:mb-7 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Overall Status
              </p>

              <span
                className={`mt-4 inline-block rounded-full px-4 py-2 text-sm font-semibold ${getOverallStatusClass(
                  clearanceRequest.status
                )}`}
              >
                {clearanceRequest.status}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Clearance Cycle
              </p>

              <h3 className="mt-3 font-bold text-slate-800">
                {
                  clearanceRequest.semester
                }
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {
                  clearanceRequest.school_year
                }
              </p>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Requested Date
              </p>

              <h3 className="mt-3 font-semibold text-slate-800">
                {formatDate(
                  clearanceRequest.requested_at
                )}
              </h3>
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
              <p className="text-sm text-slate-500">
                Last Updated
              </p>

              <h3 className="mt-3 font-semibold text-slate-800">
                {formatDate(
                  clearanceRequest.updated_at
                )}
              </h3>
            </div>
          </div>

          {/* Progress */}

          <div className="mb-5 min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:mb-7 sm:rounded-3xl sm:p-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Overall Progress
                </h2>

                <p className="mt-2 text-slate-500">
                  {
                    statistics.approved
                  }{" "}
                  approved,{" "}
                  {statistics.pending} pending,{" "}
                  {
                    statistics.rejected
                  }{" "}
                  rejected
                </p>
              </div>

              <span className="text-3xl font-bold text-blue-700">
                {
                  statistics.percentage
                }
                %
              </span>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${statistics.percentage}%`,
                }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3 sm:gap-4 sm:p-4">
                <FaClipboardCheck className="text-2xl text-blue-700" />

                <div>
                  <p className="text-sm text-slate-500">
                    Total
                  </p>

                  <h3 className="text-2xl font-bold">
                    {
                      statistics.total
                    }
                  </h3>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-green-50 p-3 sm:gap-4 sm:p-4">
                <FaCheckCircle className="text-2xl text-green-700" />

                <div>
                  <p className="text-sm text-green-700">
                    Approved
                  </p>

                  <h3 className="text-2xl font-bold text-green-700">
                    {
                      statistics.approved
                    }
                  </h3>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-yellow-50 p-3 sm:gap-4 sm:p-4">
                <FaClock className="text-2xl text-yellow-700" />

                <div>
                  <p className="text-sm text-yellow-700">
                    Pending
                  </p>

                  <h3 className="text-2xl font-bold text-yellow-700">
                    {
                      statistics.pending
                    }
                  </h3>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-red-50 p-3 sm:gap-4 sm:p-4">
                <FaTimesCircle className="text-2xl text-red-700" />

                <div>
                  <p className="text-sm text-red-700">
                    Rejected
                  </p>

                  <h3 className="text-2xl font-bold text-red-700">
                    {
                      statistics.rejected
                    }
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Clearance Steps */}

          <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg sm:rounded-3xl sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                Approval Status
              </h2>

              <p className="mt-2 text-slate-500">
                These steps were generated
                from administrator-approved
                office and subject
                assignments.
              </p>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center sm:p-10">
                <FaExclamationCircle className="mx-auto text-5xl text-yellow-500" />

                <h3 className="mt-4 text-xl font-bold text-slate-700">
                  No Approval Steps
                </h3>

                <p className="mt-2 text-slate-500">
                  The administrator has not
                  configured active approver
                  assignments for this
                  request.
                </p>
              </div>
            ) : (

              <>
                {/* Mobile approval cards */}

                <div className="space-y-3 md:hidden">
                  {steps.map((step) => (
                    <article
                      key={step.id}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            {getStepIcon(
                              step
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words font-black text-slate-800">
                              {getStepName(
                                step
                              )}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {getStepCode(
                                step
                              )}{" "}
                              •{" "}
                              {getStepType(
                                step
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                            step.status
                          )}`}
                        >
                          {getStatusIcon(
                            step.status
                          )}

                          {step.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Approver
                          </p>

                          <p className="mt-1 break-words font-semibold text-slate-700">
                            {getApproverName(
                              step
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Remarks
                          </p>

                          <p className="mt-1 break-words leading-6 text-slate-600">
                            {step.remarks ||
                              "No remarks yet."}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            Reviewed
                          </p>

                          <p className="mt-1 break-words text-slate-600">
                            {step.reviewed_at
                              ? formatDate(
                                  step.reviewed_at
                                )
                              : "Not reviewed"}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Desktop approval table */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left">
                        Assignment
                      </th>

                      <th className="px-5 py-4 text-left">
                        Type
                      </th>

                      <th className="px-5 py-4 text-left">
                        Approver
                      </th>

                      <th className="px-5 py-4 text-left">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left">
                        Remarks
                      </th>

                      <th className="px-5 py-4 text-left">
                        Reviewed
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {steps.map((step) => (
                      <tr
                        key={step.id}
                        className="border-t transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                              {getStepIcon(
                                step
                              )}
                            </div>

                            <div>
                              <h3 className="font-semibold text-slate-800">
                                {getStepName(
                                  step
                                )}
                              </h3>

                              <p className="text-sm text-slate-500">
                                {getStepCode(
                                  step
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          {getStepType(
                            step
                          )}
                        </td>

                        <td className="px-5 py-5">
                          {getApproverName(
                            step
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                              step.status
                            )}`}
                          >
                            {getStatusIcon(
                              step.status
                            )}

                            {step.status}
                          </span>
                        </td>

                        <td className="max-w-sm px-5 py-5 text-slate-600">
                          {step.remarks ||
                            "No remarks yet."}
                        </td>

                        <td className="px-5 py-5 text-slate-500">
                          {step.reviewed_at
                            ? formatDate(
                                step.reviewed_at
                              )
                            : "Not reviewed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Compact Digital Clearance Pass Modal */}

      {showClearancePass &&
        clearancePass && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 backdrop-blur-sm sm:items-center sm:p-3">
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]">
            <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setShowClearancePass(
                    false
                  )
                }
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                aria-label="Close Digital Clearance Pass"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
                  <FaShieldAlt />
                </div>

                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    SmartClear AI
                  </h2>

                  <p className="text-xs text-blue-100 sm:text-sm">
                    Official Digital Clearance Pass
                  </p>
                </div>

                <span className="ml-auto hidden items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-xs font-black text-green-700 sm:inline-flex">
                  <FaGraduationCap />
                  CLEARED
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="break-words text-xl font-black text-slate-800 sm:text-2xl">
                    {clearancePass.studentName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Student Number:{" "}
                    {clearancePass.studentId}
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-xs font-black text-green-700 sm:hidden">
                  <FaGraduationCap />
                  CLEARED FOR ENROLLMENT
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.courseCode ||
                      "N/A"}
                  </p>

                  {clearancePass.courseName && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {clearancePass.courseName}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Year and Block
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.yearLevel ||
                      "N/A"}

                    {clearancePass.blockCode
                      ? ` — Block ${clearancePass.blockCode}`
                      : ""}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Clearance Cycle
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {clearancePass.semester ||
                      "N/A"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {clearancePass.schoolYear ||
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Approval
                  </p>

                  <p className="mt-1 text-lg font-black text-green-700">
                    {clearancePass.approvedSteps}/
                    {clearancePass.totalSteps}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Completed
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {formatDate(
                      clearancePass.completedAt
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Verification
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1.5 text-xs font-black ${
                      clearancePass.verificationStatus ===
                      "Verified"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {clearancePass.verificationStatus ||
                      "Ready"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Clearance Reference
                  </p>

                  <p className="mt-1 break-all font-mono text-base font-black text-blue-800">
                    {clearancePass.clearanceReference}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Verification Code
                  </p>

                  <p className="mt-1 break-all font-mono text-base font-black tracking-wider text-slate-800">
                    {clearancePass.verificationCode}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Present the reference and verification code to the Registrar or authorized enrollment personnel.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <FaPrint />
                  Print / PDF
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendPassEmail({
                      force: true,
                      showSuccess:
                        true,
                    })
                  }
                  disabled={
                    sendingPassEmail
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
    </DashboardLayout>
  );
}

export default ClearanceStatus;