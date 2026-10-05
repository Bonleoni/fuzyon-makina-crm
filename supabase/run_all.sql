-- =============================================================================
-- Fuzyon Makina CRM — TEK SEFERDE ÇALIŞTIR
-- Supabase Dashboard > SQL Editor > New query > Run
-- Bu dosya: şema + kolonlar + 3 test lead'i
-- =============================================================================

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

-- companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  website text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.companies
  add column if not exists city text,
  add column if not exists sector text,
  add column if not exists industry_focus text,
  add column if not exists product_portfolio text,
  add column if not exists company_size text;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- contacts
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

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- leads
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

alter table public.leads
  add column if not exists last_contact_at timestamptz;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- RLS
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Authenticated users can manage companies" on public.companies;
create policy "Authenticated users can manage companies"
on public.companies for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage contacts" on public.contacts;
create policy "Authenticated users can manage contacts"
on public.contacts for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage leads" on public.leads;
create policy "Authenticated users can manage leads"
on public.leads for all to authenticated
using (true) with check (true);

-- Service role / anon için de okuma-yazma (admin seed kolaylığı)
-- Not: Tek kullanıcılı iç CRM; authenticated politikası yeterli.
-- Schema cache yenile
notify pgrst, 'reload schema';

-- =============================================================================
-- SEED: 3 DACH test firması
-- =============================================================================

with company_insert as (
  insert into public.companies (
    name, country, city, sector, website,
    industry_focus, product_portfolio, company_size
  )
  select
    'Bayern Food Process GmbH',
    'DE',
    'München',
    'food',
    'https://www.bayern-food-process-example.de',
    'Süt ürünleri ve sos üretimi için proses ekipmanları',
    'Paslanmaz çelik depolama tankları, karıştırıcılı proses tankları, CIP sistemleri',
    '51-200'
  where not exists (
    select 1 from public.companies where name = 'Bayern Food Process GmbH'
  )
  returning id
),
contacts_insert as (
  insert into public.contacts (company_id, full_name, email, phone, job_title)
  select c.id, v.full_name, v.email, v.phone, v.job_title
  from company_insert c
  cross join (
    values
      ('Thomas Berger', 't.berger@bayern-food-process-example.de', '+49 89 4512300', 'Einkaufsleiter'),
      ('Julia Hoffmann', 'j.hoffmann@bayern-food-process-example.de', '+49 89 4512301', 'Prozessingenieurin')
  ) as v(full_name, email, phone, job_title)
  returning id, company_id
)
insert into public.leads (company_id, contact_id, status, ai_score, notes, last_contact_at)
select
  ct.company_id,
  (select id from contacts_insert order by id limit 1),
  'new',
  78,
  'Münih merkezli gıda proses distribütörü. Paslanmaz tank talebi yüksek görünüyor.',
  null
from (select distinct company_id from contacts_insert) ct;

with company_insert as (
  insert into public.companies (
    name, country, city, sector, website,
    industry_focus, product_portfolio, company_size
  )
  select
    'Alpine Pharma Solutions AG',
    'CH',
    'Zürich',
    'pharma',
    'https://www.alpine-pharma-solutions-example.ch',
    'İlaç ve biyoteknoloji tesisleri için hijyenik proses ekipmanı',
    'Farmakope uyumlu paslanmaz tanklar, steril depolama, sıcaklık kontrollü sistemler',
    '11-50'
  where not exists (
    select 1 from public.companies where name = 'Alpine Pharma Solutions AG'
  )
  returning id
),
contacts_insert as (
  insert into public.contacts (company_id, full_name, email, phone, job_title)
  select c.id, v.full_name, v.email, v.phone, v.job_title
  from company_insert c
  cross join (
    values
      ('Sophie Keller', 's.keller@alpine-pharma-solutions-example.ch', '+41 44 5566770', 'Procurement Manager'),
      ('Luca Meier', 'l.meier@alpine-pharma-solutions-example.ch', '+41 44 5566771', 'Technical Buyer')
  ) as v(full_name, email, phone, job_title)
  returning id, company_id
)
insert into public.leads (company_id, contact_id, status, ai_score, notes, last_contact_at)
select
  ct.company_id,
  (select id from contacts_insert order by id limit 1),
  'contacted',
  86,
  'İlk Almanca tanıtım e-postası gönderildi. GMP odaklı tank çözümlerine ilgi var.',
  timezone('utc', now())
from (select distinct company_id from contacts_insert) ct;

with company_insert as (
  insert into public.companies (
    name, country, city, sector, website,
    industry_focus, product_portfolio, company_size
  )
  select
    'Donau Chemie Technik GmbH',
    'AT',
    'Wien',
    'chemical',
    'https://www.donau-chemie-technik-example.at',
    'Kimya endüstrisi için proses ve depolama çözümleri',
    'Asit/alkali dayanımlı paslanmaz tanklar, karıştırmalı reaktör tankları, transfer sistemleri',
    '51-200'
  where not exists (
    select 1 from public.companies where name = 'Donau Chemie Technik GmbH'
  )
  returning id
),
contacts_insert as (
  insert into public.contacts (company_id, full_name, email, phone, job_title)
  select c.id, v.full_name, v.email, v.phone, v.job_title
  from company_insert c
  cross join (
    values
      ('Anna Hofbauer', 'a.hofbauer@donau-chemie-technik-example.at', '+43 1 8901122', 'Sales Director')
  ) as v(full_name, email, phone, job_title)
  returning id, company_id
)
insert into public.leads (company_id, contact_id, status, ai_score, notes, last_contact_at)
select
  ct.company_id,
  (select id from contacts_insert order by id limit 1),
  'replied',
  74,
  'Müşteri yanıt verdi; teknik spesifikasyon ve kapasite bilgisi istedi.',
  timezone('utc', now())
from (select distinct company_id from contacts_insert) ct;

notify pgrst, 'reload schema';

-- =============================================================================
-- Agent merkezi tabloları / zenginleştirme alanları (004)
-- =============================================================================

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

-- =============================================================================
-- 005: Scorer + Writer (ai_score_reason, emails, interactions)
-- =============================================================================

alter table public.leads
  add column if not exists ai_score_reason text;

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

alter table public.companies
  add column if not exists product_portfolio text;

notify pgrst, 'reload schema';
