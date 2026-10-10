import {
  createClient,
} from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );

const normalizeRole = (
  value: unknown
) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const clean = (
  value: unknown
) =>
  String(value ?? "").trim();

const normalizeEmail = (
  value: unknown
) =>
  clean(value).toLowerCase();

const isValidEmail = (
  value: string
) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );

Deno.serve(
  async (
    request: Request
  ): Promise<Response> => {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }

    if (
      request.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            "The secure account update service is not configured correctly.",
        },
        500
      );
    }

    const authorization =
      request.headers.get(
        "Authorization"
      );

    if (
      !authorization
        ?.startsWith(
          "Bearer "
        )
    ) {
      return jsonResponse(
        {
          error:
            "You must be signed in.",
        },
        401
      );
    }

    const accessToken =
      authorization.slice(
        "Bearer ".length
      );

    const authClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    try {
      /*
      ============================================
      VERIFY CURRENTLY SIGNED-IN USER
      ============================================
      */

      const {
        data: {
          user:
            authenticatedUser,
        },
        error:
          authenticatedUserError,
      } =
        await authClient.auth.getUser(
          accessToken
        );

      if (
        authenticatedUserError ||
        !authenticatedUser
      ) {
        return jsonResponse(
          {
            error:
              "Your session is invalid or expired. Sign in again.",
          },
          401
        );
      }

      /*
      ============================================
      VERIFY ACTIVE ADMINISTRATOR
      ============================================
      */

      const {
        data:
          administrator,
        error:
          administratorError,
      } =
        await adminClient
          .from(
            "users"
          )
          .select(
            `
              id,
              auth_id,
              full_name,
              email,
              role,
              status
            `
          )
          .eq(
            "auth_id",
            authenticatedUser.id
          )
          .maybeSingle();

      if (
        administratorError
      ) {
        throw administratorError;
      }

      const administratorRole =
        normalizeRole(
          administrator?.role
        );

      if (
        !administrator ||
        ![
          "administrator",
          "admin",
        ].includes(
          administratorRole
        ) ||
        normalizeRole(
          administrator.status
        ) !== "active"
      ) {
        return jsonResponse(
          {
            error:
              "Only an active Administrator can update user accounts.",
          },
          403
        );
      }

      /*
      ============================================
      READ REQUEST
      ============================================
      */

      const requestBody =
        await request
          .json()
          .catch(
            () => ({})
          );

      const targetUserId =
        clean(
          requestBody?.userId
        );

      const fullName =
        clean(
          requestBody?.fullName
        );

      const email =
        normalizeEmail(
          requestBody?.email
        );

      const employeeId =
        clean(
          requestBody?.employeeId
        );

      if (!targetUserId) {
        return jsonResponse(
          {
            error:
              "The target user ID is required.",
          },
          400
        );
      }

      if (!fullName) {
        return jsonResponse(
          {
            error:
              "Full name is required.",
          },
          400
        );
      }

      if (!email) {
        return jsonResponse(
          {
            error:
              "Email is required.",
          },
          400
        );
      }

      if (
        !isValidEmail(
          email
        )
      ) {
        return jsonResponse(
          {
            error:
              "Enter a valid email address.",
          },
          400
        );
      }

      /*
      ============================================
      LOAD TARGET PROFILE
      ============================================
      */

      const {
        data:
          targetUser,
        error:
          targetUserError,
      } =
        await adminClient
          .from(
            "users"
          )
          .select(
            `
              id,
              auth_id,
              full_name,
              email,
              employee_id,
              role,
              status
            `
          )
          .eq(
            "id",
            targetUserId
          )
          .maybeSingle();

      if (
        targetUserError
      ) {
        throw targetUserError;
      }

      if (!targetUser) {
        return jsonResponse(
          {
            error:
              "The selected account could not be found.",
          },
          404
        );
      }

      /*
      ============================================
      CHECK DUPLICATE EMAIL
      ============================================
      */

      const {
        data:
          emailOwner,
        error:
          emailOwnerError,
      } =
        await adminClient
          .from(
            "users"
          )
          .select(
            "id, email"
          )
          .ilike(
            "email",
            email
          )
          .neq(
            "id",
            targetUser.id
          )
          .limit(1)
          .maybeSingle();

      if (
        emailOwnerError
      ) {
        throw emailOwnerError;
      }

      if (emailOwner) {
        return jsonResponse(
          {
            error:
              "That email address is already being used by another account.",
          },
          409
        );
      }

      /*
      ============================================
      CHECK DUPLICATE EMPLOYEE ID
      ============================================
      */

      if (employeeId) {
        const {
          data:
            employeeOwner,
          error:
            employeeOwnerError,
        } =
          await adminClient
            .from(
              "users"
            )
            .select(
              "id, employee_id"
            )
            .eq(
              "employee_id",
              employeeId
            )
            .neq(
              "id",
              targetUser.id
            )
            .limit(1)
            .maybeSingle();

        if (
          employeeOwnerError
        ) {
          throw employeeOwnerError;
        }

        if (employeeOwner) {
          return jsonResponse(
            {
              error:
                "That Employee ID is already assigned to another account.",
            },
            409
          );
        }
      }

      const previousEmail =
        normalizeEmail(
          targetUser.email
        );

      const emailChanged =
        previousEmail !==
        email;

      /*
      ============================================
      UPDATE SUPABASE AUTH FIRST
      ============================================

      Email used for login must stay synchronized
      with public.users.email.
      */

      if (
        emailChanged &&
        targetUser.auth_id
      ) {
        const {
          error:
            authUpdateError,
        } =
          await adminClient
            .auth
            .admin
            .updateUserById(
              targetUser.auth_id,
              {
                email,
                email_confirm:
                  true,
              }
            );

        if (
          authUpdateError
        ) {
          return jsonResponse(
            {
              error:
                "The authentication email could not be updated.",
              details:
                authUpdateError.message,
            },
            409
          );
        }
      }

      /*
      ============================================
      UPDATE PUBLIC PROFILE
      ============================================
      */

      const profileUpdates = {
        full_name:
          fullName,
        email,
        employee_id:
          employeeId || null,
        updated_at:
          new Date()
            .toISOString(),
      };

      const {
        data:
          updatedProfile,
        error:
          profileUpdateError,
      } =
        await adminClient
          .from(
            "users"
          )
          .update(
            profileUpdates
          )
          .eq(
            "id",
            targetUser.id
          )
          .select(
            `
              id,
              auth_id,
              full_name,
              email,
              employee_id,
              role,
              status
            `
          )
          .single();

      /*
      ============================================
      ROLLBACK AUTH EMAIL IF PROFILE UPDATE FAILS
      ============================================
      */

      if (
        profileUpdateError
      ) {
        if (
          emailChanged &&
          targetUser.auth_id &&
          previousEmail
        ) {
          const {
            error:
              rollbackError,
          } =
            await adminClient
              .auth
              .admin
              .updateUserById(
                targetUser.auth_id,
                {
                  email:
                    previousEmail,
                  email_confirm:
                    true,
                }
              );

          return jsonResponse(
            {
              error:
                rollbackError
                  ? "The public profile could not be updated and the authentication email rollback also failed. Review this account in Supabase."
                  : "The public profile could not be updated. The authentication email was restored.",
              details:
                profileUpdateError.message,
            },
            500
          );
        }

        return jsonResponse(
          {
            error:
              "The user profile could not be updated.",
            details:
              profileUpdateError.message,
          },
          500
        );
      }

      /*
      ============================================
      SUCCESS
      ============================================
      */

      return jsonResponse(
        {
          success:
            true,

          message:
            "User account updated successfully.",

          user: {
            id:
              updatedProfile.id,

            authId:
              updatedProfile.auth_id,

            fullName:
              updatedProfile.full_name,

            email:
              updatedProfile.email,

            employeeId:
              updatedProfile.employee_id,

            role:
              updatedProfile.role,

            status:
              updatedProfile.status,
          },
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Update user account error:",
        error
      );

      return jsonResponse(
        {
          error:
            error instanceof
            Error
              ? error.message
              : "An unexpected server error occurred while updating the account.",
        },
        500
      );
    }
  }
);