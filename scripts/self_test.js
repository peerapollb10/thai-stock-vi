// Self-Test อัตโนมัติก่อนส่งงาน: Lint → Build → เปิดหน้าเว็บจริงด้วย Headless Edge/Chrome แล้วตรวจตามมาตรฐานโปรดักชัน
// ใช้งาน: npm run self-test                 (ครบทุกขั้น)
//         npm run self-test -- --skip-build (ใช้ build เดิมใน .next — เร็วขึ้นเมื่อแก้แค่สคริปต์)
//         npm run self-test -- --no-ui | --skip-lint | --widths 320,375 | --pages /,/stocks | --base-url http://localhost:3000
//         npm run self-test -- --expect-stocks 633  (กำหนดจำนวนหุ้นสามัญที่ต้องแสดงเอง แทนการนับจาก Supabase)
// scripts/finish.js เรียก runSelfTest() ก่อนส่ง LINE + ป๊อปอัป เพื่อให้ผลตรวจไปถึงผู้ใช้เสมอ
//
// หมวดการตรวจ UI (ทุกหน้า × ทุกความกว้าง — ปัญหาขึ้นต้นด้วย [หมวด] ใน report):
//   [layout]  หน้า/Element ล้นจอแนวนอน, ตารางต้องเลื่อนแนวนอน
//   [data]    คำต้องห้ามค้างบน UI (Mock, Dummy, ข้อมูลจำลอง, undefined, null, NaN), จำนวนหุ้นบนหน้าเว็บตรงกับ Supabase,
//             Empty State ของ /stocks (ค้นหาไม่พบ → มีข้อความ + ปุ่มล้างตัวกรอง และกดแล้วกลับมาครบ)
//   [touch]   จอ < 768px: ปุ่ม/ลิงก์/ช่องกรอกต้องกดได้ขนาดอย่างน้อย 44×44px
//   [font]    จอ < 768px: ข้อความที่มองเห็นต้องไม่เล็กกว่า 12px
//   [network] HTTP 4xx/5xx หรือโหลดไม่สำเร็จ, console.error, JS exception ระหว่างทดสอบ
//
// ไม่ใช้ Playwright/Puppeteer: คุม Edge/Chrome ที่ติดตั้งในเครื่องผ่าน Chrome DevTools Protocol ด้วย WebSocket ของ Node (≥ 22)
// จึงไม่ต้องดาวน์โหลดเบราว์เซอร์ ~150 MB และไม่ต้องติดตั้ง package เพิ่ม
// ผลตรวจ: data/self-test/report.json + ภาพหน้าจอ data/self-test/<หน้า>-<กว้าง>.png (เปิดดูด้วยตาได้)
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "data", "self-test");
const DEFAULT_PAGES = ["/", "/stocks", "/stocks/PTT", "/watchlist"];
const DEFAULT_WIDTHS = [375, 768, 1280];
const MOBILE_MAX = 767; // จอ ≤ 767px ตรวจ Touch Target + ขนาดตัวอักษรเพิ่ม
const MIN_TOUCH = 44;
const MIN_FONT = 12;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const opts = {
    lint: true,
    build: true,
    ui: true,
    pages: DEFAULT_PAGES,
    widths: DEFAULT_WIDTHS,
    baseUrl: "",
    expectStocks: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--skip-lint") opts.lint = false;
    else if (arg === "--skip-build") opts.build = false;
    else if (arg === "--no-ui") opts.ui = false;
    else if (arg === "--pages") opts.pages = argv[++i].split(",").map((p) => p.trim()).filter(Boolean);
    else if (arg === "--widths") opts.widths = argv[++i].split(",").map(Number).filter((w) => w > 0);
    else if (arg === "--base-url") opts.baseUrl = argv[++i].replace(/\/$/, "");
    else if (arg === "--expect-stocks") opts.expectStocks = Number(argv[++i]);
  }
  return opts;
}

// ---------- ข้อมูลอ้างอิงจาก Supabase ----------

/**
 * นับหลักทรัพย์ทั้งหมดในตาราง stocks และหุ้นสามัญที่ผ่าน isViEligible() ตัวเดียวกับหน้าเว็บ
 * (Node 24 import ไฟล์ .ts ได้โดยตรง — ไม่ต้องคัดลอกเกณฑ์มาไว้ที่นี่ ป้องกันเกณฑ์สองที่ไม่ตรงกัน)
 */
