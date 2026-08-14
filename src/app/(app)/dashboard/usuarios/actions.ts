"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin, supabaseAdminEnvOk } from "@/lib/supabase/admin";

type ActionResult = { success: boolean; error?: string; tempPassword?: string };

type AdminSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  adminId: string;
  adminEmail: string;
};

// Todas las acciones de este archivo son admin-only. RLS ya lo exige para
// leer/escribir profiles y activity_log, pero hace falta chequearlo acá
// también porque crear cuentas usa la Service Role Key (bypassea RLS).
async function requireAdmin(): Promise<{ ok: true; session: AdminSession } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "No autorizado." };

  return { ok: true, session: { supabase, adminId: user.id, adminEmail: user.email ?? "" } };
}

function generarPasswordTemporal(): string {
  return crypto.randomBytes(9).toString("base64url");
}

// Contraseña por defecto para personal interno (corta, fácil de dictar
// por teléfono) -- a diferencia de los proveedores, que reciben una
// aleatoria. Se fuerza el cambio en el primer ingreso vía
// profiles.must_change_password (ver proxy.ts).
const PASSWORD_POR_DEFECTO = "Cambiar123";

async function registrarLog(session: AdminSession, detalle: string) {
  await session.supabase.from("activity_log").insert({
    actor_id: session.adminId,
    actor_email: session.adminEmail,
    action: "usuario_creado",
    detalle,
  });
}

export async function crearProveedor(input: {
  email: string;
  companyName: string;
  fullName?: string;
  phone?: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!supabaseAdminEnvOk) return { success: false, error: "Faltan configurar las variables de Supabase." };

  const email = input.email.trim().toLowerCase();
  const companyName = input.companyName.trim();
  if (!email || !companyName) return { success: false, error: "Email y empresa son obligatorios." };

  const tempPassword = generarPasswordTemporal();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName?.trim() || null,
      company_name: companyName,
      phone: input.phone?.trim() || null,
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message === "User already registered" ? "Ese email ya tiene una cuenta." : authError?.message || "No se pudo crear la cuenta.",
    };
  }

  await registrarLog(auth.session, `Dio de alta al proveedor "${companyName}" (${email}).`);
  revalidatePath("/dashboard/usuarios");
  return { success: true, tempPassword };
}

export async function crearPersonalInterno(input: {
  email: string;
  fullName: string;
  role: "admin" | "supervisor" | "comex";
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!supabaseAdminEnvOk) return { success: false, error: "Faltan configurar las variables de Supabase." };

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email || !fullName) return { success: false, error: "Email y nombre son obligatorios." };

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD_POR_DEFECTO,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message === "User already registered" ? "Ese email ya tiene una cuenta." : authError?.message || "No se pudo crear la cuenta.",
    };
  }

  const { error: roleError } = await auth.session.supabase
    .from("profiles")
    .update({ role: input.role, must_change_password: true })
    .eq("id", authData.user.id);
  if (roleError) {
    return { success: false, error: `Usuario creado, pero no se pudo asignar el rol: ${roleError.message}` };
  }

  await registrarLog(auth.session, `Dio de alta a ${fullName} (${email}) como ${input.role}.`);
  revalidatePath("/dashboard/usuarios");
  return { success: true, tempPassword: PASSWORD_POR_DEFECTO };
}

export async function actualizarRolUsuario(
  profileId: string,
  nuevoRol: "proveedor" | "supervisor" | "admin" | "comex"
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (profileId === auth.session.adminId) return { success: false, error: "No podés cambiar tu propio rol." };

  const { data: target } = await auth.session.supabase.from("profiles").select("email").eq("id", profileId).single();

  const { error } = await auth.session.supabase.from("profiles").update({ role: nuevoRol }).eq("id", profileId);
  if (error) return { success: false, error: error.message };

  await auth.session.supabase.from("activity_log").insert({
    actor_id: auth.session.adminId,
    actor_email: auth.session.adminEmail,
    action: "usuario_rol_actualizado",
    detalle: `Cambió el rol de ${target?.email ?? profileId} a ${nuevoRol}.`,
  });
  revalidatePath("/dashboard/usuarios");
  return { success: true };
}
