import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaEnvelope,
  FaEnvelopeOpen,
  FaEye,
  FaFilter,
  FaRedo,
  FaSearch,
  FaSpinner,
} from "react-icons/fa";

import GuidanceLayout from "../../layouts/GuidanceLayout";
import { supabase } from "../../services/supabase";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getNotificationTitle = (notification) =>
  notification?.title ||
  notification?.subject ||
  "SmartClear Notification";

const getNotificationMessage = (notification) =>
  notification?.message ||
  notification?.body ||
  notification?.description ||
  "You have a new SmartClear notification.";

const getNotificationStepId = (notification) =>
  notification?.clearance_step_id ||
  notification?.step_id ||
  notification?.reference_id ||
  null;

function Notifications() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [profile, setProfile] =
    useState(null);

  const [notifications, setNotifications] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("All");

  const [processingId, setProcessingId] =
    useState(null);

  const [markingAll, setMarkingAll] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        /*
        |--------------------------------------------------------------------------
        | AUTH USER
        |--------------------------------------------------------------------------
        */

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const authUser = authData?.user;

        if (!authUser) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | PUBLIC USER PROFILE
        |--------------------------------------------------------------------------
        */

        const {
          data: userProfile,
          error: profileError,
        } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!userProfile) {
          throw new Error(
            "Guidance account profile was not found."
          );
        }

        if (
          normalizeValue(userProfile.role) !==
          "approver"
        ) {
          throw new Error(
            "This account is not authorized to access the Guidance portal."
          );
        }

        if (
          normalizeValue(userProfile.status) !==
          "active"
        ) {
          throw new Error(
            "Your Guidance account is not active."
          );
        }

        setProfile(userProfile);

        /*
        |--------------------------------------------------------------------------
        | NOTIFICATIONS
        |--------------------------------------------------------------------------
        |
        | user_id = public.users.id
        | This keeps notifications private per user.
        |--------------------------------------------------------------------------
        */

        const {
          data: notificationData,
          error: notificationError,
        } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", {
            ascending: false,
          });

        if (notificationError) {
          throw notificationError;
        }

        setNotifications(
          notificationData || []
        );
      } catch (error) {
        console.error(
          "Unable to load Guidance notifications:",
          error
        );

        setNotifications([]);

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Notifications",
          text:
            error?.message ||
            "Something went wrong while loading your notifications.",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length,
    [notifications]
  );

  const readCount =
    notifications.length - unreadCount;

  /*
  |--------------------------------------------------------------------------
  | FILTER NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const filteredNotifications =
    useMemo(() => {
      const query =
        normalizeValue(searchTerm);

      return notifications.filter(
        (notification) => {
          const title =
            normalizeValue(
              getNotificationTitle(
                notification
              )
            );

          const message =
            normalizeValue(
              getNotificationMessage(
                notification
              )
            );

          const type =
            normalizeValue(
              notification.type
            );

          const matchesSearch =
            !query ||
            title.includes(query) ||
            message.includes(query) ||
            type.includes(query);

          let matchesFilter = true;

          if (filter === "Unread") {
            matchesFilter =
              !notification.is_read;
          }

          if (filter === "Read") {
            matchesFilter =
              Boolean(
                notification.is_read
              );
          }

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      notifications,
      searchTerm,
      filter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | MARK ONE AS READ
  |--------------------------------------------------------------------------
  */

  const markAsRead = async (
    notification
  ) => {
    if (
      !notification ||
      notification.is_read
    ) {
      return true;
    }

    try {
      setProcessingId(
        notification.id
      );

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "id",
          notification.id
        )
        .eq(
          "user_id",
          profile.id
        );

      if (error) {
        throw error;
      }

      setNotifications(
        (current) =>
          current.map((item) =>
            item.id ===
            notification.id
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
      );

      return true;
    } catch (error) {
      console.error(
        "Unable to mark notification as read:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Update Notification",
        text:
          error?.message ||
          "The notification could not be marked as read.",
        confirmButtonColor:
          "#2563eb",
      });

      return false;
    } finally {
      setProcessingId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL AS READ
  |--------------------------------------------------------------------------
  */

  const markAllAsRead = async () => {
    if (
      unreadCount === 0 ||
      !profile?.id
    ) {
      return;
    }

    const confirmation =
      await Swal.fire({
        icon: "question",
        title:
          "Mark All as Read?",
        text:
          "All unread Guidance notifications will be marked as read.",
        showCancelButton: true,
        confirmButtonText:
          "Mark All as Read",
        cancelButtonText: "Cancel",
        confirmButtonColor:
          "#2563eb",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setMarkingAll(true);

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", profile.id)
        .eq("is_read", false);

      if (error) {
        throw error;
      }

      setNotifications(
        (current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
          }))
      );

      await Swal.fire({
        icon: "success",
        title: "Notifications Updated",
        text:
          "All notifications have been marked as read.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "Unable to mark all notifications as read:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Update Notifications",
        text:
          error?.message ||
          "Your notifications could not be updated.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setMarkingAll(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN NOTIFICATION
  |--------------------------------------------------------------------------
  */

  const handleOpenNotification =
    async (notification) => {
      const success =
        await markAsRead(notification);

      if (!success) {
        return;
      }

      const stepId =
        getNotificationStepId(
          notification
        );

      /*
      |--------------------------------------------------------------------------
      | EXACT CLEARANCE STEP
      |--------------------------------------------------------------------------
      */

      if (stepId) {
        try {
          const {
            data: step,
            error: stepError,
          } = await supabase
            .from("clearance_steps")
            .select(`
              id,
              approver_id,
              office_id
            `)
            .eq("id", stepId)
            .eq(
              "approver_id",
              profile.id
            )
            .maybeSingle();

          if (stepError) {
            throw stepError;
          }

          if (step) {
            navigate(
              `/guidance/student/${step.id}`
            );

            return;
          }
        } catch (error) {
          console.error(
            "Unable to resolve notification clearance step:",
            error
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | OPTIONAL LINK / ROUTE
      |--------------------------------------------------------------------------
      */

      const route =
        notification.route ||
        notification.path ||
        notification.link ||
        null;

      if (
        route &&
        typeof route === "string" &&
        route.startsWith(
          "/guidance/"
        )
      ) {
        navigate(route);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | DEFAULT
      |--------------------------------------------------------------------------
      */

      await Swal.fire({
        icon: "info",
        title:
          getNotificationTitle(
            notification
          ),
        text:
          getNotificationMessage(
            notification
          ),
        confirmButtonText: "Close",
        confirmButtonColor:
          "#2563eb",
      });
    };

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadNotifications({
      silent: true,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-4xl text-blue-600" />

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Loading notifications...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving your Guidance
              updates.
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  return (
    <GuidanceLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <motion.div
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-50">
                  <FaBell />
                  Guidance Portal
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                  Notifications
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  View updates related
                  to your Guidance
                  clearance workflow.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={
                      markAllAsRead
                    }
                    disabled={
                      markingAll
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingAll ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaCheckDouble />
                    )}

                    Mark All Read
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaRedo
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:px-8">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FaBell />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    Total
                  </p>

                  <p className="text-2xl font-black text-slate-900">
                    {
                      notifications.length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <FaEnvelope />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Unread
                  </p>

                  <p className="text-2xl font-black text-slate-900">
                    {unreadCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FaEnvelopeOpen />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Read
                  </p>

                  <p className="text-2xl font-black text-slate-900">
                    {readCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SEARCH / FILTER */}
        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.08,
            duration: 0.35,
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="relative lg:w-52">
              <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">
                  All Notifications
                </option>

                <option value="Unread">
                  Unread
                </option>

                <option value="Read">
                  Read
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-800">
                {
                  filteredNotifications.length
                }
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-800">
                {
                  notifications.length
                }
              </span>{" "}
              notifications.
            </p>

            {(searchTerm ||
              filter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilter("All");
                }}
                className="text-xs font-bold text-blue-700 transition hover:text-blue-900"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>

        {/* NOTIFICATION LIST */}
        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.14,
            duration: 0.4,
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FaBell />
              </div>

              <div>
                <h2 className="font-black text-slate-900">
                  Recent Notifications
                </h2>

                <p className="text-xs text-slate-500">
                  Latest notifications
                  appear first.
                </p>
              </div>
            </div>
          </div>

          {filteredNotifications.length ===
          0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                {notifications.length ===
                0 ? (
                  <FaBell />
                ) : (
                  <FaSearch />
                )}
              </div>

              <h3 className="mt-4 text-base font-black text-slate-800">
                {notifications.length ===
                0
                  ? "No Notifications Yet"
                  : "No Matching Notifications"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {notifications.length ===
                0
                  ? "New Guidance clearance updates will appear here."
                  : "No notification matches your current search or filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map(
                (
                  notification,
                  index
                ) => {
                  const isUnread =
                    !notification.is_read;

                  const isProcessing =
                    processingId ===
                    notification.id;

                  return (
                    <motion.div
                      key={
                        notification.id
                      }
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.025,
                      }}
                      className={`relative px-5 py-5 transition sm:px-6 ${
                        isUnread
                          ? "bg-blue-50/50 hover:bg-blue-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {isUnread && (
                        <div className="absolute bottom-0 left-0 top-0 w-1 bg-blue-600" />
                      )}

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* ICON */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            isUnread
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isUnread ? (
                            <FaEnvelope />
                          ) : (
                            <FaEnvelopeOpen />
                          )}
                        </div>

                        {/* CONTENT */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`text-sm ${
                                    isUnread
                                      ? "font-black text-slate-900"
                                      : "font-bold text-slate-700"
                                  }`}
                                >
                                  {getNotificationTitle(
                                    notification
                                  )}
                                </h3>

                                {isUnread && (
                                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                                    New
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                {getNotificationMessage(
                                  notification
                                )}
                              </p>
                            </div>

                            <p className="shrink-0 text-[11px] font-semibold text-slate-400">
                              {formatDate(
                                notification.created_at
                              )}
                            </p>
                          </div>

                          {notification.type && (
                            <div className="mt-3">
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                {
                                  notification.type
                                }
                              </span>
                            </div>
                          )}

                          {/* ACTIONS */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenNotification(
                                  notification
                                )
                              }
                              disabled={
                                isProcessing
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaEye />
                              )}

                              Open
                            </button>

                            {isUnread && (
                              <button
                                type="button"
                                onClick={() =>
                                  markAsRead(
                                    notification
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <FaCheck />
                                Mark as Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          )}
        </motion.div>
      </div>
    </GuidanceLayout>
  );
}

export default Notifications;