-- Thai Stock VI — ตารางสำหรับ Watchlist และ Note ส่วนตัว (Phase 4)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์แล้วกด Run
-- ผู้ใช้แต่ละคนเห็นและแก้ไขได้เฉพาะข้อมูลของตัวเอง (บังคับด้วย Row Level Security)

-- ---------------------------------------------------------------------------
-- Watchlist: หุ้นที่ผู้ใช้ติดตาม (1 แถว = 1 หุ้น)
-- ---------------------------------------------------------------------------
create table public.watchlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol     text not null check (symbol ~ '^[A-Z0-9.&-]{1,12}$'),
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

-- ---------------------------------------------------------------------------
-- Note ส่วนตัว: 1 ผู้ใช้ มีได้ 1 Note ต่อ 1 หุ้น (ใช้ upsert ตอนบันทึก)
-- ---------------------------------------------------------------------------
create table public.stock_notes (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol     text not null check (symbol ~ '^[A-Z0-9.&-]{1,12}$'),
  content    text not null default '' check (char_length(content) <= 10000),
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

-- อัปเดต updated_at อัตโนมัติทุกครั้งที่แก้ Note
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stock_notes_set_updated_at
  before update on public.stock_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: เจ้าของข้อมูลเท่านั้นที่อ่าน/เขียนได้
-- ((select auth.uid()) ในวงเล็บ ช่วยให้ Postgres คำนวณครั้งเดียวต่อ query)
-- ---------------------------------------------------------------------------
alter table public.watchlist_items enable row level security;
alter table public.stock_notes enable row level security;

create policy "watchlist: owner can read"   on public.watchlist_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "watchlist: owner can add"    on public.watchlist_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "watchlist: owner can remove" on public.watchlist_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "notes: owner can read"   on public.stock_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "notes: owner can add"    on public.stock_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notes: owner can edit"   on public.stock_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes: owner can delete" on public.stock_notes for delete to authenticated using ((select auth.uid()) = user_id);
