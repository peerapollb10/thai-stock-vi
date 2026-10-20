// Telegram 2-Way Bot (แทน line_bot.js): รับคำสั่งจากแชท Telegram → รัน Claude Code บนเครื่องนี้ → ส่งผลลัพธ์กลับ
// ใช้งาน: npm run bot — ใช้ Long Polling (getUpdates) จึงไม่ต้องเปิดพอร์ต / ngrok / Webhook
// ต้องมีใน .env.local: TELEGRAM_BOT_TOKEN (จาก @BotFather), TELEGRAM_CHAT_ID (แชทของเจ้าของเครื่อง)
// ความปลอดภัย:
//   - รับและตอบเฉพาะ TELEGRAM_CHAT_ID — แชทอื่นถูกเพิกเฉยโดยไม่ตอบกลับ (ไม่บอกว่ามีบอทอยู่)
//   - รัน claude ด้วย --permission-mode acceptEdits ตามสิทธิ์ใน .claude/settings.json (ไม่ใช้ --dangerously-skip-permissions)
//   - ข้อความส่งเข้า claude ทาง stdin ไม่ผ่าน command line จึงไม่เกิด shell injection
//   - ข้ามข้อความที่ค้างเกิน STALE_MIN นาที (ส่งไว้ตอนบอทปิด) ไม่ให้งานเก่ารันเองโดยไม่ตั้งใจ
// Task Queue: รันทีละงาน คำสั่งที่เข้ามาระหว่างรันต่อคิว — ตอบรับทุกคำสั่งใหม่และ /status ด้วยหน้าสถานะรวม statusText():
//   งานที่กำลังรัน (+ เวลาที่ผ่านไป) แล้วรายการคิว 1, 2, 3... ทั้งหมด (สูงสุด QUEUE_LINES) พร้อมชี้งานที่เพิ่งเข้าคิว
// งานเสร็จ: ส่งข้อความเดียว "📋 สำหรับ Gemini" (สถานะ, เวลา, คำสั่ง, รายงานทางเทคนิคจาก Claude)
//   ไม่แนบผล Self-Test / สรุปแยก — finish.js / send-telegram.js ข้ามการส่งเองเมื่อ BOT_JOB=1
// ปุ่มอนุมัติ: คำสั่งเสี่ยง (APPROVAL_RULES) หรือ "/confirm <คำสั่ง>" ตอบเป็นข้อความมี Inline Keyboard
//   "✅ อนุมัติ (Approve)" / "❌ ปฏิเสธ (Reject)" (callback_data "approve:<id>" / "reject:<id>") — ใช้ได้ครั้งเดียว,
//   หมดอายุใน BOT_APPROVAL_TTL_MIN นาที, ล้างเมื่อ /restart
// /restart หรือ /reboot: ยืนยัน offset กับ Telegram ก่อน (ไม่ให้ตัวใหม่ได้ /restart ซ้ำจนวนลูป) แล้วเปิดบอทตัวใหม่แบบ detached
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const root = path.join(__dirname, "..");
// เก็บ env ก่อนโหลด .env.local ไว้ส่งให้ process ใหม่ตอน /restart — ไม่งั้นค่าที่แก้ใน .env.local จะไม่มีผลหลังรีสตาร์ท
const launchEnv = { ...process.env };
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath); // ค่าที่โหลดก่อน (.env.local) มีผลเหนือกว่า
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();
const TIMEOUT_MIN = Number(process.env.BOT_TIMEOUT_MIN) || 15;
const APPROVAL_TTL_MIN = Number(process.env.BOT_APPROVAL_TTL_MIN) || 30;
const STALE_MIN = 10;
const MAX_LENGTH = 4096; // ข้อความ Telegram ยาวได้ไม่เกิน 4,096 ตัวอักษร
const QUEUE_LINES = 20; // แสดงงานที่รอคิวสูงสุดกี่รายการใน statusText() (กันข้อความยาวเกิน)
// TELEGRAM_API_BASE ใช้ชี้ไป mock server ตอนทดสอบเท่านั้น
const API = `${process.env.TELEGRAM_API_BASE || "https://api.telegram.org"}/bot${TOKEN}`;
const BOT_LOG = path.join(root, "data", "bot.log");

