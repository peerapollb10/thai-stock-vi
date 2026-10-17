import type { Metadata } from "next";
import { WatchlistView } from "@/components/user-data/WatchlistView";

export const metadata: Metadata = { title: "Watchlist · Thai Stock VI Dashboard" };

export default function WatchlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <p className="text-sm text-slate-500">
          หุ้นที่คุณติดตาม · บันทึกใน Supabase ผูกกับเบราว์เซอร์นี้ (ไม่ต้องสมัครสมาชิก)
        </p>
      </div>
      <WatchlistView />
    </div>
  );
}
