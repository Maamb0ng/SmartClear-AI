import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  FaBookOpen,
  FaBuilding,
  FaChalkboardTeacher,
  FaCheck,
  FaEdit,
  FaEnvelope,
  FaGraduationCap,
  FaIdBadge,
  FaIdCard,
  FaLayerGroup,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaUser,
  FaUserGraduate,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

import {
  getUsers,
  approveUser,
  rejectUser,
  deleteUser,
  updateUser,
} from "../../services/userService";

const USER_TABS = [
  {
    key: "students",
    label: "Students",
    description: "Student accounts and academic details",
    icon: FaUserGraduate,
  },
  {
    key: "approvers",
    label: "Teachers & Approvers",
    description: "Faculty and office clearance approvers",
    icon: FaChalkboardTeacher,
  },
  {
    key: "administrators",
    label: "Administrators",
    description: "System administrators and privileged access",
    icon: FaUserShield,
  },
];

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getUserGroup = (user) => {
  const role = normalizeValue(user?.role);

  if (
    role === "student" ||
    role.includes("student")
  ) {
    return "students";
  }

  if (
    role === "administrator" ||
    role === "admin" ||
    role.includes("administrator")
  ) {
    return "administrators";
  }

  if (
    role === "approver" ||
    role === "teacher" ||
    role === "faculty" ||
    role.includes("approver") ||
    role.includes("teacher") ||
    role.includes("faculty")
  ) {
    return "approvers";
  }

  return "approvers";
};

const getInitials = (name) => {
  const words = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "US";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
};

