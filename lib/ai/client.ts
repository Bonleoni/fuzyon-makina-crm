/**
 * Ortak AI istemcisi — DeepSeek / OpenAI / Anthropic Claude
 */

export type AiProvider = "deepseek" | "openai" | "anthropic";

export type ChatJsonOptions = {
  system: string;
  user: string;
  /** tercihler soldan sağa */
  prefer?: AiProvider[];
  temperature?: number;
};

function pickProvider(prefer: AiProvider[] = ["deepseek", "openai", "anthropic"]): {
  provider: AiProvider;
  apiKey: string;
  endpoint: string;
  model: string;
} {
  for (const provider of prefer) {
    if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY?.trim()) {
      return {
        provider,
        apiKey: process.env.DEEPSEEK_API_KEY.trim(),
        endpoint: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
      };
    }
    if (provider === "openai" && process.env.OPENAI_API_KEY?.trim()) {
      return {
        provider,
        apiKey: process.env.OPENAI_API_KEY.trim(),
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini",
      };
    }
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY?.trim()) {
      return {
        provider,
        apiKey: process.env.ANTHROPIC_API_KEY.trim(),
        endpoint: "https://api.anthropic.com/v1/messages",
        model: "claude-sonnet-4-20250514",
      };
    }
  }

  throw new Error(
    "AI anahtarı bulunamadı. DEEPSEEK_API_KEY, OPENAI_API_KEY veya ANTHROPIC_API_KEY ekleyin."
  );
}

/**
 * Chat tamamlaması yapıp JSON parse eder.
 */
export async function chatJson<T>(options: ChatJsonOptions): Promise<{
  data: T;
  provider: AiProvider;
  model: string;
}> {
  const selected = pickProvider(options.prefer);
  const temperature = options.temperature ?? 0.2;

  let content = "";

  if (selected.provider === "anthropic") {
    const response = await fetch(selected.endpoint, {
      method: "POST",
      headers: {
        "x-api-key": selected.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selected.model,
        max_tokens: 1200,
        temperature,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Claude hatası (${response.status}): ${await response.text()}`
      );
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    content =
      payload.content?.find((part) => part.type === "text")?.text?.trim() ?? "";
  } else {
    const response = await fetch(selected.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${selected.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selected.model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `AI hatası (${response.status}): ${await response.text()}`
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  }

  if (!content) {
    throw new Error("AI boş yanıt döndürdü.");
  }

  // Claude bazen ```json blokları döndürebilir
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return {
    data: JSON.parse(cleaned) as T,
    provider: selected.provider,
    model: selected.model,
  };
}
