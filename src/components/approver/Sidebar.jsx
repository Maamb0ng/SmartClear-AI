import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { logoutUser } from "../../services/authService";
import { getOfficeStaffContext } from "../../services/officeStaffService";
import smartClearLogo from "../../assets/smartclear-logo.png";
import {
  FaBell,
  FaCheckCircle,
  FaChalkboardTeacher,
  FaChevronRight,
  FaClipboardList,
  FaHome,
  FaSignOutAlt,
  FaTimesCircle,
  FaUser,
  FaBuilding,
  FaCalendarAlt,
  FaUsers,
} from "react-icons/fa";

const navigationSections = [
  { label: "Overview", items: [{ name: "Dashboard", path: "/approver/dashboard", icon: FaHome }] },
  {
    label: "Clearance",
    items: [
      { name: "Pending Requests", path: "/approver/pending", icon: FaClipboardList },
      { name: "Approved Requests", path: "/approver/approved", icon: FaCheckCircle },
      { name: "Rejected Requests", path: "/approver/rejected", icon: FaTimesCircle },
    ],
  },
  { label: "Responsibilities", items: [{ name: "Adviser", path: "/approver/adviser", icon: FaChalkboardTeacher }] },
  {
    label: "Account",
    items: [
      { name: "Notifications", path: "/approver/notifications", icon: FaBell },
      { name: "Profile", path: "/approver/profile", icon: FaUser },
    ],
  },
];

const officeNavigation = {
  label: "Assigned Office",
  items: [
    { name: "Office Dashboard", path: "/office/dashboard", icon: FaBuilding },
    { name: "Schedule & Batches", path: "/office/schedule", icon: FaCalendarAlt },
    { name: "Student Queue", path: "/office/students", icon: FaUsers },
    { name: "Office Requirements", path: "/office/requirements", icon: FaClipboardList },
    { name: "Reviewed Students", path: "/office/reviewed", icon: FaCheckCircle },
  ],
};

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasAssignedOffice, setHasAssignedOffice] = useState(false);
  const [checkingOffice, setCheckingOffice] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkOfficeAssignment() {
      try {
        const context = await getOfficeStaffContext();
        if (active) setHasAssignedOffice((context?.officeIds || []).length > 0);
      } catch (error) {
        console.error("Faculty office navigation check failed:", error);
        if (active) setHasAssignedOffice(false);
      } finally {
        if (active) setCheckingOffice(false);
      }
    }

    checkOfficeAssignment();
    return () => { active = false; };
  }, []);

  const sections = hasAssignedOffice
    ? [navigationSections[0], navigationSections[1], navigationSections[2], officeNavigation, navigationSections[3]]
    : navigationSections;

  const handleLogout = async () => {
    if (loggingOut) return;
    const result = await Swal.fire({
      icon: "question",
      title: "Log Out?",
      text: "Are you sure you want to end your session?",
      showCancelButton: true,
      confirmButtonText: "Log Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      setLoggingOut(true);
      await logoutUser();
      await Swal.fire({
        icon: "success",
        title: "Logged Out",
        text: "You have been signed out successfully.",
        timer: 1200,
        showConfirmButton: false,
      });
      navigate("/login", { replace: true });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text: error?.message || "Unable to log out. Please try again.",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-72 flex-col overflow-hidden border-r border-white/10 bg-[#081327] text-white shadow-2xl lg:h-screen">
      {/* Branding */}
      <div className="relative shrink-0 overflow-hidden border-b border-white/[0.08] px-5 py-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner">
            <img src={smartClearLogo} alt="SmartClear AI logo" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight">SmartClear AI</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Faculty Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation: NavLink keeps navigation inside React Router (no hard reload). */}
      <nav aria-label="Faculty navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.17em] text-slate-500">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end
                        aria-current={isCurrent ? "page" : undefined}
                        className={({ isActive }) => [
                          "group relative flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-400",
                          isActive
                            ? "border-cyan-400/20 bg-gradient-to-r from-cyan-500/20 to-blue-500/10 font-bold text-white shadow-sm"
                            : "border-transparent font-medium text-slate-300 hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white",
                        ].join(" ")}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-cyan-400" />}
                            <span className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                              isActive ? "bg-cyan-400/15 text-cyan-300" : "bg-white/[0.04] text-slate-400 group-hover:text-cyan-300",
                            ].join(" ")}>
                              <Icon aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            <FaChevronRight aria-hidden="true" className={[
                              "shrink-0 text-[10px] transition-all duration-200",
                              isActive ? "text-cyan-300" : "-translate-x-1 text-slate-500 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                            ].join(" ")} />
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {checkingOffice && (
            <p className="px-3 text-xs text-slate-500" role="status">Checking office assignment...</p>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.07] px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
            <FaChalkboardTeacher />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#081327] bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-200">Faculty Approver</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">Clearance Management</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] group-hover:bg-rose-500/10">
            <FaSignOutAlt />
          </span>
          <span className="flex-1 text-left">{loggingOut ? "Signing out..." : "Log Out"}</span>
          <FaChevronRight className="text-[10px] opacity-0 transition group-hover:opacity-100" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
