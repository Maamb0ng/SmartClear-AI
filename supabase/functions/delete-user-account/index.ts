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
            "The secure deletion service is not configured correctly.",
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
            "id, auth_id, full_name, email, role, status"
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
              "Only an active Administrator can permanently delete accounts.",
          },
          403
        );
      }

      const requestBody =
        await request.json()
          .catch(
            () => ({})
          );

      const targetUserId =
        String(
          requestBody
            ?.userId ||
            ""
        ).trim();

      const confirmation =
        String(
          requestBody
            ?.confirmation ||
            ""
        )
          .trim()
          .toUpperCase();

      if (!targetUserId) {
        return jsonResponse(
          {
            error:
              "The target user ID is required.",
          },
          400
        );
      }

      if (
        confirmation !==
        "DELETE"
      ) {
        return jsonResponse(
          {
            error:
              "Permanent deletion was not confirmed.",
          },
          400
        );
      }

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
            "*"
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

      if (
        targetUser.id ===
          administrator.id ||
        targetUser.auth_id ===
          authenticatedUser.id
      ) {
        return jsonResponse(
          {
            error:
              "You cannot delete the Administrator account currently signed in.",
          },
          409
        );
      }

      if (
        [
          "administrator",
          "admin",
        ].includes(
          normalizeRole(
            targetUser.role
          )
        )
      ) {
        const {
          data:
            activeUsers,
          error:
            activeUsersError,
        } =
          await adminClient
            .from(
              "users"
            )
            .select(
              "id, role, status"
            );

        if (
          activeUsersError
        ) {
          throw activeUsersError;
        }

        const activeAdministratorCount =
          (
            activeUsers ||
            []
          ).filter(
            (
              profile: {
                role?: unknown;
                status?: unknown;
              }
            ) =>
              [
                "administrator",
                "admin",
              ].includes(
                normalizeRole(
                  profile.role
                )
              ) &&
              normalizeRole(
                profile.status
              ) ===
                "active"
          ).length;

        if (
          activeAdministratorCount <=
          1
        ) {
          return jsonResponse(
            {
              error:
                "The final active Administrator account cannot be deleted.",
            },
            409
          );
        }
      }

      /*
      Delete the public profile first.

      Existing foreign-key rules can safely block this step when the
      account still owns records that the database requires. In that
      case, the Supabase Auth identity remains untouched.
      */

      const {
        error:
          profileDeleteError,
      } =
        await adminClient
          .from(
            "users"
          )
          .delete()
          .eq(
            "id",
            targetUser.id
          );

      if (
        profileDeleteError
      ) {
        return jsonResponse(
          {
            error:
              "This account could not be permanently deleted because it still has linked clearance, assignment, or audit records. Deactivate the account instead or remove the dependent records first.",
            details:
              profileDeleteError.message,
          },
          409
        );
      }

      if (
        targetUser.auth_id
      ) {
        const {
          error:
            authDeleteError,
        } =
          await adminClient
            .auth
            .admin
            .deleteUser(
              targetUser.auth_id,
              false
            );

        if (
          authDeleteError
        ) {
          /*
          Best-effort rollback of the public profile if Auth deletion
          unexpectedly fails after the database row was removed.
          */

          const {
            error:
              restoreError,
          } =
            await adminClient
              .from(
                "users"
              )
              .insert(
                targetUser
              );

          return jsonResponse(
            {
              error:
                restoreError
                  ? "The authentication account could not be deleted and the public profile rollback also failed. Review this account in Supabase."
                  : "The authentication account could not be deleted. The public profile was restored.",
              details:
                authDeleteError.message,
            },
            500
          );
        }
      }

      return jsonResponse(
        {
          success:
            true,
          deletedUser: {
            id:
              targetUser.id,
            authId:
              targetUser.auth_id,
            fullName:
              targetUser.full_name,
            email:
              targetUser.email,
            role:
              targetUser.role,
          },
        }
      );
    } catch (
      error
    ) {
      console.error(
        "Delete user account error:",
        error
      );

      return jsonResponse(
        {
          error:
            error instanceof
            Error
              ? error.message
              : "An unexpected server error occurred while deleting the account.",
        },
        500
      );
    }
  }
);
