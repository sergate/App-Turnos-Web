"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarRolUsuario } from "./actions";

type Rol = "proveedor" | "supervisor" | "admin";

export default function RolSelector({
  profileId,
  role,
  esUnoMismo,
}: {
  profileId: string;
  role: Rol;
  esUnoMismo: boolean;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoRol = e.target.value as Rol;
    setError(null);
    setGuardando(true);
    const res = await actualizarRolUsuario(profileId, nuevoRol);
    setGuardando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo actualizar el rol.");
      return;
    }
    router.refresh();
  };

  if (esUnoMismo) {
    return <span className="text-xs text-slate-400">Vos</span>;
  }

  return (
    <div>
      <select
        defaultValue={role}
        onChange={handleChange}
        disabled={guardando}
        className="px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white disabled:opacity-50"
      >
        <option value="proveedor">Proveedor</option>
        <option value="supervisor">Supervisor</option>
        <option value="admin">Admin</option>
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
