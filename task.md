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
- [x] LINE bot ตอบรับคำสั่งพร้อมเวลาคร่าวๆ "ใช้เวลาประมาณ X นาที"
      - `line_bot.js`: เพิ่ม `estimate()` ประเมินจากคำสั่ง (ดึงข้อมูล/fetch 3–5, คำสั่งยาว ≥4 บรรทัดหรือ >300 ตัวอักษร 5–10, ทั่วไป 2–3 นาที)
      - แนบในข้อความตอบรับเดิมทั้งกรณีรันทันทีและเข้าคิว — ไม่เพิ่มจำนวนข้อความ (ใช้ reply ฟรี ไม่กินโควตา push)
- [x] LINE bot คำสั่ง `/restart` / `/reboot`: รีสตาร์ทบอทจากแชท (โหลดโค้ดและ `.env.local` ใหม่)
      - `line_bot.js`: ตอบ "🔄 กำลังรีสตาร์ทบอท..." ก่อน → หยุดงานที่รันอยู่/ล้างคิว → ปิดพอร์ต → เปิด `line_bot.js` ตัวใหม่แบบ detached แล้วออก
      - ต้อง detached เพราะบน Windows process ลูกปกติถูกฆ่าตามเมื่อตัวเดิมออก — log ของตัวใหม่จึงไปอยู่ที่ `data/bot.log`
      - ตัวใหม่ลอง listen ซ้ำเมื่อพอร์ตยังไม่ว่าง (15 ครั้ง ทุก 1 วินาที) และ push "✅ รีสตาร์ทบอทเรียบร้อย" เมื่อพร้อม; ระหว่างรีสตาร์ทไม่รับคำสั่งใหม่
- [x] LINE bot ข้อความสถานะรูปแบบใหม่ (ตอบรับคำสั่งใหม่ / เข้าคิว / `/status` ใช้รูปแบบเดียวกัน)
      - `line_bot.js`: เพิ่ม `taskLine()` + `statusText()` — "กำลังรันงาน..." / "[ชื่องานสั้น] [x min]" แล้ว "งานที่รอคิว..." /
        "1.[ชื่องาน] [x min]" … เฉพาะเมื่อมีคิว (คิวว่างแสดงแค่ 2 บรรทัด); ชื่องาน = บรรทัดแรกของคำสั่ง ตัดที่ 40 ตัวอักษร
      - แทนข้อความเดิม "⏳ กำลังรันงาน… ใช้เวลาประมาณ" / "📥 รับคำสั่งเข้าคิวแล้ว — ลำดับที่ N" / `/status` แบบเก่า
- [x] LINE bot ปุ่มอนุมัติงาน (Interactive Approval) — `scripts/line_bot.js`
      - คำสั่งเสี่ยง (`APPROVAL_RULES`: ดึงทั้งตลาด / `git push` / ลบข้อมูล-ตาราง, `reset --hard`) หรือ `/confirm <คำสั่ง>`
        ไม่รันทันที แต่ตอบเป็น Flex Message (`approvalFlex()` / `requestApproval()`) มีปุ่ม "✅ อนุมัติ (Approve)" / "❌ ปฏิเสธ (Reject)"
      - รับ postback event (`action=approve|reject&id=…`) ใน `handleApproval()`: อนุมัติ → รันทันทีหรือต่อคิว (`startOrQueue()`),
        ปฏิเสธ → ยกเลิก; ตอบสถานะกลับทาง reply ทันที ("✅ อนุมัติคำสั่งเรียบร้อย กำลังดำเนินการ..." / "❌ ปฏิเสธคำสั่งแล้ว")
      - ปุ่มใช้ได้ครั้งเดียว, หมดอายุตาม `BOT_APPROVAL_TTL_MIN` (ค่าเริ่มต้น 30 นาที, เพิ่มใน `.env.example`), ล้างเมื่อ `/restart`;
        รับ postback เฉพาะ `LINE_USER_ID`; "ลบปุ่ม/ลบโค้ด" หรือ "push message" ทั่วไปไม่ต้องขออนุมัติ
      - ทดสอบด้วย webhook จำลอง (ลงลายเซ็นจริง, mock LINE API + claude): 7 กรณีผ่าน (รันปกติ, Flex, ปฏิเสธ, กดซ้ำ, อนุมัติ, อนุมัติตอนไม่ว่าง → คิว, ผู้ใช้อื่น)
