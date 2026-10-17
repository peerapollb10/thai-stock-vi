"use client";

import { useState, useSyncExternalStore } from "react";
import { NotebookPen } from "lucide-react";

const noop = () => () => {};

function storageKey(symbol: string) {
  return `thai-vi:note:${symbol}`;
}

function readNote(symbol: string) {
  try {
    return localStorage.getItem(storageKey(symbol)) ?? "";
  } catch {
    return "";
  }
}

function NoteEditor({ symbol }: { symbol: string }) {
  const [note, setNote] = useState(() => readNote(symbol));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleChange(value: string) {
    setNote(value);
    try {
      if (value) localStorage.setItem(storageKey(symbol), value);
      else localStorage.removeItem(storageKey(symbol));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        rows={5}
        placeholder={`บันทึกมุมมองของคุณต่อ ${symbol} เช่น เหตุผลที่สนใจ ราคาเป้าหมาย หรือความเสี่ยงที่ต้องติดตาม`}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800"
      />
      <p className="mt-1 text-xs text-slate-400">
        {status === "error"
          ? "บันทึกไม่สำเร็จ — เบราว์เซอร์อาจปิดการใช้ Local Storage"
          : status === "saved"
            ? "บันทึกอัตโนมัติแล้ว (เก็บในเบราว์เซอร์นี้เท่านั้น)"
            : "บันทึกอัตโนมัติขณะพิมพ์ (เก็บในเบราว์เซอร์นี้เท่านั้น)"}
      </p>
    </>
  );
}

export function PrivateNote({ symbol }: { symbol: string }) {
  // Local Storage มีเฉพาะฝั่งเบราว์เซอร์ จึงรอให้ mount ก่อนค่อยแสดงช่อง Note
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <NotebookPen className="size-4 text-emerald-600" />
        Note ส่วนตัว
      </h2>
      {isClient ? (
        <NoteEditor symbol={symbol} />
      ) : (
        <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      )}
    </section>
  );
}
