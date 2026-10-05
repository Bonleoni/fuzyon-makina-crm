-- companies tablosuna şehir ve sektör alanları
alter table public.companies
  add column if not exists city text,
  add column if not exists sector text;

-- leads tablosuna son temas alanı (ileride kullanılacak)
alter table public.leads
  add column if not exists last_contact_at timestamptz;

-- PostgREST şema önbelleğini yenilemek için (gerekirse Dashboard'dan reload)
notify pgrst, 'reload schema';
