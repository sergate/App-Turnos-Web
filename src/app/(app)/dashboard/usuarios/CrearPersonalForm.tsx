"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearPersonalInterno } from "./actions";

export default function CrearPersonalForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "supervisor" | "comex">("supervisor");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTempPassword(null);
    setGuardando(true);
    const res = await crearPersonalInterno({ email, fullName, role });
    setGuardando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo crear la cuenta.");
      return;
    }
    setTempPassword(res.tempPassword ?? null);
    setEmail("");
    setFullName("");
    setRole("supervisor");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Dar de alta personal interno</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "supervisor" | "comex")}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
        >
          <option value="supervisor">Supervisor</option>
          <option value="comex">Comex</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {tempPassword && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          Cuenta creada. Contraseña por defecto: <code className="font-mono font-semibold">{tempPassword}</code>
          <br />
          Se le va a pedir cambiarla apenas ingrese por primera vez.
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {guardando ? "Creando..." : "Crear usuario interno"}
      </button>
    </form>
  );
}
