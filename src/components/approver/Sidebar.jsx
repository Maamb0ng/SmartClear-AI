import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import Swal from "sweetalert2";

import { logoutUser } from "../../services/authService";
import { supabase } from "../../services/supabase";
import smartClearLogo from "../../assets/smartclear-logo.png";

import {
  FaBell,
  FaCheckCircle,
  FaClipboardList,
  FaGraduationCap,
  FaHome,
  FaSignOutAlt,
  FaTimesCircle,
  FaUser,
} from "react-icons/fa";

const FINANCIAL_OFFICE_WORDS = [
  "treasurer",
  "accounting",
  "cashier",
  "finance",
];

const isFinancialOffice = (
  officeName = "",
  officeCode = ""
) => {
  const normalized = `${officeName} ${officeCode}`
    .trim()
    .toLowerCase();

  return FINANCIAL_OFFICE_WORDS.some(
    (keyword) =>
      normalized.includes(keyword)
  );
};

const TREASURER_CACHE_KEY =
  "smartclear-approver-is-treasurer";

const getCachedTreasurerStatus = () => {
  try {
    return (
      sessionStorage.getItem(
        TREASURER_CACHE_KEY
      ) === "true"
    );
  } catch {
    return false;
  }
};

function Sidebar() {
  const navigate = useNavigate();

  const [
    isTreasurer,
    setIsTreasurer,
  ] = useState(
    getCachedTreasurerStatus
  );

  useEffect(() => {
    let isMounted = true;

    const detectTreasurerAssignment =
      async () => {
        try {
          const {
            data: { user },
          } =
            await supabase.auth.getUser();

          if (!user || !isMounted) {
            return;
          }

          const {
            data: profile,
            error: profileError,
          } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          const {
            data: assignments,
            error: assignmentError,
          } = await supabase
            .from(
              "approver_assignments"
            )
            .select(`
              id,
              is_active,
              offices (
                id,
                office_name,
                office_code
              )
            `)
            .eq(
              "approver_id",
              profile.id
            )
            .eq("is_active", true)
            .not("office_id", "is", null);

          if (assignmentError) {
            throw assignmentError;
          }

          const hasFinancialOffice =
            (assignments || []).some(
              (assignment) =>
                isFinancialOffice(
                  assignment.offices
                    ?.office_name,
                  assignment.offices
                    ?.office_code
                )
            );

          try {
            sessionStorage.setItem(
              TREASURER_CACHE_KEY,
              String(
                hasFinancialOffice
              )
            );
          } catch {
            // Continue without browser cache.
          }

          if (isMounted) {
            setIsTreasurer(
              hasFinancialOffice
            );
          }
        } catch (error) {
          console.error(
            "Unable to detect Treasurer assignment:",
            error
          );

          if (
            isMounted &&
            !getCachedTreasurerStatus()
          ) {
            setIsTreasurer(false);
          }
        }
      };

    detectTreasurerAssignment();

    return () => {
      isMounted = false;
    };
  }, []);

  const menuItems = useMemo(() => {
    const items = [
      {
        name: "Dashboard",
        path: "/approver/dashboard",
        icon: <FaHome />,
      },
      {
        name: "Pending Requests",
        path: "/approver/pending",
        icon: <FaClipboardList />,
      },
      {
        name: "Approved Requests",
        path: "/approver/approved",
        icon: <FaCheckCircle />,
      },
      {
        name: "Rejected Requests",
        path: "/approver/rejected",
        icon: <FaTimesCircle />,
      },
    ];

    if (isTreasurer) {
      items.push({
        name: "Ready for Enrollment",
        path:
          "/approver/ready-for-enrollment",
        icon: <FaGraduationCap />,
      });
    }

    items.push(
      {
        name: "Notifications",
        path:
          "/approver/notifications",
        icon: <FaBell />,
      },
      {
        name: "Profile",
        path: "/approver/profile",
        icon: <FaUser />,
      }
    );

    return items;
  }, [isTreasurer]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Log Out?",
      text:
        "Are you sure you want to end your session?",
      showCancelButton: true,
      confirmButtonText: "Log Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await logoutUser();

      try {
        sessionStorage.removeItem(
          TREASURER_CACHE_KEY
        );
      } catch {
        // Continue logout even if cache cleanup fails.
      }

      await Swal.fire({
        icon: "success",
        title: "Logged Out",
        text:
          "You have been signed out successfully.",
        timer: 1200,
        showConfirmButton: false,
      });

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text:
          error?.message ||
          "Unable to log out. Please try again.",
      });
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden bg-blue-900 text-white shadow-2xl">
      {/* Brand */}

      <div className="shrink-0 border-b border-blue-800 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
            <img
              src={smartClearLogo}
              alt="SmartClear AI logo"
              className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(34,211,238,0.28)]"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              SmartClear AI
            </h1>

            <p className="mt-0.5 truncate text-sm text-blue-200">
              Approver Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                    isActive
                      ? "bg-white font-semibold text-blue-900"
                      : "hover:bg-blue-800"
                  }`
                }
              >
                <span className="shrink-0 text-xl">
                  {item.icon}
                </span>

                <span className="min-w-0 truncate">
                  {item.name}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-blue-800 bg-blue-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-red-600"
        >
          <FaSignOutAlt className="shrink-0" />

          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
