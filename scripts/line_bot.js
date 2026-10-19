// LINE 2-Way Bot: รับคำสั่งจากแชท LINE → รัน Claude Code บนเครื่องนี้ → ส่งผลลัพธ์กลับด้วย Push Message
// ใช้งาน: npm run bot แล้วเปิด ngrok http <BOT_PORT> และตั้ง Webhook URL เป็น https://<ngrok>/webhook
// ต้องมีใน .env.local: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID
// ความปลอดภัย:
//   - ตรวจลายเซ็น x-line-signature ทุกคำขอ (คำขอที่ไม่ได้มาจาก LINE จะถูกปฏิเสธ)
//   - รับคำสั่งเฉพาะจาก LINE_USER_ID (เจ้าของเครื่อง) — ผู้ใช้อื่นถูกเพิกเฉย
//   - รัน claude ด้วย --permission-mode acceptEdits ตามสิทธิ์ใน .claude/settings.json
//     (ไม่ใช้ --dangerously-skip-permissions ตามกฎ Autonomous Mode ใน CLAUDE.md) — คำสั่งนอก allowlist จะถูกปฏิเสธเอง
//   - ข้อความส่งเข้า claude ทาง stdin ไม่ผ่าน command line จึงไม่เกิด shell injection
//   - รันทีละงาน (คำสั่งที่เข้ามาระหว่างรันจะต่อคิวไว้ใน taskQueue) และหยุดงานที่เกิน BOT_TIMEOUT_MIN นาที
// ผลลัพธ์ส่งเป็น 2 ข้อความ: (1) รายละเอียดสำหรับก๊อปปี้ไปให้ Gemini (2) สรุปสั้นแบบ Bullet อยู่ล่างสุดไว้อ่านเอง
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath); // ค่าที่โหลดก่อน (.env.local) มีผลเหนือกว่า
}

const { LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID } = process.env;
const PORT = Number(process.env.BOT_PORT) || 3001; // 3000 เป็นของ next dev
const TIMEOUT_MIN = Number(process.env.BOT_TIMEOUT_MIN) || 15;
const MAX_LENGTH = 5000; // ข้อความ LINE ยาวได้ไม่เกิน 5,000 ตัวอักษร

const missing = ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN", "LINE_USER_ID"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`เปิด bot ไม่ได้: ต้องตั้งค่า ${missing.join(", ")} ใน .env.local`);
  process.exit(1);
}

/** @type {{ child: import("node:child_process").ChildProcess, prompt: string, startedAt: Date, cancelled?: boolean } | null} */
let job = null; // งานที่กำลังรัน — job !== null คือสถานะ isProcessing
/** @type {{ prompt: string, queuedAt: Date }[]} */
const taskQueue = [];

// ให้ Claude ปิดท้ายด้วยสรุปแบบ Bullet หลังตัวคั่นนี้ เพื่อแยกเป็นข้อความที่ 2
const SUMMARY_MARKER = "===SUMMARY===";
const SUMMARY_INSTRUCTION =
  `\n\n---\n(คำแนะนำจาก LINE bot) เมื่อทำงานเสร็จ ให้จบคำตอบด้วยบรรทัด ${SUMMARY_MARKER} ` +
  `ตามด้วยสรุปสั้นภาษาไทย 3–5 ข้อ ขึ้นต้นแต่ละข้อด้วย "• " (เนื้อหาก่อนตัวคั่นให้เป็นรายละเอียดทางเทคนิค เช่น ไฟล์ที่แก้ โค้ด และผลการตรวจ)`;

function shorten(text, max = 60) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

function truncate(text) {
  text = text.trim() || "(ไม่มีข้อความตอบกลับ)";
  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH - 20) + "\n…(ตัดข้อความ)" : text;
}

async function callLine(endpoint, body) {
  const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`LINE ${endpoint} ล้มเหลว HTTP ${res.status}: ${await res.text()}`);
}

// reply ใช้ replyToken (ฟรี ใช้ได้ครั้งเดียวภายในไม่กี่วินาที); push ใช้ส่งผลลัพธ์ภายหลัง (นับโควตาข้อความ)
const reply = (replyToken, text) => callLine("reply", { replyToken, messages: [{ type: "text", text: truncate(text) }] });
// push รับได้หลายข้อความ (สูงสุด 5) — ส่งพร้อมกันในครั้งเดียว ลำดับในแชทตรงตามอาร์เรย์
const push = (...texts) =>
  callLine("push", { to: LINE_USER_ID, messages: texts.map((text) => ({ type: "text", text: truncate(text) })) });

