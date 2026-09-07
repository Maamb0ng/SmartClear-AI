import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { supabase } from "../../services/supabase";
import {
  approveRequest,
  rejectRequest,
} from "../../services/approvalService";

import ApproverLayout from "../../layouts/ApproverLayout";

import {
  FaUserGraduate,
  FaIdCard,
  FaUniversity,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBookOpen,
  FaBuilding,
  FaArrowLeft,
  FaClipboardCheck,
  FaInfoCircle,
} from "react-icons/fa";

function StudentDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestId = location.state?.requestId;
  const readOnly = location.state?.readOnly === true;

  const [student, setStudent] = useState(null);
  const [request, setRequest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!requestId) {
      Swal.fire(
        "Error",
        "No clearance request selected.",
        "error"
      ).then(() => {
        navigate("/approver/pending");
      });

      return;
    }

    loadStudent();
  }, [requestId, navigate]);

  const loadStudent = async () => {
    try {
      setLoading(true);

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("clearance_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError) throw requestError;

      setRequest(requestData);

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("users")
        .select("*")
        .eq("id", requestData.student_id)
        .single();

      if (studentError) throw studentError;

      setStudent(studentData);

      const {
        data: stepData,
        error: stepError,
      } = await supabase
        .from("clearance_steps")
        .select(`
          *,
          offices (
            office_name,
            office_code
          ),
          subjects (
            subject_name,
            subject_code
          )
        `)
        .eq("clearance_request_id", requestId)
        .order("id");

      if (stepError) throw stepError;

      setSteps(stepData || []);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const approvedCount = useMemo(
    () =>
      steps.filter(
        (step) => step.status === "Approved"
      ).length,
    [steps]
  );

  const pendingCount = useMemo(
    () =>
      steps.filter(
        (step) => step.status === "Pending"
      ).length,
    [steps]
  );

  const rejectedCount = useMemo(
    () =>
      steps.filter(
        (step) => step.status === "Rejected"
      ).length,
    [steps]
  );

  const getStepName = (step) => {
    if (step.subjects?.subject_name) {
      return step.subjects.subject_name;
    }

    if (step.offices?.office_name) {
      return step.offices.office_name;
    }

    return "Clearance Requirement";
  };

  const getStepCode = (step) => {
    if (step.subjects?.subject_code) {
      return step.subjects.subject_code;
    }

    if (step.offices?.office_code) {
      return step.offices.office_code;
    }

    return "";
  };

  const getStepType = (step) => {
    if (step.subject_id) {
      return "Subject";
    }

    if (step.office_id) {
      return "Office";
    }

    return "Clearance";
  };

  const getStatusStyle = (status) => {
    if (status === "Approved") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
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

  const formatDate = (value) => {
    if (!value) {
      return "N/A";
    }

    return new Date(value).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);

      const result = await approveRequest(
        requestId,
        remarks
      );

      if (!result.success) {
        Swal.fire(
          "Error",
          result.error,
          "error"
        );

        return;
      }

      Swal.fire(
        "Success",
        "Clearance approved successfully.",
        "success"
      ).then(() => {
        navigate("/approver/pending");
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      Swal.fire(
        "Remarks Required",
        "Please enter remarks.",
        "warning"
      );

      return;
    }

    try {
      setProcessing(true);

      const result = await rejectRequest(
        requestId,
        remarks
      );

      if (!result.success) {
        Swal.fire(
          "Error",
          result.error,
          "error"
        );

        return;
      }

      Swal.fire(
        "Rejected",
        "Clearance rejected successfully.",
        "success"
      ).then(() => {
        navigate("/approver/pending");
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <ApproverLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

            <h2 className="text-lg font-bold text-slate-800">
              Loading Student Information...
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Please wait while we load the clearance record.
            </p>
          </div>
        </div>
      </ApproverLayout>
    );
  }

  return (
    <ApproverLayout>
      <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
        <section className="overflow-hidden rounded-[1.75rem] bg-[#061b51] text-white shadow-xl">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-100/80 transition hover:text-white"
              >
                <FaArrowLeft />
                Back
              </button>

              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                Student Clearance Record
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                {student?.full_name || "Student Details"}
              </h1>

              <p className="mt-2 text-sm text-blue-100/70">
                Review the student's information and clearance progress in one organized view.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100/60">
                Student Number
              </p>

              <p className="mt-1 text-lg font-black">
                {student?.student_id || "N/A"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FaClipboardCheck className="text-xl" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total Requirements
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {steps.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FaCheckCircle className="text-xl" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Approved
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {approvedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <FaClock className="text-xl" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Pending
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                <FaTimesCircle className="text-xl" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Rejected
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                Student Profile
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Student Information
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FaUserGraduate />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Student Name
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {student?.full_name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FaIdCard />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Student Number
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {student?.student_id || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FaUniversity />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Course / Year
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {student?.course || "N/A"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {student?.year_level || "Year not assigned"}
                    {student?.section
                      ? ` • ${student.section}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FaCalendarAlt />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Requested
                  </p>
                  <p className="mt-1 font-bold text-slate-800">
                    {formatDate(request?.requested_at)}
                  </p>
                </div>
              </div>
            </div>

            {(request?.semester ||
              request?.school_year) && (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Academic Term
                </p>

                <p className="mt-1 font-bold text-blue-900">
                  {request?.semester || "No semester"}
                  {request?.school_year
                    ? ` • ${request.school_year}`
                    : ""}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-lg">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Clearance Progress
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Requirements & Status
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Subject and office clearance requirements for this request.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                {steps.length} Requirement
                {steps.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {steps.length === 0 ? (
                <div className="p-12 text-center">
                  <FaInfoCircle className="mx-auto text-4xl text-slate-300" />

                  <p className="mt-3 font-bold text-slate-700">
                    No clearance requirements found.
                  </p>
                </div>
              ) : (
                steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          step.subject_id
                            ? "bg-violet-100 text-violet-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {step.subject_id ? (
                          <FaBookOpen />
                        ) : (
                          <FaBuilding />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-800">
                            {getStepName(step)}
                          </h3>

                          {getStepCode(step) && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">
                              {getStepCode(step)}
                            </span>
                          )}

                          <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500">
                            {getStepType(step)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {step.remarks || "No remarks yet"}
                        </p>

                        {step.reviewed_at && (
                          <p className="mt-1 text-xs text-slate-400">
                            Reviewed {formatDate(step.reviewed_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${getStatusStyle(
                        step.status
                      )}`}
                    >
                      {getStatusIcon(step.status)}
                      {step.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {!readOnly && (
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-lg">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Review Decision
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Add Remarks
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a clear note before approving or rejecting this clearance.
                </p>

                <textarea
                  rows="5"
                  value={remarks}
                  onChange={(event) =>
                    setRemarks(event.target.value)
                  }
                  placeholder="Write your remarks here..."
                  className="mt-4 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 py-3.5 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaCheckCircle />
                  {processing
                    ? "Processing..."
                    : "Approve Clearance"}
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={processing}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-3.5 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaTimesCircle />
                  {processing
                    ? "Processing..."
                    : "Reject Clearance"}
                </button>
              </div>
            </div>
          </section>
        )}

        {readOnly && (
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="mt-0.5 shrink-0 text-blue-700" />

              <div>
                <p className="font-black text-blue-900">
                  Read-only clearance record
                </p>

                <p className="mt-1 text-sm text-blue-700/80">
                  This page was opened from a completed or approved record, so review actions are hidden.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </ApproverLayout>
  );
}

export default StudentDetails;
