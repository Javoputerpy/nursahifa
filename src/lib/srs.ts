// Simple SRS scheduling (Anki-inspired, fixed intervals per user spec).
export type Rating = "again" | "hard" | "good" | "easy";

export const INTERVAL_MINUTES: Record<Rating, number> = {
  again: 10,
  hard: 60 * 24,
  good: 60 * 24 * 3,
  easy: 60 * 24 * 7,
};

export const RATING_LABEL_UZ: Record<Rating, string> = {
  again: "Qaytadan",
  hard: "Qiyin",
  good: "Yaxshi",
  easy: "Oson",
};


export function nextMasteryLevel(current: string, rating: Rating, newReviewCount: number): string {
  if (rating === "again") return "learning";
  if (newReviewCount >= 4 && (rating === "good" || rating === "easy")) return "mastered";
  if (current === "new") return "learning";
  return current;
}

export function computeNextReview(rating: Rating) {
  const mins = INTERVAL_MINUTES[rating];
  const next = new Date(Date.now() + mins * 60_000);
  return { intervalMinutes: mins, nextReviewAt: next.toISOString() };
}
