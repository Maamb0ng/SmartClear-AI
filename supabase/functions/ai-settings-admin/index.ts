import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const ALLOWED_MODELS = new Set([
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
]);

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

const extractOutputText = (
  interaction: {
    steps?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  }
) =>
  interaction.steps
    ?.filter(
      (step) =>
        step.type ===
        "model_output"
    )
    .flatMap(
      (step) =>
        step.content || []
    )
    .filter(
      (content) =>
        content.type ===
          "text" &&
        typeof content.text ===
          "string"
    )
    .map(
      (content) =>
        content.text || ""
    )
    .join("")
    .trim() || "";

Deno.serve(
  async (
    request
  ) => {
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

    try {
      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL"
        );

      const supabaseAnonKey =
        Deno.env.get(
          "SUPABASE_ANON_KEY"
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY"
        );

      const geminiApiKey =
        Deno.env.get(
          "GEMINI_API_KEY"
        );

      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        !serviceRoleKey
      ) {
        throw new Error(
          "Required Supabase environment variables are missing."
        );
      }

      const authorizationHeader =
        request.headers.get(
          "Authorization"
        );

      if (
        !authorizationHeader
      ) {
        return jsonResponse(
          {
            error:
              "Authentication is required.",
          },
          401
        );
      }

      const accessToken =
        authorizationHeader.replace(
          /^Bearer\s+/i,
          ""
        );

      const userClient =
        createClient(
          supabaseUrl,
          supabaseAnonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorizationHeader,
              },
            },
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

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await userClient
          .auth
          .getUser(
            accessToken
          );

      if (
        userError ||
        !user
      ) {
        return jsonResponse(
          {
            error:
              "Your session is invalid or has expired.",
          },
          401
        );
      }

      const {
        data:
          profile,
        error:
          profileError,
      } =
        await adminClient
          .from("users")
          .select(`
            id,
            role,
            status
          `)
          .eq(
            "auth_id",
            user.id
          )
          .maybeSingle();

      if (
        profileError
      ) {
        throw profileError;
      }

      const role =
        String(
          profile?.role ||
          ""
        )
          .trim()
          .toLowerCase();

      const status =
        String(
          profile?.status ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        !profile ||
        ![
          "administrator",
          "admin",
        ].includes(
          role
        ) ||
        status !==
          "active"
      ) {
        return jsonResponse(
          {
            error:
              "Only an active Administrator can manage the AI integration.",
          },
          403
        );
      }

      const body =
        await request.json();

      const action =
        String(
          body?.action ||
          "status"
        )
          .trim()
          .toLowerCase();

      if (
        action ===
        "status"
      ) {
        return jsonResponse({
          success: true,
          apiKeyConfigured:
            Boolean(
              geminiApiKey
            ),
          secretName:
            "GEMINI_API_KEY",
          provider:
            "Google Gemini",
        });
      }

      if (
        action !==
        "test"
      ) {
        return jsonResponse(
          {
            error:
              "Unsupported action.",
          },
          400
        );
      }

      if (
        !geminiApiKey
      ) {
        return jsonResponse(
          {
            error:
              "GEMINI_API_KEY is not configured in Supabase Edge Function secrets.",
          },
          409
        );
      }

      const requestedModel =
        String(
          body?.model ||
          ""
        ).trim();

      const {
        data:
          storedSettings,
        error:
          settingsError,
      } =
        await adminClient
          .from(
            "ai_settings"
          )
          .select(`
            model
          `)
          .eq(
            "id",
            1
          )
          .maybeSingle();

      if (
        settingsError
      ) {
        throw settingsError;
      }

      const model =
        ALLOWED_MODELS.has(
          requestedModel
        )
          ? requestedModel
          : String(
              storedSettings
                ?.model ||
              "gemini-3.1-flash-lite"
            );

      if (
        !ALLOWED_MODELS.has(
          model
        )
      ) {
        return jsonResponse(
          {
            error:
              "The selected Gemini model is not supported.",
          },
          400
        );
      }

      const startedAt =
        Date.now();

      const geminiResponse =
        await fetch(
          "https://generativelanguage.googleapis.com/v1beta/interactions",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-goog-api-key":
                geminiApiKey,
            },
            body:
              JSON.stringify(
                {
                  model,
                  system_instruction:
                    "You are performing a secure SmartClear AI connection test. Reply with exactly SMARTCLEAR_AI_CONNECTED.",
                  input:
                    "Run the connection test.",
                  generation_config:
                    {
                      thinking_level:
                        "minimal",
                    },
                }
              ),
          }
        );

      const geminiData =
        await geminiResponse
          .json();

      if (
        !geminiResponse.ok
      ) {
        const apiError =
          geminiData as {
            error?: {
              message?: string;
            };
          };

        return jsonResponse(
          {
            error:
              apiError?.error
                ?.message ||
              "Gemini rejected the connection test.",
          },
          geminiResponse.status
        );
      }

      const reply =
        extractOutputText(
          geminiData
        );

      if (!reply) {
        return jsonResponse(
          {
            error:
              "Gemini returned an empty connection-test response.",
          },
          502
        );
      }

      return jsonResponse({
        success: true,
        model,
        latencyMs:
          Date.now() -
          startedAt,
        reply,
      });
    } catch (
      error
    ) {
      console.error(
        "AI settings admin function error:",
        error
      );

      return jsonResponse(
        {
          error:
            error instanceof
            Error
              ? error.message
              : "An unexpected server error occurred.",
        },
        500
      );
    }
  }
);
