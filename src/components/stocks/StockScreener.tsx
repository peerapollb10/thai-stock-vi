"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import {
  BASIC_VI_PRESET,
  defaultThresholds,
  isViEligible,
  screenStocks,
  type CriterionId,
  type ThresholdField,
  type Thresholds,
} from "@/lib/screening";
import type { Sector, Stock } from "@/types/stock";
import { ScreeningFilters } from "./ScreeningFilters";
import { StockTable, sortStocks, type SortState } from "./StockTable";

/**
 * `stocks` ควรผ่าน isViEligible มาแล้วฝั่ง server (ลดขนาดข้อมูลที่ส่งไปหน้าเว็บ) — กรองซ้ำที่นี่กันพลาด
 * ให้กองทุน / REIT / หลักทรัพย์ที่ไม่ใช่หุ้นสามัญหรือไม่มีงบ ไม่โผล่ทั้งในตารางและตัวเลือกหมวด
 */
export function StockScreener({ stocks, excludedCount = 0 }: { stocks: Stock[]; excludedCount?: number }) {
  const universe = stocks.filter(isViEligible);
  const hiddenCount = excludedCount + stocks.length - universe.length;
  const sectors = [...new Set(universe.map((stock) => stock.sector))].sort();
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
    screenStocks(universe, enabled, thresholds).filter(
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
          // ชื่อหมวดของ SET ยาวได้ถึง ~60 ตัวอักษร — จำกัดความกว้างไม่ให้เบียดช่องค้นหาบนจอกว้าง
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-xs dark:border-slate-700 dark:bg-slate-900"
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          พบ {results.length} จาก {universe.length} หุ้นสามัญ
        </p>
        {hiddenCount > 0 && (
          <p
            className="text-xs text-slate-400"
            title="กองทุนรวมอสังหาริมทรัพย์, REIT, กองทุนโครงสร้างพื้นฐาน, warrant / DR และหุ้นที่ไม่มีงบการเงิน วิเคราะห์ตามเกณฑ์ VI ไม่ได้"
          >
            ไม่รวมกองทุน / REIT / กองทุนโครงสร้างพื้นฐาน และหลักทรัพย์ที่ไม่มีงบ {hiddenCount} ตัว
          </p>
        )}
      </div>

      {results.length > 0 ? (
        <StockTable stocks={results} sort={sort} onSortChange={setSort} filteredFields={filteredFields} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500 dark:border-slate-700">
          <SearchX className="size-8" />
          <p>ไม่พบหุ้นที่ตรงกับเงื่อนไข</p>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg px-4 py-2 text-sm font-medium text-emerald-600 hover:underline max-md:min-h-11"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
