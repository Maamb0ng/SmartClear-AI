import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { FaUsers, FaCheckCircle, FaClock, FaClipboardList, FaSyncAlt, FaGraduationCap, FaArrowLeft, FaSignOutAlt, FaSearch, FaChevronRight } from "react-icons/fa";

import { supabase } from "../../services/supabase";

const clean = (value) => String(value ?? "").trim();

const isApproved = (value) => clean(value).toLowerCase() === "approved";

const isPending = (value) => clean(value).toLowerCase() === "pending";

const isPresidentOffice = (office) => clean(office?.office_code).toUpperCase() === "PRES";

// Normalize inconsistent academic labels without changing stored records.

const normalizeYear = (value) => {

  const raw = clean(value);

  if (!raw) return "Unassigned Year";

  const match = raw.match(/^(?:year\s*)?([1-4])(?:st|nd|rd|th)?(?:\s*year)?$/i);

  if (!match) return raw;

  const labels = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };

  return labels[Number(match[1])];

};

const normalizeBlock = (value) => {

  const raw = clean(value);

  if (!raw || /^(?:unassigned(?:\s+block)?|block\s+unassigned(?:\s+block)?|n\/?a|null)$/i.test(raw)) return "Unassigned Block";

  return raw.replace(/^block\s+/i, "").trim().toUpperCase();

};

const blockLabel = (value) => value === "Unassigned Block" ? value : `Block ${value}`;

const chunks = (items, size = 150) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

async function getAllRows(queryFactory, pageSize = 500) {

  const results = [];

  for (let from = 0; ; from += pageSize) {

    const { data, error } = await queryFactory().range(from, from + pageSize - 1);

    if (error) throw error;

    results.push(...(data || []));

    if (!data || data.length < pageSize) break;

  }

  return results;

}

async function getByIds(table, columns, field, ids) {

  if (!ids.length) return [];

  const results = await Promise.all(chunks([...new Set(ids)]).map(async (part) => {

    const { data, error } = await supabase.from(table).select(columns).in(field, part);

    if (error) throw error;

    return data || [];

  }));

  return results.flat();

}

/* ---------- Presentation-only helpers (no business logic) ---------- */

const STATUS_STYLE = {

  "Not Submitted": "bg-slate-100 text-slate-600 ring-slate-200",

  "In Progress": "bg-amber-50 text-amber-700 ring-amber-200",

  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",

  Completed: "bg-blue-50 text-blue-700 ring-blue-200",

  "Needs Review": "bg-rose-50 text-rose-700 ring-rose-200",

};

const STATUS_DOT = {

  "Not Submitted": "bg-slate-400",

  "In Progress": "bg-amber-500",

  Ready: "bg-emerald-500",

  Completed: "bg-blue-500",

  "Needs Review": "bg-rose-500",

};

const initialsOf = (name) => clean(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";

function Avatar({ name }) {

  return <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#082a70]/10 text-[11px] font-bold text-[#082a70]">{initialsOf(name)}</span>;

}

function StatusBadge({ student }) {

  return (

    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLE[student.status] || STATUS_STYLE["In Progress"]}`}>

      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[student.status] || STATUS_DOT["In Progress"]}`} />

      {student.status}

    </span>

  );

}

function Progress({ student }) {

  if (!student.requestId) return <span className="text-xs text-slate-400">Not started</span>;

  const percent = student.totalOthers ? Math.round((student.approvedOthers / student.totalOthers) * 100) : 0;

  return (

    <div className="flex items-center gap-2.5">

      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Other signatories approved">

        <div className={`h-full rounded-full transition-[width] duration-500 ${percent === 100 ? "bg-emerald-500" : "bg-[#082a70]"}`} style={{ width: `${percent}%` }} />

      </div>

      <span className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-600">{student.approvedOthers}/{student.totalOthers}</span>

    </div>

  );

}

function Stat({ title, value, loading }) {

  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-medium text-slate-500">{title}</p>{loading ? <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>}</div>;

}

