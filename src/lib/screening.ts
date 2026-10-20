import type { Stock } from "@/types/stock";

export type ThresholdField = "pe" | "pbv" | "dividendYield" | "roe" | "de";

interface ThresholdCriterion {
  kind: "threshold";
  id: ThresholdField;
  label: string;
  op: "<" | ">";
  unit: string;
  step: number;
}

interface CheckCriterion {
  kind: "check";
  id: "steadyDividend" | "steadyProfit";
  label: string;
  test: (stock: Stock) => boolean;
}

export type Criterion = ThresholdCriterion | CheckCriterion;
export type CriterionId = Criterion["id"];
/** ค่า NaN = ผู้ใช้ลบตัวเลขออก → ข้ามเกณฑ์นั้นไป */
export type Thresholds = Record<ThresholdField, number>;

export const criteria: Criterion[] = [
  { kind: "threshold", id: "pe", label: "P/E", op: "<", unit: "เท่า", step: 1 },
  { kind: "threshold", id: "pbv", label: "P/BV", op: "<", unit: "เท่า", step: 0.1 },
  { kind: "threshold", id: "dividendYield", label: "Dividend Yield", op: ">", unit: "%", step: 0.5 },
  { kind: "threshold", id: "roe", label: "ROE", op: ">", unit: "%", step: 1 },
  { kind: "threshold", id: "de", label: "D/E", op: "<", unit: "เท่า", step: 0.1 },
  {
    kind: "check",
    id: "steadyDividend",
    label: "จ่ายปันผลทุกปี",
    test: (stock) => stock.history.length > 0 && stock.history.every((year) => year.dividendPerShare > 0),
  },
  {
    kind: "check",
    id: "steadyProfit",
    label: "มีกำไรทุกปี",
    test: (stock) => stock.history.length > 0 && stock.history.every((year) => year.netProfit > 0),
  },
];

export const defaultThresholds: Thresholds = {
  pe: 15,
  pbv: 1.5,
  dividendYield: 4,
  roe: 10,
  de: 1,
};

/** เกณฑ์ VI พื้นฐาน: P/E < 15, Yield > 4%, ROE > 10% */
export const BASIC_VI_PRESET: CriterionId[] = ["pe", "dividendYield", "roe"];

export function passesCriterion(stock: Stock, criterion: Criterion, thresholds: Thresholds) {
  if (criterion.kind === "check") return criterion.test(stock);

  const limit = thresholds[criterion.id];
  if (Number.isNaN(limit)) return true;

  const value = stock[criterion.id];
  // ค่าติดลบ (เช่น P/E ของบริษัทขาดทุน) ไม่ถือว่า "ต่ำ"
  return criterion.op === "<" ? value >= 0 && value < limit : value > limit;
}

// หมวด "กองทุนรวมอสังหาริมทรัพย์และกองทรัสต์…" ของ SET และชื่อกองทุน (กองทุนโครงสร้างพื้นฐานอยู่ในหมวดธุรกิจปกติ เช่น DIF, EGATIF)
const FUND_NAME = /กองทุน|ทรัสต์|\bREIT\b|\bfund\b|investment trust|infrastructure/i;
// ชื่อย่อ REIT / กองทุนโครงสร้างพื้นฐาน เช่น CPNREIT, DIF, TFFIF — ไม่ใช้ "PF" เพราะ CPF, UPF เป็นบริษัทปกติ
// (กองทุนอสังหาฯ อย่าง HPF, TTLPF จับได้จากหมวดธุรกิจแล้ว)
const FUND_SYMBOL = /^[A-Z0-9]+(REIT|IF)$/;
// ไม่ใช่หุ้นสามัญ: ใบสำคัญแสดงสิทธิ (-W, -W1), หุ้นบุริมสิทธิ (-P), หุ้นต่างด้าว (-F), NVDR (-R)
// ไม่ตรวจ DR จากเลขท้ายชื่อย่อ เพราะ B52, S11 เป็นบริษัทปกติ — ใช้ชื่อหลักทรัพย์แทน
const NON_COMMON_SYMBOL = /-(W\d*|P|F|R)$/;
const NON_COMMON_NAME = /depositary receipt|warrant|preferred/i;

export function isFund(stock: Stock) {
  return FUND_NAME.test(stock.sector) || FUND_NAME.test(stock.name) || FUND_SYMBOL.test(stock.symbol);
}

/**
 * หลักทรัพย์ที่คัดกรองตามเกณฑ์ VI ได้: หุ้นสามัญของบริษัทในหมวดธุรกิจปกติ ที่มีราคาและงบการเงิน
 * ตัดกองทุนรวมอสังหาฯ / REIT / กองทุนโครงสร้างพื้นฐาน, warrant / DR / หุ้นบุริมสิทธิ และหุ้นที่ไม่มีงบออก
 */
export function isViEligible(stock: Stock) {
  return (
    !isFund(stock) &&
    !NON_COMMON_SYMBOL.test(stock.symbol) &&
    !NON_COMMON_NAME.test(stock.name) &&
    stock.history.length > 0 &&
    Number.isFinite(stock.price)
  );
}

export function screenStocks(
  stocks: Stock[],
  enabled: CriterionId[],
  thresholds: Thresholds = defaultThresholds,
) {
  const active = criteria.filter((criterion) => enabled.includes(criterion.id));
  return stocks.filter((stock) =>
    active.every((criterion) => passesCriterion(stock, criterion, thresholds)),
  );
}

export function describeCriterion(criterion: Criterion, thresholds: Thresholds = defaultThresholds) {
  if (criterion.kind === "check") return criterion.label;
  const unit = criterion.unit === "%" ? "%" : ` ${criterion.unit}`;
  return `${criterion.label} ${criterion.op} ${thresholds[criterion.id]}${unit}`;
}
