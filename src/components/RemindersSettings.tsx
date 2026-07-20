import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { Bell, BellOff, Send, Loader2, Check, Globe } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  reminders_enabled: boolean;
  reminder_hour: number;
  reminder_minute: number;
  tz_offset_minutes: number;
  telegram_chat_id: number | null;
  web_push_subscription: any;
};

const DEFAULTS: Settings = {
  reminders_enabled: false,
  reminder_hour: 20,
  reminder_minute: 0,
  tz_offset_minutes: 0,
  telegram_chat_id: null,
  web_push_subscription: null,
};

const TELEGRAM_BOT_USERNAME = "NurSahifaBot"; // change if bot handle differs

export function RemindersSettings({ userId }: { userId: string }) {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_settings" as any)
        .select("reminders_enabled,reminder_hour,reminder_minute,tz_offset_minutes,telegram_chat_id,web_push_subscription")
        .eq("user_id", userId)
        .maybeSingle();
      const row = (data as any) ?? {};
      setS({
        ...DEFAULTS,
        ...row,
        tz_offset_minutes: row.tz_offset_minutes ?? -new Date().getTimezoneOffset(),
      });
    })();
    if (typeof window !== "undefined") {
      setPushSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    }
  }, [userId]);

  const save = async (patch: Partial<Settings>) => {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true);
    const { error } = await supabase.from("user_settings" as any).upsert({
      user_id: userId,
      reminders_enabled: next.reminders_enabled,
      reminder_hour: next.reminder_hour,
      reminder_minute: next.reminder_minute,
      tz_offset_minutes: -new Date().getTimezoneOffset(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Saqlab bo'lmadi. Qayta urinib ko'ring.");
  };

  const linkTelegram = async () => {
    setLinking(true);
    haptics.medium();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const { error } = await supabase.from("telegram_link_tokens" as any).insert({
      token, user_id: userId,
    });
    setLinking(false);
    if (error) { toast.error("Havola yaratib bo'lmadi."); return; }
    const url = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=link_${token}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
    toast.message("Telegramda 'Start' tugmasini bosing", {
      description: "Bog'lanish bir necha soniya ichida yakunlanadi.",
    });
    // Poll for link
    const started = Date.now();
    const t = setInterval(async () => {
      const { data } = await supabase.from("user_settings" as any)
        .select("telegram_chat_id").eq("user_id", userId).maybeSingle();
      const chatId = (data as any)?.telegram_chat_id;
      if (chatId) {
        clearInterval(t);
        haptics.success();
        toast.success("Telegram bog'landi!");
        setS((prev) => prev ? { ...prev, telegram_chat_id: chatId } : prev);
      } else if (Date.now() - started > 3 * 60 * 1000) {
        clearInterval(t);
      }
    }, 2500);
  };

  const enablePush = async () => {
    if (!pushSupported) return;
    setPushBusy(true);
    haptics.medium();
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { toast.error("Bildirishnomalarga ruxsat berilmadi."); return; }
      const reg = await navigator.serviceWorker.register("/reminder-sw.js");
      // If VAPID key is configured, subscribe with it; otherwise save a local "notify-when-open" marker.
      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined;
      let sub: PushSubscriptionJSON | null = null;
      if (vapidKey) {
        const pushSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });
        sub = pushSub.toJSON();
      }
      const { error } = await supabase.from("user_settings" as any).upsert({
        user_id: userId,
        web_push_subscription: sub ?? { local: true },
        tz_offset_minutes: -new Date().getTimezoneOffset(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) { toast.error("Saqlab bo'lmadi."); return; }
      haptics.success();
      toast.success(vapidKey ? "Push bildirishnoma yoqildi" : "Bildirishnoma ilova ochilganda ko'rinadi");
      setS((prev) => prev ? { ...prev, web_push_subscription: sub ?? { local: true } } : prev);
    } catch (e) {
      console.error(e);
      toast.error("Bildirishnomani yoqib bo'lmadi.");
    } finally {
      setPushBusy(false);
    }
  };

  if (!s) return null;

  const timeStr = `${String(s.reminder_hour).padStart(2, "0")}:${String(s.reminder_minute).padStart(2, "0")}`;

  return (
    <div className="mt-3 rounded-3xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`grid h-8 w-8 place-items-center rounded-xl ${s.reminders_enabled ? "bg-gradient-brand text-white" : "bg-white/10 text-muted-foreground"}`}>
            {s.reminders_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold">Kunlik eslatma</p>
            <p className="text-[11px] text-muted-foreground">Belgilangan vaqtda darsni eslataman</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={s.reminders_enabled}
          onClick={() => { haptics.selection(); save({ reminders_enabled: !s.reminders_enabled }); }}
          className={`relative h-7 w-12 rounded-full transition-colors ${s.reminders_enabled ? "bg-emerald-500" : "bg-white/15"}`}
        >
          <span
            className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
            style={{ transform: s.reminders_enabled ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {s.reminders_enabled && (
        <>
          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Vaqt</span>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (!Number.isNaN(h) && !Number.isNaN(m)) {
                  haptics.selection();
                  save({ reminder_hour: h, reminder_minute: m });
                }
              }}
              className="bg-transparent text-base font-semibold text-foreground outline-none"
            />
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>Vaqt mintaqasi: avtomatik ({-new Date().getTimezoneOffset() / 60 >= 0 ? "+" : ""}{-new Date().getTimezoneOffset() / 60}h)</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              onClick={linkTelegram}
              disabled={linking}
              className="flex items-center justify-between rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3 py-2.5 text-sm font-semibold text-sky-200 active:scale-[0.98] transition disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {s.telegram_chat_id ? "Telegram bog'langan" : "Telegram bilan bog'lash"}
              </span>
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : s.telegram_chat_id ? <Check className="h-4 w-4" /> : null}
            </button>

            {pushSupported && (
              <button
                onClick={enablePush}
                disabled={pushBusy}
                className="flex items-center justify-between rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-200 active:scale-[0.98] transition disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  {s.web_push_subscription ? "Brauzer bildirishnomasi yoqilgan" : "Brauzer bildirishnomasini yoqish"}
                </span>
                {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : s.web_push_subscription ? <Check className="h-4 w-4" /> : null}
              </button>
            )}
          </div>
        </>
      )}

      {saving && <p className="mt-2 text-right text-[10px] text-muted-foreground">Saqlanmoqda…</p>}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
