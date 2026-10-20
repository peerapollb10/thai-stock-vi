import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  label: string;
  render: (row: T) => ReactNode;
  /** คอลัมน์ตัวเลขชิดขวา (ค่าเริ่มต้น) */
  align?: "left" | "right";
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** แถวสรุปท้ายตาราง — หนึ่งช่องต่อหนึ่งคอลัมน์ตามลำดับ (null = ช่องว่าง) */
  footer?: ReactNode[];
}

/**
 * ตารางตัวเลขย้อนหลังรายปี — วัดความกว้างจากกล่องที่ครอบ (container query) ไม่ใช่ขนาดจอ
 * พื้นที่แคบ (เช่น มือถือ หรือครึ่งจอบน PC) แสดงเป็นการ์ดทีละแถว: คอลัมน์แรกเป็นหัวการ์ด ที่เหลือเป็นคู่ ชื่อ–ค่า
 * ตารางเต็มแสดงเมื่อกว้างพอสำหรับทุกคอลัมน์ จึงไม่ต้องเลื่อนแนวนอน
 */
export function DataTable<T>({ columns, rows, rowKey, footer }: DataTableProps<T>) {
  const [titleCol, ...valueCols] = columns;
  // ประมาณ 90px ต่อคอลัมน์: ≤ 6 คอลัมน์ใช้ตารางตั้งแต่ 576px, มากกว่านั้นตั้งแต่ 768px
  const wide = columns.length > 6;

  const card = (key: string | number, title: ReactNode, cells: ReactNode[], summary = false) => (
    <li
      key={key}
      className={cn(
        "rounded-lg border p-3",
        summary
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-slate-200 dark:border-slate-800",
      )}
    >
      <div className="mb-1.5 font-semibold">{title}</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm @sm:grid-cols-3">
        {valueCols.map((col, i) =>
          cells[i] == null ? null : (
            <div key={col.label} className="flex min-w-0 items-baseline justify-between gap-2">
              <dt className="text-xs text-slate-500">{col.label}</dt>
              <dd className="whitespace-nowrap font-mono tabular-nums">{cells[i]}</dd>
            </div>
          ),
        )}
      </dl>
    </li>
  );

  return (
    <div className="@container">
      <ul className={cn("space-y-2", wide ? "@3xl:hidden" : "@xl:hidden")}>
        {rows.map((row) => card(rowKey(row), titleCol.render(row), valueCols.map((col) => col.render(row))))}
        {footer && card("footer", footer[0], footer.slice(1), true)}
      </ul>

      <table className={cn("hidden w-full text-sm", wide ? "@3xl:table" : "@xl:table")}>
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-2 py-2 font-medium",
                  col.align === "left" ? "text-left" : "text-right",
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.label}
                  className={cn(
                    "whitespace-nowrap px-2 py-2",
                    col.align === "left" ? "text-left" : "text-right font-mono tabular-nums",
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot className="border-t border-slate-200 font-medium dark:border-slate-800">
            <tr>
              {columns.map((col, i) => (
                <td
                  key={col.label}
                  className={cn(
                    "whitespace-nowrap px-2 py-2",
                    col.align === "left" ? "text-left" : "text-right font-mono tabular-nums",
                  )}
                >
                  {footer[i]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
