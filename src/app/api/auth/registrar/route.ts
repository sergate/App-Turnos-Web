import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabaseAdminEnvOk } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Autoregistro de proveedores desde /login. Crea la cuenta con la Service
// Role Key (email_confirm: true) para que quede confirmada de entrada, sin
// depender de la configuración de "Confirm email" del proyecto de Supabase.
// El trigger on_auth_user_created (ver supabase/migrations) crea el profile
// automáticamente a partir de user_metadata, con role "proveedor" por defecto.
export async function POST(request: NextRequest) {
  if (!supabaseAdminEnvOk) {
    return NextResponse.json(
      { success: false, error: "Faltan configurar las variables de Supabase." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email y contraseña son obligatorios." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    if (!companyName) {
      return NextResponse.json(
        { success: false, error: "El nombre de la empresa es obligatorio." },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
        company_name: companyName,
        phone: phone || null,
      },
    });

    if (authError || !authData.user) {
      throw new Error(
        authError?.message === "User already registered"
          ? "Ese email ya tiene una cuenta."
          : authError?.message || "No se pudo crear la cuenta."
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
