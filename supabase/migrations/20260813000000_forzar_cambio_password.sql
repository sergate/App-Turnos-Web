-- =====================================================================
-- Forzar cambio de contraseña en el primer ingreso (personal interno)
-- =====================================================================
alter table public.profiles add column must_change_password boolean not null default false;

-- Cualquier usuario puede limpiar su propio flag (tras cambiar la
-- contraseña), pero no el de otra persona -- por eso SECURITY DEFINER
-- en vez de una policy de update genérica.
create function public.mark_password_changed()
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

grant execute on function public.mark_password_changed() to authenticated;
-- Supabase otorga EXECUTE a anon por defecto en funciones nuevas del
-- schema public -- se lo sacamos explícitamente (ver migración
-- 20260804000000 y 20260731000002 para el mismo problema con otras
-- funciones).
revoke execute on function public.mark_password_changed() from public;
revoke execute on function public.mark_password_changed() from anon;
