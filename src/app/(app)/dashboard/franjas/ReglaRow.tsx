"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarRegla, toggleReglaActiva } from "./actions";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Regla = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  active: boolean;
};

export default function ReglaRow({ regla }: { regla: Regla }) {
  const router = useRouter();
  const [procesando, setProcesando] = useState(false);

  const handleToggle = async () => {
    setProcesando(true);
    await toggleReglaActiva(regla.id, !regla.active);
    setProcesando(false);
    router.refresh();
  };

  const handleEliminar = async () => {
    setProcesando(true);
    await eliminarRegla(regla.id);
    setProcesando(false);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-3">
      <div className="text-sm text-slate-700">
        <span className="font-medium">{DIAS[regla.day_of_week]}</span>{" "}
        {regla.start_time.slice(0, 5)} - {regla.end_time.slice(0, 5)} · bloques de{" "}
        {regla.slot_duration_minutes} min
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full border ${
            regla.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {regla.active ? "Activa" : "Inactiva"}
        </span>
        <button
          type="button"
          disabled={procesando}
          onClick={handleToggle}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
        >
          {regla.active ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={handleEliminar}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