const missing = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"].filter((k) => !process.env[k]?.trim());
if (missing.length > 0) {
  console.error(`เปิด bot ไม่ได้: ต้องตั้งค่า ${missing.join(", ")} ใน .env.local`);
  process.exit(1);
}

/** @type {{ child: import("node:child_process").ChildProcess, prompt: string, startedAt: Date, cancelled?: boolean } | null} */
let job = null;
/** @type {{ prompt: string, queuedAt: Date }[]} */
const taskQueue = [];
let restarting = false;
/** @type {Map<string, { prompt: string, reason: string, createdAt: Date }>} */
const pendingApprovals = new Map();
// คำสั่งที่ย้อนกลับยากตาม CLAUDE.md (push, ลบข้อมูลใน Supabase, ดึงทั้งตลาด) — ต้องกดอนุมัติก่อนรัน
const APPROVAL_RULES = [
  [/ทั้งตลาด|set_symbols\.csv/i, "ดึงข้อมูลทั้งตลาด (~30–40 นาที)"],
  [/git\s+push|push\s*(ขึ้น|to\s|origin)|พุช/i, "push ขึ้น remote"],
  // จับเฉพาะการลบข้อมูล — "ลบปุ่ม/ลบโค้ด" ทั่วไปไม่ต้องขออนุมัติ
  [/ลบ(ข้อมูล|ตาราง|แถว|ทั้งหมด)|delete\s+from|drop\s+table|\btruncate\b|reset\s+--hard|rm\s+-rf/i, "ลบ/เขียนทับข้อมูล"],
];

// ตัวคั่นสรุปจากเวอร์ชันเก่า — ถ้า Claude ยังใส่มา ตัดส่วนหลังตัวคั่นทิ้ง (ไม่ส่งสรุปแยกแล้ว)
const SUMMARY_MARKER = "===SUMMARY===";
const REPORT_INSTRUCTION =
  "\n\n---\n(คำแนะนำจาก Telegram bot) คำตอบสุดท้ายจะถูกส่งต่อให้ Gemini อ่านเป็นข้อความเดียว (ไม่เกิน ~3,500 ตัวอักษร) " +
  "ให้เขียนเป็นรายงานทางเทคนิคกระชับ เรียงหัวข้อ: สิ่งที่ทำ / ไฟล์ที่แก้ (ฟังก์ชันหรือจุดสำคัญ) / ผลการตรวจ / ประเด็นค้างหรือสิ่งที่ต้องตัดสินใจ " +
  "— ไม่ต้องมีสรุปแยกท้ายคำตอบ";

const HELP_TEXT =
  "พิมพ์คำสั่งให้ Claude Code ได้เลย (รันทีละงาน ถ้าไม่ว่างจะต่อคิวให้)\n" +
  "/status — ดูงานที่กำลังรันและคิว\n" +
  "/cancel — หยุดงานที่กำลังรัน (แล้วรันงานถัดไปในคิว)\n" +
  "/clear — ล้างคิวที่ยังไม่เริ่ม\n" +
  "/restart หรือ /reboot — รีสตาร์ทบอท (หยุดงานที่รันอยู่และล้างคิว)\n" +
  "/confirm <คำสั่ง> — ส่งปุ่มอนุมัติก่อนรัน (คำสั่งเสี่ยง เช่น ทั้งตลาด / push / ลบ จะขออนุมัติให้อัตโนมัติ)\n" +
  "/help — แสดงข้อความนี้";

