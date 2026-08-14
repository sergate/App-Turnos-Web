"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAvailableSlotsByDate, formatHora, type AvailableSlot } from "@/lib/slots";
import { formatFecha } from "@/lib/turnos";
import { aprobarTurno, aprobarConNuevaFecha, rechazarTurno } from "./actions";

const DIAS_A_MOSTRAR = 30;

function rangoFechas(): { from: string; to: string } {
  const hoy = new Date();
  const hasta = new Date();
  hasta.setDate(hoy.getDate() + DIAS_A_MOSTRAR);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toISO(hoy), to: toISO(hasta) };
}

export default function TurnoActions({ turnoId }: { turnoId: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"idle" | "rechazar" | "reprogramar">("idle");
  const [procesando, setProcesando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [slotsPorFecha, setSlotsPorFecha] = useState<Map<string, AvailableSlot[]>>(new Map());
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [fechaSel, setFechaSel] = useState<string | null>(null);
  const [slotSel, setSlotSel] = useState<AvailableSlot | null>(null);

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
    setModo("idle");
  };

  const abrirReprogramar = async () => {
    setModo("reprogramar");
    setError(null);
    setCargandoSlots(true);
    try {
      const supabase = createClient();
      const { from, to } = rangoFechas();
      const data = await getAvailableSlotsByDate(supabase, from, to);
      setSlotsPorFecha(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las franjas.");
    } finally {
      setCargandoSlots(false);
    }
  };

  const confirmarReprogramarYAprobar = async () => {
    if (!slotSel) {
      setError("Elegí una franja.");
      return;
    }
    setProcesando(true);
    setError(null);
    const res = await aprobarConNuevaFecha(turnoId, slotSel.slotDate, slotSel.slotStartTime, slotSel.slotEndTime);
    setProcesando(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo aprobar con la nueva fecha.");
      return;
    }
    setModo("idle");
    router.refresh();
  };

  if (modo === "rechazar") {
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
            onClick={() => setModo("idle")}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (modo === "reprogramar") {
    const fechas = Array.from(slotsPorFecha.keys()).sort();
    const slotsDelDia = fechaSel ? slotsPorFecha.get(fechaSel) ?? [] : [];

    return (
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
        {cargandoSlots && <p className="text-sm text-slate-500">Cargando franjas...</p>}
        {!cargandoSlots && (
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={procesando || !slotSel}
                onClick={confirmarReprogramarYAprobar}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {procesando ? "Guardando..." : "Confirmar nueva fecha y aprobar"}
              </button>
              <button
                type="button"
                onClick={() => setModo("idle")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2">
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
          onClick={abrirReprogramar}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          Reprogramar y aprobar
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={() => setModo("rechazar")}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
