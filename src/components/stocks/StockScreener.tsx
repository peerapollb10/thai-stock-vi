"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import {
  BASIC_VI_PRESET,
  defaultThresholds,
  screenStocks,
  type CriterionId,
  type ThresholdField,
  type Thresholds,
} from "@/lib/screening";
import type { Sector, Stock } from "@/types/stock";
import { ScreeningFilters } from "./ScreeningFilters";
import { StockTable, sortStocks, type SortState } from "./StockTable";

export function StockScreener({ stocks }: { stocks: Stock[] }) {
  const sectors = [...new Set(stocks.map((stock) => stock.sector))].sort();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // คำค้นเก็บใน URL (?q=) เพื่อให้ช่องค้นหาบน Navbar ส่งมาที่หน้านี้ได้
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const [sector, setSector] = useState<Sector | "all">("all");
  const [enabled, setEnabled] = useState<CriterionId[]>(() =>
    searchParams.get("preset") === "vi" ? BASIC_VI_PRESET : [],
  );
  const [thresholds, setThresholds] = useState<Thresholds>(defaultThresholds);
  const [sort, setSort] = useState<SortState>({ key: "marketCap", dir: "desc" });

  function handleQueryChange(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  function resetAll() {
    handleQueryChange("");
    setSector("all");
    setEnabled([]);
    setThresholds(defaultThresholds);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const results = sortStocks(
    screenStocks(stocks, enabled, thresholds).filter(
      (stock) =>
        (sector === "all" || stock.sector === sector) &&
        (!normalizedQuery ||
          stock.symbol.toLowerCase().includes(normalizedQuery) ||
          stock.name.toLowerCase().includes(normalizedQuery)),
    ),
    sort,
  );

  const filteredFields = enabled.filter((id): id is ThresholdField => id in defaultThresholds);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="ค้นหาด้วยชื่อย่อหรือชื่อบริษัท"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector | "all")}
          aria-label="กลุ่มอุตสาหกรรม"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">ทุกกลุ่มอุตสาหกรรม</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ScreeningFilters
        enabled={enabled}
        thresholds={thresholds}
        onToggle={(id) =>
          setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onThresholdChange={(id, value) => setThresholds((prev) => ({ ...prev, [id]: value }))}
        onApplyPreset={() => {
          setEnabled(BASIC_VI_PRESET);
          setThresholds(defaultThresholds);
        }}
        onClear={() => setEnabled([])}
      />

      <p className="text-sm text-slate-500">
        พบ {results.length} จาก {stocks.length} หลักทรัพย์
      </p>

      {results.length > 0 ? (
        <StockTable stocks={results} sort={sort} onSortChange={setSort} filteredFields={filteredFields} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500 dark:border-slate-700">
          <SearchX className="size-8" />
          <p>ไม่พบหุ้นที่ตรงกับเงื่อนไข</p>
          <button
            type="button"
            onClick={resetAll}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
