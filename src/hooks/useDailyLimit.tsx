import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkScanLimit, incrementScanCount } from "@/lib/ocr.functions";
import { DAILY_SCAN_LIMIT } from "@/lib/groq";
import { toast } from "sonner";

type LimitState = {
  count: number;
  limit: number;
  remaining: number;
  loading: boolean;
  exceeded: boolean;
};

export function useDailyScanLimit() {
  const checkLimit = useServerFn(checkScanLimit);
  const incrementCount = useServerFn(incrementScanCount);

  const [state, setState] = useState<LimitState>({
    count: 0,
    limit: DAILY_SCAN_LIMIT,
    remaining: DAILY_SCAN_LIMIT,
    loading: false,
    exceeded: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await checkLimit({ data: undefined });
      setState({
        count: res.count,
        limit: res.limit,
        remaining: res.remaining,
        loading: false,
        exceeded: res.remaining <= 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.startsWith("LIMIT:")) {
        setState({
          count: DAILY_SCAN_LIMIT,
          limit: DAILY_SCAN_LIMIT,
          remaining: 0,
          loading: false,
          exceeded: true,
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }
  }, [checkLimit]);

  const increment = useCallback(async () => {
    try {
      const res = await incrementCount({ data: undefined });
      setState({
        count: res.count,
        limit: res.limit,
        remaining: Math.max(0, res.limit - res.count),
        loading: false,
        exceeded: res.count >= res.limit,
      });
      return res.count;
    } catch {
      return null;
    }
  }, [incrementCount]);

  const canScan = !state.exceeded && !state.loading;

  return { ...state, refresh, increment, canScan };
}
