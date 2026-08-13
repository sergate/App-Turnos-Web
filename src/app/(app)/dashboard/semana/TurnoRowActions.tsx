"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAvailableSlotsByDate, formatHora, type AvailableSlot } from "@/lib/slots";
import { formatFecha } from "@/lib/turnos";
import { reprogramarTurno, eliminarTurno } from "./actions";

const DIAS_A_MOSTRAR = 30;

function rangoFechas(): { from: string; to: string } {
  const hoy = new Date();
  const hasta = new Date();
  hasta.setDate(hoy.getDate() + DIAS_A_MOSTRAR);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toISO(hoy), to: toISO(hasta) };
}

export default function TurnoRowActions({ turnoId, esAdmin }: { turnoId: string; esAdmin: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<"idle" | "reprogramar" | "eliminar">("idle");
  const [slotsPorFecha, setSlotsPorFecha] = useState<Map<string, AvailableSlot[]>>(new Map());
  const [cargando, setCargando] = useState(false);
  const [fechaSel, setFechaSel] = useState<string | null>(null);
  const [slotSel, setSlotSel] = useState<AvailableSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const abrirReprogramar = async () => {
    setModo("reprogramar");
    setError(null);
    setCargando(true);
    try {
      const supabase = createClient();
      const { from, to } = rangoFechas();
      const data = await getAvailableSlotsByDate(supabase, from, to);
      setSlotsPorFecha(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las franjas.");
    } finally {
      setCargando(false);
    }
  };

  const confirmarReprogramacion = async () => {
    if (!slotSel) {
      setError("Elegí una franja.");
      return;
    }
    setProcesando(true);
    setError(null);
    const res = await reprogramarTurno(turnoId, slotSel.slotDate, slotSel.slotStartTime, slotSel.slotEndTime);
    setProcesando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo reprogramar.");
      return;
    }
    setModo("idle");
    router.refresh();
  };

  const confirmarEliminacion = async () => {
    setProcesando(true);
    setError(null);
    const res = await eliminarTurno(turnoId);
    setProcesando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  };

  if (modo === "idle") {
    return (
      <div className="flex gap-3 mt-1">
        <button type="button" onClick={abrirReprogramar} className="text-xs font-medium text-blue-600 hover:underline">
          Reprogramar
        </button>
        {esAdmin && (
          <button
            type="button"
            onClick={() => setModo("eliminar")}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Eliminar
          </button>
        )}
      </div>
    );
  }

  if (modo === "eliminar") {
    return (
      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
        <p className="text-xs text-red-700 mb-2">¿Eliminar este turno? No se puede deshacer.</p>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={procesando}
            onClick={confirmarEliminacion}
            className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {procesando ? "Eliminando..." : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setModo("idle")}
            className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const fechas = Array.from(slotsPorFecha.keys()).sort();
  const slotsDelDia = fechaSel ? slotsPorFecha.get(fechaSel) ?? [] : [];

  return (
    <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
      {cargando && <p className="text-xs text-slate-500">Cargando franjas...</p>}
      {!cargando && (
        <>
          <div className="flex flex-wrap gap-1">
            {fechas.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFechaSel(f);
                  setSlotSel(null);
                }}
                className={`px-2 py-1 rounded text-xs border ${
                  fechaSel === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300"
                }`}
              >
                {formatFecha(f)}
              </button>
            ))}
          </div>
          {fechaSel && (
            <div className="flex flex-wrap gap-1">
              {slotsDelDia.map((slot) => (
                <button
                  key={slot.slotStartTime}
                  type="button"
                  onClick={() => setSlotSel(slot)}
                  className={`px-2 py-1 rounded text-xs border ${
                    slotSel?.slotStartTime === slot.slotStartTime
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  {formatHora(slot.slotStartTime)} - {formatHora(slot.slotEndTime)}
                </button>
              ))}
              {slotsDelDia.length === 0 && <p className="text-xs text-slate-400">Sin franjas libres ese día.</p>}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={procesando || !slotSel}
              onClick={confirmarReprogramacion}
              className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {procesando ? "Guardando..." : "Confirmar reprogramación"}
            </button>
            <button
              type="button"
              onClick={() => setModo("idle")}
              className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
