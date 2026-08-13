-- =====================================================================
-- Reprogramar (staff) y eliminar (admin) turnos ya otorgados
-- =====================================================================
-- Reprogramar (UPDATE de slot_date/slot_start_time/slot_end_time) ya
-- funciona con la policy existente "turnos: staff aprueba o rechaza"
-- (is_staff() sin restricción de columnas). Solo falta la policy de
-- DELETE, que no existía -- reservada a admin.

create policy "turnos: admin elimina turnos"
  on public.turnos for delete
  using (public.is_admin());
