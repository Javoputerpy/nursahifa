import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGroq, parseJsonLoose, hashImage, DAILY_SCAN_LIMIT } from "@/lib/groq";

// ---------- OCR.Space ----------
async function runOcrSpace(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error("OCR_SPACE_API_KEY sozlanmagan. Iltimos, .env fayliga OCR_SPACE_API_KEY qo'shing.");

  const form = new FormData();
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("detectOrientation", "true");
  form.append("base64Image", `data:${mimeType || "image/jpeg"};base64,${base64}`);

  const resp = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[OCR.Space] Error", resp.status, errText.slice(0, 500));
    if (resp.status === 401 || resp.status === 403) throw new Error("OCR.Space kaliti noto'g'ri");
    throw new Error(`OCR xizmati xatosi (${resp.status})`);
  }

  const data: any = await resp.json();
  if (data?.IsErroredOnProcessing) {
    const msg = Array.isArray(data?.ErrorMessage) ? data.ErrorMessage.join("; ") : String(data?.ErrorMessage ?? "OCR xatosi");
    console.error("[OCR.Space] Processing error", msg);
    throw new Error(msg || "OCR matnni o'qiy olmadi");
  }

  const results = Array.isArray(data?.ParsedResults) ? data.ParsedResults : [];
  const text = results.map((r: any) => r?.ParsedText ?? "").join("\n").trim();
  return text;
}


function tokenizeEnglishWords(text: string): string[] {
  const cleaned = text.replace(/[^A-Za-z'\-\s]/g, " ").toLowerCase();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const stop = new Set([
    "the","a","an","is","are","was","were","be","been","being","am","of","to","in","on","at","by","for","with",
    "and","or","but","not","no","yes","if","then","else","so","as","this","that","these","those","it","its",
    "i","you","he","she","we","they","me","him","her","us","them","my","your","his","their","our",
    "do","does","did","have","has","had","will","would","should","could","can","may","might","must",
    "there","here","up","down","out","over","under","again","just","than","too","very","also","from","into",
  ]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const w = t.replace(/^[-']+|[-']+$/g, "");
    if (!w || w.length < 3 || w.length > 30) continue;
    if (!/^[a-z][a-z\-']*$/.test(w)) continue;
    if (stop.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 40) break;
  }
  return out;
}

// ---------- Step 0: Check + increment daily scan limit ----------
export const checkScanLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: count, error } = await supabase.rpc("get_scan_count" as any);
    if (error) {
      console.error("[Limit] check failed:", error.message);
      // If table doesn't exist yet, don't block
      return { count: 0, limit: DAILY_SCAN_LIMIT, remaining: DAILY_SCAN_LIMIT };
    }

    const currentCount = (count as number) ?? 0;
    if (currentCount >= DAILY_SCAN_LIMIT) {
      throw new Error(`LIMIT:${currentCount}/${DAILY_SCAN_LIMIT}`);
    }

    return { count: currentCount, limit: DAILY_SCAN_LIMIT, remaining: DAILY_SCAN_LIMIT - currentCount };
  });

export const incrementScanCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: newCount, error } = await supabase.rpc("increment_scan_count" as any);
    if (error) {
      console.error("[Limit] increment failed:", error.message);
      return { count: 1, limit: DAILY_SCAN_LIMIT };
    }
    return { count: (newCount as number) ?? 1, limit: DAILY_SCAN_LIMIT };
  });

