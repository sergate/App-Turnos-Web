-- =====================================================================
-- Schema inicial: turnos de entrega de mercadería
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'proveedor' check (role in ('proveedor', 'admin')),
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos extendidos de cada usuario (proveedor o admin). role se asigna manualmente en el SQL editor para admins.';

-- Crea el profile automáticamente cuando se registra un usuario nuevo.
-- Los datos (full_name, company_name, phone) se completan desde el
-- user_metadata pasado en supabase.auth.signUp().
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper para políticas RLS: evita recursión al chequear el rol admin
-- (SECURITY DEFINER hace que la consulta ignore RLS de profiles).
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles: el usuario ve su propio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: admin ve todos los perfiles"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: el usuario edita su propio perfil"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = 'proveedor');

-- ---------------------------------------------------------------------
-- time_slot_rules: reglas recurrentes que definen franjas horarias
-- ---------------------------------------------------------------------
create table public.time_slot_rules (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int not null default 60 check (slot_duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint time_range_valid check (end_time > start_time)
);

comment on column public.time_slot_rules.day_of_week is '0=domingo, 1=lunes, ..., 6=sábado (igual que EXTRACT(DOW).)';

alter table public.time_slot_rules enable row level security;

create policy "time_slot_rules: cualquier usuario autenticado puede leer reglas activas"
  on public.time_slot_rules for select
  to authenticated
  using (active or public.is_admin());

create policy "time_slot_rules: solo admin administra reglas"
  on public.time_slot_rules for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- turnos: solicitudes de turno de entrega
-- ---------------------------------------------------------------------
-- Nota de diseño: en vez de una tabla `time_slots` intermedia, la franja
-- reservada se guarda directamente en el turno (slot_date + horarios,
-- derivados de time_slot_rules al momento de la solicitud). Un índice
-- único parcial garantiza "1 turno por franja" a nivel de base de datos,
-- evitando condiciones de carrera entre dos proveedores reservando la
-- misma franja al mismo tiempo.
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  slot_date date not null,
  slot_start_time time not null,
  slot_end_time time not null,
  detalle text not null,
  remito_path text not null, -- path del objeto en el bucket privado "remitos" (no URL pública)
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index turnos_slot_unico
  on public.turnos (slot_date, slot_start_time)
  where estado <> 'rechazado';

create index turnos_provider_idx on public.turnos (provider_id);
create index turnos_estado_idx on public.turnos (estado);

alter table public.turnos enable row level security;

create policy "turnos: el proveedor ve sus propios turnos"
  on public.turnos for select
  using (provider_id = auth.uid());

create policy "turnos: admin ve todos los turnos"
  on public.turnos for select
  using (public.is_admin());

create policy "turnos: el proveedor crea turnos propios en estado pendiente"
  on public.turnos for insert
  with check (
    provider_id = auth.uid()
    and estado = 'pendiente'
  );

create policy "turnos: solo admin aprueba o rechaza"
  on public.turnos for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage: bucket privado para las fotos de remito
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('remitos', 'remitos', false)
on conflict (id) do nothing;

-- Convención de path: {provider_id}/{nombre-archivo}, para poder
-- restringir el acceso por dueño usando el primer segmento del path.
create policy "remitos: el proveedor sube a su propia carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'remitos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "remitos: el proveedor lee sus propios remitos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'remitos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "remitos: admin lee todos los remitos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'remitos' and public.is_admin());
