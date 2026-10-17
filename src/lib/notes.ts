import type { SupabaseClient } from "@supabase/supabase-js";

/** Note ยุค Phase 3 ที่เก็บใน Local Storage ใช้ key รูปแบบนี้ */
const LOCAL_NOTE_PREFIX = "thai-vi:note:";
export const NOTE_MAX_LENGTH = 10000;
const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,12}$/;
const MIGRATED_HEADER = "--- Note เดิมจากเบราว์เซอร์ ---";

export function localNoteKey(symbol: string) {
  return LOCAL_NOTE_PREFIX + symbol;
}

function readLocalNotes() {
  const notes: { symbol: string; content: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LOCAL_NOTE_PREFIX)) continue;
      const symbol = key.slice(LOCAL_NOTE_PREFIX.length);
      const content = localStorage.getItem(key)?.trim();
      if (content && SYMBOL_PATTERN.test(symbol)) notes.push({ symbol, content });
    }
  } catch {
    // Local Storage ถูกปิด — ไม่มีอะไรให้ย้าย
  }
  return notes;
}

/**
 * ย้าย Note ทุกตัวจาก Local Storage ขึ้น Supabase แล้วลบของเดิมทิ้ง
 * ถ้าหุ้นตัวนั้นมี Note บน Supabase อยู่แล้ว จะต่อท้ายแทนการเขียนทับ เพื่อไม่ให้ข้อมูลหาย
 * คืนจำนวน Note ที่ย้าย
 */
export async function migrateLocalNotes(supabase: SupabaseClient, userId: string) {
  const local = readLocalNotes();
  if (local.length === 0) return 0;

  const { data: remote, error } = await supabase
    .from("stock_notes")
    .select("symbol, content")
    .in("symbol", local.map((n) => n.symbol));
  if (error) throw error;

  const remoteBySymbol = new Map(remote.map((r) => [r.symbol as string, r.content as string]));
  const rows = local
    .map(({ symbol, content }) => {
      const existing = remoteBySymbol.get(symbol)?.trim() ?? "";
      if (existing.includes(content)) return null; // ย้ายไปแล้ว
      const merged = existing ? `${existing}\n\n${MIGRATED_HEADER}\n${content}` : content;
      return { user_id: userId, symbol, content: merged.slice(0, NOTE_MAX_LENGTH) };
    })
    .filter((row) => row !== null);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("stock_notes").upsert(rows);
    if (upsertError) throw upsertError;
  }

  for (const { symbol } of local) {
    try {
      localStorage.removeItem(localNoteKey(symbol));
    } catch {}
  }
  return rows.length;
}

export async function fetchNote(supabase: SupabaseClient, symbol: string) {
  const { data, error } = await supabase
    .from("stock_notes")
    .select("content")
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) throw error;
  return (data?.content as string | undefined) ?? "";
}

export async function saveNote(supabase: SupabaseClient, userId: string, symbol: string, content: string) {
  const { error } = content.trim()
    ? await supabase.from("stock_notes").upsert({ user_id: userId, symbol, content })
    : await supabase.from("stock_notes").delete().eq("symbol", symbol);
  if (error) throw error;
}
