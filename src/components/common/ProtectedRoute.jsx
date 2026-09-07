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

const getRoleDashboard = (role) => {
  const normalizedRole =
    normalizeValue(role);

  if (normalizedRole === "student") {
    return "/student/dashboard";
  }

  if (normalizedRole === "approver") {
    return "/approver/dashboard";
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
}) {
  const location = useLocation();

  const mountedRef =
    useRef(false);

  const loadedAuthUserIdRef =
    useRef(null);

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [
    session,
    setSession,
  ] = useState(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    accessError,
    setAccessError,
  ] = useState("");

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
  | LOAD USER PROFILE
  |--------------------------------------------------------------------------
  |
  | showLoader is true only during the first access check or when a genuinely
  | different user signs in.
  |
  | TOKEN_REFRESHED must never show a full-page loader because Supabase may
  | refresh the access token when the browser tab becomes active again.
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
            setProfileLoading(
              true
            );
          }

          if (
            mountedRef.current
          ) {
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

          if (
            mountedRef.current
          ) {
            loadedAuthUserIdRef.current =
              authUserId;

            setProfile(data);
          }

          return data;
        } catch (error) {
          console.error(
            "Protected route profile error:",
            error
          );

          if (
            mountedRef.current
          ) {
            setProfile(null);

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
            setProfileLoading(
              false
            );
          }
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL SESSION CHECK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current =
      true;

    const initializeAccess =
      async () => {
        try {
          setInitialLoading(
            true
          );

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

          if (
            !mountedRef.current
          ) {
            return;
          }

          setSession(
            currentSession
          );

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
          }
        } catch (error) {
          console.error(
            "Protected route initialization error:",
            error
          );

          if (
            mountedRef.current
          ) {
            setSession(null);
            setProfile(null);

            setAccessError(
              error?.message ||
                "Unable to verify your login session."
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setInitialLoading(
              false
            );
          }
        }
      };

    initializeAccess();

    /*
    |--------------------------------------------------------------------------
    | AUTH STATE CHANGES
    |--------------------------------------------------------------------------
    |
    | Important:
    | - SIGNED_OUT clears access.
    | - TOKEN_REFRESHED only updates the session silently.
    | - It does not reload the profile and does not show the loading screen.
    |--------------------------------------------------------------------------
    */

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession
        ) => {
          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            event === "SIGNED_OUT"
          ) {
            loadedAuthUserIdRef.current =
              null;

            setSession(null);
            setProfile(null);
            setAccessError("");
            setInitialLoading(false);
            setProfileLoading(false);
            return;
          }

          if (
            event === "TOKEN_REFRESHED"
          ) {
            /*
            Never trigger a route reload or full-page loader here.
            */

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
              return;
            }

            /*
            Only query the profile if this is a different authenticated user
            or the profile has not been loaded yet.
            */

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
      mountedRef.current =
        false;

      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOADING SCREEN
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
            SmartClear AI is verifying your account and role.
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

  if (
    !session?.user
  ) {
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
  | PROFILE ACCESS ERROR
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
  | ACCOUNT MUST BE ACTIVE
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
    normalizeValue(
      profile.role
    );

  const isAllowed =
    normalizedAllowedRoles.includes(
      normalizedRole
    );

  if (!isAllowed) {
    return (
      <Navigate
        to={getRoleDashboard(
          profile.role
        )}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;