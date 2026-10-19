# Project Task: Thai Stock VI Dashboard

## Phase 1: Project Setup & Comprehensive 5-Year Mock Data
- [x] Initialize Next.js project with App Router and Tailwind CSS
- [x] Install Lucide React (สำหรับไอคอน) และ Recharts (สำหรับแสดงกราฟแท่ง 5 ปี)
- [x] สร้าง Layout หลัก (Sidebar / Navbar และ Content Area)
- [x] สร้าง Mock Data หุ้นไทยย้อนหลัง 5 ปีเต็ม ที่ครอบคลุม:
      - ข้อมูลราคาปัจจุบัน และราคาอ้างอิงย้อนหลัง
      - ประวัติเงินปันผลต่อหุ้นย้อนหลัง 5 ปี
      - ประวัติ **รายได้ (Revenue), รายจ่าย/ต้นทุน (Expenses), และกำไรสุทธิ (Net Profit)** ย้อนหลัง 5 ปี
      - อัตราส่วนทางการเงินย้อนหลัง 5 ปี (ROE, Net Profit Margin, D/E)

## Phase 2: Core Dashboard & Stock Table (UI & Filtering)
- [x] สร้างหน้า Dashboard หลัก แสดงภาพรวมตลาดและสรุปสถิติต่างๆ
- [x] สร้างตารางแสดงรายชื่อหุ้น (Stock Table) พร้อมฟังก์ชัน Search และ Sorting ตามค่า P/E, P/BV, Yield
- [x] สร้าง VI Screening Filters (กรองตามเกณฑ์ VI เช่น P/E < 15, Yield > 4%, ROE > 10%)

## Phase 3: Stock Detail View & 5-Year VI Analytics (Core Features)
- [x] สร้างหน้า Detail View สำหรับหุ้นรายตัว
- [x] **กราฟแท่งแสดงประวัติเงินปันผล 5 ปีล่าสุด** พร้อมตัวเลขชัดเจนในแต่ละแท่ง
- [x] **ฟังก์ชันคำนวณ Yield ย้อนหลังเทียบกับราคาปัจจุบัน** (นำเงินปันผลแต่ละปีในอดีต มาเทียบกับราคาปัจจุบัน เพื่อดู Yield จริงย้อนหลัง)
- [x] **กราฟแท่งเปรียบเทียบ 5 ปี: รายได้ (Revenue), รายจ่าย (Expenses), และกำไรสุทธิ (Net Profit)** ให้อยู่ในมุมมองที่เปรียบเทียบกันง่าย
- [x] ส่วนแสดงค่าสำคัญอื่นๆ (P/E, P/BV, Dividend Yield ปัจจุบัน, ROE, D/E Ratio, Market Cap) และช่อง Note ส่วนตัว

## Phase 4: Supabase Integration (Future Step)
- [x] เชื่อมต่อ Supabase สำหรับเก็บข้อมูล Watchlist และบันทึกโน้ตส่วนตัวของผู้ใช้

