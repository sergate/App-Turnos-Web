"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// No debe frenar el login si falla -- es solo trazabilidad para el admin.
async function registrarLogin(supabase: SupabaseClient) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("activity_log").insert({
      actor_id: user.id,
      actor_email: user.email,
      action: "login",
    });
  } catch {
    // ignorado a propósito
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cambiarModo = (nuevoModo: "login" | "signup") => {
    setModo(nuevoModo);
    setError(null);
    setMensajeExito(null);
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    setCargando(true);

    try {
      const supabase = createClient();

      if (modo === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          throw new Error(
            authError.message === "Invalid login credentials"
              ? "Email o contraseña incorrectos."
              : authError.message
          );
        }

        await registrarLogin(supabase);
        router.push("/");
        router.refresh();
        return;
      }

      // --- Crear cuenta de proveedor ---
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }
      if (!companyName.trim()) {
        throw new Error("Ingresá el nombre de tu empresa.");
      }

      const res = await fetch("/api/auth/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo crear la cuenta.");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setMensajeExito("Cuenta creada. Iniciá sesión con tu email y contraseña.");
        setModo("login");
        setPassword("");
        return;
      }

      await registrarLogin(supabase);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Turnos de Entrega</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          {modo === "login" ? "Iniciá sesión para continuar" : "Registrate como proveedor"}
        </p>

        {mensajeExito && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {mensajeExito}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Empresa</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre (opcional)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="+54 9 11 ..."
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              cargando
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {cargando ? "Procesando..." : modo === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          {modo === "login" ? (
            <>
              ¿No tenés cuenta?{" "}
              <button type="button" onClick={() => cambiarModo("signup")} className="text-blue-600 font-medium hover:underline">
                Registrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{" "}
              <button type="button" onClick={() => cambiarModo("login")} className="text-blue-600 font-medium hover:underline">
                Iniciá sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