- [x] `scripts/count-rows.js`: นับจำนวนแถวในตาราง Supabase แบบอ่านอย่างเดียว (`node scripts/count-rows.js [ตาราง…]`)

## Phase 8: Screener Improvements
- [x] Stock Screener แสดงเฉพาะหุ้นสามัญที่วิเคราะห์ตามเกณฑ์ VI ได้ — ตัดกองทุนรวมอสังหาฯ / REIT / กองทุนโครงสร้างพื้นฐานออกถาวร
      (แทนสวิตช์ "ซ่อนกองทุน" เดิม ซึ่งค่าเริ่มต้นยังแสดงกองทุนอยู่)
      - `isViEligible()` ใน `src/lib/screening.ts`: ไม่ใช่กองทุน (`isFund()`: หมวด "กองทุนรวมอสังหาฯ และกองทรัสต์…", ชื่อมี Fund / REIT /
        Investment Trust / Infrastructure, ชื่อย่อลงท้าย REIT หรือ IF), ไม่ใช่ warrant / หุ้นบุริมสิทธิ / NVDR / DR (`-W`, `-P`, `-F`, `-R`
        หรือชื่อมี Depositary Receipt / Warrant / Preferred), มีงบการเงินและราคา
      - `src/app/stocks/page.tsx`: กรองฝั่ง server ก่อนส่งให้ `StockScreener` — ข้อมูลกองทุนไม่ถูกส่งไปหน้าเว็บ, หมวดกองทุนหายจาก dropdown
      - `StockScreener.tsx`: ตัวนับเป็น "พบ X จาก 633 หุ้นสามัญ" + ข้อความเล็ก "ไม่รวมกองทุน / REIT / … 65 ตัว"
      - ตรวจกับข้อมูลจริง 698 ตัว: ตัด 65 ตัว (กองทุน/REIT/กองทุนโครงสร้างพื้นฐาน 64 + TIPAK ที่ไม่มีงบ) ไม่มีบริษัทปกติถูกตัดผิด;
        lint + build ผ่าน, payload หน้า /stocks ไม่มีหมวด/ชื่อย่อกองทุน (`excludedCount: 65`)

## Phase 9: Mobile Responsive
- [x] ตารางหุ้น (Screener + Watchlist) ไม่ต้องเลื่อนแนวนอนบนมือถือ — `src/components/stocks/StockTable.tsx`
      - วัดความกว้างด้วย container query (`@container`) แทนขนาดจอ เพราะ Sidebar กินพื้นที่บน PC
      - < 672px: การ์ด (ชื่อย่อ/ชื่อ/หมวด + ราคา, ตัวชี้วัด 6 ช่อง 3×2, แตะทั้งการ์ดเพื่อเปิดหน้ารายละเอียด, ดาว Watchlist)
        + ตัวเลือก "เรียงตาม" และปุ่มสลับทิศ แทนการกดหัวตาราง; การ์ด 2 คอลัมน์เมื่อกว้าง ≥ 576px
      - 672–895px: ตารางซ่อนคอลัมน์รอง P/BV, D/E (แสดงเสมอถ้ากำลังกรอง/เรียงด้วยคอลัมน์นั้น); ≥ 896px: ครบทุกคอลัมน์
