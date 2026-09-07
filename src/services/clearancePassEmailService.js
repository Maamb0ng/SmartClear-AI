import { supabase } from "./supabase";

const readFunctionError = async (
  error,
  fallbackMessage
) => {
  let message =
    error?.message ||
    fallbackMessage;

  try {
    const response =
      error?.context;

    if (
      response &&
      typeof response.json ===
        "function"
    ) {
      const errorBody =
        await response.json();

      if (errorBody?.error) {
        message =
          errorBody.error;
      }
    }
  } catch {
    // Keep the original error message.
  }

  return message;
};

export async function sendClearancePassEmail({
  requestId,
  force = false,
}) {
  const normalizedRequestId =
    String(requestId || "").trim();

  if (!normalizedRequestId) {
    throw new Error(
      "A clearance request ID is required."
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      "send-clearance-pass-email",
      {
        body: {
          requestId:
            normalizedRequestId,
          force: Boolean(force),
        },
      }
    );

  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "Unable to email the Digital Clearance Pass."
      )
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "The Digital Clearance Pass email was not sent."
    );
  }

  return data;
}