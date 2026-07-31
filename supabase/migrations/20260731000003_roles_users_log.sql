-- =====================================================================
-- Roles diferenciados (admin/supervisor), gestión de usuarios y log
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nuevo rol "supervisor": puede aprobar/rechazar turnos y ver el
-- dashboard, pero no gestionar usuarios ni franjas horarias (eso queda
-- reservado a "admin").
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('proveedor', 'supervisor', 'admin'));

create function public.is_staff()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'supervisor')
  );
$$;

-- profiles: admin y supervisor necesitan ver los datos del proveedor
-- (empresa, teléfono) para mostrarlos en el dashboard de turnos.
drop policy "profiles: admin ve todos los perfiles" on public.profiles;
create policy "profiles: staff ve todos los perfiles"
  on public.profiles for select
  using (public.is_staff());

-- Solo admin puede editar el perfil de otra persona (p.ej. cambiar rol).
create policy "profiles: admin actualiza cualquier perfil"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- turnos: aprobar/rechazar ahora es tarea de cualquier staff, no solo admin.
drop policy "turnos: admin ve todos los turnos" on public.turnos;
create policy "turnos: staff ve todos los turnos"
  on public.turnos for select
  using (public.is_staff());

drop policy "turnos: solo admin aprueba o rechaza" on public.turnos;
create policy "turnos: staff aprueba o rechaza"
  on public.turnos for update
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------
-- activity_log: quién hizo qué. Append-only (sin policies de update ni
-- delete -- ni siquiera admin puede alterar el historial).
-- ---------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text not null,
  action text not null,
  detalle text,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log: cualquier usuario registra sus propias acciones"
  on public.activity_log for insert
  to authenticated
  with check (actor_id = auth.uid());

create policy "activity_log: solo admin lee el historial"
  on public.activity_log for select
  using (public.is_admin());