// เมนูคำสั่งที่แสดงเมื่อพิมพ์ "/" ในแชท (setMyCommands)
const COMMANDS = [
  ["status", "ดูงานที่กำลังรันและคิว"],
  ["cancel", "หยุดงานที่กำลังรัน"],
  ["clear", "ล้างคิวที่ยังไม่เริ่ม"],
  ["restart", "รีสตาร์ทบอท"],
  ["reboot", "รีสตาร์ทบอท"],
  ["confirm", "ขอปุ่มอนุมัติก่อนรันคำสั่ง"],
  ["help", "วิธีใช้"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shorten(text, max = 60) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

function truncate(text) {
  text = text.trim() || "(ไม่มีข้อความตอบกลับ)";
  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH - 20) + "\n…(ตัดข้อความ)" : text;
}

// เรียก Bot API — คืน { ok, result, description, error_code } เสมอ (โยน error เฉพาะเมื่อเชื่อมต่อไม่ได้/ถูก abort)
async function api(method, params = {}, signal) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });
  const data = await res.json().catch(() => ({ ok: false, error_code: res.status, description: `HTTP ${res.status}` }));
  if (!data.ok && method !== "getUpdates") console.error(`Telegram ${method} ล้มเหลว ${data.error_code}: ${data.description}`);
  return data;
}

// ส่งเป็นข้อความธรรมดา (ไม่ใช้ parse_mode) — ผลลัพธ์จาก Claude มี * _ ` ที่จะทำให้ Markdown/HTML พัง
const send = (text, extra = {}) =>
  api("sendMessage", { chat_id: CHAT_ID, text: truncate(text), link_preview_options: { is_disabled: true }, ...extra });

function elapsed(since) {
  const sec = Math.round((Date.now() - since.getTime()) / 1000);
  return sec < 60 ? `${sec} วินาที` : `${Math.floor(sec / 60)} นาที ${sec % 60} วินาที`;
}

// ประเมินเวลาคร่าวๆ จากคำสั่ง (ไม่ต้องแม่น)
function estimate(prompt) {
  if (/fetch|ดึงข้อมูล|ทั้งตลาด/i.test(prompt)) return "3–5";
  const lines = prompt.split("\n").filter((l) => l.trim()).length;
  if (prompt.length > 300 || lines >= 4) return "5–10";
  return "2–3";
}

// ชื่องานแบบสั้น (บรรทัดแรกของคำสั่ง ตัดที่ 40 ตัวอักษร) + เวลาประเมิน
const taskLine = (prompt) => `${shorten(prompt.split("\n").find((l) => l.trim()) ?? prompt, 40)} [${estimate(prompt)} min]`;

// หน้าสถานะรวม: งานที่กำลังรัน แล้วรายการคิว 1, 2, 3... — newIndex = ตำแหน่งในคิว (เริ่ม 0) ของงานที่เพิ่งเข้าคิว ใช้ชี้ "← ใหม่"
function statusText(newIndex = -1) {
  const lines = ["📊 สถานะงาน"];
  lines.push(job ? `▶️ กำลังรัน (ผ่านไป ${elapsed(job.startedAt)})\n${taskLine(job.prompt)}` : "▶️ ว่าง — ไม่มีงานที่กำลังรัน");
  if (taskQueue.length === 0) {
    lines.push("", "⏳ คิว: ว่าง");
  } else {
    lines.push("", `⏳ รอคิว ${taskQueue.length} งาน`);
    taskQueue.slice(0, QUEUE_LINES).forEach((t, i) => lines.push(`${i + 1}. ${taskLine(t.prompt)}${i === newIndex ? " ← ใหม่" : ""}`));
    if (taskQueue.length > QUEUE_LINES) lines.push(`…และอีก ${taskQueue.length - QUEUE_LINES} งาน`);
  }
  return lines.join("\n");
}

// ข้อความตอบรับคำสั่งใหม่ = หัวข้อบอกผล + หน้าสถานะรวม (เห็นคิวทั้งหมดทันทีโดยไม่ต้องพิมพ์ /status)
function ackText(head, position) {
  const where = position === 0 ? "เริ่มรันทันที" : `เข้าคิวลำดับที่ ${position}`;
  return `${head} — ${where}\n\n${statusText(position - 1)}`;
}

