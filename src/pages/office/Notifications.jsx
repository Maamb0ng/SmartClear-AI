import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTrash,
  FaUserGraduate,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function Notifications() {
  const navigate = useNavigate();

  // =========================================================
  // MOCK OFFICE
  // Later: authenticated user's assigned office.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  // =========================================================
  // MOCK NOTIFICATIONS
  // Later: Supabase notifications table.
  // =========================================================

  const [notifications, setNotifications] = useState([
    {
      id: "notif-001",
      type: "student",
      title: "New student clearance request",
      message:
        "Juan Dela Cruz is now waiting for Library clearance processing.",
      time: "5 minutes ago",
      isRead: false,
      actionPath: "/office/students",
    },
    {
      id: "notif-002",
      type: "schedule",
      title: "Batch schedule today",
      message:
        "Library Clearance - Batch 1 is scheduled today from 9:00 AM to 11:00 AM.",
      time: "35 minutes ago",
      isRead: false,
      actionPath: "/office/schedule",
    },
    {
      id: "notif-003",
      type: "action",
      title: "Student requires another review",
      message:
        "Maria Santos has a clearance record marked as Needs Action.",
      time: "1 hour ago",
      isRead: false,
      actionPath: "/office/students",
    },
    {
      id: "notif-004",
      type: "review",
      title: "Student clearance approved",
      message:
        "Carlo Reyes was successfully approved for Library clearance.",
      time: "2 hours ago",
      isRead: true,
      actionPath: "/office/reviewed",
    },
    {
      id: "notif-005",
      type: "schedule",
      title: "Upcoming clearance batch",
      message:
        "BSIT Clearance - Batch 3 is scheduled on October 3, 2026.",
      time: "Yesterday",
      isRead: true,
      actionPath: "/office/schedule",
    },
    {
      id: "notif-006",
      type: "info",
      title: "Office requirements updated",
      message:
        "Your office clearance checklist has been updated.",
      time: "Sep 30, 2026",
      isRead: true,
      actionPath: "/office/requirements",
    },
  ]);

  const [filter, setFilter] = useState("All");

  // =========================================================
  // COUNTS
  // =========================================================

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.isRead
      ).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filter === "Unread") {
      return notifications.filter(
        (notification) => !notification.isRead
      );
    }

    if (filter === "Read") {
      return notifications.filter(
        (notification) => notification.isRead
      );
    }

    return notifications;
  }, [notifications, filter]);

  // =========================================================
  // ACTIONS
  // =========================================================

  const markAsRead = (notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
      }))
    );
  };

  const deleteNotification = (
    event,
    notificationId
  ) => {
    event.stopPropagation();

    setNotifications((current) =>
      current.filter(
        (notification) =>
          notification.id !== notificationId
      )
    );
  };

  const openNotification = (notification) => {
    markAsRead(notification.id);

    if (notification.actionPath) {
      navigate(notification.actionPath);
    }
  };

  // =========================================================
  // ICON
  // =========================================================

  const getNotificationStyle = (type) => {
    switch (type) {
      case "student":
        return {
          icon: FaUserGraduate,
          className:
            "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        };

      case "schedule":
        return {
          icon: FaCalendarAlt,
          className:
            "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
        };

      case "action":
        return {
          icon: FaExclamationTriangle,
          className:
            "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
        };

      case "review":
        return {
          icon: FaCheckCircle,
          className:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        };

      default:
        return {
          icon: FaInfoCircle,
          className:
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        };
    }
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1300px] space-y-6">
        {/* HEADER */}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {office.code}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {office.name}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Notifications
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Clearance updates, schedules, and
              student review activity for your
              office.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <FaCheck />
              Mark All as Read
            </button>
          )}
        </section>

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="All Notifications"
            value={notifications.length}
            icon={FaBell}
          />

          <SummaryCard
            label="Unread"
            value={unreadCount}
            icon={FaExclamationTriangle}
          />

          <SummaryCard
            label="Read"
            value={
              notifications.length - unreadCount
            }
            icon={FaCheckCircle}
          />
        </section>

        {/* FILTER */}

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-1 overflow-x-auto">
            {["All", "Unread", "Read"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    filter === item
                      ? "bg-slate-950 text-white shadow-sm dark:bg-blue-600"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {item}

                  {item === "Unread" &&
                    unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                        {unreadCount}
                      </span>
                    )}
                </button>
              )
            )}
          </div>
        </section>

        {/* LIST */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {filter} Notifications
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {filteredNotifications.length}{" "}
                notification
                {filteredNotifications.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FaBell />
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FaBell className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No notifications
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500">
                There are no {filter.toLowerCase()}{" "}
                notifications to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotifications.map(
                (notification) => {
                  const style =
                    getNotificationStyle(
                      notification.type
                    );

                  const Icon = style.icon;

                  return (
                    <article
                      key={notification.id}
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
                        <span className="absolute left-0 top-0 h-full w-1 bg-blue-600" />
                      )}

                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.className}`}
                        >
                          <Icon />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3
                                  className={`text-sm text-slate-900 dark:text-white ${
                                    notification.isRead
                                      ? "font-bold"
                                      : "font-black"
                                  }`}
                                >
                                  {
                                    notification.title
                                  }
                                </h3>

                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                                )}
                              </div>

                              <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                                {
                                  notification.message
                                }
                              </p>
                            </div>

                            <span className="shrink-0 text-[10px] font-bold text-slate-400">
                              {notification.time}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">
                              <FaClipboardList />
                              View Details
                            </span>

                            <button
                              type="button"
                              onClick={(event) =>
                                deleteNotification(
                                  event,
                                  notification.id
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-500/10"
                              title="Remove notification"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* NOTICE */}

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="mt-0.5 shrink-0 text-slate-400" />

            <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
              Notifications shown in the final
              system will be limited to the logged-in
              office staff account and its assigned
              office.
            </p>
          </div>
        </section>
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// COMPONENT
// ===========================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon />
        </div>
      </div>
    </div>
  );
}

export default Notifications;