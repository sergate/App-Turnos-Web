"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      const { error: rpcError } = await supabase.rpc("mark_password_changed");
      if (rpcError) throw new Error(rpcError.message);

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
        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Cambiá tu contraseña</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Por seguridad, elegí una contraseña nueva antes de seguir usando la app.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nueva contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Repetí la contraseña</label>
            <input
              type="password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
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
              cargando ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {cargando ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
