const formatters = new Map<number, Intl.NumberFormat>();

export function formatNumber(value: number, digits = 2) {
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
  return `${formatNumber(value, digits)}%`;
}

/** รับค่าเป็นล้านบาท แสดงเป็นหน่วยพันล้าน / ล้านล้านบาท */
export function formatMarketCap(millions: number) {
  if (millions >= 1_000_000) return `${formatNumber(millions / 1_000_000)} ล้านล้าน`;
  return `${formatNumber(millions / 1_000, 1)} พันล้าน`;
}
