import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import Swal from "sweetalert2";

import {

  FaArrowLeft,

  FaCheckCircle,

  FaChevronDown,

  FaClock,

  FaExclamationTriangle,

  FaSearch,

  FaSyncAlt,

  FaTimes,

  FaUserGraduate,

} from "react-icons/fa";

import { supabase } from "../../services/supabase";

/*

\|--------------------------------------------------------------------------

\| HELPERS

\|--------------------------------------------------------------------------

*/

const value = (v) => String(v ?? "").trim();

const isApproved = (v) => value(v).toLowerCase() === "approved";

const isPresidentOffice = (office) => {

  const code = value(office?.office_code).toUpperCase();

  const name = value(office?.office_name).toLowerCase();

  return code === "PRES" || name === "school president";

};

const TABS = [

  { key: "all", label: "All" },

  { key: "ready", label: "Ready" },

  { key: "not-ready", label: "Not Ready" },

  { key: "approved", label: "President Approved" },

];

const getStudentBucket = (student) => {

  if (isApproved(student.presidentStatus)) return "approved";

  return student.ready ? "ready" : "not-ready";

};

const getNotReadyReason = ({ presidentStep, request, otherSteps }) => {

  if (!presidentStep) return "No School President step is assigned to you.";

  if (isApproved(presidentStep.status)) return "";

  if (value(presidentStep.status) !== "Pending") {

    return `Your step is marked ${value(presidentStep.status)}.`;

  }

  if (value(request.status) !== "In Progress") {

    return `The clearance request is ${value(request.status) || "not in progress"}.`;

  }

  if (!otherSteps.length) return "No other signatories were found yet.";

  return "";

};

const getStepLabel = (step) =>

  step.officeName || step.subjectName || value(step.step_type) || "Clearance step";

const stepStatusClass = (status) => {

  if (isApproved(status)) return "bg-emerald-50 text-emerald-700";

  if (value(status).toLowerCase() === "rejected") return "bg-rose-50 text-rose-700";

  return "bg-amber-50 text-amber-700";

};

/*

\|--------------------------------------------------------------------------

\| PAGE

\|--------------------------------------------------------------------------

*/

