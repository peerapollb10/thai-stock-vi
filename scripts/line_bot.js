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
// รับคำสั่งใหม่ และ /status: ตอบ 1 ข้อความจาก statusText() — "กำลังรันงาน..." + "[ชื่องานสั้น] [x min]"
//   ต่อด้วย "งานที่รอคิว..." + "1.[ชื่องาน] [x min]" … เฉพาะเมื่อมีคิว (เวลาคร่าวๆ จาก estimate())
// งานเสร็จ: ส่งผลลัพธ์ 2 ข้อความเท่านั้น (1) "📋 สำหรับ Gemini" เนื้อหาทางเทคนิค (2) "📝 สำหรับคุณเบียร์" สรุป Bullet อยู่ล่างสุด
//   (ไม่มีบรรทัดสถานะ/เวลา/คิวดิบ — แสดงสาเหตุเฉพาะเมื่องานล้มเหลว; send-line.js ข้ามการส่งเมื่อรันจาก bot)
// /restart หรือ /reboot: ตอบ "กำลังรีสตาร์ทบอท..." แล้วเปิด bot ตัวใหม่แทนตัวเดิม — ตัวใหม่ push "✅ รีสตาร์ทบอทเรียบร้อย" เมื่อพร้อม
// ปุ่มอนุมัติงาน: คำสั่งเสี่ยง (ตรง APPROVAL_RULES เช่น ทั้งตลาด / git push / ลบ) หรือ "/confirm <คำสั่ง>" ยังไม่รันทันที
//   แต่ตอบเป็น Flex Message ที่มีปุ่ม "✅ อนุมัติ (Approve)" / "❌ ปฏิเสธ (Reject)" — กดแล้ว LINE ส่ง postback event
//   (data "action=approve|reject&id=…") กลับมา: อนุมัติ → รันทันทีหรือต่อคิว, ปฏิเสธ → ยกเลิก แล้วตอบสถานะทาง reply ทันที
//   คำขอเก็บในหน่วยความจำ (pendingApprovals) ใช้ได้ครั้งเดียว หมดอายุใน BOT_APPROVAL_TTL_MIN นาที และถูกล้างเมื่อ /restart
const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.join(__dirname, "..");
// เก็บ env ก่อนโหลด .env.local ไว้ส่งให้ process ใหม่ตอน /restart — loadEnvFile ไม่เขียนทับค่าที่มีอยู่แล้ว
// ถ้าส่ง process.env ปัจจุบันไป ค่าที่แก้ใน .env.local จะไม่มีผลหลังรีสตาร์ท
const launchEnv = { ...process.env };
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
let restarting = false; // ระหว่าง /restart ไม่รับงานใหม่และไม่หยิบงานจากคิว
/** @type {Map<string, { prompt: string, reason: string, createdAt: Date }>} */
const pendingApprovals = new Map(); // คำขออนุมัติที่ยังไม่ได้กดปุ่ม — key คือ id ใน postback data
const APPROVAL_TTL_MIN = Number(process.env.BOT_APPROVAL_TTL_MIN) || 30;
// คำสั่งที่ย้อนกลับยากตาม CLAUDE.md (push, ลบข้อมูลใน Supabase, ดึงทั้งตลาด) — ต้องกดอนุมัติก่อนรัน
const APPROVAL_RULES = [
  [/ทั้งตลาด|set_symbols\.csv/i, "ดึงข้อมูลทั้งตลาด (~30–40 นาที)"],
  // จับเฉพาะ git push — "push message" ของ LINE ไม่นับ
  [/git\s+push|push\s*(ขึ้น|to\s|origin)|พุช/i, "push ขึ้น remote"],
  // จับเฉพาะการลบข้อมูล — "ลบปุ่ม/ลบโค้ด" ทั่วไปไม่ต้องขออนุมัติ
  [/ลบ(ข้อมูล|ตาราง|แถว|ทั้งหมด)|delete\s+from|drop\s+table|\btruncate\b|reset\s+--hard|rm\s+-rf/i, "ลบ/เขียนทับข้อมูล"],
];

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
const replyMessage = (replyToken, message) => callLine("reply", { replyToken, messages: [message] });
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

