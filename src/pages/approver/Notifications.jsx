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

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaArrowRight,
  FaBell,
  FaCheckCircle,
  FaCheckDouble,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaHome,
  FaInfoCircle,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
} from "react-icons/fa";

const FILTERS = [
  "All",
  "Unread",
  "Read",
];

function Notifications() {
  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    profileId,
    setProfileId,
  ] = useState(null);

  const [
    filter,
    setFilter,
  ] = useState("All");

  const [
    updatingId,
    setUpdatingId,
  ] = useState(null);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState(null);

  const [
    navigating,
    setNavigating,
  ] = useState(false);

  const loadNotifications =
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
              user:
                authUser,
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
            !authUser
          ) {
            throw new Error(
              "You are not logged in."
            );
          }

          const {
            data:
              profile,
            error:
              profileError,
          } = await supabase
            .from("users")
            .select(
              "id"
            )
            .eq(
              "auth_id",
              authUser.id
            )
            .single();

          if (
            profileError
          ) {
            throw profileError;
          }

          setProfileId(
            profile.id
          );

          const {
            data,
            error,
          } = await supabase
            .from(
              "notifications"
            )
            .select("*")
            .eq(
              "user_id",
              profile.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

          if (
            error
          ) {
            throw error;
          }

          setNotifications(
            data || []
          );
        } catch (
          error
        ) {
          console.error(
            "Load notifications error:",
            error
          );

          await Swal.fire({
            icon:
              "error",
            title:
              "Unable to Load Notifications",
            text:
              error?.message ||
              "An unexpected error occurred.",
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
      []
    );

  useEffect(() => {
    loadNotifications();
  }, [
    loadNotifications,
  ]);

  useEffect(() => {
    if (
      !profileId
    ) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `approver-notifications-${profileId}`
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
              `user_id=eq.${profileId}`,
          },
          () => {
            loadNotifications(
              true
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
    profileId,
    loadNotifications,
  ]);

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            !notification.is_read
        ).length,
      [
        notifications,
      ]
    );

  const filteredNotifications =
    useMemo(() => {
      if (
        filter ===
        "Unread"
      ) {
        return notifications.filter(
          (
            notification
          ) =>
            !notification.is_read
        );
      }

      if (
        filter ===
        "Read"
      ) {
        return notifications.filter(
          (
            notification
          ) =>
            notification.is_read
        );
      }

      return notifications;
    }, [
      notifications,
      filter,
    ]);

  const markAsRead =
    async (
      id
    ) => {
      const target =
        notifications.find(
          (
            notification
          ) =>
            notification.id ===
            id
        );

      if (
        !target ||
        target.is_read ||
        updatingId
      ) {
        return;
      }

      try {
        setUpdatingId(
          id
        );

        const {
          error,
        } =
          await supabase.rpc(
            "mark_notification_read",
            {
              p_notification_id:
                id,
            }
          );

        if (
          error
        ) {
          throw error;
        }

        setNotifications(
          (
            previousNotifications
          ) =>
            previousNotifications.map(
              (
                notification
              ) =>
                notification.id ===
                id
                  ? {
                      ...notification,
                      is_read:
                        true,
                    }
                  : notification
            )
        );
      } catch (
        error
      ) {
        console.error(
          "Mark notification as read error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title:
            "Unable to Update Notification",
          text:
            error?.message ||
            "The notification could not be marked as read.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setUpdatingId(
          null
        );
      }
    };

  const markAllAsRead =
    async () => {
      if (
        unreadCount ===
          0 ||
        markingAll
      ) {
        return;
      }

      try {
        setMarkingAll(
          true
        );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "mark_all_notifications_read"
          );

        if (
          error
        ) {
          throw error;
        }

        setNotifications(
          (
            previousNotifications
          ) =>
            previousNotifications.map(
              (
                notification
              ) => ({
                ...notification,
                is_read:
                  true,
              })
            )
        );

        await Swal.fire({
          icon:
            "success",
          title:
            "Notifications Updated",
          text: `${data || unreadCount} notification${
            Number(
              data ||
                unreadCount
            ) === 1
              ? ""
              : "s"
          } marked as read.`,
          timer: 1400,
          showConfirmButton:
            false,
        });
      } catch (
        error
      ) {
        console.error(
          "Mark all notifications as read error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title:
            "Unable to Update Notifications",
          text:
            error?.message ||
            "The notifications could not be marked as read.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setMarkingAll(
          false
        );
      }
    };

  const parseNotificationPayload =
    (
      notification
    ) => {
      const candidates = [
        notification?.metadata,
        notification?.data,
        notification?.payload,
      ];

      for (
        const candidate of
        candidates
      ) {
        if (
          candidate &&
          typeof candidate ===
            "object"
        ) {
          return candidate;
        }

        if (
          typeof candidate ===
          "string"
        ) {
          try {
            return JSON.parse(
              candidate
            );
          } catch {
            // Continue to the next possible payload.
          }
        }
      }

      return {};
    };

  const buildDashboardFocus =
    (
      notification
    ) => {
      const payload =
        parseNotificationPayload(
          notification
        );

      const entityType =
        String(
          notification?.entity_type ||
            payload?.entity_type ||
            ""
        )
          .trim()
          .toLowerCase();

      const entityId =
        notification?.entity_id ||
        payload?.entity_id ||
        null;

      return {
        stepId:
          payload?.step_id ||
          payload?.clearance_step_id ||
          (entityType.includes(
            "step"
          )
            ? entityId
            : null),

        requestId:
          payload?.request_id ||
          payload?.clearance_request_id ||
          (entityType.includes(
            "request"
          )
            ? entityId
            : null),

        studentId:
          payload?.student_id ||
          payload?.user_id ||
          null,

        studentName:
          payload?.student_name ||
          payload?.full_name ||
          null,

        targetName:
          payload?.target_name ||
          payload?.office_name ||
          payload?.subject_name ||
          payload?.requirement_name ||
          null,

        title:
          notification?.title ||
          null,

        message:
          notification?.message ||
          null,
      };
    };

  const resolveNotificationRoute =
    () => {
      /*
      |--------------------------------------------------------------------------
      | Current production Approver workflow
      |--------------------------------------------------------------------------
      | PendingRequests, ApprovedRequests, RejectedRequests, and StudentDetails
      | are legacy pages. The active review workflow lives in the grouped
      | ApproverDashboard, so notification actions return there.
      |--------------------------------------------------------------------------
      */

      return "/approver/dashboard";
    };

  const getNotificationDestinationLabel =
    () => {
      return "Open Approver Dashboard";
    };

  const handleNotificationClick =
    (
      notification
    ) => {
      setSelectedNotification(
        notification
      );
    };

  const handleOpenRelatedPage =
    async () => {
      if (
        !selectedNotification ||
        navigating
      ) {
        return;
      }

      try {
        setNavigating(
          true
        );

        if (
          !selectedNotification.is_read
        ) {
          await markAsRead(
            selectedNotification.id
          );
        }

        const destination =
          resolveNotificationRoute(
            selectedNotification
          );

        setSelectedNotification(
          null
        );

        navigate(
          destination,
          {
            state: {
              source:
                "notification",
              notificationId:
                selectedNotification.id,
              notification:
                selectedNotification,
              focus:
                buildDashboardFocus(
                  selectedNotification
                ),
            },
          }
        );
      } finally {
        setNavigating(
          false
        );
      }
    };

  const handleMarkSelectedAsRead =
    async () => {
      if (
        !selectedNotification ||
        selectedNotification.is_read
      ) {
        return;
      }

      await markAsRead(
        selectedNotification.id
      );

      setSelectedNotification(
        (
          current
        ) =>
          current
            ? {
                ...current,
                is_read:
                  true,
              }
            : current
      );
    };

  const getTypeIcon = (
    type
  ) => {
    if (
      type ===
      "Success"
    ) {
      return (
        <FaCheckCircle className="text-emerald-600" />
      );
    }

    if (
      type ===
      "Warning"
    ) {
      return (
        <FaExclamationTriangle className="text-amber-600" />
      );
    }

    if (
      type ===
      "Error"
    ) {
      return (
        <FaTimesCircle className="text-rose-600" />
      );
    }

    return (
      <FaInfoCircle className="text-blue-600" />
    );
  };

  const getIconContainer =
    (
      type
    ) => {
      if (
        type ===
        "Success"
      ) {
        return "bg-emerald-100";
      }

      if (
        type ===
        "Warning"
      ) {
        return "bg-amber-100";
      }

      if (
        type ===
        "Error"
      ) {
        return "bg-rose-100";
      }

      return "bg-blue-100";
    };

  return (
    <ApproverLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 14,
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
        className="space-y-6 pb-10"
      >
        {/* Header */}

        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] p-6 text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)] sm:p-7">
          <motion.div
            animate={{
              x: [
                0,
                24,
                0,
              ],
              y: [
                0,
                -14,
                0,
              ],
            }}
            transition={{
              duration: 10,
              repeat:
                Infinity,
              ease:
                "easeInOut",
            }}
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl text-cyan-300">
                <FaBell />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/75">
                  Approver Portal
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Notifications
                </h1>

                <p className="mt-2 text-sm text-blue-100/70">
                  You have{" "}
                  <strong className="text-white">
                    {
                      unreadCount
                    }
                  </strong>{" "}
                  unread notification
                  {unreadCount !==
                  1
                    ? "s"
                    : ""}
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                  loadNotifications(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSyncAlt
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </motion.button>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale:
                    0.98,
                }}
                type="button"
                onClick={
                  markAllAsRead
                }
                disabled={
                  unreadCount ===
                    0 ||
                  markingAll
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaCheckDouble />

                {markingAll
                  ? "Updating..."
                  : "Mark All as Read"}
              </motion.button>
            </div>
          </div>
        </section>

        {/* Filters */}

        <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
          {FILTERS.map(
            (
              item
            ) => {
              const count =
                item ===
                "All"
                  ? notifications.length
                  : item ===
                    "Unread"
                  ? unreadCount
                  : notifications.length -
                    unreadCount;

              return (
                <motion.button
                  key={
                    item
                  }
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale:
                      0.98,
                  }}
                  type="button"
                  onClick={() =>
                    setFilter(
                      item
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    filter ===
                    item
                      ? "bg-[#071b4b] text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {
                    item
                  }

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      filter ===
                      item
                        ? "bg-white/10 text-cyan-200"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {
                      count
                    }
                  </span>
                </motion.button>
              );
            }
          )}
        </section>

        {/* Notification list */}

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-12 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

                <FaBell className="text-2xl text-blue-700" />
              </div>

              <p className="mt-5 font-bold text-slate-600">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-12 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-4xl text-slate-300">
                <FaBell />
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-700">
                No Notifications
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                You do not have notifications in this category.
              </p>
            </div>
          ) : (
            filteredNotifications.map(
              (
                notification,
                index
              ) => (
                <motion.article
                  key={
                    notification.id
                  }
                  initial={{
                    opacity: 0,
                    y: 14,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.04,
                  }}
                  whileHover={{
                    y: -3,
                  }}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition ${
                    notification.is_read
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-gradient-to-r from-blue-50 to-white"
                  } ${
                    updatingId ===
                    notification.id
                      ? "pointer-events-none opacity-65"
                      : ""
                  }`}
                >
                  {!notification.is_read && (
                    <span className="absolute bottom-0 left-0 top-0 w-1 bg-blue-600" />
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${getIconContainer(
                        notification.type
                      )}`}
                    >
                      {getTypeIcon(
                        notification.type
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-800">
                          {notification.title ||
                            "Notification"}
                        </h3>

                        {!notification.is_read && (
                          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                            {updatingId ===
                            notification.id
                              ? "Updating"
                              : "New"}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.message ||
                          "No notification message."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-medium text-slate-400">
                          {notification.created_at
                            ? new Date(
                                notification.created_at
                              ).toLocaleString(
                                "en-PH"
                              )
                            : "Date unavailable"}
                        </p>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
                            notification.is_read
                              ? "text-slate-400"
                              : "text-blue-700"
                          }`}
                        >
                          {notification.is_read
                            ? "Read"
                            : "Click to mark as read"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              )
            )
          )}
        </section>
        <AnimatePresence>
          {selectedNotification && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={() =>
                setSelectedNotification(
                  null
                )
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 24,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 18,
                  scale: 0.97,
                }}
                transition={{
                  duration: 0.22,
                }}
                onClick={(
                  event
                ) =>
                  event.stopPropagation()
                }
                className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
              >
                <div className="relative overflow-hidden bg-[#061b51] p-5 text-white sm:p-6">
                  <motion.div
                    animate={{
                      x: [0, 20, 0],
                      y: [0, -12, 0],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl"
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xl text-cyan-300">
                        <FaBell />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                          Notification Action
                        </p>

                        <h2 className="mt-1 text-xl font-black">
                          What would you like to do?
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedNotification(
                          null
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-blue-100 transition hover:bg-white/15"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${getIconContainer(
                          selectedNotification.type
                        )}`}
                      >
                        {getTypeIcon(
                          selectedNotification.type
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-black text-slate-800">
                          {selectedNotification.title ||
                            "Notification"}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {selectedNotification.message ||
                            "No notification message."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <motion.button
                      whileHover={{
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.985,
                      }}
                      type="button"
                      onClick={
                        handleOpenRelatedPage
                      }
                      disabled={
                        navigating
                      }
                      className="group flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-4 text-left text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                        <FaClipboardCheck />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black">
                          {getNotificationDestinationLabel(
                            selectedNotification
                          )}
                        </p>

                        <p className="mt-1 text-xs text-blue-100/70">
                          Open the grouped dashboard to review your assigned student, office, or subject clearance steps.
                        </p>
                      </div>

                      <FaArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" />
                    </motion.button>

                    {!selectedNotification.is_read && (
                      <motion.button
                        whileHover={{
                          y: -2,
                        }}
                        whileTap={{
                          scale: 0.985,
                        }}
                        type="button"
                        onClick={
                          handleMarkSelectedAsRead
                        }
                        disabled={
                          updatingId ===
                          selectedNotification.id
                        }
                        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <FaCheckDouble />
                        </div>

                        <div>
                          <p className="font-black text-slate-800">
                            Mark as Read Only
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Keep this page open and remove the unread status.
                          </p>
                        </div>
                      </motion.button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNotification(
                          null
                        );
                        navigate(
                          "/approver/dashboard"
                        );
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <FaHome />
                      </div>

                      <div>
                        <p className="font-black text-slate-800">
                          Go to Dashboard
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Return to the Approver overview.
                        </p>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNotification(
                        null
                      )
                    }
                    className="mt-5 h-11 w-full rounded-xl border border-slate-300 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </ApproverLayout>
  );
}

export default Notifications;
