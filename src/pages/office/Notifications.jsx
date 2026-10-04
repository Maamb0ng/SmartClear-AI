import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FaBell,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRedo,
  FaSpinner,
  FaUserGraduate,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

import { supabase } from "../../services/supabase";

import {
  getOfficeStaffContext,
} from "../../services/officeStaffService";

function Notifications() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [context, setContext] =
    useState(null);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [filter, setFilter] =
    useState("All");

  const loadNotifications =
    async () => {
      try {
        setLoading(true);
        setError("");

        const contextData =
          await getOfficeStaffContext();

        const profile =
          contextData?.profile;

        if (!profile?.id) {
          throw new Error(
            "Office Staff profile not found."
          );
        }

        const {
          data,
          error:
            notificationError,
        } = await supabase
          .from("notifications")
          .select(`
            id,
            user_id,
            title,
            message,
            type,
            is_read,
            created_at,
            action_url,
            entity_type,
            entity_id,
            read_at,
            updated_at
          `)
          .eq(
            "user_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (notificationError) {
          throw notificationError;
        }

        setContext(
          contextData || null
        );

        setNotifications(
          (data || []).map(
            mapNotification
          )
        );
      } catch (err) {
        console.error(
          "Failed to load Office Staff notifications:",
          err
        );

        setError(
          err?.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadNotifications();
  }, []);

  const office =
    context?.office ||
    context?.offices?.[0] ||
    null;

  const officeName =
    office?.office_name ||
    office?.name ||
    "Office";

  const officeCode =
    office?.office_code ||
    office?.code ||
    "OFFICE";

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.isRead
        ).length,
      [notifications]
    );

  const filteredNotifications =
    useMemo(() => {
      if (filter === "Unread") {
        return notifications.filter(
          (notification) =>
            !notification.isRead
        );
      }

      if (filter === "Read") {
        return notifications.filter(
          (notification) =>
            notification.isRead
        );
      }

      return notifications;
    }, [
      notifications,
      filter,
    ]);

  const markAsRead =
    async (
      notificationId
    ) => {
      const notification =
        notifications.find(
          (item) =>
            item.id ===
            notificationId
        );

      if (
        !notification ||
        notification.isRead
      ) {
        return true;
      }

      const now =
        new Date().toISOString();

      const {
        error:
          updateError,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
        })
        .eq(
          "id",
          notificationId
        )
        .eq(
          "user_id",
          notification.userId
        );

      if (updateError) {
        throw updateError;
      }

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notificationId
                ? {
                    ...item,
                    isRead:
                      true,
                    readAt:
                      now,
                    updatedAt:
                      now,
                  }
                : item
          )
      );

      return true;
    };

  const markAllAsRead =
    async () => {
      const unreadIds =
        notifications
          .filter(
            (notification) =>
              !notification.isRead
          )
          .map(
            (notification) =>
              notification.id
          );

      if (
        unreadIds.length === 0
      ) {
        return;
      }

      try {
        setActionLoading(
          true
        );
        setError("");

        const profileId =
          context?.profile?.id;

        if (!profileId) {
          throw new Error(
            "Office Staff profile not found."
          );
        }

        const now =
          new Date().toISOString();

        const {
          error:
            updateError,
        } = await supabase
          .from("notifications")
          .update({
            is_read: true,
            read_at: now,
            updated_at: now,
          })
          .eq(
            "user_id",
            profileId
          )
          .eq(
            "is_read",
            false
          );

        if (updateError) {
          throw updateError;
        }

        setNotifications(
          (current) =>
            current.map(
              (
                notification
              ) =>
                notification.isRead
                  ? notification
                  : {
                      ...notification,
                      isRead:
                        true,
                      readAt:
                        now,
                      updatedAt:
                        now,
                    }
            )
        );
      } catch (err) {
        console.error(
          "Failed to mark all notifications as read:",
          err
        );

        setError(
          err?.message ||
            "Unable to mark notifications as read."
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const openNotification =
    async (
      notification
    ) => {
      try {
        setError("");

        await markAsRead(
          notification.id
        );

        const path =
          getSafeOfficeActionPath(
            notification.actionPath,
            notification
          );

        if (path) {
          navigate(path);
        }
      } catch (err) {
        console.error(
          "Failed to open notification:",
          err
        );

        setError(
          err?.message ||
            "Unable to open this notification."
        );
      }
    };

  const getNotificationStyle =
    (type) => {
      const normalized =
        String(
          type || ""
        ).toLowerCase();

      if (
        normalized.includes(
          "student"
        ) ||
        normalized.includes(
          "request"
        )
      ) {
        return {
          icon:
            FaUserGraduate,
          className:
            "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        };
      }

      if (
        normalized.includes(
          "schedule"
        ) ||
        normalized.includes(
          "batch"
        )
      ) {
        return {
          icon:
            FaCalendarAlt,
          className:
            "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
        };
      }

      if (
        normalized.includes(
          "action"
        ) ||
        normalized.includes(
          "reject"
        ) ||
        normalized.includes(
          "warning"
        )
      ) {
        return {
          icon:
            FaExclamationTriangle,
          className:
            "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
        };
      }

      if (
        normalized.includes(
          "review"
        ) ||
        normalized.includes(
          "approve"
        ) ||
        normalized.includes(
          "clear"
        )
      ) {
        return {
          icon:
            FaCheckCircle,
          className:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        };
      }

      return {
        icon: FaInfoCircle,
        className:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      };
    };

  if (loading) {
    return (
      <OfficeStaffLayout>
        <div className="mx-auto flex min-h-[65vh] w-full max-w-[1300px] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-3xl text-blue-600 dark:text-blue-400" />

            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200">
              Loading Notifications
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Retrieving your office notifications.
            </p>
          </div>
        </div>
      </OfficeStaffLayout>
    );
  }

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1300px] space-y-6">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {officeCode}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {officeName}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Notifications
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Clearance updates, schedules, and student review activity for your office.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                loadNotifications
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <FaRedo />
              Refresh
            </button>

            {unreadCount >
              0 && (
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={
                  markAllAsRead
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {actionLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaCheck />
                )}
                Mark All as Read
              </button>
            )}
          </div>
        </section>

        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />

            <div className="min-w-0">
              <p className="text-sm font-black">
                Notification Error
              </p>

              <p className="mt-1 text-xs font-medium leading-5">
                {error}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="All Notifications"
            value={
              notifications.length
            }
            icon={FaBell}
          />

          <SummaryCard
            label="Unread"
            value={unreadCount}
            icon={
              FaExclamationTriangle
            }
          />

          <SummaryCard
            label="Read"
            value={
              notifications.length -
              unreadCount
            }
            icon={
              FaCheckCircle
            }
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-1 overflow-x-auto">
            {[
              "All",
              "Unread",
              "Read",
            ].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setFilter(
                      item
                    )
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    filter ===
                    item
                      ? "bg-slate-950 text-white shadow-sm dark:bg-blue-600"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {item}

                  {item ===
                    "Unread" &&
                    unreadCount >
                      0 && (
                      <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                        {
                          unreadCount
                        }
                      </span>
                    )}
                </button>
              )
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {filter} Notifications
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {
                  filteredNotifications.length
                }{" "}
                notification
                {filteredNotifications.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FaBell />
            </div>
          </div>

          {filteredNotifications.length ===
          0 ? (
            <div className="px-5 py-16 text-center">
              <FaBell className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No notifications
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500">
                There are no{" "}
                {filter.toLowerCase()}{" "}
                notifications to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotifications.map(
                (
                  notification
                ) => {
                  const style =
                    getNotificationStyle(
                      notification.type
                    );

                  const Icon =
                    style.icon;

                  return (
                    <article
                      key={
                        notification.id
                      }
                      onClick={() =>
                        openNotification(
                          notification
                        )
                      }
                      className={`group relative cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:p-5 ${
                        !notification.isRead
                          ? "bg-blue-50/30 dark:bg-blue-500/[0.03]"
                          : ""
                      }`}
                    >
                      {!notification.isRead && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
                      )}

                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.className}`}
                        >
                          <Icon />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                  {
                                    notification.title
                                  }
                                </h3>

                                {!notification.isRead && (
                                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                                    New
                                  </span>
                                )}
                              </div>

                              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                                {
                                  notification.message
                                }
                              </p>
                            </div>

                            <span className="shrink-0 text-[11px] font-bold text-slate-400">
                              {
                                notification.time
                              }
                            </span>
                          </div>

                          {notification.actionPath && (
                            <p className="mt-3 text-[11px] font-black text-blue-600 dark:text-blue-400">
                              Open details
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </OfficeStaffLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon />
        </div>
      </div>
    </div>
  );
}

function mapNotification(
  notification
) {
  return {
    id: notification.id,
    userId:
      notification.user_id,
    title:
      notification.title ||
      "Notification",
    message:
      notification.message ||
      "",
    type:
      notification.type ||
      "info",
    isRead:
      notification.is_read ===
      true,
    createdAt:
      notification.created_at,
    actionPath:
      notification.action_url ||
      "",
    entityType:
      notification.entity_type ||
      null,
    entityId:
      notification.entity_id ||
      null,
    readAt:
      notification.read_at ||
      null,
    updatedAt:
      notification.updated_at,
    time: formatRelativeTime(
      notification.created_at
    ),
  };
}

function getSafeOfficeActionPath(
  actionPath,
  notification
) {
  const raw = String(
    actionPath || ""
  ).trim();

  if (
    raw.startsWith(
      "/office/"
    )
  ) {
    return raw;
  }

  const entityType =
    String(
      notification?.entityType ||
        ""
    ).toLowerCase();

  if (
    entityType.includes(
      "batch"
    ) ||
    entityType.includes(
      "schedule"
    )
  ) {
    return "/office/schedule";
  }

  if (
    entityType.includes(
      "requirement"
    )
  ) {
    return "/office/requirements";
  }

  if (
    entityType.includes(
      "review"
    )
  ) {
    return "/office/reviewed";
  }

  if (
    entityType.includes(
      "clearance"
    ) ||
    entityType.includes(
      "student"
    )
  ) {
    return "/office/students";
  }

  return "";
}

function formatRelativeTime(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  const now =
    new Date();

  const diffMs =
    now.getTime() -
    date.getTime();

  const diffSeconds =
    Math.floor(
      diffMs / 1000
    );

  if (
    diffSeconds < 30
  ) {
    return "Just now";
  }

  if (
    diffSeconds < 60
  ) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes =
    Math.floor(
      diffSeconds / 60
    );

  if (
    diffMinutes < 60
  ) {
    return `${diffMinutes}m ago`;
  }

  const diffHours =
    Math.floor(
      diffMinutes / 60
    );

  if (
    diffHours < 24
  ) {
    return `${diffHours}h ago`;
  }

  const diffDays =
    Math.floor(
      diffHours / 24
    );

  if (
    diffDays === 1
  ) {
    return "Yesterday";
  }

  if (
    diffDays < 7
  ) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

export default Notifications;
