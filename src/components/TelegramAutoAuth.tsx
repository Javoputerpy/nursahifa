import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { telegramSignIn } from "@/lib/telegram.functions";
import { Sparkles } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: { user?: { id: number } };
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

type Phase = "hidden" | "loading" | "success" | "exit";

export function TelegramAutoAuth() {
  const signIn = useServerFn(telegramSignIn);
  const navigate = useNavigate();
  const { location } = useRouterState();
  const ranRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (ranRef.current) return;
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    const initData = tg?.initData;
    if (!tg || !initData || initData.length < 10) return;
    ranRef.current = true;

    try { tg.ready?.(); tg.expand?.(); } catch {}
    setPhase("loading");

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { email, password } = await signIn({ data: { initData } });
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        setPhase("success");
        setTimeout(() => setPhase("exit"), 900);
        setTimeout(() => {
          setPhase("hidden");
          if (location.pathname === "/" || location.pathname === "/auth") {
            navigate({ to: "/feed" });
          }
        }, 1500);
      } catch (err) {
        console.error("Telegram auth failed:", err);
        setPhase("hidden");
      }
    })();
  }, [signIn, navigate, location.pathname]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-[oklch(0.10_0.06_260)] overflow-hidden ${
        phase === "exit" ? "animate-[fade-in-up_0.5s_reverse_both] [filter:blur(20px)] opacity-0" : ""
      }`}
      style={{ transition: "opacity 0.6s ease, filter 0.6s ease" }}
    >
      <div className="relative grid place-items-center">
        {/* Spinning ring */}
        <div
          className={`absolute h-44 w-44 rounded-full border-2 border-transparent border-t-[oklch(0.82_0.16_85)] border-r-[oklch(0.82_0.16_85_/_0.4)] ${
            phase === "loading" ? "animate-spin-slow" : ""
          }`}
        />
        <div className="absolute h-56 w-56 rounded-full bg-[oklch(0.82_0.16_85_/_0.08)] blur-2xl" />

        {/* Logo */}
        <div
          className={`relative grid h-24 w-24 place-items-center rounded-[28px] bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.14_75)] shadow-[0_0_60px_oklch(0.82_0.16_85_/_0.6)] ${
            phase === "success" ? "animate-gold-pulse" : ""
          }`}
        >
          <Sparkles className="h-12 w-12 text-[oklch(0.15_0.05_260)]" strokeWidth={2.4} />
        </div>

        {/* Gold particles */}
        {phase === "success" && (
          <>
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = (i / 18) * Math.PI * 2;
              const dist = 120 + (i % 3) * 30;
              const x = Math.cos(angle) * dist;
              const y = Math.sin(angle) * dist;
              return (
                <span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-[oklch(0.85_0.18_85)] shadow-[0_0_12px_oklch(0.85_0.18_85)] animate-particles-burst"
                  style={
                    {
                      ["--px" as any]: `${x}px`,
                      ["--py" as any]: `${y}px`,
                      animationDelay: `${(i % 4) * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </>
        )}

        <p className="absolute top-[calc(100%+28px)] text-sm font-semibold tracking-wide text-[oklch(0.85_0.18_85)]">
          {phase === "success" ? "✓ Xush kelibsiz!" : "NurSahifa yuklanmoqda…"}
        </p>
      </div>
    </div>
  );
}