## Phase 5: Real Market Data (Python + yfinance → Supabase)
- [x] สร้างสคริปต์ `scripts/fetch_stocks.py` ดึงราคาย้อนหลัง, งบการเงินรายปี และข้อมูลพื้นฐานหุ้นไทย (.BK) ผ่าน yfinance
- [x] แปลงข้อมูลให้ตรงโครงสร้าง `Stock` / `YearlyFinancials` (ล้านบาท, ROE, NPM, D/E, ปันผลตามปีผลประกอบการ)
- [x] สร้าง SQL `supabase/market_data.sql`: ตาราง `stocks`, `stock_prices`, `stock_financials` + RLS (อ่านได้ทุกคน, เขียนด้วย Secret key)
- [x] เพิ่ม `requirements.txt` (yfinance, pandas, supabase, python-dotenv) และ `npm run fetch-stocks`
- [x] รัน `supabase/market_data.sql` ใน SQL Editor และใส่ `SUPABASE_SECRET_KEY` ใน `.env.local` แล้วรัน `npm run fetch-stocks`
- [x] เปลี่ยนหน้าเว็บจาก `mockStocks.ts` ไปอ่านข้อมูลจริงจาก Supabase (`src/lib/market-data.ts`, cache 1 ชม.)
- [x] เพิ่มกราฟราคาหุ้นย้อนหลัง (1 ปี / 3 ปี / ทั้งหมด) ในหน้าหุ้นรายตัว จากตาราง `stock_prices`
- [x] Loading state (`src/app/loading.tsx`) และ Error state (`src/app/error.tsx`) พร้อมปุ่มลองอีกครั้ง
- [x] ลบป้าย "ข้อมูลจำลอง" ที่ Sidebar → แสดงจำนวนหุ้นจริงในตาราง stocks + วันที่อัปเดต (`DataSourceNote`)
- [x] อ่านทุกตาราง (stocks / stock_financials / stock_prices) แบบแบ่งหน้า ไม่ถูกตัดที่ 1,000 แถวเมื่อเพิ่มหุ้น
- [x] ตรวจซ้ำ: ไม่มีคำว่า "จำลอง" ใน src/ และใน build ใหม่ — ลบ cache .next เก่า (dev cache ยังมีข้อความเดิม) แล้ว build ใหม่

## Phase 6: Tooling & Full-Market Data
- [x] `npm run finish`: Finish Protocol คำสั่งเดียว (Clipboard + LINE + ป๊อปอัป Windows แสดงผลการส่ง LINE)
- [x] กฎ Autonomous Mode ใน CLAUDE.md + allow/deny ใน `.claude/settings.json`
- [x] นโยบายดึงข้อมูลหุ้น SET ใน CLAUDE.md + `fetch_stocks.py` รองรับ `--symbols-file`, `--market`, `--limit`, `--delay`, `--skip-fresh`, retry เมื่อถูกจำกัดคำขอ
- [x] ทดสอบระบบ Retry (จำลอง rate limit), Delay และ `--limit` + `--skip-fresh` แบบแบ่งชุด กับ Yahoo + Supabase จริง (10/10 ตัว ไม่มี error)
- [x] แก้ลำดับ `--limit` ให้ตัดหลัง `--skip-fresh` (รันซ้ำได้ชุดถัดไป ไม่วนชุดเดิม)
- [x] `fetch_stocks.py` อ่านไฟล์จากเว็บ SET ได้โดยตรง (ตาราง HTML, cp874, หัวคอลัมน์ไทย) — 930 ตัว (SET 700 / mai 230)
- [x] ล็อตแรก `--market SET --limit 20 --skip-fresh 20 --delay 1.5`: สำเร็จ 20/20 → Supabase มี 30 หุ้น
- [x] ใช้ "หมวดธุรกิจ" ของ SET เป็นชื่อกลุ่มทุกหุ้น (รวม 10 ตัวหลัก) — ไม่มีชื่อไทย/อังกฤษปนกัน
- [x] ดึงส่วนที่เหลือของ SET (~670 ตัว) เป็นชุดๆ ด้วย `--limit` + `--skip-fresh` เมื่อผู้ใช้สั่ง — ครบแล้ว Supabase มี 698 หุ้น
- [x] `scripts/check_fetch.py`: ตรวจข้อมูลใน Supabase แบบอ่านอย่างเดียว (`--hours 24`) — 698 ตัวอัปเดตครบใน 24 ชม., ปกติ 658 / ต้องสังเกต 40 (ส่วนใหญ่กองทุน/REIT ที่ Yahoo ไม่มีงบการเงิน)
- [x] หุ้นที่มี `&` (F&D, L&E, S&J — มีแค่ 3 ตัวในรายชื่อ SET) ได้ราคาแต่ไม่มีงบ: ตรวจแล้วไม่ใช่ปัญหาการแปลงชื่อ (`L&E.BK` ถูกต้อง)
      แต่ Yahoo ไม่มีงบรายปีของหุ้นเหล่านี้ทั้ง endpoint timeseries/quoteSummary แม้เข้ารหัส `%26` → `fetch_stocks.py` เพิ่ม `ttm_financials()`
      สร้างงบ 1 แถว (TTM) จาก `info` เมื่อไม่มีงบรายปี (D/E, หนี้สินรวม = ว่าง เพราะนิยามของ Yahoo ต่างกัน) — เขียน Supabase แล้ว 3/3 ตัว
