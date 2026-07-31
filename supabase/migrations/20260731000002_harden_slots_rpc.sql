-- =====================================================================
-- Hardening: get_available_slots no debería ser invocable sin login
-- =====================================================================
-- Supabase otorga EXECUTE a "anon" por defecto en funciones nuevas del
-- schema public (vía ALTER DEFAULT PRIVILEGES propio del proyecto, no
-- a través de PUBLIC), así que la función quedaba invocable con solo
-- la anon key (sin sesión), pese al "grant to authenticated" agregado
-- en la migración 20260731000001. Un primer intento de revocar desde
-- PUBLIC no tuvo efecto porque el grant real es directo a "anon" --
-- hay que revocárselo puntualmente. No expone datos sensibles (solo
-- franjas disponibles), pero no era el diseño previsto.
revoke execute on function public.get_available_slots(date, date) from public;
revoke execute on function public.get_available_slots(date, date) from anon;
