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