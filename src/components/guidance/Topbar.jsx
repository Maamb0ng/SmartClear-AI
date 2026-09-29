import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import {
  FaBell,
  FaChevronDown,
  FaSignOutAlt,
  FaUserCircle,
  FaHandsHelping,
  FaMoon,
  FaSun,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";

function Topbar() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(
      "smartclear-guidance-theme"
    );

    if (savedTheme) {
      return savedTheme === "dark";
    }

    return false;
  });

  // =========================================================
  // DARK MODE
  // =========================================================

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");

      localStorage.setItem(
        "smartclear-guidance-theme",
        "dark"
      );
    } else {
      root.classList.remove("dark");

      localStorage.setItem(
        "smartclear-guidance-theme",
        "light"
      );
    }
  }, [darkMode]);

  // =========================================================
  // LOAD USER + NOTIFICATIONS
  // =========================================================

  useEffect(() => {
    loadTopbarData();
  }, []);

  const loadTopbarData = async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        return;
      }

      const {
        data: userProfile,
        error: profileError,
      } = await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          full_name,
          employee_id,
          email,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(userProfile);

      const {
        count,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userProfile.id)
        .eq("is_read", false);

      if (notificationError) {
        console.warn(
          "Unable to load unread notifications:",
          notificationError
        );

        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error(
        "Guidance topbar error:",
        error
      );
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    setShowProfileMenu(false);

    const result = await Swal.fire({
      icon: "question",
      title: "Log out?",
      text: "Are you sure you want to log out of the Guidance Portal?",
      showCancelButton: true,
      confirmButtonText: "Log Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      background: darkMode
        ? "#0f172a"
        : "#ffffff",
      color: darkMode
        ? "#f8fafc"
        : "#0f172a",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
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
        "Guidance logout error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text:
          error?.message ||
          "Unable to log out. Please try again.",
        background: darkMode
          ? "#0f172a"
          : "#ffffff",
        color: darkMode
          ? "#f8fafc"
          : "#0f172a",
      });
    }
  };

  // =========================================================
  // INITIALS
  // =========================================================

  const getInitials = () => {
    const name =
      profile?.full_name?.trim();

    if (!name) {
      return "GC";
    }

    const parts = name
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${
      parts[parts.length - 1][0]
    }`.toUpperCase();
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <header className="relative z-40 border-b border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* LEFT */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 sm:flex">
              <FaHandsHelping />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 transition-colors dark:text-white sm:text-lg">
                Guidance Office
              </h2>

              <div className="mt-0.5 hidden items-center gap-2 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Clearance Management Workspace
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          {/* THEME */}
          <button
            type="button"
            onClick={() =>
              setDarkMode(
                (current) => !current
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-yellow-400"
            aria-label={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              darkMode
                ? "Light Mode"
                : "Dark Mode"
            }
          >
            {darkMode ? (
              <FaSun className="text-sm" />
            ) : (
              <FaMoon className="text-sm" />
            )}
          </button>

          {/* NOTIFICATIONS */}
          <button
            type="button"
            onClick={() =>
              navigate(
                "/guidance/notifications"
              )
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            aria-label="Notifications"
          >
            <FaBell className="text-sm" />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          <div className="mx-1 hidden h-7 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

          {/* PROFILE */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowProfileMenu(
                  (current) => !current
                )
              }
              className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-900 sm:px-2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm dark:bg-blue-600">
                {getInitials()}
              </div>

              <div className="hidden max-w-[170px] text-left md:block">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                  {profile?.full_name ||
                    "Guidance Counselor"}
                </p>

                <p className="truncate text-[10px] text-slate-500 dark:text-slate-500">
                  {profile?.employee_id ||
                    "Guidance Office"}
                </p>
              </div>

              <FaChevronDown
                className={`hidden text-[10px] text-slate-400 transition-transform duration-200 sm:block ${
                  showProfileMenu
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() =>
                    setShowProfileMenu(false)
                  }
                />

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
                  {/* PROFILE HEADER */}
                  <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                        {getInitials()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {profile?.full_name ||
                            "Guidance Counselor"}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {profile?.email ||
                            "Guidance Office"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                        Guidance Personnel
                      </div>

                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* MENU */}
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(
                          false
                        );

                        navigate(
                          "/guidance/profile"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <FaUserCircle />
                      </div>

                      My Profile
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                        <FaSignOutAlt />
                      </div>

                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;