import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { motion } from "framer-motion";
import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import {
  DEFAULT_AI_SETTINGS,
  getAIIntegrationStatus,
  getAISettings,
  saveAISettings,
  testAIIntegration,
} from "../../services/aiSettingsService";

import {
  FaBolt,
  FaBrain,
  FaCheckCircle,
  FaExclamationTriangle,
  FaKey,
  FaRobot,
  FaSave,
  FaShieldAlt,
  FaSlidersH,
  FaSyncAlt,
  FaToggleOff,
  FaToggleOn,
  FaVial,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const MODEL_OPTIONS = [
  {
    value:
      "gemini-3.1-flash-lite",
    label:
      "Gemini 3.1 Flash-Lite",
    description:
      "Lower cost and faster responses for high-volume student assistance.",
  },
  {
    value:
      "gemini-3.5-flash",
    label:
      "Gemini 3.5 Flash",
    description:
      "Higher intelligence for more complex questions, with higher usage cost.",
  },
];

const normalizeSettings = (
  value
) => ({
  ...DEFAULT_AI_SETTINGS,
  ...(value || {}),
  isEnabled:
    Boolean(
      value?.isEnabled ??
      DEFAULT_AI_SETTINGS.isEnabled
    ),
  temperature:
    Number(
      value?.temperature ??
      DEFAULT_AI_SETTINGS.temperature
    ),
});

const formatDate = (
  value
) => {
  if (!value) {
    return "Never";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
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

function AISettings() {
  const [
    settings,
    setSettings,
  ] = useState(
    DEFAULT_AI_SETTINGS
  );

  const [
    originalSettings,
    setOriginalSettings,
  ] = useState(
    DEFAULT_AI_SETTINGS
  );

  const [
    integrationStatus,
    setIntegrationStatus,
  ] = useState({
    apiKeyConfigured: false,
    checked: false,
  });

  const [
    testResult,
    setTestResult,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    testing,
    setTesting,
  ] = useState(false);

  const loadConfiguration =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const [
            savedSettings,
            secretStatus,
          ] =
            await Promise.all([
              getAISettings(),
              getAIIntegrationStatus(),
            ]);

          const normalized =
            normalizeSettings(
              savedSettings
            );

          setSettings(
            normalized
          );

          setOriginalSettings(
            normalized
          );

          setIntegrationStatus({
            ...secretStatus,
            checked: true,
          });

          setTestResult(null);
        } catch (error) {
          console.error(
            "Load AI configuration error:",
            error
          );

          await Swal.fire({
            icon: "error",
            title:
              "Unable to Load AI Settings",
            text:
              error?.message ||
              "The current AI configuration could not be loaded.",
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
    loadConfiguration();
  }, [loadConfiguration]);

  const hasChanges =
    useMemo(() => {
      return (
        settings.isEnabled !==
          originalSettings.isEnabled ||
        settings.model !==
          originalSettings.model ||
        Number(
          settings.temperature
        ) !==
          Number(
            originalSettings.temperature
          ) ||
        settings.systemPrompt.trim() !==
          originalSettings.systemPrompt.trim()
      );
    }, [
      settings,
      originalSettings,
    ]);

  const selectedModel =
    useMemo(
      () =>
        MODEL_OPTIONS.find(
          (item) =>
            item.value ===
            settings.model
        ) ||
        MODEL_OPTIONS[0],
      [settings.model]
    );

  const updateSetting = (
    field,
    value
  ) => {
    setSettings(
      (
        current
      ) => ({
        ...current,
        [field]:
          value,
      })
    );

    setTestResult(null);
  };

  const handleSave =
    async () => {
      const cleanPrompt =
        settings.systemPrompt.trim();

      if (
        cleanPrompt.length < 80
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "System Prompt Too Short",
          text:
            "Use at least 80 characters so the assistant has clear school-specific instructions.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const confirmation =
        await Swal.fire({
          icon: "question",
          title:
            "Save AI Configuration?",
          html: `
            <div style="text-align:left;line-height:1.65">
              <p><strong>Status:</strong> ${
                settings.isEnabled
                  ? "Enabled"
                  : "Disabled"
              }</p>
              <p><strong>Model:</strong> ${
                selectedModel.label
              }</p>
              <p><strong>Temperature:</strong> ${
                settings.temperature
              }</p>
              <p style="margin-top:10px;color:#64748b">
                These settings will be used by the live Student AI Assistant.
              </p>
            </div>
          `,
          showCancelButton:
            true,
          confirmButtonText:
            "Save Configuration",
          cancelButtonText:
            "Cancel",
          confirmButtonColor:
            "#2563eb",
        });

      if (
        !confirmation.isConfirmed
      ) {
        return;
      }

      try {
        setSaving(true);

        const saved =
          await saveAISettings({
            isEnabled:
              settings.isEnabled,

            model:
              settings.model,

            temperature:
              settings.temperature,

            systemPrompt:
              cleanPrompt,
          });

        const normalized =
          normalizeSettings(
            saved
          );

        setSettings(
          normalized
        );

        setOriginalSettings(
          normalized
        );

        await Swal.fire({
          icon: "success",
          title:
            "AI Settings Saved",
          text:
            "The live SmartClear AI Assistant will now use this configuration.",
          timer: 1800,
          showConfirmButton:
            false,
        });
      } catch (error) {
        console.error(
          "Save AI configuration error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Save AI Settings",
          text:
            error?.message ||
            "The AI configuration could not be saved.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(false);
      }
    };

  const handleTest =
    async () => {
      if (
        !integrationStatus.apiKeyConfigured
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Gemini Secret Missing",
          text:
            "Configure GEMINI_API_KEY in Supabase Edge Function secrets before testing.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setTesting(true);
        setTestResult(null);

        const result =
          await testAIIntegration({
            model:
              settings.model,
          });

        setTestResult(
          result
        );

        await Swal.fire({
          icon: "success",
          title:
            "Gemini Connection Working",
          text:
            `${result.model} responded successfully in ${result.latencyMs} ms.`,
          timer: 2000,
          showConfirmButton:
            false,
        });
      } catch (error) {
        console.error(
          "Gemini connection test error:",
          error
        );

        setTestResult({
          success: false,
          error:
            error?.message ||
            "Connection test failed.",
        });

        await Swal.fire({
          icon: "error",
          title:
            "Gemini Test Failed",
          text:
            error?.message ||
            "The Gemini connection could not be verified.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setTesting(false);
      }
    };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading live AI settings...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 14,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-48 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -left-40 top-[32rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Header */}

        <motion.section
          initial={{
            opacity: 0,
            y: -18,
            scale: 0.99,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.62,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0c4a8a]/82" />

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
              repeat:
                Infinity,
              ease:
                "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={
                    schoolLogo
                  }
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-cyan-200 backdrop-blur-md">
                  <FaRobot />
                  SmartClear Intelligence
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                  AI Settings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                  Live configuration for the
                  Student AI Assistant. Changes
                  are saved in Supabase and
                  enforced by the Gemini Edge
                  Function.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                onClick={() =>
                  loadConfiguration({
                    silent: true,
                  })
                }
                disabled={
                  refreshing ||
                  saving ||
                  testing
                }
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSyncAlt
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </motion.button>

              <motion.button
                type="button"
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  testing ||
                  !hasChanges
                }
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <FaSyncAlt className="animate-spin" />
                ) : (
                  <FaSave />
                )}

                {saving
                  ? "Saving..."
                  : hasChanges
                    ? "Save Settings"
                    : "Settings Saved"}
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Live status */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "AI Service",
              value:
                settings.isEnabled
                  ? "Enabled"
                  : "Disabled",
              icon:
                FaRobot,
              iconClass:
                settings.isEnabled
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-rose-400/15 text-rose-300",
            },
            {
              label:
                "Gemini Secret",
              value:
                integrationStatus.apiKeyConfigured
                  ? "Configured"
                  : "Missing",
              icon:
                FaKey,
              iconClass:
                integrationStatus.apiKeyConfigured
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-rose-400/15 text-rose-300",
            },
            {
              label:
                "Active Model",
              value:
                selectedModel.label,
              icon:
                FaBrain,
              iconClass:
                "bg-violet-400/15 text-violet-300",
            },
            {
              label:
                "Configuration",
              value:
                hasChanges
                  ? "Unsaved Changes"
                  : "Synchronized",
              icon:
                FaShieldAlt,
              iconClass:
                hasChanges
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-blue-400/15 text-cyan-300",
            },
          ].map(
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
                    y: 18,
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
                    duration:
                      0.45,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] p-5 text-white shadow-[0_18px_38px_rgba(2,12,40,0.16)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/55">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-3 truncate text-lg font-black">
                        {
                          item.value
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                    >
                      <Icon />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          {/* Integration */}

          <motion.article
            initial={{
              opacity: 0,
              x: -18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.18,
              duration: 0.5,
            }}
            className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                  <FaKey />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Gemini Integration
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Secure connection and
                    live model configuration
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <h3 className="font-black text-slate-800">
                    Student AI Assistant
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Disabling this immediately
                    blocks new Gemini requests
                    from Student accounts.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={() =>
                    updateSetting(
                      "isEnabled",
                      !settings.isEnabled
                    )
                  }
                  whileTap={{
                    scale: 0.96,
                  }}
                  className={`text-5xl ${
                    settings.isEnabled
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                  aria-label={
                    settings.isEnabled
                      ? "Disable AI Assistant"
                      : "Enable AI Assistant"
                  }
                >
                  {settings.isEnabled ? (
                    <FaToggleOn />
                  ) : (
                    <FaToggleOff />
                  )}
                </motion.button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Gemini API Secret
                </label>

                <div
                  className={`rounded-2xl border p-4 ${
                    integrationStatus.apiKeyConfigured
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {integrationStatus.apiKeyConfigured ? (
                      <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
                    ) : (
                      <FaExclamationTriangle className="mt-0.5 shrink-0 text-rose-600" />
                    )}

                    <div>
                      <p
                        className={`font-black ${
                          integrationStatus.apiKeyConfigured
                            ? "text-emerald-800"
                            : "text-rose-800"
                        }`}
                      >
                        {integrationStatus.apiKeyConfigured
                          ? "GEMINI_API_KEY is configured"
                          : "GEMINI_API_KEY is missing"}
                      </p>

                      <p
                        className={`mt-1 text-xs leading-5 ${
                          integrationStatus.apiKeyConfigured
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        The actual key is stored
                        only in Supabase Edge
                        Function secrets. It is
                        never downloaded to this
                        browser or stored in the
                        public database.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="gemini-model"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  Gemini Model
                </label>

                <select
                  id="gemini-model"
                  value={
                    settings.model
                  }
                  onChange={(
                    event
                  ) =>
                    updateSetting(
                      "model",
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  {MODEL_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {
                    selectedModel.description
                  }
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="temperature"
                    className="text-sm font-black text-slate-700"
                  >
                    Response Creativity
                  </label>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                    {
                      settings.temperature
                    }
                  </span>
                </div>

                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={
                    settings.temperature
                  }
                  onChange={(
                    event
                  ) =>
                    updateSetting(
                      "temperature",
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full accent-blue-700"
                />

                <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <span>
                    Precise
                  </span>

                  <span>
                    Creative
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  handleTest
                }
                disabled={
                  testing ||
                  saving ||
                  !integrationStatus.apiKeyConfigured
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testing ? (
                  <FaSyncAlt className="animate-spin" />
                ) : (
                  <FaVial />
                )}

                {testing
                  ? "Testing Gemini..."
                  : "Test Gemini Connection"}
              </button>

              {testResult && (
                <div
                  className={`rounded-2xl border p-4 ${
                    testResult.success
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <p
                    className={`font-black ${
                      testResult.success
                        ? "text-emerald-800"
                        : "text-rose-800"
                    }`}
                  >
                    {testResult.success
                      ? "Connection test passed"
                      : "Connection test failed"}
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      testResult.success
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {testResult.success
                      ? `${testResult.model} responded in ${testResult.latencyMs} ms.`
                      : testResult.error}
                  </p>
                </div>
              )}
            </div>
          </motion.article>

          {/* Behavior */}

          <motion.article
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.24,
              duration: 0.5,
            }}
            className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                  <FaSlidersH />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    AI Behavior
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    This prompt is loaded by
                    the live Gemini Assistant
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <label
                htmlFor="system-prompt"
                className="mb-2 block text-sm font-black text-slate-700"
              >
                System Prompt
              </label>

              <textarea
                id="system-prompt"
                rows="13"
                value={
                  settings.systemPrompt
                }
                onChange={(
                  event
                ) =>
                  updateSetting(
                    "systemPrompt",
                    event.target.value
                  )
                }
                maxLength="12000"
                placeholder="Define how SmartClear AI should assist students..."
                className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Minimum 80 characters
                </span>

                <span>
                  {
                    settings.systemPrompt.length
                  }
                  /12000
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />

                    <div>
                      <p className="text-sm font-black text-emerald-800">
                        Live database settings
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Enabled state, model,
                        temperature, and prompt
                        are loaded from Supabase
                        for every AI request.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <FaShieldAlt className="mt-0.5 shrink-0 text-blue-700" />

                    <div>
                      <p className="text-sm font-black text-blue-800">
                        Mandatory safety rules
                      </p>

                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        The Edge Function always
                        adds non-removable privacy
                        and authorization rules
                        after this custom prompt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Last Saved Configuration
                </p>

                <p className="mt-2 font-black text-slate-800">
                  {formatDate(
                    originalSettings.updatedAt
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Updated by{" "}
                  <strong>
                    {originalSettings.updatedBy ||
                      "System initialization"}
                  </strong>
                </p>
              </div>

              <motion.button
                type="button"
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  testing ||
                  !hasChanges
                }
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <FaSyncAlt className="animate-spin" />
                ) : (
                  <FaSave />
                )}

                {saving
                  ? "Saving Settings..."
                  : hasChanges
                    ? "Save AI Configuration"
                    : "Configuration Saved"}
              </motion.button>
            </div>
          </motion.article>
        </section>
      </motion.main>
    </AdminLayout>
  );
}

export default AISettings;