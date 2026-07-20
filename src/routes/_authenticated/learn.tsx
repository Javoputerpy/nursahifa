import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Volume2, Check, X, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import type { WordCard } from "@/components/Flashcard";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({ meta: [{ title: "O'rganish — VocabFlow" }] }),
  component: LearnPage,
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

function LearnPage() {
  const [cards, setCards] = useState<WordCard[]>([]);
  const [queue, setQueue] = useState<WordCard[]>([]);
  const [knownCount, setKnown] = useState(0);
  const [unknownCount, setUnknown] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; dx: number; dy: number; pointerId: number | null }>({
    startX: 0, startY: 0, dx: 0, dy: 0, pointerId: null,
  });
  const [drag, setDrag] = useState({ x: 0, rot: 0, leaving: null as null | "left" | "right" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("words")
        .select("id,word,translation_uz,ipa,example,example_uz,explanation,synonyms,antonyms,is_favorite")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .limit(200);
      const shuffled = shuffle((data ?? []) as WordCard[]);
      setQueue(shuffled);
      setCards(shuffled);
      setLoading(false);
    })();
  }, []);

  const current = queue[0];
  const next = queue[1];

  const finishSwipe = useCallback((dir: "left" | "right") => {
    if (!current) return;
    if ("vibrate" in navigator) navigator.vibrate?.(dir === "right" ? 15 : [10, 30, 10]);
    setDrag({ x: dir === "right" ? 600 : -600, rot: dir === "right" ? 25 : -25, leaving: dir });
    setTimeout(() => {
      setFlipped(false);
      setQueue((q) => {
        const [head, ...rest] = q;
        if (dir === "right") {
          setKnown((k) => k + 1);
          return rest;
        } else {
          setUnknown((u) => u + 1);
          return [...rest, head]; // requeue at end
        }
      });
      setDrag({ x: 0, rot: 0, leaving: null });
    }, 260);
  }, [current]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (drag.leaving) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, pointerId: e.pointerId };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.dx = dx;
    dragRef.current.dy = dy;
    setDrag({ x: dx, rot: dx / 18, leaving: null });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const { dx, dy } = dragRef.current;
    dragRef.current.pointerId = null;
    const moved = Math.abs(dx) + Math.abs(dy);
    if (Math.abs(dx) > 110) {
      finishSwipe(dx > 0 ? "right" : "left");
    } else if (moved < 8) {
      setFlipped((f) => !f);
      if ("vibrate" in navigator) navigator.vibrate?.(8);
      setDrag({ x: 0, rot: 0, leaving: null });
    } else {
      setDrag({ x: 0, rot: 0, leaving: null });
    }
  };

  const restart = () => {
    const shuffled = shuffle(cards);
    setQueue(shuffled);
    setKnown(0);
    setUnknown(0);
    setFlipped(false);
  };

  if (loading) {
    return (
      <div className="grid h-[calc(100dvh-72px)] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-2)]" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-brand shadow-glow">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{cards.length ? "Sessiya tugadi!" : "So'zlar yo'q"}</h1>
        {cards.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            ✅ Bilaman: {knownCount} &nbsp; ❌ Bilmayman: {unknownCount}
          </p>
        )}
        {cards.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Avval bir nechta so'z qo'shing.</p>
        )}
        <div className="mt-6 flex gap-3">
          {cards.length > 0 && (
            <button onClick={restart} className="flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow active:scale-95">
              <RotateCcw className="h-4 w-4" /> Qayta boshlash
            </button>
          )}
          <Link to="/add" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold active:scale-95">
            So'z qo'shish
          </Link>
        </div>
      </div>
    );
  }

  const showLike = drag.x > 40;
  const showNope = drag.x < -40;
  const transition = dragRef.current.pointerId !== null ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div className="mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col px-4 pt-3 pb-2 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight">O'rganish</h1>
          <p className="text-[11px] text-muted-foreground">
            ✅ {knownCount} &nbsp; ❌ {unknownCount} &nbsp; · {queue.length} qoldi
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="relative mt-2 flex-1 min-h-0">
        {/* Next card preview */}
        {next && (
          <div className="absolute inset-x-2 inset-y-2 rounded-[2rem] glass-card opacity-60 scale-[0.96]" aria-hidden />
        )}

        {/* Current card */}
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translateX(${drag.x}px) rotate(${drag.rot}deg)`,
            transition,
            touchAction: "none",
          }}
          className="absolute inset-0 select-none cursor-grab active:cursor-grabbing"
        >
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] glass-card p-4 text-white">
            <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />

            {/* swipe overlays */}
            <div
              className="pointer-events-none absolute left-4 top-4 rounded-xl border-2 border-green-400 px-3 py-1 text-xs font-extrabold uppercase text-green-400 transition"
              style={{ opacity: showLike ? 1 : 0, transform: `rotate(-12deg) scale(${showLike ? 1.1 : 0.8})` }}
            >
              Bilaman
            </div>
            <div
              className="pointer-events-none absolute right-4 top-4 rounded-xl border-2 border-red-400 px-3 py-1 text-xs font-extrabold uppercase text-red-400 transition"
              style={{ opacity: showNope ? 1 : 0, transform: `rotate(12deg) scale(${showNope ? 1.1 : 0.8})` }}
            >
              Bilmayman
            </div>

            <div className="relative flex items-start justify-between">
              <span className="glass-chip rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-2)]">
                {flipped ? "O'zbekcha" : "Inglizcha"}
              </span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); speak(current.word); }}
                className="grid h-10 w-10 place-items-center rounded-full glass-chip active:scale-90"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            <div
              className="relative flex flex-1 flex-col items-center justify-center text-center transition-transform duration-300"
              style={{ transform: `rotateY(${flipped ? 180 : 0}deg)`, transformStyle: "preserve-3d" }}
            >
              <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0 flex flex-col items-center justify-center px-3">
                <h1 className="text-[clamp(1.8rem,8vw,2.8rem)] font-extrabold leading-tight break-words">{current.word}</h1>
                {current.ipa && <p className="mt-1 font-mono text-xs text-white/70">/{current.ipa.replace(/^\/|\/$/g, "")}/</p>}
                {current.example && (
                  <p className="mt-4 max-w-xs text-xs italic text-white/85 line-clamp-3">"{current.example}"</p>
                )}
                <p className="mt-6 text-[10px] uppercase tracking-wider text-white/50">Tap — javob · Swipe — baholash</p>
              </div>
              <div
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                className="absolute inset-0 flex flex-col items-center justify-center px-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/60">Tarjima</p>
                <h2 className="mt-1 text-[clamp(1.5rem,7vw,2.4rem)] font-extrabold text-[var(--brand-2)] leading-tight break-words">
                  {current.translation_uz ?? "—"}
                </h2>
                {current.example_uz && (
                  <p className="mt-4 max-w-xs text-xs text-white/85 line-clamp-3">— {current.example_uz}</p>
                )}
                {current.explanation && (
                  <p className="mt-3 max-w-xs text-[11px] text-white/75 line-clamp-3">{current.explanation}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-center gap-6">
        <button
          onClick={() => finishSwipe("left")}
          className="grid h-14 w-14 place-items-center rounded-full bg-red-500/15 border border-red-400/40 text-red-400 active:scale-90 transition"
          aria-label="Bilmayman"
        >
          <X className="h-6 w-6" />
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="rounded-full glass-chip px-5 py-3 text-xs font-semibold text-[var(--brand-2)] active:scale-90"
        >
          Aylantirish
        </button>
        <button
          onClick={() => finishSwipe("right")}
          className="grid h-14 w-14 place-items-center rounded-full bg-green-500/15 border border-green-400/40 text-green-400 active:scale-90 transition"
          aria-label="Bilaman"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
