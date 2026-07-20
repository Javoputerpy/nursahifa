import { Volume2, Heart, Sparkles } from "lucide-react";
import { useCallback, useState, useEffect } from "react";

export type WordCard = {
  id: string;
  word: string;
  translation_uz: string | null;
  ipa: string | null;
  example: string | null;
  example_uz: string | null;
  explanation: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  is_favorite: boolean;
};

export function Flashcard({
  card,
  onToggleFavorite,
  startWithUz = false,
}: {
  card: WordCard;
  onToggleFavorite?: (id: string, value: boolean) => void;
  startWithUz?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [card.id, startWithUz]);

  const speak = useCallback((text: string, lang = "en-US") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, []);

  const showingUz = startWithUz ? !flipped : flipped;
  const frontWord = showingUz ? (card.translation_uz ?? card.word) : card.word;

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ("vibrate" in navigator) navigator.vibrate?.(15);
    onToggleFavorite?.(card.id, !card.is_favorite);
  };

  return (
    <article className="snap-start relative flex min-h-[calc(100dvh-72px)] w-full items-stretch justify-center px-3 py-3">
      <button
        type="button"
        onClick={() => { if ("vibrate" in navigator) navigator.vibrate?.(8); setFlipped((f) => !f); }}
        className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] glass-card p-4 text-left text-white animate-float-up active:scale-[0.99] transition-transform"
      >
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />

        <div className="relative flex items-start justify-between gap-2">
          <span className="glass-chip rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-2)] shrink-0">
            {showingUz ? "O'zbekcha" : "Inglizcha"}
          </span>
          <span
            onClick={handleFavorite}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full glass-chip transition active:scale-75 hover:scale-110"
            aria-label="Saqlash"
          >
            <Heart className={`h-4 w-4 transition ${card.is_favorite ? "fill-[var(--brand-2)] text-[var(--brand-2)] scale-110" : ""}`} />
          </span>
        </div>

        {/* Hero word */}
        <div className="relative mt-4 flex flex-col items-center justify-center text-center">
          <h1 className="w-full text-[clamp(1.6rem,7vw,2.6rem)] font-extrabold leading-tight tracking-tight break-words hyphens-auto">
            {frontWord}
          </h1>
          {!showingUz && card.ipa && (
            <p className="mt-1 text-xs text-white/70 font-mono break-words px-2">/{card.ipa.replace(/^\/|\/$/g, "")}/</p>
          )}
          <span
            onClick={(e) => { e.stopPropagation(); if ("vibrate" in navigator) navigator.vibrate?.(8); speak(card.word); }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-semibold text-[var(--brand-2)] active:scale-90 transition"
          >
            <Volume2 className="h-3.5 w-3.5" /> Talaffuz
          </span>
        </div>

        {!flipped ? (
          <div className="relative mt-6 pb-1 text-center text-xs text-white/60">
            Kartochkani ko'rish uchun bosing
          </div>
        ) : (
          <div className="relative mt-4 flex flex-col gap-2 text-sm">
            <div className="rounded-2xl glass-inner p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/60">{showingUz ? "Inglizcha" : "O'zbekcha"}</p>
              <p className="mt-1 text-[clamp(1.05rem,4.8vw,1.35rem)] font-bold text-[var(--brand-2)] break-words leading-snug hyphens-auto">
                {showingUz ? card.word : (card.translation_uz ?? "—")}
              </p>
            </div>

            {card.example && (
              <div className="rounded-2xl glass-inner p-3">
                <p className="italic leading-snug text-[13px] break-words">"{card.example}"</p>
                {card.example_uz && <p className="mt-1 text-white/80 text-[12px] break-words">— {card.example_uz}</p>}
              </div>
            )}

            {card.explanation && (
              <div className="flex gap-2 rounded-2xl glass-inner p-3">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-2)]" />
                <p className="leading-snug text-[13px] text-white/95 break-words min-w-0">{card.explanation}</p>
              </div>
            )}

            {(card.synonyms?.length || card.antonyms?.length) ? (
              <div className="grid grid-cols-2 gap-2">
                {card.synonyms?.length ? (
                  <div className="rounded-xl glass-inner p-2.5 min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-white/60">Sinonim</p>
                    <p className="mt-1 text-[12px] font-medium break-words">{card.synonyms.join(", ")}</p>
                  </div>
                ) : null}
                {card.antonyms?.length ? (
                  <div className="rounded-xl glass-inner p-2.5 min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-white/60">Antonim</p>
                    <p className="mt-1 text-[12px] font-medium break-words">{card.antonyms.join(", ")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </button>
    </article>
  );
}