async function dbStockCounts() {
  const envPath = path.join(root, ".env.local");
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("ไม่พบ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const selectAll = async (table, columns, order) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select(columns);
      for (const col of order) q = q.order(col);
      const { data, error } = await q.range(from, from + 999);
      if (error) throw new Error(`อ่าน ${table} ไม่สำเร็จ: ${error.message}`);
      rows.push(...data);
      if (data.length < 1000) return rows;
    }
  };
  const [stocks, financials] = await Promise.all([
    selectAll("stocks", "symbol,name,sector,price", ["symbol"]),
    selectAll("stock_financials", "symbol,year", ["symbol", "year"]),
  ]);
  // คัดลอกเป็น .mts ก่อน import — .ts ในแพ็กเกจที่ไม่มี "type": "module" ทำให้ Node เตือน MODULE_TYPELESS_PACKAGE_JSON
  // (screening.ts มีแค่ `import type` ซึ่งถูกลบตอน strip types จึงไม่ต้อง resolve "@/..." )
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thai-stock-screening-"));
  const tmpFile = path.join(tmpDir, "screening.mts");
  fs.copyFileSync(path.join(root, "src", "lib", "screening.ts"), tmpFile);
  let isViEligible;
  try {
    ({ isViEligible } = await import(pathToFileURL(tmpFile).href));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  const withFinancials = new Set(financials.map((f) => f.symbol));
  // แปลงแถวแบบเดียวกับ toStock() ใน src/lib/market-data.ts เฉพาะฟิลด์ที่ isViEligible ใช้
  const eligible = stocks.filter((row) =>
    isViEligible({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector ?? "Other",
      price: row.price ?? Number.NaN,
      history: withFinancials.has(row.symbol) ? [{}] : [],
    }),
  ).length;
  return { total: stocks.length, eligible };
}

/** รันคำสั่ง npm แล้วเก็บผลย่อ — แสดง output เต็มเฉพาะตอนล้มเหลว เพื่อไม่ให้ Terminal ยาวเกินไป */
function runNpm(script, timeoutMs) {
  const started = Date.now();
  // คำสั่งเป็นสตริงเดียว (ไม่ส่ง args แยก) — Node 24 เตือน DEP0190 ถ้าส่ง args พร้อม shell: true
  const res = spawnSync(`npm run ${script}`, { cwd: root, shell: true, encoding: "utf8", timeout: timeoutMs });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const ok = res.status === 0;
  const seconds = Math.round((Date.now() - started) / 1000);
  if (!ok) console.error(output.slice(-4000) || res.error?.message);
  return { ok, seconds, output, timedOut: res.error?.code === "ETIMEDOUT" };
}

function lintSummary(output) {
  const m = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
  return m ? `${m[2]} error, ${m[3]} warning` : "0 error, 0 warning";
}

// ---------- เบราว์เซอร์ ----------

function findBrowser() {
  const env = process.env.SELF_TEST_BROWSER;
  if (env) return fs.existsSync(env) ? env : null;
  const bases = [process.env["PROGRAMFILES(X86)"], process.env.PROGRAMFILES, process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = [
    ...bases.flatMap((b) => [
      path.join(b, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(b, "Google", "Chrome", "Application", "chrome.exe"),
    ]),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** ตัวเชื่อม CDP แบบ flatten session: send(method, params, sessionId) + on(event, handler) */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  waitFor(method, sessionId, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(reject, new Error(`รอ ${method} เกิน ${timeoutMs / 1000} วินาที`)), timeoutMs);
      const listener = (msg) => msg.method === method && msg.sessionId === sessionId && done(resolve, msg.params);
      const done = (fn, value) => {
        clearTimeout(timer);
        this.listeners = this.listeners.filter((l) => l !== listener);
        fn(value);
      };
      this.listeners.push(listener);
    });
  }
}

async function launchBrowser(executable) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "thai-stock-self-test-"));
  const proc = spawn(
    executable,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-extensions",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  // เบราว์เซอร์เขียนพอร์ตที่สุ่มได้ลงไฟล์ DevToolsActivePort (บรรทัด 1 = พอร์ต, บรรทัด 2 = path ของ WebSocket)
  const portFile = path.join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) throw new Error("เปิดเบราว์เซอร์ไม่สำเร็จ (ไม่พบ DevToolsActivePort)");
  await sleep(100);
  const [port, wsPath] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("เชื่อม DevTools ไม่สำเร็จ")), { once: true });
  });
  const close = async () => {
    try {
      ws.close();
    } catch {}
    proc.kill();
    await sleep(300);
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { cdp: new Cdp(ws), close };
}

