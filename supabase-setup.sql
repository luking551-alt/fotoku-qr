-- Jalankan di Supabase SQL Editor hanya jika tabel belum tersedia.
-- Periksa tabel yang sudah ada terlebih dahulu agar tidak mengubah data lama.
create table if not exists public.galeri_acara (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama_acara text not null,
  slug text not null unique,
  tanggal_acara date,
  deskripsi text,
  created_at timestamptz not null default now(),
  is_published boolean not null default false
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galeri_acara(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.galeri_acara enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Owners manage own galleries" on public.galeri_acara;
create policy "Owners manage own galleries" on public.galeri_acara
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners manage photos in own galleries" on public.photos;
create policy "Owners manage photos in own galleries" on public.photos
for all to authenticated using (
  exists (select 1 from public.galeri_acara g where g.id = gallery_id and g.user_id = auth.uid())
) with check (
  exists (select 1 from public.galeri_acara g where g.id = gallery_id and g.user_id = auth.uid())
);

-- Storage bucket `fotoku-photos` harus private, batas 10 MB, MIME image/*.
-- Policies Storage menggunakan path awal = auth.uid() dan path berikutnya = gallery_id.
drop policy if exists "Owners upload own photos" on storage.objects;
create policy "Owners upload own photos" on storage.objects for insert to authenticated
with check (bucket_id = 'fotoku-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners read own photos" on storage.objects;
create policy "Owners read own photos" on storage.objects for select to authenticated
using (bucket_id = 'fotoku-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners delete own photos" on storage.objects;
create policy "Owners delete own photos" on storage.objects for delete to authenticated
using (bucket_id = 'fotoku-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Kebijakan publik tidak diperlukan untuk tabel: galeri publik diambil oleh Edge Function.


-- FITUR STATISTIK PENGUNJUNG & UNDUHAN (jalankan bagian ini di Supabase SQL Editor)
create table if not exists public.gallery_analytics (
  id bigint generated always as identity primary key,
  gallery_id uuid not null references public.galeri_acara(id) on delete cascade,
  event_type text not null check (event_type in ('view','download')),
  created_at timestamptz not null default now()
);
alter table public.gallery_analytics enable row level security;
drop policy if exists "Public can record published gallery activity" on public.gallery_analytics;
create policy "Public can record published gallery activity" on public.gallery_analytics
for insert to anon, authenticated with check (
  event_type in ('view','download') and exists (
    select 1 from public.galeri_acara g where g.id = gallery_id and g.is_published = true
  )
);
drop policy if exists "Owners read analytics for own galleries" on public.gallery_analytics;
create policy "Owners read analytics for own galleries" on public.gallery_analytics
for select to authenticated using (exists (
  select 1 from public.galeri_acara g where g.id = gallery_id and g.user_id = auth.uid()
));
