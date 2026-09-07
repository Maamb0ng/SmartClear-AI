import { useState } from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";

import {
  FaBell,
  FaClipboardCheck,
  FaHome,
  FaSignOutAlt,
  FaTasks,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";
import smartClearLogo from "../../assets/smartclear-logo.png";

function Sidebar() {
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      path: "/student/dashboard",
      icon: <FaHome />,
    },
    {
      name: "Request Clearance",
      path: "/student/request-clearance",
      icon: <FaClipboardCheck />,
    },
    {
      name: "Clearance Status",
      path: "/student/clearance-status",
      icon: <FaTasks />,
    },
    {
      name: "Notifications",
      path: "/student/notifications",
      icon: <FaBell />,
    },
    {
      name: "Profile",
      path: "/student/profile",
      icon: <FaUser />,
    },
  ];

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Log Out?",
      text:
        "Your current SmartClear session will be closed.",
      showCancelButton: true,
      confirmButtonText: "Log Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Student logout error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text:
          error?.message ||
          "Unable to end your session.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-gradient-to-b from-[#173c91] via-[#173b8b] to-[#102e72] text-white shadow-2xl">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

      {/* Brand */}

      <div className="relative z-10 shrink-0 border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.15)] sm:h-16 sm:w-16">
            <img
              src={smartClearLogo}
              alt="SmartClear AI logo"
              className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(34,211,238,0.3)]"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[1.65rem] font-black tracking-tight sm:text-[1.8rem]">
              SmartClear
            </h1>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_0_4px_rgba(103,232,249,0.12)]" />

              <p className="truncate text-xs font-semibold text-blue-100/70">
                Student Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}

      <nav className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/40">
          Navigation
        </p>

        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({
                  isActive,
                }) =>
                  `group relative flex min-h-[52px] items-center gap-4 overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-blue-900 shadow-[0_12px_30px_rgba(4,20,60,0.2)]"
                      : "text-blue-50/90 hover:bg-white/[0.08] hover:text-white"
                  }`
                }
              >
                {({
                  isActive,
                }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
                    )}

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "bg-white/[0.06] text-blue-100 group-hover:bg-white/[0.1]"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span className="min-w-0 flex-1 truncate">
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Status */}

      <div className="relative z-10 px-4 pb-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>

            <p className="text-[11px] font-black text-blue-50">
              SmartClear Online
            </p>
          </div>

          <p className="mt-1.5 text-[10px] leading-4 text-blue-100/45">
            Your student portal is connected and ready.
          </p>
        </div>
      </div>

      {/* Logout */}

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/[0.05] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex min-h-12 w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-sm font-semibold text-blue-50 transition-all hover:bg-rose-500/15 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm transition group-hover:bg-rose-500/20 group-hover:text-rose-200">
            <FaSignOutAlt />
          </span>

          <span>
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;