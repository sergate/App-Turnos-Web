"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearRegla } from "./actions";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ReglaForm() {
  const router = useRouter();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (startTime >= endTime) {
      setError("El horario de inicio debe ser anterior al de fin.");
      return;
    }
    setGuardando(true);
    const res = await crearRegla({ dayOfWeek, startTime, endTime, slotDurationMinutes });
    setGuardando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo crear la regla.");
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 mb-6 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Nueva regla</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Día</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
          >
            {DIAS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Bloque (min)</label>
          <input
            type="number"
            min={15}
            step={15}
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
            className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Agregar regla"}
      </button>
    </form>
  );
}
