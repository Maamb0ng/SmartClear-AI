import { supabase } from "./supabase";

/**
 * Sends a message to the secure Supabase Edge Function that calls Gemini.
 *
 * @param {Object} params
 * @param {string} params.message
 * @param {string|null} [params.previousInteractionId]
 */
export async function sendGeminiMessage({
  message,
  previousInteractionId = null,
}) {
  const normalizedMessage = String(message || "").trim();

  if (!normalizedMessage) {
    throw new Error("Please enter a message.");
  }

  const { data, error } = await supabase.functions.invoke(
    "gemini-assistant",
    {
      body: {
        message: normalizedMessage,
        previousInteractionId,
      },
    }
  );

  if (error) {
    let errorMessage =
      error.message || "Unable to contact SmartClear AI.";

    try {
      const response = error.context;

      if (response && typeof response.json === "function") {
        const errorBody = await response.json();

        if (errorBody?.error) {
          errorMessage = errorBody.error;
        }
      }
    } catch {
      // Keep the original error message.
    }

    throw new Error(errorMessage);
  }

  if (!data?.reply) {
    throw new Error("SmartClear AI returned an empty response.");
  }

  return {
    reply: data.reply,
    interactionId: data.interactionId || null,
    model: data.model || null,
    usage: data.usage || null,
  };
}