// ตัดสรุปท้ายแบบเก่า (หลัง ===SUMMARY===) ทิ้ง เหลือเฉพาะรายงานทางเทคนิค
function reportBody(stdout) {
  const idx = stdout.lastIndexOf(SUMMARY_MARKER);
  return (idx === -1 ? stdout : stdout.slice(0, idx)).trim();
}

// ข้อความเดียวตอนจบงาน: หัว (สถานะ + เวลา + คำสั่ง) แล้วรายงานจาก Claude; ล้มเหลวแนบ stderr ช่วงท้าย
function formatReport({ ok, status, took, prompt, report, stderr }) {
  const parts = [
    `📋 สำหรับ Gemini\nสถานะ: ${ok ? "✅" : "✗"} ${status} · ใช้เวลา ${took}\nคำสั่ง: ${shorten(prompt, 300)}`,
    report || "(ไม่มีข้อความตอบกลับ)",
  ];
  const err = stderr.trim();
  if (!ok && err) parts.push(`[stderr]\n${err.length > 800 ? "…" + err.slice(-800) : err}`);
  return parts.join("\n\n");
}

// บน Windows child คือ cmd.exe (shell) — ต้อง taskkill /T ฆ่าทั้งต้นไม้ process ไม่งั้น claude ที่เป็นลูกยังรันต่อ
function killTree(child) {
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }).on("error", () => child.kill());
  } else {
    child.kill();
  }
}

function runClaude(prompt) {
  // claude บน Windows เป็น claude.cmd จึงต้องใช้ shell — คำสั่งเป็นข้อความคงที่ ข้อความผู้ใช้ส่งทาง stdin เท่านั้น
  // BOT_JOB=1: finish.js / send-telegram.js / send-line.js ข้ามการส่งข้อความเอง (bot ส่งผลเป็นข้อความเดียวแทน)
  // BOT_CLAUDE_CMD ใช้แทนคำสั่ง claude ตอนทดสอบเท่านั้น
  const child = spawn(process.env.BOT_CLAUDE_CMD || "claude -p --permission-mode acceptEdits --output-format text", {
    cwd: root,
    shell: true,
    windowsHide: true,
    env: { ...process.env, BOT_JOB: "1" },
  });
  const startedAt = new Date();
  const thisJob = { child, prompt, startedAt, cancelled: false };
  job = thisJob;
  let timedOut = false;
  let stdout = "";
  let stderr = "";
  let finished = false;
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.on("error", () => {});
  child.stdin.end(prompt + REPORT_INSTRUCTION);

  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child);
  }, TIMEOUT_MIN * 60_000);

  const finish = async (ok, status) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const took = elapsed(startedAt);
    job = null;
    console.log(`${ok ? "✓" : "✗"} ${status} (${took}) — ${shorten(prompt)}`);
    runNext();
    try {
      await send(formatReport({ ok, status, took, prompt, report: reportBody(stdout), stderr }));
    } catch (err) {
      console.error("ส่งผลทาง Telegram ล้มเหลว:", err.message);
    }
  };
  child.on("close", (code) => {
    if (thisJob.cancelled) return finish(false, "ยกเลิกโดยผู้ใช้ (/cancel)");
    if (timedOut) return finish(false, `หยุดเพราะเกิน ${TIMEOUT_MIN} นาที`);
    finish(code === 0, code === 0 ? "เสร็จแล้ว" : `จบด้วย exit ${code ?? "killed"}`);
  });
  child.on("error", (err) => finish(false, `รัน claude ไม่ได้: ${err.message}`));
}

