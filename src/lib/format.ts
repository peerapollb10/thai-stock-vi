const formatters = new Map<number, Intl.NumberFormat>();

/** ค่าที่ไม่มีข้อมูล (NaN จากค่าว่างในฐานข้อมูล) */
export const MISSING = "–";

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return MISSING;
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(digits, formatter);
  }
  return formatter.format(value);
}

export function formatPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return MISSING;
  return `${formatNumber(value, digits)}%`;
}

/** รับค่าเป็นล้านบาท แสดงเป็นหน่วยพันล้าน / ล้านล้านบาท */
export function formatMarketCap(millions: number) {
  if (!Number.isFinite(millions)) return MISSING;
  if (millions >= 1_000_000) return `${formatNumber(millions / 1_000_000)} ล้านล้าน`;
  return `${formatNumber(millions / 1_000, 1)} พันล้าน`;
}
