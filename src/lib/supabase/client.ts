import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | undefined;

/** Supabase client ฝั่งเบราว์เซอร์ (คืน null ถ้ายังไม่ได้ตั้งค่า .env.local) */
export function getSupabase() {
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key);
  return client;
}

let userPromise: Promise<User> | undefined;

/**
 * ใช้ session เดิมถ้ามี ไม่มีก็ล็อกอินแบบ Anonymous ให้อัตโนมัติ
 * เก็บ promise ไว้ เพื่อไม่ให้สร้างผู้ใช้ซ้ำเมื่อถูกเรียกพร้อมกันหลายที่
 */
export function ensureUser(supabase: SupabaseClient) {
  userPromise ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user;
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error || !signIn.user) throw error ?? new Error("ล็อกอินไม่สำเร็จ");
    return signIn.user;
  })().catch((err) => {
    userPromise = undefined;
    throw err;
  });
  return userPromise;
}

/** แปลง error จาก Supabase เป็นข้อความที่ผู้ใช้เข้าใจ */
export function describeSupabaseError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return "ยังไม่ได้เปิด Anonymous Sign-Ins ใน Supabase (Authentication → Sign In / Providers)";
  }
  if (/failed to fetch|network/i.test(message)) return "เชื่อมต่อ Supabase ไม่ได้ — ตรวจสอบอินเทอร์เน็ต";
  return message;
}
