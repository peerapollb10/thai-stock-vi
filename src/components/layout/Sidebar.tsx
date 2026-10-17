"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** สถานะแหล่งข้อมูล (Server Component ส่งผ่าน AppShell) */
  footer: ReactNode;
}

export function Sidebar({ open, onClose, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* ฉากหลังมืดตอนเปิดเมนูบนมือถือ */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform",
          "dark:border-slate-800 dark:bg-slate-900",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <TrendingUp className="size-5" />
            </span>
            <span className="text-lg font-semibold">Thai VI</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
            aria-label="ปิดเมนู"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 text-xs text-slate-400">{footer}</div>
      </aside>
    </>
  );
}
