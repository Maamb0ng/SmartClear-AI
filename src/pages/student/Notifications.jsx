import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";
import { supabase } from "../../services/supabase";

import {
  FaBell,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSyncAlt,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const formatDateTime = (date) => {
  if (!date) return "Unknown time";

  return new Date(date).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatRelativeTime = (date) => {
  if (!date) return "Unknown time";

  const createdDate = new Date(date);
  const now = new Date();

  const differenceInSeconds = Math.floor(
    (now.getTime() - createdDate.getTime()) / 1000
  );

  if (differenceInSeconds < 60) {
    return "Just now";
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60
  );

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} min${
      differenceInMinutes === 1 ? "" : "s"
    } ago`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `${differenceInHours} hour${
      differenceInHours === 1 ? "" : "s"
    } ago`;
  }

  return formatDateTime(date);
};

const getDateCategory = (date) => {
  if (!date) return "Earlier";

  const notificationDate = new Date(date);
  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const notificationStart = new Date(
    notificationDate.getFullYear(),
    notificationDate.getMonth(),
    notificationDate.getDate()
  );

  if (
    notificationStart.getTime() ===
    todayStart.getTime()
  ) {
    return "Today";
  }

  if (
    notificationStart.getTime() ===
    yesterdayStart.getTime()
  ) {
    return "Yesterday";
  }

  return "Earlier";
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "Success":
      return (
        <FaCheckCircle className="text-2xl text-green-600" />
      );

    case "Warning":
      return (
        <FaExclamationTriangle className="text-2xl text-yellow-500" />
      );

    case "Error":
      return (
        <FaExclamationCircle className="text-2xl text-red-600" />
      );

    case "Info":
    default:
      return (
        <FaInfoCircle className="text-2xl text-blue-600" />
      );
  }
};

const getNotificationIconContainer = (type) => {
  switch (type) {
    case "Success":
      return "bg-green-100";

    case "Warning":
      return "bg-yellow-100";

    case "Error":
      return "bg-red-100";

    case "Info":
    default:
      return "bg-blue-100";
  }
};

const getNotificationCategory = (notification) => {
  const content = [
    notification.title,
    notification.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    notification.type === "Success" ||
    content.includes("approved") ||
    content.includes("completed") ||
    content.includes("verified") ||
    content.includes("activated")
  ) {
    return "Approved";
  }

  if (
    notification.type === "Error" ||
    content.includes("rejected") ||
    content.includes("failed") ||
    content.includes("deactivated")
  ) {
    return "Rejected";
  }

  if (
    notification.type === "Warning" ||
    content.includes("pending") ||
    content.includes("waiting") ||
    content.includes("review") ||
    content.includes("submitted") ||
    content.includes("resubmitted")
  ) {
    return "Pending";
  }

  return "Information";
};


const SAFE_STUDENT_ROUTES = [
  "/student/dashboard",
  "/student/request-clearance",
  "/student/clearance-status",
  "/student/assistant",
  "/student/notifications",
  "/student/profile",
  "/student/settings",
];

const getSafeNotificationDestination = (
  notification
) => {
  const rawActionUrl = String(
    notification?.action_url || ""
  ).trim();

  /*
  |--------------------------------------------------------------------------
  | SAFE FALLBACK FOR CLEARANCE-RELATED NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  if (!rawActionUrl) {
    const entityType = String(
      notification?.entity_type || ""
    )
      .trim()
      .toLowerCase();

    const content = [
      notification?.title,
      notification?.message,
      entityType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      content.includes("clearance") ||
      content.includes("requirement") ||
      content.includes("submission") ||
      content.includes("approved") ||
      content.includes("rejected")
    ) {
      return "/student/clearance-status";
    }

    return null;
  }

  try {
    const parsedUrl = new URL(
      rawActionUrl,
      window.location.origin
    );

    /*
    |--------------------------------------------------------------------------
    | BLOCK EXTERNAL LINKS
    |--------------------------------------------------------------------------
    */

    if (
      parsedUrl.origin !==
      window.location.origin
    ) {
      return null;
    }

    let destination =
      `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

    /*
    |--------------------------------------------------------------------------
    | FIX OLD CLEARANCE ROUTE
    |--------------------------------------------------------------------------
    */

    if (
      parsedUrl.pathname ===
      "/student/clearance"
    ) {
      destination =
        `/student/clearance-status${parsedUrl.search}${parsedUrl.hash}`;
    }

    /*
    |--------------------------------------------------------------------------
    | STUDENTS MAY ONLY OPEN STUDENT ROUTES FROM A NOTIFICATION
    |--------------------------------------------------------------------------
    */

    const isSafeStudentRoute =
      SAFE_STUDENT_ROUTES.some(
        (allowedRoute) =>
          parsedUrl.pathname ===
            allowedRoute ||
          parsedUrl.pathname.startsWith(
            `${allowedRoute}/`
          )
      );

    if (!isSafeStudentRoute) {
      return null;
    }

    return destination;
  } catch (error) {
    console.warn(
      "Invalid notification action URL:",
      rawActionUrl,
      error
    );

    return null;
  }
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [markingNotificationId, setMarkingNotificationId] =
    useState(null);

  const [activeFilter, setActiveFilter] =
    useState("All");

  const [studentProfileId, setStudentProfileId] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error(
          "Please log in to view your notifications."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | RESOLVE THE LOGGED-IN STUDENT PROFILE
      |--------------------------------------------------------------------------
      | notifications.user_id stores public.users.id, not auth.users.id.
      |--------------------------------------------------------------------------
      */

      const {
        data: studentProfile,
        error: profileError,
      } = await supabase
        .from("users")
        .select("id, role, status")
        .eq("auth_id", user.id)
        .eq("role", "Student")
        .maybeSingle();

      if (profileError) throw profileError;

      if (!studentProfile) {
        throw new Error(
          "Your Student profile could not be found."
        );
      }

      if (studentProfile.status !== "Active") {
        throw new Error(
          "Your Student account is not active."
        );
      }

      setStudentProfileId(studentProfile.id);

      /*
      |--------------------------------------------------------------------------
      | LOAD ONLY THIS STUDENT'S NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          title,
          message,
          type,
          is_read,
          action_url,
          entity_type,
          entity_id,
          created_at,
          updated_at,
          read_at
        `)
        .eq("user_id", studentProfile.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error(
        "Load notifications error:",
        error
      );

      setNotifications([]);

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Notifications",
        text:
          error?.message ||
          "An unexpected error occurred while loading your notifications.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
  |--------------------------------------------------------------------------
  | REAL-TIME NOTIFICATIONS FOR THE LOGGED-IN STUDENT ONLY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!studentProfileId) return undefined;

    const channel = supabase
      .channel(
        `student-notifications-${studentProfileId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${studentProfileId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((current) => {
              if (
                current.some(
                  (item) =>
                    item.id === payload.new.id
                )
              ) {
                return current;
              }

              return [payload.new, ...current].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            });
          }

          if (payload.eventType === "UPDATE") {
            setNotifications((current) =>
              current.map((item) =>
                item.id === payload.new.id
                  ? { ...item, ...payload.new }
                  : item
              )
            );
          }

          if (payload.eventType === "DELETE") {
            setNotifications((current) =>
              current.filter(
                (item) =>
                  item.id !== payload.old.id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentProfileId]);

  /*
  |--------------------------------------------------------------------------
  | UNREAD COUNT
  |--------------------------------------------------------------------------
  */

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;
  }, [notifications]);

  /*
  |--------------------------------------------------------------------------
  | FILTER NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const filteredNotifications = useMemo(() => {
    return notifications.filter(
      (notification) => {
        if (activeFilter === "All") {
          return true;
        }

        if (activeFilter === "Unread") {
          return !notification.is_read;
        }

        return (
          getNotificationCategory(notification) ===
          activeFilter
        );
      }
    );
  }, [
    notifications,
    activeFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | GROUP BY DATE
  |--------------------------------------------------------------------------
  */

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce(
      (groups, notification) => {
        const category = getDateCategory(
          notification.created_at
        );

        if (!groups[category]) {
          groups[category] = [];
        }

        groups[category].push(notification);

        return groups;
      },
      {
        Today: [],
        Yesterday: [],
        Earlier: [],
      }
    );
  }, [filteredNotifications]);

  /*
  |--------------------------------------------------------------------------
  | MARK ONE AS READ
  |--------------------------------------------------------------------------
  */

  const markNotificationAsRead = async (
    notification
  ) => {
    if (!notification) return;

    const safeDestination =
      getSafeNotificationDestination(
        notification
      );

    if (notification.is_read) {
      if (safeDestination) {
        navigate(
          safeDestination
        );
      }

      return;
    }

    try {
      setMarkingNotificationId(
        notification.id
      );

      const {
        error,
      } = await supabase.rpc(
        "mark_notification_read",
        {
          p_notification_id:
            notification.id,
        }
      );

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at:
                  new Date().toISOString(),
              }
            : item
        )
      );

      if (safeDestination) {
        navigate(
          safeDestination
        );
      }
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Update Notification",
        text:
          error?.message ||
          "The notification could not be marked as read.",
      });
    } finally {
      setMarkingNotificationId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL AS READ
  |--------------------------------------------------------------------------
  */

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      await Swal.fire({
        icon: "info",
        title: "No Unread Notifications",
        text:
          "All your notifications are already marked as read.",
      });

      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Mark All as Read?",
      text: `${unreadCount} unread notification${
        unreadCount === 1 ? "" : "s"
      } will be marked as read.`,
      showCancelButton: true,
      confirmButtonText: "Mark All as Read",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1d4ed8",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setMarkingAll(true);

      const {
        data,
        error,
      } = await supabase.rpc(
        "mark_all_notifications_read"
      );

      if (error) throw error;

      const readAt =
        new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at ||
            readAt,
        }))
      );

      await Swal.fire({
        icon: "success",
        title: "Notifications Updated",
        text: `${
          data?.updatedCount ??
          unreadCount
        } notification${
          (data?.updatedCount ??
            unreadCount) === 1
            ? ""
            : "s"
        } marked as read.`,
      });
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Update Notifications",
        text:
          error?.message ||
          "Your notifications could not be updated.",
      });
    } finally {
      setMarkingAll(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER BUTTONS
  |--------------------------------------------------------------------------
  */

  const filters = [
    "All",
    "Unread",
    "Approved",
    "Pending",
    "Rejected",
  ];

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading notifications...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-4 text-2xl text-blue-700">
              <FaBell />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">
                Notification Center
              </h1>

              <p className="mt-2 text-slate-500">
                Track updates related to your account,
                clearance requirements, approvals, and
                enrollment verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          </button>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={
              markingAll ||
              unreadCount === 0
            }
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCheckCircle />

            {markingAll
              ? "Updating..."
              : "Mark All as Read"}
          </button>
        </div>
      </div>

      {/* Summary */}

      <div className="mb-7 grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-500">
            Total Notifications
          </p>

          <p className="mt-2 text-4xl font-bold text-slate-800">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-500">
            Unread Notifications
          </p>

          <p className="mt-2 text-4xl font-bold text-blue-700">
            {unreadCount}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-500">
            Read Notifications
          </p>

          <p className="mt-2 text-4xl font-bold text-green-700">
            {notifications.length -
              unreadCount}
          </p>
        </div>
      </div>

      {/* Notification Container */}

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
        {/* Filters */}

        <div className="flex gap-3 overflow-x-auto border-b border-slate-100 p-6">
          {filters.map((filter) => {
            const isActive =
              activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setActiveFilter(filter)
                }
                className={`min-w-fit rounded-full px-5 py-2 font-semibold transition ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter}

                {filter === "Unread" &&
                  unreadCount > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        <div className="p-6 md:p-8">
          {filteredNotifications.length ===
          0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl text-slate-400">
                <FaBell />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-700">
                No Notifications Found
              </h2>

              <p className="mt-2 text-slate-500">
                There are no notifications under the{" "}
                <strong>{activeFilter}</strong> filter.
              </p>
            </div>
          ) : (
            ["Today", "Yesterday", "Earlier"].map(
              (section) => {
                const sectionNotifications =
                  groupedNotifications[
                    section
                  ] || [];

                if (
                  sectionNotifications.length ===
                  0
                ) {
                  return null;
                }

                return (
                  <div
                    key={section}
                    className="mb-10 last:mb-0"
                  >
                    <h2 className="mb-5 text-xl font-bold text-slate-700">
                      {section}
                    </h2>

                    <div className="space-y-4">
                      {sectionNotifications.map(
                        (notification) => {
                          const isMarking =
                            markingNotificationId ===
                            notification.id;

                          const category =
                            getNotificationCategory(
                              notification
                            );

                          return (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={() =>
                                markNotificationAsRead(
                                  notification
                                )
                              }
                              disabled={isMarking}
                              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition hover:border-blue-300 hover:shadow-md disabled:cursor-wait disabled:opacity-70 ${
                                notification.is_read
                                  ? "border-slate-200 bg-white"
                                  : "border-blue-200 bg-blue-50/70"
                              }`}
                            >
                              <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${getNotificationIconContainer(
                                  notification.type
                                )}`}
                              >
                                {isMarking ? (
                                  <FaSyncAlt className="animate-spin text-xl text-blue-700" />
                                ) : (
                                  getNotificationIcon(
                                    notification.type
                                  )
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <h3 className="truncate text-lg font-semibold text-slate-800">
                                      {
                                        notification.title
                                      }
                                    </h3>

                                    {!notification.is_read && (
                                      <span className="h-3 w-3 shrink-0 rounded-full bg-blue-600" />
                                    )}
                                  </div>

                                  <span className="shrink-0 text-sm text-slate-400">
                                    {formatRelativeTime(
                                      notification.created_at
                                    )}
                                  </span>
                                </div>

                                <p className="mt-2 whitespace-pre-wrap text-slate-600">
                                  {
                                    notification.message
                                  }
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {category}
                                  </span>

                                  <span className="text-xs text-slate-400">
                                    {formatDateTime(
                                      notification.created_at
                                    )}
                                  </span>

                                  {getSafeNotificationDestination(
                                    notification
                                  ) && (
                                    <span className="text-xs font-semibold text-blue-700">
                                      Click to open
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;