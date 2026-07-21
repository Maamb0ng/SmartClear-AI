import {
  motion,
} from "framer-motion";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowRight,
  FaBell,
  FaCheckCircle,
  FaClipboardCheck,
  FaGraduationCap,
  FaRobot,
  FaShieldAlt,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const FEATURE_ITEMS = [
  {
    icon: FaClipboardCheck,
    label: "Digital Clearance",
    text: "Paperless requests and approvals",
  },
  {
    icon: FaBell,
    label: "Real-time Updates",
    text: "Instant status notifications",
  },
  {
    icon: FaRobot,
    label: "AI Assistance",
    text: "Smart student guidance",
  },
];

const floatingTransition = {
  duration: 4,
  repeat: Infinity,
  ease: "easeInOut",
};

function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-[#061b51] text-white"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            `url(${campusImage})`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#061b51]/93 to-[#0b4f92]/78" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(56,189,248,0.16),transparent_30%)]" />

      <motion.div
        animate={{
          x: [0, 28, 0],
          y: [0, -18, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl"
      />

      <motion.div
        animate={{
          x: [0, -24, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan-300/12 blur-3xl"
      />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:pb-12 lg:pt-24">
        {/* Main content */}

        <motion.div
          initial={{
            opacity: 0,
            x: -45,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.75,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.12,
              duration: 0.5,
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.17em] text-blue-100 backdrop-blur-md"
          >
            <FaCheckCircle className="text-cyan-300" />
            AI-powered digital clearance
          </motion.div>

          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            A smarter way to complete your
            <span className="block bg-gradient-to-r from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent">
              school clearance.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/82 sm:text-lg sm:leading-8">
            SmartClear AI connects students, faculty, offices, and
            administrators through one secure and paperless clearance
            workflow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <motion.div
              whileHover={{
                y: -3,
              }}
              whileTap={{
                scale: 0.98,
              }}
            >
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-[#082a70] shadow-[0_16px_32px_rgba(255,255,255,0.16)] transition hover:bg-blue-50 sm:w-auto"
              >
                Create Your Account
                <FaArrowRight />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{
                y: -3,
              }}
              whileTap={{
                scale: 0.98,
              }}
            >
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 sm:w-auto"
              >
                Sign In to SmartClear
              </Link>
            </motion.div>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {FEATURE_ITEMS.map(
              (
                feature,
                index
              ) => {
                const Icon =
                  feature.icon;

                return (
                  <motion.article
                    key={
                      feature.label
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
                        0.28 +
                        index *
                          0.08,
                      duration: 0.45,
                    }}
                    whileHover={{
                      y: -4,
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300">
                      <Icon />
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-white">
                      {
                        feature.label
                      }
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-blue-100/60">
                      {
                        feature.text
                      }
                    </p>
                  </motion.article>
                );
              }
            )}
          </div>

          <div className="mt-7 flex items-center gap-3 text-xs text-blue-100/65">
            <FaShieldAlt className="text-cyan-300" />

            <span>
              Secure role-based access for students, approvers, and administrators
            </span>
          </div>
        </motion.div>

        {/* Visual panel */}

        <motion.div
          initial={{
            opacity: 0,
            x: 45,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            delay: 0.08,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative mx-auto w-full max-w-lg"
        >
          <motion.div
            animate={{
              y: [0, -8, 0],
            }}
            transition={floatingTransition}
            className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#071b4b]/88 p-5 shadow-[0_30px_80px_rgba(2,12,40,0.42)] backdrop-blur-xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white p-0.5">
                  <img
                    src={schoolLogo}
                    alt="Consolatrix College of Toledo City seal"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    SmartClear AI
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.15em] text-blue-100/55">
                    Clearance Overview
                  </p>
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300">
                <FaRobot />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-100/60">
                    Overall Progress
                  </p>

                  <p className="mt-1 text-2xl font-black text-white">
                    Real-time
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <FaClipboardCheck className="text-xl" />
                </div>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{
                    width: "8%",
                  }}
                  animate={{
                    width: [
                      "8%",
                      "78%",
                      "58%",
                      "78%",
                    ],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title:
                    "Office Clearances",
                  subtitle:
                    "Track every department",
                  icon:
                    FaClipboardCheck,
                  className:
                    "bg-blue-400/15 text-blue-200",
                },
                {
                  title:
                    "Faculty Approvals",
                  subtitle:
                    "Subject-level status",
                  icon:
                    FaGraduationCap,
                  className:
                    "bg-violet-400/15 text-violet-200",
                },
                {
                  title:
                    "Smart Notifications",
                  subtitle:
                    "Instant updates",
                  icon:
                    FaBell,
                  className:
                    "bg-amber-400/15 text-amber-200",
                },
                {
                  title:
                    "AI Student Help",
                  subtitle:
                    "Guidance when needed",
                  icon:
                    FaRobot,
                  className:
                    "bg-cyan-400/15 text-cyan-200",
                },
              ].map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <motion.div
                      key={
                        item.title
                      }
                      initial={{
                        opacity: 0,
                        scale: 0.94,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{
                        delay:
                          0.36 +
                          index *
                            0.08,
                      }}
                      whileHover={{
                        y: -3,
                      }}
                      className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5"
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.className}`}
                      >
                        <Icon />
                      </div>

                      <p className="mt-3 text-xs font-bold text-white">
                        {
                          item.title
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-blue-100/50">
                        {
                          item.subtitle
                        }
                      </p>
                    </motion.div>
                  );
                }
              )}
            </div>
          </motion.div>

          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 2, 0],
            }}
            transition={{
              duration: 4.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-3 -top-5 hidden rounded-2xl border border-white/15 bg-white/10 p-4 text-cyan-300 shadow-xl backdrop-blur-md sm:block"
          >
            <FaRobot className="text-2xl" />
          </motion.div>

          <motion.div
            animate={{
              y: [0, 8, 0],
              rotate: [0, -2, 0],
            }}
            transition={{
              duration: 5.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-white/15 bg-white/10 p-4 text-emerald-300 shadow-xl backdrop-blur-md sm:block"
          >
            <FaCheckCircle className="text-2xl" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;