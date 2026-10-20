import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2 text-sm text-slate-500">
        {label}
        <Icon className="mt-0.5 size-4 shrink-0" />
      </div>
      {/* มือถือแสดง 2 การ์ดต่อแถว — ลดขนาดตัวเลขไม่ให้ค่ายาวอย่าง "1,234.5 พันล้าน" ล้นการ์ด */}
      <div className="mt-2 break-words text-xl font-semibold sm:text-2xl">{value}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
