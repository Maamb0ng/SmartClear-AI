import { NavLink } from "react-router-dom";

import {
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaExclamationCircle,
  FaClipboardCheck,
  FaBell,
  FaUserCircle,
  FaHandsHelping,
} from "react-icons/fa";

const navigationSections = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        path: "/guidance/dashboard",
        icon: FaHome,
      },
      {
        label: "Schedule & Batches",
        path: "/guidance/pending",
        icon: FaCalendarAlt,
      },
      {
        label: "Student Queue",
        path: "/guidance/requirements",
        icon: FaUsers,
      },
    ],
  },
  {
    label: "Clearance",
    items: [
      {
        label: "Cleared Students",
        path: "/guidance/cleared",
        icon: FaCheckCircle,
      },
      {
        label: "Needs Follow-up",
        path: "/guidance/returned",
        icon: FaExclamationCircle,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Notifications",
        path: "/guidance/notifications",
        icon: FaBell,
      },
      {
        label: "Profile",
        path: "/guidance/profile",
        icon: FaUserCircle,
      },
    ],
  },
];

function Sidebar({ onNavigate }) {
  const handleNavigation = () => {
    if (typeof onNavigate === "function") {
      onNavigate();
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-950 text-white">
      {/* =====================================================
          BRAND
      ===================================================== */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-950/40">
            <FaHandsHelping className="text-lg text-white" />

            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold tracking-tight text-white">
              SmartClear AI
            </h1>

            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
              Guidance Clearance Portal
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigation}
                      className={({ isActive }) =>
                        [
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-950/30"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                              isActive
                                ? "bg-white/15 text-white"
                                : "bg-slate-900 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-200",
                            ].join(" ")}
                          >
                            <Icon className="text-sm" />
                          </div>

                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>

                          {isActive && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <div className="border-t border-white/10 p-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FaClipboardCheck className="text-sm" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <p className="text-[11px] font-semibold text-slate-200">
                  Guidance Active
                </p>
              </div>

              <p className="mt-1 text-[10px] leading-[15px] text-slate-500">
                Schedule, review and clear assigned students.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[9px] font-medium text-slate-700">
          SmartClear AI • Guidance
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;