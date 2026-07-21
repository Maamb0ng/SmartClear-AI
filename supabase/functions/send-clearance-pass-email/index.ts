import { createClient } from "supabase";

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

const escapeHtml = (
  value: unknown
) =>
  String(value ?? "N/A")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (
  value: unknown
) => {
  if (!value) {
    return "N/A";
  }

  const date =
    new Date(String(value));

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "N/A";
  }

  return date.toLocaleString(
    "en-PH",
    {
      timeZone:
        "Asia/Manila",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

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

      const resendApiKey =
        Deno.env.get(
          "RESEND_API_KEY"
        );

      const emailFrom =
        Deno.env.get(
          "CLEARANCE_EMAIL_FROM"
        ) ||
        "SmartClear AI <onboarding@resend.dev>";

      const appUrl =
        (
          Deno.env.get(
            "APP_URL"
          ) ||
          "http://localhost:5173"
        ).replace(
          /\/+$/,
          ""
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

      if (
        !resendApiKey
      ) {
        throw new Error(
          "RESEND_API_KEY is not configured."
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
            auth_id,
            student_id,
            full_name,
            email,
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

      if (
        !profile
      ) {
        return jsonResponse(
          {
            error:
              "Your SmartClear profile could not be found.",
          },
          404
        );
      }

      if (
        profile.role !==
        "Student"
      ) {
        return jsonResponse(
          {
            error:
              "Only the student who owns the completed clearance may email this pass.",
          },
          403
        );
      }

      if (
        profile.status !==
        "Active"
      ) {
        return jsonResponse(
          {
            error:
              "Your Student account is not active.",
          },
          403
        );
      }

      const body =
        await request.json();

      const requestId =
        String(
          body?.requestId ||
          ""
        ).trim();

      const force =
        Boolean(
          body?.force
        );

      if (
        !requestId
      ) {
        return jsonResponse(
          {
            error:
              "A clearance request ID is required.",
          },
          400
        );
      }

      const {
        data:
          clearanceRequest,
        error:
          requestError,
      } =
        await adminClient
          .from(
            "clearance_requests"
          )
          .select(`
            id,
            student_id,
            status,
            completed_at
          `)
          .eq(
            "id",
            requestId
          )
          .maybeSingle();

      if (
        requestError
      ) {
        throw requestError;
      }

      if (
        !clearanceRequest
      ) {
        return jsonResponse(
          {
            error:
              "The clearance request could not be found.",
          },
          404
        );
      }

      if (
        clearanceRequest.student_id !==
        profile.id
      ) {
        return jsonResponse(
          {
            error:
              "You do not own this clearance request.",
          },
          403
        );
      }

      if (
        clearanceRequest.status !==
        "Completed"
      ) {
        return jsonResponse(
          {
            error:
              "The Digital Clearance Pass is only available after clearance completion.",
          },
          409
        );
      }

      if (
        !profile.email
      ) {
        return jsonResponse(
          {
            error:
              "No email address is registered on your SmartClear profile.",
          },
          409
        );
      }

      const {
        data:
          existingLog,
        error:
          existingLogError,
      } =
        await adminClient
          .from(
            "clearance_pass_email_logs"
          )
          .select(`
            id,
            status,
            recipient_email,
            sent_at,
            attempts
          `)
          .eq(
            "clearance_request_id",
            requestId
          )
          .maybeSingle();

      if (
        existingLogError
      ) {
        throw existingLogError;
      }

      if (
        existingLog?.status ===
          "Sent" &&
        !force
      ) {
        return jsonResponse({
          success: true,
          alreadySent: true,
          resent: false,
          recipientEmail:
            existingLog.recipient_email,
          sentAt:
            existingLog.sent_at,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SECURE PASS SOURCE
      |--------------------------------------------------------------------------
      |
      | This calls the existing student-owned RPC through the student's JWT.
      | The browser cannot forge the returned pass fields.
      |--------------------------------------------------------------------------
      */

      const {
        data:
          clearancePass,
        error:
          passError,
      } =
        await userClient
          .rpc(
            "get_my_clearance_pass",
            {
              p_request_id:
                requestId,
            }
          );

      if (
        passError
      ) {
        throw passError;
      }

      if (
        !clearancePass
          ?.success ||
        !clearancePass
          ?.clearedForEnrollment
      ) {
        return jsonResponse(
          {
            error:
              "The official Digital Clearance Pass could not be generated.",
          },
          409
        );
      }

      const nextAttempts =
        Number(
          existingLog
            ?.attempts ||
          0
        ) + 1;

      const {
        error:
          sendingLogError,
      } =
        await adminClient
          .from(
            "clearance_pass_email_logs"
          )
          .upsert(
            {
              clearance_request_id:
                requestId,
              student_id:
                profile.id,
              recipient_email:
                profile.email,
              status:
                "Sending",
              attempts:
                nextAttempts,
              last_error:
                null,
              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "clearance_request_id",
            }
          );

      if (
        sendingLogError
      ) {
        throw sendingLogError;
      }

      const courseDisplay =
        [
          clearancePass
            .courseCode,
          clearancePass
            .courseName,
        ]
          .filter(
            Boolean
          )
          .join(
            " — "
          ) ||
        "N/A";

      const classDisplay =
        [
          clearancePass
            .yearLevel,
          clearancePass
            .blockCode
            ? `Block ${clearancePass.blockCode}`
            : null,
        ]
          .filter(
            Boolean
          )
          .join(
            " — "
          ) ||
        "N/A";

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
          </head>

          <body
            style="
              margin:0;
              padding:24px;
              background:#f1f5f9;
              color:#0f172a;
              font-family:Arial,Helvetica,sans-serif;
            "
          >
            <div
              style="
                max-width:720px;
                margin:0 auto;
                overflow:hidden;
                border:1px solid #cbd5e1;
                border-radius:22px;
                background:#ffffff;
              "
            >
              <div
                style="
                  padding:32px;
                  background:linear-gradient(135deg,#1d4ed8,#4338ca);
                  color:#ffffff;
                  text-align:center;
                "
              >
                <div
                  style="
                    font-size:30px;
                    font-weight:800;
                  "
                >
                  SmartClear AI
                </div>

                <div
                  style="
                    margin-top:8px;
                    color:#dbeafe;
                  "
                >
                  Official Digital Clearance Pass
                </div>

                <div
                  style="
                    display:inline-block;
                    margin-top:20px;
                    padding:11px 17px;
                    border-radius:999px;
                    background:#dcfce7;
                    color:#15803d;
                    font-size:13px;
                    font-weight:800;
                  "
                >
                  CLEARED FOR ENROLLMENT
                </div>
              </div>

              <div
                style="
                  padding:30px;
                "
              >
                <div
                  style="
                    text-align:center;
                    font-size:28px;
                    font-weight:800;
                  "
                >
                  ${escapeHtml(
                    clearancePass.studentName
                  )}
                </div>

                <div
                  style="
                    margin-top:8px;
                    color:#64748b;
                    text-align:center;
                  "
                >
                  Student Number:
                  ${escapeHtml(
                    clearancePass.studentId
                  )}
                </div>

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    margin-top:26px;
                    border-collapse:separate;
                    border-spacing:10px;
                  "
                >
                  <tr>
                    <td
                      style="
                        width:50%;
                        padding:16px;
                        border-radius:12px;
                        background:#f8fafc;
                        vertical-align:top;
                      "
                    >
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          font-weight:700;
                          text-transform:uppercase;
                        "
                      >
                        Program
                      </div>

                      <div
                        style="
                          margin-top:7px;
                          font-weight:700;
                        "
                      >
                        ${escapeHtml(
                          courseDisplay
                        )}
                      </div>
                    </td>

                    <td
                      style="
                        width:50%;
                        padding:16px;
                        border-radius:12px;
                        background:#f8fafc;
                        vertical-align:top;
                      "
                    >
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          font-weight:700;
                          text-transform:uppercase;
                        "
                      >
                        Year and Block
                      </div>

                      <div
                        style="
                          margin-top:7px;
                          font-weight:700;
                        "
                      >
                        ${escapeHtml(
                          classDisplay
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:16px;
                        border-radius:12px;
                        background:#f8fafc;
                        vertical-align:top;
                      "
                    >
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          font-weight:700;
                          text-transform:uppercase;
                        "
                      >
                        Clearance Cycle
                      </div>

                      <div
                        style="
                          margin-top:7px;
                          font-weight:700;
                        "
                      >
                        ${escapeHtml(
                          clearancePass.semester
                        )}
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          color:#64748b;
                        "
                      >
                        ${escapeHtml(
                          clearancePass.schoolYear
                        )}
                      </div>
                    </td>

                    <td
                      style="
                        padding:16px;
                        border-radius:12px;
                        background:#f8fafc;
                        vertical-align:top;
                      "
                    >
                      <div
                        style="
                          color:#64748b;
                          font-size:11px;
                          font-weight:700;
                          text-transform:uppercase;
                        "
                      >
                        Completion
                      </div>

                      <div
                        style="
                          margin-top:7px;
                          font-weight:700;
                        "
                      >
                        ${escapeHtml(
                          formatDate(
                            clearancePass.completedAt
                          )
                        )}
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          color:#15803d;
                          font-weight:700;
                        "
                      >
                        ${escapeHtml(
                          `${clearancePass.approvedSteps}/${clearancePass.totalSteps}`
                        )}
                        steps approved
                      </div>
                    </td>
                  </tr>
                </table>

                <div
                  style="
                    margin-top:22px;
                    padding:24px;
                    border:2px dashed #2563eb;
                    border-radius:16px;
                    background:#eff6ff;
                    text-align:center;
                  "
                >
                  <div
                    style="
                      color:#2563eb;
                      font-size:11px;
                      font-weight:700;
                      text-transform:uppercase;
                    "
                  >
                    Clearance Reference
                  </div>

                  <div
                    style="
                      margin-top:10px;
                      color:#1d4ed8;
                      font-size:21px;
                      font-weight:800;
                      word-break:break-all;
                    "
                  >
                    ${escapeHtml(
                      clearancePass.clearanceReference
                    )}
                  </div>

                  <div
                    style="
                      margin-top:20px;
                      color:#2563eb;
                      font-size:11px;
                      font-weight:700;
                      text-transform:uppercase;
                    "
                  >
                    Verification Code
                  </div>

                  <div
                    style="
                      margin:10px auto 0;
                      max-width:360px;
                      padding:14px;
                      border-radius:10px;
                      background:#ffffff;
                      font-family:monospace;
                      font-size:22px;
                      font-weight:800;
                      letter-spacing:0.12em;
                      word-break:break-all;
                    "
                  >
                    ${escapeHtml(
                      clearancePass.verificationCode
                    )}
                  </div>
                </div>

                <div
                  style="
                    margin-top:24px;
                    text-align:center;
                  "
                >
                  <a
                    href="${escapeHtml(
                      `${appUrl}/student/clearance-status`
                    )}"
                    style="
                      display:inline-block;
                      padding:13px 20px;
                      border-radius:11px;
                      background:#1d4ed8;
                      color:#ffffff;
                      font-weight:700;
                      text-decoration:none;
                    "
                  >
                    Open SmartClear AI
                  </a>
                </div>

                <p
                  style="
                    margin:24px 0 0;
                    color:#64748b;
                    font-size:12px;
                    line-height:1.6;
                    text-align:center;
                  "
                >
                  Present the clearance reference and
                  verification code to the Registrar or
                  authorized enrollment personnel.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const resendResponse =
        await fetch(
          "https://api.resend.com/emails",
          {
            method:
              "POST",
            headers: {
              Authorization:
                `Bearer ${resendApiKey}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                {
                  from:
                    emailFrom,
                  to: [
                    profile.email,
                  ],
                  subject:
                    `SmartClear AI Digital Clearance Pass — ${clearancePass.clearanceReference}`,
                  html:
                    emailHtml,
                }
              ),
          }
        );

      const resendData =
        await resendResponse
          .json();

      if (
        !resendResponse.ok
      ) {
        const providerMessage =
          resendData?.message ||
          resendData?.error ||
          "The email provider rejected the request.";

        await adminClient
          .from(
            "clearance_pass_email_logs"
          )
          .update({
            status:
              "Failed",
            last_error:
              String(
                providerMessage
              ),
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "clearance_request_id",
            requestId
          );

        return jsonResponse(
          {
            error:
              String(
                providerMessage
              ),
          },
          resendResponse.status
        );
      }

      const sentAt =
        new Date()
          .toISOString();

      const {
        error:
          sentLogError,
      } =
        await adminClient
          .from(
            "clearance_pass_email_logs"
          )
          .update({
            status:
              "Sent",
            provider_message_id:
              resendData?.id ||
              null,
            sent_at:
              sentAt,
            last_error:
              null,
            updated_at:
              sentAt,
          })
          .eq(
            "clearance_request_id",
            requestId
          );

      if (
        sentLogError
      ) {
        console.error(
          "Email was sent, but its log could not be updated:",
          sentLogError
        );
      }

      return jsonResponse({
        success: true,
        alreadySent: false,
        resent:
          Boolean(
            force &&
            existingLog
          ),
        recipientEmail:
          profile.email,
        sentAt,
        providerMessageId:
          resendData?.id ||
          null,
      });
    } catch (
      error
    ) {
      console.error(
        "Send clearance pass email function error:",
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