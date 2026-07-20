import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGroq, parseJsonLoose } from "@/lib/groq";

type GeneratedWord = {
  word: string;
  translation_uz: string;
  ipa: string;
  example: string;
  example_uz: string;
  explanation: string;
  synonyms: string[];
  antonyms: string[];
};

const WORD_SYSTEM_PROMPT = `You are an English-to-Uzbek vocabulary tutor. For a given English word, return concise structured data: an Uzbek translation, IPA pronunciation, a short English example sentence (max 14 words), an Uzbek translation of that exact example sentence, a one-sentence beginner-friendly explanation in Uzbek, plus up to 3 synonyms and 3 antonyms (English). Be accurate and natural. You MUST respond ONLY with valid JSON — no markdown fences, no extra text.`;

function buildWordJsonHint(word: string): string {
  return JSON.stringify({
    word,
    translation_uz: "tarjima",
    ipa: "/talfuz/",
    example: "Example sentence.",
    example_uz: "Tarjima misol.",
    explanation: "Tushuntirish.",
    synonyms: ["syn1", "syn2"],
    antonyms: ["ant1", "ant2"],
  });
}

export const generateWordData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { words: string[] }) => {
    if (!data?.words || !Array.isArray(data.words)) throw new Error("words required");
    const cleaned = data.words
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length > 0 && w.length < 50 && /^[a-z][a-z\- ']*$/i.test(w))
      .slice(0, 25);
    if (cleaned.length === 0) throw new Error("No valid words");
    return { words: cleaned };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check cache first — skip AI for words we already have definitions for
    const { data: existingWords } = await supabase
      .from("words")
      .select("word")
      .eq("user_id", userId)
      .in("word", data.words);

    const existingSet = new Set((existingWords ?? []).map((r: any) => String(r.word).toLowerCase()));
    const wordsToGenerate = data.words.filter((w) => !existingSet.has(w));

    if (wordsToGenerate.length === 0) {
      return { inserted: 0, cached: data.words.length };
    }

    const results: GeneratedWord[] = [];

    // Process words in batches of 5
    const batchSize = 5;
    for (let i = 0; i < wordsToGenerate.length; i += batchSize) {
      const batch = wordsToGenerate.slice(i, i + batchSize);

      const userContent = batch.map((w) => `- "${w}"`).join("\n") +
        "\n\nReturn a JSON object with a \"words\" array containing one object per word.";

      try {
        const content = await callGroq([
          { role: "system", content: WORD_SYSTEM_PROMPT },
          { role: "user", content: `Generate vocabulary data for these words:\n${userContent}\n\nExample for one word:\n${buildWordJsonHint(batch[0])}` },
        ], { temperature: 0.7, jsonMode: true });

        const parsed = parseJsonLoose(content);
        const wordList: any[] = parsed?.words ?? (Array.isArray(parsed) ? parsed : []);

        for (const item of wordList) {
          if (item?.word && item?.translation_uz) {
            const matchWord = batch.find((w) => w.toLowerCase() === String(item.word).toLowerCase());
            results.push({
              word: matchWord ?? item.word,
              translation_uz: String(item.translation_uz),
              ipa: String(item.ipa ?? ""),
              example: String(item.example ?? ""),
              example_uz: String(item.example_uz ?? ""),
              explanation: String(item.explanation ?? ""),
              synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
              antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
            });
          }
        }
      } catch (err) {
        console.error("[AI] generateWordData batch failed:", err);
        // Continue with next batch instead of failing entirely
      }
    }

    if (results.length === 0) throw new Error("AI hech qanday natija qaytarmadi. Qayta urinib ko'ring.");

    const rows = results.map((r) => ({
      user_id: userId,
      word: r.word,
      translation_uz: r.translation_uz,
      ipa: r.ipa,
      example: r.example,
      example_uz: r.example_uz,
      explanation: r.explanation,
      synonyms: r.synonyms?.slice(0, 5) ?? [],
      antonyms: r.antonyms?.slice(0, 5) ?? [],
      status: "ready",
    }));

    const { error } = await supabase.from("words").insert(rows);
    if (error) throw new Error(error.message);

    return { inserted: rows.length, cached: existingSet.size };
  });

export const extractWordsFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { imageDataUrl: string }) => {
    if (!data?.imageDataUrl || typeof data.imageDataUrl !== "string") throw new Error("image required");
    if (!data.imageDataUrl.startsWith("data:image/")) throw new Error("Invalid image format");
    if (data.imageDataUrl.length > 8_000_000) throw new Error("Rasm juda katta (max ~6MB)");
    return { imageDataUrl: data.imageDataUrl };
  })
  .handler(async ({ data }) => {
    const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data URL");
    const _mimeType = match[1];
    const _base64 = match[2];

    // This function is kept for backwards compatibility.
    // The primary image extraction pipeline now uses OCR.Space + Groq in ocr.functions.ts
    throw new Error("Bu funksiya endi ishlatilmaydi. Skanerlash uchun kameradan foydalaning.");
  });
