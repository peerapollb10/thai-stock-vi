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
  footer?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, footer }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
          <tfoot className="border-t border-slate-200 font-medium dark:border-slate-800">{footer}</tfoot>
        )}
      </table>
    </div>
  );
}