function PresidentDashboard() {

  const navigate = useNavigate();

  const reducedMotion = useReducedMotion();

  const [loggingOut, setLoggingOut] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);

  const [view, setView] = useState("ready");

  const [search, setSearch] = useState("");

  const [course, setCourse] = useState("");

  const [year, setYear] = useState("");

  const [block, setBlock] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const handleLogout = async () => {

    if (loggingOut || !window.confirm("Are you sure you want to log out of the President Workspace?")) return;

    setLoggingOut(true);

    try {

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) throw signOutError;

      navigate("/login", { replace: true });

    } catch (logoutError) {

      setError(logoutError?.message || "Logout failed. Please try again.");

    } finally {

      setLoggingOut(false);

    }

  };

  const loadDashboard = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth?.user) throw new Error("Your session has expired. Please sign in again.");

      const { data: profile, error: profileError } = await supabase.from("users")

        .select("id, role, status").eq("auth_id", auth.user.id).single();

      if (profileError) throw profileError;

      if (profile?.role !== "Approver" || profile?.status !== "Active") {

        throw new Error("An active approver account is required.");

      }

      const { data: assignments, error: assignmentError } = await supabase.from("approver_assignments")

        .select("office_id, offices(office_code, office_name)")

        .eq("approver_id", profile.id).eq("is_active", true);

      if (assignmentError) throw assignmentError;

      const presidentOfficeIds = [...new Set((assignments || []).filter((a) => isPresidentOffice(a.offices)).map((a) => a.office_id))];

      if (!presidentOfficeIds.length) throw new Error("No active School President office assignment was found for this account.");

      // All student profiles are needed for the 'View All Students' directory.

      const studentProfiles = await getAllRows(() => supabase.from("users").select("*").eq("role", "Student").order("id"));

      const studentIds = studentProfiles.map((student) => student.id);

      const sectionIds = [...new Set(studentProfiles.map((student) => student.section_id).filter(Boolean))];

      const sections = await getByIds("sections", "id, course, year_level, block_code, semester, school_year", "id", sectionIds);

      const sectionById = new Map(sections.map((section) => [section.id, section]));

      // Read all clearance requests, including requests without a President step.

      const requests = await getAllRows(() => supabase.from("clearance_requests")

        .select("*"));

      // Prefer the current academic period; never depend on a nonexistent created_at column.

      requests.sort((a, b) => {

        const aKey = `${clean(a.school_year)}|${clean(a.semester)}|${clean(a.submitted_at || a.requested_at || a.updated_at)}|${clean(a.id)}`;

        const bKey = `${clean(b.school_year)}|${clean(b.semester)}|${clean(b.submitted_at || b.requested_at || b.updated_at)}|${clean(b.id)}`;

        return bKey.localeCompare(aKey);

      });

      const studentIdSet = new Set(studentIds);

      const latestByStudent = new Map();

      for (const request of requests) {

        if (studentIdSet.has(request.student_id) && !latestByStudent.has(request.student_id)) {

          latestByStudent.set(request.student_id, request);

        }

      }

      const latestRequests = [...latestByStudent.values()];

      const steps = await getByIds("clearance_steps", "id, clearance_request_id, office_id, status", "clearance_request_id", latestRequests.map((request) => request.id));

      const stepsByRequest = new Map();

      for (const step of steps) {

        const list = stepsByRequest.get(step.clearance_request_id) || [];

        list.push(step);

        stepsByRequest.set(step.clearance_request_id, list);

      }

      const presidentIds = new Set(presidentOfficeIds);

      const result = studentProfiles.map((student) => {

        const request = latestByStudent.get(student.id);

        const section = sectionById.get(student.section_id) || {};

        const requestSteps = request ? (stepsByRequest.get(request.id) || []) : [];

        const presidentStep = requestSteps.find((step) => presidentIds.has(step.office_id));

        const otherSteps = requestSteps.filter((step) => step.id !== presidentStep?.id);

        const approvedOthers = otherSteps.filter((step) => isApproved(step.status)).length;

        const ready = Boolean(request && presidentStep && isPending(presidentStep.status) &&

          clean(request.status).toLowerCase() === "in progress" && otherSteps.length > 0 && approvedOthers === otherSteps.length);

        const completed = Boolean(request && presidentStep && isApproved(presidentStep.status) && clean(request.status).toLowerCase() === "completed");

        const status = !request ? "Not Submitted" : completed ? "Completed" : ready ? "Ready" :

          !presidentStep ? "Needs Review" : "In Progress";

        return {

          id: student.id,

          requestId: request?.id || null,

          name: clean(student.full_name) || clean(student.student_id) || "Student",

          studentId: clean(student.student_id),

          course: clean(section.course || student.course) || "Unassigned Course",

          year: normalizeYear(section.year_level || student.year_level),

          block: normalizeBlock(section.block_code || student.block),

          semester: clean(request?.semester || section.semester) || "Unassigned Semester",

          schoolYear: clean(request?.school_year || section.school_year) || "Unassigned School Year",

          approvedOthers,

          totalOthers: otherSteps.length,

          ready,

          status,

        };

      });

      setStudents(result);

    } catch (err) {

      setError(err?.message || "Unable to load President dashboard.");

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const readyCount = students.filter((s) => s.ready).length;

  const completedCount = students.filter((s) => s.status === "Completed").length;

  const animation = reducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" };

  const matchesSearch = (student) => {

    const needle = search.trim().toLowerCase();

    return !needle || [student.name, student.studentId, student.course, student.year, student.block]

      .some((value) => clean(value).toLowerCase().includes(needle));

  };

  const filtered = useMemo(() => students.filter((student) =>

    matchesSearch(student) && (statusFilter === "all" || student.status === statusFilter)

  ), [students, search, statusFilter]);

  const sorted = (values) => [...new Set(values)].sort((a, b) =>

    String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })

  );

  const courses = useMemo(() => sorted(filtered.map((s) => s.course)), [filtered]);

  const courseStudents = useMemo(() => filtered.filter((s) => s.course === course), [filtered, course]);

  const years = useMemo(() => sorted(courseStudents.map((s) => s.year)), [courseStudents]);

  const yearStudents = useMemo(() => courseStudents.filter((s) => s.year === year), [courseStudents, year]);

  const blocks = useMemo(() => sorted(yearStudents.map((s) => s.block)), [yearStudents]);

  const blockStudents = useMemo(() => yearStudents.filter((s) => s.block === block), [yearStudents, block]);

  const readyStudents = useMemo(() => filtered.filter((s) => s.ready), [filtered]);

  const readyBatches = useMemo(() => {

    const map = new Map();

    for (const student of readyStudents) {

      const key = [student.course, student.year, student.block, student.semester, student.schoolYear].join("|");

      if (!map.has(key)) map.set(key, {

        key, course: student.course, year: student.year, block: student.block,

        semester: student.semester, schoolYear: student.schoolYear, students: [],

      });

      map.get(key).students.push(student);

    }

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));

  }, [readyStudents]);

  // Completed batches remain accessible for read-only review after final approval.
  const completedStudents = useMemo(
    () => filtered.filter((s) => s.status === "Completed"),
    [filtered]
  );

  const completedBatches = useMemo(() => {
    const map = new Map();
    for (const student of completedStudents) {
      const key = [student.course, student.year, student.block, student.semester, student.schoolYear].join("|");
      if (!map.has(key)) map.set(key, {
        key, course: student.course, year: student.year, block: student.block,
        semester: student.semester, schoolYear: student.schoolYear, students: [],
      });
      map.get(key).students.push(student);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [completedStudents]);

  const openBatch = (batch) => {

    navigate(`/president/batch?${new URLSearchParams({

      course: batch.course, year: batch.year, block: batch.block,

      semester: batch.semester, schoolYear: batch.schoolYear,

    }).toString()}`);

  };

  const switchView = (next) => {

    setView(next);

    setCourse("");

    setYear("");

    setBlock("");

    setStatusFilter("all");

    setSearch("");

  };

  const filterButton = (label, active, onClick, count) => (

    <motion.button

      key={label}

      type="button"

      whileHover={reducedMotion ? undefined : { y: -1 }}

      whileTap={reducedMotion ? undefined : { scale: 0.98 }}

      onClick={onClick}

      aria-pressed={active}

      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082a70]/40 ${active ? "border-[#082a70] bg-[#082a70] text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-[#082a70]/30 hover:bg-slate-50"}`}

    >

      {label}

      {typeof count === "number" && <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>}

    </motion.button>

  );

  const studentTable = (items, showAcademic = false) => (

    <div className="bg-white">

      {/* Desktop / tablet table */}

      <div className="hidden overflow-x-auto md:block">

        <table className="w-full text-left">

          <thead className="border-y border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">

            <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th>

              {showAcademic && <th className="px-5 py-3">Academic period</th>}

              <th className="px-5 py-3">Other signatories</th><th className="px-5 py-3">Status</th></tr>

          </thead>

          <tbody className="divide-y divide-slate-100">

            {items.map((student) => <tr key={student.id} className="transition-colors hover:bg-slate-50/70">

              <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={student.name}/><span className="text-sm font-semibold text-slate-800">{student.name}</span></div></td>

              <td className="px-5 py-3.5 text-xs tabular-nums text-slate-500">{student.studentId || "—"}</td>

              {showAcademic && <td className="px-5 py-3.5 text-xs text-slate-500">{student.semester} · {student.schoolYear}</td>}

              <td className="px-5 py-3.5"><Progress student={student}/></td>

              <td className="px-5 py-3.5"><StatusBadge student={student}/></td>

            </tr>)}

          </tbody>

        </table>

      </div>

      {/* Mobile card list */}

      <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">

        {items.map((student) => <li key={student.id} className="space-y-3 px-4 py-4">

          <div className="flex items-start justify-between gap-3">

            <div className="flex min-w-0 items-center gap-3"><Avatar name={student.name}/><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{student.name}</p><p className="text-xs tabular-nums text-slate-500">{student.studentId || "—"}</p></div></div>

            <StatusBadge student={student}/>

          </div>

          {showAcademic && <p className="text-xs text-slate-500">{student.semester} · {student.schoolYear}</p>}

          <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Other signatories</span><Progress student={student}/></div>

        </li>)}

      </ul>

    </div>

  );

  const tabClass = (active) => `flex-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082a70]/40 sm:flex-none ${active ? "bg-white text-[#082a70] shadow-sm" : "text-slate-500 hover:text-slate-800"}`;

  const tabCount = (active) => `ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-[#082a70]/10 text-[#082a70]" : "bg-slate-200/70 text-slate-500"}`;

  const activeBatches = view === "ready" ? readyBatches : completedBatches;

  const batchLabel = view === "ready" ? "ready" : "completed";

  const overview = [

    { label: "All Students", value: students.length, icon: FaUsers, tone: "bg-blue-50 text-blue-700" },

    { label: "Ready for Approval", value: readyCount, icon: FaCheckCircle, tone: "bg-emerald-50 text-emerald-700" },

    { label: "Completed", value: completedCount, icon: FaClipboardList, tone: "bg-indigo-50 text-indigo-700" },

    { label: "Not Submitted", value: students.filter((s) => s.status === "Not Submitted").length, icon: FaClock, tone: "bg-slate-100 text-slate-600" },

  ];

  return (

    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8">

      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">

        <motion.header initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={animation} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061b51] via-[#082a70] to-[#0b3a94] shadow-lg shadow-[#061b51]/20">

          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">

            <div className="flex min-w-0 items-center gap-3">

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur"><FaGraduationCap size={16}/></span>

              <div className="min-w-0 leading-tight">

                <p className="truncate text-sm font-bold tracking-wide text-white">SmartClear <span className="text-sky-300">AI</span></p>

                <p className="hidden text-[11px] text-blue-200/80 sm:block">President Workspace</p>

              </div>

            </div>

            <div className="flex shrink-0 items-center gap-2">

              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-300/30 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300"/>Final signatory</span>

              <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Log out of President Workspace">

                <FaSignOutAlt size={13} /> <span className="hidden sm:inline">{loggingOut ? "Logging out..." : "Logout"}</span>

              </button>

            </div>

          </div>

          <div className="relative flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-7">

            <div>

              <p className="text-xs font-medium text-blue-200/80">Clearance management</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">President's Review Desk</h1>

              <p className="mt-1.5 max-w-xl text-sm text-blue-100/80">Final approvals and organized student clearance records</p>

            </div>

            <button type="button" onClick={loadDashboard} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-white px-4 text-xs font-semibold text-[#082a70] shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-60 sm:self-auto"><FaSyncAlt className={loading ? "animate-spin" : ""}/>{loading ? "Refreshing" : "Refresh data"}</button>

          </div>

        </motion.header>

        {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500"/><span>{error}</span></div>}

        <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">

          {overview.map((item, i) => <motion.div key={item.label} initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ ...animation, delay: reducedMotion ? 0 : i * 0.035 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

            <div className="flex items-start justify-between gap-2">

              <span className="text-xs font-medium leading-snug text-slate-500 sm:text-sm">{item.label}</span>

              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${item.tone}`}><item.icon size={14}/></span>

            </div>

            {loading ? <div className="mt-3 h-8 w-14 animate-pulse rounded bg-slate-100"/> : <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-3xl">{item.value}</p>}

          </motion.div>)}

        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Student clearance directory">

          <div className="space-y-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div><h2 className="text-base font-bold text-slate-900">Student clearance directory</h2><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Select a view to manage student clearance records</p></div>

              <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 lg:w-auto" role="group" aria-label="Student view">

                <button type="button" aria-pressed={view === "ready"} onClick={() => switchView("ready")} className={tabClass(view === "ready")}>Ready for Approval <span className={tabCount(view === "ready")}>{readyCount}</span></button>

                <button type="button" aria-pressed={view === "completed"} onClick={() => switchView("completed")} className={tabClass(view === "completed")}>Completed <span className={tabCount(view === "completed")}>{completedCount}</span></button>

                <button type="button" aria-pressed={view === "all"} onClick={() => switchView("all")} className={tabClass(view === "all")}>All Students</button>

              </div>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">

              <div className="relative flex-1 sm:max-w-sm">

                <FaSearch aria-hidden="true" size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>

                <input value={search} onChange={(e) => { setSearch(e.target.value); setCourse(""); setYear(""); setBlock(""); }} placeholder="Search student, course or ID..." aria-label="Search students" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#082a70] focus:bg-white focus:ring-2 focus:ring-[#082a70]/15"/>

              </div>

              {view === "all" && <select aria-label="Filter by clearance status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCourse(""); setYear(""); setBlock(""); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-[#082a70] focus:ring-2 focus:ring-[#082a70]/15"><option value="all">All statuses</option><option value="Not Submitted">Not submitted</option><option value="In Progress">In progress</option><option value="Ready">Ready</option><option value="Completed">Completed</option><option value="Needs Review">Needs review</option></select>}

              {view === "all" && <span className="text-xs font-medium text-slate-500 sm:ml-auto">{filtered.length} students</span>}

            </div>

          </div>

          {loading ? <div className="space-y-3 p-4 sm:p-6">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : (

            <AnimatePresence mode="wait" initial={false}>

              {view === "ready" || view === "completed" ? (

                <motion.div key={view} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={animation} className="p-3 sm:p-6">

                  {activeBatches.length === 0 ? <div className="flex flex-col items-center py-14 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FaCheckCircle size={20}/></span><p className="text-sm font-semibold text-slate-700">{view === "ready" ? "No students ready for approval yet" : "No completed students yet"}</p><p className="mt-1 max-w-xs text-xs text-slate-500">{view === "ready" ? "Open All Students to check clearance progress." : "Completed approvals will appear here."}</p></div> :

                    <div className="space-y-4">{activeBatches.map((batch) => <div key={batch.key} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">

                      <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                        <div className="min-w-0">

                          <p className="text-sm font-bold text-slate-800">{batch.course} · {batch.year} · {blockLabel(batch.block)}</p>

                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span>{batch.semester} · {batch.schoolYear}</span><span className="inline-flex items-center rounded-full bg-[#082a70]/10 px-2 py-0.5 font-semibold text-[#082a70]">{batch.students.length} {batchLabel}</span></p>

                        </div>

                        <button type="button" onClick={() => openBatch(batch)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#082a70] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#061b51] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082a70]/50 focus-visible:ring-offset-2">{view === "ready" ? "Review batch" : "View batch details"}<FaChevronRight size={10}/></button>

                      </div>

                      {studentTable(batch.students)}

                    </div>)}</div>}

                </motion.div>

              ) : (

                <motion.div key="all" initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={animation} className="space-y-6 p-4 sm:p-6">

                  <nav aria-label="Browse steps" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">

                    <span className="font-semibold text-[#082a70]">Course</span><FaChevronRight size={8}/>

                    <span className={course ? "font-semibold text-[#082a70]" : ""}>Year level</span><FaChevronRight size={8}/>

                    <span className={year ? "font-semibold text-[#082a70]" : ""}>Block</span><FaChevronRight size={8}/>

                    <span className={block ? "font-semibold text-[#082a70]" : ""}>Students</span>

                  </nav>

                  <div><p className="mb-2.5 text-sm font-semibold text-slate-700">Select a course</p><div className="flex flex-wrap gap-2">{courses.map((value) => filterButton(value, course === value, () => { setCourse(value); setYear(""); setBlock(""); }, filtered.filter((s) => s.course === value).length))}</div></div>

                  {course && <motion.div initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={animation}><p className="mb-2.5 text-sm font-semibold text-slate-700">Select a year level</p><div className="flex flex-wrap gap-2">{years.map((value) => filterButton(value, year === value, () => { setYear(value); setBlock(""); }, courseStudents.filter((s) => s.year === value).length))}</div></motion.div>}

                  {course && year && <motion.div initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={animation}><p className="mb-2.5 text-sm font-semibold text-slate-700">Select a block</p><div className="flex flex-wrap gap-2">{blocks.map((value) => filterButton(blockLabel(value), block === value, () => setBlock(value), yearStudents.filter((s) => s.block === value).length))}</div></motion.div>}

                  {course && year && block && <motion.div initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={animation} className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-bold text-slate-800 sm:text-base">{course} · {year} · {blockLabel(block)}</h3><p className="mt-0.5 text-xs text-slate-500">{blockStudents.length} students · Clearance progress and status</p></div><button type="button" onClick={() => setBlock("")} className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082a70]/40 sm:self-auto"><FaArrowLeft size={10}/> Change block</button></div><div className="overflow-hidden rounded-xl border border-slate-200">{studentTable(blockStudents, true)}</div><p className="text-xs text-slate-400">To approve eligible students, switch to Ready for Approval and open their batch.</p></motion.div>}

                  {courses.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No students match your filters.</p>}

                  {courses.length > 0 && !course && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Choose a course above to browse its year levels and blocks.</p>}

                </motion.div>

              )}

            </AnimatePresence>

          )}

        </section>

        <p className="px-1 text-[11px] leading-relaxed text-slate-400">Final approval is available only after all other signatories have approved. Server-side validation remains enforced.</p>

      </div>

    </main>

  );

}

export default PresidentDashboard;