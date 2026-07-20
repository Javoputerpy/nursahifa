import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flashcard, type WordCard } from "@/components/Flashcard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Saqlangan — VocabFlow" }] }),
  component: Favorites,
});

function Favorites() {
  const [cards, setCards] = useState<WordCard[] | null>(null);

  useEffect(() => {
    supabase
      .from("words")
      .select("id,word,translation_uz,ipa,example,example_uz,explanation,synonyms,antonyms,is_favorite")
      .eq("is_favorite", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setCards((data as WordCard[]) ?? []);
      });
  }, []);

  const toggleFav = useCallback(async (id: string, value: boolean) => {
    await supabase.from("words").update({ is_favorite: value }).eq("id", id);
    setCards((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }, []);

  if (cards === null) {
    return <div className="flex h-[calc(100dvh-72px)] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-72px)] flex-col items-center justify-center px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-brand shadow-glow">
          <Heart className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Saqlangan so'zlar yo'q</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">Kartochkadagi yurakchaga bosib so'zlarni saqlang.</p>
        <Link to="/feed" className="mt-6 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow">Lentaga qaytish</Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <ThemeToggle className="fixed right-4 top-4 z-40" />
      <div className="scroll-snap-y no-scrollbar h-[calc(100dvh-72px)] overflow-y-auto">
        {cards.map((c) => <Flashcard key={c.id} card={c} onToggleFavorite={toggleFav} />)}
      </div>
    </div>
  );
}
