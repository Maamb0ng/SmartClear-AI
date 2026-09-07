import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  FaBolt,
  FaCheck,
  FaChevronDown,
  FaComments,
  FaExclamationTriangle,
  FaGripLines,
  FaMagic,
  FaPaperPlane,
  FaRobot,
  FaTimes,
  FaUser,
} from "react-icons/fa";

import { sendGeminiMessage } from "../../services/aiService";
import { supabase } from "../../services/supabase";

const WELCOME_MESSAGE = {
  id: "smartclear-floating-welcome",
  sender: "bot",
  text:
    "Hi! I'm SmartClear AI. I can check your clearance progress, identify problems, and guide you on what to do next.",
};

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeStatus = (value) =>
  normalizeText(value).toLowerCase();

const toSingleRelation = (value) => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const createMessage = (
  sender,
  text
) => ({
  id:
    typeof crypto !== "undefined" &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,

  sender,
  text,
});

function RobotCharacter({
  thinking = false,
  health = "normal",
}) {
  const isSuccess =
    health === "success";

  const isWarning =
    health === "warning";

  return (
    <div className="relative h-[118px] w-[118px]">
      <motion.div
        animate={{
          scale: [
            1,
            thinking ? 1.3 : 1.15,
            1,
          ],
          opacity: [
            0.2,
            thinking ? 0.45 : 0.3,
            0.2,
          ],
        }}
        transition={{
          duration: thinking
            ? 1.2
            : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-2 rounded-full bg-cyan-400 blur-3xl"
      />

      <motion.div
        animate={{
          y: [0, -7, 0],
          rotate: thinking
            ? [0, -2, 2, 0]
            : [0, -1, 1, 0],
        }}
        transition={{
          duration: thinking
            ? 1.5
            : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/2 top-1 -translate-x-1/2"
      >
        {/* Antenna */}

        <div className="relative mx-auto h-5 w-1 rounded-full bg-cyan-300">
          <motion.span
            animate={{
              scale: [
                1,
                1.4,
                1,
              ],
              opacity: [
                0.7,
                1,
                0.7,
              ],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
            }}
            className="absolute -left-1.5 -top-2 h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.9)]"
          />
        </div>

        {/* Head */}

        <div className="relative h-[58px] w-[78px] rounded-[22px] border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50 to-blue-200 p-[6px] shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
          <div className="relative flex h-full items-center justify-center gap-4 overflow-hidden rounded-[17px] bg-[#061b51]">
            {isWarning ? (
              <>
                <motion.span
                  animate={{
                    rotate: [
                      -12,
                      -4,
                      -12,
                    ],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                  }}
                  className="h-[4px] w-[14px] rounded-full bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.8)]"
                />

                <motion.span
                  animate={{
                    rotate: [
                      12,
                      4,
                      12,
                    ],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                  }}
                  className="h-[4px] w-[14px] rounded-full bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.8)]"
                />
              </>
            ) : (
              <>
                {[0, 1].map(
                  (eye) => (
                    <motion.span
                      key={eye}
                      animate={{
                        scaleY: [
                          1,
                          1,
                          0.15,
                          1,
                          1,
                        ],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        times: [
                          0,
                          0.42,
                          0.46,
                          0.5,
                          1,
                        ],
                      }}
                      className={`h-3 w-3 rounded-full ${
                        isSuccess
                          ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
                          : "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
                      }`}
                    />
                  )
                )}
              </>
            )}

            {thinking && (
              <motion.div
                animate={{
                  x: [
                    -20,
                    20,
                    -20,
                  ],
                  opacity: [
                    0.1,
                    0.6,
                    0.1,
                  ],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                }}
                className="absolute inset-y-0 w-6 bg-cyan-300/10 blur-sm"
              />
            )}
          </div>

          <span className="absolute -left-2 top-[20px] h-5 w-2 rounded-l-full bg-cyan-300" />
          <span className="absolute -right-2 top-[20px] h-5 w-2 rounded-r-full bg-cyan-300" />
        </div>

        {/* Neck */}

        <div className="mx-auto h-3 w-5 rounded-b-md bg-cyan-200" />

        {/* Body */}

        <div className="relative mx-auto h-[46px] w-[60px] rounded-[18px] border border-white/20 bg-gradient-to-br from-blue-500 via-indigo-600 to-[#061b51] shadow-[0_10px_22px_rgba(15,23,42,0.28)]">
          <div className="absolute left-1/2 top-2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-lg bg-white/10 text-[10px] text-cyan-200">
            {thinking ? (
              <FaMagic className="animate-pulse" />
            ) : isSuccess ? (
              <FaCheck />
            ) : isWarning ? (
              <FaExclamationTriangle />
            ) : (
              <FaBolt />
            )}
          </div>

          <motion.div
            animate={{
              rotate: [
                -18,
                -38,
                -18,
              ],
            }}
            transition={{
              duration: 2.1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-[12px] top-1 h-9 w-3 origin-top rounded-full bg-blue-300"
          />

          <motion.div
            animate={{
              rotate: isSuccess
                ? [
                    18,
                    48,
                    18,
                  ]
                : [
                    18,
                    34,
                    18,
                  ],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-[12px] top-1 h-9 w-3 origin-top rounded-full bg-blue-300"
          />
        </div>
      </motion.div>
    </div>
  );
}

function FloatingAIAssistant() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    chats,
    setChats,
  ] = useState([
    WELCOME_MESSAGE,
  ]);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    previousInteractionId,
    setPreviousInteractionId,
  ] = useState(null);

  const [
    clearanceData,
    setClearanceData,
  ] = useState(null);

  const [
    contextLoading,
    setContextLoading,
  ] = useState(true);

  const [
    isDesktop,
    setIsDesktop,
  ] = useState(
    typeof window !== "undefined"
      ? window.innerWidth >= 768
      : true
  );

  const inputRef =
    useRef(null);

  const scrollAreaRef =
    useRef(null);

  const dragConstraintsRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | SCREEN SIZE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(
        window.innerWidth >= 768
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD STUDENT CLEARANCE DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const loadClearance =
      async () => {
        setContextLoading(true);

        try {
          const {
            data: { user },
          } =
            await supabase.auth.getUser();

          if (!user) {
            return;
          }

          const {
            data: student,
            error: studentError,
          } = await supabase
            .from("users")
            .select(
              `
                id,
                full_name,
                role,
                status,
                section_id
              `
            )
            .eq(
              "auth_id",
              user.id
            )
            .maybeSingle();

          if (
            studentError ||
            !student
          ) {
            return;
          }

          if (
            normalizeStatus(
              student.role
            ) !== "student"
          ) {
            return;
          }

          const {
            data: request,
            error: requestError,
          } = await supabase
            .from(
              "clearance_requests"
            )
            .select(
              `
                id,
                status,
                requested_at,
                completed_at
              `
            )
            .eq(
              "student_id",
              student.id
            )
            .order(
              "requested_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

          if (requestError) {
            console.error(
              "Unable to load latest clearance:",
              requestError
            );
          }

          let steps = [];

          if (request?.id) {
            const {
              data:
                stepData,
              error:
                stepError,
            } = await supabase
              .from(
                "clearance_steps"
              )
              .select(
                `
                  id,
                  status,
                  remarks,
                  subject_id,
                  office_id,

                  subject:subjects (
                    subject_code,
                    subject_name
                  ),

                  office:offices (
                    office_name
                  )
                `
              )
              .eq(
                "clearance_request_id",
                request.id
              );

            if (stepError) {
              console.error(
                "Unable to load clearance steps:",
                stepError
              );
            } else {
              steps =
                stepData || [];
            }
          }

          const normalizedSteps =
            steps.map(
              (step) => {
                const subject =
                  toSingleRelation(
                    step.subject
                  );

                const office =
                  toSingleRelation(
                    step.office
                  );

                return {
                  id: step.id,

                  status:
                    normalizeText(
                      step.status
                    ) ||
                    "Pending",

                  remarks:
                    normalizeText(
                      step.remarks
                    ),

                  name:
                    normalizeText(
                      subject?.subject_code
                    ) ||
                    normalizeText(
                      subject?.subject_name
                    ) ||
                    normalizeText(
                      office?.office_name
                    ) ||
                    "Clearance Requirement",
                };
              }
            );

          const approved =
            normalizedSteps.filter(
              (step) =>
                normalizeStatus(
                  step.status
                ) ===
                "approved"
            );

          const pending =
            normalizedSteps.filter(
              (step) =>
                normalizeStatus(
                  step.status
                ) ===
                "pending"
            );

          const rejected =
            normalizedSteps.filter(
              (step) =>
                normalizeStatus(
                  step.status
                ) ===
                "rejected"
            );

          const total =
            normalizedSteps.length;

          const progress =
            total > 0
              ? Math.round(
                  (approved.length /
                    total) *
                    100
                )
              : 0;

          const nextPriority =
            rejected[0] ||
            pending[0] ||
            null;

          const data = {
            studentName:
              normalizeText(
                student.full_name
              ) ||
              "Student",

            hasSection:
              Boolean(
                student.section_id
              ),

            hasRequest:
              Boolean(request),

            status:
              normalizeText(
                request?.status
              ) ||
              "No Request",

            progress,

            approved:
              approved.length,

            pending:
              pending.length,

            rejected:
              rejected.length,

            total,

            nextPriority,

            steps:
              normalizedSteps,
          };

          if (mounted) {
            setClearanceData(
              data
            );
          }
        } catch (error) {
          console.error(
            "Floating AI context error:",
            error
          );
        } finally {
          if (mounted) {
            setContextLoading(
              false
            );
          }
        }
      };

    loadClearance();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | ASSISTANT STATE
  |--------------------------------------------------------------------------
  */

  const assistantState =
    useMemo(() => {
      if (contextLoading) {
        return {
          type: "normal",
          title:
            "Checking your clearance",
          description:
            "I'm analyzing your latest SmartClear information.",
        };
      }

      if (!clearanceData) {
        return {
          type: "normal",
          title:
            "SmartClear AI",
          description:
            "Ask me anything about your clearance.",
        };
      }

      if (
        !clearanceData.hasSection
      ) {
        return {
          type: "warning",
          title:
            "Setup needs attention",
          description:
            "Your official block or section may still need verification.",
        };
      }

      if (
        !clearanceData.hasRequest
      ) {
        return {
          type: "normal",
          title:
            "Ready when you are",
          description:
            "You don't have a clearance request yet.",
        };
      }

      if (
        clearanceData.rejected >
        0
      ) {
        return {
          type: "warning",
          title:
            "Action required",
          description:
            `${clearanceData.rejected} requirement${
              clearanceData.rejected >
              1
                ? "s need"
                : " needs"
            } your attention.`,
        };
      }

      if (
        clearanceData.pending >
        0
      ) {
        return {
          type: "normal",
          title:
            "Clearance in progress",
          description:
            `${clearanceData.pending} requirement${
              clearanceData.pending >
              1
                ? "s are"
                : " is"
            } still pending.`,
        };
      }

      if (
        clearanceData.progress ===
          100 ||
        normalizeStatus(
          clearanceData.status
        ) === "completed"
      ) {
        return {
          type: "success",
          title:
            "Clearance complete!",
          description:
            "All clearance requirements are approved.",
        };
      }

      return {
        type: "normal",
        title:
          "SmartClear AI",
        description:
          "I'm ready to analyze your clearance.",
      };
    }, [
      clearanceData,
      contextLoading,
    ]);

  /*
  |--------------------------------------------------------------------------
  | QUICK ACTIONS
  |--------------------------------------------------------------------------
  */

  const quickActions =
    useMemo(() => {
      if (!clearanceData) {
        return [
          "Analyze my clearance",
          "What should I do next?",
          "How does SmartClear work?",
        ];
      }

      if (
        !clearanceData.hasSection
      ) {
        return [
          "Why is my section important?",
          "What should I do about my section?",
          "Can I request clearance yet?",
        ];
      }

      if (
        !clearanceData.hasRequest
      ) {
        return [
          "Am I ready to request clearance?",
          "How do I request clearance?",
          "What should I prepare?",
        ];
      }

      if (
        clearanceData.rejected >
        0
      ) {
        return [
          "Explain my rejected requirements",
          "What should I fix first?",
          "Create my action plan",
        ];
      }

      if (
        clearanceData.pending >
        0
      ) {
        return [
          "What am I still waiting for?",
          "What should I do next?",
          "Summarize my pending requirements",
        ];
      }

      if (
        clearanceData.progress ===
        100
      ) {
        return [
          "Summarize my completed clearance",
          "How do I get my Digital Clearance Pass?",
          "Is there anything else I need to do?",
        ];
      }

      return [
        "Analyze my clearance",
        "What should I do next?",
        "Create my action plan",
      ];
    }, [
      clearanceData,
    ]);

  /*
  |--------------------------------------------------------------------------
  | RECOMMENDED ACTION
  |--------------------------------------------------------------------------
  */

  const recommendedAction =
    useMemo(() => {
      if (!clearanceData) {
        return "Ask SmartClear AI to analyze your clearance.";
      }

      if (
        !clearanceData.hasSection
      ) {
        return "Your official section needs to be verified before clearance routing can work correctly.";
      }

      if (
        !clearanceData.hasRequest
      ) {
        return "Review your student information and submit a clearance request when available.";
      }

      if (
        clearanceData.rejected >
          0 &&
        clearanceData.nextPriority
      ) {
        return `Prioritize ${clearanceData.nextPriority.name}${
          clearanceData
            .nextPriority
            .remarks
            ? `. Approver remark: ${clearanceData.nextPriority.remarks}`
            : ". Review what needs to be corrected before resubmitting."
        }`;
      }

      if (
        clearanceData.pending >
          0 &&
        clearanceData.nextPriority
      ) {
        return `Review ${clearanceData.nextPriority.name}. Ask me whether you still need to submit something or if it is already waiting for review.`;
      }

      if (
        clearanceData.progress ===
        100
      ) {
        return "All clearance steps are approved. You can now check your Digital Clearance Pass.";
      }

      return "Ask me to identify your highest-priority clearance task.";
    }, [
      clearanceData,
    ]);

  /*
  |--------------------------------------------------------------------------
  | FOCUS INPUT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          inputRef.current?.focus();
        },
        350
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    isOpen,
  ]);

  /*
  |--------------------------------------------------------------------------
  | AUTO SCROLL CHAT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!scrollAreaRef.current) {
      return;
    }

    window.setTimeout(
      () => {
        const container =
          scrollAreaRef.current;

        if (!container) {
          return;
        }

        container.scrollTo({
          top:
            container.scrollHeight,
          behavior: "smooth",
        });
      },
      100
    );
  }, [
    chats,
    sending,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  const sendMessage =
    async (
      customMessage = null
    ) => {
      const outgoing =
        normalizeText(
          customMessage ??
            message
        );

      if (
        !outgoing ||
        sending
      ) {
        return;
      }

      setChats(
        (previous) => [
          ...previous,
          createMessage(
            "user",
            outgoing
          ),
        ]
      );

      setMessage("");
      setSending(true);

      try {
        const result =
          await sendGeminiMessage({
            message: outgoing,

            previousInteractionId,
          });

        setChats(
          (previous) => [
            ...previous,
            createMessage(
              "bot",
              result.reply
            ),
          ]
        );

        setPreviousInteractionId(
          result.interactionId ||
            previousInteractionId
        );
      } catch (error) {
        console.error(
          "Floating SmartClear AI:",
          error
        );

        setChats(
          (previous) => [
            ...previous,
            createMessage(
              "error",
              error?.message ||
                "SmartClear AI is temporarily unavailable."
            ),
          ]
        );
      } finally {
        setSending(false);
      }
    };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    sendMessage();
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      ref={dragConstraintsRef}
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {/* OPEN ASSISTANT WINDOW */}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag={isDesktop}
            dragConstraints={
              dragConstraintsRef
            }
            dragMomentum={false}
            dragElastic={0.05}
            initial={{
              opacity: 0,
              y: 35,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 30,
              scale: 0.9,
            }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 25,
            }}
            className="
              pointer-events-auto
              absolute
              bottom-24
              right-4
              flex
              h-[min(720px,calc(100vh-125px))]
              w-[calc(100vw-2rem)]
              max-w-[430px]
              min-h-0
              flex-col
              overflow-hidden
              rounded-[28px]
              border
              border-slate-200
              bg-white
              shadow-[0_30px_90px_rgba(15,23,42,0.3)]

              sm:right-7

              md:cursor-default
            "
          >
            {/* HEADER / DRAG HANDLE */}

            <div
              className="
                relative
                shrink-0
                overflow-hidden
                bg-[#061b51]
                px-4
                py-4
                text-white

                md:cursor-grab
                md:active:cursor-grabbing
              "
            >
              <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-cyan-300">
                    <FaRobot />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      SmartClear AI
                    </p>

                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />

                      <p className="truncate text-[10px] font-semibold text-blue-100/60">
                        Live Clearance Assistant
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isDesktop && (
                    <div
                      title="Drag this window"
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-blue-100/40"
                    >
                      <FaGripLines />
                    </div>
                  )}

                  <button
                    type="button"
                    onPointerDown={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                    onClick={() =>
                      setIsOpen(false)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-blue-100 transition hover:bg-white/10"
                  >
                    <FaChevronDown />
                  </button>
                </div>
              </div>

              {/* CHARACTER */}

              <div className="relative z-10 mt-2 flex items-center gap-3">
                <div className="-mb-8 -ml-3 shrink-0">
                  <RobotCharacter
                    thinking={
                      sending ||
                      contextLoading
                    }
                    health={
                      assistantState.type
                    }
                  />
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300/70">
                    AI Clearance Analysis
                  </p>

                  <p className="mt-1 text-base font-black">
                    {
                      assistantState.title
                    }
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-blue-100/65">
                    {
                      assistantState.description
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}

            <div
              ref={scrollAreaRef}
              className="
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
                bg-[#f5f7fb]
                [scrollbar-color:rgba(100,116,139,0.35)_transparent]
                [scrollbar-width:thin]
              "
              onPointerDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              {/* CLEARANCE HEALTH */}

              <div className="border-b border-slate-200 bg-white px-4 py-4">
                {contextLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Clearance Health
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          {clearanceData
                            ? clearanceData.status
                            : "Not Available"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-700">
                          {
                            clearanceData?.progress ??
                            0
                          }
                          %
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                          Complete
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        initial={{
                          width: 0,
                        }}
                        animate={{
                          width: `${
                            clearanceData?.progress ??
                            0
                          }%`,
                        }}
                        transition={{
                          duration: 0.8,
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-2 py-2 text-center">
                        <p className="text-sm font-black text-emerald-700">
                          {
                            clearanceData?.approved ??
                            0
                          }
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-wide text-emerald-600/60">
                          Approved
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-100 bg-amber-50 px-2 py-2 text-center">
                        <p className="text-sm font-black text-amber-700">
                          {
                            clearanceData?.pending ??
                            0
                          }
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-wide text-amber-600/60">
                          Pending
                        </p>
                      </div>

                      <div className="rounded-xl border border-rose-100 bg-rose-50 px-2 py-2 text-center">
                        <p className="text-sm font-black text-rose-700">
                          {
                            clearanceData?.rejected ??
                            0
                          }
                        </p>

                        <p className="text-[8px] font-black uppercase tracking-wide text-rose-600/60">
                          Rejected
                        </p>
                      </div>
                    </div>

                    {/* RECOMMENDATION */}

                    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs text-white">
                          <FaBolt />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-500">
                            Recommended Action
                          </p>

                          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">
                            {
                              recommendedAction
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* QUICK ACTIONS */}

              <div className="border-b border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-2">
                  <FaMagic className="text-violet-500" />

                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Ask SmartClear AI
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {quickActions.map(
                    (action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() =>
                          sendMessage(
                            action
                          )
                        }
                        disabled={
                          sending
                        }
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {action}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* CONVERSATION TITLE */}

              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <div className="flex items-center gap-2">
                  <FaComments className="text-blue-500" />

                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Conversation
                  </p>
                </div>

                <p className="text-[9px] font-semibold text-slate-400">
                  Ask naturally
                </p>
              </div>

              {/* MESSAGES */}

              <div className="space-y-3 px-4 pb-6">
                {chats.map(
                  (chat) => {
                    const isUser =
                      chat.sender ===
                      "user";

                    const isError =
                      chat.sender ===
                      "error";

                    return (
                      <motion.div
                        key={chat.id}
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className={`flex ${
                          isUser
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-[90%] items-end gap-2 ${
                            isUser
                              ? "flex-row-reverse"
                              : ""
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] text-white ${
                              isUser
                                ? "bg-slate-600"
                                : isError
                                ? "bg-rose-600"
                                : "bg-[#061b51]"
                            }`}
                          >
                            {isUser ? (
                              <FaUser />
                            ) : isError ? (
                              <FaExclamationTriangle />
                            ) : (
                              <FaRobot className="text-cyan-300" />
                            )}
                          </div>

                          <div
                            className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2.5 text-[11px] leading-5 ${
                              isUser
                                ? "rounded-br-md bg-blue-600 text-white"
                                : isError
                                ? "rounded-bl-md border border-rose-200 bg-rose-50 text-rose-700"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                            }`}
                          >
                            {chat.text}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                )}

                {sending && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="flex items-end gap-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#061b51] text-[10px] text-cyan-300">
                      <FaRobot />
                    </div>

                    <div className="flex gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      {[0, 1, 2].map(
                        (dot) => (
                          <motion.span
                            key={dot}
                            animate={{
                              y: [
                                0,
                                -4,
                                0,
                              ],
                              opacity: [
                                0.4,
                                1,
                                0.4,
                              ],
                            }}
                            transition={{
                              duration: 0.7,
                              repeat: Infinity,
                              delay:
                                dot *
                                0.12,
                            }}
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                          />
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* FIXED MESSAGE INPUT */}

            <form
              onSubmit={
                handleSubmit
              }
              onPointerDown={(
                event
              ) =>
                event.stopPropagation()
              }
              className="shrink-0 border-t border-slate-200 bg-white p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                <textarea
                  ref={inputRef}
                  rows="1"
                  maxLength="4000"
                  value={message}
                  onChange={(
                    event
                  ) =>
                    setMessage(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    sending
                  }
                  placeholder="Ask SmartClear AI..."
                  className="max-h-24 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />

                <motion.button
                  whileTap={{
                    scale: 0.94,
                  }}
                  type="submit"
                  disabled={
                    !message.trim() ||
                    sending
                  }
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? (
                    <FaComments className="animate-pulse" />
                  ) : (
                    <FaPaperPlane />
                  )}
                </motion.button>
              </div>

              <p className="mt-2 text-center text-[9px] font-medium text-slate-400">
                Drag the header to move SmartClear AI • Scroll to view more
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING ROBOT BUTTON */}

      <motion.button
        type="button"
        onClick={() =>
          setIsOpen(
            (previous) =>
              !previous
          )
        }
        whileHover={{
          scale: 1.06,
        }}
        whileTap={{
          scale: 0.94,
        }}
        className="
          pointer-events-auto
          absolute
          bottom-5
          right-5
          flex
          h-[78px]
          w-[78px]
          items-center
          justify-center
          rounded-full

          sm:bottom-7
          sm:right-7
        "
        aria-label="Open SmartClear AI"
      >
        <motion.div
          animate={{
            scale: [
              1,
              1.16,
              1,
            ],
            opacity: [
              0.3,
              0.08,
              0.3,
            ],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
          }}
          className="absolute inset-0 rounded-full bg-blue-500"
        />

        <div className="absolute inset-[7px] rounded-full border border-cyan-200/30 bg-[#061b51] shadow-[0_12px_35px_rgba(15,23,42,0.4)]" />

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{
                opacity: 0,
                rotate: -90,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                rotate: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                rotate: 90,
                scale: 0.5,
              }}
              className="relative z-10 text-xl text-white"
            >
              <FaTimes />
            </motion.div>
          ) : (
            <motion.div
              key="robot"
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                scale: 0.58,
                y: [
                  2,
                  -5,
                  2,
                ],
              }}
              exit={{
                opacity: 0,
                y: -25,
                scale: 1,
              }}
              transition={{
                opacity: {
                  duration: 0.2,
                },

                scale: {
                  duration: 0.25,
                },

                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className="absolute -top-[20px] z-10 origin-center"
            >
              <RobotCharacter
                thinking={
                  contextLoading
                }
                health={
                  assistantState.type
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen &&
          clearanceData?.rejected >
            0 && (
            <motion.span
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              className="absolute right-0 top-0 z-20 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black text-white"
            >
              {
                clearanceData.rejected
              }
            </motion.span>
          )}
      </motion.button>
    </div>
  );
}

export default FloatingAIAssistant;