- [x] ตารางงบย้อนหลังหน้ารายละเอียดหุ้น — `src/components/stock-detail/DataTable.tsx`: พื้นที่แคบแสดงการ์ดรายปี (คู่ ชื่อ–ค่า)
      ตารางเต็มเมื่อกล่องกว้าง ≥ 576px (≤ 6 คอลัมน์) / ≥ 768px (งบ 8 คอลัมน์); `footer` เปลี่ยนเป็น array ช่องต่อคอลัมน์
      (`src/app/stocks/[symbol]/page.tsx` ปรับตาม — แถว "เฉลี่ย N ปี" เป็นการ์ดสีเขียวบนมือถือ)
- [x] หน้าอื่นๆ: `StatCard` ตัวเลข text-xl บนมือถือไม่ล้นการ์ด, `RankingCard` ชื่อบริษัทตัด … ถูกต้อง,
      Dashboard ตารางมูลค่าตามกลุ่มซ่อนคอลัมน์ "จำนวน" บนมือถือ, หัวหน้ารายละเอียดหุ้น wrap + ราคาชิดซ้ายบนมือถือ,
      `globals.css` ช่องกรอกบนจอ < 640px เป็น 16px กัน iOS Safari ซูมเองเมื่อแตะ
      - lint + build ผ่าน (705 หน้า), CSS มีกฎ container query ครบ, HTML หน้า /stocks/PTT มีทั้งการ์ดและตาราง
- [x] ปรับละเอียด Stock Screener บนมือถือ — `src/components/stocks/StockTable.tsx`
      - การ์ด: เลิกตัด … ค่าตัวชี้วัด (Market Cap "1.23 ล้านล้าน" ถูกตัดบนจอ 320–375px) → `CardValue` แยกหน่วยไทยเป็นตัวเล็ก
        และขึ้นบรรทัดใหม่ได้ถ้าช่องแคบ
      - ตาราง 672–895px: ช่องไฟ `px-2` (≥ 896px กลับเป็น `px-3`), ชื่อบริษัท `max-w-32` — กรองด้วย P/BV + D/E จนครบ 7 คอลัมน์
        ก็ไม่ล้นจนต้องเลื่อนแนวนอน
      - lint (0 error) + build ผ่าน 705 หน้า, CSS มีคลาสใหม่ `@4xl:px-3`, `max-w-32`, `text-[11px]` ครบ

## Phase 10: Autonomous Self-Testing (ตรวจงานตัวเองก่อนส่ง)
- [x] `scripts/self_test.js` + `npm run self-test`: ตรวจอัตโนมัติ 3 ขั้น — Lint → Build → UI Responsive
      - ไม่ใช้ Playwright/Puppeteer (npm ในเครื่องติด `EALLOWSCRIPTS` และไม่ต้องโหลดเบราว์เซอร์ ~150 MB): คุม Edge/Chrome ที่ติดตั้งอยู่
        แบบ headless ผ่าน Chrome DevTools Protocol ด้วย WebSocket ในตัวของ Node 24 — ไม่มี dependency เพิ่ม (`SELF_TEST_BROWSER` กำหนด path เองได้)
      - UI: เปิด `next start` บนพอร์ตว่าง → หน้า `/`, `/stocks`, `/stocks/PTT`, `/watchlist` × กว้าง 375 / 768 / 1280px (จำลองมือถือ + touch)
        ไม่ผ่านเมื่อ: HTTP ≠ 200, หน้ากว้างเกินจอ (scrollWidth), Element ล้นขอบจอ (รายงานตัวนอกสุด ไม่นับ fixed/ถูก overflow ตัด),
        ตารางต้องเลื่อนแนวนอน, JS exception — คำเตือน: กล่องเลื่อนแนวนอนอื่น, console.error, หน้าแทบไม่มีข้อความ
      - ผลตรวจ `data/self-test/report.json` + ภาพหน้าจอ `<หน้า>-<กว้าง>.png` (สูงสุด 3000px) ให้ AI/ผู้ใช้เปิดดูด้วยตา (`.gitignore` แล้ว)
      - ตัวเลือก: `--skip-lint`, `--skip-build` (ใช้ `.next` เดิม), `--no-ui`, `--pages /,/stocks`, `--widths 320,375`, `--base-url http://localhost:3000`
