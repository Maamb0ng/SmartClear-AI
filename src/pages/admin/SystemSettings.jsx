import {
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import {
  FaCalendarAlt,
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
