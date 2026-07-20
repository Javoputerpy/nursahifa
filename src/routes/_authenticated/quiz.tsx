import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, Check, X, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

type W = { id: string; word: string; translation_uz: string | null };
type Q = { word: string; correct: string; choices: string[] };

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({ meta: [{ title: "Test — VocabFlow" }] }),
  component: Quiz,
});

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function Quiz() {
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("words")
      .select("id,word,translation_uz")
      .not("translation_uz", "is", null)
      .limit(50)
      .then(({ data }) => {
        const words = (data as W[]) ?? [];
        if (words.length < 4) { setQuestions([]); return; }
        const pool = shuffle(words).slice(0, Math.min(10, words.length));
        const qs: Q[] = pool.map((w) => {
          const distractors = shuffle(words.filter((x) => x.id !== w.id))
            .slice(0, 3)
            .map((x) => x.translation_uz!) ;
          return {
            word: w.word,
            correct: w.translation_uz!,
            choices: shuffle([w.translation_uz!, ...distractors]),
          };
        });
        setQuestions(qs);
      });
  }, []);

  const finish = async (finalScore: number, total: number) => {
    setDone(true);
    const { error } = await supabase.from("quiz_results").insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      score: finalScore,
      total,
    });
    if (error) toast.error(error.message);
  };

  if (questions === null) {
    return <div className="flex h-[calc(100dvh-72px)] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-72px)] flex-col items-center justify-center px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-brand shadow-glow">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Ko'proq so'z kerak</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">Testni boshlash uchun kamida 4 ta so'z qo'shing.</p>
        <Link to="/add" className="mt-6 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow">So'z qo'shish</Link>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex h-[calc(100dvh-72px)] flex-col items-center justify-center px-6 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-[2rem] bg-gradient-brand shadow-glow">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold">{score}/{questions.length}</h2>
        <p className="mt-1 text-lg text-muted-foreground">{pct}% to'g'ri</p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => { setQuestions(null); setIdx(0); setScore(0); setPicked(null); setDone(false); window.location.reload(); }}
            className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow"
          >
            Yana o'ynash
          </button>
          <Link to="/profile" className="rounded-full border border-border px-6 py-3 text-sm font-semibold">Statistika</Link>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const handlePick = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    const correct = choice === q.correct;
    const newScore = score + (correct ? 1 : 0);
    if (correct) setScore(newScore);
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        finish(newScore, questions.length);
      } else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 900);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col px-5 pt-6 pb-4 overflow-hidden">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Savol {idx + 1} / {questions.length}</span>
        <div className="flex items-center gap-3">
          <span>Hisob: {score}</span>
          <ThemeToggle />
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted shrink-0">
        <div className="h-full bg-gradient-brand transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="mt-4 rounded-3xl bg-gradient-card p-5 text-center text-white shadow-glow shrink-0">
        <p className="text-[11px] uppercase tracking-wider text-[var(--brand-2)]">O'zbekchaga tarjima qiling</p>
        <h2 className="mt-2 text-[clamp(1.5rem,7vw,2.25rem)] font-extrabold leading-tight">{q.word}</h2>
      </div>

      <div className="mt-3 flex flex-1 min-h-0 flex-col justify-center gap-2">
        {q.choices.map((choice) => {
          const isPicked = picked === choice;
          const isRight = picked && choice === q.correct;
          const isWrong = isPicked && choice !== q.correct;
          return (
            <button
              key={choice}
              onClick={() => handlePick(choice)}
              disabled={!!picked}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]
                ${isRight ? "border-success bg-success/15 text-success" : ""}
                ${isWrong ? "border-destructive bg-destructive/15 text-destructive" : ""}
                ${!picked ? "border-border bg-card hover:bg-accent" : ""}
              `}
            >
              <span className="truncate">{choice}</span>
              {isRight && <Check className="h-5 w-5 shrink-0" />}
              {isWrong && <X className="h-5 w-5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

