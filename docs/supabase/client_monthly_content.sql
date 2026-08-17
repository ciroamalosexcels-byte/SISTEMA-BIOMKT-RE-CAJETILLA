create table public.client_monthly_content (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.leads(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  historias_hechas integer not null default 0,
  historias_contratadas integer not null default 0,
  reels_hechos integer not null default 0,
  reels_contratados integer not null default 0,
  publicaciones_hechas integer not null default 0,
  publicaciones_contratadas integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);

alter table public.client_monthly_content enable row level security;
revoke all on table public.client_monthly_content from public, anon, authenticated;
grant select, insert, update on table public.client_monthly_content to service_role;

create trigger trg_client_monthly_content_updated_at
  before update on public.client_monthly_content
  for each row execute function set_updated_at();

-- Migración de datos (aplicada una sola vez): copia los valores no-null de las
-- 6 columnas viejas de leads como el registro de agosto 2026 (mes actual al
-- momento del cambio), luego elimina las columnas viejas.
insert into public.client_monthly_content (
  client_id, month,
  historias_hechas, historias_contratadas,
  reels_hechos, reels_contratados,
  publicaciones_hechas, publicaciones_contratadas
)
select
  id, '2026-08',
  coalesce(historias_hechas, 0), coalesce(historias_contratadas, 0),
  coalesce(reels_hechos, 0), coalesce(reels_contratados, 0),
  coalesce(publicaciones_hechas, 0), coalesce(publicaciones_contratadas, 0)
from public.leads
where historias_hechas is not null
   or historias_contratadas is not null
   or reels_hechos is not null
   or reels_contratados is not null
   or publicaciones_hechas is not null
   or publicaciones_contratadas is not null;

alter table public.leads
  drop column historias_hechas,
  drop column historias_contratadas,
  drop column reels_hechos,
  drop column reels_contratados,
  drop column publicaciones_hechas,
  drop column publicaciones_contratadas;
