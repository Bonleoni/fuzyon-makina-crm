-- Agent merkezi: iş logları + şirket zenginleştirme alanları

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null,
  status text not null default 'beklemede',
  input jsonb,
  result jsonb,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

drop trigger if exists agent_jobs_set_updated_at on public.agent_jobs;
create trigger agent_jobs_set_updated_at
before update on public.agent_jobs
for each row execute function public.set_updated_at();

alter table public.agent_jobs enable row level security;

drop policy if exists "Authenticated users can manage agent_jobs" on public.agent_jobs;
create policy "Authenticated users can manage agent_jobs"
on public.agent_jobs
for all
to authenticated
using (true)
with check (true);

alter table public.companies
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists is_distributor boolean,
  add column if not exists is_manufacturer boolean,
  add column if not exists summary text;

alter table public.contacts
  add column if not exists linkedin text;

notify pgrst, 'reload schema';
