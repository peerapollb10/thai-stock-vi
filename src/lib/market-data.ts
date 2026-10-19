import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { PricePoint, Stock, YearlyFinancials } from "@/types/stock";

/**
 * อ่านข้อมูลตลาดจริงจาก Supabase (ตาราง stocks / stock_financials / stock_prices จาก supabase/market_data.sql)
 * ข้อมูลอัปเดตด้วย `npm run fetch-stocks` จึง cache ไว้ระดับชั่วโมง — ล้าง cache ได้ด้วย tag "market-data"
 * ใช้ Publishable key ได้เพราะ RLS เปิดให้อ่านอย่างเดียว และไม่ผูกกับ session ผู้ใช้
 */

/** PostgREST คืนสูงสุด 1,000 แถวต่อคำขอ (ค่า max-rows ของ Supabase) */
const PAGE_SIZE = 1000;

interface StockRow {
  symbol: string;
  name: string;
  sector: string | null;
  shares_outstanding: number | null;
  price: number | null;
  pe: number | null;
  pbv: number | null;
  dividend_yield: number | null;
  roe: number | null;
  de: number | null;
  market_cap: number | null;
  updated_at: string;
}

interface FinancialRow {
  symbol: string;
  year: number;
  close_price: number | null;
  dividend_per_share: number | null;
  revenue: number | null;
  expenses: number | null;
  net_profit: number | null;
  eps: number | null;
  roe: number | null;
  net_profit_margin: number | null;
  de: number | null;
}

function marketClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase — ใส่ค่าใน .env.local ตาม .env.example แล้วรีสตาร์ต dev server");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type PageQuery = (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/**
 * อ่านทุกแถวโดยขอทีละหน้า — ถ้าขอครั้งเดียว Supabase จะตัดเหลือ 1,000 แถวแบบเงียบๆ (ไม่มี error)
 * query ต้องเรียงด้วยคีย์ที่ไม่ซ้ำ ไม่อย่างนั้นแถวอาจซ้ำหรือหายระหว่างหน้า
 */
async function selectAll<T>(table: string, query: PageQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`อ่านตาราง ${table} จาก Supabase ไม่สำเร็จ: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** ค่าว่างจากฐานข้อมูล → NaN: ไม่ผ่านเกณฑ์คัดกรองใดๆ และแสดงเป็น "–" (ต่างจาก 0 ที่เป็นค่าจริง) */
const num = (value: number | null) => value ?? Number.NaN;

function toFinancials(row: FinancialRow): YearlyFinancials {
  return {
    year: row.year,
    closePrice: num(row.close_price),
    dividendPerShare: num(row.dividend_per_share),
    revenue: num(row.revenue),
    expenses: num(row.expenses),
    netProfit: num(row.net_profit),
    eps: num(row.eps),
    roe: num(row.roe),
    netProfitMargin: num(row.net_profit_margin),
    de: num(row.de),
  };
}

function toStock(row: StockRow, history: YearlyFinancials[]): Stock {
  return {
    symbol: row.symbol,
    name: row.name,
    sector: row.sector ?? "Other",
    sharesOutstanding: num(row.shares_outstanding),
    price: num(row.price),
    pe: num(row.pe),
    pbv: num(row.pbv),
    dividendYield: num(row.dividend_yield),
    roe: num(row.roe),
    de: num(row.de),
    marketCap: num(row.market_cap),
    updatedAt: row.updated_at,
    history,
  };
}

/** หุ้นทั้งหมด พร้อมงบรายปีเรียงจากปีเก่าไปใหม่ */
export async function getStocks(): Promise<Stock[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("market-data");

  const supabase = marketClient();
  const [stocks, financials] = await Promise.all([
    selectAll<StockRow>("stocks", (from, to) => supabase.from("stocks").select("*").order("symbol").range(from, to)),
    selectAll<FinancialRow>("stock_financials", (from, to) =>
      supabase.from("stock_financials").select("*").order("symbol").order("year").range(from, to),
    ),
  ]);

  const historyBySymbol = new Map<string, YearlyFinancials[]>();
  for (const row of financials) {
    const history = historyBySymbol.get(row.symbol) ?? [];
    history.push(toFinancials(row));
    historyBySymbol.set(row.symbol, history);
  }
  return stocks.map((row) => toStock(row, historyBySymbol.get(row.symbol) ?? []));
}

export async function getStockBySymbol(symbol: string): Promise<Stock | undefined> {
  const stocks = await getStocks();
  return stocks.find((stock) => stock.symbol === symbol.toUpperCase());
}

/** ราคาปิดรายวันทั้งหมดของหุ้น 1 ตัว เรียงจากเก่าไปใหม่ */
export async function getPriceHistory(symbol: string): Promise<PricePoint[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("market-data");

  const supabase = marketClient();
  return selectAll<PricePoint>("stock_prices", (from, to) =>
    supabase.from("stock_prices").select("date, close").eq("symbol", symbol.toUpperCase()).order("date").range(from, to),
  );
}

/** วันที่ข้อมูลล่าสุด (เวลาที่ fetch_stocks.py เขียนครั้งล่าสุด) ในรูป YYYY-MM-DD ตามเวลาไทย */
export function latestUpdate(stocks: Stock[]) {
  const latest = stocks.reduce((max, stock) => (stock.updatedAt > max ? stock.updatedAt : max), "");
  return latest ? new Date(latest).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : "–";
}
