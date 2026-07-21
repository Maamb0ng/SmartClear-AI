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

import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  sendGeminiMessage,
} from "../../services/aiService";

import { supabase } from "../../services/supabase";

import {
  FaBolt,
  FaCheckCircle,
  FaComments,
  FaExclamationTriangle,
  FaMagic,
  FaMicrochip,
  FaPaperPlane,
  FaPlus,
  FaRobot,
  FaShieldAlt,
  FaUser,
  FaWifi,
} from "react-icons/fa";

const INITIAL_MESSAGE = {
  id: "welcome-message",
  sender: "bot",
  text:
    "Hello! I’m SmartClear AI. I can guide you through clearance requests, requirements, resubmissions, notifications, and the digital clearance pass. What would you like to know?",
  createdAt: new Date().toISOString(),
};

const SUGGESTIONS = [
  "How do I request clearance?",
  "How can I resubmit a rejected requirement?",
  "What does In Progress mean?",
  "When will I receive my digital clearance pass?",
];

const CHAT_STORAGE_PREFIX =
  "smartclear-ai-conversation";

const createFreshInitialMessage = () => ({
  ...INITIAL_MESSAGE,
  id: `welcome-${Date.now()}`,
  createdAt: new Date().toISOString(),
});

const isValidStoredChat = (chat) => {
  return (
    chat &&
    typeof chat.id === "string" &&
    ["user", "bot", "error"].includes(
      chat.sender
    ) &&
    typeof chat.text === "string" &&
    typeof chat.createdAt === "string"
  );
};

