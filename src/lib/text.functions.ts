import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_MODEL = "gemini-2.5-flash";

async function callGemini(body: unknown): Promise<any> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Gemini error", resp.status, text);
    if (resp.status === 429) throw new Error("Limit tugadi. Birozdan keyin urinib ko'ring.");
    throw new Error("AI xizmati xatosi");
  }
  return resp.json();
}

function extractText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text ?? "").join("").trim();
}

function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

const LEVEL_GUIDE: Record<string, string> = {
  B1: "Intermediate (B1) — common but useful words a learner at B1 should master. Avoid A1/A2 basics (the, is, go, have) and avoid very advanced C2 academic vocabulary.",
  B2: "Upper-intermediate (B2) — richer vocabulary, useful collocations, mildly idiomatic. Skip basic words and overly rare C2 ones.",
  C1: "Advanced (C1) — sophisticated, academic, IELTS 7+ vocabulary including precise verbs, abstract nouns, and idiomatic expressions.",
};

export const filterTextByLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { text: string; level: "B1" | "B2" | "C1" }) => {
    const text = String(data?.text ?? "").trim();
    if (!text || text.length < 10) throw new Error("Matn juda qisqa");
    if (text.length > 8000) throw new Error("Matn juda uzun (max 8000 belgi)");
    const level = data?.level;
    if (!["B1", "B2", "C1"].includes(level)) throw new Error("Noto'g'ri daraja");
    return { text, level };
  })
  .handler(async ({ data }) => {
    const json = await callGemini({
      systemInstruction: { parts: [{ text: `You are an English vocabulary curator for Uzbek learners. Pick high-yield vocabulary words from a given text matching a CEFR level. Skip articles, pronouns, prepositions, auxiliaries, numbers, proper nouns, and very basic vocabulary. Return only base lemma forms (lowercase). Respond ONLY with valid JSON.` }] },
      contents: [{
        role: "user",
        parts: [{ text: `Level: ${data.level}\nGuidance: ${LEVEL_GUIDE[data.level]}\n\nReturn exactly 10–15 best vocabulary words from this text matching the level.\n\nText:\n"""${data.text}"""` }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { words: { type: "ARRAY", items: { type: "STRING" } } },
          required: ["words"],
        },
        temperature: 0.4,
      },
    });
    const parsed = parseJsonLoose(extractText(json));
    const raw: string[] = Array.isArray(parsed?.words)
      ? parsed.words
          .map((w: unknown) => String(w).trim().toLowerCase())
          .filter((w: string) => w.length > 1 && w.length < 40 && /^[a-z][a-z\- ']*$/i.test(w))
      : [];
    const words = Array.from(new Set(raw)).slice(0, 15);
    if (words.length === 0) throw new Error("Mos so'zlar topilmadi");
    return { words };
  });
