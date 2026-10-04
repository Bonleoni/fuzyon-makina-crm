-- Fuzyon Makina CRM — ilk şema
-- Tablolar: companies, contacts, leads
-- RLS: authenticated kullanıcılar tam erişim

-- updated_at otomatik güncelleme fonksiyonu
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies: DACH bölgesindeki potansiyel firma / distribütör kayıtları
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  website text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: firmaya bağlı kişi bilgileri
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- leads: satış hunisindeki fırsatlar
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null default 'new',
  ai_score integer default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leads_ai_score_range check (ai_score >= 0 and ai_score <= 100)
);

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS politikaları: giriş yapmış kullanıcılar tüm satırlara erişebilir
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;

create policy "Authenticated users can manage companies"
on public.companies
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage contacts"
on public.contacts
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage leads"
on public.leads
for all
to authenticated
using (true)
with check (true);
