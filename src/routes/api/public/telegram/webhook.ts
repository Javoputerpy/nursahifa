import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WEB_APP_URL = "https://nursahifa.lovable.app/auth";
const GEMINI_MODEL = "gemini-2.5-flash";

const BTN_APP = "🚀 Ilovani ochish";
const BTN_AI = "🧠 AI Yordamchi";
const BTN_FEEDBACK = "✍️ Fikr bildirish";
const BTN_HELP = "❓ Qo'llanma";
const BTN_ABOUT = "ℹ️ Loyiha haqida";

const SYSTEM_PROMPT =
  "Siz 'NurSahifa' loyihasining aqlli AI yordamchisiz. Foydalanuvchilarga ingliz tilini o'rganish, so'zlar mazmuni va grammatika bo'yicha qisqa, aniq va motivatsion ruhda o'zbek tilida javob bering. NurSahifa ilovasi haqida savol so'rashsa, u rasm orqali so'zlarni ajratib beruvchi flashcard ilovasi ekanligini eslating.";

const HELP_TEXT =
  "🌟 *NurSahifa yordami*\n\n" +
  "/start — botni ishga tushirish va ilovani ochish\n" +
  "/feedback — fikr yoki taklif yuborish\n" +
  "/help — yordam\n" +
  "/about — loyiha haqida\n\n" +
  "Pastdagi tugmalar orqali ham boshqarishingiz mumkin.";

const ABOUT_TEXT =
  "📚 *NurSahifa* — ingliz tilini o'rganish uchun aqlli flashcard ilovasi.\n\n" +
  "• Rasmga olib so'zlarni avtomatik ajratish\n" +
  "• AI tarjima, IPA, misol va izohlar\n" +
  "• Swipe orqali o'rganish, testlar va mini-quiz\n\n" +
  "Telegram ichida to'liq ekranda ochiladi.";

const WELCOME_TEXT =
  "👋 Assalomu alaykum! *NurSahifa*ga xush kelibsiz.\n\n" +
  "Ingliz tilini AI yordamida o'rganing — rasmdan so'z ajratish, flashcard, test va swipe rejimi.\n\n" +
  "Quyidagi tugmadan ilovani oching yoki menyudan foydalaning 👇";

function replyKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_APP, web_app: { url: WEB_APP_URL } }],
      [{ text: BTN_AI }, { text: BTN_FEEDBACK }],
      [{ text: BTN_HELP }, { text: BTN_ABOUT }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function startInline() {
  return {
    inline_keyboard: [[{ text: "🚀 NurSahifa ilovasini ochish", web_app: { url: WEB_APP_URL } }]],
  };
}

async function tg(token: string, method: string, body: unknown): Promise<any> {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) console.error("telegram", method, r.status, j);
  return j;
}

async function askGemini(apiKey: string, prompt: string): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      }),
    },
  );
  if (!r.ok) {
    console.error("gemini", r.status, await r.text());
    return "Kechirasiz, hozir javob bera olmadim. Birozdan keyin qayta urinib ko'ring.";
  }
  const j: any = await r.json();
  const parts = j?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: any) => p?.text ?? "").join("").trim() : "";
  return text || "Javob topilmadi.";
}

