import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaCheckCircle,
  FaSearch,
  FaEye,
} from "react-icons/fa";

function ApprovedRequests() {
  const navigate = useNavigate();

  const [approvedRequests, setApprovedRequests] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadApprovedRequests();
  }, []);

  const loadApprovedRequests = async () => {
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

    /*
    Get ALL steps assigned to this approver.

    We must check Pending, Approved, and Rejected
    so the same request cannot appear in both pages.
    */

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
      setApprovedRequests([]);
      return;
    }

    const completeRequests = await Promise.all(
      requestIds.map(async (requestId) => {
        const relatedSteps = safeSteps.filter(
          (step) =>
            step.clearance_request_id === requestId
        );

        /*
        Approved page rule:

        - At least one assigned step exists
        - Every assigned step is Approved
        - No Pending step
        - No Rejected step
        */

        const allApproved =
          relatedSteps.length > 0 &&
          relatedSteps.every(
            (step) => step.status === "Approved"
          );

        if (!allApproved) {
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

        const reviewedDates = relatedSteps
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
          approvedSteps: relatedSteps,
          approvedStepCount: relatedSteps.length,
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

    setApprovedRequests(validRequests);
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Unable to Load Approved Requests",
      text:
        error?.message ||
        "An unexpected error occurred.",
    });
  } finally {
    setLoading(false);
  }
};

  /*
  =====================================
  SEARCH
  =====================================
  */

  const filteredRequests = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return approvedRequests.filter(
      (request) => {
        if (!keyword) {
          return true;
        }

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
            .includes(keyword)
        );
      }
    );
  }, [approvedRequests, search]);

  /*
  =====================================
  DATE FORMATTER
  =====================================
  */

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

  /*
  =====================================
  APPROVED ASSIGNMENT NAMES
  =====================================
  */

  const getAssignmentNames = (
    approvedSteps
  ) => {
    const names = approvedSteps
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

  /*
  =====================================
  OPEN DETAILS
  =====================================
  */

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
          Approved Requests
        </h1>

        <p className="mt-2 text-slate-500">
          View students and clearance steps
          that you have approved.
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
            placeholder="Search by student name, ID, course, or semester..."
            className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none transition focus:border-green-600"
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-green-50">
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
                  Approved Assignment
                </th>

                <th className="p-5 text-left">
                  Approved Date
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
                    colSpan="7"
                    className="p-14 text-center text-slate-500"
                  >
                    Loading approved requests...
                  </td>
                </tr>
              ) : filteredRequests.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-14 text-center text-slate-500"
                  >
                    No approved requests found.
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
                            request.approvedSteps
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            request.approvedStepCount
                          }{" "}
                          approved step
                          {request.approvedStepCount !==
                          1
                            ? "s"
                            : ""}
                        </p>
                      </td>

                      <td className="p-5">
                        {formatDate(
                          request.latestReviewedDate
                        )}
                      </td>

                      <td className="p-5">
                        <span className="flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                          <FaCheckCircle />
                          Approved
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

export default ApprovedRequests;