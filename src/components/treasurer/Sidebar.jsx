import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";

import { logoutUser } from "../../services/authService";
import smartClearLogo from "../../assets/smartclear-logo.png";

import {
  FaBell,
  FaGraduationCap,
  FaHome,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/treasurer/dashboard",
      icon: <FaHome />,
    },
    {
      name: "Ready for Enrollment",
      path: "/treasurer/ready-for-enrollment",
      icon: <FaGraduationCap />,
    },
    {
      name: "Notifications",
      path: "/treasurer/notifications",
      icon: <FaBell />,
    },
    {
      name: "Profile",
      path: "/treasurer/profile",
      icon: <FaUser />,
    },
  ];

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Log Out?",
      text: "Are you sure you want to end your Treasurer session?",
      showCancelButton: true,
      confirmButtonText: "Log Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await logoutUser();

      await Swal.fire({
        icon: "success",
        title: "Logged Out",
        text: "You have been signed out successfully.",
        timer: 1200,
        showConfirmButton: false,
      });

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text:
          error?.message ||
          "Unable to log out. Please try again.",
      });
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden bg-blue-900 text-white shadow-2xl">
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
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              SmartClear AI
            </h1>

            <p className="mt-0.5 truncate text-sm text-blue-200">
              Treasurer Portal
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
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                    isActive
                      ? "bg-white font-semibold text-blue-900 shadow-md"
                      : "text-blue-50 hover:bg-blue-800"
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
          className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-red-600"
        >
          <FaSignOutAlt className="shrink-0" />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;