- [x] เชื่อม Finish Protocol — `scripts/finish.js`: self-test → send-line → ป๊อปอัป (ทุกขั้นรันเสมอ)
      - ผลย่อ "Self-test: ผ่าน ✓ (Lint ✓ … · Build ✓ 705 หน้า · UI ✓ 12/12 ผ่าน)" ต่อท้ายข้อความ LINE และเป็นบรรทัดในป๊อปอัป
      - Self-test ไม่ผ่าน → ยังแจ้ง LINE/ป๊อปอัปพร้อม ✗ แล้ว exit 1; ส่ง flag ต่อให้ self-test ได้ (`npm run finish -- "ข้อความ" --skip-build`),
        `--skip-test` ข้ามเมื่องานไม่แตะโค้ด
- [x] รอบแรกของ self-test พบบั๊กจริง: หน้า `/` (RankingCard 3 การ์ด) และ `/stocks` (การ์ดหุ้น) กว้าง 624 / 695px บนจอ 375px (และล้นที่ 768px)
      - สาเหตุ: `grid` ไม่มี `grid-cols-*` บนจอแคบ → คอลัมน์ `auto` กว้างตาม min-content ซึ่งรวมชื่อบริษัทเต็ม (`truncate` ไม่ตัด)
      - แก้: เพิ่ม `grid-cols-1` (= `minmax(0,1fr)`) ใน `src/app/page.tsx` (แถว RankingCard) และ `StockTable.tsx` (รายการการ์ด)
      - ตรวจซ้ำ: lint 0 error, build 705 หน้า, UI 12/12 ผ่าน — ภาพ `stocks-375.png` การ์ดพอดีจอ ชื่อบริษัทตัด … ถูกต้อง
- [x] อัปเกรด `scripts/self_test.js` เป็น UI Audit มาตรฐานโปรดักชัน 5 หมวด (ปัญหาขึ้นต้น `[หมวด]`, สรุปนับตามหมวด เช่น `[touch 3, network 1]`)
      - `[data]` คำต้องห้ามบน UI (Mock / Dummy / ข้อมูลจำลอง / lorem ipsum ไม่สนตัวพิมพ์, undefined / null / NaN ตรงตัว) ทั้งข้อความที่มองเห็น,
        title และ placeholder / aria-label / alt; จำนวนหุ้นตรงกับ Supabase — `dbStockCounts()` นับตาราง stocks (698) และหุ้นสามัญ
        ด้วย `isViEligible()` ตัวเดียวกับเว็บ (import `screening.ts` ผ่านสำเนา .mts — 633) เทียบกับ Sidebar, Dashboard, ตัวนับ Screener
        และจำนวนที่ตัดออก (`--expect-stocks N` กำหนดเองได้); Empty State ของ /stocks: พิมพ์คำค้นที่ไม่มีจริง → ต้องมีข้อความ + ปุ่ม
        "ล้างตัวกรองทั้งหมด" ที่ไม่ถูกบัง, ตัวนับ "พบ 0" → กดปุ่มแล้วช่องค้นหาว่างและกลับมาครบ 633 (ภาพ `stocks-empty-<กว้าง>.png`)
      - `[touch]` จอ < 768px: ปุ่ม/ลิงก์/ช่องกรอก ≥ 44×44px (ช่องกรอกใน label วัดที่ label, stretched link วัดทั้งการ์ด,
        ลิงก์ในประโยคได้รับยกเว้น) + เปิดเมนู Sidebar แล้วตรวจซ้ำ (ภาพ `menu-<กว้าง>.png`); `[font]` ข้อความที่มองเห็น ≥ 12px รวม SVG กราฟ
      - `[network]` เปิด Network/Log domain: HTTP ≥ 400, โหลดไม่สำเร็จ (ไม่นับ ERR_ABORTED), console.error, JS exception = ไม่ผ่าน (เดิมเป็นคำเตือน)
      - `finish.js`: ถ้า Self-test ไม่ผ่าน แนบปัญหา 3 ข้อแรกท้ายข้อความ LINE; CLAUDE.md อธิบายหมวดการตรวจใน Finish Protocol
      - ทดสอบย้อนกลับด้วยหน้าเว็บจำลองที่ผิดทุกหมวด (`--base-url`): จับได้ครบ data 15 / touch 7 / font 5 / network 4 จุด แล้วลบไฟล์ทดสอบ
