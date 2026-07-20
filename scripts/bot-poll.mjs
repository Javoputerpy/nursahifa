#!/usr/bin/env node
/**
 * NurSahifa Telegram Bot — Standalone polling worker for Render Background Service.
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN   – Bot token from @BotFather
 *   GROQ_API_KEY         – Groq API key for AI chat
 *   SUPABASE_URL         – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – Supabase service role key
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN) { console.error("TELEGRAM_BOT_TOKEN missing"); process.exit(1); }

const API = `https://api.telegram.org/bot${TOKEN}`;
const WEB_APP_URL = "https://nursahifa.onrender.com/auth";

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

const BTN_APP = "🚀 Ilovani ochish";
const BTN_AI = "🧠 AI Yordamchi";
const BTN_FEEDBACK = "✍️ Fikr bildirish";
const BTN_HELP = "❓ Qo'llanma";
const BTN_ABOUT = "ℹ️ Loyiha haqida";

let offset = 0;
let processing = false;

// ─── Supabase helpers ───
async function sbQuery(table, { select = "*", filters = {}, method = "GET", body = null } = {}) {
  if (!SB_URL || !SB_KEY) return { data: null, error: { message: "Supabase not configured" } };
  let url = `${SB_URL}/rest/v1/${table}?select=${select}`;
  const headers = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" || method === "PATCH" ? "return=representation" : undefined,
  };
  for (const [k, v] of Object.entries(filters)) url += `&${k}=${encodeURIComponent(v)}`;
  try {
    const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json();
    return { data: r.ok ? data : null, error: r.ok ? null : data };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

// ─── Telegram helpers ───
async function tg(method, body) {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) console.error("telegram", method, r.status, JSON.stringify(j)?.slice(0, 200));
    return j;
  } catch (e) {
    console.error("telegram fetch error", method, e.message);
    return null;
  }
}

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
  return { inline_keyboard: [[{ text: "🚀 NurSahifa ilovasini ochish", web_app: { url: WEB_APP_URL } }]] };
}

// ─── Groq AI ───
async function askGroq(prompt) {
  if (!GROQ_KEY) return "AI hozircha sozlanmagan.";
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || "Javob topilmadi.";
  } catch (e) {
    console.error("groq error", e.message);
    return "Kechirasiz, hozir javob bera olmadim.";
  }
}

// ─── Mode helpers ───
async function getMode(chatId) {
  const { data } = await sbQuery("telegram_user_modes", {
    select: "mode",
    filters: { chat_id: `eq.${chatId}` },
  });
  return data?.[0]?.mode || "idle";
}

async function setMode(chatId, mode) {
  await sbQuery("telegram_user_modes", {
    method: "POST",
    body: { chat_id: chatId, mode, updated_at: new Date().toISOString() },
  });
}

// ─── Main handler ───
async function handleMessage(msg) {
  const chatId = msg?.chat?.id;
  const text = (msg?.text ?? msg?.caption ?? "").trim();
  if (!chatId) return;

  const cmd = text.split(/\s+/)[0]?.toLowerCase().replace(/@.*$/, "");
  const mode = await getMode(chatId);

  // /start — deep-link support
  if (cmd === "/start") {
    const payload = text.split(/\s+/).slice(1).join(" ").trim();
    if (payload.startsWith("link_")) {
      const linkToken = payload.slice(5);
      const { data: tok } = await sbQuery("telegram_link_tokens", {
        select: "user_id,expires_at,consumed_at",
        filters: { token: `eq.${linkToken}` },
      });
      const t = tok?.[0];
      if (!t || t.consumed_at || new Date(t.expires_at) < new Date()) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Bog'lash havolasi eskirgan. Ilovada qaytadan tugmani bosing." });
      } else {
        await sbQuery("user_settings", {
          method: "POST",
          body: { user_id: t.user_id, telegram_chat_id: chatId, updated_at: new Date().toISOString() },
        });
        await sbQuery("telegram_link_tokens", {
          method: "PATCH",
          body: { consumed_at: new Date().toISOString() },
          filters: { token: `eq.${linkToken}` },
        });
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Muvaffaqiyatli bog'landi! Endi kunlik eslatmalarni shu yerga yuboraman.",
          reply_markup: replyKeyboard(),
        });
      }
      return;
    }
    await setMode(chatId, "idle");
    await tg("sendMessage", { chat_id: chatId, text: WELCOME_TEXT, parse_mode: "Markdown", reply_markup: replyKeyboard() });
    await tg("sendMessage", { chat_id: chatId, text: "Ilovani to'liq ekranda ochish uchun:", reply_markup: startInline() });
    return;
  }

  if (cmd === "/help" || text === BTN_HELP) {
    await tg("sendMessage", { chat_id: chatId, text: HELP_TEXT, parse_mode: "Markdown", reply_markup: replyKeyboard() });
    return;
  }

  if (cmd === "/about" || text === BTN_ABOUT) {
    await tg("sendMessage", { chat_id: chatId, text: ABOUT_TEXT, parse_mode: "Markdown", reply_markup: replyKeyboard() });
    return;
  }

  if (text === BTN_APP) {
    await tg("sendMessage", { chat_id: chatId, text: "🚀 Ilovani oching:", reply_markup: startInline() });
    return;
  }

  if (cmd === "/feedback" || text === BTN_FEEDBACK) {
    await setMode(chatId, "feedback");
    await tg("sendMessage", { chat_id: chatId, text: "✍️ NurSahifa haqidagi fikr, taklif yoki xatoliklarni yozib qoldiring 👇", reply_markup: replyKeyboard() });
    return;
  }

  if (text === BTN_AI) {
    await setMode(chatId, "ai");
    await tg("sendMessage", { chat_id: chatId, text: "🧠 AI Yordamchi yoqildi. Savolingizni yozing — o'zbek tilida javob beraman.\n\nChiqish: /start", reply_markup: replyKeyboard() });
    return;
  }

  // Feedback → forward to admin
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (mode === "feedback" && adminChatId && (text || msg?.photo)) {
    const from = msg?.from ?? {};
    const header =
      `📩 Yangi fikr keldi!\n` +
      `👤 Kimdan: ${from.first_name ?? "-"} (@${from.username ?? "no_username"} / ID: ${from.id ?? "-"})\n` +
      `🔑 Xabar_ID: ${msg.message_id}\n` +
      `📝 Xabar:\n${text || "(rasm)"}`;
    await tg("sendMessage", { chat_id: adminChatId, text: header });
    if (msg?.photo) {
      await tg("forwardMessage", { chat_id: adminChatId, from_chat_id: chatId, message_id: msg.message_id });
    }
    await setMode(chatId, "idle");
    await tg("sendMessage", { chat_id: chatId, text: "✅ Rahmat! Fikringiz adminga yuborildi. Tez orada javob olasiz.", reply_markup: replyKeyboard() });
    return;
  }

  // AI / free text → Groq
  if (text) {
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    const answer = await askGroq(text);
    await tg("sendMessage", { chat_id: chatId, text: answer, reply_markup: replyKeyboard() });
  }
}

// ─── Polling loop ───
async function poll() {
  if (processing) return;
  processing = true;
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message"]`);
    const data = await r.json();
    if (data?.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        try {
          await handleMessage(update.message);
        } catch (e) {
          console.error("handle message error", e);
        }
      }
    }
  } catch (e) {
    console.error("poll error", e.message);
    await new Promise((r) => setTimeout(r, 5000));
  } finally {
    processing = false;
  }
}

async function main() {
  console.log("🤖 NurSahifa bot starting (polling mode)...");
  console.log(`   WEB_APP_URL: ${WEB_APP_URL}`);
  console.log(`   GROQ: ${GROQ_KEY ? "configured" : "MISSING"}`);
  console.log(`   Supabase: ${SB_URL ? "configured" : "MISSING"}`);

  // Set webhook to empty so polling can work
  try {
    await fetch(`${API}/deleteWebhook`);
  } catch {}

  while (true) {
    await poll();
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
