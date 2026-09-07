import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import {
  FaBell,
  FaChevronDown,
  FaEnvelope,
  FaIdCard,
  FaSearch,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";

import {
  supabase,
} from "../../services/supabase";

function Topbar() {
  const navigate =
    useNavigate();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    authUser,
    setAuthUser,
  ] = useState(null);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showProfileMenu,
    setShowProfileMenu,
  ] = useState(false);

  const loadUnreadCount =
    useCallback(
      async (
        userId
      ) => {
        if (!userId) {
          setUnreadCount(
            0
          );
          return;
        }

        const {
          count,
          error,
        } = await supabase
          .from(
            "notifications"
          )
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "is_read",
            false
          );

        if (error) {
          console.error(
            "Topbar notification count error:",
            error
          );
          return;
        }

        setUnreadCount(
          count || 0
        );
      },
      []
    );

  const loadProfile =
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

          if (
            authError
          ) {
            throw authError;
          }

          if (!user) {
            setAuthUser(
              null
            );
            setProfile(
              null
            );
            setUnreadCount(
              0
            );
            return;
          }

          setAuthUser(
            user
          );

          const {
            data:
              profileData,
            error:
              profileError,
          } = await supabase
            .from("users")
            .select(`
              id,
              auth_id,
              student_id,
              employee_id,
              full_name,
              email,
              role,
              status,
              course,
              year_level,
              section
            `)
            .eq(
              "auth_id",
              user.id
            )
            .maybeSingle();

          if (
            profileError
          ) {
            throw profileError;
          }

          const fallbackProfile = {
            id: null,
            auth_id:
              user.id,
            student_id:
              null,
            employee_id:
              null,
            full_name:
              user.user_metadata
                ?.full_name ||
              user.email
                ?.split("@")[0] ||
              "Student",
            email:
              user.email || "",
            role:
              user.user_metadata
                ?.role ||
              "Student",
            status:
              "Active",
            course: "",
            year_level:
              "",
            section: "",
          };

          const resolvedProfile =
            profileData ||
            fallbackProfile;

          setProfile(
            resolvedProfile
          );

          await loadUnreadCount(
            resolvedProfile.id
          );
        } catch (error) {
          console.error(
            "Topbar profile error:",
            error
          );

          await Swal.fire({
            icon: "error",
            title:
              "Unable to Load Profile",
            text:
              error?.message ||
              "The logged-in profile could not be loaded.",
            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        loadUnreadCount,
      ]
    );

  useEffect(() => {
    loadProfile();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (
            event ===
            "SIGNED_OUT"
          ) {
            setAuthUser(
              null
            );
            setProfile(
              null
            );
            setUnreadCount(
              0
            );
            navigate(
              "/login",
              {
                replace:
                  true,
              }
            );
            return;
          }

          if (
            session?.user
          ) {
            loadProfile();
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    loadProfile,
    navigate,
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
          `student-topbar-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "notifications",
            filter:
              `user_id=eq.${profile.id}`,
          },
          () => {
            loadUnreadCount(
              profile.id
            );
          }
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
          (
            payload
          ) => {
            setProfile(
              (
                previous
              ) => ({
                ...previous,
                ...payload.new,
              })
            );
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
    loadUnreadCount,
  ]);

  const displayName =
    profile?.full_name ||
    authUser
      ?.user_metadata
      ?.full_name ||
    authUser?.email
      ?.split("@")[0] ||
    "Student";

  const firstName =
    displayName
      .trim()
      .split(/\s+/)[0] ||
    "Student";

  const initials =
    useMemo(() => {
      const words =
        displayName
          .trim()
          .split(/\s+/)
          .filter(
            Boolean
          );

      if (
        words.length ===
        0
      ) {
        return "ST";
      }

      if (
        words.length ===
        1
      ) {
        return words[0]
          .slice(0, 2)
          .toUpperCase();
      }

      return `${words[0][0]}${
        words[
          words.length -
            1
        ][0]
      }`.toUpperCase();
    }, [
      displayName,
    ]);

  const formattedDate =
    new Intl.DateTimeFormat(
      "en-PH",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ).format(
      new Date()
    );

  const handleLogout =
    async () => {
      const result =
        await Swal.fire({
          icon: "question",
          title: "Logout?",
          text:
            "Your current SmartClear session will be closed.",
          showCancelButton:
            true,
          confirmButtonText:
            "Logout",
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
        setLoggingOut(
          true
        );

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
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Topbar logout error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Logout Failed",
          text:
            error?.message ||
            "Unable to end your session.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setLoggingOut(
          false
        );
      }
    };

  const handleSearch =
    (
      event
    ) => {
      event.preventDefault();

      const keyword =
        search.trim();

      if (!keyword) {
        return;
      }

      navigate(
        `/student/clearance-status?search=${encodeURIComponent(
          keyword
        )}`
      );
    };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Welcome */}

        <div className="min-w-0">
          {loading ? (
            <div className="space-y-2">
              <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />

              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <h2 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                Welcome back,{" "}
                {firstName}{" "}
                <span
                  aria-hidden="true"
                >
                  👋
                </span>
              </h2>

              <p className="mt-0.5 hidden text-xs font-medium text-slate-500 sm:block">
                {
                  formattedDate
                }
              </p>
            </>
          )}
        </div>

        {/* Right controls */}

        <div className="flex items-center gap-2 sm:gap-3">
          <form
            onSubmit={
              handleSearch
            }
            className="relative hidden lg:block"
          >
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search clearance..."
              className="h-11 w-60 rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 xl:w-72"
            />
          </form>

          {/* Notifications */}

          <motion.button
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.96,
            }}
            type="button"
            onClick={() =>
              navigate(
                "/student/notifications"
              )
            }
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
            aria-label="Open notifications"
          >
            <FaBell />

            {unreadCount >
              0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[9px] font-black text-white">
                {unreadCount >
                99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </motion.button>

          {/* Profile */}

          <div className="relative">
            <motion.button
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              type="button"
              onClick={() =>
                setShowProfileMenu(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-2.5 pr-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-indigo-600 text-xs font-black text-white shadow-sm">
                {
                  initials
                }

                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              <div className="hidden min-w-0 md:block">
                <p className="max-w-36 truncate text-sm font-black text-slate-800">
                  {
                    displayName
                  }
                </p>

                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
                  {profile?.role ||
                    "Student"}
                </p>
              </div>

              <motion.span
                animate={{
                  rotate:
                    showProfileMenu
                      ? 180
                      : 0,
                }}
                className="hidden text-[10px] text-slate-400 md:block"
              >
                <FaChevronDown />
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
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
                  className="absolute right-0 top-[calc(100%+0.65rem)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.16)]"
                >
                  <div className="bg-[#061b51] p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-cyan-300">
                        {
                          initials
                        }
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {
                            displayName
                          }
                        </p>

                        <p className="mt-0.5 truncate text-xs text-blue-100/65">
                          {profile?.email ||
                            authUser?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(
                          false
                        );
                        navigate(
                          "/student/profile"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FaUser />
                      View Profile
                    </button>

                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FaIdCard className="text-blue-700" />

                        <span className="truncate">
                          {profile?.student_id ||
                            "No student ID"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <FaEnvelope className="text-blue-700" />

                        <span className="truncate">
                          {profile?.email ||
                            authUser?.email ||
                            "No email"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      disabled={
                        loggingOut
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <FaSignOutAlt />

                      {loggingOut
                        ? "Logging out..."
                        : "Logout"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Separate logout button */}

          <motion.button
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.96,
            }}
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
            className="hidden h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 sm:flex"
            aria-label="Logout"
          >
            <FaSignOutAlt />
          </motion.button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;