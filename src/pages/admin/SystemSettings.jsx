import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";
import { supabase } from "../../services/supabase";

import {
  FaCalendarAlt,
  FaLock,
  FaPlusCircle,
  FaHistory,
  FaSpinner,
  FaCheckCircle,
  FaCog,
  FaEnvelope,
  FaGlobe,
  FaGraduationCap,
  FaRedo,
  FaRobot,
  FaSave,
  FaShieldAlt,
  FaToggleOff,
  FaToggleOn,
  FaUniversity,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const createDefaultSettings = () => ({
  school_name:
    "Consolatrix College of Toledo City, Inc.",
  contact_email: "",
  academic_year: "2026-2027",
  system_url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://smartclear-ai.vercel.app",
  institution_code: "CCTC",
  timezone: "Asia/Manila",
  registration_enabled: true,
  maintenance_mode: false,
});

function SystemSettings() {
  const [
    settings,
    setSettings,
  ] = useState(
    createDefaultSettings
  );

  const [
    savedSettings,
    setSavedSettings,
  ] = useState(
    createDefaultSettings
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  // Academic terms are stored in Supabase, independently of UI-only settings.
  const [terms, setTerms] = useState([]);
  const [termCounts, setTermCounts] = useState({});
  const [termLoading, setTermLoading] = useState(true);
  const [termBusy, setTermBusy] = useState(false);
  const [termError, setTermError] = useState("");
  const [nextYear, setNextYear] = useState("2026-2027");
  const [nextSemester, setNextSemester] = useState("2nd Semester");

  const loadAcademicTerms = useCallback(async () => {
    setTermLoading(true);
    setTermError("");
    try {
      const { data: termData, error: termsError } = await supabase
        .from("academic_terms")
        .select("id, school_year, semester, status, is_active, opened_at, closed_at")
        .order("created_at", { ascending: false });
      if (termsError) throw termsError;
      const { data: requestData, error: requestsError } = await supabase
        .from("clearance_requests")
        .select("school_year, semester, status");
      if (requestsError) throw requestsError;
      const counts = {};
      for (const request of requestData || []) {
        const key = `${request.school_year}|${request.semester}`;
        if (!counts[key]) counts[key] = { total: 0, completed: 0, unfinished: 0 };
        counts[key].total += 1;
        if (request.status === "Completed") counts[key].completed += 1;
        else counts[key].unfinished += 1;
      }
      setTerms(termData || []);
      setTermCounts(counts);
    } catch (error) {
      setTermError(error?.message || "Unable to load academic terms.");
    } finally {
      setTermLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicTerms();
  }, [loadAcademicTerms]);

  const activeTerm = terms.find((term) => term.is_active && term.status === "Active");
  const activeCounts = activeTerm
    ? (termCounts[`${activeTerm.school_year}|${activeTerm.semester}`] || { total: 0, completed: 0, unfinished: 0 })
    : { total: 0, completed: 0, unfinished: 0 };

  const handleCloseTerm = async () => {
    if (!activeTerm || termBusy || termLoading || activeCounts.unfinished > 0) return;
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Close academic semester?",
      html: `<p>This will archive <strong>${activeTerm.semester}, ${activeTerm.school_year}</strong>.</p><p>Clearance records will become read-only. This action cannot be undone using the Admin interface.</p>`,
      showCancelButton: true,
      confirmButtonText: "Close Semester",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;
    setTermBusy(true);
    try {
      const { error } = await supabase.rpc("close_academic_term", { p_term_id: activeTerm.id });
      if (error) throw error;
      await loadAcademicTerms();
      await Swal.fire({ icon: "success", title: "Semester Closed", text: "The academic term is now archived." });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Unable to Close Semester", text: error?.message || "Please try again." });
    } finally {
      setTermBusy(false);
    }
  };

  const handleOpenTerm = async () => {
    if (activeTerm || termBusy || termLoading) return;
    const year = nextYear.trim();
    if (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) {
      await Swal.fire({ icon: "warning", title: "Invalid School Year", text: "Use a consecutive school year, e.g. 2026-2027." });
      return;
    }
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Open new academic semester?",
      text: `Activate ${nextSemester}, ${year}? Confirm that sections, class offerings, and approvers are prepared for this term.`,
      showCancelButton: true,
      confirmButtonText: "Open Semester",
      confirmButtonColor: "#2563eb",
    });
    if (!confirmation.isConfirmed) return;
    setTermBusy(true);
    try {
      const { error } = await supabase.rpc("activate_academic_term", {
        p_school_year: year,
        p_semester: nextSemester,
      });
      if (error) throw error;
      await loadAcademicTerms();
      await Swal.fire({ icon: "success", title: "Semester Opened", text: `${nextSemester}, ${year} is now active.` });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Unable to Open Semester", text: error?.message || "Please try again." });
    } finally {
      setTermBusy(false);
    }
  };

  const hasChanges =
    useMemo(() => {
      return (
        JSON.stringify(
          settings
        ) !==
        JSON.stringify(
          savedSettings
        )
      );
    }, [
      settings,
      savedSettings,
    ]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setSettings(
      (
        previous
      ) => ({
        ...previous,
        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      })
    );
  };

  const validateSettings =
    () => {
      if (
        !settings.school_name.trim()
      ) {
        return "School name is required.";
      }

      if (
        settings.contact_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          settings.contact_email
        )
      ) {
        return "Enter a valid contact email address.";
      }

      if (
        !/^\d{4}-\d{4}$/.test(
          settings.academic_year.trim()
        )
      ) {
        return "Academic year must use the format 2026-2027.";
      }

      try {
        new URL(
          settings.system_url
        );
      } catch {
        return "Enter a valid system URL.";
      }

      return null;
    };

  const handleSave =
    async (
      event
    ) => {
      event.preventDefault();

      const validationError =
        validateSettings();

      if (
        validationError
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Check System Settings",
          text:
            validationError,
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setSaving(
          true
        );

        /*
        |--------------------------------------------------------------------------
        | UI-only settings save
        |--------------------------------------------------------------------------
        | Connect this payload to a Supabase system_settings table later.
        |--------------------------------------------------------------------------
        */

        await new Promise(
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              650
            )
        );

        setSavedSettings({
          ...settings,
        });

        await Swal.fire({
          icon: "success",
          title:
            "Settings Saved",
          text:
            "The system settings were saved in the current interface.",
          timer: 1800,
          showConfirmButton:
            false,
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Save Failed",
          text:
            error?.message ||
            "Unable to save the system settings.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleReset =
    async () => {
      if (
        !hasChanges
      ) {
        return;
      }

      const result =
        await Swal.fire({
          icon: "question",
          title:
            "Discard Changes?",
          text:
            "The unsaved settings will be restored to their last saved values.",
          showCancelButton:
            true,
          confirmButtonText:
            "Discard Changes",
          cancelButtonText:
            "Keep Editing",
          confirmButtonColor:
            "#dc2626",
        });

      if (
        !result.isConfirmed
      ) {
        return;
      }

      setSettings({
        ...savedSettings,
      });
    };

  const settingCards = [
    {
      label:
        "Registration",
      value:
        settings.registration_enabled
          ? "Enabled"
          : "Disabled",
      icon:
        settings.registration_enabled
          ? FaToggleOn
          : FaToggleOff,
      tone:
        settings.registration_enabled
          ? "text-emerald-300 bg-emerald-400/15"
          : "text-rose-300 bg-rose-400/15",
    },
    {
      label:
        "Maintenance",
      value:
        settings.maintenance_mode
          ? "Active"
          : "Inactive",
      icon:
        settings.maintenance_mode
          ? FaToggleOn
          : FaToggleOff,
      tone:
        settings.maintenance_mode
          ? "text-amber-300 bg-amber-400/15"
          : "text-blue-200 bg-blue-400/15",
    },
    {
      label:
        "Academic Year",
      value:
        settings.academic_year ||
        "Not set",
      icon:
        FaCalendarAlt,
      tone:
        "text-cyan-300 bg-cyan-400/15",
    },
  ];

  return (
    <AdminLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative space-y-6 overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-44 top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/82" />

          <motion.div
            animate={{
              x: [
                0,
                24,
                0,
              ],
              y: [
                0,
                -14,
                0,
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={
                    schoolLogo
                  }
                  alt="Consolatrix College seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
                  <FaCog className="text-cyan-300" />
                  Platform Configuration
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  System Settings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                  Configure institutional information, academic cycle, access
                  controls, and deployment preferences for SmartClear AI.
                </p>
              </div>
            </div>

            <motion.div
              animate={{
                y: [
                  0,
                  -6,
                  0,
                ],
                rotate: [
                  0,
                  -3,
                  3,
                  0,
                ],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex h-16 w-16 items-center justify-center self-start rounded-2xl border border-white/10 bg-white/10 text-3xl text-cyan-300 backdrop-blur lg:self-center"
            >
              <FaRobot />
            </motion.div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {settingCards.map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              return (
                <motion.article
                  key={
                    item.label
                  }
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.08 +
                      index *
                        0.07,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className="rounded-2xl border border-white/10 bg-[#071b4b] p-5 text-white shadow-[0_18px_38px_rgba(2,12,40,0.16)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/55">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-3 text-xl font-black">
                        {
                          item.value
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}
                    >
                      <Icon />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* Live academic semester management (separate from UI-only general settings). */}
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Academic Cycle</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Semester Management</h2>
              <p className="mt-1 text-sm text-slate-500">Manage academic terms and preserve previous clearance records.</p>
            </div>
            <button type="button" onClick={loadAcademicTerms} disabled={termBusy || termLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
              <FaRedo className={termLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            {termError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{termError}</p>}
            {termLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><FaSpinner className="animate-spin" /> Loading academic terms...</div>
            ) : (
              <>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Current Academic Term</p>
                      <h3 className="mt-2 text-xl font-black text-slate-900">
                        {activeTerm ? `${activeTerm.semester} · ${activeTerm.school_year}` : "No active semester"}
                      </h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${activeTerm ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {activeTerm ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {activeTerm && (
                    <>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                          { label: "Total Clearances", value: activeCounts.total },
                          { label: "Completed", value: activeCounts.completed },
                          { label: "Unfinished", value: activeCounts.unfinished },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-blue-100 bg-white p-4">
                            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                            <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={handleCloseTerm}
                          disabled={termBusy || activeCounts.unfinished > 0 || !!termError}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                          <FaLock /> {termBusy ? "Processing..." : "Close Semester"}
                        </button>
                        {activeCounts.unfinished > 0 && (
                          <p className="text-sm text-amber-800">Cannot close: {activeCounts.unfinished} unfinished clearance request(s).</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {!activeTerm && (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="flex items-center gap-2 font-black text-slate-900"><FaPlusCircle className="text-blue-600" /> Open New Semester</h3>
                    <p className="mt-1 text-sm text-slate-500">Ensure the next term's sections and class offerings are ready before activation.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">School Year
                        <input value={nextYear} onChange={(e) => setNextYear(e.target.value)} placeholder="2026-2027" maxLength={9}
                          className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600" />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">Semester
                        <select value={nextSemester} onChange={(e) => setNextSemester(e.target.value)}
                          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-600">
                          <option>1st Semester</option><option>2nd Semester</option><option>Summer</option>
                        </select>
                      </label>
                    </div>
                    <button type="button" onClick={handleOpenTerm} disabled={termBusy || !!termError}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                      <FaPlusCircle /> {termBusy ? "Processing..." : "Open Semester"}
                    </button>
                  </div>
                )}
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><FaHistory className="text-blue-600" /> Academic Term History</h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                        <th className="px-4 py-3">School Year</th><th className="px-4 py-3">Semester</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Unfinished</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {terms.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No academic terms found.</td></tr> : terms.map((term) => {
                          const counts = termCounts[`${term.school_year}|${term.semester}`] || { completed: 0, unfinished: 0 };
                          return <tr key={term.id}>
                            <td className="px-4 py-3 font-semibold text-slate-800">{term.school_year}</td>
                            <td className="px-4 py-3">{term.semester}</td>
                            <td className="px-4 py-3">{term.status}</td>
                            <td className="px-4 py-3">{counts.completed}</td>
                            <td className="px-4 py-3">{counts.unfinished}</td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <form
          onSubmit={
            handleSave
          }
          className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              General Configuration
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Institution & System Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These values appear throughout the administrative interface.
            </p>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 sm:p-6">
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                School Name
              </span>

              <div className="relative">
                <FaUniversity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="school_name"
                  value={
                    settings.school_name
                  }
                  onChange={
                    handleChange
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Contact Email
              </span>

              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  name="contact_email"
                  value={
                    settings.contact_email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter official support email"
                  className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Academic Year
              </span>

              <div className="relative">
                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="academic_year"
                  value={
                    settings.academic_year
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="2026-2027"
                  maxLength="9"
                  className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                System URL
              </span>

              <div className="relative">
                <FaGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="url"
                  name="system_url"
                  value={
                    settings.system_url
                  }
                  onChange={
                    handleChange
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Institution Code
              </span>

              <div className="relative">
                <FaGraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="institution_code"
                  value={
                    settings.institution_code
                  }
                  onChange={
                    handleChange
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm uppercase outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Time Zone
              </span>

              <div className="relative">
                <FaGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <select
                  name="timezone"
                  value={
                    settings.timezone
                  }
                  onChange={
                    handleChange
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="Asia/Manila">
                    Asia/Manila
                  </option>

                  <option value="UTC">
                    UTC
                  </option>
                </select>
              </div>
            </label>
          </div>

          <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-5 md:grid-cols-2 sm:p-6">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-1 shrink-0 text-emerald-600" />

                <div>
                  <p className="font-black text-slate-800">
                    Public Registration
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Allow students and approvers to create pending accounts.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                name="registration_enabled"
                checked={
                  settings.registration_enabled
                }
                onChange={
                  handleChange
                }
                className="h-5 w-5 accent-blue-700"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <FaShieldAlt className="mt-1 shrink-0 text-amber-600" />

                <div>
                  <p className="font-black text-slate-800">
                    Maintenance Mode
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Temporarily restrict normal access while maintenance is active.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                name="maintenance_mode"
                checked={
                  settings.maintenance_mode
                }
                onChange={
                  handleChange
                }
                className="h-5 w-5 accent-blue-700"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-400">
              {hasChanges
                ? "You have unsaved changes."
                : "All visible settings are up to date."}
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleReset
                }
                disabled={
                  !hasChanges ||
                  saving
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaRedo />
                Discard Changes
              </button>

              <motion.button
                whileHover={{
                  y:
                    saving
                      ? 0
                      : -2,
                }}
                whileTap={{
                  scale:
                    saving
                      ? 1
                      : 0.98,
                }}
                type="submit"
                disabled={
                  saving ||
                  !hasChanges
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-6 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSave />

                {saving
                  ? "Saving Settings..."
                  : "Save Settings"}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.main>
    </AdminLayout>
  );
}

export default SystemSettings;
