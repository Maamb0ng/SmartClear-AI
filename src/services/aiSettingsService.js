import { supabase } from "./supabase";

export const DEFAULT_AI_SETTINGS = {
  isEnabled: true,
  provider: "Google Gemini",
  model: "gemini-3.1-flash-lite",
  temperature: 0.4,
  systemPrompt:
    "You are SmartClear AI, the official student assistant for the digital clearance system. Answer clearly, politely, and only using approved school clearance information. Guide students through requests, requirements, status tracking, rejected submissions, notifications, and Digital Clearance Pass verification. Answer in the same language used by the student whenever practical.",
  updatedAt: null,
  updatedBy: null,
};

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
      const body =
        await response.json();

      if (body?.error) {
        message =
          body.error;
      }
    }
  } catch {
    // Keep the original error message.
  }

  return message;
};

export async function getAISettings() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_ai_settings_admin"
  );

  if (error) {
    throw error;
  }

  return {
    ...DEFAULT_AI_SETTINGS,
    ...(data || {}),
    temperature:
      Number(
        data?.temperature ??
        DEFAULT_AI_SETTINGS.temperature
      ),
  };
}

export async function saveAISettings({
  isEnabled,
  model,
  temperature,
  systemPrompt,
}) {
  const cleanPrompt =
    String(
      systemPrompt || ""
    ).trim();

  if (
    cleanPrompt.length < 80
  ) {
    throw new Error(
      "The system prompt must contain at least 80 characters."
    );
  }

  const numericTemperature =
    Number(temperature);

  if (
    !Number.isFinite(
      numericTemperature
    ) ||
    numericTemperature < 0 ||
    numericTemperature > 1
  ) {
    throw new Error(
      "Temperature must be between 0 and 1."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "update_ai_settings_admin",
    {
      p_is_enabled:
        Boolean(isEnabled),

      p_model:
        String(model || "").trim(),

      p_temperature:
        numericTemperature,

      p_system_prompt:
        cleanPrompt,
    }
  );

  if (error) {
    throw error;
  }

  return {
    ...DEFAULT_AI_SETTINGS,
    ...(data || {}),
    temperature:
      Number(
        data?.temperature ??
        numericTemperature
      ),
  };
}

export async function getAIIntegrationStatus() {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      "ai-settings-admin",
      {
        body: {
          action: "status",
        },
      }
    );

  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "Unable to check the Gemini integration."
      )
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
      "Unable to check the Gemini integration."
    );
  }

  return data;
}

export async function testAIIntegration({
  model,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      "ai-settings-admin",
      {
        body: {
          action: "test",
          model:
            String(model || "").trim(),
        },
      }
    );

  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "Unable to test the Gemini connection."
      )
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
      "The Gemini connection test failed."
    );
  }

  return data;
}

export async function getAIRuntimeStatus() {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_ai_runtime_status"
  );

  if (error) {
    throw error;
  }

  return data;
}
