import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { haptics } from "@/lib/haptics";

type Opts = {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  /** Pull distance in px required to trigger. */
  threshold?: number;
  /** Max visual pull distance. */
  max?: number;
};

/**
 * iOS-style pull-to-refresh for any scrollable element.
 * Returns props to spread onto a scroll container plus a ready-to-render indicator.
 */
export function usePullToRefresh({ onRefresh, disabled, threshold = 70, max = 120 }: Opts) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
      armedRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // Resist after threshold
      const eased = dy < threshold ? dy : threshold + (dy - threshold) * 0.35;
      const clamped = Math.min(max, eased);
      setPull(clamped);
      if (!armedRef.current && clamped >= threshold) {
        armedRef.current = true;
        haptics.light();
      }
      // Prevent native rubber-band once we're actively pulling
      if (dy > 6) e.preventDefault();
    };
    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const shouldRefresh = pull >= threshold && !refreshing;
      startY.current = null;
      if (shouldRefresh) {
        setRefreshing(true);
        setPull(threshold);
        haptics.success();
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setPull(0);
          armedRef.current = false;
        }
      } else {
        setPull(0);
        armedRef.current = false;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, disabled, threshold, max, pull, refreshing]);

  const progress = Math.min(1, pull / threshold);
  const Indicator = (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, pull - 44)}px)`,
        opacity: pull > 4 || refreshing ? 1 : 0,
        transition: refreshing || pull === 0 ? "transform 240ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease" : undefined,
      }}
    >
      <div className="mt-2 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/[0.14] backdrop-blur-xl shadow-glow">
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-2)]" />
        ) : (
          <div
            className="h-5 w-5 rounded-full border-2 border-white/25 border-t-[var(--brand-2)]"
            style={{ transform: `rotate(${progress * 360}deg)`, transition: "transform 60ms linear" }}
          />
        )}
      </div>
    </div>
  );

  return { ref, refreshing, Indicator, pull };
}
