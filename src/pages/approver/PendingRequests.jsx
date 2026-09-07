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
  FaFilter,
  FaSortAmountDown,
  FaBookOpen,
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

  const [
    courseFilter,
    setCourseFilter,
  ] = useState("All");

  const [
    yearFilter,
    setYearFilter,
  ] = useState("All");

  const [
    sortOrder,
    setSortOrder,
  ] = useState("newest");

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

  const courseOptions =
    useMemo(
      () =>
        [
          ...new Set(
            requests
              .map(
                (request) =>
                  request.student?.course
              )
              .filter(Boolean)
          ),
        ].sort(),
      [requests]
    );

  const yearOptions =
    useMemo(
      () =>
        [
          ...new Set(
            requests
              .map(
                (request) =>
                  request.student?.year_level
              )
              .filter(Boolean)
          ),
        ].sort(),
      [requests]
    );

  const filteredRequests =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const result =
        requests.filter(
          (
            request
          ) => {
            const matchesSearch =
              !keyword ||
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
                );

            const matchesCourse =
              courseFilter ===
                "All" ||
              request.student
                ?.course ===
                courseFilter;

            const matchesYear =
              yearFilter ===
                "All" ||
              request.student
                ?.year_level ===
                yearFilter;

            return (
              matchesSearch &&
              matchesCourse &&
              matchesYear
            );
          }
        );

      return [
        ...result,
      ].sort(
        (
          first,
          second
        ) => {
          if (
            sortOrder ===
            "oldest"
          ) {
            return (
              new Date(
                first.requested_at ||
                  0
              ) -
              new Date(
                second.requested_at ||
                  0
              )
            );
          }

          if (
            sortOrder ===
            "name"
          ) {
            return String(
              first.student
                ?.full_name ||
                ""
            ).localeCompare(
              String(
                second.student
                  ?.full_name ||
                  ""
              )
            );
          }

          if (
            sortOrder ===
            "most-pending"
          ) {
            return (
              second.pendingStepCount -
              first.pendingStepCount
            );
          }

          return (
            new Date(
              second.requested_at ||
                0
            ) -
            new Date(
              first.requested_at ||
                0
            )
          );
        }
      );
    }, [
      requests,
      search,
      courseFilter,
      yearFilter,
      sortOrder,
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
        <section className="overflow-hidden rounded-[1.75rem] bg-[#061b51] text-white shadow-xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                Review Workspace
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Pending Clearances
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-100/70">
                Find students who still have clearance requirements assigned to you, then continue the review on your dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadRequests(true)
              }
              disabled={refreshing}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black transition hover:bg-white/15 disabled:opacity-50"
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

          <div className="grid border-t border-white/10 sm:grid-cols-2">
            <div className="flex items-center gap-4 border-b border-white/10 p-5 sm:border-b-0 sm:border-r">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                <FaClock className="text-xl" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100/60">
                  Pending Requirements
                </p>
                <p className="mt-1 text-2xl font-black">
                  {totalPendingSteps}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                <FaUserGraduate className="text-xl" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100/60">
                  Students With Pending
                </p>
                <p className="mt-1 text-2xl font-black">
                  {requests.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-blue-700" />
                <h2 className="font-black text-slate-800">
                  Find a Student
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Search, filter by class information, or sort the pending queue.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCourseFilter("All");
                setYearFilter("All");
                setSortOrder("newest");
              }}
              className="text-sm font-black text-blue-700 transition hover:text-blue-900"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                type="search"
                placeholder="Search student name or ID..."
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(
                  event.target.value
                )
              }
              className="h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:bg-white"
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
              className="h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="All">
                All Year Levels
              </option>

              {yearOptions.map(
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

            <div className="relative">
              <FaSortAmountDown className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value="newest">
                  Newest Request
                </option>
                <option value="oldest">
                  Oldest Request
                </option>
                <option value="most-pending">
                  Most Pending
                </option>
                <option value="name">
                  Student A-Z
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-800">
                {filteredRequests.length}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-800">
                {requests.length}
              </strong>{" "}
              students
            </span>

            {(search ||
              courseFilter !== "All" ||
              yearFilter !== "All") && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                Filter active
              </span>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FaBookOpen />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Student Review Queue
              </h2>
              <p className="text-sm text-slate-500">
                Click a student to continue reviewing the requirements assigned to you.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-14 text-center shadow-lg">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
              <p className="font-semibold text-slate-500">
                Loading the current database count...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-14 text-center shadow-lg">
              <FaUserGraduate className="mx-auto text-5xl text-slate-300" />

              <p className="mt-4 font-black text-slate-700">
                No Pending Reviews
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {requests.length === 0
                  ? "Every clearance step assigned to this approver has been reviewed."
                  : "No students match your current search and filters."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRequests.map(
                (request) => (
                  <motion.button
                    whileHover={{
                      y: -2,
                    }}
                    key={request.id}
                    type="button"
                    onClick={() =>
                      openRequest(
                        request
                      )
                    }
                    className="group w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-md transition hover:border-blue-200 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4 p-5">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                          <FaUserGraduate className="text-lg" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-900">
                            {request.student
                              ?.full_name ||
                              "No Name"}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {request.student
                              ?.student_id ||
                              "No student number"}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                        <FaClock />
                        {request.pendingStepCount} Pending
                      </span>
                    </div>

                    <div className="grid border-y border-slate-100 bg-slate-50/70 sm:grid-cols-2">
                      <div className="border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Course / Year
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {request.student
                            ?.course ||
                            "Not assigned"}{" "}
                          •{" "}
                          {request.student
                            ?.year_level ||
                            "Year not assigned"}
                        </p>
                      </div>

                      <div className="px-5 py-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Academic Term
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {request.semester ||
                            "No semester"}
                          {request.school_year
                            ? ` • ${request.school_year}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Requested
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {formatDate(
                            request.requested_at
                          )}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition group-hover:bg-blue-800 sm:self-auto">
                        <FaEye />
                        Open on Dashboard
                      </div>
                    </div>
                  </motion.button>
                )
              )}
            </div>
          )}
        </section>
      </motion.main>
    </ApproverLayout>
  );
}

export default PendingRequests;