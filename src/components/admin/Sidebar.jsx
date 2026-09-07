import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  FaBell,
  FaBook,
  FaBuilding,
  FaChalkboardTeacher,
  FaChartBar,
  FaChevronRight,
  FaClipboardCheck,
  FaCog,
  FaGraduationCap,
  FaHome,
  FaRobot,
  FaShieldAlt,
  FaSignOutAlt,
  FaUser,
  FaUserGraduate,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";
import smartClearLogo from "../../assets/smartclear-logo.png";

const MENU_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        description: "System overview",
        path: "/admin/dashboard",
        icon: FaHome,
      },
    ],
  },
  {
    label: "User Accounts",
    items: [
      {
        name: "User Management",
        description: "Manage all accounts",
        path: "/admin/users",
        icon: FaUsers,
      },
      {
        name: "Student Management",
        description: "Student records",
        path: "/admin/students",
        icon: FaUserGraduate,
      },
    ],
  },
  {
    label: "Academic Setup",
    items: [
      {
        name: "Course Management",
        description: "Courses and programs",
        path: "/admin/courses",
        icon: FaGraduationCap,
      },
      {
        name: "Subject Management",
        description: "Subjects and codes",
        path: "/admin/subjects",
        icon: FaBook,
      },
      {
        name: "Class Assignments",
        description: "Faculty assignments",
        path: "/admin/class-assignments",
        icon: FaChalkboardTeacher,
      },
    ],
  },
  {
    label: "Clearance Setup",
    items: [
      {
        name: "Office Management",
        description: "School offices",
        path: "/admin/offices",
        icon: FaBuilding,
      },
      {
        name: "Approver Management",
        description: "Office approvers",
        path: "/admin/approver-management",
        icon: FaUserShield,
      },
      {
        name: "Clearance Management",
        description: "Monitor requests",
        path: "/admin/clearances",
        icon: FaClipboardCheck,
      },
    ],
  },
  {
    label: "Analytics & System",
    items: [
      {
        name: "Reports",
        description: "Reports and records",
        path: "/admin/reports",
        icon: FaChartBar,
      },
      {
        name: "AI Settings",
        description: "AI configuration",
        path: "/admin/ai-settings",
        icon: FaRobot,
      },
      {
        name: "System Settings",
        description: "Platform settings",
        path: "/admin/system-settings",
        icon: FaCog,
      },
      {
        name: "Notifications",
        description: "System updates",
        path: "/admin/notifications",
        icon: FaBell,
      },
      {
        name: "Profile",
        description: "Administrator profile",
        path: "/admin/profile",
        icon: FaUser,
      },
    ],
  },
];

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -36 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-white/10 bg-[#061b51] text-white shadow-[18px_0_50px_rgba(2,12,40,0.24)]"
    >
      {/* Ambient animations */}

      <motion.div
        animate={{
          x: [0, 26, 0],
          y: [0, -18, 0],
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
          x: [0, -22, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"
      />

      {/* Brand */}

      <div className="relative z-10 shrink-0 border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{
              rotate: 3,
              scale: 1.06,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
            }}
            className="flex h-16 w-16 shrink-0 items-center justify-center"
          >
            <img
              src={smartClearLogo}
              alt="SmartClear AI logo"
              className="h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(34,211,238,0.30)]"
            />
          </motion.div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight">
              SmartClear AI
            </h1>

            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/75">
              <FaShieldAlt />
              Administrator
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}

      <nav className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-color:rgba(255,255,255,0.16)_transparent] [scrollbar-width:thin]">
        <div className="space-y-5">
          {MENU_GROUPS.map((group, groupIndex) => (
            <motion.section
              key={group.label}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.05 + groupIndex * 0.06,
                duration: 0.38,
              }}
            >
              <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/40">
                {group.label}
              </p>

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className="group block"
                      >
                        {({ isActive }) => (
                          <motion.div
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.985 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 24,
                            }}
                            className={`relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition duration-200 ${
                              isActive
                                ? "bg-white text-[#061b51] shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
                                : "text-blue-100/80 hover:bg-white/[0.08] hover:text-white"
                            }`}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="admin-sidebar-active"
                                className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-blue-600"
                              />
                            )}

                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                                isActive
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-white/[0.06] text-cyan-200 group-hover:bg-white/10"
                              }`}
                            >
                              <Icon className="text-sm" />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold">
                                {item.name}
                              </span>

                              <span
                                className={`mt-0.5 block truncate text-[10px] ${
                                  isActive
                                    ? "text-slate-500"
                                    : "text-blue-200/45"
                                }`}
                              >
                                {item.description}
                              </span>
                            </span>

                            <FaChevronRight
                              className={`shrink-0 text-[9px] transition-transform group-hover:translate-x-0.5 ${
                                isActive
                                  ? "text-blue-500"
                                  : "text-blue-200/25"
                              }`}
                            />
                          </motion.div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </motion.section>
          ))}
        </div>
      </nav>

      {/* Status and logout */}

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-[#061b51] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-300">
              <FaShieldAlt />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                Administrator Portal
              </p>

              <p className="mt-0.5 truncate text-[10px] text-blue-200/50">
                Secure system access
              </p>
            </div>

            <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
          </div>
        </div>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleLogout}
          className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-blue-100/75 transition hover:bg-red-500/15 hover:text-red-200"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-red-300 transition group-hover:bg-red-500/15">
            <FaSignOutAlt />
          </span>

          <span className="text-sm font-bold">
            Logout
          </span>
        </motion.button>
      </div>
    </motion.aside>
  );
}

export default Sidebar;