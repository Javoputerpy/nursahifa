import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Lightweight page transition: fade + tiny slide-up between route changes.
 * Uses CSS keyed on pathname — no framer-motion dependency. ~220ms.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(pathname);
  useEffect(() => { setKey(pathname); }, [pathname]);
  return (
    <div key={key} className="animate-page-in">
      {children}
    </div>
  );
}
