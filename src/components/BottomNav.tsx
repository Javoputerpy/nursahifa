import { Link } from "@tanstack/react-router";
import { Home, Plus, Layers, Brain, User } from "lucide-react";

type Item = { to: string; label: string; icon: typeof Home; primary?: boolean };
const items: Item[] = [
  { to: "/feed", label: "Lenta", icon: Home },
  { to: "/learn", label: "O'rgan", icon: Layers },
  { to: "/add", label: "Qo'shish", icon: Plus, primary: true },
  { to: "/quiz", label: "Test", icon: Brain },
  { to: "/profile", label: "Men", icon: User },
];

export const NAV_HEIGHT = 72;

export function BottomNav() {
  return (
    <nav
      style={{ height: NAV_HEIGHT }}
      className="fixed inset-x-0 bottom-0 z-50 glass-nav"
    >
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className:
                "[&_.nav-ico]:fill-[var(--brand-2)] [&_.nav-ico]:text-[var(--brand-2)] [&_.nav-ico]:scale-110 [&_.nav-label]:text-[var(--brand-2)]",
            }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="group flex flex-col items-center gap-0.5 px-3 py-1.5 select-none active:scale-90 transition-transform duration-150"
          >
            {item.primary ? (
              <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-2xl bg-gradient-brand shadow-glow transition-transform duration-200 group-hover:scale-110 group-active:scale-90">
                <item.icon className="h-6 w-6 text-white nav-ico transition-transform" strokeWidth={2.4} />
              </span>
            ) : (
              <item.icon className="h-5 w-5 nav-ico transition-all duration-200" strokeWidth={2} />
            )}
            {!item.primary && <span className="nav-label text-[10px] font-semibold">{item.label}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
