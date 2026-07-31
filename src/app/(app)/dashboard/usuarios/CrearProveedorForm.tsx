"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearProveedor } from "./actions";

export default function CrearProveedorForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTempPassword(null);
    setGuardando(true);
    const res = await crearProveedor({ email, companyName, fullName, phone });
    setGuardando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo crear la cuenta.");
      return;
    }
    setTempPassword(res.tempPassword ?? null);
    setEmail("");
    setCompanyName("");
    setFullName("");
    setPhone("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Dar de alta proveedor</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Empresa"
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
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre de contacto (opcional)"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono (opcional)"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {tempPassword && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          Cuenta creada. Contraseña temporal: <code className="font-mono font-semibold">{tempPassword}</code>
          <br />
          Comunicásela al proveedor -- no se vuelve a mostrar.
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {guardando ? "Creando..." : "Crear proveedor"}
      </button>
    </form>
  );
}
