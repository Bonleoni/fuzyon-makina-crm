-- =============================================================================
-- Fuzyon Makina CRM — Seed Data (yedek / manuel)
-- =============================================================================
-- Kullanım: Supabase Dashboard > SQL Editor içinde çalıştırın.
-- Önkoşul migration'lar:
--   1) 001_initial_schema.sql
--   2) 002_company_city_sector.sql
--   3) 003_company_profile_fields.sql
--
-- Bu dosya API seed (/api/seed) ile aynı 3 DACH firmasını ekler.
-- Aynı şirket adı varsa tekrar eklememek için NOT EXISTS kontrolü kullanılır.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Almanya / Münih — Gıda sektörü distribütörü
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2) İsviçre / Zürih — İlaç sektörü distribütörü
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3) Avusturya / Viyana — Kimya sektörü distribütörü
-- -----------------------------------------------------------------------------
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
