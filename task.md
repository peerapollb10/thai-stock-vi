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
- [ ] สร้างหน้า Detail View สำหรับหุ้นรายตัว
- [ ] **กราฟแท่งแสดงประวัติเงินปันผล 5 ปีล่าสุด** พร้อมตัวเลขชัดเจนในแต่ละแท่ง
- [ ] **ฟังก์ชันคำนวณ Yield ย้อนหลังเทียบกับราคาปัจจุบัน** (นำเงินปันผลแต่ละปีในอดีต มาเทียบกับราคาปัจจุบัน เพื่อดู Yield จริงย้อนหลัง)
- [ ] **กราฟแท่งเปรียบเทียบ 5 ปี: รายได้ (Revenue), รายจ่าย (Expenses), และกำไรสุทธิ (Net Profit)** ให้อยู่ในมุมมองที่เปรียบเทียบกันง่าย
- [ ] ส่วนแสดงค่าสำคัญอื่นๆ (P/E, P/BV, Dividend Yield ปัจจุบัน, ROE, D/E Ratio, Market Cap) และช่อง Note ส่วนตัว

## Phase 4: Supabase Integration (Future Step)
- [ ] เชื่อมต่อ Supabase สำหรับเก็บข้อมูล Watchlist และบันทึกโน้ตส่วนตัวของผู้ใช้