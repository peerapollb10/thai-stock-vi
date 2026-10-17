export type Sector =
  | "Energy & Utilities"
  | "Health Care Services"
  | "Information & Communication Technology"
  | "Commerce"
  | "Construction Materials"
  | "Banking"
  | "Transportation & Logistics"
  | "Property Development"
  | "Electronic Components"
  | "Other";

/** ข้อมูลรายปี (หน่วยเงิน: ล้านบาท) */
export interface YearlyFinancials {
  year: number;
  /** ราคาปิด ณ สิ้นปี (บาท) — ใช้เป็นราคาอ้างอิงย้อนหลัง */
  closePrice: number;
  /** เงินปันผลต่อหุ้นที่จ่ายจากผลประกอบการปีนั้น (บาท) */
  dividendPerShare: number;
  /** รายได้รวม (ธนาคาร = รายได้จากการดำเนินงานรวม) */
  revenue: number;
  /** รายจ่ายรวม รวมต้นทุนและภาษี (= revenue − netProfit) */
  expenses: number;
  netProfit: number;
  /** กำไรต่อหุ้น (บาท) */
  eps: number;
  /** Return on Equity (%) */
  roe: number;
  /** Net Profit Margin (%) */
  netProfitMargin: number;
  /** Debt / Equity (เท่า) */
  de: number;
}

export interface Stock {
  /** ชื่อย่อหลักทรัพย์ เช่น PTT */
  symbol: string;
  name: string;
  sector: Sector;
  /** จำนวนหุ้นจดทะเบียน (ล้านหุ้น) */
  sharesOutstanding: number;
  /** ราคาล่าสุด (บาท) */
  price: number;
  /** Price / Earnings จาก EPS ปีล่าสุด (เท่า) */
  pe: number;
  /** Price / Book Value (เท่า) */
  pbv: number;
  /** อัตราเงินปันผลตอบแทน จากเงินปันผลปีล่าสุดเทียบราคาปัจจุบัน (%) */
  dividendYield: number;
  /** ROE ปีล่าสุด (%) */
  roe: number;
  /** D/E ปีล่าสุด (เท่า) */
  de: number;
  /** มูลค่าตลาด (ล้านบาท) */
  marketCap: number;
  /** เวลาที่อัปเดตข้อมูลล่าสุด (ISO 8601) */
  updatedAt: string;
  /** งบรายปีย้อนหลัง (ตามที่ Yahoo Finance มี ปกติ 4–5 ปี) เรียงจากปีเก่าไปใหม่ */
  history: YearlyFinancials[];
}

/** ราคาปิดรายวัน */
export interface PricePoint {
  /** YYYY-MM-DD */
  date: string;
  close: number;
}