// คืนตำแหน่งในคิว (1, 2, 3...) หรือ 0 ถ้าเริ่มรันทันที
function startOrQueue(prompt) {
  if (job) {
    taskQueue.push({ prompt, queuedAt: new Date() });
    console.log(`เข้าคิวลำดับที่ ${taskQueue.length}: ${shorten(prompt)}`);
    return taskQueue.length;
  }
  console.log(`รับคำสั่ง: ${shorten(prompt)}`);
  runClaude(prompt);
  return 0;
}

function runNext() {
  if (job || restarting) return;
  const next = taskQueue.shift();
  if (!next) return;
  console.log(`เริ่มงานจากคิว (รอ ${elapsed(next.queuedAt)}, เหลือ ${taskQueue.length}): ${shorten(next.prompt)}`);
  runClaude(next.prompt);
}

function approvalReason(prompt) {
  const hit = APPROVAL_RULES.find(([pattern]) => pattern.test(prompt));
  return hit ? hit[1] : null;
}

const isExpired = (req) => Date.now() - req.createdAt.getTime() > APPROVAL_TTL_MIN * 60_000;

// ข้อความขออนุมัติ + Inline Keyboard 2 ปุ่ม (callback_data ยาวได้ไม่เกิน 64 ไบต์ จึงส่งแค่ action + id)
function requestApproval(prompt, reason) {
  for (const [key, req] of pendingApprovals) if (isExpired(req)) pendingApprovals.delete(key);
  const id = crypto.randomBytes(6).toString("hex");
  pendingApprovals.set(id, { prompt, reason, createdAt: new Date() });
  console.log(`ขออนุมัติ ${id} (${reason}): ${shorten(prompt)}`);
  return send(`🔐 ขออนุมัติงาน\n${reason}\n\n${shorten(prompt, 1000)}\n\nปุ่มหมดอายุใน ${APPROVAL_TTL_MIN} นาที`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ อนุมัติ (Approve)", callback_data: `approve:${id}` },
          { text: "❌ ปฏิเสธ (Reject)", callback_data: `reject:${id}` },
        ],
      ],
    },
  });
}

// กดปุ่มอนุมัติ/ปฏิเสธ: ตอบ callback (หยุดไอคอนโหลดบนปุ่ม) → แก้ข้อความเดิมให้ปุ่มหายพร้อมผลการตัดสิน → ส่งสถานะ
async function handleCallback(query) {
  const [action, id = ""] = (query.data ?? "").split(":");
  if (action !== "approve" && action !== "reject") return api("answerCallbackQuery", { callback_query_id: query.id });
  const req = pendingApprovals.get(id);
  pendingApprovals.delete(id); // ใช้ได้ครั้งเดียว กันกดซ้ำ
  const message = query.message;
  const closeButtons = (note) =>
    message && api("editMessageText", { chat_id: CHAT_ID, message_id: message.message_id, text: truncate(`${message.text}\n\n${note}`) });

  if (!req || isExpired(req)) {
    await api("answerCallbackQuery", { callback_query_id: query.id, text: "คำขอนี้ถูกจัดการไปแล้วหรือหมดอายุ" });
    await closeButtons("⌛ หมดอายุหรือถูกจัดการไปแล้ว");
    return send("คำขอนี้ถูกจัดการไปแล้วหรือหมดอายุ — ส่งคำสั่งใหม่อีกครั้งถ้าต้องการรัน");
  }
  if (action === "reject") {
    console.log(`ปฏิเสธ ${id}: ${shorten(req.prompt)}`);
    await api("answerCallbackQuery", { callback_query_id: query.id, text: "ปฏิเสธแล้ว" });
    await closeButtons("❌ ปฏิเสธแล้ว");
    return send(`❌ ปฏิเสธคำสั่งแล้ว — ยกเลิกงาน\n${shorten(req.prompt, 40)}`);
  }
  console.log(`อนุมัติ ${id}`);
  await api("answerCallbackQuery", { callback_query_id: query.id, text: "อนุมัติแล้ว" });
  await closeButtons("✅ อนุมัติแล้ว");
  return send(ackText("✅ อนุมัติคำสั่งเรียบร้อย", startOrQueue(req.prompt)));
}