// ประเมินเวลาคร่าวๆ จากคำสั่ง (ไม่ต้องแม่น) — ใช้ในข้อความตอบรับ "ใช้เวลาประมาณ X นาที"
function estimate(prompt) {
  if (/fetch|ดึงข้อมูล|ทั้งตลาด/i.test(prompt)) return "3–5";
  const lines = prompt.split("\n").filter((l) => l.trim()).length;
  if (prompt.length > 300 || lines >= 4) return "5–10";
  return "2–3";
}

// ชื่องานแบบสั้น + เวลาประเมิน เช่น "ช่วยปรับปรุงรูปแบบข้อความ… [5–10 min]" — ใช้บรรทัดแรกของคำสั่งเป็นชื่อ
const taskLine = (prompt) => `${shorten(prompt.split("\n").find((l) => l.trim()) ?? prompt, 40)} [${estimate(prompt)} min]`;

// ข้อความสถานะ (ตอบรับคำสั่งใหม่ และ /status): 2 บรรทัดแรกคืองานที่รันอยู่
// ส่วน "งานที่รอคิว..." แสดงเฉพาะเมื่อมีงานในคิว — คิวว่างจึงเหลือแค่ 2 บรรทัด
function statusText() {
  const lines = ["กำลังรันงาน...", taskLine(job.prompt)];
  if (taskQueue.length > 0) lines.push("งานที่รอคิว...", ...taskQueue.map((t, i) => `${i + 1}.${taskLine(t.prompt)}`));
  return lines.join("\n");
}

// แยก stdout เป็น { details, bullets } ตาม SUMMARY_MARKER — ถ้า Claude ไม่ได้ใส่ตัวคั่น bullets จะว่าง
function splitOutput(stdout) {
  const idx = stdout.lastIndexOf(SUMMARY_MARKER);
  if (idx === -1) return { details: stdout.trim(), bullets: "" };
  return { details: stdout.slice(0, idx).trim(), bullets: stdout.slice(idx + SUMMARY_MARKER.length).trim() };
}

// ข้อความที่ 1: หัวข้อ + เนื้อหาทางเทคนิคล้วนๆ สำหรับก๊อปปี้ไปให้ Gemini (ไม่มีบรรทัดสถานะ/คิว)
// ถ้างานล้มเหลวจึงแนบสาเหตุและ stderr ต่อท้าย เพื่อให้ Gemini วิเคราะห์ปัญหาได้
function formatDetails({ ok, status, details, stderr }) {
  const parts = ["📋 สำหรับ Gemini", details || "(ไม่มีข้อความตอบกลับ)"];
  if (!ok) parts.push(`[ข้อผิดพลาด] ${status}${stderr.trim() ? `\n${stderr.trim()}` : ""}`);
  return parts.join("\n\n");
}

