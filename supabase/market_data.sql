-- Thai Stock VI — ตารางข้อมูลตลาดจริง (ราคาหุ้น, งบการเงินรายปี, ข้อมูลพื้นฐาน) จาก yfinance
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์แล้วกด Run (รันหลัง schema.sql, รันซ้ำได้)
-- เขียนข้อมูลด้วย scripts/fetch_stocks.py ผ่าน Secret key เท่านั้น / ทุกคนอ่านได้ (ข้อมูลสาธารณะ)
-- ชื่อคอลัมน์ตรงกับ type Stock / YearlyFinancials ใน src/types/stock.ts (แปลง camelCase → snake_case)

-- ---------------------------------------------------------------------------
-- ข้อมูลพื้นฐานและค่าล่าสุดของหุ้น (1 แถว = 1 หุ้น)
-- ---------------------------------------------------------------------------
create table if not exists public.stocks (
  symbol             text primary key check (symbol ~ '^[A-Z0-9.&-]{1,12}$'),
  yahoo_symbol       text not null,
  name               text not null,
  sector             text,
  industry           text,
  currency           text not null default 'THB',
  shares_outstanding numeric,          -- ล้านหุ้น
  price              numeric,          -- บาท
  pe                 numeric,          -- เท่า
  pbv                numeric,          -- เท่า
  dividend_yield     numeric,          -- %
  roe                numeric,          -- % (ปีล่าสุด)
  de                 numeric,          -- เท่า (หนี้สินรวม / ส่วนผู้ถือหุ้น, ปีล่าสุด)
  market_cap         numeric,          -- ล้านบาท
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ราคาย้อนหลังรายวัน (1 แถว = 1 หุ้น 1 วันทำการ)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_prices (
  symbol    text not null references public.stocks (symbol) on delete cascade,
  date      date not null,
  open      numeric,
  high      numeric,
  low       numeric,
  close     numeric not null,
  adj_close numeric,
  volume    bigint,
  primary key (symbol, date)
);

-- ---------------------------------------------------------------------------
-- งบการเงินรายปี (1 แถว = 1 หุ้น 1 ปีบัญชี) — หน่วยเงิน: ล้านบาท
-- ---------------------------------------------------------------------------
create table if not exists public.stock_financials (
  symbol             text not null references public.stocks (symbol) on delete cascade,
  year               integer not null check (year between 1990 and 2100),
  close_price        numeric,          -- ราคาปิดวันทำการสุดท้ายของปี (บาท)
  dividend_per_share numeric,          -- ปันผล/หุ้น ที่จ่ายจากผลประกอบการปีนั้น (บาท)
  revenue            numeric,
  expenses           numeric,          -- = revenue − net_profit
  net_profit         numeric,
  eps                numeric,          -- บาท
  roe                numeric,          -- %
  net_profit_margin  numeric,          -- %
  de                 numeric,          -- เท่า
  total_equity       numeric,
  total_liabilities  numeric,
  updated_at         timestamptz not null default now(),
  primary key (symbol, year)
);

-- อัปเดต updated_at อัตโนมัติ (ใช้ฟังก์ชัน public.set_updated_at() จาก schema.sql)
drop trigger if exists stocks_set_updated_at on public.stocks;
create trigger stocks_set_updated_at
  before update on public.stocks
  for each row execute function public.set_updated_at();

drop trigger if exists stock_financials_set_updated_at on public.stock_financials;
create trigger stock_financials_set_updated_at
  before update on public.stock_financials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: อ่านได้ทุกคน / ไม่มี policy สำหรับเขียน
-- → เขียนได้เฉพาะ Secret key (service_role) ซึ่งข้าม RLS — ใช้ใน fetch_stocks.py เท่านั้น
-- ---------------------------------------------------------------------------
alter table public.stocks enable row level security;
alter table public.stock_prices enable row level security;
alter table public.stock_financials enable row level security;

drop policy if exists "stocks: public read" on public.stocks;
create policy "stocks: public read" on public.stocks for select to anon, authenticated using (true);

drop policy if exists "stock_prices: public read" on public.stock_prices;
create policy "stock_prices: public read" on public.stock_prices for select to anon, authenticated using (true);

drop policy if exists "stock_financials: public read" on public.stock_financials;
create policy "stock_financials: public read" on public.stock_financials for select to anon, authenticated using (true);