let polling = true;
let offset = 0;

// /restart: หยุดงาน ล้างคิว เลิก poll แล้วยืนยัน offset (getUpdates timeout 0) ให้ Telegram ลบ /restart ออกจากคิว
// ก่อนเปิด telegram_bot.js ตัวใหม่แบบ detached (บน Windows process ลูกปกติถูกฆ่าตามเมื่อตัวเดิมออก) — log อยู่ที่ data/bot.log
// รอผล spawn ก่อนคืนค่า: ถ้าเปิดไม่สำเร็จ ตั้ง polling กลับ ลูป poll() เดิมจึงทำงานต่อได้เลย
async function restart() {
  restarting = true;
  if (job) {
    job.cancelled = true;
    killTree(job.child);
  }
  taskQueue.splice(0);
  pendingApprovals.clear();
  polling = false;
  await api("getUpdates", { offset, timeout: 0 }).catch((err) => console.error("ยืนยัน offset ล้มเหลว:", err.message));
  console.log(`กำลังรีสตาร์ทบอท… (log ของบอทตัวใหม่อยู่ที่ ${BOT_LOG})`);
  fs.mkdirSync(path.dirname(BOT_LOG), { recursive: true });
  const logFd = fs.openSync(BOT_LOG, "a");
  fs.writeSync(logFd, `\n=== รีสตาร์ท ${new Date().toLocaleString("th-TH")} ===\n`);
  const child = spawn(process.execPath, [__filename], {
    cwd: root,
    env: { ...launchEnv, BOT_RESTARTED: "1" },
    stdio: ["ignore", logFd, logFd],
    detached: true,
    windowsHide: true,
  });
  await new Promise((resolve) => {
    child.once("spawn", () => {
      child.unref();
      setTimeout(() => process.exit(0), 500); // รอ taskkill เริ่มทำงานก่อนออก
      resolve();
    });
    child.once("error", async (err) => {
      console.error("รีสตาร์ทไม่สำเร็จ:", err);
      restarting = false;
      polling = true;
      await send(`✗ รีสตาร์ทบอทไม่สำเร็จ: ${err.message} — บอทตัวเดิมยังทำงานต่อ`).catch(() => {});
      resolve();
    });
  });
}

async function handleMessage(message) {
  const text = (message.text ?? "").trim();
  if (!text) return;
  if (restarting) return send("บอทกำลังรีสตาร์ท — ส่งคำสั่งใหม่อีกครั้งเมื่อได้ข้อความ ✅");

  // "/status@MyBot" (เมนูคำสั่งในกลุ่ม) ถือเป็น /status
  const cmd = text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  const name = cmd?.[1].toLowerCase();
  const arg = cmd?.[2]?.trim() ?? "";

  if (name === "help" || name === "start") return send(HELP_TEXT);
  if (name === "restart" || name === "reboot") {
    const dropped = [job && "หยุดงานที่กำลังรัน", taskQueue.length > 0 && `ล้างคิว ${taskQueue.length} งาน`].filter(Boolean);
    await send(`🔄 กำลังรีสตาร์ทบอท...${dropped.length > 0 ? `\n(${dropped.join(", ")})` : ""}`).catch(() => {});
    return restart();
  }
  if (name === "status") return send(statusText());
  if (name === "cancel") {
    if (!job) return send("ไม่มีงานที่กำลังรัน");
    job.cancelled = true;
    killTree(job.child);
    return send(`สั่งหยุดงานแล้ว${taskQueue.length > 0 ? ` — จะเริ่มงานถัดไปในคิว (${taskQueue.length} งาน)` : ""}`);
  }
  if (name === "clear") {
    const count = taskQueue.splice(0).length;
    return send(count > 0 ? `ล้างคิวแล้ว ${count} งาน (งานที่กำลังรันยังทำต่อ)` : "คิวว่างอยู่แล้ว");
  }
  if (name === "confirm") {
    if (!arg) return send("ใช้: /confirm <คำสั่ง>");
    return requestApproval(arg, "ขออนุมัติตามคำสั่ง /confirm");
  }
  const reason = approvalReason(text);
  if (reason) return requestApproval(text, `คำสั่งเสี่ยง: ${reason}`);
  return send(ackText("📥 รับคำสั่งแล้ว", startOrQueue(text)));
}

