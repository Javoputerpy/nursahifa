#!/usr/bin/env node
/**
 * Set Telegram webhook after deploying to Render.
 *
 * Usage:
 *   node scripts/set-webhook.mjs <YOUR_RENDER_URL>
 *
 * Example:
 *   node scripts/set-webhook.mjs https://nursahifa.onrender.com
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.argv[2];

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN env var is required");
  process.exit(1);
}
if (!SITE_URL) {
  console.error("Usage: node scripts/set-webhook.mjs <RENDER_URL>");
  console.error("Example: node scripts/set-webhook.mjs https://nursahifa.onrender.com");
  process.exit(1);
}

const webhookUrl = `${SITE_URL.replace(/\/$/, "")}/api/public/telegram/webhook`;

async function main() {
  console.log(`Setting webhook to: ${webhookUrl}`);

  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });

  const data = await r.json();
  if (data.ok) {
    console.log("✅ Webhook set successfully!");
    console.log(`   URL: ${webhookUrl}`);
  } else {
    console.error("❌ Failed:", data.description);
    process.exit(1);
  }

  // Verify
  const v = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const info = await v.json();
  if (info?.ok) {
    console.log(`   Current webhook: ${info.result.url}`);
    console.log(`   Pending updates: ${info.result.pending_update_count}`);
    if (info.result.last_error_date) {
      console.log(`   Last error: ${info.result.last_error_message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