// ข้อความที่ 2 (ล่างสุด): หัวข้อ + สรุปสั้นแบบ Bullet ไว้อ่านเอง
function formatSummary({ ok, status, bullets }) {
  const lines = ["📝 สำหรับคุณเบียร์"];
  if (!ok) lines.push(`• ✗ ${status}`);
  if (bullets) lines.push(bullets);
  else if (ok) lines.push("• (Claude ไม่ได้ส่งสรุปมา — ดูรายละเอียดในข้อความก่อนหน้า)");
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
  // LINE_BOT_JOB=1: ให้ send-line.js (ที่ถูกเรียกผ่าน npm run finish ตาม Finish Protocol) ข้ามการส่งข้อความซ้ำ
  // ไม่งั้น LINE จะได้ข้อความ "Status: … / Completed Tasks: …" ดิบเพิ่มเป็นข้อความที่ 3 ก่อนผลลัพธ์ 2 ข้อความของ bot
  const child = spawn("claude -p --permission-mode acceptEdits --output-format text", {
    cwd: root,
    shell: true,
    windowsHide: true,
    env: { ...process.env, LINE_BOT_JOB: "1" },
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

// เหตุผลที่คำสั่งต้องขออนุมัติ — null คือรันได้ทันที
function approvalReason(prompt) {
  const hit = APPROVAL_RULES.find(([pattern]) => pattern.test(prompt));
  return hit ? hit[1] : null;
}

// Flex Message ขออนุมัติ: หัวการ์ด + เหตุผล + คำสั่ง (ตัดที่ 300 ตัวอักษร) + ปุ่ม postback 2 ปุ่ม
// displayText คือข้อความที่แสดงในแชทแทนผู้ใช้เมื่อกดปุ่ม; data ยาวได้ไม่เกิน 300 ตัวอักษร จึงส่งแค่ action + id
function approvalFlex(id, prompt, reason) {
  const button = (action, label, color) => ({
    type: "button",
    style: "primary",
    color,
    height: "sm",
    action: { type: "postback", label, data: `action=${action}&id=${id}`, displayText: label },
  });
  return {
    type: "flex",
    altText: `🔐 ขออนุมัติงาน: ${shorten(prompt, 300)}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFF4E5",
        contents: [
          { type: "text", text: "🔐 ขออนุมัติงาน", weight: "bold", size: "lg", color: "#B45309" },
          { type: "text", text: reason, size: "sm", color: "#92400E", wrap: true },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: shorten(prompt, 300), wrap: true, size: "sm" },
          { type: "text", text: `ปุ่มหมดอายุใน ${APPROVAL_TTL_MIN} นาที`, size: "xs", color: "#888888" },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [button("approve", "✅ อนุมัติ (Approve)", "#16A34A"), button("reject", "❌ ปฏิเสธ (Reject)", "#DC2626")],
      },
    },
  };
}

// ส่งคำขออนุมัติแบบ Interactive — เก็บคำสั่งไว้ใน pendingApprovals จนกว่าจะกดปุ่มหรือหมดอายุ
// ส่งทาง reply เมื่อมี replyToken (ฟรี) ไม่งั้น push (เช่นเรียกจากโค้ดส่วนอื่นที่ไม่มีข้อความผู้ใช้)
function requestApproval(prompt, reason, replyToken) {
  for (const [key, req] of pendingApprovals) {
    if (Date.now() - req.createdAt.getTime() > APPROVAL_TTL_MIN * 60_000) pendingApprovals.delete(key);
  }
  const id = crypto.randomBytes(6).toString("hex");
  pendingApprovals.set(id, { prompt, reason, createdAt: new Date() });
  console.log(`ขออนุมัติ ${id} (${reason}): ${shorten(prompt)}`);
  const message = approvalFlex(id, prompt, reason);
  return replyToken ? replyMessage(replyToken, message) : callLine("push", { to: LINE_USER_ID, messages: [message] });
}

// รันทันทีถ้าว่าง ไม่งั้นต่อคิว — คืนข้อความสถานะ statusText() ไว้ตอบกลับ
function startOrQueue(prompt) {
  if (job) {
    taskQueue.push({ prompt, queuedAt: new Date() });
    console.log(`เข้าคิวลำดับที่ ${taskQueue.length}: ${prompt}`);
  } else {
    console.log(`รับคำสั่ง: ${prompt}`);
    runClaude(prompt);
  }
  return statusText();
}

// postback จากปุ่มใน approvalFlex() — ใช้ได้ครั้งเดียว (ลบออกจาก pendingApprovals ก่อนทำงาน กันกดซ้ำ)
function handleApproval(event) {
  const params = new URLSearchParams(event.postback?.data ?? "");
  const action = params.get("action");
  const id = params.get("id") ?? "";
  if (action !== "approve" && action !== "reject") return;
  const req = pendingApprovals.get(id);
  pendingApprovals.delete(id);
  if (!req || Date.now() - req.createdAt.getTime() > APPROVAL_TTL_MIN * 60_000) {
    return reply(event.replyToken, "คำขอนี้ถูกจัดการไปแล้วหรือหมดอายุ — ส่งคำสั่งใหม่อีกครั้งถ้าต้องการรัน");
  }
  if (action === "reject") {
    console.log(`ปฏิเสธ ${id}: ${shorten(req.prompt)}`);
    return reply(event.replyToken, `❌ ปฏิเสธคำสั่งแล้ว — ยกเลิกงาน\n${shorten(req.prompt, 40)}`);
  }
  console.log(`อนุมัติ ${id}`);
  const queued = job !== null;
  const status = startOrQueue(req.prompt);
  const head = queued ? `✅ อนุมัติคำสั่งเรียบร้อย — เข้าคิวลำดับที่ ${taskQueue.length}` : "✅ อนุมัติคำสั่งเรียบร้อย กำลังดำเนินการ...";
  return reply(event.replyToken, `${head}\n\n${status}`);
}

// หยิบงานถัดไปในคิวมารัน (ทีละงาน) จนกว่าคิวจะหมด
function runNext() {
  if (job || restarting) return;
  const next = taskQueue.shift();
  if (!next) return;
  console.log(`เริ่มงานจากคิว (รอ ${elapsed(next.queuedAt)}, เหลือ ${taskQueue.length}): ${next.prompt}`);
  runClaude(next.prompt);
}

// /restart: หยุดงานที่รันอยู่ ล้างคิว ปิดพอร์ต แล้วเปิด line_bot.js ตัวใหม่ (โหลดโค้ดและ .env.local ใหม่) ก่อนออกจาก process เดิม
// ใช้ node ตรงๆ แทน npm run bot (ไม่ผ่าน shell) และต้อง detached: บน Windows process ลูกแบบปกติอยู่ใน job object
// ของ Node ที่ถูกฆ่าตามเมื่อ process เดิมออก — process แยกไม่มี Terminal จึงเขียน log ต่อท้ายที่ data/bot.log แทน
// (หยุดบอทตัวใหม่ด้วย Task Manager / taskkill เพราะ Ctrl+C ใน Terminal เดิมใช้ไม่ได้แล้ว)
// process ใหม่จะลอง listen ซ้ำถ้าพอร์ตยังไม่ว่าง และ push แจ้ง "รีสตาร์ทเรียบร้อย" เมื่อพร้อม
const BOT_LOG = path.join(root, "data", "bot.log");

function restart() {
  restarting = true;
  if (job) {
    job.cancelled = true;
    killTree(job.child);
  }
  taskQueue.splice(0);
  pendingApprovals.clear();
  server.close();
  server.closeAllConnections();
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
  child.once("spawn", () => {
    child.unref();
    setTimeout(() => process.exit(0), 500); // รอ taskkill เริ่มทำงานก่อนออก
  });
  child.once("error", (err) => {
    console.error("รีสตาร์ทไม่สำเร็จ:", err);
    restarting = false;
    listen();
    push(`✗ รีสตาร์ทบอทไม่สำเร็จ: ${err.message} — บอทตัวเดิมยังทำงานต่อ`).catch(() => {});
  });
}

async function handleEvent(event) {
  const isText = event.type === "message" && event.message?.type === "text";
  if (!isText && event.type !== "postback") return;
  if (event.source?.userId !== LINE_USER_ID) {
    console.warn(`เพิกเฉยข้อความจากผู้ใช้อื่น: ${event.source?.userId}`);
    return;
  }
  if (restarting) return reply(event.replyToken, "บอทกำลังรีสตาร์ท — ส่งคำสั่งใหม่อีกครั้งเมื่อได้ข้อความ ✅");
  if (event.type === "postback") return handleApproval(event);
  const text = event.message.text.trim();

  if (text === "/help") {
    return reply(
      event.replyToken,
      "พิมพ์คำสั่งให้ Claude Code ได้เลย (รันทีละงาน ถ้าไม่ว่างจะต่อคิวให้)\n" +
        "/status — ดูงานที่กำลังรันและคิว\n/cancel — หยุดงานที่กำลังรัน (แล้วรันงานถัดไปในคิว)\n/clear — ล้างคิวที่ยังไม่เริ่ม\n" +
        "/restart หรือ /reboot — รีสตาร์ทบอท (หยุดงานที่รันอยู่และล้างคิว)\n" +
        "/confirm <คำสั่ง> — ส่งปุ่มอนุมัติก่อนรัน (คำสั่งเสี่ยง เช่น ทั้งตลาด / push / ลบ จะขออนุมัติให้อัตโนมัติ)",
    );
  }
  if (text === "/restart" || text === "/reboot") {
    const dropped = [job && "หยุดงานที่กำลังรัน", taskQueue.length > 0 && `ล้างคิว ${taskQueue.length} งาน`].filter(Boolean);
    // ส่งข้อความตอบกลับให้เสร็จก่อน แล้วค่อยรีสตาร์ท — replyToken ใช้ไม่ได้หลัง process เดิมปิด
    await reply(event.replyToken, `🔄 กำลังรีสตาร์ทบอท...${dropped.length > 0 ? `\n(${dropped.join(", ")})` : ""}`).catch(
      (err) => console.error("ตอบกลับ /restart ล้มเหลว:", err),
    );
    return restart();
  }
  if (text === "/status") {
    if (!job) return reply(event.replyToken, "ว่าง — ไม่มีงานที่กำลังรัน");
    return reply(event.replyToken, statusText());
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
  const confirm = text.match(/^\/confirm\s+([\s\S]+)/);
  if (text === "/confirm") return reply(event.replyToken, "ใช้: /confirm <คำสั่ง>");
  if (confirm) return requestApproval(confirm[1].trim(), "ขออนุมัติตามคำสั่ง /confirm", event.replyToken);
  const reason = approvalReason(text);
  if (reason) return requestApproval(text, `คำสั่งเสี่ยง: ${reason}`, event.replyToken);

  // ตอบรับสั้นๆ 1 ข้อความทาง reply (ฟรี) ด้วย statusText() — ผลลัพธ์จริงส่งภายหลังเป็น 2 ข้อความทาง push
  return reply(event.replyToken, startOrQueue(text));
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

// BOT_RESTARTED=1 มาจาก restart() — ลบออกไม่ให้ส่งต่อไปยัง claude ที่ bot รัน
const restarted = process.env.BOT_RESTARTED === "1";
delete process.env.BOT_RESTARTED;

// หลัง /restart พอร์ตของ process เดิมอาจยังไม่ว่างทันที — ลองใหม่ทุก 1 วินาที สูงสุด 15 ครั้ง
let listenAttempts = 0;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && ++listenAttempts < 15) {
    setTimeout(listen, 1000);
    return;
  }
  console.error("เปิดพอร์ตไม่ได้:", err.message);
  process.exit(1);
});
server.on("listening", () => {
  listenAttempts = 0;
  console.log(`LINE bot พร้อมที่ http://localhost:${PORT}/webhook`);
  console.log(`เปิดสู่อินเทอร์เน็ตด้วย: ngrok http ${PORT}`);
});
function listen() {
  server.listen(PORT);
}

listen();
if (restarted) {
  server.once("listening", () =>
    push("✅ รีสตาร์ทบอทเรียบร้อย พร้อมรับคำสั่ง").catch((err) => console.error("แจ้งผลรีสตาร์ทล้มเหลว:", err)),
  );
}