export default function BatchDetails() {

  const navigate = useNavigate();

  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);

  const [tab, setTab] = useState("all");

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState([]);

  const [expanded, setExpanded] = useState([]);

  const [approving, setApproving] = useState(false);

  const course = value(params.get("course"));

  const year = value(params.get("year"));

  const block = value(params.get("block"));

  const semester = value(params.get("semester"));

  const schoolYear = value(params.get("schoolYear"));

  const hasBatch = Boolean(course && year && block && semester && schoolYear);

  /*

  |--------------------------------------------------------------------------

  | LOAD BATCH

  |--------------------------------------------------------------------------

  */

  const load = useCallback(async () => {

    setLoading(true);

    setError("");

    setSelected([]);

    try {

      if (!hasBatch) {

        throw new Error(

          "Missing batch details. Open a batch from the President Dashboard."

        );

      }

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth?.user) throw new Error("Please sign in again.");

      const { data: profile, error: profileError } = await supabase

        .from("users")

        .select("id, role, status")

        .eq("auth_id", auth.user.id)

        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "Approver" || profile?.status !== "Active") {

        throw new Error("Active approver account required.");

      }

      const { data: assignments, error: assignmentError } = await supabase

        .from("approver_assignments")

        .select("office_id, offices(office_code, office_name)")

        .eq("approver_id", profile.id)

        .eq("is_active", true);

      if (assignmentError) throw assignmentError;

      const officeIds = [

        ...new Set(

          (assignments || [])

            .filter((a) => isPresidentOffice(a.offices))

            .map((a) => a.office_id)

        ),

      ];

      if (!officeIds.length) {

        throw new Error("This account has no active School President assignment.");

      }

      const { data: presidentSteps, error: presidentError } = await supabase

        .from("clearance_steps")

        .select("id, clearance_request_id, status, office_id, approver_id")

        .in("office_id", officeIds);

      if (presidentError) throw presidentError;

      const requestIds = [

        ...new Set(

          (presidentSteps || [])

            .map((s) => s.clearance_request_id)

            .filter(Boolean)

        ),

      ];

      if (!requestIds.length) {

        setStudents([]);

        return;

      }

      const [requestsResult, stepsResult] = await Promise.all([

        supabase.from("clearance_requests").select("*").in("id", requestIds),

        supabase

          .from("clearance_steps")

          .select(

            "id, clearance_request_id, step_type, status, office_id, subject_id, remarks"

          )

          .in("clearance_request_id", requestIds),

      ]);

      if (requestsResult.error) throw requestsResult.error;

      if (stepsResult.error) throw stepsResult.error;

      const requests = requestsResult.data || [];

      const userIds = [

        ...new Set(

          requests.map((r) => r.student_id || r.user_id).filter(Boolean)

        ),

      ];

      const usersResult = userIds.length

        ? await supabase.from("users").select("*").in("id", userIds)

        : { data: [], error: null };

      if (usersResult.error) throw usersResult.error;

      const users = new Map((usersResult.data || []).map((u) => [u.id, u]));

      const sectionIds = [

        ...new Set(

          (usersResult.data || []).map((u) => u.section_id).filter(Boolean)

        ),

      ];

      const sectionsResult = sectionIds.length

        ? await supabase.from("sections").select("*").in("id", sectionIds)

        : { data: [], error: null };

      if (sectionsResult.error) throw sectionsResult.error;

      const sections = new Map(

        (sectionsResult.data || []).map((s) => [s.id, s])

      );

      /*

      | Friendly signatory names (office / subject). If these lookups are not

      | permitted for this account the page still works with the step type.

      */

      const stepRows = stepsResult.data || [];

      const stepOfficeIds = [

        ...new Set(stepRows.map((s) => s.office_id).filter(Boolean)),

      ];

      const stepSubjectIds = [

        ...new Set(stepRows.map((s) => s.subject_id).filter(Boolean)),

      ];

      const [officeNamesResult, subjectNamesResult] = await Promise.all([

        stepOfficeIds.length

          ? supabase

              .from("offices")

              .select("id, office_name")

              .in("id", stepOfficeIds)

          : { data: [], error: null },

        stepSubjectIds.length

          ? supabase

              .from("subjects")

              .select("id, subject_name")

              .in("id", stepSubjectIds)

          : { data: [], error: null },

      ]);

      if (officeNamesResult.error) {

        console.warn("Unable to load office names:", officeNamesResult.error);

      }

      if (subjectNamesResult.error) {

        console.warn("Unable to load subject names:", subjectNamesResult.error);

      }

      const officeNames = new Map(

        (officeNamesResult.data || []).map((o) => [o.id, o.office_name])

      );

      const subjectNames = new Map(

        (subjectNamesResult.data || []).map((s) => [s.id, s.subject_name])

      );

      const stepsByRequest = new Map();

      for (const step of stepRows) {

        const list = stepsByRequest.get(step.clearance_request_id) || [];

        list.push({

          ...step,

          officeName: step.office_id ? value(officeNames.get(step.office_id)) : "",

          subjectName: step.subject_id

            ? value(subjectNames.get(step.subject_id))

            : "",

        });

        stepsByRequest.set(step.clearance_request_id, list);

      }

      const presidentByRequest = new Map(

        (presidentSteps || [])

          .filter((s) => s.approver_id === profile.id)

          .map((s) => [s.clearance_request_id, s])

      );

      const result = requests.flatMap((request) => {

        const user = users.get(request.student_id || request.user_id) || {};

        const section = sections.get(user.section_id) || {};

        const fields = {

          course:

            value(section.course || user.course || request.course) ||

            "Unassigned Course",

          year:

            value(section.year_level || user.year_level || request.year_level) ||

            "Unassigned Year",

          block:

            value(section.block_code || user.block || request.block) ||

            "Unassigned Block",

          semester:

            value(section.semester || request.semester) || "Unassigned Semester",

          schoolYear:

            value(section.school_year || request.school_year) ||

            "Unassigned School Year",

        };

        if (

          fields.course !== course ||

          fields.year !== year ||

          fields.block !== block ||

          fields.semester !== semester ||

          fields.schoolYear !== schoolYear

        ) {

          return [];

        }

        const presidentStep = presidentByRequest.get(request.id);

        const otherSteps = (stepsByRequest.get(request.id) || []).filter(

          (s) => s.id !== presidentStep?.id

        );

        const ready = Boolean(

          presidentStep &&

            value(presidentStep.status) === "Pending" &&

            value(request.status) === "In Progress" &&

            otherSteps.length &&

            otherSteps.every((s) => isApproved(s.status))

        );

        return [

          {

            id: request.id,

            presidentStepId: presidentStep?.id,

            name:

              value(

                user.full_name ||

                  user.name ||

                  [user.first_name, user.last_name].filter(Boolean).join(" ")

              ) || "Student",

            studentId: value(user.student_id),

            presidentStatus: value(presidentStep?.status) || "Pending",

            requestStatus: value(request.status),

            ready,

            notReadyReason: getNotReadyReason({

              presidentStep,

              request,

              otherSteps,

            }),

            otherSteps,

          },

        ];

      });

      setStudents(result.sort((a, b) => a.name.localeCompare(b.name)));

    } catch (err) {

      setError(err?.message || "Unable to load this batch.");

      setStudents([]);

    } finally {

      setLoading(false);

    }

  }, [hasBatch, course, year, block, semester, schoolYear]);

  useEffect(() => {

    load();

  }, [load]);

  /*

  |--------------------------------------------------------------------------

  | FILTERING

  |--------------------------------------------------------------------------

  */

  const readyStudents = useMemo(

    () => students.filter((s) => s.ready),

    [students]

  );

  const searchFiltered = useMemo(() => {

    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((s) =>

      `${s.name} ${s.studentId}`.toLowerCase().includes(query)

    );

  }, [students, search]);

  const counts = useMemo(() => {

    const result = {

      all: searchFiltered.length,

      ready: 0,

      "not-ready": 0,

      approved: 0,

    };

    searchFiltered.forEach((student) => {

      result[getStudentBucket(student)] += 1;

    });

    return result;

  }, [searchFiltered]);

  const visible = useMemo(

    () =>

      tab === "all"

        ? searchFiltered

        : searchFiltered.filter((s) => getStudentBucket(s) === tab),

    [searchFiltered, tab]

  );

  const visibleReady = useMemo(

    () => visible.filter((s) => s.ready),

    [visible]

  );

  const allVisibleReadySelected =

    visibleReady.length > 0 &&

    visibleReady.every((s) => selected.includes(s.id));

  /*

  |--------------------------------------------------------------------------

  | SELECTION

  |--------------------------------------------------------------------------

  */

  const toggle = (id) =>

    setSelected((current) =>

      current.includes(id)

        ? current.filter((item) => item !== id)

        : [...current, id]

    );

  const selectAllReady = () => setSelected(readyStudents.map((s) => s.id));

  const toggleVisibleReady = () =>

    setSelected((current) => {

      if (allVisibleReadySelected) {

        const visibleIds = new Set(visibleReady.map((s) => s.id));

        return current.filter((id) => !visibleIds.has(id));

      }

      return [...new Set([...current, ...visibleReady.map((s) => s.id)])];

    });

  const toggleExpanded = (id) =>

    setExpanded((current) =>

      current.includes(id)

        ? current.filter((item) => item !== id)

        : [...current, id]

    );

  /*

  |--------------------------------------------------------------------------

  | FINAL APPROVAL

  |--------------------------------------------------------------------------

  */

  const approveSelected = async (studentIds = selected) => {

    if (approving || loading || !studentIds.length) return;

    const chosen = students.filter((s) => studentIds.includes(s.id));

    if (

      chosen.length !== studentIds.length ||

      chosen.some((s) => !s.ready || !s.presidentStepId)

    ) {

      await Swal.fire(

        "Selection changed",

        "Refresh the batch and select ready students again.",

        "warning"

      );

      return;

    }

    const confirm = await Swal.fire({

      title: "Final approve selected students?",

      text: `Approve ${chosen.length} ready student(s) as School President? This action cannot be undone here.`,

      icon: "question",

      showCancelButton: true,

      confirmButtonText: "Final Approve",

      confirmButtonColor: "#0891b2",

    });

    if (!confirm.isConfirmed) return;

    setApproving(true);

    try {

      const { data, error: rpcError } = await supabase.rpc(

        "approve_selected_president_students",

        {

          p_step_ids: chosen.map((s) => s.presidentStepId),

          p_remarks: "Final approval by School President.",

        }

      );

      if (rpcError) throw rpcError;

      if (!data?.success || Number(data.approvedCount) !== chosen.length) {

        throw new Error(

          "Unexpected approval response. Refresh and verify results."

        );

      }

      await Swal.fire(

        "Final approval complete",

        `${data.approvedCount} student(s) approved.`,

        "success"

      );

      await load();

    } catch (err) {

      await Swal.fire(

        "Approval failed",

        err?.message || "Unable to approve selected students.",

        "error"

      );

    } finally {

      setApproving(false);

    }

  };

  /*

  |--------------------------------------------------------------------------

  | RENDER

  |--------------------------------------------------------------------------

  */

  const batchChips = [

    { label: "Course", value: course || "—" },

    { label: "Year", value: year || "—" },

    { label: "Block", value: block || "—" },

    { label: "Semester", value: semester || "—" },

    { label: "School Year", value: schoolYear || "—" },

  ];

  return (

    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-8">

      <div className="mx-auto max-w-6xl space-y-5 pb-28">

        {/* HEADER */}

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">

                SmartClear AI · School President

              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">

                Batch Details

              </h1>

              <div className="mt-3 flex flex-wrap gap-2">

                {batchChips.map((chip) => (

                  <span

                    key={chip.label}

                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs"

                  >

                    <span className="font-semibold text-slate-400">

                      {chip.label}

                    </span>

                    <span className="font-bold text-slate-700">{chip.value}</span>

                  </span>

                ))}

              </div>

            </div>

            <div className="flex shrink-0 gap-2">

              <button

                type="button"

                onClick={() => navigate("/president/dashboard")}

                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"

              >

                <FaArrowLeft className="text-xs" />

                Back to batches

              </button>

              <button

                type="button"

                onClick={load}

                disabled={loading}

                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"

              >

                <FaSyncAlt className={`text-xs ${loading ? "animate-spin" : ""}`} />

                Refresh

              </button>

            </div>

          </div>

        </header>

        {/* INFO + ERROR */}

        <p className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">

          <FaExclamationTriangle className="mt-0.5 shrink-0" />

          Only ready students can be selected. The server rechecks all other

          signatories before final approval.

        </p>

        {error && (

          <div

            role="alert"

            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700"

          >

            <p className="text-sm font-medium">{error}</p>

            {hasBatch && (

              <button

                type="button"

                onClick={load}

                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"

              >

                Try again

              </button>

            )}

          </div>

        )}

        {/* TOOLBAR */}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            <div className="relative flex-1">

              <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input

                aria-label="Search students"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

                placeholder="Search student name or ID"

                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"

              />

              {search && (

                <button

                  type="button"

                  onClick={() => setSearch("")}

                  aria-label="Clear search"

                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"

                >

                  <FaTimes className="text-xs" />

                </button>

              )}

            </div>

            <div className="flex flex-wrap gap-2">

              <button

                type="button"

                onClick={selectAllReady}

                disabled={!readyStudents.length}

                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"

              >

                Select all ready ({readyStudents.length})

              </button>

              {selected.length > 0 && (

                <button

                  type="button"

                  onClick={() => setSelected([])}

                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"

                >

                  Clear selection

                </button>

              )}

            </div>

          </div>

          <div

            role="tablist"

            aria-label="Filter students by status"

            className="flex flex-wrap gap-2"

          >

            {TABS.map((item) => {

              const isActive = tab === item.key;

              const count = counts[item.key];

              return (

                <button

                  key={item.key}

                  type="button"

                  role="tab"

                  aria-selected={isActive}

                  onClick={() => setTab(item.key)}

                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${

                    isActive

                      ? "bg-indigo-600 text-white shadow-sm"

                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"

                  }`}

                >

                  {item.label}

                  <span

                    className={`rounded-full px-2 py-0.5 text-xs font-black ${

                      isActive

                        ? "bg-white/20 text-white"

                        : item.key === "ready" && count > 0

                          ? "bg-emerald-100 text-emerald-700"

                          : "bg-white text-slate-500"

                    }`}

                  >

                    {count}

                  </span>

                </button>

              );

            })}

          </div>

        </section>

        {/* STUDENT LIST */}

        {loading ? (

          <div className="space-y-3">

            {[1, 2, 3, 4].map((item) => (

              <div

                key={item}

                className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"

              >

                <div className="flex items-center gap-3">

                  <div className="h-4 w-4 rounded bg-slate-200" />

                  <div className="flex-1">

                    <div className="h-3.5 w-48 rounded bg-slate-200" />

                    <div className="mt-2 h-3 w-28 rounded bg-slate-100" />

                  </div>

                  <div className="h-6 w-20 rounded-full bg-slate-100" />

                </div>

              </div>

            ))}

          </div>

        ) : visible.length === 0 ? (

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <FaUserGraduate className="mx-auto text-3xl text-slate-300" />

            <p className="mt-3 font-semibold text-slate-700">

              {students.length === 0

                ? "No students found in this batch."

                : "No students match this view."}

            </p>

            {students.length > 0 && (

              <button

                type="button"

                onClick={() => {

                  setSearch("");

                  setTab("all");

                }}

                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"

              >

                Show all students

              </button>

            )}

          </div>

        ) : (

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">

              <input

                type="checkbox"

                aria-label="Select all visible ready students"

                checked={allVisibleReadySelected}

                disabled={!visibleReady.length}

                onChange={toggleVisibleReady}

                className="h-4 w-4 accent-indigo-600"

              />

              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">

                {visible.length} student{visible.length === 1 ? "" : "s"} •{" "}

                {visibleReady.length} ready

              </p>

            </div>

            <div className="divide-y divide-slate-100">

              {visible.map((student) => {

                const approvedCount = student.otherSteps.filter((s) =>

                  isApproved(s.status)

                ).length;

                const totalCount = student.otherSteps.length;

                const percentage = totalCount

                  ? Math.round((approvedCount / totalCount) * 100)

                  : 0;

                const pendingSteps = student.otherSteps.filter(

                  (s) => !isApproved(s.status)

                );

                const isOpen = expanded.includes(student.id);

                const sortedSteps = [...student.otherSteps].sort((a, b) => {

                  const aDone = isApproved(a.status) ? 1 : 0;

                  const bDone = isApproved(b.status) ? 1 : 0;

                  return aDone - bDone;

                });

                return (

                  <article key={student.id}>

                    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">

                      <div className="flex min-w-0 flex-1 items-start gap-3">

                        <input

                          type="checkbox"

                          aria-label={`Select ${student.name}`}

                          title={

                            student.ready

                              ? "Select for final approval"

                              : student.notReadyReason ||

                                "Not available for selection"

                          }

                          checked={selected.includes(student.id)}

                          disabled={!student.ready}

                          onChange={() => toggle(student.id)}

                          className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"

                        />

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-slate-900">

                            {student.name}

                          </p>

                          <p className="text-sm text-slate-500">

                            {student.studentId || "No student ID"}

                          </p>

                          {!student.ready &&

                            !isApproved(student.presidentStatus) && (

                              <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-amber-700">

                                <FaClock className="mt-0.5 shrink-0" />

                                <span>

                                  {student.notReadyReason ||

                                    `Waiting on ${pendingSteps.length} signator${

                                      pendingSteps.length === 1 ? "y" : "ies"

                                    }: ${pendingSteps

                                      .slice(0, 3)

                                      .map(getStepLabel)

                                      .join(", ")}${

                                      pendingSteps.length > 3

                                        ? `, +${pendingSteps.length - 3} more`

                                        : ""

                                    }`}

                                </span>

                              </p>

                            )}

                        </div>

                      </div>

                      <div className="w-full sm:w-44">

                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">

                          <span>

                            {approvedCount}/{totalCount} signatories

                          </span>

                          <span>{percentage}%</span>

                        </div>

                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">

                          <div

                            className={`h-full rounded-full transition-all ${

                              percentage === 100

                                ? "bg-emerald-500"

                                : "bg-indigo-500"

                            }`}

                            style={{ width: `${percentage}%` }}

                          />

                        </div>

                      </div>

                      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">

                        <span

                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${

                            isApproved(student.presidentStatus)

                              ? "bg-blue-50 text-blue-700"

                              : student.ready

                                ? "bg-emerald-50 text-emerald-700"

                                : "bg-amber-50 text-amber-700"

                          }`}

                        >

                          {(isApproved(student.presidentStatus) ||

                            student.ready) && <FaCheckCircle />}

                          {isApproved(student.presidentStatus)

                            ? "President Approved"

                            : student.ready

                              ? "Ready"

                              : "Not Ready"}

                        </span>

                                                  {student.ready && (
                            <button
                              type="button"
                              onClick={() => approveSelected([student.id])}
                              disabled={approving || loading}
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {approving ? "Processing..." : "Final Approve"}
                            </button>
                          )}

<button

                          type="button"

                          onClick={() => toggleExpanded(student.id)}

                          aria-expanded={isOpen}

                          aria-label={

                            isOpen ? "Hide signatories" : "Show signatories"

                          }

                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"

                        >

                          <FaChevronDown

                            className={`text-xs transition-transform ${

                              isOpen ? "rotate-180" : ""

                            }`}

                          />

                        </button>

                      </div>

                    </div>

                    {isOpen && (

                      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:pl-11">

                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">

                          Other signatories

                        </p>

                        {sortedSteps.length === 0 ? (

                          <p className="text-sm text-slate-500">

                            No other signatories found.

                          </p>

                        ) : (

                          <div className="space-y-2">

                            {sortedSteps.map((step) => (

                              <div

                                key={step.id}

                                className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"

                              >

                                <div className="min-w-0">

                                  <p className="font-medium text-slate-700">

                                    {getStepLabel(step)}

                                  </p>

                                  {step.remarks && (

                                    <p className="mt-0.5 text-xs text-slate-500">

                                      {step.remarks}

                                    </p>

                                  )}

                                </div>

                                <span

                                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stepStatusClass(

                                    step.status

                                  )}`}

                                >

                                  {value(step.status) || "Pending"}

                                </span>

                              </div>

                            ))}

                          </div>

                        )}

                      </div>

                    )}

                  </article>

                );

              })}

            </div>

          </section>

        )}

      </div>

      {/* SELECTION ACTION BAR */}

      {selected.length > 0 && (

        <div className="fixed inset-x-0 bottom-4 z-40 px-4">

          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 pl-5 shadow-2xl">

            <p className="text-sm font-semibold text-slate-700">

              <span className="text-lg font-black text-indigo-600">

                {selected.length}

              </span>{" "}

              student{selected.length === 1 ? "" : "s"} selected

            </p>

            <div className="flex gap-2">

              <button

                type="button"

                onClick={() => setSelected([])}

                disabled={approving}

                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"

              >

                Clear

              </button>

              <button

                type="button"

                onClick={() => approveSelected()}

                disabled={approving || loading || !selected.length}

                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"

              >

                {approving

                  ? "Approving..."

                  : `Final Approve Selected (${selected.length})`}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}
