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
  FaRobot,
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
      name: "AI Assistant",
      path: "/student/assistant",
      icon: <FaRobot />,
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
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-blue-900 text-white shadow-2xl">
      {/* Brand */}

      <div className="shrink-0 border-b border-blue-800 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            <img
              src={smartClearLogo}
              alt="SmartClear AI logo"
              className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(34,211,238,0.28)]"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
              SmartClear AI
            </h1>

            <p className="mt-0.5 truncate text-sm text-blue-200">
              Student Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                    isActive
                      ? "bg-white font-semibold text-blue-900 shadow-md"
                      : "hover:bg-blue-800"
                  }`
                }
              >
                <span className="shrink-0 text-xl">
                  {item.icon}
                </span>

                <span className="min-w-0 truncate">
                  {item.name}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}

      <div className="shrink-0 border-t border-blue-800 bg-blue-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaSignOutAlt className="shrink-0" />

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
