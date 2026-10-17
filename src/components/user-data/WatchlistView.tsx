"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudOff, Star } from "lucide-react";
import { StockTable, sortStocks, type SortState } from "@/components/stocks/StockTable";
import type { Stock } from "@/types/stock";
import { useUserData } from "./UserDataProvider";

function Notice({ icon: Icon, children }: { icon: typeof Star; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-slate-500 dark:border-slate-700">
      <Icon className="size-8" />
      {children}
    </div>
  );
}

export function WatchlistView({ stocks: allStocks }: { stocks: Stock[] }) {
  const { status, error, watchlist } = useUserData();
  const [sort, setSort] = useState<SortState>({ key: "marketCap", dir: "desc" });

  if (status === "loading") {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }
  if (status === "unconfigured") {
    return (
      <Notice icon={CloudOff}>
        <p>ยังไม่ได้ตั้งค่า Supabase — ใส่ค่าใน .env.local ตาม .env.example แล้วรีสตาร์ต dev server</p>
      </Notice>
    );
  }

  const stocks = allStocks.filter((stock) => watchlist.includes(stock.symbol));

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {status === "error" ? null : stocks.length === 0 ? (
        <Notice icon={Star}>
          <p>ยังไม่มีหุ้นใน Watchlist</p>
          <p className="text-sm">กดรูปดาวในตารางรายชื่อหุ้นหรือหน้ารายละเอียดหุ้นเพื่อเพิ่ม</p>
          <Link href="/stocks" className="text-sm font-medium text-emerald-600 hover:underline">
            ไปที่รายชื่อหุ้น
          </Link>
        </Notice>
      ) : (
        <>
          <p className="text-sm text-slate-500">ติดตามอยู่ {stocks.length} หลักทรัพย์</p>
          <StockTable stocks={sortStocks(stocks, sort)} sort={sort} onSortChange={setSort} filteredFields={[]} />
        </>
      )}
    </div>
  );
}
