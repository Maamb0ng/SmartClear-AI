import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
  FaCheckCircle,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaBuilding,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";

import {
  getOfficeStaffContext,
} from "../../services/officeStaffService";

function Sidebar({
  onNavigate,
}) {
  const navigate =
    useNavigate();

  const [
    officeName,
    setOfficeName,
  ] = useState(
    "Loading..."
  );

  const [
    officeCode,
    setOfficeCode,
  ] = useState("");

  const [
    loadingOffice,
    setLoadingOffice,
  ] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOffice =
      async () => {
        try {
          setLoadingOffice(
            true
          );

          const context =
            await getOfficeStaffContext();

          if (!mounted) {
            return;
          }

          const office =
            context?.office ||
            context?.offices?.[0];

          const resolvedName =
            office?.office_name ||
            office?.name ||
            "Office";

          const resolvedCode =
            office?.office_code ||
            office?.code ||
            "";

          setOfficeName(
            resolvedName
          );

          setOfficeCode(
            resolvedCode
          );
        } catch (error) {
          console.error(
            "Failed to load Office Staff sidebar context:",
            error
          );

          if (mounted) {
            setOfficeName(
              "Office"
            );

            setOfficeCode(
              ""
            );
          }
        } finally {
          if (mounted) {
            setLoadingOffice(
              false
            );
          }
        }
      };

    loadOffice();

    return () => {
      mounted = false;
    };
  }, []);

  const handleNavigate =
    () => {
      if (onNavigate) {
        onNavigate();
      }
    };

  const handleLogout =
    async () => {
      try {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        handleNavigate();

        navigate(
          "/login",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Office Staff logout error:",
          error
        );
      }
    };

  const menuGroups = [
    {
      title: "Workspace",
      items: [
        {
          label:
            "Overview",
          path:
            "/office/dashboard",
          icon: FaHome,
        },
        {
          label:
            "Schedule & Batches",
          path:
            "/office/schedule",
          icon:
            FaCalendarAlt,
        },
        {
          label:
            "Student Queue",
          path:
            "/office/students",
          icon: FaUsers,
        },
        {
          label:
            "Requirements",
          path:
            "/office/requirements",
          icon:
            FaClipboardList,
        },
      ],
    },
    {
      title: "Clearance",
      items: [
        {
          label:
            "Reviewed Students",
          path:
            "/office/reviewed",
          icon:
            FaCheckCircle,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label:
            "Notifications",
          path:
            "/office/notifications",
          icon: FaBell,
        },
        {
          label:
            "Profile",
          path:
            "/office/profile",
          icon:
            FaUserCircle,
        },
      ],
    },
  ];

  const getNavClass = ({
    isActive,
  }) =>
    [
      "group flex items-center gap-3 rounded-xl px-3 py-2.5",
      "text-sm font-semibold transition-all duration-200",
      isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
        : "text-slate-300 hover:bg-white/10 hover:text-white",
    ].join(" ");

  return (
    <aside className="flex h-full w-full flex-col bg-slate-950 text-white">
      {/* =====================================================
          BRAND
      ===================================================== */}

      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg shadow-lg shadow-blue-950/30">
            <FaBuilding />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight">
              SmartClear AI
            </h1>

            <p className="truncate text-xs font-semibold text-slate-400">
              Office Staff
              Portal
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          CURRENT OFFICE
      ===================================================== */}

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <FaBuilding />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Current
                Office
              </p>

              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-bold text-white">
                  {loadingOffice
                    ? "Loading..."
                    : officeName}
                </p>

                {!loadingOffice &&
                  officeCode && (
                    <span className="shrink-0 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-300">
                      {
                        officeCode
                      }
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {menuGroups.map(
            (group) => (
              <div
                key={
                  group.title
                }
              >
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {
                    group.title
                  }
                </p>

                <div className="space-y-1">
                  {group.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <NavLink
                          key={
                            item.path
                          }
                          to={
                            item.path
                          }
                          onClick={
                            handleNavigate
                          }
                          className={
                            getNavClass
                          }
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 transition group-hover:bg-white/10">
                            <Icon className="text-sm" />
                          </span>

                          <span className="truncate">
                            {
                              item.label
                            }
                          </span>
                        </NavLink>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </nav>

      {/* =====================================================
          FOOTER / LOGOUT
      ===================================================== */}

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={
            handleLogout
          }
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <FaSignOutAlt className="text-sm" />
          </span>

          <span>
            Sign Out
          </span>
        </button>

        <p className="mt-4 text-center text-[10px] font-medium text-slate-600">
          SmartClear AI
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;