// ทำงานในหน้าเว็บ: หา Element ที่ล้นจอแนวนอน (ต้องเลื่อนซ้าย-ขวา) — คืนเฉพาะตัวนอกสุด ไม่ซ้ำตัวลูก
const OVERFLOW_PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    const cls = typeof el.className === "string" ? el.className.trim().split(/\\s+/).slice(0, 4).join(".") : "";
    if (cls) s += "." + cls;
    const text = (el.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 40);
    return text ? s + ' "' + text + '"' : s;
  };
  const isFixed = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === "fixed") return true;
    return false;
  };
  const offenders = [], scrollers = [], seen = [];
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // กล่องที่เลื่อนแนวนอนได้ภายใน (overflow-x: auto/scroll) และเนื้อหากว้างกว่ากล่อง
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) {
      scrollers.push({ element: describe(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        hasTable: el.tagName === "TABLE" || !!el.querySelector("table") });
    }
    if (r.right <= vw + 1 && r.left >= -1) continue;
    // ถูกตัดโดยกล่องแม่ที่ overflow ไม่ใช่ visible → ไม่ทำให้หน้าล้น (กล่องแม่ถูกตรวจแยกเอง)
    let clipped = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflowX !== "visible") { clipped = true; break; }
    }
    if (clipped) continue;
    // Element แบบ fixed ไม่ทำให้หน้าเลื่อนแนวนอน (Sidebar off-canvas, ฉากหลังเมนู) — และบนมือถือจะกว้างตามหน้าที่ล้นอยู่แล้ว
    if (isFixed(el)) continue;
    if (seen.some((p) => p.contains(el))) continue;
    seen.push(el);
    offenders.push({ element: describe(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
  }
  return {
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    pageOverflow: document.documentElement.scrollWidth > vw + 1,
    offenders: offenders.slice(0, 10),
    scrollers: scrollers.slice(0, 10),
    title: document.title,
    bodyText: document.body.innerText.length,
  };
})()`;

// ฟังก์ชันช่วยที่ probe ด้านล่างใช้ร่วมกัน (ฝังไว้หน้า expression แต่ละตัว)
const PROBE_HELPERS = `
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    const cls = typeof el.className === "string" ? el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "";
    if (cls) s += "." + cls;
    const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || el.value || "")
      .trim().replace(/\\s+/g, " ").slice(0, 30);
    return text ? s + ' "' + text + '"' : s;
  };
  // มองเห็นบนจอจริง: ไม่ซ่อน, มีขนาด, ไม่ใช่ sr-only (1×1px), ไม่อยู่นอกจอแนวนอน (Sidebar off-canvas)
  const visibleRect = (el) => {
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return null;
    if (el.closest('[aria-hidden="true"], [inert]')) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return null;
    if (r.right <= 0 || r.left >= document.documentElement.clientWidth) return null;
    return r;
  };
