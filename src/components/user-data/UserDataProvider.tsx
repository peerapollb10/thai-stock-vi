"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { migrateLocalNotes } from "@/lib/notes";
import { describeSupabaseError, ensureUser, getSupabase } from "@/lib/supabase/client";

/**
 * - unconfigured: ยังไม่มีค่าใน .env.local
 * - loading: กำลังล็อกอิน / โหลด Watchlist / ย้าย Note เดิม
 * - ready: ใช้งานได้
 * - error: เชื่อมต่อไม่สำเร็จ (ดูข้อความใน error)
 */
export type UserDataStatus = "unconfigured" | "loading" | "ready" | "error";

interface UserDataContextValue {
  status: UserDataStatus;
  error: string | null;
  supabase: SupabaseClient | null;
  userId: string | null;
  /** ชื่อย่อหุ้นใน Watchlist เรียงตามเวลาที่เพิ่ม (ใหม่สุดก่อน) */
  watchlist: string[];
  isWatched: (symbol: string) => boolean;
  toggleWatch: (symbol: string) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function useUserData() {
  const value = use(UserDataContext);
  if (!value) throw new Error("useUserData ต้องใช้ภายใน <UserDataProvider>");
  return value;
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(getSupabase);
  const [status, setStatus] = useState<UserDataStatus>(supabase ? "loading" : "unconfigured");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const user = await ensureUser(supabase);
      const { data, error: listError } = await supabase
        .from("watchlist_items")
        .select("symbol")
        .order("created_at", { ascending: false });
      if (listError) throw listError;
      await migrateLocalNotes(supabase, user.id);
      if (cancelled) return;
      setUserId(user.id);
      setWatchlist(data.map((row) => row.symbol as string));
      setStatus("ready");
    })().catch((err) => {
      if (cancelled) return;
      setError(describeSupabaseError(err));
      setStatus("error");
    });

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const isWatched = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  const toggleWatch = useCallback(
    async (symbol: string) => {
      if (!supabase || !userId) return;
      const adding = !watchlist.includes(symbol);
      // อัปเดตหน้าจอทันที แล้วค่อยย้อนกลับถ้าบันทึกไม่สำเร็จ
      setWatchlist((prev) => (adding ? [symbol, ...prev] : prev.filter((s) => s !== symbol)));
      setError(null);

      const { error: writeError } = adding
        ? await supabase.from("watchlist_items").insert({ user_id: userId, symbol })
        : await supabase.from("watchlist_items").delete().eq("symbol", symbol);

      // 23505 = มีอยู่แล้ว (เช่น เพิ่มจากอีกแท็บ) ถือว่าสำเร็จ
      if (writeError && writeError.code !== "23505") {
        setWatchlist((prev) => (adding ? prev.filter((s) => s !== symbol) : [symbol, ...prev]));
        setError(`บันทึก Watchlist ไม่สำเร็จ: ${describeSupabaseError(writeError)}`);
      }
    },
    [supabase, userId, watchlist],
  );

  return (
    <UserDataContext
      value={{ status, error, supabase, userId, watchlist, isWatched, toggleWatch }}
    >
      {children}
    </UserDataContext>
  );
}
