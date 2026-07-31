-- =====================================================================
-- Hardening: get_available_slots no debería ser invocable sin login
-- =====================================================================
-- Postgres otorga EXECUTE a PUBLIC por defecto al crear una función,
-- sin importar los GRANT explícitos agregados después. La migración
-- 20260731000001 ya le daba EXECUTE a "authenticated", pero nunca
-- revocó el de PUBLIC, así que la función quedaba invocable con solo
-- la anon key (sin sesión). No expone datos sensibles (solo franjas
-- disponibles), pero no era el diseño previsto.
revoke execute on function public.get_available_slots(date, date) from public;
