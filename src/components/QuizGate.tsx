import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import type { WordCard } from "@/components/Flashcard";
import { haptics } from "@/lib/haptics";

type QuizKind = "word_to_meaning" | "meaning_to_word";

export type QuizPool = Pick<WordCard, "id" | "word" | "translation_uz">;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(pool: QuizPool[], distractorPool: QuizPool[]) {
  const usable = pool.filter((p) => p.translation_uz && p.word);
  const base = usable.length ? usable : pool;
  const target = base[Math.floor(Math.random() * base.length)];
  const kind: QuizKind = Math.random() < 0.5 ? "word_to_meaning" : "meaning_to_word";

  const allDistract = distractorPool
    .filter((p) => p.id !== target.id && p.translation_uz && p.word)
    .slice(0, 40);
  const picked = shuffle(allDistract).slice(0, 3);

  const correct = kind === "word_to_meaning" ? (target.translation_uz ?? target.word) : target.word;
  const distractLabels = picked.map((p) =>
    kind === "word_to_meaning" ? (p.translation_uz ?? p.word) : p.word,
  );

  // Ensure 4 options; pad with variants if not enough
  const filler = ["—", "N/A", "?", "..."];
  while (distractLabels.length < 3) distractLabels.push(filler[distractLabels.length] ?? "—");

  const options = shuffle([correct, ...distractLabels]);
  const prompt = kind === "word_to_meaning" ? target.word : (target.translation_uz ?? target.word);
  const promptLabel = kind === "word_to_meaning" ? "Ushbu so'z ma'nosi?" : "Bu ma'no qaysi so'zga tegishli?";
  return { target, kind, correct, options, prompt, promptLabel };
}

export function QuizGate({
  pool,
  distractorPool,
  onPass,
}: {
  pool: QuizPool[];
  distractorPool: QuizPool[];
  onPass: () => void;
}) {
  const [seed, setSeed] = useState(0);
  const q = useMemo(() => buildQuestion(pool, distractorPool.length ? distractorPool : pool), [pool, distractorPool, seed]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());

  useEffect(() => { setSelected(null); setWrong(new Set()); }, [seed]);

  const answer = (opt: string) => {
    if (selected === q.correct) return;
    if (opt === q.correct) {
      haptics.success();
      setSelected(opt);
      setTimeout(() => onPass(), 650);
    } else {
      haptics.error();
      setSelected(opt);
      setWrong((w) => new Set(w).add(opt));
      // After a brief pause, reset selection so user can try again
      setTimeout(() => setSelected(null), 900);
    }
  };

  const tryAnother = () => { setSeed((s) => s + 1); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl animate-page-in">
      <div className="w-full max-w-md rounded-[2rem] glass-card p-5 text-white shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/60">Mini test</p>
            <p className="text-sm font-semibold truncate">{q.promptLabel}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl glass-inner p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/60">
            {q.kind === "word_to_meaning" ? "Inglizcha" : "O'zbekcha"}
          </p>
          <p className="mt-1 text-[clamp(1.4rem,6vw,2rem)] font-extrabold leading-tight break-words hyphens-auto">
            {q.prompt}
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          {q.options.map((opt) => {
            const isCorrect = selected === q.correct && opt === q.correct;
            const isWrongSel = selected === opt && opt !== q.correct;
            const wasWrong = wrong.has(opt);
            const revealCorrect = wrong.size > 0 && opt === q.correct;
            const base =
              "flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.98]";
            const tone = isCorrect || revealCorrect
              ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
              : isWrongSel
                ? "border-red-400/60 bg-red-500/20 text-red-100"
                : wasWrong
                  ? "border-white/10 bg-white/[0.03] text-white/50"
                  : "border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]";
            return (
              <button
                key={opt}
                type="button"
                disabled={wasWrong || selected === q.correct}
                onClick={() => answer(opt)}
                className={`${base} ${tone} disabled:cursor-not-allowed`}
              >
                <span className="min-w-0 break-words">{opt}</span>
                {(isCorrect || revealCorrect) && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {isWrongSel && <XCircle className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {wrong.size > 0 && selected !== q.correct && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            <span className="min-w-0">
              To'g'ri javob: <span className="font-bold">{q.correct}</span>. Davom etish uchun to'g'ri variantni bosing.
            </span>
            <button
              onClick={tryAnother}
              className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90"
            >
              Boshqa savol
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
