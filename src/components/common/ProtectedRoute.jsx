import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const FINANCIAL_KEYWORDS = [
  "treasurer",
  "cashier",
  "accounting",
  "finance",
  "financial",
];

const isFinancialOffice = (office) => {
  const officeCode = normalizeValue(
    office?.office_code
  );

  const officeName = normalizeValue(
    office?.office_name
  );

  if (officeCode === "fin") {
    return true;
  }

  return FINANCIAL_KEYWORDS.some(
    (keyword) =>
      officeName.includes(keyword)
  );
};

const getRoleDashboard = (
  role,
  isTreasurer = false
) => {
  const normalizedRole =
    normalizeValue(role);

  if (normalizedRole === "student") {
    return "/student/dashboard";
  }

  if (normalizedRole === "approver") {
    return isTreasurer
      ? "/treasurer/dashboard"
      : "/approver/dashboard";
  }

  if (
    normalizedRole === "administrator" ||
    normalizedRole === "admin"
  ) {
    return "/admin/dashboard";
  }

  return "/login";
};

function ProtectedRoute({
  allowedRoles = [],
  portal = null,
}) {
  const location = useLocation();

  const mountedRef = useRef(false);

  const loadedAuthUserIdRef =
    useRef(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [profileLoading, setProfileLoading] =
    useState(false);

  const [session, setSession] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [isTreasurer, setIsTreasurer] =
    useState(false);

  const [accessError, setAccessError] =
    useState("");

  const normalizedAllowedRoles =
    useMemo(
      () =>
        allowedRoles.map(
          normalizeValue
        ),
      [allowedRoles]
    );

  /*
  |--------------------------------------------------------------------------
  | CHECK TREASURER ASSIGNMENT
  |--------------------------------------------------------------------------
  */

  const checkTreasurerAssignment =
    useCallback(async (profileId) => {
      if (!profileId) {
        return false;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("approver_assignments")
          .select(`
            id,
            office_id,
            approver_id,
            is_active,
            offices (
              id,
              office_name,
              office_code,
              is_active
            )
          `)
          .eq("approver_id", profileId)
          .eq("is_active", true)
          .not("office_id", "is", null);

        if (error) {
          throw error;
        }

        return (data || []).some(
          (assignment) =>
            assignment.offices
              ?.is_active !== false &&
            isFinancialOffice(
              assignment.offices
            )
        );
      } catch (error) {
        console.error(
          "Treasurer assignment check error:",
          error
        );

        throw error;
      }
    }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD USER PROFILE
  |--------------------------------------------------------------------------
  */

  const loadProfile =
    useCallback(
      async (
        authUserId,
        {
          showLoader = false,
        } = {}
      ) => {
        if (!authUserId) {
          return null;
        }

        try {
          if (
            showLoader &&
            mountedRef.current
          ) {
            setProfileLoading(true);
          }

          if (mountedRef.current) {
            setAccessError("");
          }

          const {
            data,
            error,
          } = await supabase
            .from("users")
            .select(`
              id,
              auth_id,
              full_name,
              role,
              status
            `)
            .eq(
              "auth_id",
              authUserId
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            throw new Error(
              "Your SmartClear profile could not be found."
            );
          }

          let treasurerAccount = false;

          if (
            normalizeValue(data.role) ===
            "approver"
          ) {
            treasurerAccount =
              await checkTreasurerAssignment(
                data.id
              );
          }

          if (mountedRef.current) {
            loadedAuthUserIdRef.current =
              authUserId;

            setProfile(data);
            setIsTreasurer(
              treasurerAccount
            );
          }

          return {
            profile: data,
            isTreasurer:
              treasurerAccount,
          };
        } catch (error) {
          console.error(
            "Protected route profile error:",
            error
          );

          if (mountedRef.current) {
            setProfile(null);
            setIsTreasurer(false);

            setAccessError(
              error?.message ||
                "Unable to verify your SmartClear account."
            );
          }

          return null;
        } finally {
          if (
            showLoader &&
            mountedRef.current
          ) {
            setProfileLoading(false);
          }
        }
      },
      [checkTreasurerAssignment]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL SESSION CHECK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    const initializeAccess =
      async () => {
        try {
          setInitialLoading(true);

          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          const currentSession =
            data?.session || null;

          if (!mountedRef.current) {
            return;
          }

          setSession(currentSession);

          if (
            currentSession?.user?.id
          ) {
            await loadProfile(
              currentSession.user.id,
              {
                showLoader: false,
              }
            );
          } else {
            loadedAuthUserIdRef.current =
              null;

            setProfile(null);
            setIsTreasurer(false);
          }
        } catch (error) {
          console.error(
            "Protected route initialization error:",
            error
          );

          if (mountedRef.current) {
            setSession(null);
            setProfile(null);
            setIsTreasurer(false);

            setAccessError(
              error?.message ||
                "Unable to verify your login session."
            );
          }
        } finally {
          if (mountedRef.current) {
            setInitialLoading(false);
          }
        }
      };

    initializeAccess();

    /*
    |--------------------------------------------------------------------------
    | AUTH STATE CHANGES
    |--------------------------------------------------------------------------
    */

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, nextSession) => {
          if (!mountedRef.current) {
            return;
          }

          if (event === "SIGNED_OUT") {
            loadedAuthUserIdRef.current =
              null;

            setSession(null);
            setProfile(null);
            setIsTreasurer(false);
            setAccessError("");
            setInitialLoading(false);
            setProfileLoading(false);

            return;
          }

          if (
            event === "TOKEN_REFRESHED"
          ) {
            setSession(
              nextSession || null
            );

            return;
          }

          if (
            event === "SIGNED_IN" ||
            event === "USER_UPDATED" ||
            event === "INITIAL_SESSION"
          ) {
            const nextUserId =
              nextSession?.user?.id;

            setSession(
              nextSession || null
            );

            if (!nextUserId) {
              loadedAuthUserIdRef.current =
                null;

              setProfile(null);
              setIsTreasurer(false);

              return;
            }

            if (
              loadedAuthUserIdRef.current !==
              nextUserId
            ) {
              loadProfile(
                nextUserId,
                {
                  showLoader: true,
                }
              );
            }
          }
        }
      );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    initialLoading ||
    profileLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

          <h1 className="mt-5 text-xl font-black text-slate-900">
            Checking Access
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            SmartClear AI is verifying
            your account and portal access.
          </p>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NOT LOGGED IN
  |--------------------------------------------------------------------------
  */

  if (!session?.user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PROFILE ERROR
  |--------------------------------------------------------------------------
  */

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl font-black text-rose-700">
            !
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            Access Verification Failed
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {accessError ||
              "Your SmartClear profile could not be found."}
          </p>

          <button
            type="button"
            onClick={() =>
              loadProfile(
                session.user.id,
                {
                  showLoader: true,
                }
              )
            }
            className="mt-6 h-11 w-full rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Retry Access Check
          </button>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ACTIVE ACCOUNT CHECK
  |--------------------------------------------------------------------------
  */

  if (
    normalizeValue(
      profile.status
    ) !== "active"
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          accessError:
            "Your account is not active. Contact the administrator.",
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ROLE AUTHORIZATION
  |--------------------------------------------------------------------------
  */

  const normalizedRole =
    normalizeValue(profile.role);

  const isAllowed =
    normalizedAllowedRoles.includes(
      normalizedRole
    );

  if (!isAllowed) {
    return (
      <Navigate
        to={getRoleDashboard(
          profile.role,
          isTreasurer
        )}
        replace
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PORTAL AUTHORIZATION
  |--------------------------------------------------------------------------
  |
  | Both Treasurer and normal teachers/officers use the database role
  | "Approver". Their active office assignment determines which portal
  | they are allowed to access.
  |--------------------------------------------------------------------------
  */

  if (
    normalizedRole === "approver"
  ) {
    if (
      portal === "treasurer" &&
      !isTreasurer
    ) {
      return (
        <Navigate
          to="/approver/dashboard"
          replace
        />
      );
    }

    if (
      portal === "approver" &&
      isTreasurer
    ) {
      return (
        <Navigate
          to="/treasurer/dashboard"
          replace
        />
      );
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;