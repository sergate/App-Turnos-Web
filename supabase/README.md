# Supabase

Este proyecto no usa la Supabase CLI (no está instalada localmente). El
schema vive versionado en `migrations/` como SQL plano, para aplicarse
manualmente desde el SQL Editor del dashboard de Supabase.

## Setup inicial

1. Crear un proyecto en https://supabase.com/dashboard.
2. En **Project Settings > API**, copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (solo si se necesita más adelante para operaciones admin server-side)
3. Pegar esos valores en `.env.local` (copiar desde `.env.local.example`).
4. En **SQL Editor**, pegar y ejecutar el contenido de `migrations/20260731000000_init.sql`.
5. Para asignar el primer usuario admin: registrarse normalmente desde la
   app (queda como `proveedor` por defecto) y luego correr en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
   ```
