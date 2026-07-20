import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("vf-theme") : null;
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("vf-theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="Mavzuni almashtirish"
      className={`glass-chip grid h-10 w-10 place-items-center rounded-full transition active:scale-90 hover:scale-105 ${className}`}
    >
      {dark ? <Sun className="h-4 w-4 text-[var(--brand-2)]" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
