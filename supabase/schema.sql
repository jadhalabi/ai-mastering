-- MasterAI: full schema
-- Run this once in your Supabase dashboard → SQL Editor

-- ── Storage bucket for audio files ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload to temp/ (unauthenticated users)
CREATE POLICY IF NOT EXISTS "anon upload temp"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = 'temp');

-- Authenticated users can upload to their own folder
CREATE POLICY IF NOT EXISTS "auth upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] IN (auth.uid()::text, 'temp'));

-- ── Masters table ────────────────────────────────────────────────────────────

create table if not exists public.masters (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  user_email    text not null,
  created_at    timestamptz default now() not null,
  file_name     text not null,
  mode          text not null default 'auto',
  platform_preset text,
  input_lufs    float,
  output_lufs   float,
  output_peak   float,
  waveform      jsonb default '[]'::jsonb
);

alter table public.masters enable row level security;

-- Users can read/insert their own rows; admin (jad) can read everything
create policy "Users manage own masters"
  on public.masters for all
  using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') = 'jad.halabi.123@gmail.com'
  )
  with check (auth.uid() = user_id);
