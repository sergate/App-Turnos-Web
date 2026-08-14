"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarUsuarioInterno } from "./actions";

export default function EliminarUsuarioButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEliminar = async () => {
    setProcesando(true);
    setError(null);
    const res = await eliminarUsuarioInterno(profileId);
    setProcesando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo eliminar el usuario.");
      return;
    }
    router.refresh();
  };

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          disabled={procesando}
          onClick={handleEliminar}
          className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded disabled:opacity-50"
        >
          {procesando ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={() => setConfirmando(false)}
          className="text-xs font-medium text-slate-500 hover:bg-slate-100 px-2 py-1 rounded"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="text-xs font-medium text-red-600 hover:underline"
    >
      Eliminar
    </button>
  );
}
