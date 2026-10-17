import type { Sector, Stock, YearlyFinancials } from "@/types/stock";

/**
 * ข้อมูลจำลองสำหรับพัฒนา UI เท่านั้น — ตัวเลขเป็นค่าประมาณ ไม่ใช่ข้อมูลตลาดจริง
 *
 * เก็บเฉพาะค่าตั้งต้น แล้วคำนวณค่าที่เหลือ (Expenses, EPS, NPM, P/E, P/BV, Yield, Market Cap)
 * เพื่อให้ตัวเลขทุกตัวสอดคล้องกันเสมอ
 */
export const MOCK_DATA_AS_OF = "2026-10-16";

// [ปี, ราคาปิดสิ้นปี, ปันผล/หุ้น, รายได้ (ลบ.), กำไรสุทธิ (ลบ.), ROE %, D/E]
type YearRow = [number, number, number, number, number, number, number];

interface StockSeed {
  symbol: string;
  name: string;
  sector: Sector;
  sharesOutstanding: number;
  price: number;
  history: YearRow[];
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function buildStock(seed: StockSeed): Stock {
  const history: YearlyFinancials[] = seed.history.map(
    ([year, closePrice, dividendPerShare, revenue, netProfit, roe, de]) => ({
      year,
      closePrice,
      dividendPerShare,
      revenue,
      expenses: revenue - netProfit,
      netProfit,
      eps: round(netProfit / seed.sharesOutstanding),
      roe,
      netProfitMargin: round((netProfit / revenue) * 100),
      de,
    }),
  );

  const latest = history[history.length - 1];
  const bookValuePerShare = latest.netProfit / (latest.roe / 100) / seed.sharesOutstanding;

  return {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    sharesOutstanding: seed.sharesOutstanding,
    price: seed.price,
    pe: round(seed.price / latest.eps),
    pbv: round(seed.price / bookValuePerShare),
    dividendYield: round((latest.dividendPerShare / seed.price) * 100),
    roe: latest.roe,
    de: latest.de,
    marketCap: Math.round(seed.price * seed.sharesOutstanding),
    history,
  };
}

const seeds: StockSeed[] = [
  {
    symbol: "PTT",
    name: "บมจ. ปตท.",
    sector: "Energy & Utilities",
    sharesOutstanding: 28_563,
    price: 33.0,
    history: [
      [2021, 37.75, 2.0, 2_258_800, 108_400, 13.5, 1.3],
      [2022, 33.25, 2.0, 3_367_000, 91_200, 10.5, 1.3],
      [2023, 35.25, 2.0, 3_144_000, 112_000, 12.5, 1.2],
      [2024, 31.75, 2.1, 3_090_000, 89_000, 9.5, 1.2],
      [2025, 33.0, 2.0, 2_900_000, 86_000, 9.0, 1.1],
    ],
  },
  {
    symbol: "BDMS",
    name: "บมจ. กรุงเทพดุสิตเวชการ",
    sector: "Health Care Services",
    sharesOutstanding: 15_892,
    price: 24.5,
    history: [
      [2021, 22.6, 0.4, 77_000, 7_000, 8.5, 0.5],
      [2022, 30.75, 0.6, 94_000, 12_000, 13.5, 0.45],
      [2023, 27.75, 0.75, 103_000, 14_600, 15.5, 0.45],
      [2024, 25.0, 0.8, 107_000, 15_500, 15.8, 0.42],
      [2025, 24.5, 0.7, 110_000, 15_000, 15.0, 0.4],
    ],
  },
  {
    symbol: "ADVANC",
    name: "บมจ. แอดวานซ์ อินโฟร์ เซอร์วิส",
    sector: "Information & Communication Technology",
    sharesOutstanding: 2_974,
    price: 290.0,
    history: [
      [2021, 228.0, 6.92, 181_000, 26_900, 32.0, 2.6],
      [2022, 197.0, 6.95, 186_000, 26_000, 31.0, 2.5],
      [2023, 200.0, 7.04, 188_000, 28_600, 32.0, 2.3],
      [2024, 286.0, 9.0, 210_000, 35_800, 37.0, 2.0],
      [2025, 290.0, 10.5, 224_000, 39_000, 38.0, 1.9],
    ],
  },
  {
    symbol: "CPALL",
    name: "บมจ. ซีพี ออลล์",
    sector: "Commerce",
    sharesOutstanding: 8_983,
    price: 52.0,
    history: [
      [2021, 61.75, 0.6, 565_000, 13_000, 10.0, 2.8],
      [2022, 68.25, 0.75, 829_000, 13_300, 10.0, 2.7],
      [2023, 54.5, 1.0, 896_000, 18_500, 13.0, 2.4],
      [2024, 56.25, 1.25, 960_000, 25_300, 16.0, 2.2],
      [2025, 52.0, 1.3, 1_000_000, 27_000, 17.0, 2.1],
    ],
  },
  {
    symbol: "SCC",
    name: "บมจ. ปูนซิเมนต์ไทย",
    sector: "Construction Materials",
    sharesOutstanding: 1_200,
    price: 200.0,
    history: [
      [2021, 386.0, 18.5, 530_000, 47_000, 15.5, 0.9],
      [2022, 342.0, 8.5, 570_000, 21_000, 7.0, 1.0],
      [2023, 268.0, 6.0, 499_000, 25_900, 8.5, 1.0],
      [2024, 232.0, 2.5, 512_000, 6_000, 2.2, 1.1],
      [2025, 200.0, 5.0, 500_000, 8_000, 3.0, 1.2],
    ],
  },
  {
    symbol: "KBANK",
    name: "ธนาคารกสิกรไทย",
    sector: "Banking",
    sharesOutstanding: 2_369,
    price: 155.0,
    history: [
      [2021, 142.5, 3.25, 160_000, 38_000, 8.2, 7.9],
      [2022, 147.0, 4.0, 172_000, 35_800, 7.3, 7.7],
      [2023, 126.5, 6.0, 182_000, 42_400, 8.2, 7.6],
      [2024, 155.0, 8.0, 185_000, 48_600, 8.8, 7.5],
      [2025, 155.0, 8.5, 183_000, 47_000, 8.6, 7.5],
    ],
  },
  {
    symbol: "AOT",
    name: "บมจ. ท่าอากาศยานไทย",
    sector: "Transportation & Logistics",
    sharesOutstanding: 14_286,
    price: 40.0,
    history: [
      [2021, 67.0, 0, 7_500, -16_300, -12.0, 0.9],
      [2022, 74.5, 0, 16_600, -11_100, -9.0, 1.0],
      [2023, 59.25, 0.36, 48_100, 8_900, 7.5, 0.8],
      [2024, 58.25, 0.85, 67_000, 19_200, 15.0, 0.7],
      [2025, 40.0, 0.72, 70_000, 18_000, 13.5, 0.6],
    ],
  },
  {
    symbol: "TISCO",
    name: "บมจ. ทิสโก้ไฟแนนเชียลกรุ๊ป",
    sector: "Banking",
    sharesOutstanding: 801,
    price: 98.0,
    history: [
      [2021, 95.5, 7.15, 20_000, 6_800, 17.0, 6.0],
      [2022, 99.75, 7.75, 20_400, 7_200, 18.5, 5.9],
      [2023, 99.25, 7.75, 21_500, 7_000, 17.5, 5.8],
      [2024, 98.25, 7.75, 21_000, 6_600, 16.8, 5.6],
      [2025, 98.0, 7.75, 20_500, 6_500, 16.5, 5.6],
    ],
  },
  {
    symbol: "CPN",
    name: "บมจ. เซ็นทรัลพัฒนา",
    sector: "Property Development",
    sharesOutstanding: 4_488,
    price: 54.0,
    history: [
      [2021, 57.25, 0.7, 30_000, 8_000, 9.0, 2.0],
      [2022, 68.25, 1.1, 40_000, 11_000, 12.0, 1.9],
      [2023, 60.25, 1.6, 47_000, 15_000, 15.0, 1.8],
      [2024, 52.0, 1.75, 50_000, 16_700, 15.5, 1.8],
      [2025, 54.0, 1.6, 53_000, 15_500, 15.0, 1.8],
    ],
  },
  {
    symbol: "DELTA",
    name: "บมจ. เดลต้า อีเลคโทรนิคส์ (ประเทศไทย)",
    sector: "Electronic Components",
    sharesOutstanding: 12_474,
    price: 145.0,
    history: [
      [2021, 34.5, 0.2, 70_000, 9_500, 22.0, 0.6],
      [2022, 95.5, 0.27, 104_000, 12_500, 24.0, 0.5],
      [2023, 88.25, 0.45, 152_000, 17_500, 28.0, 0.45],
      [2024, 153.0, 0.42, 160_000, 20_000, 26.0, 0.4],
      [2025, 145.0, 0.45, 180_000, 30_000, 28.0, 0.4],
    ],
  },
];

export const mockStocks: Stock[] = seeds.map(buildStock);

export function getStockBySymbol(symbol: string): Stock | undefined {
  return mockStocks.find((stock) => stock.symbol === symbol.toUpperCase());
}
