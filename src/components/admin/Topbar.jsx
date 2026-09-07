import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";

import {
  FaBell,
  FaChevronDown,
  FaIdBadge,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";

import {
  supabase,
} from "../../services/supabase";

function Topbar() {
  const navigate =
    useNavigate();

  const menuRef =
    useRef(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadUnreadCount =
    useCallback(
      async () => {
        try {
          const {
            count,
            error,
          } = await supabase
            .from("notifications")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "is_read",
              false
            );

          if (error) {
            throw error;
          }

          setUnreadCount(
            count || 0
          );
        } catch (error) {
          console.warn(
            "Unable to load admin notification count:",
            error
          );

          setUnreadCount(0);
        }
      },
      []
    );

  const loadAdmin =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const {
            data: {
              user,
            },
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!user) {
            navigate(
              "/login",
              {
                replace:
                  true,
              }
            );

            return;
          }

          const {
            data,
            error,
          } = await supabase
            .from("users")
            .select(`
              id,
              auth_id,
              full_name,
              email,
              employee_id,
              role,
              status
            `)
            .eq(
              "auth_id",
              user.id
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          setProfile(
            data || {
              id: null,
              full_name:
                user.user_metadata
                  ?.full_name ||
                user.email
                  ?.split("@")[0] ||
                "Administrator",
              email:
                user.email ||
                "",
              employee_id:
                null,
              role:
                "Administrator",
              status:
                "Active",
            }
          );

          await loadUnreadCount();
        } catch (error) {
          console.error(
            "Admin topbar load error:",
            error
          );
        } finally {
          setLoading(false);
        }
      },
      [
        loadUnreadCount,
        navigate,
      ]
    );

  useEffect(() => {
    loadAdmin();
  }, [
    loadAdmin,
  ]);

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "admin-topbar-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "notifications",
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    loadUnreadCount,
  ]);

  useEffect(() => {
    if (
      !profile?.id
    ) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `admin-topbar-profile-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
            table:
              "users",
            filter:
              `id=eq.${profile.id}`,
          },
          () => {
            loadAdmin();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile?.id,
    loadAdmin,
  ]);

  const initials =
    useMemo(() => {
      const name =
        profile?.full_name ||
        "Administrator";

      const words =
        name
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      if (
        words.length === 0
      ) {
        return "AD";
      }

      if (
        words.length === 1
      ) {
        return words[0]
          .slice(0, 2)
          .toUpperCase();
      }

      return `${words[0][0]}${
        words[
          words.length - 1
        ][0]
      }`.toUpperCase();
    }, [
      profile?.full_name,
    ]);

  const currentDate =
    new Date().toLocaleDateString(
      "en-PH",
      {
        weekday:
          "long",
        month:
          "long",
        day:
          "numeric",
        year:
          "numeric",
      }
    );

  const handleLogout =
    async () => {
      const result =
        await Swal.fire({
          icon:
            "question",
          title:
            "Log out of SmartClear AI?",
          text:
            "Your administrator session will be closed.",
          showCancelButton:
            true,
          confirmButtonText:
            "Log Out",
          cancelButtonText:
            "Cancel",
          confirmButtonColor:
            "#dc2626",
        });

      if (
        !result.isConfirmed
      ) {
        return;
      }

      try {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        navigate(
          "/login",
          {
            replace:
              true,
          }
        );
      } catch (error) {
        console.error(
          "Admin logout error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title:
            "Unable to Log Out",
          text:
            error?.message ||
            "Please try again.",
        });
      }
    };

  return (
    <header className="relative z-40 border-b border-slate-200/80 bg-white/95 px-5 py-3 shadow-sm backdrop-blur xl:px-7">
      <div className="flex min-h-14 items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-slate-900 xl:text-2xl">
            Welcome back,{" "}
            {loading
              ? "Administrator"
              : profile?.full_name ||
                "Administrator"}
          </h1>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {currentDate}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <motion.button
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale:
                0.96,
            }}
            type="button"
            onClick={() =>
              navigate(
                "/admin/notifications"
              )
            }
            aria-label="Open administrator notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <FaBell />

            {unreadCount >
              0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-black text-white">
                {unreadCount >
                99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </motion.button>

          <div
            ref={
              menuRef
            }
            className="relative"
          >
            <motion.button
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale:
                  0.98,
              }}
              type="button"
              onClick={() =>
                setMenuOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
              aria-expanded={
                menuOpen
              }
              aria-label="Open administrator account menu"
              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-sm font-black text-cyan-200">
                {
                  initials
                }
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-44 truncate text-sm font-black text-slate-900">
                  {profile?.full_name ||
                    "Administrator"}
                </p>

                <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Administrator
                </p>
              </div>

              <FaChevronDown
                className={`hidden text-xs text-slate-400 transition sm:block ${
                  menuOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                    scale:
                      0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                    scale:
                      0.98,
                  }}
                  transition={{
                    duration:
                      0.18,
                  }}
                  className="absolute right-0 top-[calc(100%+0.65rem)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.18)]"
                >
                  <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] font-black text-cyan-200">
                        {
                          initials
                        }
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                          {profile?.full_name ||
                            "Administrator"}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {profile?.email ||
                            ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(
                          false
                        );

                        navigate(
                          "/admin/profile"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <FaUser />
                      </span>

                      <span className="min-w-0">
                        <span className="block">
                          My Profile
                        </span>

                        <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400">
                          View and update account
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(
                          false
                        );

                        navigate(
                          "/admin/notifications"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <FaBell />

                        {unreadCount >
                          0 && (
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-600" />
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="block">
                          Notifications
                        </span>

                        <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400">
                          {unreadCount} unread update
                          {unreadCount ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                        <FaSignOutAlt />
                      </span>

                      <span className="min-w-0">
                        <span className="block">
                          Log Out
                        </span>

                        <span className="mt-0.5 block truncate text-[10px] font-medium text-red-400">
                          Close administrator session
                        </span>
                      </span>
                    </button>
                  </div>

                  {profile?.employee_id && (
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-[10px] font-bold text-slate-500">
                      <FaIdBadge />
                      Employee ID:{" "}
                      {profile.employee_id}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;