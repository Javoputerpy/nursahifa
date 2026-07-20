import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { telegramWidgetSignIn, telegramSignIn } from "@/lib/telegram.functions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Sparkles, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Kirish — NurSahifa" }] }),
  component: AuthPage,
});

const TG_BOT_USERNAME = "NurSahifaBot";

function AuthPage() {
  const navigate = useNavigate();
  const tgSignIn = useServerFn(telegramWidgetSignIn);
  const tgWebAppSignIn = useServerFn(telegramSignIn);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const tgBoxRef = useRef<HTMLDivElement>(null);

  // Check if running inside Telegram Mini App
  const isTelegramMiniApp = typeof window !== "undefined" &&
    !!(window as any).Telegram?.WebApp?.initData &&
    (window as any).Telegram.WebApp.initData.length > 10;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed" });
    });
  }, [navigate]);

  // Telegram Login Widget (web)
  useEffect(() => {
    (window as any).__tgAuth = async (user: Record<string, string | number>) => {
      try {
        setLoading(true);
        const { email, password } = await tgSignIn({ data: { payload: user } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Telegram orqali kirildi!");
        navigate({ to: "/feed" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Telegram kirishida xato");
      } finally {
        setLoading(false);
      }
    };
    const box = tgBoxRef.current;
    if (!box || box.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", TG_BOT_USERNAME);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "20");
    s.setAttribute("data-onauth", "__tgAuth(user)");
    s.setAttribute("data-request-access", "write");
    box.appendChild(s);
  }, [tgSignIn, navigate]);

  // Telegram Mini App auto-login button
  const handleTelegramMiniApp = async () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) {
      toast.error("Telegram WebApp ma'lumotlari topilmadi");
      return;
    }
    setLoading(true);
    try {
      const { email, password } = await tgWebAppSignIn({ data: { initData: tg.initData } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Telegram orqali kirildi!");
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Telegram kirishida xato");
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/feed`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Akkaunt yaratildi!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/feed` });
    if (result.error) { toast.error(result.error.message); setLoading(false); return; }
    if (result.redirected) return;
    navigate({ to: "/feed" });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[oklch(0.10_0.06_260)]">
      {/* iOS-style ambient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[oklch(0.85_0.18_85_/_0.25)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[460px] w-[460px] rounded-full bg-[oklch(0.45_0.18_280_/_0.35)] blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[oklch(0.65_0.18_200_/_0.20)] blur-3xl" />

      <ThemeToggle className="fixed right-3 top-3 z-40" />

      <div className="relative mx-auto flex h-full max-w-md flex-col justify-center px-5 py-4">
        <Link to="/" className="mb-3 inline-flex items-center gap-2 self-center text-white">
          <div className="grid h-8 w-8 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.85_0.18_85)] to-[oklch(0.65_0.14_75)] shadow-[0_0_24px_oklch(0.82_0.16_85_/_0.6)]">
            <Sparkles className="h-4 w-4 text-[oklch(0.15_0.05_260)]" />
          </div>
          <span className="text-base font-bold tracking-tight">NurSahifa</span>
        </Link>

        <div className="rounded-[24px] border border-white/15 bg-white/[0.06] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <h1 className="text-center text-xl font-bold text-white">
            {mode === "signin" ? "Xush kelibsiz" : "Akkaunt yaratish"}
          </h1>
          <p className="mt-0.5 text-center text-[11px] text-white/60">
            {isTelegramMiniApp
              ? "Telegram profilingiz bilan kiring"
              : "Telegram ID orqali bir bosishda kiring"}
          </p>

          {/* Telegram Mini App login button (when inside Telegram) */}
          {isTelegramMiniApp ? (
            <button
              onClick={handleTelegramMiniApp}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2AABEE] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#229ED9] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Telegram orqali kirish
            </button>
          ) : (
            <>
              {/* Telegram Login Widget (web) */}
              <div className="mt-4 grid place-items-center">
                <div ref={tgBoxRef} className="min-h-[44px]" />
              </div>
            </>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/[0.14] disabled:opacity-50"
          >
            <GoogleIcon /> Google bilan davom etish
          </button>

          <div className="my-3 flex items-center gap-3 text-[10px] text-white/40">
            <div className="h-px flex-1 bg-white/15" /> yoki email <div className="h-px flex-1 bg-white/15" />
          </div>

          <form onSubmit={handleEmail} className="space-y-2">
            {mode === "signup" && (
              <input
                type="text" placeholder="Ismingiz" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/40 outline-none backdrop-blur focus:border-[oklch(0.82_0.16_85_/_0.5)] focus:ring-2 focus:ring-[oklch(0.82_0.16_85_/_0.3)]"
              />
            )}
            <input
              type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/40 outline-none backdrop-blur focus:border-[oklch(0.82_0.16_85_/_0.5)] focus:ring-2 focus:ring-[oklch(0.82_0.16_85_/_0.3)]"
            />
            <input
              type="password" required minLength={6} placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/40 outline-none backdrop-blur focus:border-[oklch(0.82_0.16_85_/_0.5)] focus:ring-2 focus:ring-[oklch(0.82_0.16_85_/_0.3)]"
            />
            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.85_0.18_85)] to-[oklch(0.68_0.14_75)] py-2.5 text-[13px] font-bold text-[oklch(0.15_0.05_260)] shadow-[0_10px_30px_-10px_oklch(0.82_0.16_85_/_0.7)] transition hover:scale-[1.01] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Kirish" : "Akkaunt yaratish"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-3 w-full text-center text-[12px] text-white/60 hover:text-white"
          >
            {mode === "signin" ? "Akkauntingiz yo'qmi? Ro'yxatdan o'ting" : "Akkauntingiz bormi? Kiring"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
