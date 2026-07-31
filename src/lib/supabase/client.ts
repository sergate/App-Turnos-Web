import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el NAVEGADOR (login, logout, sesión).
// Usa la key pública (anon), que respeta RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
