import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatMarketCap, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WatchlistButton } from "@/components/user-data/WatchlistButton";
import type { ThresholdField } from "@/lib/screening";
import type { Stock } from "@/types/stock";

export type SortKey = "symbol" | "price" | "pe" | "pbv" | "dividendYield" | "roe" | "de" | "marketCap";
export type SortDir = "asc" | "desc";
export interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface Column {
  key: Exclude<SortKey, "symbol">;
  label: string;
  /** ทิศทางเมื่อกดครั้งแรก: ค่าที่ "ดี" ขึ้นก่อน เช่น P/E ต่ำ, Yield สูง */
  firstDir: SortDir;
  format: (stock: Stock) => string;
  /** คอลัมน์รอง: ซ่อนในตารางเมื่อพื้นที่แคบ (ยกเว้นกำลังใช้กรอง/เรียง) — มุมมองการ์ดยังแสดงครบ */
  secondary?: boolean;
}

const columns: Column[] = [
  { key: "price", label: "ราคา", firstDir: "desc", format: (s) => formatNumber(s.price) },
  { key: "pe", label: "P/E", firstDir: "asc", format: (s) => formatNumber(s.pe) },
  { key: "pbv", label: "P/BV", firstDir: "asc", format: (s) => formatNumber(s.pbv), secondary: true },
  { key: "dividendYield", label: "Yield", firstDir: "desc", format: (s) => formatPercent(s.dividendYield) },
  { key: "roe", label: "ROE", firstDir: "desc", format: (s) => formatPercent(s.roe, 1) },
  { key: "de", label: "D/E", firstDir: "asc", format: (s) => formatNumber(s.de), secondary: true },
  { key: "marketCap", label: "Market Cap", firstDir: "desc", format: (s) => formatMarketCap(s.marketCap) },
];

const sortOptions: { key: SortKey; label: string; firstDir: SortDir }[] = [
  { key: "symbol", label: "ชื่อย่อ", firstDir: "asc" },
  ...columns,
];

export function sortStocks(stocks: Stock[], { key, dir }: SortState) {
  const sign = dir === "asc" ? 1 : -1;
  return [...stocks].sort((a, b) =>
    key === "symbol" ? sign * a.symbol.localeCompare(b.symbol) : sign * (a[key] - b[key]),
  );
}

interface StockTableProps {
  stocks: Stock[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  /** คอลัมน์ที่กำลังใช้กรองอยู่ — ไฮไลต์ให้เห็น */
  filteredFields: ThresholdField[];
}

interface SortHeaderProps {
  sortKey: SortKey;
  label: string;
  firstDir: SortDir;
  align: "left" | "right";
  sort: SortState;
  highlighted: boolean;
  className?: string;
  onSortChange: (sort: SortState) => void;
}

function SortHeader({ sortKey, label, firstDir, align, sort, highlighted, className, onSortChange }: SortHeaderProps) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;

  function handleClick() {
    if (active) onSortChange({ key: sortKey, dir: sort.dir === "asc" ? "desc" : "asc" });
    else onSortChange({ key: sortKey, dir: firstDir });
  }

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "whitespace-nowrap px-2 py-2.5 font-medium @4xl:px-3",
        align === "right" ? "text-right" : "text-left",
        highlighted && "bg-emerald-50 dark:bg-emerald-950/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100",
          align === "right" && "flex-row-reverse",
          active && "text-slate-900 dark:text-slate-100",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </th>
  );
}

/**
 * ค่าในการ์ด: แยกหน่วยภาษาไทย (เช่น "1.23 ล้านล้าน") เป็นตัวเล็ก และให้ขึ้นบรรทัดใหม่ได้
 * ช่องกว้างแค่ ~70–85px บนมือถือ — ถ้าตัด … ตัวเลข Market Cap จะอ่านไม่ออก
 */
function CardValue({ text }: { text: string }) {
  const [value, unit] = text.split(" ");
  return (
    <dd className="flex flex-wrap items-baseline gap-x-1 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
      <span>{value}</span>
      {unit && <span className="font-sans text-xs text-slate-500">{unit}</span>}
    </dd>
  );
}

/** ตัวเลือกการเรียงของมุมมองการ์ด (แทนการกดหัวตาราง) */
function SortControl({ sort, onSortChange }: Pick<StockTableProps, "sort" | "onSortChange">) {
  const DirIcon = sort.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="stock-sort" className="shrink-0 text-slate-500">
        เรียงตาม
      </label>
      <select
        id="stock-sort"
        value={sort.key}
        onChange={(e) => {
          const option = sortOptions.find((o) => o.key === e.target.value) ?? sortOptions[0];
          onSortChange({ key: option.key, dir: option.firstDir });
        }}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
      >
        {sortOptions.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSortChange({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })}
        title="สลับทิศทางการเรียง"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <DirIcon className="size-4" />
        {sort.dir === "asc" ? "น้อย→มาก" : "มาก→น้อย"}
      </button>
    </div>
  );
}

