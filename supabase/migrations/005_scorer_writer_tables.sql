-- Scorer + Writer için ek kolonlar ve tablolar

alter table public.leads
  add column if not exists ai_score_reason text;

-- emails: Almanca e-posta taslakları / gönderimler
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  subject text not null,
  body text not null,
  tone text,
  language text not null default 'de',
  status text not null default 'taslak',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists emails_set_updated_at on public.emails;
create trigger emails_set_updated_at
before update on public.emails
for each row execute function public.set_updated_at();

alter table public.emails enable row level security;
drop policy if exists "Authenticated users can manage emails" on public.emails;
create policy "Authenticated users can manage emails"
on public.emails for all to authenticated
using (true) with check (true);

-- interactions: zaman çizelgesi olayları
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  type text not null,
  direction text not null default 'outbound',
  summary text not null,
  metadata jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.interactions enable row level security;
drop policy if exists "Authenticated users can manage interactions" on public.interactions;
create policy "Authenticated users can manage interactions"
on public.interactions for all to authenticated
using (true) with check (true);

-- product_portfolio zaten 003'te olabilir; yoksa ekle
alter table public.companies
  add column if not exists product_portfolio text;

notify pgrst, 'reload schema';
