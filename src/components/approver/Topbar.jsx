import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
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
  FaIdBadge,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaUser,
  FaUserCircle,
} from "react-icons/fa";

import {
  supabase,
} from "../../services/supabase";

function Topbar() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const profileMenuRef =
    useRef(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    authUser,
    setAuthUser,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    showProfileMenu,
    setShowProfileMenu,
  ] = useState(false);

  const loadUnreadCount =
    useCallback(
      async (
        profileId
      ) => {
        if (
          !profileId
        ) {
          setUnreadCount(
            0
          );
          return;
        }

        try {
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
                count:
                  "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              profileId
            )
            .eq(
              "is_read",
              false
            );

          if (
            error
          ) {
            throw error;
          }

          setUnreadCount(
            count || 0
          );
        } catch (
          error
        ) {
          console.error(
            "Approver notification count error:",
            error
          );
        }
      },
      []
    );

  const loadProfile =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

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

          if (
            !user
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
              full_name,
              email,
              employee_id,
              role,
              status,
              department,
              office
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
            full_name:
              user
                .user_metadata
                ?.full_name ||
              user.email
                ?.split(
                  "@"
                )[0] ||
              "Approver",
            email:
              user.email ||
              "",
            employee_id:
              null,
            role:
              user
                .user_metadata
                ?.role ||
              "Approver",
            status:
              "Active",
            department:
              "",
            office:
              "",
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
        } catch (
          error
        ) {
          console.error(
            "Approver topbar profile error:",
            error
          );

          await Swal.fire({
            icon:
              "error",
            title:
              "Unable to Load Profile",
            text:
              error?.message ||
              "The logged-in approver profile could not be loaded.",
            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        loadUnreadCount,
        navigate,
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
          `approver-topbar-${profile.id}`
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
                current
              ) => ({
                ...current,
                ...payload.new,
              })
            );
          }
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

  useEffect(() => {
    const handleOutsideClick =
      (
        event
      ) => {
        if (
          profileMenuRef.current &&
          !profileMenuRef.current.contains(
            event.target
          )
        ) {
          setShowProfileMenu(
            false
          );
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
    const params =
      new URLSearchParams(
        location.search
      );

    setSearch(
      params.get(
        "search"
      ) || ""
    );
  }, [
    location.search,
  ]);

  const displayName =
    profile?.full_name ||
    authUser
      ?.user_metadata
      ?.full_name ||
    authUser?.email
      ?.split(
        "@"
      )[0] ||
    "Approver";

  const displayRole =
    profile?.role ||
    "Approver";

  const displayAssignment =
    profile?.office ||
    profile?.department ||
    "Assigned Approver";

  const initials =
    useMemo(() => {
      const words =
        displayName
          .trim()
          .split(
            /\s+/
          )
          .filter(
            Boolean
          );

      if (
        words.length ===
        0
      ) {
        return "AP";
      }

      if (
        words.length ===
        1
      ) {
        return words[0]
          .slice(
            0,
            2
          )
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

  const handleSearch =
    (
      event
    ) => {
      event.preventDefault();

      const keyword =
        search.trim();

      const searchUrl =
        keyword
          ? `/approver/dashboard?search=${encodeURIComponent(
              keyword
            )}`
          : "/approver/dashboard";

      navigate(
        searchUrl
      );

      window.dispatchEvent(
        new CustomEvent(
          "approver-dashboard-search",
          {
            detail:
              keyword,
          }
        )
      );
    };

  const handleLogout =
    async () => {
      const result =
        await Swal.fire({
          icon:
            "question",
          title:
            "Logout?",
          text:
            "Your current SmartClear approver session will be closed.",
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

        if (
          error
        ) {
          throw error;
        }

        navigate(
          "/login",
          {
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        console.error(
          "Approver logout error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
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

  return (
    <motion.header
      initial={{
        opacity: 0,
        y: -18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      className="fixed left-0 right-0 top-0 z-40 h-20 border-b border-slate-200/80 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:left-72"
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Search */}

        <form
          onSubmit={
            handleSearch
          }
          className="relative min-w-0 flex-1 max-w-xl"
        >
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

          <input
            type="search"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Search students, classes, subjects, or offices..."
            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50/70 pl-11 pr-14 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          <motion.button
            whileHover={{
              scale: 1.04,
            }}
            whileTap={{
              scale: 0.96,
            }}
            type="submit"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-[#071b4b] text-xs text-cyan-300 shadow-sm transition hover:bg-[#082a70]"
            aria-label="Search approver dashboard"
          >
            <FaSearch />
          </motion.button>
        </form>

        {/* Right controls */}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <motion.button
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.96,
            }}
            type="button"
            onClick={() =>
              loadProfile(
                true
              )
            }
            disabled={
              refreshing
            }
            className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
            aria-label="Refresh approver profile"
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
          </motion.button>

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
                "/approver/notifications"
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

          <div
            ref={
              profileMenuRef
            }
            className="relative"
          >
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
              className="group flex h-13 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 pr-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              {loading ? (
                <>
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />

                  <div className="hidden space-y-1.5 md:block">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />

                    <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-600 text-xs font-black text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]">
                    {
                      initials
                    }

                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>

                  <div className="hidden min-w-0 text-left md:block">
                    <p className="max-w-40 truncate text-sm font-black text-slate-800">
                      {
                        displayName
                      }
                    </p>

                    <p className="mt-0.5 max-w-40 truncate text-[10px] font-semibold text-slate-500">
                      {
                        displayAssignment
                      }
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
                </>
              )}
            </motion.button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -10,
                    scale:
                      0.97,
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
                      0.97,
                  }}
                  transition={{
                    duration:
                      0.18,
                  }}
                  className="absolute right-0 top-[calc(100%+0.7rem)] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_65px_rgba(15,23,42,0.18)]"
                >
                  <div className="relative overflow-hidden bg-[#061b51] p-5 text-white">
                    <motion.div
                      animate={{
                        x: [
                          0,
                          18,
                          0,
                        ],
                        y: [
                          0,
                          -10,
                          0,
                        ],
                      }}
                      transition={{
                        duration: 8,
                        repeat:
                          Infinity,
                        ease:
                          "easeInOut",
                      }}
                      className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl"
                    />

                    <div className="relative z-10 flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-cyan-300">
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
                            authUser?.email ||
                            "No email"}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                      <FaShieldAlt />
                      {
                        displayRole
                      }
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
                          "/approver/profile"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FaUser />
                      View Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(
                          false
                        );

                        navigate(
                          "/approver/notifications"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FaBell />
                      Notifications

                      {unreadCount >
                        0 && (
                        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">
                          {
                            unreadCount
                          }
                        </span>
                      )}
                    </button>

                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FaIdBadge className="text-blue-700" />

                        <span className="truncate">
                          {profile?.employee_id ||
                            "No employee ID"}
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
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
      </div>
    </motion.header>
  );
}

export default Topbar;