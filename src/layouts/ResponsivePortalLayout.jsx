import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
} from "react-router-dom";

import {
  FaBars,
  FaTimes,
} from "react-icons/fa";

function ResponsivePortalLayout({
  children,
  SidebarComponent,
  TopbarComponent,
  portalLabel,
}) {
  const location = useLocation();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  // =========================================================
  // CLOSE SIDEBAR WHEN ROUTE CHANGES
  // =========================================================

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // =========================================================
  // PREVENT BODY SCROLL WHILE MOBILE SIDEBAR IS OPEN
  // =========================================================

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={() =>
          setSidebarOpen(false)
        }
        className={`fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div
        className={`fixed inset-y-0 left-0 z-[70] w-72 max-w-[88vw] transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <SidebarComponent
          onNavigate={() =>
            setSidebarOpen(false)
          }
        />

        {/* MOBILE CLOSE BUTTON */}

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="absolute right-3 top-3 z-[80] flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 lg:hidden"
        >
          <FaTimes />
        </button>
      </div>

      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <header className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/95 sm:px-4 lg:hidden">

        <div className="flex min-w-0 items-center gap-3">

          {/* MENU BUTTON */}

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={
              sidebarOpen
            }
            onClick={() =>
              setSidebarOpen(true)
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lg text-white shadow-md transition active:scale-95 dark:bg-blue-600"
          >
            <FaBars />
          </button>

          {/* BRAND */}

          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-900 transition-colors dark:text-white">
              SmartClear AI
            </p>

            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {portalLabel}
            </p>
          </div>
        </div>

        {/* MOBILE LOGO */}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-800 transition-colors dark:bg-blue-500/10 dark:text-blue-400">
          SC
        </div>
      </header>

      {/* =====================================================
          PORTAL CONTENT
      ===================================================== */}

      <div className="min-w-0 lg:ml-72">

        {/* DESKTOP TOPBAR */}

        <div className="hidden lg:block">
          <TopbarComponent />
        </div>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="min-w-0 bg-slate-50 px-3 pb-6 pt-20 transition-colors duration-300 dark:bg-slate-950 sm:px-4 lg:min-h-[calc(100vh-4rem)] lg:px-6 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default ResponsivePortalLayout;