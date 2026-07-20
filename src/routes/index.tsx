import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles, Volume2, Heart, Brain, Send } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NurSahifa — Inglizcha so'zlarni AI bilan o'rganing" },
      { name: "description", content: "Kitob sahifasini rasmga oling — NurSahifa AI yordamida so'zlarni ajratib flashcardga aylantiradi va Swipe orqali yodlatadi." },
    ],
  }),
  component: Landing,
});

const TG_URL = "https://t.me/NurSahifaBot";

function Landing() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/feed", replace: true });
        return;
      }
      setAuthed(false);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background bg-mesh overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.14_75)] shadow-[0_0_24px_oklch(0.82_0.16_85_/_0.5)]">
            <Sparkles className="h-5 w-5 text-[oklch(0.15_0.05_260)]" />
          </div>
          <span className="text-lg font-bold tracking-tight">NurSahifa</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to={authed ? "/feed" : "/auth"}
            className="rounded-full bg-foreground/10 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-foreground/15"
          >
            {authed ? "Ilovaga kirish" : "Kirish"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <div className="text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.82_0.16_85_/_0.35)] bg-card/50 px-4 py-1.5 text-xs font-medium text-[oklch(0.82_0.16_85)] backdrop-blur animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.82_0.16_85)] animate-pulse" />
            AI yordamida — Telegram ichida
          </span>
          <h1
            className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            Sahifani suratga oling —<br />
            <span className="bg-gradient-to-r from-[oklch(0.85_0.18_85)] via-[oklch(0.78_0.16_85)] to-[oklch(0.65_0.14_75)] bg-clip-text text-transparent">
              so'zlar yoningizda.
            </span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            Kitob varag'ini suratga oling, AI inglizcha so'zlarni ajratadi, o'zbekcha tarjima, IPA, misol va Swipe-flashcardga aylantiradi.
          </p>
          <div
            className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "0.45s" }}
          >
            <a
              href={TG_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.85_0.18_85)] to-[oklch(0.68_0.14_75)] px-8 py-4 text-base font-bold text-[oklch(0.15_0.05_260)] animate-gold-pulse transition hover:scale-[1.04]"
            >
              <Send className="h-5 w-5" />
              Telegramda boshlash
            </a>
            <Link
              to={authed ? "/feed" : "/auth"}
              className="rounded-full border border-[oklch(0.82_0.16_85_/_0.4)] bg-card/40 px-8 py-4 text-base font-semibold backdrop-blur transition hover:bg-card/60"
            >
              {authed ? "Ilovaga kirish" : "Webda ochish"}
            </Link>
          </div>
        </div>

        <PhoneTilt />

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sparkles, title: "AI misollar", desc: "Har bir so'zga aqlli misollar" },
            { icon: Volume2, title: "Toza talaffuz", desc: "To'g'ri talaffuzni eshiting" },
            { icon: Heart, title: "Saqlash", desc: "Qiyin so'zlarni saqlab qo'ying" },
            { icon: Brain, title: "Test rejimi", desc: "Esda saqlashni sinab ko'ring" },
          ].map((f, i) => (
            <div
              key={f.title}
              className="rounded-3xl border border-[oklch(0.82_0.16_85_/_0.18)] bg-card/60 p-5 text-left backdrop-blur transition hover:border-[oklch(0.82_0.16_85_/_0.45)] hover:shadow-[0_0_28px_oklch(0.82_0.16_85_/_0.15)] animate-fade-in-up"
              style={{ animationDelay: `${0.6 + i * 0.08}s` }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.14_75)] shadow-[0_0_18px_oklch(0.82_0.16_85_/_0.45)]">
                <f.icon className="h-5 w-5 text-[oklch(0.15_0.05_260)]" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function PhoneTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      setTilt({ x: dy * -12, y: dx * 16 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="mt-20 grid place-items-center" style={{ perspective: 1200 }}>
      <div
        ref={ref}
        className="relative h-[460px] w-[240px] rounded-[42px] border border-[oklch(0.82_0.16_85_/_0.3)] bg-gradient-to-br from-[oklch(0.18_0.07_260)] to-[oklch(0.10_0.06_260)] p-3 shadow-[0_40px_120px_-30px_oklch(0_0_0_/_0.7),0_0_60px_oklch(0.82_0.16_85_/_0.18)] animate-fade-in-up"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s ease-out",
          animationDelay: "0.55s",
        }}
      >
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black/60" />
        <div className="h-full w-full overflow-hidden rounded-[32px] bg-[oklch(0.13_0.05_260)] p-4">
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.14_75)] shadow-[0_0_30px_oklch(0.82_0.16_85_/_0.6)]">
                <Sparkles className="h-8 w-8 text-[oklch(0.15_0.05_260)]" />
              </div>
              <p className="mt-5 text-[10px] uppercase tracking-widest text-[oklch(0.82_0.16_85)]">
                Skanerlash
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">illuminate</h3>
              <p className="mt-1 text-xs text-white/60">/ɪˈluː.mə.neɪt/</p>
              <p className="mt-4 text-sm font-semibold text-white">yoritmoq</p>
              <div className="mt-6 inline-flex rounded-full bg-[oklch(0.82_0.16_85_/_0.2)] px-3 py-1 text-[10px] text-[oklch(0.85_0.18_85)]">
                Swipe →
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
