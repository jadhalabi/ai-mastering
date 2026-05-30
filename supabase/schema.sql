-- MasterAI: masters table
-- Run this once in your Supabase dashboard → SQL Editor

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
