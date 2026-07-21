import { useEffect, useState } from "react";
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
} from "react-icons/fa";

function StudentDetails() {

  const navigate = useNavigate();
  const location = useLocation();

  const requestId = location.state?.requestId;

  const [student, setStudent] = useState(null);
  const [request, setRequest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

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

      const { data: requestData, error: requestError } =
        await supabase
          .from("clearance_requests")
          .select("*")
          .eq("id", requestId)
          .single();

      if (requestError) throw requestError;

      setRequest(requestData);

      const { data: studentData, error: studentError } =
        await supabase
          .from("users")
          .select("*")
          .eq("id", requestData.student_id)
          .single();

      if (studentError) throw studentError;

      setStudent(studentData);

      const { data: stepData, error: stepError } =
        await supabase
          .from("clearance_steps")
          .select(`
            *,
            offices (
              office_name
            )
          `)
          .eq("clearance_request_id", requestId)
          .order("id");

      if (stepError) throw stepError;

      setSteps(stepData);

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

  const handleApprove = async () => {

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

  };

  if (loading) {

    return (

      <ApproverLayout>

        <div className="flex h-[70vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-blue-700 border-t-transparent"></div>

            <h2 className="text-xl font-semibold">

              Loading Student Information...

            </h2>

          </div>

        </div>

      </ApproverLayout>

    );

  }
  return (
    <ApproverLayout>
      {/* Header */}

      <div className="mb-8">

        <h1 className="text-4xl font-bold text-slate-800">
          Student Clearance Details
        </h1>

        <p className="mt-2 text-slate-500">
          Review the student's information before approving or rejecting the request.
        </p>

      </div>

      <div className="grid gap-8 lg:grid-cols-3">

        {/* Student Information */}

        <div className="rounded-3xl bg-white p-8 shadow-lg">

          <h2 className="mb-6 text-2xl font-bold">
            Student Information
          </h2>

          <div className="space-y-5">

            <div className="flex items-center gap-4">
              <FaUserGraduate className="text-2xl text-blue-700" />

              <div>
                <p className="text-sm text-slate-500">
                  Student Name
                </p>

                <h3 className="font-semibold">
  {student?.full_name || "N/A"}
</h3>
              </div>

            </div>

            <div className="flex items-center gap-4">
              <FaIdCard className="text-2xl text-blue-700" />

              <div>
                <p className="text-sm text-slate-500">
                  Student Number
                </p>

                <h3 className="font-semibold">
  {student?.student_id || "N/A"}
</h3>              
              </div>

            </div>

            <div className="flex items-center gap-4">
              <FaUniversity className="text-2xl text-blue-700" />

              <div>
                <p className="text-sm text-slate-500">
                  Course
                </p>

                <h3 className="font-semibold">
  {student?.course || "N/A"}
</h3>
              </div>

            </div>

            <div className="flex items-center gap-4">
              <FaCalendarAlt className="text-2xl text-blue-700" />

              <div>
                <p className="text-sm text-slate-500">
                  Submitted
                </p>

                <h3 className="font-semibold">
  {request
    ? new Date(request.requested_at).toLocaleDateString()
    : "N/A"}
</h3>
              </div>

            </div>

          </div>

        </div>

        {/* Clearance Progress */}

<div className="rounded-3xl bg-white p-8 shadow-lg">

  <h2 className="mb-6 text-2xl font-bold">
    Clearance Progress
  </h2>

  <div className="space-y-4">

    {steps.map((step) => (

      <div
        key={step.id}
        className="flex items-center justify-between rounded-xl border p-4"
      >

        <div>

          <div>
  <h3 className="font-semibold">
    {step.offices?.office_name}
  </h3>

  <p className="text-sm text-slate-500">
    {step.remarks || "No remarks yet"}
  </p>
</div>

        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold

          ${
            step.status === "Approved"
              ? "bg-green-100 text-green-700"

              : step.status === "Rejected"
              ? "bg-red-100 text-red-700"

              : "bg-yellow-100 text-yellow-700"
          }`}
        >

          {step.status}

        </span>

      </div>

    ))}

  </div>

</div>

        {/* Decision */}

        <div className="rounded-3xl bg-white p-8 shadow-lg">

          <h2 className="mb-6 text-2xl font-bold">
            Review Decision
          </h2>

          <label className="mb-3 block font-semibold">
            Remarks
          </label>

          <textarea
  rows="8"
  value={remarks}
  onChange={(e) => setRemarks(e.target.value)}
  placeholder="Write your remarks here..."
  className="mb-6 w-full rounded-xl border p-4 outline-none focus:border-blue-700"
/>

          <div className="space-y-4">

            <button
  onClick={handleApprove}
  className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700"
>
  <FaCheckCircle />
  Approve Clearance
</button>

           <button
  onClick={handleReject}
  className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-4 text-lg font-semibold text-white hover:bg-red-700"
>
  <FaTimesCircle />
  Reject Clearance
</button>

          </div>

        </div>

      </div>

    </ApproverLayout>
  );
}

export default StudentDetails;