`;

// [data] คำต้องห้ามที่หลุดมาบน UI: ข้อมูลทดสอบ หรือค่าว่างของ JavaScript ที่ไม่ได้จัดรูปแบบ
// ข้อความที่มองเห็น (innerText) + title + placeholder / aria-label / alt / title ของ Element ที่มองเห็น
const CONTENT_PROBE = `(() => {
  ${PROBE_HELPERS}
  const rules = [/\\b(?:mock|dummy)\\b|ข้อมูลจำลอง|lorem ipsum/gi, /\\b(?:undefined|null|NaN)\\b/g];
  const sources = [["title", document.title], ["text", document.body.innerText]];
  for (const el of document.body.querySelectorAll("[placeholder], [aria-label], [alt], [title]")) {
    if (!visibleRect(el)) continue;
    for (const attr of ["placeholder", "aria-label", "alt", "title"]) {
      const v = el.getAttribute(attr);
      if (v) sources.push([attr + " ของ " + describe(el), v]);
    }
  }
  const hits = [];
  for (const [where, text] of sources) {
    for (const rule of rules) {
      for (const m of text.matchAll(rule)) {
        const ctx = text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20).replace(/\\s+/g, " ").trim();
        hits.push({ word: m[0], where, context: ctx });
      }
    }
  }
  return { hits: hits.slice(0, 10), total: hits.length, textContent: document.body.textContent };
})()`;

// [touch] เป้าที่ใช้นิ้วกดต้องกว้างและสูงอย่างน้อย MIN_TOUCH px
// ช่องกรอกที่อยู่ใน <label> วัดที่ label (กดได้ทั้งกล่อง), Element ที่ซ้อนอยู่ในปุ่ม/ลิงก์อื่นวัดที่ตัวนอก,
// ลิงก์ในประโยค (inline ที่มีข้อความรอบข้าง) ได้รับยกเว้นตาม WCAG 2.5.8
// ลิงก์แบบ "stretched" (::after absolute inset-0 คลุมทั้งการ์ด) วัดที่กล่องที่ ::after คลุม (offsetParent)
// scope = selector ของส่วนที่ตรวจ (เช่น "aside" ตอนเปิดเมนู Sidebar)
const touchProbe = (scope = "body") => `(() => {
  ${PROBE_HELPERS}
  const MIN = ${MIN_TOUCH};
  const CLICKABLE = 'a[href], button, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], summary, select, textarea, input:not([type="hidden"])';
  const scopeEl = document.querySelector(${JSON.stringify(scope)}) || document.body;
  const seen = new Set(), small = [];
  let checked = 0;
  for (const el of scopeEl.querySelectorAll(CLICKABLE)) {
    if (el.disabled) continue;
    let target = el.tagName === "INPUT" || el.tagName === "SELECT" ? el.closest("label") || el : el;
    const outer = target.parentElement && target.parentElement.closest('a[href], button, [role="button"], label');
    if (outer) target = outer;
    if (seen.has(target)) continue;
    seen.add(target);
    let r = visibleRect(target);
    if (!r) continue;
    const after = getComputedStyle(target, "::after");
    if (after.content !== "none" && after.position === "absolute" && target.offsetParent) {
      r = target.offsetParent.getBoundingClientRect();
    }
    const cs = getComputedStyle(target);
    if (target.tagName === "A" && cs.display === "inline") {
      const parentText = (target.parentElement.innerText || "").trim();
      if (parentText.length > (target.innerText || "").trim().length + 10) continue;
    }
    checked++;
    if (r.width >= MIN - 0.5 && r.height >= MIN - 0.5) continue;
    small.push({ element: describe(target), width: Math.round(r.width), height: Math.round(r.height) });
  }
  return { checked, total: small.length, small: small.slice(0, 15) };
})()`;

// [font] ข้อความที่มองเห็นต้องไม่เล็กกว่า MIN_FONT px — รวมตัวอักษรในกราฟ (SVG text) เพราะเป็นตัวเลขที่ต้องอ่าน
const fontProbe = (scope = "body") => `(() => {
  ${PROBE_HELPERS}
  const MIN = ${MIN_FONT};
  const scopeEl = document.querySelector(${JSON.stringify(scope)}) || document.body;
  const walker = document.createTreeWalker(scopeEl, NodeFilter.SHOW_TEXT);
  const byEl = new Map();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent.trim() || byEl.has(el)) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "OPTION"].includes(el.tagName)) continue;
    byEl.set(el, true);
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size >= MIN - 0.01 || !visibleRect(el)) continue;
    byEl.set(el, { size, element: describe(el) });
  }
  const small = [...byEl.values()].filter((v) => v !== true);
  // รวมกลุ่มตาม (ขนาด + คลาส) — การ์ดหุ้น 600 ใบไม่ต้องรายงาน 600 บรรทัด
  const groups = new Map();
  for (const s of small) {
    const k = s.size + "|" + s.element.split(' "')[0];
    const g = groups.get(k) || { size: s.size, element: s.element, count: 0 };
    g.count++;
    groups.set(k, g);
  }
  return { total: small.length, groups: [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 10) };
})()`;

/** แปลงตัวเลขบนหน้าเว็บ ("1,234" / เลขไทย) เป็น Number */
function parseCount(text) {
  const arabic = text.replace(/[๐-๙]/g, (d) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d))).replace(/,/g, "");
  return Number(arabic);
}

/**
 * [data] จำนวนหุ้นบนหน้าเว็บต้องตรงกับ Supabase — ใช้ textContent (รวม Sidebar ที่ซ่อนอยู่บนมือถือ)
 * total = แถวในตาราง stocks ทั้งหมด, eligible = หุ้นสามัญที่ผ่าน isViEligible (ตัวนับใน Stock Screener)
 */
function countProblems(page, textContent, expected) {
  if (!expected) return [];
  const checks = [{ label: "Sidebar", re: /Supabase · ([\d,๐-๙]+) หลักทรัพย์/, want: [expected.total] }];
  if (page === "/") {
    checks.push({ label: "Dashboard", re: /ข้อมูลจริงจาก Yahoo Finance ([\d,๐-๙]+) หลักทรัพย์/, want: [expected.total] });
  }
  if (page === "/stocks") {
    checks.push({ label: "ตัวนับ Screener", re: /พบ ([\d,๐-๙]+) จาก ([\d,๐-๙]+) หุ้นสามัญ/, want: [expected.eligible, expected.eligible] });
    if (expected.total != null) {
      checks.push({ label: "จำนวนที่ตัดออก", re: /ไม่มีงบ ([\d,๐-๙]+) ตัว/, want: [expected.total - expected.eligible] });
    }
  }
  const problems = [];
  for (const c of checks) {
    if (c.want.some((w) => w == null)) continue;
    const m = textContent.match(c.re);
    if (!m) {
      problems.push(`[data] ${c.label}: ไม่พบข้อความจำนวนหุ้น (${c.re.source})`);
      continue;
    }
    const got = m.slice(1).map(parseCount);
    if (got.some((g, i) => g !== c.want[i])) {
      problems.push(`[data] ${c.label}: "${m[0]}" ไม่ตรงกับฐานข้อมูล (ต้องเป็น ${c.want.join(" / ")}) — ถ้าเพิ่งดึงข้อมูล ให้ build ใหม่ล้าง cache`);
    }
  }
  return problems;
}

/**
 * [data] Empty State ของ Stock Screener: พิมพ์คำค้นที่ไม่มีทางตรง → ต้องเห็นข้อความ "ไม่พบหุ้น…" + ปุ่ม "ล้างตัวกรองทั้งหมด"
 * (ปุ่มต้องไม่ถูกบัง และใหญ่พอให้นิ้วกดบนมือถือ) → กดปุ่ม → ช่องค้นหาว่าง และกลับมาแสดงหุ้นครบ
 */
async function emptyStateScenario(cdp, sessionId, evaluate, width, shotName, expected) {
  const problems = [];
  // ช่องค้นหาของ Screener (ไม่ใช่ช่องค้นหาใน Navbar ซึ่งอยู่ใน form[role=search] และต้องกด Enter)
  const findInput = `[...document.querySelectorAll('input[type="search"]')].find((i) => !i.closest('header, [role="search"]'))`;
  const focused = await evaluate(`(() => {
    const input = ${findInput};
    if (!input) return false;
    input.scrollIntoView({ block: "center" });
    input.focus();
    return true;
  })()`);
  if (!focused) return { problems: ["[data] Empty State: ไม่พบช่องค้นหาของ Screener บนหน้า /stocks"] };
  await cdp.send("Input.insertText", { text: "ZZQX-ไม่มีหุ้นนี้" }, sessionId);
  await sleep(600);
  const state = await evaluate(`(() => {
    const visible = (el) => el && el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    const message = [...document.querySelectorAll("p")].find((p) => p.textContent.includes("ไม่พบหุ้นที่ตรงกับเงื่อนไข"));
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ล้างตัวกรองทั้งหมด"));
    const counter = (document.body.textContent.match(/พบ ([\\d,]+) จาก/) || [])[1];
    if (button) button.scrollIntoView({ block: "center" });
    const r = button && button.getBoundingClientRect();
    const hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      message: visible(message), button: visible(button), counter,
      buttonSize: r ? [Math.round(r.width), Math.round(r.height)] : null,
      buttonCovered: !!r && !(hit && button.contains(hit)),
    };
  })()`);
  if (!state.message) problems.push('[data] Empty State: ค้นหาไม่พบแล้วไม่มีข้อความ "ไม่พบหุ้นที่ตรงกับเงื่อนไข"');
  if (!state.button) problems.push('[data] Empty State: ไม่มีปุ่ม "ล้างตัวกรองทั้งหมด"');
  if (state.counter !== "0") problems.push(`[data] Empty State: ตัวนับแสดง "พบ ${state.counter ?? "?"}" แทน "พบ 0"`);
  if (state.button && state.buttonCovered) problems.push("[data] Empty State: ปุ่มล้างตัวกรองถูก Element อื่นบัง กดไม่ได้");
  if (state.button && width <= MOBILE_MAX && state.buttonSize.some((s) => s < MIN_TOUCH - 0.5)) {
    problems.push(`[touch] ปุ่มล้างตัวกรอง (Empty State) ${state.buttonSize.join("×")}px เล็กกว่า ${MIN_TOUCH}×${MIN_TOUCH}px`);
  }

  const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  fs.writeFileSync(path.join(outDir, shotName), Buffer.from(shot.data, "base64"));

  if (state.button && !state.buttonCovered) {
    await evaluate(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("ล้างตัวกรองทั้งหมด")).click()`);
    await sleep(600);
    const after = await evaluate(`(() => ({
      query: (${findInput}).value,
      counter: (document.body.textContent.match(/พบ ([\\d,]+) จาก ([\\d,]+)/) || []).slice(1).map((n) => Number(n.replace(/,/g, ""))),
      empty: document.body.textContent.includes("ไม่พบหุ้นที่ตรงกับเงื่อนไข"),
    }))()`);
    if (after.query !== "") problems.push(`[data] Empty State: กดล้างตัวกรองแล้วช่องค้นหายังเป็น "${after.query}"`);
    if (after.empty) problems.push("[data] Empty State: กดล้างตัวกรองแล้วยังแสดงข้อความไม่พบหุ้น");
    const [found, universe] = after.counter;
    const want = expected?.eligible ?? universe;
    if (found !== want) problems.push(`[data] Empty State: กดล้างตัวกรองแล้วแสดง ${found ?? "?"} ตัว (ต้องเป็น ${want})`);
  }
  return { problems, screenshot: path.relative(root, path.join(outDir, shotName)) };
}

