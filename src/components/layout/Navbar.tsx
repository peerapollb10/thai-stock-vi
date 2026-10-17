"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
    router.push(query ? `/stocks?q=${encodeURIComponent(query)}` : "/stocks");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-900/80">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
        aria-label="เปิดเมนู"
      >
        <Menu className="size-5" />
      </button>

      <form role="search" onSubmit={handleSearch} className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          placeholder="ค้นหาหุ้น เช่น PTT, CPALL แล้วกด Enter"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800"
        />
      </form>
    </header>
  );
}