const getStatusClasses = (status) => {
  const normalized = normalizeValue(status);

  if (normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    normalized === "inactive" ||
    normalized === "rejected"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
};

const getRoleClasses = (group) => {
  if (group === "students") {
    return {
      badge: "bg-blue-100 text-blue-700",
      avatar:
        "from-blue-700 to-indigo-600",
      icon: FaUserGraduate,
    };
  }

  if (group === "approvers") {
    return {
      badge: "bg-violet-100 text-violet-700",
      avatar:
        "from-violet-700 to-fuchsia-600",
      icon: FaChalkboardTeacher,
    };
  }

  return {
    badge: "bg-slate-800 text-white",
    avatar:
      "from-slate-800 to-slate-600",
    icon: FaUserShield,
  };
};

const getStudentBlock = (user) => {
  return (
    user?.sections?.block_code ||
    user?.section_details?.block_code ||
    user?.official_section?.block_code ||
    user?.section ||
    user?.block ||
    user?.block_code ||
    ""
  );
};

function UserManagement() {
  const [
    users,
    setUsers,
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
    search,
    setSearch,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState("students");

  const [
    editingUser,
    setEditingUser,
  ] = useState(null);

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  const [
    busyUserId,
    setBusyUserId,
  ] = useState(null);

  const [
    editData,
    setEditData,
  ] = useState({
    full_name: "",
    role: "",
    department: "",
    course: "",
    year_level: "",
    block: "",
    office: "",
  });

  async function loadUsers(
    silent = false
  ) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data =
        await getUsers();

      setUsers(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Load users error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Load Users",
        text:
          error?.message ||
          "An unexpected error occurred while loading user accounts.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const userCounts =
    useMemo(() => {
      const counts = {
        students: 0,
        approvers: 0,
        administrators: 0,
        pending: 0,
        active: 0,
      };

      users.forEach(
        (user) => {
          const group =
            getUserGroup(
              user
            );

          counts[group] += 1;

          const status =
            normalizeValue(
              user.status
            );

          if (
            status ===
            "pending"
          ) {
            counts.pending +=
              1;
          }

          if (
            status ===
            "active"
          ) {
            counts.active +=
              1;
          }
        }
      );

      return counts;
    }, [users]);

  const currentTab =
    useMemo(
      () =>
        USER_TABS.find(
          (tab) =>
            tab.key ===
            activeTab
        ) ||
        USER_TABS[0],
      [activeTab]
    );

  const CurrentTabIcon =
    currentTab.icon;

  const filteredUsers =
    useMemo(() => {
      const keyword =
        normalizeValue(
          search
        );

      return users
        .filter(
          (user) =>
            getUserGroup(
              user
            ) ===
            activeTab
        )
        .filter(
          (user) => {
            if (!keyword) {
              return true;
            }

            return [
              user.full_name,
              user.email,
              user.student_id,
              user.employee_id,
              user.role,
              user.department,
              user.course,
              user.year_level,
              getStudentBlock(user),
              user.office,
              user.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(
                keyword
              );
          }
        );
    }, [
      users,
      activeTab,
      search,
    ]);

  async function handleApprove(
    user
  ) {
    const isStudent =
      getUserGroup(
        user
      ) === "students";

    const result =
      await Swal.fire({
        title:
          "Approve Account?",
        html: `
          <div style="text-align:left; line-height:1.65;">
            <strong>${user.full_name || "This user"}</strong> will be allowed to sign in to SmartClear AI.
            ${
              isStudent
                ? "<br><br><span style='color:#b45309;'>Confirm that the student's official academic assignment has already been verified.</span>"
                : ""
            }
          </div>
        `,
        icon:
          "question",
        showCancelButton:
          true,
        confirmButtonText:
          "Approve Account",
        cancelButtonText:
          "Cancel",
        confirmButtonColor:
          "#16a34a",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      setBusyUserId(
        user.id
      );

      await approveUser(user);

      await Swal.fire({
        icon:
          "success",
        title:
          "Account Approved",
        text:
          `${user.full_name || "The user"} can now access SmartClear AI.`,
        timer: 1500,
        showConfirmButton:
          false,
      });

      await loadUsers(
        true
      );
    } catch (error) {
      console.error(
        "Approve user error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Approval Failed",
        text:
          error?.message ||
          "The account could not be approved.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setBusyUserId(
        null
      );
    }
  }

  async function handleReject(
    user
  ) {
    const result =
      await Swal.fire({
        title:
          "Deactivate Account?",
        text:
          `${user.full_name || "This user"} will no longer be able to sign in.`,
        icon:
          "warning",
        showCancelButton:
          true,
        confirmButtonText:
          "Deactivate",
        cancelButtonText:
          "Cancel",
        confirmButtonColor:
          "#d97706",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      setBusyUserId(
        user.id
      );

      await rejectUser(
        user.id
      );

      await Swal.fire({
        icon:
          "success",
        title:
          "Account Deactivated",
        timer: 1400,
        showConfirmButton:
          false,
      });

      await loadUsers(
        true
      );
    } catch (error) {
      console.error(
        "Deactivate user error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Action Failed",
        text:
          error?.message ||
          "The account status could not be updated.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setBusyUserId(
        null
      );
    }
  }

  async function handleDelete(
    user
  ) {
    const result =
      await Swal.fire({
        title:
          "Delete User Record?",
        html: `
          <div style="text-align:left; line-height:1.65;">
            You are about to delete <strong>${user.full_name || "this user"}</strong>.
            <br><br>
            <span style="color:#dc2626;">This action cannot be undone.</span>
          </div>
        `,
        icon:
          "warning",
        showCancelButton:
          true,
        confirmButtonColor:
          "#dc2626",
        confirmButtonText:
          "Delete User",
        cancelButtonText:
          "Cancel",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      setBusyUserId(
        user.id
      );

      await deleteUser(
        user.id
      );

      await Swal.fire({
        icon:
          "success",
        title:
          "User Deleted",
        timer: 1400,
        showConfirmButton:
          false,
      });

      await loadUsers(
        true
      );
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Delete Failed",
        text:
          error?.message ||
          "The user record could not be deleted.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setBusyUserId(
        null
      );
    }
  }

  function handleEdit(
    user
  ) {
    setEditingUser(
      user
    );

    setEditData({
      full_name:
        user.full_name ||
        "",
      role:
        user.role ||
        "",
      department:
        user.department ||
        "",
      course:
        user.course ||
        "",
      year_level:
        user.year_level ||
        "",
      block:
        getStudentBlock(user),
      office:
        user.office ||
        "",
    });
  }

  function closeEditModal() {
    if (savingEdit) {
      return;
    }

    setEditingUser(
      null
    );
  }

  function handleEditChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setEditData(
      (
        current
      ) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function saveEdit(
    event
  ) {
    event.preventDefault();

    if (
      !editingUser
    ) {
      return;
    }

    if (
      !editData.full_name.trim()
    ) {
      await Swal.fire({
        icon:
          "warning",
        title:
          "Full Name Required",
        text:
          "Enter the user's full name before saving.",
        confirmButtonColor:
          "#2563eb",
      });

      return;
    }

    try {
      setSavingEdit(
        true
      );

      await updateUser(
        editingUser.id,
        {
          ...editData,
          full_name:
            editData.full_name.trim(),
        }
      );

      setEditingUser(
        null
      );

      await Swal.fire({
        icon:
          "success",
        title:
          "User Updated",
        timer: 1400,
        showConfirmButton:
          false,
      });

      await loadUsers(
        true
      );
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Update Failed",
        text:
          error?.message ||
          "The user account could not be updated.",
        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setSavingEdit(
        false
      );
    }
  }

  const editGroup =
    getUserGroup({
      role:
        editData.role,
    });

  return (
    <AdminLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative space-y-6 overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-48 top-80 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Hero */}

        <motion.section
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/82" />

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

          <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={
                    schoolLogo
                  }
                  alt="Consolatrix College seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
                  <FaUsers className="text-cyan-300" />
                  Accounts & Access
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  User Management
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/75">
                  Students, faculty approvers, office approvers, and
                  administrators are now organized into separate account
                  groups for a cleaner management workflow.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              type="button"
              onClick={() =>
                loadUsers(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 lg:self-center"
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
                : "Refresh Accounts"}
            </motion.button>
          </div>
        </motion.section>

        {/* Summary cards */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Students",
              value:
                userCounts.students,
              note:
                "Registered learners",
              icon:
                FaUserGraduate,
              classes:
                "from-blue-600 to-indigo-600",
            },
            {
              label:
                "Teachers & Approvers",
              value:
                userCounts.approvers,
              note:
                "Faculty and offices",
              icon:
                FaChalkboardTeacher,
              classes:
                "from-violet-600 to-fuchsia-600",
            },
            {
              label:
                "Administrators",
              value:
                userCounts.administrators,
              note:
                "Privileged accounts",
              icon:
                FaUserShield,
              classes:
                "from-slate-800 to-slate-600",
            },
            {
              label:
                "Pending Approval",
              value:
                userCounts.pending,
              note:
                `${userCounts.active} active accounts`,
              icon:
                FaShieldAlt,
              classes:
                "from-amber-500 to-orange-500",
            },
          ].map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              return (
                <motion.article
                  key={
                    item.label
                  }
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.08 +
                      index *
                        0.05,
                  }}
                  whileHover={{
                    y: -5,
                  }}
                  className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)]"
                >
                  <div
                    className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${item.classes} opacity-10 blur-2xl`}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-2 text-3xl font-black text-slate-900">
                        {
                          item.value
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          item.note
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.classes} text-lg text-white shadow-lg`}
                    >
                      <Icon />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* Account categories */}

        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-3 shadow-[0_16px_44px_rgba(15,23,42,0.07)]">
          <div className="grid gap-3 lg:grid-cols-3">
            {USER_TABS.map(
              (
                tab,
                index
              ) => {
                const Icon =
                  tab.icon;

                const isActive =
                  activeTab ===
                  tab.key;

                return (
                  <motion.button
                    key={
                      tab.key
                    }
                    initial={{
                      opacity: 0,
                      x: -12,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        0.12 +
                        index *
                          0.05,
                    }}
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale:
                        0.99,
                    }}
                    type="button"
                    onClick={() => {
                      setActiveTab(
                        tab.key
                      );

                      setSearch("");
                    }}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-blue-700 bg-[#071b4b] text-white shadow-[0_12px_30px_rgba(7,27,75,0.22)]"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-user-group"
                        className="absolute inset-x-0 bottom-0 h-1 bg-cyan-300"
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-white/10 text-cyan-300"
                            : "bg-white text-blue-700 shadow-sm"
                        }`}
                      >
                        <Icon />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black">
                            {
                              tab.label
                            }
                          </p>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isActive
                                ? "bg-white/10 text-cyan-200"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {
                              userCounts[
                                tab.key
                              ]
                            }
                          </span>
                        </div>

                        <p
                          className={`mt-1 text-xs ${
                            isActive
                              ? "text-blue-100/60"
                              : "text-slate-500"
                          }`}
                        >
                          {
                            tab.description
                          }
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              }
            )}
          </div>
        </section>

        {/* Search and active group header */}

        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CurrentTabIcon />
            </div>

            <div>
              <h2 className="font-black text-slate-900">
                {
                  currentTab.label
                }
              </h2>

              <p className="text-xs text-slate-500">
                {
                  filteredUsers.length
                } displayed account
                {filteredUsers.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:max-w-md">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              placeholder={`Search ${currentTab.label.toLowerCase()}...`}
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
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </section>

        {/* User table */}

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100/90">
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-5 py-4">
                    Account
                  </th>

                  <th className="px-5 py-4">
                    {activeTab ===
                    "students"
                      ? "Student ID"
                      : "Employee ID"}
                  </th>

                  <th className="px-5 py-4">
                    {activeTab ===
                    "students"
                      ? "Academic Details"
                      : activeTab ===
                        "approvers"
                      ? "Assignment"
                      : "Access Level"}
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <AnimatePresence
                mode="wait"
              >
                <motion.tbody
                  key={
                    activeTab
                  }
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration:
                      0.22,
                  }}
                >
                  {loading ? (
                    Array.from({
                      length: 4,
                    }).map(
                      (
                        _,
                        index
                      ) => (
                        <tr
                          key={
                            index
                          }
                          className="border-t border-slate-100"
                        >
                          <td className="px-5 py-5">
                            <div className="flex animate-pulse items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-slate-200" />

                              <div className="space-y-2">
                                <div className="h-3 w-36 rounded bg-slate-200" />
                                <div className="h-2.5 w-48 rounded bg-slate-100" />
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                          </td>

                          <td className="px-5 py-5">
                            <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                          </td>

                          <td className="px-5 py-5">
                            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
                          </td>

                          <td className="px-5 py-5">
                            <div className="mx-auto h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
                          </td>
                        </tr>
                      )
                    )
                  ) : filteredUsers.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-16 text-center"
                      >
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-300">
                          <CurrentTabIcon />
                        </div>

                        <h3 className="mt-5 text-lg font-black text-slate-700">
                          No{" "}
                          {
                            currentTab.label
                          }{" "}
                          Found
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {search
                            ? "Try a different search term."
                            : "There are no accounts in this category yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(
                      (
                        user,
                        index
                      ) => {
                        const group =
                          getUserGroup(
                            user
                          );

                        const roleStyle =
                          getRoleClasses(
                            group
                          );

                        const RoleIcon =
                          roleStyle.icon;

                        const isBusy =
                          busyUserId ===
                          user.id;

                        return (
                          <motion.tr
                            key={
                              user.id
                            }
                            initial={{
                              opacity: 0,
                              y: 10,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay:
                                index *
                                0.035,
                            }}
                            className={`border-t border-slate-100 transition hover:bg-slate-50/80 ${
                              isBusy
                                ? "pointer-events-none opacity-60"
                                : ""
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="flex min-w-[250px] items-center gap-4">
                                <motion.div
                                  whileHover={{
                                    rotate:
                                      -4,
                                    scale:
                                      1.04,
                                  }}
                                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${roleStyle.avatar} text-sm font-black text-white shadow-lg`}
                                >
                                  {getInitials(
                                    user.full_name
                                  )}

                                  {normalizeValue(
                                    user.status
                                  ) ===
                                    "active" && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                                  )}
                                </motion.div>

                                <div className="min-w-0">
                                  <h3 className="truncate font-black text-slate-900">
                                    {user.full_name ||
                                      "No Name"}
                                  </h3>

                                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    <FaEnvelope className="shrink-0" />

                                    <span className="max-w-[220px] truncate">
                                      {user.email ||
                                        "No email address"}
                                    </span>
                                  </div>

                                  <span
                                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${roleStyle.badge}`}
                                  >
                                    <RoleIcon />
                                    {user.role ||
                                      "Unassigned Role"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex min-w-[130px] items-center gap-2 text-sm font-bold text-slate-700">
                                {group ===
                                "students" ? (
                                  <FaIdCard className="text-blue-600" />
                                ) : (
                                  <FaIdBadge className="text-violet-600" />
                                )}

                                {group ===
                                "students"
                                  ? user.student_id ||
                                    "Not assigned"
                                  : user.employee_id ||
                                    "Not assigned"}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {group ===
                              "students" ? (
                                <div className="min-w-[190px]">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <FaGraduationCap className="text-emerald-600" />

                                    {user.course ||
                                      "Course not assigned"}
                                  </div>

                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <FaLayerGroup />

                                    {user.year_level ||
                                      "Year not assigned"}
                                  </div>

                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <FaLayerGroup />

                                    {getStudentBlock(user)
                                      ? `Block ${getStudentBlock(user)}`
                                      : "Block not assigned"}
                                  </div>
                                </div>
                              ) : group ===
                                "approvers" ? (
                                <div className="min-w-[190px]">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <FaBuilding className="text-violet-600" />

                                    {user.office ||
                                      user.department ||
                                      "Assignment not set"}
                                  </div>

                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <FaBookOpen />

                                    {user.department ||
                                      "Department not set"}
                                  </div>
                                </div>
                              ) : (
                                <div className="min-w-[180px]">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <FaShieldAlt className="text-slate-700" />
                                    Full System Access
                                  </div>

                                  <p className="mt-2 text-xs text-slate-500">
                                    {user.department ||
                                      "Administration"}
                                  </p>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClasses(
                                  user.status
                                )}`}
                              >
                                <span className="h-2 w-2 rounded-full bg-current opacity-75" />

                                {user.status ||
                                  "Unknown"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex min-w-[180px] items-center justify-center gap-2">
                                {normalizeValue(
                                  user.status
                                ) ===
                                  "pending" && (
                                  <motion.button
                                    whileHover={{
                                      y:
                                        -2,
                                    }}
                                    whileTap={{
                                      scale:
                                        0.95,
                                    }}
                                    type="button"
                                    title="Approve account"
                                    onClick={() =>
                                      handleApprove(
                                        user
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                                  >
                                    <FaCheck />
                                  </motion.button>
                                )}

                                {normalizeValue(
                                  user.status
                                ) !==
                                  "inactive" && (
                                  <motion.button
                                    whileHover={{
                                      y:
                                        -2,
                                    }}
                                    whileTap={{
                                      scale:
                                        0.95,
                                    }}
                                    type="button"
                                    title="Deactivate account"
                                    onClick={() =>
                                      handleReject(
                                        user
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition hover:bg-amber-500 hover:text-white"
                                  >
                                    <FaTimes />
                                  </motion.button>
                                )}

                                <motion.button
                                  whileHover={{
                                    y:
                                      -2,
                                  }}
                                  whileTap={{
                                    scale:
                                      0.95,
                                  }}
                                  type="button"
                                  title="Edit account"
                                  onClick={() =>
                                    handleEdit(
                                      user
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition hover:bg-blue-600 hover:text-white"
                                >
                                  <FaEdit />
                                </motion.button>

                                <motion.button
                                  whileHover={{
                                    y:
                                      -2,
                                  }}
                                  whileTap={{
                                    scale:
                                      0.95,
                                  }}
                                  type="button"
                                  title="Delete user"
                                  onClick={() =>
                                    handleDelete(
                                      user
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 transition hover:bg-rose-600 hover:text-white"
                                >
                                  <FaTrash />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      }
                    )
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        </section>

        {/* Edit account modal */}

        <AnimatePresence>
          {editingUser && (
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
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
              onClick={
                closeEditModal
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 28,
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
                  y: 20,
                  scale:
                    0.97,
                }}
                transition={{
                  duration:
                    0.24,
                }}
                onClick={(
                  event
                ) =>
                  event.stopPropagation()
                }
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]"
              >
                <div className="relative overflow-hidden bg-[#061b51] p-5 text-white sm:p-6">
                  <motion.div
                    animate={{
                      x: [
                        0,
                        20,
                        0,
                      ],
                      y: [
                        0,
                        -12,
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
                    className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl"
                  />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xl text-cyan-300">
                        <FaEdit />
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                          Account Editor
                        </p>

                        <h2 className="mt-1 text-2xl font-black">
                          Edit User
                        </h2>

                        <p className="mt-1 text-xs text-blue-100/60">
                          Update role-specific account information.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeEditModal
                      }
                      disabled={
                        savingEdit
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-blue-100 transition hover:bg-white/15 disabled:opacity-50"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={
                    saveEdit
                  }
                  className="space-y-5 p-5 sm:p-6"
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-bold text-slate-700">
                        Full Name
                      </span>

                      <input
                        type="text"
                        name="full_name"
                        value={
                          editData.full_name
                        }
                        onChange={
                          handleEditChange
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        required
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-bold text-slate-700">
                        Role
                      </span>

                      <select
                        name="role"
                        value={
                          editData.role
                        }
                        onChange={
                          handleEditChange
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="Student">
                          Student
                        </option>

                        <option value="Approver">
                          Teacher / Approver
                        </option>

                        <option value="Administrator">
                          Administrator
                        </option>
                      </select>
                    </label>

                    {editGroup ===
                      "students" && (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Course
                          </span>

                          <input
                            type="text"
                            name="course"
                            value={
                              editData.course
                            }
                            onChange={
                              handleEditChange
                            }
                            placeholder="e.g. BSIT"
                            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Year Level
                          </span>

                          <input
                            type="text"
                            name="year_level"
                            value={
                              editData.year_level
                            }
                            onChange={
                              handleEditChange
                            }
                            placeholder="e.g. 4th Year"
                            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Block
                          </span>

                          <input
                            type="text"
                            name="block"
                            value={
                              editData.block
                            }
                            onChange={
                              handleEditChange
                            }
                            placeholder="e.g. A"
                            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm uppercase outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>
                      </>
                    )}

                    {editGroup ===
                      "approvers" && (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Department
                          </span>

                          <input
                            type="text"
                            name="department"
                            value={
                              editData.department
                            }
                            onChange={
                              handleEditChange
                            }
                            placeholder="e.g. College Department"
                            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-bold text-slate-700">
                            Office
                          </span>

                          <input
                            type="text"
                            name="office"
                            value={
                              editData.office
                            }
                            onChange={
                              handleEditChange
                            }
                            placeholder="e.g. Registrar"
                            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>
                      </>
                    )}

                    {editGroup ===
                      "administrators" && (
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          Department
                        </span>

                        <input
                          type="text"
                          name="department"
                          value={
                            editData.department
                          }
                          onChange={
                            handleEditChange
                          }
                          placeholder="e.g. System Administration"
                          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                    Students and approvers are visually separated here, but the
                    existing user service functions and database structure are
                    preserved.
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        closeEditModal
                      }
                      disabled={
                        savingEdit
                      }
                      className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{
                        y:
                          savingEdit
                            ? 0
                            : -2,
                      }}
                      whileTap={{
                        scale:
                          savingEdit
                            ? 1
                            : 0.98,
                      }}
                      type="submit"
                      disabled={
                        savingEdit
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaSave />

                      {savingEdit
                        ? "Saving Changes..."
                        : "Save Changes"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </AdminLayout>
  );
}

export default UserManagement;