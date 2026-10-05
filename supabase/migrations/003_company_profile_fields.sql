-- Şirket profil alanları (seed ve zenginleştirme için)
alter table public.companies
  add column if not exists industry_focus text,
  add column if not exists product_portfolio text,
  add column if not exists company_size text;

notify pgrst, 'reload schema';
