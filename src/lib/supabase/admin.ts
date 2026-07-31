import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para uso EXCLUSIVO en el servidor (API routes).
// Usa la Service Role Key, que ignora RLS -- se necesita para crear usuarios
// ya confirmados en el registro. NUNCA exponer esta key al cliente/browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdminEnvOk = !!supabaseUrl && !!supabaseServiceKey;

if (!supabaseAdminEnvOk) {
  console.warn(
    "[supabase/admin] Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
  );
}

// createClient() tira una excepción sincrónica si la URL es inválida, y esa
// excepción rompería el módulo entero antes de que el try/catch de cada
// route la pueda atrapar. Por eso, si faltan las env vars, usamos una URL
// placeholder acá y chequeamos supabaseAdminEnvOk explícitamente en cada uso.
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