/** URL สั้นสำหรับรายงาน (ตัด origin ของเซิร์ฟเวอร์ทดสอบ + query ยาวๆ) */
const shortUrl = (url) => url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/, "").slice(0, 120);

async function checkPage(cdp, url, page, width, slug, expected, withMenu) {
  const height = width < 768 ? 812 : 900;
  const mobile = width <= MOBILE_MAX;
  const shotName = `${slug}-${width}.png`;
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  // [network] เก็บทุกเหตุการณ์ตั้งแต่เปิดหน้าจนตรวจเสร็จ (รวมช่วงทดสอบ Empty State)
  const exceptions = [];
  const consoleErrors = [];
  const httpErrors = [];
  const requestUrls = new Map();
  const onEvent = (msg) => {
    if (msg.sessionId !== sessionId) return;
    const p = msg.params;
    if (msg.method === "Runtime.exceptionThrown") {
      const d = p.exceptionDetails;
      exceptions.push(`[network] JS exception: ${d.exception?.description?.split("\n")[0] ?? d.text}`);
    } else if (msg.method === "Runtime.consoleAPICalled" && (p.type === "error" || p.type === "assert")) {
      const text = p.args.map((a) => a.value ?? a.description ?? "").join(" ").replace(/\s+/g, " ").slice(0, 200);
      consoleErrors.push(`[network] console.error: ${text}`);
    } else if (msg.method === "Log.entryAdded" && p.entry.level === "error" && p.entry.source !== "network") {
      // ข้อผิดพลาดระดับเบราว์เซอร์ (CSP, ความปลอดภัย ฯลฯ) — error ของ network นับจาก Network.* แล้ว
      consoleErrors.push(`[network] ${p.entry.source}: ${p.entry.text.slice(0, 200)}`);
    } else if (msg.method === "Network.requestWillBeSent") {
      requestUrls.set(p.requestId, p.request.url);
    } else if (msg.method === "Network.responseReceived" && p.response.status >= 400) {
      httpErrors.push(`[network] HTTP ${p.response.status} ${p.type}: ${shortUrl(p.response.url)}`);
    } else if (msg.method === "Network.loadingFailed" && !p.canceled && p.errorText !== "net::ERR_ABORTED") {
      // ERR_ABORTED = เบราว์เซอร์/Next.js ยกเลิกเอง (เช่น prefetch ถูกแทนที่) ไม่ใช่ความผิดพลาด
      httpErrors.push(`[network] โหลดไม่สำเร็จ ${p.errorText} ${p.type}: ${shortUrl(requestUrls.get(p.requestId) ?? "?")}`);
    }
  };
  cdp.listeners.push(onEvent);
  const evaluate = async (expression) => {
    const res = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (res.exceptionDetails) throw new Error(`probe error: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text}`);
    return res.result.value;
  };
  try {
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Log.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }, sessionId);
    if (mobile) await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);
    const loaded = cdp.waitFor("Page.loadEventFired", sessionId, 30_000);
    await cdp.send("Page.navigate", { url }, sessionId);
    await loaded;
    await sleep(1500); // ให้ React hydrate + กราฟ Recharts วัดขนาดเสร็จ
    const probe = await evaluate(OVERFLOW_PROBE);
    const content = await evaluate(CONTENT_PROBE);
    const touch = mobile ? await evaluate(touchProbe()) : null;
    const font = mobile ? await evaluate(fontProbe()) : null;

    const metrics = await cdp.send("Page.getLayoutMetrics", {}, sessionId);
    // ภาพยาวสุด 3000px — ส่วนบนของหน้าพอให้ดูด้วยตา (หน้า Screener ยาวหลายหมื่น px)
    const fullHeight = Math.min(Math.ceil(metrics.cssContentSize.height), 3000);
    const shot = await cdp.send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: fullHeight, scale: 1 } },
      sessionId,
    );
    fs.writeFileSync(path.join(outDir, shotName), Buffer.from(shot.data, "base64"));

    const scenario =
      page === "/stocks" ? await emptyStateScenario(cdp, sessionId, evaluate, width, `${slug}-empty-${width}.png`, expected) : null;

    // เมนู Sidebar บนมือถือซ่อนอยู่นอกจอ — เปิดเมนูแล้วตรวจ touch/font ของเมนูอีกรอบ (ทำครั้งเดียวต่อความกว้าง)
    const menuProblems = [];
    if (mobile && withMenu) {
      const opened = await evaluate(`(() => {
        const b = document.querySelector('button[aria-label="เปิดเมนู"]');
        if (b) b.click();
        return !!b;
      })()`);
      if (!opened) menuProblems.push('[touch] ไม่พบปุ่ม "เปิดเมนู" บนมือถือ');
      else {
        await sleep(500); // รอ transition ของ Sidebar
        const menuTouch = await evaluate(touchProbe("aside"));
        const menuFont = await evaluate(fontProbe("aside"));
        if (menuTouch.checked === 0) menuProblems.push("[touch] กดเปิดเมนูแล้วไม่เห็นลิงก์ใน Sidebar");
        menuProblems.push(
          ...menuTouch.small.map((t) => `[touch] (เมนู) ${t.element} ${t.width}×${t.height}px เล็กกว่า ${MIN_TOUCH}×${MIN_TOUCH}px`),
          ...menuFont.groups.map((f) => `[font] (เมนู) ${f.size}px < ${MIN_FONT}px: ${f.element}`),
        );
        const menuShot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
        fs.writeFileSync(path.join(outDir, `menu-${width}.png`), Buffer.from(menuShot.data, "base64"));
      }
    }
    await sleep(300); // รอ request ที่เกิดจากการกดปุ่มให้ตอบกลับก่อนสรุปผล network

    // ตารางที่ต้องเลื่อนแนวนอน = ล้มเหลว (ตามมาตรฐาน Phase 9), กล่องเลื่อนอื่นๆ (เช่น แถบแท็บ) = คำเตือน
    const tableScrollers = probe.scrollers.filter((s) => s.hasTable);
    const problems = [
      ...(probe.pageOverflow ? [`[layout] หน้ากว้าง ${probe.scrollWidth}px เกินจอ ${probe.viewport}px`] : []),
      ...probe.offenders.map((o) => `[layout] ล้นจอ: ${o.element} (right ${o.right}px)`),
      ...tableScrollers.map((s) => `[layout] ตารางต้องเลื่อนแนวนอน: ${s.element} (${s.scrollWidth}/${s.clientWidth}px)`),
      ...content.hits.map((h) => `[data] คำต้องห้าม "${h.word}" ใน ${h.where}: …${h.context}…`),
      ...(content.total > content.hits.length ? [`[data] คำต้องห้ามอีก ${content.total - content.hits.length} จุด`] : []),
      ...countProblems(page, content.textContent, expected),
      ...(scenario?.problems ?? []),
      ...(touch?.small ?? []).map((t) => `[touch] ${t.element} ${t.width}×${t.height}px เล็กกว่า ${MIN_TOUCH}×${MIN_TOUCH}px`),
      ...(touch && touch.total > touch.small.length ? [`[touch] เป้ากดเล็กเกินอีก ${touch.total - touch.small.length} จุด`] : []),
      ...(font?.groups ?? []).map((f) => `[font] ${f.size}px < ${MIN_FONT}px: ${f.element}${f.count > 1 ? ` (${f.count} จุด)` : ""}`),
      ...menuProblems,
      ...exceptions,
      ...consoleErrors,
      ...httpErrors,
    ];
    const warnings = [
      ...probe.scrollers.filter((s) => !s.hasTable).map((s) => `กล่องเลื่อนแนวนอน: ${s.element} (${s.scrollWidth}/${s.clientWidth}px)`),
      ...(probe.bodyText < 50 ? ["หน้าเว็บแทบไม่มีข้อความ (อาจ render ไม่สำเร็จ)"] : []),
    ];
    return {
      ok: problems.length === 0,
      problems,
      warnings,
      audits: { touchTargets: touch?.checked, smallText: font?.total },
      screenshot: path.relative(root, path.join(outDir, shotName)),
      ...(scenario?.screenshot && { emptyStateScreenshot: scenario.screenshot }),
    };
  } finally {
    cdp.listeners = cdp.listeners.filter((l) => l !== onEvent);
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

// ---------- เซิร์ฟเวอร์ Next.js ----------

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function startServer() {
  const port = await freePort();
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const proc = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  const baseUrl = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`next start ปิดตัวเอง: ${log.slice(-500)}`);
    try {
      await fetch(baseUrl);
      return { baseUrl, stop: () => proc.kill() };
    } catch {
      await sleep(500);
    }
  }
  proc.kill();
  throw new Error("next start ไม่พร้อมใน 30 วินาที");
}

