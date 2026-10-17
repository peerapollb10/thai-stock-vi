// แสดงระหว่างรอข้อมูลตลาดจาก Supabase (กรณี cache หมดอายุหรือเปิดหน้าครั้งแรก)
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="กำลังโหลดข้อมูล">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <span className="sr-only">กำลังโหลดข้อมูลหุ้น…</span>
    </div>
  );
}
