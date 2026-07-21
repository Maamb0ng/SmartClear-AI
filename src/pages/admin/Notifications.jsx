import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";
import { supabase } from "../../services/supabase";

import {
  FaArrowRight,
  FaBell,
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaFilter,
  FaInfoCircle,
  FaSearch,
  FaSyncAlt,
  FaUserCog,
  FaUserGraduate,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const uniqueIds = (values = []) => [
  ...new Set(values.filter(Boolean)),
];

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
  const currentDate = new Date();

  const differenceInSeconds = Math.floor(
    (currentDate.getTime() -
      createdDate.getTime()) /
      1000
  );

  if (differenceInSeconds < 60) {
    return "Just now";
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60
  );

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} minute${
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

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  if (differenceInDays < 7) {
    return `${differenceInDays} day${
      differenceInDays === 1 ? "" : "s"
    } ago`;
  }

  return formatDateTime(date);
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "Success":
      return (
        <FaCheckCircle className="text-2xl text-green-600" />
      );

    case "Warning":
      return (
        <FaExclamationTriangle className="text-2xl text-yellow-600" />
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

const getNotificationIconBackground = (type) => {
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

const getTypeBadgeClass = (type) => {
  switch (type) {
    case "Success":
      return "bg-green-100 text-green-700";

    case "Warning":
      return "bg-yellow-100 text-yellow-700";

    case "Error":
      return "bg-red-100 text-red-700";

    case "Info":
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const getRoleIcon = (role) => {
  switch (role) {
    case "Student":
      return (
        <FaUserGraduate className="text-blue-700" />
      );

    case "Approver":
      return (
        <FaUserShield className="text-purple-700" />
      );

    case "Administrator":
      return (
        <FaUserCog className="text-red-700" />
      );

    default:
      return (
        <FaUsers className="text-slate-600" />
      );
  }
};

const getRoleBadgeClass = (role) => {
  switch (role) {
    case "Student":
      return "bg-blue-100 text-blue-700";

    case "Approver":
      return "bg-purple-100 text-purple-700";

    case "Administrator":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const resolveAdminNotificationRoute = (
  notification
) => {
  const rawActionUrl =
    String(
      notification?.action_url ||
        ""
    ).trim();

  if (rawActionUrl) {
    try {
      const parsedUrl =
        new URL(
          rawActionUrl,
          window.location.origin
        );

      if (
        parsedUrl.origin ===
        window.location.origin
      ) {
        const pathname =
          parsedUrl.pathname;

        if (
          pathname.startsWith(
            "/admin/"
          )
        ) {
          return `${pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }

        if (
          pathname.includes(
            "clearance"
          ) ||
          pathname.includes(
            "request"
          ) ||
          pathname.includes(
            "submission"
          )
        ) {
          return "/admin/clearances";
        }

        if (
          pathname.includes(
            "approver"
          )
        ) {
          return "/admin/approver-management";
        }

        if (
          pathname.includes(
            "student"
          )
        ) {
          return "/admin/students";
        }
      }
    } catch (error) {
      console.warn(
        "Invalid notification action URL:",
        rawActionUrl,
        error
      );
    }
  }

  const entityType =
    String(
      notification?.entity_type ||
        ""
    )
      .trim()
      .toLowerCase();

  const searchableContent =
    [
      notification?.title,
      notification?.message,
      entityType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  if (
    entityType.includes(
      "clearance"
    ) ||
    entityType.includes(
      "submission"
    ) ||
    entityType.includes(
      "requirement"
    ) ||
    searchableContent.includes(
      "clearance"
    ) ||
    searchableContent.includes(
      "requirement"
    ) ||
    searchableContent.includes(
      "approved"
    ) ||
    searchableContent.includes(
      "rejected"
    )
  ) {
    return "/admin/clearances";
  }

  if (
    entityType.includes(
      "class"
    ) ||
    entityType.includes(
      "offering"
    ) ||
    entityType.includes(
      "section"
    )
  ) {
    return "/admin/class-assignments";
  }

  if (
    entityType.includes(
      "subject"
    )
  ) {
    return "/admin/subjects";
  }

  if (
    entityType.includes(
      "course"
    )
  ) {
    return "/admin/courses";
  }

  if (
    entityType.includes(
      "office"
    )
  ) {
    return "/admin/offices";
  }

  if (
    entityType.includes(
      "approver"
    ) ||
    notification?.recipient
      ?.role === "Approver"
  ) {
    return "/admin/approver-management";
  }

  if (
    entityType.includes(
      "student"
    ) ||
    entityType.includes(
      "registration"
    ) ||
    notification?.recipient
      ?.role === "Student"
  ) {
    return "/admin/students";
  }

  if (
    entityType.includes(
      "user"
    )
  ) {
    return "/admin/users";
  }

  return "/admin/dashboard";
};

const getAdminNotificationActionLabel = (
  route
) => {
  if (
    route.includes(
      "/admin/clearances"
    )
  ) {
    return "Open Clearance Records";
  }

  if (
    route.includes(
      "/admin/students"
    )
  ) {
    return "Open Student Management";
  }

  if (
    route.includes(
      "/admin/approver-management"
    )
  ) {
    return "Open Approver Management";
  }

  if (
    route.includes(
      "/admin/class-assignments"
    )
  ) {
    return "Open Class Assignments";
  }

  if (
    route.includes(
      "/admin/subjects"
    )
  ) {
    return "Open Subject Management";
  }

  if (
    route.includes(
      "/admin/courses"
    )
  ) {
    return "Open Course Management";
  }

  if (
    route.includes(
      "/admin/offices"
    )
  ) {
    return "Open Office Management";
  }

  if (
    route.includes(
      "/admin/users"
    )
  ) {
    return "Open User Management";
  }

  return "Open Dashboard";
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

function Notifications() {
  const navigate =
    useNavigate();

  const [admin, setAdmin] = useState(null);
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [roleFilter, setRoleFilter] =
    useState("All");

  const [readFilter, setReadFilter] =
    useState("All");

  /*
  |--------------------------------------------------------------------------
  | LOAD SYSTEM NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const loadNotifications = useCallback(async () => {
    try {
      /*
      |--------------------------------------------------------------------------
      | AUTHENTICATED ADMINISTRATOR
      |--------------------------------------------------------------------------
      */

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        throw new Error(
          "Please log in before accessing this page."
        );
      }

      const {
        data: adminProfile,
        error: adminError,
      } = await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          full_name,
          email,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (adminError) throw adminError;

      if (
        adminProfile.role !==
        "Administrator"
      ) {
        throw new Error(
          "This page is only available to Administrator accounts."
        );
      }

      if (
        adminProfile.status !== "Active"
      ) {
        throw new Error(
          "Your Administrator account is not active."
        );
      }

      setAdmin(adminProfile);

      /*
      |--------------------------------------------------------------------------
      | LOAD ALL NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      const {
        data: notificationData,
        error: notificationError,
      } = await supabase
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
        .order("created_at", {
          ascending: false,
        });

      if (notificationError) {
        throw notificationError;
      }

      const safeNotifications =
        notificationData || [];

      if (
        safeNotifications.length === 0
      ) {
        setNotifications([]);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | LOAD NOTIFICATION RECIPIENTS
      |--------------------------------------------------------------------------
      */

      const userIds = uniqueIds(
        safeNotifications.map(
          (notification) =>
            notification.user_id
        )
      );

      let recipients = [];

      if (userIds.length > 0) {
        const {
          data: userData,
          error: userError,
        } = await supabase
          .from("users")
          .select(`
            id,
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
          .in("id", userIds);

        if (userError) {
          console.warn(
            "Notification recipients could not be fully loaded:",
            userError
          );
        } else {
          recipients = userData || [];
        }
      }

      /*
      |--------------------------------------------------------------------------
      | ENRICH NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      const recipientMap = new Map(
        recipients.map((recipient) => [
          recipient.id,
          recipient,
        ])
      );

      const enrichedNotifications =
        safeNotifications.map(
          (notification) => ({
            ...notification,

            recipient:
              recipientMap.get(
                notification.user_id
              ) || null,
          })
        );

      setNotifications(
        enrichedNotifications
      );
    } catch (error) {
      console.error(
        "Admin notifications error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Load Notifications",
        text:
          error?.message ||
          "An unexpected error occurred while loading system notifications.",
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
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    const unread =
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length;

    const success =
      notifications.filter(
        (notification) =>
          notification.type ===
          "Success"
      ).length;

    const issues =
      notifications.filter(
        (notification) =>
          notification.type ===
            "Warning" ||
          notification.type === "Error"
      ).length;

    return {
      total: notifications.length,
      unread,
      success,
      issues,
    };
  }, [notifications]);

  /*
  |--------------------------------------------------------------------------
  | FILTER OPTIONS
  |--------------------------------------------------------------------------
  */

  const roleOptions = useMemo(() => {
    return uniqueIds(
      notifications.map(
        (notification) =>
          notification.recipient?.role
      )
    ).sort();
  }, [notifications]);

  /*
  |--------------------------------------------------------------------------
  | FILTER NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const filteredNotifications =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return notifications.filter(
        (notification) => {
          const recipient =
            notification.recipient;

          const searchableContent = [
            notification.title,
            notification.message,
            notification.type,
            notification.entity_type,
            notification.entity_id,
            recipient?.full_name,
            recipient?.email,
            recipient?.student_id,
            recipient?.employee_id,
            recipient?.role,
            recipient?.course,
            recipient?.year_level,
            recipient?.section,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch
            );

          const matchesType =
            typeFilter === "All" ||
            notification.type ===
              typeFilter;

          const matchesRole =
            roleFilter === "All" ||
            recipient?.role ===
              roleFilter;

          const matchesReadStatus =
            readFilter === "All" ||
            (readFilter === "Unread" &&
              !notification.is_read) ||
            (readFilter === "Read" &&
              notification.is_read);

          return (
            matchesSearch &&
            matchesType &&
            matchesRole &&
            matchesReadStatus
          );
        }
      );
    }, [
      notifications,
      searchTerm,
      typeFilter,
      roleFilter,
      readFilter,
    ]);

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
  | CLEAR FILTERS
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("All");
    setRoleFilter("All");
    setReadFilter("All");
  };

  const openNotificationRecord = (
    notification
  ) => {
    const destination =
      resolveAdminNotificationRoute(
        notification
      );

    /*
    The Administrator is monitoring notifications delivered to all roles.
    Opening a record must not mark another user's notification as read.
    */

    navigate(
      destination,
      {
        state: {
          source:
            "admin-notification",
          notification,
          focus: {
            entityType:
              notification.entity_type ||
              null,
            entityId:
              notification.entity_id ||
              null,
            recipientId:
              notification.user_id ||
              null,
          },
        },
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading system notifications...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-48 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-[34rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <motion.section
        initial={{ opacity: 0, y: -18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.62,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${campusImage})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0c4a8a]/82" />

        <motion.div
          animate={{
            x: [0, 24, 0],
            y: [0, -14, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <motion.div
              whileHover={{ rotate: 4, scale: 1.04 }}
              className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
            >
              <img
                src={schoolLogo}
                alt="Consolatrix College of Toledo City seal"
                className="h-full w-full rounded-full object-cover"
              />
            </motion.div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-cyan-200 backdrop-blur-md">
                <FaBell />
                System Activity
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                System Notifications
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Monitor notifications delivered to students, approvers, and administrators across SmartClear AI.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
          >
            <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </motion.button>
        </div>
      </motion.section>


      {/* Statistics */}

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Notifications
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.total}
              </h2>
            </div>

            <div className="rounded-2xl bg-blue-700 p-5 text-3xl text-white">
              <FaBell />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Unread
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.unread}
              </h2>
            </div>

            <div className="rounded-2xl bg-yellow-500 p-5 text-3xl text-white">
              <FaExclamationTriangle />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Successful Updates
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.success}
              </h2>
            </div>

            <div className="rounded-2xl bg-green-600 p-5 text-3xl text-white">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Warnings and Errors
              </p>

              <h2 className="mt-2 text-4xl font-bold text-slate-800">
                {statistics.issues}
              </h2>
            </div>

            <div className="rounded-2xl bg-red-600 p-5 text-3xl text-white">
              <FaExclamationCircle />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}

      <div className="mb-7 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search title, message, recipient, email, student ID, or entity..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            <FaFilter />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notification Type
              </label>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Types
                </option>

                <option value="Info">
                  Info
                </option>

                <option value="Success">
                  Success
                </option>

                <option value="Warning">
                  Warning
                </option>

                <option value="Error">
                  Error
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Recipient Role
              </label>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Roles
                </option>

                {roleOptions.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Read Status
              </label>

              <select
                value={readFilter}
                onChange={(event) =>
                  setReadFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
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

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-300 px-5 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Results */}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_20px_52px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Notification Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredNotifications.length} of{" "}
              {notifications.length} record(s)
              displayed
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            Monitoring only
          </div>
        </div>

        {filteredNotifications.length ===
        0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl text-slate-400">
              <FaBell />
            </div>

            <h3 className="mt-5 text-2xl font-bold text-slate-700">
              No Notifications Found
            </h3>

            <p className="mt-2 text-slate-500">
              No records match the current
              search and filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map(
              (notification) => {
                const recipient =
                  notification.recipient;

                return (
                  <motion.div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.995,
                    }}
                    onClick={() =>
                      openNotificationRecord(
                        notification
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        openNotificationRecord(
                          notification
                        );
                      }
                    }}
                    className={`cursor-pointer p-6 outline-none transition focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-200 ${
                      notification.is_read
                        ? "bg-white hover:bg-slate-50"
                        : "bg-blue-50/40 hover:bg-blue-50/70"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                      {/* Icon */}

                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${getNotificationIconBackground(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      {/* Main Content */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-800">
                                {notification.title}
                              </h3>

                              {!notification.is_read && (
                                <span className="h-3 w-3 rounded-full bg-blue-600" />
                              )}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-slate-600">
                              {notification.message}
                            </p>
                          </div>

                          <div className="shrink-0 text-left md:text-right">
                            <p className="text-sm font-semibold text-slate-500">
                              {formatRelativeTime(
                                notification.created_at
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(
                                notification.created_at
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Recipient */}

                        <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Recipient
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                              {getRoleIcon(
                                recipient?.role
                              )}

                              <div>
                                <p className="font-semibold text-slate-700">
                                  {recipient?.full_name ||
                                    "Unknown User"}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {recipient?.student_id ||
                                    recipient?.employee_id ||
                                    recipient?.email ||
                                    "No account identifier"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Recipient Role
                            </p>

                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getRoleBadgeClass(
                                recipient?.role
                              )}`}
                            >
                              {recipient?.role ||
                                "Unknown"}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Type
                            </p>

                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getTypeBadgeClass(
                                notification.type
                              )}`}
                            >
                              {notification.type}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Read Status
                            </p>

                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                                notification.is_read
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {notification.is_read
                                ? "Read"
                                : "Unread"}
                            </span>

                            {notification.read_at && (
                              <p className="mt-2 text-xs text-slate-400">
                                {formatDateTime(
                                  notification.read_at
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}

                        <div className="mt-4 flex flex-wrap gap-3">
                          {notification.entity_type && (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              Entity:{" "}
                              {
                                notification.entity_type
                              }
                            </span>
                          )}

                          {notification.entity_id && (
                            <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              ID:{" "}
                              {
                                notification.entity_id
                              }
                            </span>
                          )}

                          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            <FaArrowRight />

                            {getAdminNotificationActionLabel(
                              resolveAdminNotificationRoute(
                                notification
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        )}
      </div>
      </motion.main>
    </AdminLayout>
  );
}

export default Notifications;