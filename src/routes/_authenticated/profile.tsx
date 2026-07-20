import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatedCounter, ProgressRing } from "@/components/AnimatedCounter";
import { RemindersSettings } from "@/components/RemindersSettings";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { haptics } from "@/lib/haptics";
import {
  LogOut, BookOpen, Heart, Trophy, Loader2, Flame, Clock, TrendingUp,
  Sparkles, Target, CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — NurSahifa" }] }),
  component: Profile,
});

type Stats = {
  totalWords: number;
  favorites: number;
  quizzes: number;
  avg: number;
  bestScore: number;
  dueToday: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  totalReviews: number;
  reviewsToday: number;
  createdThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  todaySeconds: number;
  totalSeconds: number;
};

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}s ${mm}m` : `${h}s`;
}

function Profile() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? "");
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    setName(prof?.display_name ?? user.email?.split("@")[0] ?? "O'quvchi");

    const now = new Date();
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0);

    const [
      { count: totalWords },
      { count: favorites },
      { data: quizzes },
      { data: mastery },
      { count: dueToday },
      { count: totalReviews },
      { count: reviewsToday },
      { count: createdThisWeek },
      streakRes,
    ] = await Promise.all([
      supabase.from("words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("words").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_favorite", true),
      supabase.from("quiz_results").select("score,total").eq("user_id", user.id),
      supabase.from("words").select("mastery_level").eq("user_id", user.id).eq("status", "ready"),
      supabase.from("words").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "ready").lte("next_review_at", endOfDay.toISOString()),
      supabase.from("review_history").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("review_history").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).gte("reviewed_at", startOfDay.toISOString()),
      supabase.from("words").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", startOfWeek.toISOString()),
      supabase.from("user_streaks" as any).select("current_streak,longest_streak,today_seconds,total_seconds,today_date").eq("user_id", user.id).maybeSingle(),
    ]);

    const qs = quizzes ?? [];
    const avg = qs.length ? Math.round((qs.reduce((s, q) => s + q.score / q.total, 0) / qs.length) * 100) : 0;
    const bestScore = qs.length ? Math.max(...qs.map((q) => Math.round((q.score / q.total) * 100))) : 0;
    const rows = (mastery ?? []) as { mastery_level: string }[];
    const streak = (streakRes.data as any) ?? {};
    const todayStr = startOfDay.toISOString().slice(0, 10);
    const todaySeconds = streak.today_date === todayStr ? (streak.today_seconds ?? 0) : 0;

    setStats({
      totalWords: totalWords ?? 0,
      favorites: favorites ?? 0,
      quizzes: qs.length,
      avg,
      bestScore,
      dueToday: dueToday ?? 0,
      newCount: rows.filter((r) => r.mastery_level === "new").length,
      learningCount: rows.filter((r) => r.mastery_level === "learning").length,
      masteredCount: rows.filter((r) => r.mastery_level === "mastered").length,
      totalReviews: totalReviews ?? 0,
      reviewsToday: reviewsToday ?? 0,
      createdThisWeek: createdThisWeek ?? 0,
      currentStreak: streak.current_streak ?? 0,
      longestStreak: streak.longest_streak ?? 0,
      todaySeconds,
      totalSeconds: streak.total_seconds ?? 0,
    });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const { ref: scrollRef, Indicator } = usePullToRefresh({ onRefresh: loadAll });

  const signOut = async () => {
    haptics.medium();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div ref={scrollRef} className="relative h-[100dvh] w-full overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth bg-background pb-[calc(96px+env(safe-area-inset-bottom))]">
      {Indicator}
      <div className="pointer-events-none fixed -top-24 -left-16 h-[320px] w-[320px] rounded-full bg-[oklch(0.85_0.18_85_/_0.18)] blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -right-16 h-[340px] w-[340px] rounded-full bg-[oklch(0.45_0.18_280_/_0.25)] blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-md flex-col px-4 pt-4 sm:max-w-xl md:max-w-2xl lg:max-w-3xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-xl font-bold text-white shadow-glow">
              {(name?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{name}</h1>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {stats === null ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Streak hero */}
            <div className="mt-4 relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-red-500/10 p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Flame
                    className={`h-14 w-14 text-orange-400 ${stats.currentStreak > 0 ? "animate-pulse-slow drop-shadow-[0_0_16px_rgba(251,146,60,0.7)]" : "opacity-40"}`}
                    fill={stats.currentStreak > 0 ? "currentColor" : "none"}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-orange-300/90">Joriy seriya</p>
                  <p className="flex items-baseline gap-2">
                    <AnimatedCounter value={stats.currentStreak} className="text-4xl font-extrabold" />
                    <span className="text-sm font-semibold text-orange-200/90">kun</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Eng uzun: <span className="font-semibold text-foreground">{stats.longestStreak} kun</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Accuracy + Reviews today (dual rings) */}
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <RingCard
                label="Aniqlik"
                value={stats.avg}
                suffix="%"
                progress={stats.avg / 100}
                color="oklch(0.75 0.16 145)"
                icon={Target}
              />
              <RingCard
                label="Bugun takror"
                value={stats.reviewsToday}
                progress={Math.min(1, stats.reviewsToday / Math.max(1, stats.dueToday + stats.reviewsToday))}
                sub={`/${stats.dueToday + stats.reviewsToday} rejalash.`}
                color="var(--brand-2)"
                icon={CalendarDays}
              />
              <TimeCard icon={Clock} label="Bugun o'qildi" seconds={stats.todaySeconds} />
              <TimeCard icon={Sparkles} label="Umumiy vaqt" seconds={stats.totalSeconds} />
            </div>

            {/* Mastery breakdown */}
            <div className="mt-3 rounded-3xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">O'zlashtirish darajasi</p>
                <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <MasteryBar
                newCount={stats.newCount}
                learningCount={stats.learningCount}
                masteredCount={stats.masteredCount}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Yangi" value={stats.newCount} color="text-sky-300" dot="bg-sky-400" />
                <MiniStat label="O'rganilyapti" value={stats.learningCount} color="text-amber-300" dot="bg-amber-400" />
                <MiniStat label="O'zlashtirilgan" value={stats.masteredCount} color="text-emerald-300" dot="bg-emerald-400" />
              </div>
            </div>

            {/* Grid stats */}
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <Stat icon={BookOpen} label="Jami so'zlar" value={stats.totalWords} />
              <Stat icon={Heart} label="Saqlangan" value={stats.favorites} />
              <Stat icon={Trophy} label="Jami takrorlar" value={stats.totalReviews} />
              <Stat icon={CalendarDays} label="Shu haftada qo'shildi" value={stats.createdThisWeek} />
              <Stat icon={Trophy} label="Testlar" value={stats.quizzes} />
              <Stat icon={Target} label="Eng yaxshi ball" value={`${stats.bestScore}%`} />
            </div>

            {userId && <RemindersSettings userId={userId} />}
          </>
        )}
      </div>


      <div
        className="fixed inset-x-0 z-40 px-4"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl sm:px-2">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] py-3 text-sm font-semibold text-foreground shadow-glow backdrop-blur-xl transition hover:bg-white/[0.14] active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" /> Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}

function RingCard({
  label, value, suffix, progress, sub, color, icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  progress: number;
  sub?: string;
  color: string;
  icon: typeof Target;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-3 backdrop-blur-xl">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="flex items-center gap-3">
        <ProgressRing progress={progress} size={72} stroke={7} color={color}>
          <div className="text-center leading-none">
            <AnimatedCounter value={value} className="text-lg font-extrabold" suffix={suffix ?? ""} />
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function TimeCard({ icon: Icon, label, seconds }: { icon: typeof Clock; label: string; seconds: number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1.5 text-xl font-extrabold">{formatDuration(seconds)}</p>
    </div>
  );
}

function MasteryBar({ newCount, learningCount, masteredCount }: { newCount: number; learningCount: number; masteredCount: number }) {
  const total = Math.max(1, newCount + learningCount + masteredCount);
  const nP = (newCount / total) * 100;
  const lP = (learningCount / total) * 100;
  const mP = (masteredCount / total) * 100;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div style={{ width: `${mP}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} className="bg-emerald-400" />
      <div style={{ width: `${lP}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} className="bg-amber-400" />
      <div style={{ width: `${nP}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} className="bg-sky-400" />
    </div>
  );
}

function MiniStat({ label, value, color, dot }: { label: string; value: number; color: string; dot: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className={`text-lg font-extrabold ${color}`}><AnimatedCounter value={value} /></p>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3 backdrop-blur-xl">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-1.5 text-xl font-extrabold">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