const formatTime = (date) => {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleTimeString(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
};


function AIMascot({
  isThinking = false,
}) {
  return (
    <div className="relative mt-6 min-h-[250px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03]">
      <motion.div
        animate={{
          scale: [1, 1.16, 1],
          opacity: [0.28, 0.52, 0.28],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-1/2 top-[46%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/20 blur-3xl"
      />

      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-3 top-3 z-20 rounded-xl border border-white/10 bg-[#071b4b]/85 px-3 py-2 shadow-lg backdrop-blur"
      >
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
          {isThinking ? "Thinking..." : "Ready to help"}
        </p>
      </motion.div>

      {[0, 1, 2].map((particle) => (
        <motion.span
          key={particle}
          animate={{
            y: [0, -18, 0],
            opacity: [0.25, 0.8, 0.25],
            scale: [0.8, 1.15, 0.8],
          }}
          transition={{
            duration: 2.8 + particle * 0.45,
            repeat: Infinity,
            delay: particle * 0.35,
            ease: "easeInOut",
          }}
          className={`absolute h-2 w-2 rounded-full bg-cyan-300 ${
            particle === 0
              ? "left-8 top-20"
              : particle === 1
              ? "right-8 top-28"
              : "left-12 bottom-12"
          }`}
        />
      ))}

      <motion.div
        animate={{
          y: isThinking ? [0, -8, 0] : [0, -5, 0],
          rotate: isThinking
            ? [0, -1.5, 1.5, 0]
            : [0, -1, 1, 0],
        }}
        transition={{
          duration: isThinking ? 1.8 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/2 top-[54%] z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative mx-auto h-8 w-1 rounded-full bg-gradient-to-b from-cyan-200 to-blue-500">
          <motion.span
            animate={{
              scale: [1, 1.35, 1],
              boxShadow: [
                "0 0 0 0 rgba(103,232,249,0.25)",
                "0 0 0 8px rgba(103,232,249,0)",
                "0 0 0 0 rgba(103,232,249,0)",
              ],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
            }}
            className="absolute -left-1.5 -top-2 h-4 w-4 rounded-full bg-cyan-300"
          />
        </div>

        <div className="relative h-24 w-32 rounded-[2rem] border border-cyan-200/30 bg-gradient-to-br from-cyan-100 via-blue-100 to-indigo-200 p-3 shadow-[0_18px_35px_rgba(0,0,0,0.28)]">
          <div className="relative flex h-full items-center justify-center gap-5 overflow-hidden rounded-[1.45rem] bg-[#061b51]">
            {[0, 1].map((eye) => (
              <motion.span
                key={eye}
                animate={{
                  scaleY: [1, 1, 0.12, 1, 1],
                }}
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  times: [0, 0.42, 0.46, 0.5, 1],
                }}
                className="h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]"
              />
            ))}

            <motion.div
              animate={{
                opacity: [0.28, 0.6, 0.28],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
              }}
              className="absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
            />
          </div>

          <span className="absolute -left-3 top-8 h-8 w-3 rounded-l-full bg-cyan-300/80" />
          <span className="absolute -right-3 top-8 h-8 w-3 rounded-r-full bg-cyan-300/80" />
        </div>

        <div className="mx-auto h-4 w-7 rounded-b-lg bg-cyan-200/80" />

        <div className="relative mx-auto h-24 w-28 rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-blue-500 via-indigo-600 to-[#061b51] shadow-[0_18px_35px_rgba(0,0,0,0.25)]">
          <div className="absolute left-1/2 top-4 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg text-cyan-300">
            {isThinking ? (
              <FaMicrochip className="animate-pulse" />
            ) : (
              <FaBolt />
            )}
          </div>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {[0, 1, 2].map((light) => (
              <motion.span
                key={light}
                animate={{
                  opacity: [0.25, 1, 0.25],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: light * 0.18,
                }}
                className="h-2 w-2 rounded-full bg-cyan-300"
              />
            ))}
          </div>

          <motion.div
            animate={{
              rotate: [-8, 7, -8],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-6 top-4 h-16 w-5 origin-top rounded-full bg-gradient-to-b from-blue-300 to-blue-600"
          >
            <span className="absolute -bottom-2 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-cyan-100" />
          </motion.div>

          <motion.div
            animate={{
              rotate: isThinking
                ? [18, 32, 18]
                : [-18, -42, -18],
            }}
            transition={{
              duration: isThinking ? 1.5 : 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-6 top-3 h-16 w-5 origin-top rounded-full bg-gradient-to-b from-blue-300 to-blue-600"
          >
            <span className="absolute -bottom-2 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-cyan-100" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        animate={{
          scaleX: [1, 0.84, 1],
          opacity: [0.25, 0.14, 0.25],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-4 left-1/2 h-4 w-32 -translate-x-1/2 rounded-full bg-black/30 blur-md"
      />

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-100/65">
        <FaWifi className="text-emerald-300" />
        Gemini Connected
      </div>
    </div>
  );
}

function Assistant() {
  const [
    message,
    setMessage,
  ] = useState("");

  const [
    chats,
    setChats,
  ] = useState([
    INITIAL_MESSAGE,
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
    activeModel,
    setActiveModel,
  ] = useState(null);

  const [
    chatStorageKey,
    setChatStorageKey,
  ] = useState(null);

  const [
    chatStorageReady,
    setChatStorageReady,
  ] = useState(false);

  const chatContainerRef =
    useRef(null);

  const inputRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | RESTORE CONVERSATION FOR THE LOGGED-IN STUDENT
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let isMounted = true;

    const restoreConversation = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user || !isMounted) {
          return;
        }

        const storageKey =
          `${CHAT_STORAGE_PREFIX}:${user.id}`;

        setChatStorageKey(storageKey);

        const storedValue =
          localStorage.getItem(storageKey);

        if (!storedValue) {
          return;
        }

        const storedConversation =
          JSON.parse(storedValue);

        const storedChats = Array.isArray(
          storedConversation?.chats
        )
          ? storedConversation.chats.filter(
              isValidStoredChat
            )
          : [];

        if (storedChats.length > 0) {
          setChats(storedChats);
        }

        setPreviousInteractionId(
          typeof storedConversation
            ?.previousInteractionId ===
            "string"
            ? storedConversation
                .previousInteractionId
            : null
        );

        setActiveModel(
          typeof storedConversation
            ?.activeModel === "string"
            ? storedConversation.activeModel
            : null
        );

        setMessage(
          typeof storedConversation
            ?.draftMessage === "string"
            ? storedConversation.draftMessage
            : ""
        );
      } catch (error) {
        console.error(
          "Unable to restore AI conversation:",
          error
        );
      } finally {
        if (isMounted) {
          setChatStorageReady(true);
        }
      }
    };

    restoreConversation();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SAVE CONVERSATION AFTER EVERY CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !chatStorageReady ||
      !chatStorageKey
    ) {
      return;
    }

    try {
      localStorage.setItem(
        chatStorageKey,
        JSON.stringify({
          chats,
          previousInteractionId,
          activeModel,
          draftMessage: message,
          updatedAt:
            new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error(
        "Unable to save AI conversation:",
        error
      );
    }
  }, [
    chats,
    previousInteractionId,
    activeModel,
    message,
    chatStorageKey,
    chatStorageReady,
  ]);

  const canSend =
    useMemo(() => {
      return (
        message.trim().length >
          0 &&
        !sending
      );
    }, [
      message,
      sending,
    ]);

  const scrollToBottom =
    () => {
      const container =
        chatContainerRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        top:
          container.scrollHeight,
        behavior: "smooth",
      });
    };

  useEffect(() => {
    scrollToBottom();
  }, [
    chats,
    sending,
  ]);

  const appendMessage = (
    sender,
    text
  ) => {
    setChats(
      (
        previousChats
      ) => [
        ...previousChats,
        {
          id:
            typeof crypto !==
              "undefined" &&
            crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          sender,
          text,
          createdAt:
            new Date().toISOString(),
        },
      ]
    );
  };

  const sendMessage =
    async (
      customMessage = null
    ) => {
      const outgoingMessage =
        String(
          customMessage ??
            message
        ).trim();

      if (
        !outgoingMessage ||
        sending
      ) {
        return;
      }

      appendMessage(
        "user",
        outgoingMessage
      );

      setMessage("");
      setSending(true);

      try {
        const result =
          await sendGeminiMessage({
            message:
              outgoingMessage,
            previousInteractionId,
          });

        appendMessage(
          "bot",
          result.reply
        );

        setPreviousInteractionId(
          result.interactionId ||
            previousInteractionId
        );

        setActiveModel(
          result.model ||
            activeModel
        );
      } catch (error) {
        console.error(
          "SmartClear AI error:",
          error
        );

        appendMessage(
          "error",
          error?.message ||
            "SmartClear AI could not process your message."
        );

        await Swal.fire({
          icon: "error",
          title:
            "AI Assistant Unavailable",
          text:
            error?.message ||
            "Unable to contact SmartClear AI. Please try again.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSending(false);

        requestAnimationFrame(
          () => {
            inputRef.current?.focus();
          }
        );
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

      if (canSend) {
        sendMessage();
      }
    }
  };

  const handleSuggestion = (
    question
  ) => {
    sendMessage(question);
  };

  const handleNewConversation =
    async () => {
      const hasConversation =
        chats.length > 1;

      if (
        hasConversation
      ) {
        const confirmation =
          await Swal.fire({
            icon: "question",
            title:
              "Start a New Conversation?",
            text:
              "The visible chat history on this page will be cleared.",
            showCancelButton:
              true,
            confirmButtonText:
              "Start New Chat",
            cancelButtonText:
              "Keep Conversation",
            confirmButtonColor:
              "#2563eb",
          });

        if (
          !confirmation.isConfirmed
        ) {
          return;
        }
      }

      setChats([
        createFreshInitialMessage(),
      ]);

      setPreviousInteractionId(
        null
      );

      setActiveModel(null);
      setMessage("");

      requestAnimationFrame(
        () => {
          inputRef.current?.focus();
        }
      );
    };

  return (
    <DashboardLayout>
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
          duration: 0.5,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative h-[calc(100vh-8.25rem)] min-h-[640px] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
      >
        <div className="flex h-full">
          {/* Left information panel */}

          <aside className="relative hidden w-[21rem] shrink-0 overflow-hidden border-r border-white/10 bg-[#061b51] p-5 text-white xl:block">
            <motion.div
              animate={{
                x: [
                  0,
                  24,
                  0,
                ],
                y: [
                  0,
                  -18,
                  0,
                ],
              }}
              transition={{
                duration: 11,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl"
            />

            <motion.div
              animate={{
                x: [
                  0,
                  -20,
                  0,
                ],
                y: [
                  0,
                  18,
                  0,
                ],
              }}
              transition={{
                duration: 13,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"
            />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    y: [
                      0,
                      -5,
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
                    duration: 3.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl text-cyan-300 backdrop-blur"
                >
                  <FaRobot />
                </motion.div>

                <div>
                  <h2 className="text-xl font-black">
                    SmartClear AI
                  </h2>

                  <p className="mt-0.5 text-xs font-semibold text-blue-100/55">
                    AI Student Assistant
                  </p>
                </div>
              </div>

              <AIMascot
                isThinking={
                  sending
                }
              />

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-cyan-300" />

                  <p className="text-sm font-black">
                    Secure Assistance
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-blue-100/60">
                  Your request is processed through a secure Supabase Edge
                  Function. The Gemini API key is never exposed in the browser.
                </p>
              </div>

              <div className="mt-7">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/45">
                  Suggested Questions
                </p>

                <div className="mt-3 space-y-2.5">
                  {SUGGESTIONS.map(
                    (
                      question,
                      index
                    ) => (
                      <motion.button
                        key={
                          question
                        }
                        initial={{
                          opacity: 0,
                          x: -12,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay:
                            0.1 +
                            index *
                              0.06,
                        }}
                        whileHover={{
                          x: 4,
                        }}
                        whileTap={{
                          scale:
                            0.985,
                        }}
                        type="button"
                        onClick={() =>
                          handleSuggestion(
                            question
                          )
                        }
                        disabled={
                          sending
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3.5 text-left text-xs font-semibold leading-5 text-blue-50/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {
                          question
                        }
                      </motion.button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <FaMagic className="text-violet-300" />

                  <p className="text-sm font-black">
                    Assistant Capabilities
                  </p>
                </div>

                <div className="mt-3 space-y-2 text-xs text-blue-100/65">
                  {[
                    "Clearance workflow guidance",
                    "Submission and resubmission help",
                    "Office and subject step explanations",
                    "Digital clearance pass guidance",
                  ].map(
                    (
                      feature
                    ) => (
                      <div
                        key={
                          feature
                        }
                        className="flex items-start gap-2"
                      >
                        <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-300" />

                        <span>
                          {
                            feature
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main chat panel */}

          <section className="flex min-w-0 flex-1 flex-col bg-[#f3f6fb]">
            {/* Chat header */}

            <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#071b4b] text-xl text-cyan-300 shadow-lg">
                  <FaRobot />

                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                    SmartClear AI Assistant
                  </h1>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Online
                    </span>

                    {activeModel && (
                      <>
                        <span className="text-slate-300">
                          •
                        </span>

                        <span className="truncate">
                          {
                            activeModel
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                type="button"
                onClick={
                  handleNewConversation
                }
                disabled={
                  sending
                }
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
              >
                <FaPlus />
                New Conversation
              </motion.button>
            </div>

            {/* Chat messages */}

            <div
              ref={
                chatContainerRef
              }
              className="flex-1 space-y-5 overflow-y-auto px-4 py-5 [scrollbar-color:rgba(100,116,139,0.35)_transparent] [scrollbar-width:thin] sm:px-6"
            >
              <AnimatePresence initial={false}>
                {chats.map(
                  (
                    chat
                  ) => {
                    const isUser =
                      chat.sender ===
                      "user";

                    const isError =
                      chat.sender ===
                      "error";

                    return (
                      <motion.div
                        key={
                          chat.id
                        }
                        initial={{
                          opacity: 0,
                          y: 12,
                          x:
                            isUser
                              ? 12
                              : -12,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          scale:
                            0.98,
                        }}
                        transition={{
                          duration:
                            0.28,
                        }}
                        className={`flex ${
                          isUser
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-[92%] items-end gap-2.5 sm:max-w-[80%] ${
                            isUser
                              ? "flex-row-reverse"
                              : ""
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm text-white shadow-sm ${
                              isUser
                                ? "bg-slate-700"
                                : isError
                                ? "bg-rose-600"
                                : "bg-[#071b4b]"
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

                          <div>
                            <div
                              className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                isUser
                                  ? "rounded-br-md bg-gradient-to-r from-blue-700 to-indigo-600 text-white"
                                  : isError
                                  ? "rounded-bl-md border border-rose-200 bg-rose-50 text-rose-700"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {
                                chat.text
                              }
                            </div>

                            <p
                              className={`mt-1 px-1 text-[10px] font-medium text-slate-400 ${
                                isUser
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {formatTime(
                                chat.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </AnimatePresence>

              {sending && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="flex justify-start"
                >
                  <div className="flex items-end gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#071b4b] text-sm text-cyan-300 shadow-sm">
                      <FaRobot />
                    </div>

                    <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map(
                          (
                            dot
                          ) => (
                            <motion.span
                              key={
                                dot
                              }
                              animate={{
                                y: [
                                  0,
                                  -5,
                                  0,
                                ],
                                opacity: [
                                  0.45,
                                  1,
                                  0.45,
                                ],
                              }}
                              transition={{
                                duration:
                                  0.8,
                                repeat:
                                  Infinity,
                                delay:
                                  dot *
                                  0.13,
                              }}
                              className="h-2 w-2 rounded-full bg-blue-500"
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Mobile suggestions */}

            <div className="border-t border-slate-200/70 bg-white px-4 pt-3 xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                {SUGGESTIONS.map(
                  (
                    question
                  ) => (
                    <button
                      key={
                        question
                      }
                      type="button"
                      onClick={() =>
                        handleSuggestion(
                          question
                        )
                      }
                      disabled={
                        sending
                      }
                      className="min-w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      {
                        question
                      }
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Message input */}

            <form
              onSubmit={
                handleSubmit
              }
              className="border-t border-slate-200/80 bg-white p-4 sm:p-5"
            >
              <div className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-slate-50/70 p-2 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                <textarea
                  ref={
                    inputRef
                  }
                  rows="1"
                  value={
                    message
                  }
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
                  maxLength="4000"
                  placeholder="Ask SmartClear AI about your clearance..."
                  disabled={
                    sending
                  }
                  className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />

                <motion.button
                  whileHover={{
                    y:
                      canSend
                        ? -2
                        : 0,
                  }}
                  whileTap={{
                    scale:
                      canSend
                        ? 0.96
                        : 1,
                  }}
                  type="submit"
                  disabled={
                    !canSend
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.25)] transition disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  {sending ? (
                    <FaComments className="animate-pulse" />
                  ) : (
                    <FaPaperPlane />
                  )}
                </motion.button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 px-1">
                <p className="text-[10px] leading-4 text-slate-400">
                  Press Enter to send and Shift + Enter for a new line.
                </p>

                <p className="text-[10px] font-semibold text-slate-400">
                  {message.length}
                  /4000
                </p>
              </div>

              <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
                SmartClear AI may make mistakes. Confirm official requirements
                and decisions with the assigned school office.
              </p>
            </form>
          </section>
        </div>
      </motion.main>
    </DashboardLayout>
  );
}

export default Assistant;