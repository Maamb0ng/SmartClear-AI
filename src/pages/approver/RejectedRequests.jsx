import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaTimesCircle,
  FaSearch,
  FaEye,
} from "react-icons/fa";

function RejectedRequests() {
  const navigate = useNavigate();

  const [rejectedRequests, setRejectedRequests] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadRejectedRequests();
  }, []);

 const loadRejectedRequests = async () => {
  try {
    setLoading(true);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!authUser) {
      throw new Error("You are not logged in.");
    }

    const { data: approver, error: approverError } =
      await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          full_name,
          employee_id,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

    if (approverError) throw approverError;

    if (approver.role !== "Approver") {
      throw new Error(
        "Only approver accounts can access this page."
      );
    }

    const { data: assignedSteps, error: stepsError } =
      await supabase
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
        .eq("approver_id", approver.id);

    if (stepsError) throw stepsError;

    const safeSteps = assignedSteps || [];

    const requestIds = [
      ...new Set(
        safeSteps
          .map((step) => step.clearance_request_id)
          .filter(Boolean)
      ),
    ];

    if (requestIds.length === 0) {
      setRejectedRequests([]);
      return;
    }

    const completeRequests = await Promise.all(
      requestIds.map(async (requestId) => {
        const relatedSteps = safeSteps.filter(
          (step) =>
            step.clearance_request_id === requestId
        );

        const rejectedSteps = relatedSteps.filter(
          (step) => step.status === "Rejected"
        );

        if (rejectedSteps.length === 0) {
          return null;
        }

        const { data: request, error: requestError } =
          await supabase
            .from("clearance_requests")
            .select(`
              id,
              student_id,
              school_year,
              semester,
              status,
              remarks,
              requested_at,
              updated_at
            `)
            .eq("id", requestId)
            .single();

        if (requestError) {
          console.error(requestError);
          return null;
        }

        const { data: student, error: studentError } =
          await supabase
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
            .eq("id", request.student_id)
            .single();

        if (studentError) {
          console.error(studentError);
        }

        const reviewedDates = rejectedSteps
          .map((step) => step.reviewed_at)
          .filter(Boolean)
          .sort(
            (firstDate, secondDate) =>
              new Date(secondDate) -
              new Date(firstDate)
          );

        return {
          ...request,
          student,
          rejectedSteps,
          rejectedStepCount: rejectedSteps.length,
          latestReviewedDate:
            reviewedDates[0] || null,
        };
      })
    );

    const validRequests = completeRequests
      .filter(Boolean)
      .sort(
        (firstRequest, secondRequest) =>
          new Date(
            secondRequest.latestReviewedDate ||
              secondRequest.updated_at ||
              secondRequest.requested_at
          ) -
          new Date(
            firstRequest.latestReviewedDate ||
              firstRequest.updated_at ||
              firstRequest.requested_at
          )
      );

    setRejectedRequests(validRequests);
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Unable to Load Rejected Requests",
      text:
        error?.message ||
        "An unexpected error occurred.",
    });
  } finally {
    setLoading(false);
  }
};

  const filteredRequests = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return rejectedRequests.filter(
      (request) => {
        if (!keyword) {
          return true;
        }

        const reasons = request.rejectedSteps
          .map((step) => step.remarks || "")
          .join(" ")
          .toLowerCase();

        return (
          (
            request.student?.full_name ||
            ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (
            request.student?.student_id ||
            ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (
            request.student?.course || ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (
            request.semester || ""
          )
            .toLowerCase()
            .includes(keyword) ||
          reasons.includes(keyword)
        );
      }
    );
  }, [rejectedRequests, search]);

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
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

  const getAssignmentNames = (
    rejectedSteps
  ) => {
    const names = rejectedSteps
      .map((step) => {
        if (step.offices?.office_name) {
          return step.offices.office_name;
        }

        if (step.subjects?.subject_name) {
          return step.subjects.subject_name;
        }

        return null;
      })
      .filter(Boolean);

    if (names.length === 0) {
      return "Unassigned";
    }

    return names.join(", ");
  };

  const getRejectionReasons = (
    rejectedSteps
  ) => {
    const reasons = rejectedSteps
      .map((step) => step.remarks)
      .filter(Boolean);

    if (reasons.length === 0) {
      return "No rejection reason provided.";
    }

    return reasons.join(" • ");
  };

  const openDetails = (request) => {
    navigate(
      "/approver/student-details",
      {
        state: {
          requestId: request.id,
          student: request.student,
          readOnly: true,
        },
      }
    );
  };

  return (
    <ApproverLayout>
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800">
          Rejected Requests
        </h1>

        <p className="mt-2 text-slate-500">
          View students and clearance steps
          that you have rejected.
        </p>
      </div>

      {/* Search */}

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-lg">
        <div className="relative">
          <FaSearch className="absolute left-4 top-4 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by student, ID, course, semester, or reason..."
            className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none transition focus:border-red-600"
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-red-50">
              <tr>
                <th className="p-5 text-left">
                  Student No.
                </th>

                <th className="p-5 text-left">
                  Student Name
                </th>

                <th className="p-5 text-left">
                  Course
                </th>

                <th className="p-5 text-left">
                  Rejected Assignment
                </th>

                <th className="p-5 text-left">
                  Reason
                </th>

                <th className="p-5 text-left">
                  Rejected Date
                </th>

                <th className="p-5 text-left">
                  Status
                </th>

                <th className="p-5 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-14 text-center text-slate-500"
                  >
                    Loading rejected requests...
                  </td>
                </tr>
              ) : filteredRequests.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-14 text-center text-slate-500"
                  >
                    No rejected requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(
                  (request) => (
                    <tr
                      key={request.id}
                      className="border-t transition hover:bg-slate-50"
                    >
                      <td className="p-5 font-semibold">
                        {request.student
                          ?.student_id || "N/A"}
                      </td>

                      <td className="p-5">
                        {request.student
                          ?.full_name || "No Name"}
                      </td>

                      <td className="p-5">
                        <p>
                          {request.student
                            ?.course ||
                            "Not assigned"}
                        </p>

                        <p className="text-sm text-slate-500">
                          {request.student
                            ?.year_level ||
                            "No year level"}
                        </p>
                      </td>

                      <td className="p-5">
                        <p className="max-w-xs">
                          {getAssignmentNames(
                            request.rejectedSteps
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            request.rejectedStepCount
                          }{" "}
                          rejected step
                          {request.rejectedStepCount !==
                          1
                            ? "s"
                            : ""}
                        </p>
                      </td>

                      <td className="max-w-sm p-5">
                        <p className="font-medium text-red-600">
                          {getRejectionReasons(
                            request.rejectedSteps
                          )}
                        </p>
                      </td>

                      <td className="p-5">
                        {formatDate(
                          request.latestReviewedDate
                        )}
                      </td>

                      <td className="p-5">
                        <span className="flex w-fit items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                          <FaTimesCircle />
                          Rejected
                        </span>
                      </td>

                      <td className="p-5">
                        <button
                          type="button"
                          onClick={() =>
                            openDetails(request)
                          }
                          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800"
                        >
                          <FaEye />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ApproverLayout>
  );
}

export default RejectedRequests;