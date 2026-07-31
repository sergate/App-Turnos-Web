-- =====================================================================
-- RPC: franjas disponibles en un rango de fechas
-- =====================================================================
-- Expande time_slot_rules en franjas concretas y descarta las que ya
-- tienen un turno no rechazado. SECURITY DEFINER porque un proveedor no
-- puede leer turnos ajenos (RLS), pero sí necesita saber qué franjas
-- están ocupadas -- la función solo devuelve fecha/horario, nunca datos
-- del turno en sí.
create or replace function public.get_available_slots(from_date date, to_date date)
returns table (slot_date date, slot_start_time time, slot_end_time time)
language sql
security definer set search_path = public
stable
as $$
  with days as (
    select d::date as slot_date
    from generate_series(from_date, to_date, interval '1 day') d
  ),
  expanded as (
    select
      days.slot_date,
      (r.start_time + (n * (r.slot_duration_minutes || ' minutes')::interval))::time as slot_start_time,
      (r.start_time + ((n + 1) * (r.slot_duration_minutes || ' minutes')::interval))::time as slot_end_time
    from days
    join public.time_slot_rules r
      on r.active
     and r.day_of_week = extract(dow from days.slot_date)::smallint
    cross join lateral generate_series(
      0,
      floor(
        extract(epoch from (r.end_time - r.start_time)) / (r.slot_duration_minutes * 60)
      )::int - 1
    ) as n
  )
  select e.slot_date, e.slot_start_time, e.slot_end_time
  from expanded e
  where not exists (
    select 1 from public.turnos t
    where t.slot_date = e.slot_date
      and t.slot_start_time = e.slot_start_time
      and t.estado <> 'rechazado'
  )
  order by e.slot_date, e.slot_start_time;
$$;

grant execute on function public.get_available_slots(date, date) to authenticated;