function verifySignature(rawBody, signature) {
  if (typeof signature !== "string") return false;
  const expected = crypto.createHmac("sha256", LINE_CHANNEL_SECRET).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function elapsed(since) {
  const sec = Math.round((Date.now() - since.getTime()) / 1000);
  return sec < 60 ? `${sec} วินาที` : `${Math.floor(sec / 60)} นาที ${sec % 60} วินาที`;
}

// แยก stdout เป็น { details, bullets } ตาม SUMMARY_MARKER — ถ้า Claude ไม่ได้ใส่ตัวคั่น bullets จะว่าง
function splitOutput(stdout) {
  const idx = stdout.lastIndexOf(SUMMARY_MARKER);
  if (idx === -1) return { details: stdout.trim(), bullets: "" };
  return { details: stdout.slice(0, idx).trim(), bullets: stdout.slice(idx + SUMMARY_MARKER.length).trim() };
}

// ข้อความที่ 1: รายละเอียดทางเทคนิคสำหรับก๊อปปี้ไปให้ Gemini
function formatDetails({ prompt, ok, status, took, details, stderr }) {
  const parts = [
    "📋 รายละเอียดสำหรับส่งต่อ Gemini",
    `[คำสั่ง]\n${prompt}`,
    `[สถานะ] ${status} · ใช้เวลา ${took}`,
    `[ผลลัพธ์]\n${details || "(ไม่มีข้อความตอบกลับ)"}`,
  ];
  if (!ok && stderr.trim()) parts.push(`[ข้อผิดพลาด]\n${stderr.trim()}`);
  return parts.join("\n\n");
}

// ข้อความที่ 2 (ล่างสุด): สรุปสั้นแบบ Bullet ไว้อ่านเอง
function formatSummary({ prompt, ok, status, took, bullets }) {
  const lines = [`📝 สรุป — ${ok ? "✓" : "✗"} ${status} (${took})`, `• งาน: ${shorten(prompt)}`];
  if (bullets) lines.push(bullets);
  else lines.push(ok ? "• (Claude ไม่ได้ส่งสรุปมา — ดูรายละเอียดในข้อความก่อนหน้า)" : "• ดูข้อผิดพลาดในข้อความก่อนหน้า");
  const next = taskQueue[0];
  lines.push(next ? `⏭ เริ่มงานถัดไป: ${shorten(next.prompt, 40)} (รอต่อจากนี้อีก ${taskQueue.length - 1} งาน)` : "⏹ คิวว่าง");
  return lines.join("\n");
}

// บน Windows child คือ cmd.exe (shell) — child.kill() ฆ่าแค่ shell ส่วน claude ที่เป็นลูกยังรันต่อ
// จึงต้องใช้ taskkill /T ฆ่าทั้งต้นไม้ process ไม่งั้น /cancel และ timeout ไม่หยุดงานจริง และงานในคิวจะรันซ้อนกัน
function killTree(child) {
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }).on("error", () => child.kill());
  } else {
    child.kill();
  }
}

function runClaude(prompt) {
  // claude บน Windows เป็น claude.cmd จึงต้องใช้ shell — คำสั่งเป็นข้อความคงที่ ข้อความผู้ใช้ส่งทาง stdin เท่านั้น
  const child = spawn("claude -p --permission-mode acceptEdits --output-format text", {
    cwd: root,
    shell: true,
    windowsHide: true,
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
  child.stdin.on("error", () => {}); // process ตายก่อนอ่าน stdin — ปล่อยให้ close/error รายงานแทน
  child.stdin.end(prompt + SUMMARY_INSTRUCTION);

  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child);
  }, TIMEOUT_MIN * 60_000);

  // close และ error อาจเกิดทั้งคู่ — จบงานครั้งเดียวแล้วหยิบงานถัดไปในคิว
  const finish = (ok, status) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const took = elapsed(startedAt);
    job = null;
    const { details, bullets } = splitOutput(stdout);
    const info = { prompt, ok, status, took, details, bullets, stderr };
    console.log(`${ok ? "✓" : "✗"} ${status} (${took}) — ${shorten(prompt)}`);
    push(formatDetails(info), formatSummary(info)).catch((err) => console.error("ส่งผลทาง LINE ล้มเหลว:", err));
    runNext();
  };
  child.on("close", (code) => {
    if (thisJob.cancelled) return finish(false, "ยกเลิกโดยผู้ใช้ (/cancel)");
    if (timedOut) return finish(false, `หยุดเพราะเกิน ${TIMEOUT_MIN} นาที`);
    finish(code === 0, code === 0 ? "เสร็จแล้ว" : `จบด้วย exit ${code ?? "killed"}`);
  });
  child.on("error", (err) => finish(false, `รัน claude ไม่ได้: ${err.message}`));
}

