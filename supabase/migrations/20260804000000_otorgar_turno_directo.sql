-- =====================================================================
-- Turnos otorgados directamente por el personal interno (sin que el
-- proveedor los solicite ni tenga cuenta).
-- =====================================================================

alter table public.turnos alter column provider_id drop not null;
alter table public.turnos alter column remito_path drop not null;

alter table public.turnos
  add column provider_name text,
  add column provider_contact_email text,
  add column created_by uuid references public.profiles (id) on delete set null;

comment on column public.turnos.provider_name is 'Nombre de proveedor sin cuenta, cuando el turno lo carga el personal interno directamente.';
comment on column public.turnos.created_by is 'Quién cargó el turno directamente (null si lo solicitó el propio proveedor).';

-- Todo turno necesita alguna forma de identificar al proveedor: o bien un
-- provider_id (proveedor con cuenta) o un provider_name (cargado a mano).
alter table public.turnos
  add constraint turnos_provider_identificado
  check (provider_id is not null or provider_name is not null);

-- Si el turno lo autogestionó el proveedor (created_by nulo), la foto del
-- remito sigue siendo obligatoria -- solo se vuelve opcional cuando lo
-- carga el personal interno directamente.
alter table public.turnos
  add constraint turnos_remito_requerido_si_autogestionado
  check (created_by is not null or remito_path is not null);

create policy "turnos: staff otorga turnos directamente"
  on public.turnos for insert
  with check (public.is_staff() and created_by = auth.uid() and estado = 'aprobado');

-- El personal interno (no solo admin) necesita poder ver las fotos de
-- remito de turnos que otro compañero cargó o aprobó.
drop policy "remitos: admin lee todos los remitos" on storage.objects;
create policy "remitos: staff lee todos los remitos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'remitos' and public.is_staff());
