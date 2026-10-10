import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  const [hasAssignedOffice, setHasAssignedOffice] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkOfficeAssignment() {
      try {
        const context = await getOfficeStaffContext();
        if (active) setHasAssignedOffice((context?.officeIds || []).length > 0);
      } catch (error) {
        console.error("Faculty office navigation check failed:", error);
        if (active) setHasAssignedOffice(false);
      }
    }
    checkOfficeAssignment();
    return () => { active = false; };
  }, []);

  const sections = hasAssignedOffice
    ? [navigationSections[0], navigationSections[1], navigationSections[2], officeNavigation, navigationSections[3]]
    : navigationSections;

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question", title: "Log Out?", text: "Are you sure you want to end your session?",
      showCancelButton: true, confirmButtonText: "Log Out", cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626", reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await logoutUser();
      await Swal.fire({ icon: "success", title: "Logged Out", text: "You have been signed out successfully.", timer: 1200, showConfirmButton: false });
      navigate("/login", { replace: true });
    } catch (error) {
      Swal.fire({ icon: "error", title: "Logout Failed", text: error?.message || "Unable to log out. Please try again." });
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-white shadow-2xl">
      {/* BRAND */}
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 blur-xl" />
            <img src={smartClearLogo} alt="SmartClear AI logo" className="relative h-10 w-10 object-contain drop-shadow-[0_6px_12px_rgba(34,211,238,0.25)]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-white">SmartClear AI</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Faculty Portal</p>
            </div>
          </div>
        </div>
      </div>
      {/* NAVIGATION */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{section.label}</p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <NavLink to={item.path} className={({ isActive }) => [
                        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                        isActive ? "bg-white font-bold text-slate-950 shadow-lg shadow-black/10" : "font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white",
                      ].join(" ")}>
                        {({ isActive }) => (
                          <>
                            <span className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-all duration-200",
                              isActive ? "bg-cyan-50 text-cyan-600" : "bg-white/[0.05] text-slate-400 group-hover:bg-white/10 group-hover:text-cyan-300",
                            ].join(" ")}><Icon /></span>
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            <FaChevronRight className={[
                              "shrink-0 text-[9px] transition-all duration-200",
                              isActive ? "translate-x-0 text-slate-400 opacity-100" : "-translate-x-1 text-slate-600 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                            ].join(" ")} />
                            {isActive && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-cyan-500" />}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      {/* PORTAL STATUS */}
      <div className="shrink-0 px-3 pb-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
              <FaChalkboardTeacher />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-200">Faculty Approver</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">Clearance Management</p>
            </div>
          </div>
        </div>
      </div>
      {/* LOGOUT */}
      <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={handleLogout} className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-400 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-300">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] transition group-hover:bg-rose-500/10"><FaSignOutAlt /></span>
          <span className="flex-1 text-left">Log Out</span>
          <FaChevronRight className="-translate-x-1 text-[9px] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </button>
      </div>
    </aside>
  );
}
export default Sidebar;
