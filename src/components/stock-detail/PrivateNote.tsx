"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useUserData } from "@/components/user-data/UserDataProvider";
import { fetchNote, NOTE_MAX_LENGTH, saveNote } from "@/lib/notes";
import { describeSupabaseError } from "@/lib/supabase/client";

const SAVE_DELAY_MS = 700;

type SaveStatus = "loading" | "idle" | "pending" | "saving" | "saved" | "error";

const statusText: Record<Exclude<SaveStatus, "error">, string> = {
  loading: "กำลังโหลด Note…",
  idle: "บันทึกอัตโนมัติขณะพิมพ์ (เก็บใน Supabase)",
  pending: "กำลังพิมพ์…",
  saving: "กำลังบันทึก…",
  saved: "บันทึกแล้ว",
};

interface NoteEditorProps {
  supabase: SupabaseClient;
  userId: string;
  symbol: string;
}

function NoteEditor({ supabase, userId, symbol }: NoteEditorProps) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [errorText, setErrorText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unsaved = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNote(supabase, symbol)
      .then((content) => {
        if (cancelled) return;
        setNote(content);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorText(`โหลด Note ไม่สำเร็จ: ${describeSupabaseError(err)}`);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, symbol]);

  async function flush() {
    clearTimeout(timer.current);
    const content = unsaved.current;
    if (content === null) return;
    unsaved.current = null;
    setStatus("saving");
    try {
      await saveNote(supabase, userId, symbol, content);
      // ถ้าระหว่างบันทึกมีการพิมพ์เพิ่ม ให้รอรอบถัดไป
      if (unsaved.current === null) setStatus("saved");
    } catch (err) {
      unsaved.current ??= content;
      setErrorText(`บันทึกไม่สำเร็จ: ${describeSupabaseError(err)} — จะลองใหม่เมื่อพิมพ์ต่อ`);
      setStatus("error");
    }
  }

  // ออกจากหน้าก่อนครบเวลาหน่วง ให้บันทึกส่วนที่ค้างทันที
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => void flushRef.current(), []);

  function handleChange(value: string) {
    setNote(value);
    unsaved.current = value;
    setStatus("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  const loading = status === "loading";

  return (
    <>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={flush}
        disabled={loading}
        maxLength={NOTE_MAX_LENGTH}
        rows={5}
        placeholder={
          loading
            ? "กำลังโหลด…"
            : `บันทึกมุมมองของคุณต่อ ${symbol} เช่น เหตุผลที่สนใจ ราคาเป้าหมาย หรือความเสี่ยงที่ต้องติดตาม`
        }
        className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:animate-pulse disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800"
      />
      <p className="mt-1 flex justify-between gap-2 text-xs text-slate-400">
        <span className={status === "error" ? "text-red-600 dark:text-red-400" : undefined} role="status">
          {status === "error" ? errorText : statusText[status]}
        </span>
        <span className="tabular-nums">
          {note.length.toLocaleString("th-TH")}/{NOTE_MAX_LENGTH.toLocaleString("th-TH")}
        </span>
      </p>
    </>
  );
}

export function PrivateNote({ symbol }: { symbol: string }) {
  const { status, error, supabase, userId } = useUserData();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <NotebookPen className="size-4 text-emerald-600" />
        Note ส่วนตัว
      </h2>
      {status === "ready" && supabase && userId ? (
        <NoteEditor key={symbol} supabase={supabase} userId={userId} symbol={symbol} />
      ) : status === "loading" ? (
        <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
          {status === "unconfigured"
            ? "ยังไม่ได้ตั้งค่า Supabase — ใส่ค่าใน .env.local ตาม .env.example เพื่อเปิดใช้ Note ส่วนตัว"
            : `เชื่อมต่อ Note ไม่สำเร็จ: ${error}`}
        </p>
      )}
    </section>
  );
}