- [x] แก้ UI ตามที่ Audit ใหม่พบ (รอบแรก 6/12 ผ่าน: touch 42, data 9 จากบั๊กในสคริปต์เอง, font 1) — มือถือใช้ `max-md:` ไม่กระทบ Desktop
      - ปุ่ม 44px: เมนู/ปิดเมนู (`Navbar`, `Sidebar` + ลิงก์เมนู), ดาว Watchlist `size-11 md:size-8` (การ์ดใช้ margin ติดลบ ความสูงเท่าเดิม),
        ปุ่มเกณฑ์ VI / ล้างเกณฑ์, แถวเกณฑ์ทั้งแถวเป็น label (`ScreeningFilters` `min-h-12`), ปุ่มสลับการเรียง, ปุ่มล้างตัวกรอง (Empty State),
        ลิงก์ Dashboard (`page.tsx`, `RankingCard`), ลิงก์กลับ/ปุ่ม Watchlist/ช่วงเวลากราฟ (หน้ารายละเอียด, `PriceChart`), ลิงก์ใน `WatchlistView`
      - `globals.css`: ช่องกรอก/select บนจอ < 768px สูงอย่างน้อย 44px; `StockTable` หน่วย "ล้านล้าน" ในการ์ด 11px → 12px (`text-xs`)
      - ผล: lint 0 error, build 705 หน้า, UI 12/12 ผ่านทุกหมวด
- [x] CLAUDE.md เป็น Standalone Master Template (ไม่อ้าง `../CLAUDE-RULES.md` แล้ว) — ลบข้อความคำสั่งที่ค้างหัว/ท้ายไฟล์, แก้คำผิด "ใช้อัปเดต"

## Phase 11: Telegram Bot (แทน LINE Bot)
- [x] `scripts/telegram_bot.js` + `npm run bot` (LINE เดิมย้ายไป `npm run bot:line`) — ฟีเจอร์ครบเท่า `line_bot.js`
      - ใช้ Long Polling (`getUpdates`) ไม่ต้องเปิดพอร์ต/ngrok/Webhook; ค่าตั้ง `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` ใน `.env.local`
      - รับ/ตอบเฉพาะ `TELEGRAM_CHAT_ID` (แชทอื่นเพิกเฉยเงียบ), ข้ามข้อความที่ค้างเกิน 10 นาทีตอนบอทปิด, ส่งเป็นข้อความธรรมดา (ไม่ใช้ parse_mode)
      - Task Queue + `estimate()`: "กำลังรันงาน..." / "[ชื่องาน] [x min]" แล้ว "งานที่รอคิว..." + สูงสุด 3 รายการ เฉพาะเมื่อมีคิว
      - คำสั่ง `/status`, `/restart`, `/reboot`, `/help` (+ `/cancel`, `/clear`, `/confirm`) และเมนูคำสั่งผ่าน `setMyCommands`
      - ปุ่มอนุมัติด้วย Inline Keyboard "✅ อนุมัติ (Approve)" / "❌ ปฏิเสธ (Reject)" สำหรับคำสั่งเสี่ยงหรือ `/confirm` — ใช้ได้ครั้งเดียว,
        หมดอายุ `BOT_APPROVAL_TTL_MIN`; กดแล้วแก้ข้อความเดิมให้ปุ่มหาย + บอกผล
      - `/restart`: ยืนยัน offset กับ Telegram ก่อนเปิดตัวใหม่ (กันตัวใหม่ได้ `/restart` ซ้ำจนวนลูป), log ตัวใหม่ที่ `data/bot.log`
