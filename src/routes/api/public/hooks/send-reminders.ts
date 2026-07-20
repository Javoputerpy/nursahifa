import { createFileRoute } from "@tanstack/react-router";

/**
 * Called by pg_cron every 5 minutes. Finds users whose reminder time (in their tz)
 * matches the current UTC minute (± the cron interval), have not been reminded today,
 * and have at least one card due — then sends a Telegram message.
 *
 * No auth required: this endpoint is idempotent per user per day (last_reminded_on guard).
 */
export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return Response.json({ ok: false, error: "bot token missing" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const nowUtc = new Date();
        const utcMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();

        // Fetch enabled users
        const { data: settings, error } = await supabaseAdmin
          .from("user_settings")
          .select("user_id,reminder_hour,reminder_minute,tz_offset_minutes,telegram_chat_id,web_push_subscription,last_reminded_on")
          .eq("reminders_enabled", true);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const CRON_WINDOW = 6; // minutes tolerance (cron runs every ~5 min)
        const results: { user_id: string; sent: string | null; reason?: string }[] = [];

        for (const row of settings ?? []) {
          const localMinutes = ((row.reminder_hour * 60 + row.reminder_minute) + (24 * 60)) % (24 * 60);
          const scheduledUtcMinutes = ((localMinutes - (row.tz_offset_minutes ?? 0)) + (24 * 60)) % (24 * 60);
          let delta = utcMinutes - scheduledUtcMinutes;
          if (delta < -12 * 60) delta += 24 * 60;
          if (delta > 12 * 60) delta -= 24 * 60;
          if (delta < 0 || delta >= CRON_WINDOW) continue;

          const todayLocalIso = new Date(nowUtc.getTime() + (row.tz_offset_minutes ?? 0) * 60_000)
            .toISOString().slice(0, 10);
          if (row.last_reminded_on === todayLocalIso) continue;

          // Count due cards
          const endOfLocalDayUtc = new Date(
            Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 23, 59, 59)
          ).toISOString();
          const { count: dueCount } = await supabaseAdmin
            .from("words")
            .select("*", { count: "exact", head: true })
            .eq("user_id", row.user_id)
            .eq("status", "ready")
            .lte("next_review_at", endOfLocalDayUtc);

          if (!dueCount || dueCount === 0) {
            // Mark reminded so we don't spam later
            await supabaseAdmin.from("user_settings").update({ last_reminded_on: todayLocalIso })
              .eq("user_id", row.user_id);
            results.push({ user_id: row.user_id, sent: null, reason: "no-due" });
            continue;
          }

          const messages = [
            `📚 Bugun sizni ${dueCount} ta kartochka kutmoqda!`,
            `🔥 Seriyangizni yo'qotmang — bugungi darsni bajaring.`,
            `Bir necha daqiqa bugun — so'z boyligingiz o'sishida davom etadi.`,
          ];
          const text = messages[Math.floor(Math.random() * messages.length)];

          let sent: string | null = null;

          if (row.telegram_chat_id) {
            try {
              const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: row.telegram_chat_id,
                  text,
                  reply_markup: {
                    inline_keyboard: [[
                      { text: "🚀 Darsni boshlash", web_app: { url: "https://nursahifa.lovable.app/feed" } },
                    ]],
                  },
                }),
              });
              if (r.ok) sent = "telegram";
            } catch (e) {
              console.error("telegram send failed", e);
            }
          }

          // Web push — only if VAPID keys configured and subscription is a real endpoint.
          // Otherwise the in-app banner will handle it on next open.
          // (Kept as a hook for future — see notes below the file.)

          await supabaseAdmin.from("user_settings").update({ last_reminded_on: todayLocalIso })
            .eq("user_id", row.user_id);
          results.push({ user_id: row.user_id, sent });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