// ---------- Step 1: OCR only (extract words for review) ----------
export const extractWordsFromImageOCR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { imageDataUrl: string }) => {
    if (!data?.imageDataUrl || typeof data.imageDataUrl !== "string") throw new Error("Rasm kerak");
    if (!data.imageDataUrl.startsWith("data:image/")) throw new Error("Noto'g'ri rasm formati");
    if (data.imageDataUrl.length > 8_000_000) throw new Error("Rasm juda katta (max ~6MB)");
    return { imageDataUrl: data.imageDataUrl };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("Noto'g'ri rasm ma'lumoti");
    const mimeType = match[1];
    const base64 = match[2];

    // Check cache first — same image = same result
    const imgHash = hashImage(base64);
    try {
      const { data: cached } = await (supabase as any)
        .from("scan_cache")
        .select("words")
        .eq("image_hash", imgHash)
        .maybeSingle();

      if (cached?.words && Array.isArray(cached.words) && cached.words.length > 0) {
        return { words: cached.words as string[], cached: true };
      }
    } catch {
      // scan_cache table might not exist yet — continue without cache
    }

    // Run OCR
    const rawText = await runOcrSpace(base64, mimeType);
    const words = tokenizeEnglishWords(rawText);
    if (words.length === 0) throw new Error("Rasmdan inglizcha so'z topilmadi");

    // Cache the result (fire-and-forget)
    try {
      (supabase as any).from("scan_cache").insert({
        image_hash: imgHash,
        words: words,
      }).then((res: any) => {
        if (res?.error) console.warn("[Cache] save failed:", res.error.message);
      });
    } catch {
      // Ignore cache errors
    }

    return { words, cached: false };
  });

// ---------- Step 2: Translate reviewed words + save ----------
export const generateFromWordList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { words: string[] }) => {
    if (!Array.isArray(data?.words)) throw new Error("So'zlar ro'yxati kerak");
    const cleaned = data.words
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length >= 2 && w.length <= 40 && /^[a-z][a-z\-'\s]*$/.test(w))
      .slice(0, 40);
    if (cleaned.length === 0) throw new Error("Yaroqli so'z topilmadi");
    return { words: Array.from(new Set(cleaned)) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let items: Array<{ word: string; translation_uz: string; example: string }> = [];

    try {
      const content = await callGroq([
        {
          role: "system",
          content: "You are an English-to-Uzbek vocabulary tutor. For each English word provided, return the Uzbek translation and one simple English example sentence in English (max 12 words). You MUST respond ONLY with valid JSON — no markdown fences, no extra text.",
        },
        {
          role: "user",
          content: `Translate these English words to Uzbek and give an example sentence for each:\n\n${JSON.stringify(data.words)}\n\nReturn a JSON array: [{"word":"hello","translation_uz":"salom","example":"Hello, how are you?"}]`,
        },
      ], { temperature: 0.4, jsonMode: true });

      const parsed = parseJsonLoose(content);
      items = Array.isArray(parsed) ? parsed : [];
      items = items.filter((r: any) => r?.word && r?.translation_uz && r?.example);
    } catch (err) {
      console.error("[OCR] generateFromWordList Groq failed:", err);
      throw err; // Re-throw so UI shows the actual error
    }

    if (items.length === 0) throw new Error("AI hech qanday natija qaytarmadi. Qayta urinib ko'ring.");

    // Dedupe against words the user already has
    const { data: existing } = await supabase
      .from("words")
      .select("word")
      .eq("user_id", userId)
      .in("word", items.map((r) => String(r.word).trim().toLowerCase()));
    const existingSet = new Set((existing ?? []).map((r: any) => String(r.word).toLowerCase()));

    const rows = items.slice(0, 40).map((r) => ({
      user_id: userId,
      word: String(r.word).trim().toLowerCase(),
      translation_uz: String(r.translation_uz).trim(),
      example: String(r.example).trim(),
      ipa: "",
      example_uz: "",
      explanation: "",
      synonyms: [] as string[],
      antonyms: [] as string[],
      status: "ready",
    })).filter((r) => !existingSet.has(r.word));

    if (rows.length === 0) {
      return { inserted: 0, words: [], skipped: items.length };
    }

    const { error } = await supabase.from("words").insert(rows);
    if (error) throw new Error(error.message);

    return { inserted: rows.length, words: rows.map((r) => r.word), skipped: items.length - rows.length };
  });