- [x] Finish Protocol ส่งเข้า Telegram — `scripts/send-telegram.js` (`npm run send-telegram`) + `scripts/finish.js`
      - `finish.js`: Self-Test → Telegram (ข้ามถ้ายังไม่ตั้งค่า) → LINE เฉพาะเมื่อ `SEND_LINE_NOTIFY=true` → ป๊อปอัป
      - บันทึกผล Self-Test ที่ `data/self-test/finish.json`; งานจาก bot (`BOT_JOB=1`) ไม่ส่งซ้ำ แต่ bot แนบ "🧪 Self-test …" ท้ายข้อความ "📝 สำหรับคุณเบียร์"
      - `send-line.js` ข้ามเมื่อ `BOT_JOB=1` ด้วย
- [x] `.env.example`: ส่วน Telegram (วิธีหา Token / Chat ID), ย้าย LINE เป็นระบบเดิม, ลบการอ้างอิง CLAUDE-RULES.md
- [x] ทดสอบกับ mock Telegram API + mock claude: 20/20 ผ่าน (แชทอื่น/ข้อความเก่าถูกเพิกเฉย, สถานะ 2 บรรทัด/มีคิว, ปุ่มอนุมัติ/ปฏิเสธ/กดซ้ำ,
      คิวรันตามลำดับ, ผล 📋 → 📝 + Self-Test, `/reboot` ตัวใหม่ตอบได้และไม่วนลูป, `send-telegram.js` ส่ง/ข้าม/ล้มเหลว) — ยังไม่ได้ทดสอบกับ Telegram จริง
- [x] ตอบรับคำสั่งใหม่ด้วยหน้าสถานะรวม — `scripts/telegram_bot.js`
      - `statusText()` "📊 สถานะงาน": งานที่กำลังรัน (+ เวลาที่ผ่านไป) และคิว 1, 2, 3... ทั้งหมด (สูงสุด 20) ชี้ "← ใหม่" ที่งานที่เพิ่งเข้าคิว
      - `ackText()` ใช้ทั้งคำสั่งใหม่และกดอนุมัติ ("เริ่มรันทันที" / "เข้าคิวลำดับที่ N"); `/status` ใช้หน้าเดียวกัน (รวมตอนว่าง)
- [x] จบงานส่ง Telegram ข้อความเดียว "📋 สำหรับ Gemini" — ตัด "📝 สำหรับคุณเบียร์" และผล Self-Test ออก
      - `telegram_bot.js`: `formatReport()` หัวข้อความ = สถานะ · เวลา · คำสั่ง แล้วรายงานจาก Claude (ตัดส่วนหลัง `===SUMMARY===` เก่าทิ้ง), ล้มเหลวแนบ stderr 800 ตัวท้าย
      - คำแนะนำที่แนบให้ Claude เปลี่ยนเป็นขอรายงานทางเทคนิคกระชับ (สิ่งที่ทำ / ไฟล์ที่แก้ / ผลการตรวจ / ประเด็นค้าง) แทนการขอสรุป Bullet
      - `finish.js` / `send-telegram.js` (รันนอก bot): ส่งข้อความเดียวรูปแบบเดียวกัน ไม่แนบผล Self-Test (ยังอยู่ในป๊อปอัป, LINE, `finish.json`)
      - ทดสอบ mock Telegram + mock claude: 7/7 ผ่าน (เริ่มทันที, คิว 1/2 + ← ใหม่, /status, 3 งาน = 3 ข้อความ, ไม่มีคุณเบียร์/Self-Test)
- [x] ลบสคริปต์ทดสอบชั่วคราว `scripts/_test_bot_queue.js`, `scripts/_test_restart.js` แล้ว Commit + Push งาน Phase 8–11 ขึ้น GitHub