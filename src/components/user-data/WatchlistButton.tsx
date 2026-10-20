"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserData } from "./UserDataProvider";

interface WatchlistButtonProps {
  symbol: string;
  /** icon = ดาวอย่างเดียว (ในตาราง), labeled = ดาวพร้อมข้อความ (หน้า Detail) */
  variant?: "icon" | "labeled";
}

export function WatchlistButton({ symbol, variant = "icon" }: WatchlistButtonProps) {
  const { status, error, isWatched, toggleWatch } = useUserData();
  const watched = isWatched(symbol);
  const ready = status === "ready";

  const label = watched ? `เอา ${symbol} ออกจาก Watchlist` : `เพิ่ม ${symbol} เข้า Watchlist`;
  const title = ready
    ? label
    : status === "loading"
      ? "กำลังเชื่อมต่อ Watchlist…"
      : status === "unconfigured"
        ? "ยังไม่ได้ตั้งค่า Supabase ใน .env.local"
        : (error ?? "Watchlist ใช้งานไม่ได้");

  return (
    <button
      type="button"
      onClick={() => toggleWatch(symbol)}
      disabled={!ready}
      aria-pressed={watched}
      aria-label={label}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "icon"
          ? "size-11 hover:bg-slate-100 md:size-8 dark:hover:bg-slate-800"
          : "border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 max-md:min-h-11 dark:border-slate-700 dark:hover:bg-slate-800",
        watched ? "text-amber-500" : "text-slate-400 hover:text-amber-500",
      )}
    >
      <Star className={cn("size-4", watched && "fill-current")} />
      {variant === "labeled" && (
        <span className="text-slate-700 dark:text-slate-200">{watched ? "อยู่ใน Watchlist" : "เพิ่มเข้า Watchlist"}</span>
      )}
    </button>
  );
}
