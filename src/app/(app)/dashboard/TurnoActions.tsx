"use client";

import { useState } from "react";
import { aprobarTurno, rechazarTurno } from "./actions";

export default function TurnoActions({ turnoId }: { turnoId: string }) {
  const [procesando, setProcesando] = useState(false);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAprobar = async () => {
    setError(null);
    setProcesando(true);
    const res = await aprobarTurno(turnoId);
    setProcesando(false);
    if (!res.success) setError(res.error ?? "No se pudo aprobar el turno.");
  };

  const handleRechazar = async () => {
    setError(null);
    setProcesando(true);
    const res = await rechazarTurno(turnoId, motivo);
    setProcesando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo rechazar el turno.");
      return;
    }
    setMostrarRechazo(false);
  };

  if (mostrarRechazo) {
    return (
      <div className="space-y-2">
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Motivo del rechazo (opcional)"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={procesando}
            onClick={handleRechazar}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {procesando ? "Enviando..." : "Confirmar rechazo"}
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={() => setMostrarRechazo(false)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={procesando}
          onClick={handleAprobar}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {procesando ? "Procesando..." : "Aprobar"}
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={() => setMostrarRechazo(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