- [x] ประเภท `Sector` เป็น union ชื่อหมวดธุรกิจภาษาไทยของ SET (`src/types/stock.ts`) และปรับตัวเลือกกลุ่มใน `StockScreener.tsx`

## Phase 7: LINE Bot Task Queue & Script Management
- [x] `scripts/line_bot.js` + `npm run bot`: LINE webhook bot สั่ง Claude Code ได้ 2 ทาง (รับคำสั่ง → รัน → ส่งผลกลับ)
      - ตรวจลายเซ็น LINE (`x-line-signature`) และรับคำสั่งจากเจ้าของ (owner) เท่านั้น
      - รัน `claude -p --permission-mode acceptEdits` ตามสิทธิ์ใน `.claude/settings.json`
      - Task Queue: รันทีละงาน คำสั่งที่เข้ามาระหว่างรันต่อคิว (`taskQueue`) แล้วเริ่มอัตโนมัติเมื่องานก่อนหน้าเสร็จ
      - คำสั่ง `/status` (งานที่รัน + คิว), `/cancel` (หยุดงานปัจจุบันแล้วรันงานถัดไป), `/clear` (ล้างคิว), `/help`
      - หยุดงานอัตโนมัติเมื่อเกิน `BOT_TIMEOUT_MIN` นาที (ค่าเริ่มต้น 15) และใช้ `taskkill /T /F` ฆ่าทั้งต้นไม้ process บน Windows
      - ส่งผลเป็น 2 ข้อความ: รายละเอียดทางเทคนิค + สรุปสั้น (แยกด้วยตัวคั่น `===SUMMARY===`)
      - Health check ผ่าน HTTP: ตอบ `ok` หรือ `busy (queue: N)`
- [x] `.env.example` เพิ่มค่าตั้งของ bot; `.gitignore` ไม่ commit `data/*.log`
- [x] `.claude/settings.json`: แก้กฎ allow `curl … http://localhost:*` ที่ไม่เคย match
- [x] ระบบสคริปต์ npm ครบชุด: `finish` (รวม `copy-summary` + `send-line` + `notify`), `bot`, `fetch-stocks`
- [x] `scripts/notify.js`: เลิกใช้ `-ExecutionPolicy Bypass` (ทำให้ PowerShell ค้าง) + ใส่ timeout และตรวจค่าตั้งก่อนส่ง
- [x] เลิกใช้ `summary.txt` — `task.md` เป็นบันทึกสถานะงานหลักไฟล์เดียว
      - ลบ `summary.txt` และ `scripts/copy-summary.js` (+ `npm run copy-summary`) ที่มีไว้คัดลอกไฟล์นั้นเท่านั้น
      - `finish.js` / `send-line.js` / `notify.js` รับข้อความสั้นจาก argument แทนการอ่าน `summary.txt` (`npm run finish -- "ข้อความ"`)
      - CLAUDE.md: Finish Protocol = อัปเดต `task.md` → `npm run finish`
- [x] LINE bot ส่งผลลัพธ์ 2 บับเบิลเท่านั้น: "📋 สำหรับ Gemini" (เนื้อหาทางเทคนิค) + "📝 สำหรับคุณเบียร์" (สรุป Bullet)
      - `line_bot.js`: ตัดบรรทัดสถานะ/เวลา/คิวออก, ตอบรับคำสั่งสั้นๆ 1 ข้อความ, ตั้ง `LINE_BOT_JOB=1` ให้ process ลูก
      - `send-line.js` / `finish.js`: ข้ามการส่ง LINE เมื่อ `LINE_BOT_JOB=1` เพื่อไม่ให้มีข้อความที่ 3 ซ้ำ
- [x] `scripts/count-rows.js`: นับจำนวนแถวในตาราง Supabase แบบอ่านอย่างเดียว (`node scripts/count-rows.js [ตาราง…]`)