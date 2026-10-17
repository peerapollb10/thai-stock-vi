import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatMarketCap, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
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
}

const columns: Column[] = [
  { key: "price", label: "ราคา", firstDir: "desc", format: (s) => formatNumber(s.price) },
  { key: "pe", label: "P/E", firstDir: "asc", format: (s) => formatNumber(s.pe) },
  { key: "pbv", label: "P/BV", firstDir: "asc", format: (s) => formatNumber(s.pbv) },
  { key: "dividendYield", label: "Yield", firstDir: "desc", format: (s) => formatPercent(s.dividendYield) },
  { key: "roe", label: "ROE", firstDir: "desc", format: (s) => formatPercent(s.roe, 1) },
  { key: "de", label: "D/E", firstDir: "asc", format: (s) => formatNumber(s.de) },
  { key: "marketCap", label: "Market Cap", firstDir: "desc", format: (s) => formatMarketCap(s.marketCap) },
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
  onSortChange: (sort: SortState) => void;
}

function SortHeader({ sortKey, label, firstDir, align, sort, highlighted, onSortChange }: SortHeaderProps) {
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
        "whitespace-nowrap px-3 py-2.5 font-medium",
        align === "right" ? "text-right" : "text-left",
        highlighted && "bg-emerald-50 dark:bg-emerald-950/40",
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

export function StockTable({ stocks, sort, onSortChange, filteredFields }: StockTableProps) {
  const isFiltered = (key: SortKey) => filteredFields.includes(key as ThresholdField);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
          <tr>
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
                onSortChange={onSortChange}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {stocks.map((stock) => (
            <tr key={stock.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2.5">
                <div className="font-semibold">{stock.symbol}</div>
                <div className="max-w-56 truncate text-xs text-slate-500">
                  {stock.name} · {stock.sector}
                </div>
              </td>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums",
                    isFiltered(col.key) && "bg-emerald-50/60 dark:bg-emerald-950/30",
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
  );
}
