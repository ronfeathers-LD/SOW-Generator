-- Migration: create the public storage bucket for rich-text-editor image uploads.
--
-- Replaces Vercel Blob (used while hosted on Vercel) with Supabase Storage as part
-- of the Railway migration. The upload route (src/app/api/upload/image/route.ts)
-- writes to this bucket using the service role key and returns the public URL.
--
-- The bucket is PUBLIC so that <img> tags / next/image can read objects without auth.
-- Writes are performed with the service role key, which bypasses RLS, so no
-- additional INSERT policy is required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rte-images',
  'rte-images',
  true,
  5242880, -- 5 MB, matches the route's validation
  array['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Explicit public-read policy on storage.objects for this bucket.
-- (A public bucket already serves objects, but this makes intent explicit and
--  survives any future change to the bucket's public flag.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for rte-images'
  ) then
    create policy "Public read access for rte-images"
      on storage.objects for select
      using (bucket_id = 'rte-images');
  end if;
end $$;
