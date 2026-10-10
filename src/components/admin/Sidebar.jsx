import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBell,
  FaBook,
  FaBuilding,
  FaChalkboardTeacher,
  FaChartBar,
  FaClipboardCheck,
  FaCog,
  FaGraduationCap,
  FaHome,
  FaLayerGroup,
  FaRobot,
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
      { name: "Dashboard", path: "/admin/dashboard", icon: FaHome },
    ],
  },
  {
    label: "Users",
    items: [
      { name: "User Management", path: "/admin/users", icon: FaUsers },
      { name: "Student Management", path: "/admin/students", icon: FaUserGraduate },
    ],
  },
  {
    label: "Academics",
    items: [
      { name: "Courses", path: "/admin/courses", icon: FaGraduationCap },
      { name: "Subjects", path: "/admin/subjects", icon: FaBook },
      { name: "Class Assignments", path: "/admin/class-assignments", icon: FaChalkboardTeacher },
      { name: "Blocks", path: "/admin/blocks", icon: FaLayerGroup },
    ],
  },
  {
    label: "Clearance",
    items: [
      { name: "Offices", path: "/admin/offices", icon: FaBuilding },
      { name: "Approvers", path: "/admin/approver-management", icon: FaUserShield },
      { name: "Clearance Requests", path: "/admin/clearances", icon: FaClipboardCheck },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Reports", path: "/admin/reports", icon: FaChartBar },
      { name: "AI Settings", path: "/admin/ai-settings", icon: FaRobot },
      { name: "System Settings", path: "/admin/system-settings", icon: FaCog },
    ],
  },
];

const BOTTOM_ITEMS = [
  { name: "Notifications", path: "/admin/notifications", icon: FaBell },
  { name: "Profile", path: "/admin/profile", icon: FaUser },
];

const groupVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (index) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.06 + index * 0.055, duration: 0.3 },
  }),
};

function MenuItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink to={item.path} className="block">
      {({ isActive }) => (
        <motion.div
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
            isActive
              ? "bg-white text-[#0a2a67] shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
              : "text-blue-100/70 hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="admin-sidebar-active-indicator"
              className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-blue-600"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}

          <motion.span
            animate={isActive ? { scale: 1.05 } : { scale: 1 }}
            className={`flex h-7 w-7 shrink-0 items-center justify-center ${
              isActive ? "text-blue-600" : "text-cyan-200/80"
            }`}
          >
            <Icon className="text-sm" />
          </motion.span>

          <span className="min-w-0 flex-1 truncate">{item.name}</span>

          {isActive && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
            />
          )}
        </motion.div>
      )}
    </NavLink>
  );
}

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-white/10 bg-[#082660] text-white shadow-[14px_0_36px_rgba(2,12,40,0.18)]"
    >
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <motion.img
            whileHover={{ rotate: 4, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            src={smartClearLogo}
            alt="SmartClear AI logo"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight">SmartClear AI</h1>
            <p className="mt-0.5 text-xs font-medium text-cyan-200/70">Administrator</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <div className="space-y-4">
          {MENU_GROUPS.map((group, index) => (
            <motion.section
              key={group.label}
              custom={index}
              variants={groupVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="mb-1.5 px-3 text-[11px] font-semibold text-blue-200/45">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <MenuItem key={item.path} item={item} />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}

          <motion.button
            type="button"
            onClick={handleLogout}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-blue-100/70 transition-colors hover:bg-red-500/15 hover:text-red-200"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-red-300">
              <FaSignOutAlt className="text-sm" />
            </span>
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