// หยิบงานถัดไปในคิวมารัน (ทีละงาน) จนกว่าคิวจะหมด
function runNext() {
  if (job) return;
  const next = taskQueue.shift();
  if (!next) return;
  console.log(`เริ่มงานจากคิว (รอ ${elapsed(next.queuedAt)}, เหลือ ${taskQueue.length}): ${next.prompt}`);
  runClaude(next.prompt);
}

async function handleEvent(event) {
  if (event.type !== "message" || event.message?.type !== "text") return;
  if (event.source?.userId !== LINE_USER_ID) {
    console.warn(`เพิกเฉยข้อความจากผู้ใช้อื่น: ${event.source?.userId}`);
    return;
  }
  const text = event.message.text.trim();

  if (text === "/help") {
    return reply(
      event.replyToken,
      "พิมพ์คำสั่งให้ Claude Code ได้เลย (รันทีละงาน ถ้าไม่ว่างจะต่อคิวให้)\n" +
        "/status — ดูงานที่กำลังรันและคิว\n/cancel — หยุดงานที่กำลังรัน (แล้วรันงานถัดไปในคิว)\n/clear — ล้างคิวที่ยังไม่เริ่ม",
    );
  }
  if (text === "/status") {
    if (!job) return reply(event.replyToken, "ว่าง — ไม่มีงานที่กำลังรัน");
    const queued = taskQueue.map((t, i) => `${i + 1}. ${shorten(t.prompt)} (รอ ${elapsed(t.queuedAt)})`);
    return reply(
      event.replyToken,
      `กำลังรัน (${elapsed(job.startedAt)}):\n${job.prompt}\n\nคิว ${taskQueue.length} งาน` +
        (queued.length > 0 ? `\n${queued.join("\n")}` : ""),
    );
  }
  if (text === "/cancel") {
    if (!job) return reply(event.replyToken, "ไม่มีงานที่กำลังรัน");
    job.cancelled = true;
    killTree(job.child);
    return reply(event.replyToken, `สั่งหยุดงานแล้ว${taskQueue.length > 0 ? ` — จะเริ่มงานถัดไปในคิว (${taskQueue.length} งาน)` : ""}`);
  }
  if (text === "/clear") {
    const count = taskQueue.splice(0).length;
    return reply(event.replyToken, count > 0 ? `ล้างคิวแล้ว ${count} งาน (งานที่กำลังรันยังทำต่อ)` : "คิวว่างอยู่แล้ว");
  }
  if (job) {
    taskQueue.push({ prompt: text, queuedAt: new Date() });
    console.log(`เข้าคิวลำดับที่ ${taskQueue.length}: ${text}`);
    return reply(
      event.replyToken,
      `📥 รับคำสั่งเข้าคิวแล้ว — ลำดับที่ ${taskQueue.length}\n` +
        `กำลังรัน: ${shorten(job.prompt, 40)} (${elapsed(job.startedAt)})\n` +
        `จะเริ่มอัตโนมัติเมื่องานก่อนหน้าเสร็จ (/status ดูคิว, /clear ล้างคิว)`,
    );
  }

  console.log(`รับคำสั่ง: ${text}`);
  runClaude(text);
  return reply(event.replyToken, `รับคำสั่งแล้ว กำลังรัน Claude Code… (หยุดอัตโนมัติเมื่อเกิน ${TIMEOUT_MIN} นาที)`);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(job ? `busy (queue: ${taskQueue.length})` : "ok");
  }
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    return res.end();
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const rawBody = Buffer.concat(chunks);
    if (!verifySignature(rawBody, req.headers["x-line-signature"])) {
      console.warn("ปฏิเสธคำขอ: ลายเซ็น LINE ไม่ถูกต้อง");
      res.writeHead(401);
      return res.end();
    }
    // ตอบ 200 ทันที (LINE ต้องการภายในไม่กี่วินาที) แล้วค่อยประมวลผล — ปุ่ม Verify ใน LINE Console ส่ง events ว่าง
    res.writeHead(200);
    res.end();
    let events = [];
    try {
      events = JSON.parse(rawBody.toString("utf8")).events ?? [];
    } catch {
      return;
    }
    for (const event of events) handleEvent(event).catch((err) => console.error("จัดการ event ล้มเหลว:", err));
  });
});

server.listen(PORT, () => {
  console.log(`LINE bot พร้อมที่ http://localhost:${PORT}/webhook`);
  console.log(`เปิดสู่อินเทอร์เน็ตด้วย: ngrok http ${PORT}`);
});