async function runUi(opts) {
  const browserPath = findBrowser();
  if (!browserPath) return { skipped: true, reason: "ไม่พบ Edge/Chrome (ตั้ง SELF_TEST_BROWSER=path ได้)" };
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith(".png")) fs.rmSync(path.join(outDir, f));

  // ค่าอ้างอิงจำนวนหุ้น: นับจาก Supabase จริง (--expect-stocks ใช้แทนจำนวนหุ้นสามัญเมื่อต้องการกำหนดเอง)
  let expected = null;
  let dbError = null;
  try {
    expected = await dbStockCounts();
    console.log(`  ฐานข้อมูล: ${expected.total} หลักทรัพย์ / ${expected.eligible} หุ้นสามัญที่คัดกรองตามเกณฑ์ VI ได้`);
  } catch (e) {
    dbError = e.message;
    console.log(`  ✗ อ่านจำนวนหุ้นจาก Supabase ไม่ได้: ${e.message}`);
  }
  if (Number.isFinite(opts.expectStocks)) expected = { total: expected?.total ?? null, eligible: opts.expectStocks };

  const server = opts.baseUrl ? { baseUrl: opts.baseUrl, stop: () => {} } : await startServer();
  let browser;
  const results = [];
  if (dbError && !expected) {
    results.push({ page: "(supabase)", width: 0, ok: false, problems: [`[data] นับหุ้นจาก Supabase ไม่ได้: ${dbError}`], warnings: [] });
  }
  try {
    browser = await launchBrowser(browserPath);
    for (const page of opts.pages) {
      const url = server.baseUrl + page;
      // ตรวจสถานะ HTTP ก่อน — หน้า 404/500 ไม่ต้องเปิดในเบราว์เซอร์
      let status = 0;
      try {
        status = (await fetch(url)).status;
      } catch (e) {
        status = `เชื่อมต่อไม่ได้ (${e.message})`;
      }
      for (const width of opts.widths) {
        const slug = page === "/" ? "home" : page.replace(/^\//, "").replace(/[^\w-]+/g, "_");
        const label = `${page} @${width}px`;
        if (status !== 200) {
          results.push({ page, width, ok: false, problems: [`[network] HTTP ${status}`], warnings: [] });
          console.log(`  ✗ ${label}: HTTP ${status}`);
          continue;
        }
        try {
          const r = await checkPage(browser.cdp, url, page, width, slug, expected, page === opts.pages[0]);
          results.push({ page, width, ...r });
          console.log(`  ${r.ok ? "✓" : "✗"} ${label}${r.warnings.length ? ` (คำเตือน ${r.warnings.length})` : ""}`);
          for (const p of r.problems) console.log(`      ✗ ${p}`);
          for (const w of r.warnings) console.log(`      ! ${w}`);
        } catch (e) {
          results.push({ page, width, ok: false, problems: [`ตรวจไม่สำเร็จ: ${e.message}`], warnings: [] });
          console.log(`  ✗ ${label}: ตรวจไม่สำเร็จ: ${e.message}`);
        }
      }
    }
  } finally {
    await browser?.close();
    server.stop();
  }
  return { skipped: false, browser: path.basename(browserPath), expected, results };
}

