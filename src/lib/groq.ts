import { createHash } from "node:crypto";

// ---------- Groq API (OpenAI-compatible) ----------
const GROQ_BASE = "https://api.groq.com/openai/v1";

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("GROQ_API_KEY sozlanmagan. Iltimos, .env fayliga GROQ_API_KEY qo'shing.");
  }
  return key.trim();
}

export async function callGroq(
  messages: Array<{ role: string; content: any }>,
  opts?: {
    temperature?: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  const apiKey = getGroqKey();

  const body: any = {
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: 4096,
  };

  if (opts?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[Groq] Error", resp.status, text.slice(0, 500));
    if (resp.status === 429) throw new Error("AI limiti tugadi. Birozdan keyin urinib ko'ring.");
    if (resp.status === 401 || resp.status === 403) throw new Error("Groq API kalit noto'g'ri yoki ruxsat yo'q.");
    if (resp.status === 503) throw new Error("AI xizmati vaqtincha mavjud emas. Birozdan keyin urinib ko'ring.");
    throw new Error(`AI xizmati xatosi (${resp.status})`);
  }

  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[Groq] Empty response:", JSON.stringify(data).slice(0, 500));
    throw new Error("AI javob bermadi. Qayta urinib ko'ring.");
  }
  return content;
}

export function parseJsonLoose(text: string): any | null {
  if (!text) return null;

  // Strip markdown code fences
  let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object or array
    const m = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }

    // Try line-by-line fix (common with LLMs adding extra text)
    const lines = cleaned.split("\n").filter((l) => l.trim().startsWith("{") || l.trim().startsWith("[") || l.trim().startsWith(",") || l.trim().startsWith("}") || l.trim().startsWith("]"));
    if (lines.length > 0) {
      try { return JSON.parse(lines.join("")); } catch { /* fall through */ }
    }

    return null;
  }
}

// Simple hash for image caching (SHA-256 of base64 data)
export function hashImage(base64: string): string {
  return createHash("sha256").update(base64).digest("hex");
}

export const DAILY_SCAN_LIMIT = 3;
