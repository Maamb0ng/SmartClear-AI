import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "../../services/supabase";
import Swal from "sweetalert2";



const value = (v) => String(v ?? "").trim();

const isApproved = (v) => value(v).toLowerCase() === "approved";

const isPresidentOffice = (office) => {

  const code = value(office?.office_code).toUpperCase();

  const name = value(office?.office_name).toLowerCase();

  return code === "PRES" || name === "school president";

};



export default function BatchDetails() {

  const navigate = useNavigate();

  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);

  const [filter, setFilter] = useState("all");

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState([]);
  const [approving, setApproving] = useState(false);

  const course = value(params.get("course"));

  const year = value(params.get("year"));

  const block = value(params.get("block"));

  const semester = value(params.get("semester"));

  const schoolYear = value(params.get("schoolYear"));

  const hasBatch = Boolean(course && year && block && semester && schoolYear);



  const load = useCallback(async () => {

    setLoading(true);

    setError("");

    setSelected([]);

    try {

      if (!hasBatch) throw new Error("Missing batch details. Open a batch from the President Dashboard.");

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!auth?.user) throw new Error("Please sign in again.");

      const { data: profile, error: profileError } = await supabase
          .from("users").select("id, role, status").eq("auth_id", auth.user.id).single();
        if (profileError) throw profileError;
        if (profile?.role !== "Approver" || profile?.status !== "Active") throw new Error("Active approver account required.");
        const { data: assignments, error: assignmentError } = await supabase

        .from("approver_assignments")

        .select("office_id, offices(office_code, office_name)")

        .eq("approver_id", profile.id)

        .eq("is_active", true);

      if (assignmentError) throw assignmentError;

      const officeIds = [...new Set((assignments || []).filter((a) => isPresidentOffice(a.offices)).map((a) => a.office_id))];

      if (!officeIds.length) throw new Error("This account has no active School President assignment.");

      const { data: presidentSteps, error: presidentError } = await supabase

        .from("clearance_steps")

        .select("id, clearance_request_id, status, office_id, approver_id")

        .in("office_id", officeIds);

      if (presidentError) throw presidentError;

      const requestIds = [...new Set((presidentSteps || []).map((s) => s.clearance_request_id).filter(Boolean))];

      if (!requestIds.length) { setStudents([]); return; }

      const [requestsResult, stepsResult] = await Promise.all([

        supabase.from("clearance_requests").select("*").in("id", requestIds),

        supabase.from("clearance_steps").select("id, clearance_request_id, step_type, status, office_id, subject_id, remarks").in("clearance_request_id", requestIds),

      ]);

      if (requestsResult.error) throw requestsResult.error;

      if (stepsResult.error) throw stepsResult.error;

      const requests = requestsResult.data || [];

      const userIds = [...new Set(requests.map((r) => r.student_id || r.user_id).filter(Boolean))];

      const usersResult = userIds.length ? await supabase.from("users").select("*").in("id", userIds) : { data: [], error: null };

      if (usersResult.error) throw usersResult.error;

      const users = new Map((usersResult.data || []).map((u) => [u.id, u]));

      const sectionIds = [...new Set((usersResult.data || []).map((u) => u.section_id).filter(Boolean))];

      const sectionsResult = sectionIds.length ? await supabase.from("sections").select("*").in("id", sectionIds) : { data: [], error: null };

      if (sectionsResult.error) throw sectionsResult.error;

      const sections = new Map((sectionsResult.data || []).map((s) => [s.id, s]));

      const stepsByRequest = new Map();

      for (const step of stepsResult.data || []) {

        const list = stepsByRequest.get(step.clearance_request_id) || [];

        list.push(step);

        stepsByRequest.set(step.clearance_request_id, list);

      }

      const presidentByRequest = new Map((presidentSteps || []).filter((s) => s.approver_id === profile.id).map((s) => [s.clearance_request_id, s]));

      const result = requests.flatMap((request) => {

        const user = users.get(request.student_id || request.user_id) || {};

        const section = sections.get(user.section_id) || {};

        const fields = {

          course: value(section.course || user.course || request.course) || "Unassigned Course",

          year: value(section.year_level || user.year_level || request.year_level) || "Unassigned Year",

          block: value(section.block_code || user.block || request.block) || "Unassigned Block",

          semester: value(section.semester || request.semester) || "Unassigned Semester",

          schoolYear: value(section.school_year || request.school_year) || "Unassigned School Year",

        };

        if (fields.course !== course || fields.year !== year || fields.block !== block || fields.semester !== semester || fields.schoolYear !== schoolYear) return [];

        const presidentStep = presidentByRequest.get(request.id);

        const otherSteps = (stepsByRequest.get(request.id) || []).filter((s) => s.id !== presidentStep?.id);

        return [{

          id: request.id,
            presidentStepId: presidentStep?.id,

          name: value(user.full_name || user.name || [user.first_name, user.last_name].filter(Boolean).join(" ")) || "Student",

          studentId: value(user.student_id),

          presidentStatus: value(presidentStep?.status) || "Pending",

          ready: Boolean(presidentStep && value(presidentStep.status) === "Pending" && value(request.status) === "In Progress" && otherSteps.length && otherSteps.every((s) => isApproved(s.status))),

          otherSteps,

        }];

      });

      setStudents(result.sort((a, b) => a.name.localeCompare(b.name)));

    } catch (err) {

      setError(err?.message || "Unable to load this batch.");

      setStudents([]);

    } finally {

      setLoading(false);

    }

  }, [hasBatch, course, year, block, semester, schoolYear]);



  useEffect(() => { load(); }, [load]);

  const readyStudents = useMemo(() => students.filter((s) => s.ready), [students]);

  const visible = useMemo(() => students.filter((s) => {

    const matches = `${s.name} ${s.studentId}`.toLowerCase().includes(search.toLowerCase());

    return matches && (filter === "all" || (filter === "ready" && s.ready) || (filter === "not-ready" && !s.ready && !isApproved(s.presidentStatus)) || (filter === "approved" && isApproved(s.presidentStatus)));

  }), [students, search, filter]);

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const selectAllReady = () => setSelected(readyStudents.map((s) => s.id));

  const approveSelected = async () => {
    if (approving || loading || !selected.length) return;
    const chosen = students.filter((s) => selected.includes(s.id));
    if (chosen.length !== selected.length || chosen.some((s) => !s.ready || !s.presidentStepId)) {
      await Swal.fire("Selection changed", "Refresh the batch and select ready students again.", "warning");
      return;
    }
    const confirm = await Swal.fire({
      title: "Final approve selected students?",
      text: `Approve ${chosen.length} ready student(s) as School President? This action cannot be undone here.`,
      icon: "question", showCancelButton: true, confirmButtonText: "Final Approve", confirmButtonColor: "#0891b2",
    });
    if (!confirm.isConfirmed) return;
    setApproving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("approve_selected_president_students", {
        p_step_ids: chosen.map((s) => s.presidentStepId),
        p_remarks: "Final approval by School President.",
      });
      if (rpcError) throw rpcError;
      if (!data?.success || Number(data.approvedCount) !== chosen.length) throw new Error("Unexpected approval response. Refresh and verify results.");
      await Swal.fire("Final approval complete", `${data.approvedCount} student(s) approved.`, "success");
      await load();
    } catch (err) {
      await Swal.fire("Approval failed", err?.message || "Unable to approve selected students.", "error");
    } finally {
      setApproving(false);
    }
  };



  return (

    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">

      <div className="mx-auto max-w-6xl space-y-6">

        <header className="flex flex-wrap items-start justify-between gap-4">

          <div><p className="text-sm font-medium text-cyan-400">SmartClear AI · School President</p><h1 className="mt-1 text-3xl font-bold">Batch Details</h1><p className="mt-2 text-slate-400">{course || "Course"} · Year {year || "—"} · Block {block || "—"} · {semester || "Semester"} · {schoolYear || "School Year"}</p></div>

          <div className="flex gap-2"><button type="button" onClick={() => navigate("/president/dashboard")} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">Back to batches</button><button type="button" onClick={load} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">Refresh</button></div>

        </header>

        <p className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">Only ready students can be selected. The server rechecks all other signatories before final approval.</p>

        {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}

        <section className="grid gap-3 sm:grid-cols-4">{[["Students", students.length], ["Ready", readyStudents.length], ["Not Ready", students.filter((s) => !s.ready && !isApproved(s.presidentStatus)).length], ["President Approved", students.filter((s) => isApproved(s.presidentStatus)).length]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{count}</p></div>)}</section>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"><input aria-label="Search students" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name or ID" className="min-w-48 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" /><select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"><option value="all">All students</option><option value="ready">Ready</option><option value="not-ready">Not Ready</option><option value="approved">President Approved</option></select><button type="button" onClick={selectAllReady} disabled={!readyStudents.length} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Select all ready</button><button type="button" onClick={approveSelected} disabled={approving || loading || !selected.length} className="rounded-lg bg-cyan-700 px-3 py-2 font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40">{approving ? "Approving..." : `Final Approve Selected (${selected.length})`}</button></div>

        {loading ? <p className="py-8 text-center text-slate-400">Loading students...</p> : visible.length === 0 ? <p className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">No students found in this batch.</p> : <div className="space-y-3">{visible.map((student) => <article key={student.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex flex-wrap items-center gap-3"><input type="checkbox" aria-label={`Select ${student.name}`} checked={selected.includes(student.id)} disabled={!student.ready} onChange={() => toggle(student.id)} className="h-4 w-4 accent-cyan-500" /><div className="min-w-0 flex-1"><p className="font-semibold">{student.name}</p><p className="text-sm text-slate-400">{student.studentId || "No student ID"}</p></div><span className={`rounded-full px-3 py-1 text-xs ${isApproved(student.presidentStatus) ? "bg-sky-950 text-sky-300" : student.ready ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>{isApproved(student.presidentStatus) ? "President Approved" : student.ready ? "Ready" : "Not Ready"}</span></div><details className="mt-3 border-t border-slate-800 pt-3"><summary className="cursor-pointer text-sm text-slate-300">Other signatories · {student.otherSteps.filter((s) => isApproved(s.status)).length}/{student.otherSteps.length} approved</summary><div className="mt-3 space-y-2">{student.otherSteps.map((step) => <div key={step.id} className="flex justify-between gap-3 rounded-lg bg-slate-950 px-3 py-2 text-sm"><span>{value(step.step_type) || "Clearance step"}{step.remarks ? ` · ${step.remarks}` : ""}</span><span className={isApproved(step.status) ? "text-emerald-400" : "text-amber-400"}>{value(step.status) || "Pending"}</span></div>)}</div></details></article>)}</div>}

      </div>

    </main>

  );

}