export function StockTable({ stocks, sort, onSortChange, filteredFields }: StockTableProps) {
  const isFiltered = (key: SortKey) => filteredFields.includes(key as ThresholdField);
  // คอลัมน์รองที่กำลังกรอง/เรียงอยู่ต้องแสดงเสมอ ไม่งั้นผู้ใช้มองไม่เห็นค่าที่ใช้ตัดสิน
  const narrowHidden = (col: Column) =>
    col.secondary && !isFiltered(col.key) && sort.key !== col.key && "hidden @4xl:table-cell";

  return (
    // ใช้ container query แทนขนาดจอ เพราะพื้นที่จริงขึ้นกับ Sidebar ด้วย:
    // < 672px = การ์ด · 672–895px = ตาราง (ซ่อนคอลัมน์รอง P/BV, D/E, ช่องไฟแคบลง) · ≥ 896px = ตารางครบทุกคอลัมน์
    // ช่องไฟ px-2 ช่วงแคบทำให้แม้กรองครบ 7 คอลัมน์ (ใช้เกณฑ์ P/BV, D/E) ก็ยังไม่ล้น 672px
    <div className="@container">
      <div className="space-y-2 @2xl:hidden">
        <SortControl sort={sort} onSortChange={onSortChange} />
        {/* grid-cols-1 = minmax(0,1fr): คอลัมน์ auto จะกว้างตามชื่อบริษัทเต็ม (truncate ไม่ทำงาน) จนการ์ดล้นจอ */}
        <ul className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
          {stocks.map((stock) => (
            <li
              key={stock.symbol}
              className="relative rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-1">
                {/* z-10 ให้ปุ่มดาวอยู่เหนือพื้นที่กดของลิงก์ที่คลุมทั้งการ์ด; ปุ่ม 44px บนมือถือ — margin ติดลบให้ล้ำเข้า padding
                    การ์ดแทนการดันความสูงหัวการ์ด */}
                <div className="relative z-10 -my-1.5 -ml-2">
                  <WatchlistButton symbol={stock.symbol} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    className="font-semibold after:absolute after:inset-0 after:rounded-xl hover:text-emerald-600"
                  >
                    {stock.symbol}
                  </Link>
                  <div className="truncate text-xs text-slate-500">
                    {stock.name} · {stock.sector}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono font-semibold tabular-nums">{formatNumber(stock.price)}</div>
                  <div className="text-xs text-slate-400">บาท</div>
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                {columns
                  .filter((col) => col.key !== "price")
                  .map((col) => (
                    <div
                      key={col.key}
                      className={cn(
                        "min-w-0 rounded-md px-2 py-1",
                        isFiltered(col.key) ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-slate-50 dark:bg-slate-800/50",
                      )}
                    >
                      <dt className="text-slate-500">{col.label}</dt>
                      <CardValue text={col.format(stock)} />
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white @2xl:block dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
            <tr>
              <th scope="col" className="w-10 px-1 py-2.5">
                <span className="sr-only">Watchlist</span>
              </th>
              <SortHeader
                sortKey="symbol"
                label="หุ้น"
                firstDir="asc"
                align="left"
                sort={sort}
                highlighted={false}
                onSortChange={onSortChange}
              />
              {columns.map((col) => (
                <SortHeader
                  key={col.key}
                  sortKey={col.key}
                  label={col.label}
                  firstDir={col.firstDir}
                  align="right"
                  sort={sort}
                  highlighted={isFiltered(col.key)}
                  className={cn(narrowHidden(col))}
                  onSortChange={onSortChange}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {stocks.map((stock) => (
              <tr key={stock.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-1 py-2.5 text-center">
                  <WatchlistButton symbol={stock.symbol} />
                </td>
                <td className="px-2 py-2.5 @4xl:px-3">
                  <Link href={`/stocks/${stock.symbol}`} className="group block">
                    <div className="font-semibold group-hover:text-emerald-600">{stock.symbol}</div>
                    <div className="max-w-32 truncate text-xs text-slate-500 @4xl:max-w-56">
                      {stock.name} · {stock.sector}
                    </div>
                  </Link>
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-2 py-2.5 text-right font-mono tabular-nums @4xl:px-3",
                      isFiltered(col.key) && "bg-emerald-50/60 dark:bg-emerald-950/30",
                      narrowHidden(col),
                    )}
                  >
                    {col.format(stock)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
