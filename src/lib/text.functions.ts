import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGroq, parseJsonLoose } from "@/lib/groq";

const SYSTEM_PROMPT =
  "You are an English vocabulary curator for Uzbek learners. Pick high-yield vocabulary words from a given text matching a CEFR level. Skip articles, pronouns, prepositions, auxiliaries, numbers, proper nouns, and very basic vocabulary. Return only base lemma forms (lowercase). Respond ONLY with valid JSON.";

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
    const prompt =
      `Level: ${data.level}\nGuidance: ${LEVEL_GUIDE[data.level]}\n\n` +
      `Return exactly 10–15 best vocabulary words from this text matching the level.\n\n` +
      `Respond ONLY with a JSON object: { "words": ["word1", "word2", ...] }\n\n` +
      `Text:\n"""${data.text}"""`;

    const rawText = await callGroq(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.4, jsonMode: true },
    );

    const parsed = parseJsonLoose(rawText);
    const raw: string[] = Array.isArray(parsed?.words)
      ? parsed.words
          .map((w: unknown) => String(w).trim().toLowerCase())
          .filter((w: string) => w.length > 1 && w.length < 40 && /^[a-z][a-z\- ']*$/i.test(w))
      : [];
    const words = Array.from(new Set(raw)).slice(0, 15);
    if (words.length === 0) throw new Error("Mos so'zlar topilmadi");
    return { words };
  });
