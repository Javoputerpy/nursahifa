import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { filterTextByLevel } from "@/lib/text.functions";
import { generateWordData } from "@/lib/ai.functions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2, Highlighter, ArrowLeft, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/text")({
  head: () => ({ meta: [{ title: "Matn laboratoriyasi — NurSahifa" }] }),
  component: TextLabPage,
});

type Level = "B1" | "B2" | "C1";
type Mode = "auto" | "manual";

const SAMPLE = `Resilience is the capacity to recover quickly from difficulties. People who cultivate resilience often display remarkable perseverance, adapting to adversity with a sense of purpose. Through deliberate practice and reflection, they transform setbacks into meaningful opportunities for growth.`;

function TextLabPage() {
  const navigate = useNavigate();
  const filterFn = useServerFn(filterTextByLevel);
  const generate = useServerFn(generateWordData);

  const [mode, setMode] = useState<Mode>("auto");
  const [text, setText] = useState(SAMPLE);
  const [level, setLevel] = useState<Level>("B2");
  const [autoWords, setAutoWords] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Tokenize for manual mode — keep punctuation as separate non-clickable tokens
  const tokens = useMemo(() => {
    return text.split(/(\s+|[^\w'\-]+)/).map((t, i) => ({
      i,
      raw: t,
      key: t.toLowerCase().replace(/[^a-z'\-]/g, ""),
      isWord: /[a-zA-Z]/.test(t) && /^[a-zA-Z'\-]+$/.test(t),
    }));
  }, [text]);

  const toggleWord = (k: string) => {
    if (!k) return;
    if ("vibrate" in navigator) navigator.vibrate?.(8);
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const runFilter = async () => {
    if (!text.trim()) return toast.error("Matn kiriting");
    setLoading(true);
    setAutoWords([]);
    try {
      const res = await filterFn({ data: { text, level } });
      setAutoWords(res.words);
      toast.success(`${res.words.length} ta ${level} so'z topildi`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  const createFlashcards = async (words: string[]) => {
    if (words.length === 0) return toast.error("Avval so'z tanlang");
    setCreating(true);
    try {
      const res = await generate({ data: { words } });
      toast.success(`${res.inserted} ta kartochka yaratildi`);
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setCreating(false);
    }
  };

  const pickedArr = Array.from(picked);

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col overflow-hidden px-4 pt-4 pb-3">
      {/* Ambient gold/navy blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#0A1128]/40 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Link
            to="/add"
            className="grid h-9 w-9 place-items-center rounded-2xl glass-chip active:scale-90 transition"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Matn laboratoriyasi</h1>
            <p className="text-[10px] text-muted-foreground">CEFR filtr · Qo'lda ajratish</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Mode tabs */}
      <div className="relative mt-3 grid grid-cols-2 gap-1 rounded-2xl glass-chip p-1 shrink-0">
        {([
          { k: "auto", l: "Auto (CEFR)", I: Wand2 },
          { k: "manual", l: "Qo'lda ajratish", I: Highlighter },
        ] as const).map(({ k, l, I }) => (
          <button
            key={k}
            onClick={() => setMode(k as Mode)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
              mode === k
                ? "bg-[#D4AF37] text-[#0A1128] shadow-glow"
                : "text-muted-foreground"
            }`}
          >
            <I className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>

      {mode === "auto" ? (
        <>
          {/* Level toggles */}
          <div className="relative mt-3 grid grid-cols-3 gap-2 shrink-0">
            {(["B1", "B2", "C1"] as Level[]).map((lv) => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`relative rounded-2xl border-2 py-2.5 text-sm font-extrabold tracking-wider transition active:scale-95 ${
                  level === lv
                    ? "border-[#D4AF37] bg-[#D4AF37] text-[#0A1128] animate-gold-pulse"
                    : "border-[#D4AF37]/40 text-[#D4AF37] glass-chip"
                }`}
              >
                {lv}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="relative mt-3 flex-1 min-h-0 rounded-3xl glass-card p-2 overflow-hidden">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Inglizcha matn yopishtiring…"
              maxLength={8000}
              className="h-full w-full resize-none rounded-2xl bg-transparent p-3 text-sm text-white outline-none placeholder:text-white/50"
            />
          </div>

          {/* Results */}
          {(loading || autoWords.length > 0) && (
            <div className="relative mt-3 max-h-[28dvh] overflow-y-auto rounded-2xl glass-inner p-2 shrink-0">
              {loading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 rounded-xl bg-gradient-to-r from-[#D4AF37]/10 via-[#D4AF37]/30 to-[#D4AF37]/10 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 animate-fade-in-up">
                  {autoWords.map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-[#D4AF37] px-2.5 py-1 text-[11px] font-bold text-[#0A1128]"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={loading ? undefined : (autoWords.length ? () => createFlashcards(autoWords) : runFilter)}
            disabled={loading || creating || !text.trim()}
            className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-bold text-[#0A1128] shadow-glow transition active:scale-95 disabled:opacity-60 shrink-0 animate-gold-pulse"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {level} so'zlarni topish…</>
            ) : creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Kartochkalar yaratilmoqda…</>
            ) : autoWords.length ? (
              <><Plus className="h-4 w-4" /> {autoWords.length} ta kartochka yaratish</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {level} darajada filtrlash</>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Manual textarea (collapsible) or reader */}
          <div className="relative mt-3 flex flex-col gap-2 shrink-0">
            <details className="rounded-2xl glass-chip">
              <summary className="cursor-pointer rounded-2xl px-3 py-2 text-[11px] font-semibold text-[#D4AF37]">
                ✎ Matnni tahrirlash
              </summary>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setPicked(new Set()); }}
                maxLength={8000}
                rows={4}
                className="w-full resize-none rounded-b-2xl bg-transparent p-3 text-xs outline-none"
              />
            </details>
          </div>

          {/* Reader */}
          <div className="relative mt-3 flex-1 min-h-0 overflow-y-auto rounded-3xl glass-card p-5 leading-relaxed text-[15px] text-white animate-fade-in-up">
            <p className="font-serif">
              {tokens.map((t) =>
                t.isWord ? (
                  <span
                    key={t.i}
                    onClick={() => toggleWord(t.key)}
                    className={`cursor-pointer rounded px-0.5 transition-all duration-150 active:scale-95 ${
                      picked.has(t.key)
                        ? "bg-[#D4AF37] text-[#0A1128] font-semibold shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {t.raw}
                  </span>
                ) : (
                  <span key={t.i}>{t.raw}</span>
                ),
              )}
            </p>
          </div>

          {/* Sticky bottom action */}
          <div className="relative mt-3 shrink-0">
            <button
              onClick={() => createFlashcards(pickedArr)}
              disabled={creating || pickedArr.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-3 text-sm font-bold text-[#0A1128] shadow-glow transition active:scale-95 disabled:opacity-50 animate-gold-pulse"
            >
              {creating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda…</>
              ) : (
                <><Plus className="h-4 w-4" /> Kartochka yaratish ({pickedArr.length})</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
