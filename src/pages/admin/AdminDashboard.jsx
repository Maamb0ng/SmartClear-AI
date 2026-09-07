import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import {
  getDashboardStats,
} from "../../services/dashboardService";

import {
  FaArrowRight,
  FaBell,
  FaChartLine,
  FaCheckCircle,
  FaClipboardCheck,
  FaCog,
  FaExclamationTriangle,
  FaRobot,
  FaSyncAlt,
  FaUniversity,
  FaUserGraduate,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const recentUsers = [
  {
    id: 1,
    name: "Juan Dela Cruz",
    role: "Student",
    status: "Active",
  },
  {
    id: 2,
    name: "Maria Santos",
    role: "Approver",
    status: "Active",
  },
  {
    id: 3,
    name: "John Reyes",
    role: "Student",
    status: "Inactive",
  },
  {
    id: 4,
    name: "Anna Cruz",
    role: "Administrator",
    status: "Active",
  },
];

function AdminDashboard() {
  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    stats,
    setStats,
  ] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalApprovers: 0,
    totalAdmins: 0,
    totalOffices: 0,
    totalSubjects: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });

  const loadDashboard =
    async (
      isRefresh = false
    ) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await getDashboardStats();

        if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error(
          "Admin dashboard error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Dashboard",
          text:
            error?.message ||
            "An unexpected error occurred while loading the dashboard.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics =
    useMemo(() => {
      const percentage = (
        value,
        total
      ) => {
        if (
          !total ||
          total <= 0
        ) {
          return 0;
        }

        return Math.min(
          100,
          Math.round(
            (value / total) *
              100
          )
        );
      };

      return {
        completionRate:
          percentage(
            stats.approvedRequests,
            stats.totalRequests
          ),

        pendingRate:
          percentage(
            stats.pendingRequests,
            stats.totalRequests
          ),

        rejectionRate:
          percentage(
            stats.rejectedRequests,
            stats.totalRequests
          ),
      };
    }, [stats]);

  const statCards = [
    {
      title: "Students",
      value:
        stats.totalStudents,
      description:
        "Registered student accounts",
      icon: FaUserGraduate,
      tone:
        "from-blue-400/20 to-cyan-400/5",
      iconClass:
        "bg-blue-400/15 text-cyan-300",
    },
    {
      title: "Approvers",
      value:
        stats.totalApprovers,
      description:
        "Faculty and office approvers",
      icon: FaUserShield,
      tone:
        "from-emerald-400/20 to-teal-400/5",
      iconClass:
        "bg-emerald-400/15 text-emerald-300",
    },
    {
      title:
        "Pending Clearances",
      value:
        stats.pendingRequests,
      description:
        "Requests requiring attention",
      icon:
        FaClipboardCheck,
      tone:
        "from-amber-400/20 to-orange-400/5",
      iconClass:
        "bg-amber-400/15 text-amber-300",
    },
    {
      title: "Offices",
      value:
        stats.totalOffices,
      description:
        "Configured clearance offices",
      icon: FaUniversity,
      tone:
        "from-violet-400/20 to-fuchsia-400/5",
      iconClass:
        "bg-violet-400/15 text-violet-300",
    },
  ];

  const overviewItems = [
    {
      label:
        "Clearance Completion",
      value:
        metrics.completionRate,
      description: `${stats.approvedRequests} approved of ${stats.totalRequests} requests`,
      gradient:
        "from-blue-700 via-blue-500 to-cyan-400",
    },
    {
      label:
        "Pending Workload",
      value:
        metrics.pendingRate,
      description: `${stats.pendingRequests} requests currently pending`,
      gradient:
        "from-amber-500 via-orange-400 to-yellow-300",
    },
    {
      label:
        "Rejection Rate",
      value:
        metrics.rejectionRate,
      description: `${stats.rejectedRequests} rejected requests recorded`,
      gradient:
        "from-rose-600 via-red-500 to-orange-400",
    },
  ];

  const quickActions = [
    {
      label:
        "Manage Users",
      description:
        "Review and manage accounts",
      icon: FaUsers,
      path: "/admin/users",
    },
    {
      label:
        "View Reports",
      description:
        "Open analytics and records",
      icon: FaChartLine,
      path: "/admin/reports",
    },
    {
      label:
        "System Settings",
      description:
        "Configure the platform",
      icon: FaCog,
      path:
        "/admin/system-settings",
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />

              <FaRobot className="text-2xl text-blue-700" />
            </div>

            <p className="mt-5 font-bold text-slate-700">
              Loading administrator dashboard...
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
        <div className="pointer-events-none absolute -right-48 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -left-40 top-[38rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* HERO */}

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
            duration: 0.65,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
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
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between xl:p-8">
            <div className="flex min-w-0 items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-md">
                  <FaUserShield className="text-cyan-300" />
                  Administrator Portal
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl xl:text-4xl">
                  System Control &
                  <span className="ml-2 bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                    Monitoring
                  </span>
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
                  Monitor users, clearance requests, offices, approvers,
                  reports, and overall system activity from one dashboard.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-50/90">
                  <span className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                    {stats.totalUsers} Total Users
                  </span>

                  <span className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                    {stats.totalSubjects} Subjects
                  </span>

                  <span className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 backdrop-blur">
                    {stats.totalRequests} Requests
                  </span>
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
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 xl:self-center"
            >
              <FaSyncAlt
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh Data"}
            </motion.button>
          </div>
        </motion.section>

        {/* STATISTICS */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(
            (
              card,
              index
            ) => {
              const Icon =
                card.icon;

              return (
                <motion.article
                  key={
                    card.title
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
                    duration: 0.45,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] p-5 text-white shadow-[0_18px_38px_rgba(2,12,40,0.16)]"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.tone}`}
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/65">
                        {
                          card.title
                        }
                      </p>

                      <p className="mt-3 text-3xl font-black">
                        {
                          card.value
                        }
                      </p>

                      <p className="mt-1 text-xs text-blue-100/60">
                        {
                          card.description
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}
                    >
                      <Icon className="text-lg" />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* MAIN GRID */}

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          {/* OVERVIEW */}

          <motion.article
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
              duration: 0.5,
            }}
            className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Analytics
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                System Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live percentages based on current clearance request totals.
              </p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {overviewItems.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={
                      item.label
                    }
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {
                            item.label
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            item.description
                          }
                        </p>
                      </div>

                      <p className="text-2xl font-black text-[#082a70]">
                        {
                          item.value
                        }
                        %
                      </p>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{
                          width: 0,
                        }}
                        animate={{
                          width: `${item.value}%`,
                        }}
                        transition={{
                          duration: 0.9,
                          delay:
                            0.15 +
                            index *
                              0.12,
                          ease: [
                            0.22,
                            1,
                            0.36,
                            1,
                          ],
                        }}
                        className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`}
                      />
                    </div>
                  </div>
                )
              )}

              <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                    Approved
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-800">
                    {
                      stats.approvedRequests
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                    Pending
                  </p>

                  <p className="mt-2 text-2xl font-black text-amber-800">
                    {
                      stats.pendingRequests
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">
                    Rejected
                  </p>

                  <p className="mt-2 text-2xl font-black text-rose-800">
                    {
                      stats.rejectedRequests
                    }
                  </p>
                </div>
              </div>
            </div>
          </motion.article>

          {/* AI ADMIN CARD */}

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
              delay: 0.26,
              duration: 0.5,
            }}
            whileHover={{
              y: -4,
            }}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#061b51] via-[#082a70] to-[#0b4f92] p-6 text-white shadow-[0_20px_50px_rgba(2,12,40,0.22)]"
          >
            <motion.div
              animate={{
                x: [
                  0,
                  18,
                  0,
                ],
                y: [
                  0,
                  -10,
                  0,
                ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl"
            />

            <div className="relative z-10 flex h-full flex-col">
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
                  duration: 3.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-300 backdrop-blur"
              >
                <FaRobot className="text-4xl" />
              </motion.div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                Smart Administration
              </p>

              <h2 className="mt-2 text-2xl font-black">
                AI System Assistant
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-100/80">
                Configure AI support, review system activity, and manage
                SmartClear assistance settings from the administrator portal.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <FaCheckCircle className="text-emerald-300" />

                  <span className="text-xs text-blue-100/80">
                    System statistics updated
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <FaBell className="text-amber-300" />

                  <span className="text-xs text-blue-100/80">
                    {stats.pendingRequests} pending requests require monitoring
                  </span>
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
                onClick={() =>
                  navigate(
                    "/admin/ai-settings"
                  )
                }
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#082a70] shadow-lg transition"
              >
                Open AI Settings
                <FaArrowRight />
              </motion.button>
            </div>
          </motion.article>
        </section>

        {/* QUICK ACTIONS */}

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
            duration: 0.5,
          }}
          className="grid gap-4 md:grid-cols-3"
        >
          {quickActions.map(
            (
              action,
              index
            ) => {
              const Icon =
                action.icon;

              return (
                <motion.button
                  key={
                    action.label
                  }
                  initial={{
                    opacity: 0,
                    y: 14,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.34 +
                      index *
                        0.07,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  whileTap={{
                    scale: 0.985,
                  }}
                  type="button"
                  onClick={() =>
                    navigate(
                      action.path
                    )
                  }
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_14px_36px_rgba(15,23,42,0.07)] transition"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                    <Icon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900">
                      {
                        action.label
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        action.description
                      }
                    </p>
                  </div>

                  <FaArrowRight className="shrink-0 text-blue-700 transition-transform group-hover:translate-x-1" />
                </motion.button>
              );
            }
          )}
        </motion.section>

        {/* RECENT USERS */}

        <motion.article
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.36,
            duration: 0.5,
          }}
          className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
        >
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Account Activity
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Recent Users
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/users"
                )
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-800"
            >
              View User Management
              <FaArrowRight />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:px-6">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Role
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentUsers.map(
                  (
                    user,
                    index
                  ) => (
                    <motion.tr
                      key={
                        user.id
                      }
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          0.4 +
                          index *
                            0.05,
                      }}
                      className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-sm font-black text-cyan-300">
                            {user.name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <p className="font-bold text-slate-800">
                            {
                              user.name
                            }
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {
                          user.role
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                            user.status ===
                            "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.status ===
                              "Active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />

                          {
                            user.status
                          }
                        </span>
                      </td>
                    </motion.tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3 text-xs text-slate-500">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-500" />

              <p>
                The recent-user entries above are still sample UI data. Connect
                this section to your real user service before final deployment.
              </p>
            </div>
          </div>
        </motion.article>
      </motion.main>
    </AdminLayout>
  );
}

export default AdminDashboard;