/** รัน Self-Test ทั้งชุด — คืน { ok, summary, steps } (summary = ข้อความสั้นหนึ่งบรรทัดสำหรับ LINE/ป๊อปอัป) */
async function runSelfTest(argv = []) {
  const opts = parseArgs(argv);
  const steps = [];
  console.log("=== Self-Test ===");

  if (opts.lint) {
    process.stdout.write("• Lint ... ");
    const r = runNpm("lint", 5 * 60_000);
    const detail = r.ok ? lintSummary(r.output) : r.timedOut ? "เกินเวลา" : "มี error";
    console.log(`${r.ok ? "ผ่าน" : "ล้มเหลว"} (${detail}, ${r.seconds} วินาที)`);
    steps.push({ name: "lint", ok: r.ok, detail });
  }
  if (opts.build) {
    process.stdout.write("• Build ... ");
    const r = runNpm("build", 15 * 60_000);
    const pages = r.output.match(/Generating static pages[^\n]*\((\d+)\/(\d+)\)/);
    const detail = r.ok ? (pages ? `${pages[2]} หน้า` : "สำเร็จ") : r.timedOut ? "เกินเวลา" : "มี error";
    console.log(`${r.ok ? "ผ่าน" : "ล้มเหลว"} (${detail}, ${r.seconds} วินาที)`);
    steps.push({ name: "build", ok: r.ok, detail });
  }

  // UI ต้องมี build ที่ใช้ได้ — ถ้า build ล้มเหลวข้ามไป (ยกเว้นทดสอบกับเซิร์ฟเวอร์ที่รันอยู่แล้วผ่าน --base-url)
  const buildFailed = steps.some((s) => s.name === "build" && !s.ok);
  const hasBuild = fs.existsSync(path.join(root, ".next", "BUILD_ID"));
  if (opts.ui && (opts.baseUrl || (!buildFailed && hasBuild))) {
    console.log(`• UI Audit: layout/data/touch/font/network (${opts.widths.join("/")}px × ${opts.pages.length} หน้า)`);
    try {
      const ui = await runUi(opts);
      if (ui.skipped) {
        console.log(`  ข้าม: ${ui.reason}`);
        steps.push({ name: "ui", ok: true, skipped: true, detail: ui.reason });
      } else {
        const failed = ui.results.filter((r) => !r.ok);
        // นับปัญหาตามหมวด เช่น "touch 3, network 1" — บอกใน LINE/ป๊อปอัปได้ทันทีว่าพังด้านไหน
        const byCategory = {};
        for (const p of failed.flatMap((r) => r.problems)) {
          const cat = p.match(/^\[(\w+)\]/)?.[1] ?? "other";
          byCategory[cat] = (byCategory[cat] ?? 0) + 1;
        }
        const cats = Object.entries(byCategory).map(([c, n]) => `${c} ${n}`).join(", ");
        const detail = `${ui.results.length - failed.length}/${ui.results.length} ผ่าน${cats ? ` [${cats}]` : ""}`;
        steps.push({ name: "ui", ok: failed.length === 0, detail, browser: ui.browser, expected: ui.expected, results: ui.results });
      }
    } catch (e) {
      console.log(`  ล้มเหลว: ${e.message}`);
      steps.push({ name: "ui", ok: false, detail: e.message });
    }
  } else if (opts.ui) {
    const reason = buildFailed ? "build ล้มเหลว" : "ยังไม่มี build (.next)";
    console.log(`• UI Responsive ... ข้าม (${reason})`);
    steps.push({ name: "ui", ok: !buildFailed, skipped: true, detail: reason });
  }

  const ok = steps.every((s) => s.ok);
  const label = { lint: "Lint", build: "Build", ui: "UI" };
  const parts = steps.map((s) => `${label[s.name]} ${s.skipped ? "ข้าม" : s.ok ? "✓" : "✗"}${s.detail && !s.skipped ? ` ${s.detail}` : ""}`);
  const summary = `Self-test: ${ok ? "ผ่าน ✓" : "ไม่ผ่าน ✗"} (${parts.join(" · ") || "ไม่มีขั้นตอน"})`;
  // ปัญหา 3 ข้อแรก (ไม่ซ้ำกัน) — finish.js แนบท้ายข้อความ LINE ให้รู้สาเหตุโดยไม่ต้องเปิด report.json
  const topProblems = [
    ...new Set(
      steps.flatMap((s) => (s.results ?? []).flatMap((r) => r.problems.map((p) => `${r.page}${r.width ? ` @${r.width}` : ""} ${p}`))),
    ),
  ].slice(0, 3);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify({ time: new Date().toISOString(), ok, summary, options: opts, steps }, null, 2),
  );
  console.log(`\n${summary}\nรายงาน: ${path.relative(root, path.join(outDir, "report.json"))}`);
  return { ok, summary, topProblems, steps };
}

module.exports = { runSelfTest };

if (require.main === module) {
  runSelfTest(process.argv.slice(2)).then(
    (r) => process.exit(r.ok ? 0 : 1),
    (e) => {
      console.error("Self-test ล้มเหลว:", e);
      process.exit(1);
    },
  );
}
