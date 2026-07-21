import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaClock,
  FaEye,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate,
} from "react-icons/fa";

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function PendingRequests() {
  const navigate =
    useNavigate();

  const [
    approver,
    setApprover,
  ] = useState(null);

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const loadRequests =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const {
            data: {
              user: authUser,
            },
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!authUser) {
            throw new Error(
              "You are not logged in."
            );
          }

          const {
            data:
              approverProfile,
            error:
              approverError,
          } = await supabase
            .from("users")
            .select(`
              id,
              auth_id,
              full_name,
              role,
              status
            `)
            .eq(
              "auth_id",
              authUser.id
            )
            .single();

          if (approverError) {
            throw approverError;
          }

          if (
            approverProfile.role !==
            "Approver"
          ) {
            throw new Error(
              "Only approver accounts can access this page."
            );
          }

          setApprover(
            approverProfile
          );

          /*
          | Fetch every assigned step first, then calculate Pending locally.
          | This gives one source of truth and avoids keeping old counts in
          | component state after an approval or rejection.
          */

          const {
            data:
              assignedStepData,
            error:
              stepError,
          } = await supabase
            .from(
              "clearance_steps"
            )
            .select(`
              id,
              clearance_request_id,
              approver_id,
              status,
              remarks,
              reviewed_at,
              office_id,
              subject_id
            `)
            .eq(
              "approver_id",
              approverProfile.id
            );

          if (stepError) {
            throw stepError;
          }

          const pendingSteps =
            (
              assignedStepData ||
              []
            ).filter(
              (step) =>
                normalizeStatus(
                  step.status
                ) === "pending"
            );

          const requestIds = [
            ...new Set(
              pendingSteps
                .map(
                  (step) =>
                    step.clearance_request_id
                )
                .filter(Boolean)
            ),
          ];

          if (
            requestIds.length ===
            0
          ) {
            setRequests([]);
            return;
          }

          const {
            data:
              requestRows,
            error:
              requestError,
          } = await supabase
            .from(
              "clearance_requests"
            )
            .select(`
              id,
              student_id,
              school_year,
              semester,
              status,
              requested_at,
              updated_at
            `)
            .in(
              "id",
              requestIds
            );

          if (requestError) {
            throw requestError;
          }

          const studentIds = [
            ...new Set(
              (
                requestRows ||
                []
              )
                .map(
                  (request) =>
                    request.student_id
                )
                .filter(Boolean)
            ),
          ];

          let students = [];

          if (
            studentIds.length >
            0
          ) {
            const {
              data:
                studentRows,
              error:
                studentError,
            } = await supabase
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
              .in(
                "id",
                studentIds
              );

            if (studentError) {
              throw studentError;
            }

            students =
              studentRows || [];
          }

          const studentMap =
            new Map(
              students.map(
                (student) => [
                  student.id,
                  student,
                ]
              )
            );

          const groupedRequests =
            (
              requestRows || []
            )
              .map(
                (
                  request
                ) => {
                  const relatedSteps =
                    pendingSteps.filter(
                      (step) =>
                        step.clearance_request_id ===
                        request.id
                    );

                  return {
                    ...request,
                    student:
                      studentMap.get(
                        request.student_id
                      ) || null,
                    pendingSteps:
                      relatedSteps,
                    pendingStepCount:
                      relatedSteps.length,
                  };
                }
              )
              .filter(
                (request) =>
                  request.pendingStepCount >
                  0
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  new Date(
                    second.requested_at ||
                      0
                  ) -
                  new Date(
                    first.requested_at ||
                      0
                  )
              );

          setRequests(
            groupedRequests
          );
        } catch (
          error
        ) {
          console.error(
            "Load pending requests error:",
            error
          );

          await Swal.fire({
            icon: "error",
            title:
              "Unable to Load Requests",
            text:
              error?.message ||
              "An unexpected error occurred.",
            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadRequests();
  }, [
    loadRequests,
  ]);

  useEffect(() => {
    if (
      !approver?.id
    ) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `pending-requests-${approver.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "clearance_steps",
            filter:
              `approver_id=eq.${approver.id}`,
          },
          () => {
            loadRequests(
              true
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    approver?.id,
    loadRequests,
  ]);

  useEffect(() => {
    const refresh =
      () => {
        if (
          document.visibilityState ===
            "visible" &&
          approver?.id
        ) {
          loadRequests(
            true
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    window.addEventListener(
      "focus",
      refresh
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refresh
      );

      window.removeEventListener(
        "focus",
        refresh
      );
    };
  }, [
    approver?.id,
    loadRequests,
  ]);

  const totalPendingSteps =
    useMemo(
      () =>
        requests.reduce(
          (
            total,
            request
          ) =>
            total +
            request.pendingStepCount,
          0
        ),
      [
        requests,
      ]
    );

  const filteredRequests =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return requests;
      }

      return requests.filter(
        (
          request
        ) =>
          [
            request.student
              ?.full_name,
            request.student
              ?.student_id,
            request.student
              ?.course,
            request.student
              ?.year_level,
            request.semester,
            request.school_year,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              keyword
            )
      );
    }, [
      requests,
      search,
    ]);

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "N/A";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-PH",
      {
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
        hour:
          "numeric",
        minute:
          "2-digit",
      }
    );
  };

  const openRequest =
    (
      request
    ) => {
      navigate(
        "/approver/dashboard",
        {
          state: {
            source:
              "notification",
            notification: {
              id:
                `pending-request-${request.id}-${Date.now()}`,
              title:
                "Pending Clearance Request",
              message:
                `${request.student?.full_name || "Student"} has ${request.pendingStepCount} pending assigned requirement${
                  request.pendingStepCount ===
                  1
                    ? ""
                    : "s"
                }.`,
            },
            focus: {
              requestId:
                request.id,
              studentId:
                request.student?.id ||
                null,
              studentName:
                request.student
                  ?.full_name ||
                null,
            },
          },
        }
      );
    };

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
        className="space-y-6 pb-10"
      >
        <section className="flex flex-col gap-5 rounded-[1.75rem] bg-[#061b51] p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Assigned Reviews
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Pending Clearance Requests
            </h1>

            <p className="mt-2 text-sm text-blue-100/70">
              {
                totalPendingSteps
              } pending requirement
              {totalPendingSteps !==
              1
                ? "s"
                : ""}{" "}
              across{" "}
              {
                requests.length
              } student request
              {requests.length !==
              1
                ? "s"
                : ""}
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadRequests(
                true
              )
            }
            disabled={
              refreshing
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black transition hover:bg-white/15 disabled:opacity-50"
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
              : "Refresh Count"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              type="search"
              placeholder="Search by student, ID, course, year, or term..."
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-5">
                    Student
                  </th>

                  <th className="p-5">
                    Course / Year
                  </th>

                  <th className="p-5">
                    Academic Term
                  </th>

                  <th className="p-5">
                    Requested
                  </th>

                  <th className="p-5">
                    Actual Pending
                  </th>

                  <th className="p-5">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-14 text-center text-slate-500"
                    >
                      Loading the current database count...
                    </td>
                  </tr>
                ) : filteredRequests.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-14 text-center"
                    >
                      <FaUserGraduate className="mx-auto text-5xl text-slate-300" />

                      <p className="mt-4 font-black text-slate-700">
                        No Pending Reviews
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Every clearance step assigned to this approver has been reviewed.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(
                    (
                      request
                    ) => (
                      <tr
                        key={
                          request.id
                        }
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-5">
                          <p className="font-black text-slate-800">
                            {request.student
                              ?.full_name ||
                              "No Name"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {request.student
                              ?.student_id ||
                              "No student number"}
                          </p>
                        </td>

                        <td className="p-5 text-sm text-slate-700">
                          <p className="font-bold">
                            {request.student
                              ?.course ||
                              "Not assigned"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {request.student
                              ?.year_level ||
                              "Year not assigned"}
                          </p>
                        </td>

                        <td className="p-5">
                          <p className="font-bold text-slate-700">
                            {
                              request.semester
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              request.school_year
                            }
                          </p>
                        </td>

                        <td className="p-5 text-sm text-slate-600">
                          {formatDate(
                            request.requested_at
                          )}
                        </td>

                        <td className="p-5">
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
                            <FaClock />

                            {request.pendingStepCount} Pending
                          </span>
                        </td>

                        <td className="p-5">
                          <button
                            type="button"
                            onClick={() =>
                              openRequest(
                                request
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800"
                          >
                            <FaEye />
                            Review on Dashboard
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </motion.main>
    </ApproverLayout>
  );
}

export default PendingRequests;