function deriveSecret(token: string): string {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

async function setMode(chatId: number, mode: string) {
  await supabaseAdmin
    .from("telegram_user_modes")
    .upsert({ chat_id: chatId, mode, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
}

async function getMode(chatId: number): Promise<string> {
  const { data } = await supabaseAdmin
    .from("telegram_user_modes")
    .select("mode")
    .eq("chat_id", chatId)
    .maybeSingle();
  return (data?.mode as string) ?? "idle";
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const geminiKey = process.env.GOOGLE_AI_API_KEY;
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
        if (!token) return new Response("bot token missing", { status: 500 });

        const expected = deriveSecret(token);
        const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update: any = await request.json().catch(() => null);
        const msg = update?.message ?? update?.edited_message;
        const chatId: number | undefined = msg?.chat?.id;
        const text: string = (msg?.text ?? msg?.caption ?? "").trim();
        if (!chatId) return Response.json({ ok: true });

        try {
          // === ADMIN REPLY → forward to original user ===
          if (
            adminChatId &&
            String(chatId) === String(adminChatId) &&
            msg?.reply_to_message?.message_id
          ) {
            const { data: map } = await supabaseAdmin
              .from("telegram_feedback_map")
              .select("user_chat_id, user_message_id")
              .eq("admin_message_id", msg.reply_to_message.message_id)
              .maybeSingle();
            if (map?.user_chat_id) {
              await tg(token, "sendMessage", {
                chat_id: map.user_chat_id,
                text: `🔔 Admindan javob keldi:\n\n${text}`,
                reply_to_message_id: map.user_message_id ?? undefined,
              });
              await tg(token, "sendMessage", { chat_id: adminChatId, text: "✅ Javob yetkazildi." });
              return Response.json({ ok: true });
            }
          }

          const cmd = text.split(/\s+/)[0]?.toLowerCase().replace(/@.*$/, "");
          const currentMode = await getMode(chatId);

          // === Commands & menu buttons ===
          if (cmd === "/start") {
            // Deep-link: /start link_<token> → link this chat to a NurSahifa user
            const payload = text.split(/\s+/).slice(1).join(" ").trim();
            if (payload.startsWith("link_")) {
              const linkToken = payload.slice(5);
              const { data: tok } = await supabaseAdmin
                .from("telegram_link_tokens")
                .select("user_id,expires_at,consumed_at")
                .eq("token", linkToken)
                .maybeSingle();
              if (!tok || tok.consumed_at || new Date(tok.expires_at) < new Date()) {
                await tg(token, "sendMessage", {
                  chat_id: chatId,
                  text: "❌ Bog'lash havolasi eskirgan. Ilovada qaytadan tugmani bosing.",
                });
              } else {
                await supabaseAdmin.from("user_settings").upsert({
                  user_id: tok.user_id,
                  telegram_chat_id: chatId,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "user_id" });
                await supabaseAdmin.from("telegram_link_tokens")
                  .update({ consumed_at: new Date().toISOString() })
                  .eq("token", linkToken);
                await tg(token, "sendMessage", {
                  chat_id: chatId,
                  text: "✅ Muvaffaqiyatli bog'landi! Endi kunlik eslatmalarni shu yerga yuboraman.",
                  reply_markup: replyKeyboard(),
                });
              }
              return Response.json({ ok: true });
            }
            await setMode(chatId, "idle");
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: WELCOME_TEXT,
              parse_mode: "Markdown",
              reply_markup: replyKeyboard(),
            });
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: "Ilovani to'liq ekranda ochish uchun:",
              reply_markup: startInline(),
            });
            return Response.json({ ok: true });
          }

          if (cmd === "/help" || text === BTN_HELP) {
            await tg(token, "sendMessage", {
              chat_id: chatId, text: HELP_TEXT, parse_mode: "Markdown", reply_markup: replyKeyboard(),
            });
            return Response.json({ ok: true });
          }

          if (cmd === "/about" || text === BTN_ABOUT) {
            await tg(token, "sendMessage", {
              chat_id: chatId, text: ABOUT_TEXT, parse_mode: "Markdown", reply_markup: replyKeyboard(),
            });
            return Response.json({ ok: true });
          }

          if (text === BTN_APP) {
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: "🚀 Ilovani oching:",
              reply_markup: startInline(),
            });
            return Response.json({ ok: true });
          }

          if (cmd === "/feedback" || text === BTN_FEEDBACK) {
            await setMode(chatId, "feedback");
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: "✍️ NurSahifa haqidagi fikr, taklif yoki xatoliklarni yozib qoldiring 👇",
              reply_markup: replyKeyboard(),
            });
            return Response.json({ ok: true });
          }

          if (text === BTN_AI) {
            await setMode(chatId, "ai");
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: "🧠 AI Yordamchi yoqildi. Savolingizni yozing — o'zbek tilida javob beraman.\n\nChiqish: /start",
              reply_markup: replyKeyboard(),
            });
            return Response.json({ ok: true });
          }

          // === FEEDBACK MODE → forward to admin ===
          if (currentMode === "feedback" && adminChatId && (text || msg?.photo)) {
            const from = msg?.from ?? {};
            const header =
              `📩 Yangi fikr keldi!\n` +
              `👤 Kimdan: ${from.first_name ?? "-"} (@${from.username ?? "no_username"} / ID: ${from.id ?? "-"})\n` +
              `🔑 Xabar_ID: ${msg.message_id}\n` +
              `📝 Xabar:\n${text || "(rasm)"}`;

            const sent = await tg(token, "sendMessage", { chat_id: adminChatId, text: header });
            const adminMsgId = sent?.result?.message_id;

            // If photo, forward it too
            if (msg?.photo) {
              await tg(token, "forwardMessage", {
                chat_id: adminChatId,
                from_chat_id: chatId,
                message_id: msg.message_id,
              });
            }

            if (adminMsgId) {
              await supabaseAdmin.from("telegram_feedback_map").upsert({
                admin_message_id: adminMsgId,
                user_chat_id: chatId,
                user_message_id: msg.message_id,
              }, { onConflict: "admin_message_id" });
            }

            await setMode(chatId, "idle");
            await tg(token, "sendMessage", {
              chat_id: chatId,
              text: "✅ Rahmat! Fikringiz adminga yuborildi. Tez orada javob olasiz.",
              reply_markup: replyKeyboard(),
            });
            return Response.json({ ok: true });
          }

          // === AI MODE or free text → Gemini ===
          if (text) {
            if (!geminiKey) {
              await tg(token, "sendMessage", { chat_id: chatId, text: "AI hozircha sozlanmagan." });
            } else {
              await tg(token, "sendChatAction", { chat_id: chatId, action: "typing" });
              const answer = await askGemini(geminiKey, text);
              await tg(token, "sendMessage", {
                chat_id: chatId, text: answer, reply_markup: replyKeyboard(),
              });
            }
          }
        } catch (e) {
          console.error("handler error", e);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
