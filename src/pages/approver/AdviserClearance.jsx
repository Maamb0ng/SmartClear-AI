import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import {
  FaCheckCircle,
  FaChalkboardTeacher,
  FaClock,
  FaExclamationTriangle,
  FaGraduationCap,
  FaRedoAlt,
  FaSearch,
  FaUserGraduate,
} from "react-icons/fa";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

const REVIEW_TABS = [
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Needs Action", label: "Needs Action" },
  { key: "All", label: "All" },
];

const clean = (value) => String(value ?? "").trim();
const displayStatus = (value) =>
  value === "Rejected" ? "Needs Action" : value || "Pending";

const statusClass = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Needs Action": "border-rose-200 bg-rose-50 text-rose-700",
};

function AdviserClearance() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [approver, setApprover] = useState(null);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Pending");

  const loadData = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error("You are not logged in.");

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, auth_id, full_name, employee_id, email, role, status, approver_type")
        .eq("auth_id", authData.user.id)
        .single();

      if (profileError) throw profileError;
      if (
        profile.role !== "Approver" ||
        String(profile.status || "").toLowerCase() !== "active"
      ) {
        throw new Error("Only active approver accounts can access Adviser Clearance.");
      }

      setApprover(profile);

      const { data: adviserSections, error: sectionError } = await supabase
        .from("sections")
        .select("id, course, year_level, block_code, school_year, semester, is_active, adviser_id")
        .eq("adviser_id", profile.id)
        .eq("is_active", true)
        .order("course")
        .order("year_level")
        .order("block_code");

      if (sectionError) throw sectionError;
      setSections(adviserSections || []);

      const { data: steps, error: stepError } = await supabase
        .from("clearance_steps")
        .select("id, clearance_request_id, approver_id, step_type, status, remarks, reviewed_at")
        .eq("approver_id", profile.id)
        .eq("step_type", "Adviser");

      if (stepError) throw stepError;

      if (!steps?.length) {
        setItems([]);
        return;
      }

      const requestIds = [...new Set(steps.map((x) => x.clearance_request_id).filter(Boolean))];

      const { data: requests, error: requestError } = await supabase
        .from("clearance_requests")
        .select("id, student_id, section_id, school_year, semester, status, requested_at, clearance_reference")
        .in("id", requestIds);

      if (requestError) throw requestError;

      const requestMap = new Map((requests || []).map((x) => [x.id, x]));
      const studentIds = [...new Set((requests || []).map((x) => x.student_id).filter(Boolean))];
      const sectionIds = [...new Set((requests || []).map((x) => x.section_id).filter(Boolean))];

      let students = [];
      if (studentIds.length) {
        const { data, error } = await supabase
          .from("users")
          .select("id, student_id, full_name, email, course, year_level, block, section_id")
          .in("id", studentIds);
        if (error) throw error;
        students = data || [];
      }

      let requestSections = [];
      if (sectionIds.length) {
        const { data, error } = await supabase
          .from("sections")
          .select("id, course, year_level, block_code, school_year, semester, adviser_id")
          .in("id", sectionIds);
        if (error) throw error;
        requestSections = data || [];
      }

      const studentMap = new Map(students.map((x) => [x.id, x]));
      const sectionMap = new Map(requestSections.map((x) => [x.id, x]));

      const organized = steps
        .map((step) => {
          const request = requestMap.get(step.clearance_request_id);
          if (!request) return null;
          const section = sectionMap.get(request.section_id) || null;
          return {
            ...step,
            request,
            section,
            student: studentMap.get(request.student_id) || null,
            displayStatus: displayStatus(step.status),
          };
        })
        .filter(Boolean)
        .filter(
          (x) =>
            x.approver_id === profile.id &&
            x.section?.adviser_id === profile.id
        );

      setItems(organized);
    } catch (error) {
      console.error("Load adviser clearance error:", error);
      setItems([]);
      await Swal.fire({
        icon: "error",
        title: "Unable to Load Adviser Clearance",
        text: error?.message || "Faculty Adviser clearance could not be loaded.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((x) => x.displayStatus === "Pending").length,
      approved: items.filter((x) => x.displayStatus === "Approved").length,
      needsAction: items.filter((x) => x.displayStatus === "Needs Action").length,
    }),
    [items]
  );

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items
      .filter((item) => filter === "All" || item.displayStatus === filter)
      .filter((item) => {
        if (!keyword) return true;
        return [
          item.student?.full_name,
          item.student?.student_id,
          item.student?.email,
          item.section?.course,
          item.section?.year_level,
          item.section?.block_code,
          item.request?.clearance_reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => {
        const order = { Pending: 0, "Needs Action": 1, Approved: 2 };
        const diff = (order[a.displayStatus] ?? 9) - (order[b.displayStatus] ?? 9);
        return diff || String(a.student?.full_name || "").localeCompare(String(b.student?.full_name || ""));
      });
  }, [items, search, filter]);

  const saveReview = async (item, decision) => {
    const approving = decision === "Approved";

    const result = await Swal.fire({
      icon: approving ? "question" : "warning",
      title: approving ? "Approve Adviser Clearance?" : "Mark as Needs Action?",
      text: item.student?.full_name || "Student",
      input: "textarea",
      inputLabel: approving ? "Remarks (optional)" : "Remarks (required)",
      inputPlaceholder: approving
        ? "Optional adviser remark..."
        : "Explain what the student needs to complete or correct...",
      inputValue: item.remarks || "",
      showCancelButton: true,
      confirmButtonText: approving ? "Approve" : "Needs Action",
      confirmButtonColor: approving ? "#059669" : "#e11d48",
      inputValidator: approving
        ? undefined
        : (value) => (!clean(value) ? "Remarks are required for Needs Action." : undefined),
    });

    if (!result.isConfirmed) return;

    try {
      setSavingId(item.id);

      const { data: exactStep, error: verifyError } = await supabase
        .from("clearance_steps")
        .select("id, approver_id, step_type")
        .eq("id", item.id)
        .eq("approver_id", approver.id)
        .eq("step_type", "Adviser")
        .single();

      if (verifyError) throw verifyError;
      if (!exactStep) throw new Error("This Adviser clearance step is no longer available.");

      const { data: updated, error: updateError } = await supabase
        .from("clearance_steps")
        .update({
          status: approving ? "Approved" : "Rejected",
          remarks: clean(result.value) || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", exactStep.id)
        .eq("approver_id", approver.id)
        .eq("step_type", "Adviser")
        .select("id, status, remarks, reviewed_at")
        .single();

      if (updateError) throw updateError;

      setItems((current) =>
        current.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                status: updated.status,
                displayStatus: displayStatus(updated.status),
                remarks: updated.remarks,
                reviewed_at: updated.reviewed_at,
              }
            : row
        )
      );

      await Swal.fire({
        icon: "success",
        title: approving ? "Adviser Clearance Approved" : "Marked as Needs Action",
        timer: 1700,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Save adviser review error:", error);
      await Swal.fire({
        icon: "error",
        title: "Unable to Save Review",
        text: error?.message || "The Adviser review could not be saved.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const cards = [
    ["Adviser Students", counts.total, FaUserGraduate],
    ["Pending", counts.pending, FaClock],
    ["Approved", counts.approved, FaCheckCircle],
    ["Needs Action", counts.needsAction, FaExclamationTriangle],
  ];

  return (
    <ApproverLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"
          >
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                  <FaChalkboardTeacher className="text-2xl" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                    My Responsibilities
                  </p>
                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                    Faculty Adviser Clearance
                  </h1>
                  <p className="mt-2 text-sm text-slate-300">
                    Review only students from blocks officially assigned to you as Faculty Adviser.
                  </p>
                  {approver?.full_name && (
                    <p className="mt-3 text-sm font-bold">
                      {approver.full_name}
                      {approver.employee_id ? ` • ${approver.employee_id}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black transition hover:bg-white/15 disabled:opacity-50"
              >
                <FaRedoAlt className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </motion.section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon], index) => (
              <motion.article
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon />
                  </div>
                </div>
              </motion.article>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900">Assigned Blocks</h2>
              <p className="mt-1 text-sm text-slate-500">
                {sections.length
                  ? sections
                      .map((x) => `${x.course} ${x.year_level} • Block ${x.block_code}`)
                      .join("  |  ")
                  : "No active block is assigned to you as Faculty Adviser."}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {REVIEW_TABS.map((tab) => {
                  const tabCount =
                    tab.key === "Pending"
                      ? counts.pending
                      : tab.key === "Approved"
                        ? counts.approved
                        : tab.key === "Needs Action"
                          ? counts.needsAction
                          : counts.total;

                  const active = filter === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tabCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full xl:w-72">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${filter === "All" ? "all" : filter.toLowerCase()} students...`}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {loading ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
              <p className="mt-4 text-sm font-bold text-slate-500">Loading Adviser clearance...</p>
            </section>
          ) : !sections.length ? (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <FaGraduationCap className="mx-auto text-4xl text-slate-300" />
              <h3 className="mt-4 text-lg font-black text-slate-900">No Adviser Assignment</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                Your account is not currently assigned as Faculty Adviser of an active block.
              </p>
            </section>
          ) : !visibleItems.length ? (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <FaUserGraduate className="mx-auto text-4xl text-slate-300" />
              <h3 className="mt-4 text-lg font-black text-slate-900">No Adviser Clearance Students</h3>
              <p className="mt-2 text-sm text-slate-500">
                Fresh clearance requests containing an Adviser step will appear here.
              </p>
            </section>
          ) : (
            <section className="grid gap-4">
              {visibleItems.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">
                          {item.student?.full_name || "Student"}
                        </h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClass[item.displayStatus] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {item.displayStatus}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Student ID: <strong className="text-slate-700">{item.student?.student_id || "—"}</strong>
                        {" • "}
                        {item.section
                          ? `${item.section.course} • ${item.section.year_level} • Block ${item.section.block_code}`
                          : "Block unavailable"}
                      </p>

                      {item.request?.clearance_reference && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Clearance: {item.request.clearance_reference}
                        </p>
                      )}

                      {item.remarks && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                            Adviser Remarks
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{item.remarks}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {item.displayStatus !== "Approved" && (
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => saveReview(item, "Approved")}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <FaCheckCircle /> Approve
                        </button>
                      )}

                      {item.displayStatus === "Pending" && (
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => saveReview(item, "Needs Action")}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <FaExclamationTriangle /> Needs Action
                        </button>
                      )}

                      {item.displayStatus === "Approved" && (
                        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700">
                          <FaCheckCircle /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </section>
          )}
        </div>
      </div>
    </ApproverLayout>
  );
}

export default AdviserClearance;
