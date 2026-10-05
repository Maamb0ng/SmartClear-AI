import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaBell,
  FaBuilding,
  FaChevronDown,
  FaUserCircle,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";

import {
  getOfficeStaffContext,
} from "../../services/officeStaffService";

function Topbar() {
  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    officeStaff,
    setOfficeStaff,
  ] = useState({
    id: "",
    name: "Office Staff",
    office: "Office",
    officeCode: "",
    role: "Office Staff",
    status: "",
    unreadNotifications: 0,
  });

  useEffect(() => {
    let mounted = true;

    const loadTopbar =
      async () => {
        try {
          setLoading(true);

          const context =
            await getOfficeStaffContext();

          if (!mounted) {
            return;
          }

          const profile =
            context?.profile;

          const office =
            context?.office ||
            context?.offices?.[0];

          const officeName =
            office?.office_name ||
            office?.name ||
            "Office";

          const officeCode =
            office?.office_code ||
            office?.code ||
            "";

          let unreadNotifications =
            0;

          if (profile?.id) {
            const {
              count,
              error:
                notificationError,
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
                profile.id
              )
              .eq(
                "is_read",
                false
              );

            if (
              notificationError
            ) {
              console.error(
                "Failed to load unread Office Staff notifications:",
                notificationError
              );
            } else {
              unreadNotifications =
                count || 0;
            }
          }

          if (!mounted) {
            return;
          }

          setOfficeStaff({
            id:
              profile?.id ||
              "",
            name:
              profile?.full_name ||
              "Office Staff",
            office:
              officeName,
            officeCode,
            role:
              "Office Staff",
            status:
              profile?.status ||
              "",
            unreadNotifications,
          });
        } catch (error) {
          console.error(
            "Failed to load Office Staff topbar:",
            error
          );

          if (mounted) {
            setOfficeStaff({
              id: "",
              name:
                "Office Staff",
              office:
                "Office",
              officeCode: "",
              role:
                "Office Staff",
              status: "",
              unreadNotifications:
                0,
            });
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadTopbar();

    return () => {
      mounted = false;
    };
  }, []);

  const initials =
    getInitials(
      officeStaff.name
    );

  const isActive =
    String(
      officeStaff.status ||
        ""
    ).toLowerCase() ===
    "active";

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/95">
      {/* =====================================================
          LEFT SIDE
      ===================================================== */}

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <FaBuilding />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-black text-slate-900 dark:text-white">
              {loading
                ? "Loading..."
                : officeStaff.office}
            </h2>

            {!loading &&
              isActive && (
                <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 sm:inline-flex">
                  Active
                </span>
              )}
          </div>

          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            Clearance Management
          </p>
        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}

      <div className="flex items-center gap-2">
        {/* NOTIFICATIONS */}

        <Link
          to="/office/notifications"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
        >
          <FaBell />

          {officeStaff.unreadNotifications >
            0 && (
            <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black text-white dark:border-slate-950">
              {officeStaff.unreadNotifications >
              9
                ? "9+"
                : officeStaff.unreadNotifications}
            </span>
          )}
        </Link>

        {/* PROFILE */}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setProfileOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white dark:bg-blue-600">
              {initials || (
                <FaUserCircle />
              )}
            </div>

            <div className="hidden min-w-0 text-left xl:block">
              <p className="max-w-[150px] truncate text-xs font-bold text-slate-900 dark:text-white">
                {loading
                  ? "Loading..."
                  : officeStaff.name}
              </p>

              <p className="max-w-[150px] truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {
                  officeStaff.role
                }
              </p>
            </div>

            <FaChevronDown
              className={`hidden text-[10px] text-slate-400 transition-transform duration-200 sm:block ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* PROFILE DROPDOWN */}

          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                onClick={() =>
                  setProfileOpen(
                    false
                  )
                }
                className="fixed inset-0 z-40 cursor-default"
              />

              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {initials || (
                        <FaUserCircle />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {
                          officeStaff.name
                        }
                      </p>

                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {
                          officeStaff.office
                        }
                      </p>

                      {officeStaff.officeCode && (
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                          {
                            officeStaff.officeCode
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    to="/office/profile"
                    onClick={() =>
                      setProfileOpen(
                        false
                      )
                    }
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FaUserCircle className="text-slate-400" />

                    My Profile
                  </Link>

                  <Link
                    to="/office/notifications"
                    onClick={() =>
                      setProfileOpen(
                        false
                      )
                    }
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-3">
                      <FaBell className="text-slate-400" />

                      Notifications
                    </span>

                    {officeStaff.unreadNotifications >
                      0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {
                          officeStaff.unreadNotifications
                        }
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getInitials(
  name
) {
  return String(
    name || ""
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default Topbar;