async function handleUpdate(update) {
  const message = update.message ?? update.callback_query?.message;
  const chatId = String(message?.chat?.id ?? "");
  if (chatId !== CHAT_ID) {
    console.warn(`เพิกเฉย update จากแชทอื่น: ${chatId || "(ไม่ทราบ)"} (from ${update.message?.from?.id ?? update.callback_query?.from?.id})`);
    return;
  }
  if (update.callback_query) return handleCallback(update.callback_query);
  if (Date.now() / 1000 - update.message.date > STALE_MIN * 60) {
    console.warn(`ข้ามข้อความเก่าเกิน ${STALE_MIN} นาที: ${shorten(update.message.text ?? "")}`);
    return;
  }
  return handleMessage(update.message);
}

// Long Polling: getUpdates ค้างได้ 50 วินาทีจนมีข้อความ — ขยับ offset ก่อนจัดการแต่ละ update (Telegram จะไม่ส่งซ้ำ)
// และจัดการทีละ update ตามลำดับ (งาน Claude รันแยก ไม่บล็อกลูปนี้)
async function poll() {
  while (polling) {
    let data;
    try {
      data = await api("getUpdates", { offset, timeout: 50, allowed_updates: ["message", "callback_query"] });
    } catch (err) {
      console.error("เชื่อมต่อ Telegram ไม่ได้ — ลองใหม่ใน 5 วินาที:", err.message);
      await sleep(5000);
      continue;
    }
    if (!data.ok) {
      if (data.error_code === 401) {
        console.error("TELEGRAM_BOT_TOKEN ไม่ถูกต้อง (401 Unauthorized)");
        process.exit(1);
      }
      // 409: มีบอทอีกตัวใช้ Token เดียวกันอยู่ (หรือตัวเดิมยังไม่ปิดหลัง /restart)
      console.error(`getUpdates ล้มเหลว ${data.error_code}: ${data.description} — ลองใหม่ใน 5 วินาที`);
      await sleep(5000);
      continue;
    }
    for (const update of data.result) {
      offset = update.update_id + 1;
      await handleUpdate(update).catch((err) => console.error("จัดการ update ล้มเหลว:", err));
      if (!polling) break;
    }
  }
}

(async () => {
  const restarted = process.env.BOT_RESTARTED === "1";
  delete process.env.BOT_RESTARTED; // ไม่ส่งต่อไปยัง claude ที่ bot รัน

  const me = await api("getMe").catch((err) => ({ ok: false, description: err.message }));
  if (!me.ok) {
    console.error(`เชื่อมต่อ Telegram ไม่ได้: ${me.description} — ตรวจ TELEGRAM_BOT_TOKEN และอินเทอร์เน็ต`);
    process.exit(1);
  }
  // getUpdates ใช้ไม่ได้ถ้า Token นี้เคยตั้ง Webhook ไว้ — ลบทิ้ง (ไม่ลบข้อความที่ค้าง)
  await api("deleteWebhook", { drop_pending_updates: false });
  await api("setMyCommands", { commands: COMMANDS.map(([command, description]) => ({ command, description })) });
  console.log(`Telegram bot @${me.result.username} พร้อมรับคำสั่งจากแชท ${CHAT_ID} (Long Polling)`);
  if (restarted) await send("✅ รีสตาร์ทบอทเรียบร้อย พร้อมรับคำสั่ง").catch(() => {});
  await poll();
})();
