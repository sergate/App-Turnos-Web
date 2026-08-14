-- =====================================================================
-- Módulo Comex: solicitar turnos para proveedores nacionales, con
-- fecha sugerida. El depósito puede aprobar tal cual, aprobar con otra
-- fecha (reprogramando en el mismo paso), o rechazar.
-- =====================================================================

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('proveedor', 'supervisor', 'admin', 'comex'));

create function public.is_comex()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'comex'
  );
$$;

-- requested_by/requested_* guardan quién pidió el turno y qué fecha/
-- franja sugirió originalmente -- slot_date/slot_start_time/slot_end_time
-- pasan a ser la franja VIGENTE (se puede reprogramar al aprobar), así
-- que sin estas columnas se perdería el dato de qué se pidió en un
-- principio.
alter table public.turnos
  add column requested_by uuid references public.profiles (id) on delete set null,
  add column requested_date date,
  add column requested_start_time time,
  add column requested_end_time time;

comment on column public.turnos.requested_by is 'Usuario de Comex que solicitó el turno (null si no fue una solicitud de Comex).';
comment on column public.turnos.requested_date is 'Fecha originalmente sugerida por Comex, se conserva aunque el depósito reprograme.';

-- El remito ya era opcional para turnos otorgados directamente
-- (created_by); ahora también lo es para solicitudes de Comex, que
-- rara vez tienen la foto al momento de pedir el turno.
alter table public.turnos drop constraint turnos_remito_requerido_si_autogestionado;
alter table public.turnos
  add constraint turnos_remito_requerido_si_autogestionado
  check (created_by is not null or requested_by is not null or remito_path is not null);

create policy "turnos: comex solicita turnos"
  on public.turnos for insert
  with check (
    public.is_comex()
    and requested_by = auth.uid()
    and estado = 'pendiente'
    and provider_id is null
    and provider_name is not null
  );

-- Comex necesita ver el estado de lo que fue pidiendo (no todos los
-- turnos, como el staff -- solo los propios).
create policy "turnos: comex ve sus propias solicitudes"
  on public.turnos for select
  using (requested_by = auth.uid());
