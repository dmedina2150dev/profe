-- ---------------------------------------------------------------------------
-- profe — esqueleto MÍNIMO de lo que Supabase provee y Postgres a secas no.
--
-- SÓLO se aplica a la base de datos local `profe_test`. En el proyecto real de
-- Supabase, el esquema `auth`, los roles y `auth.uid()` ya existen: aplicar
-- esto allí sería un error. `the_profe-server/scripts/apply-migrations.sh` es el único
-- que lo ejecuta, y sólo contra TEST_DATABASE_URL.
--
-- Existe para que las políticas RLS de las migraciones se puedan PROBAR de
-- verdad en el gate del paso 3, en vez de darlas por buenas.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create schema if not exists auth;

-- Roles que Supabase define y contra los que se escriben las políticas.
-- `create role` no admite IF NOT EXISTS, de ahí el bloque.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

grant select on auth.users to authenticated, service_role;

-- Misma implementación que Supabase: el sujeto del JWT que el pooler deja en
-- `request.jwt.claims`. Los tests lo fijan con
--   set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
create or replace function auth.uid() returns uuid
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
  language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''),
    'anon'
  )
$$;
