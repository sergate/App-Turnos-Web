"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAvailableSlotsByDate, formatHora, type AvailableSlot } from "@/lib/slots";
import { formatFecha } from "@/lib/turnos";
import { solicitarTurnoComex } from "./actions";

const DIAS_A_MOSTRAR = 30;
const MAX_FOTO_MB = 8;

function rangoFechas(): { from: string; to: string } {
  const hoy = new Date();
  const hasta = new Date();
  hasta.setDate(hoy.getDate() + DIAS_A_MOSTRAR);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toISO(hoy), to: toISO(hasta) };
}

export default function SolicitarTurnoComexForm() {
  const [slotsPorFecha, setSlotsPorFecha] = useState<Map<string, AvailableSlot[]>>(new Map());
  const [cargandoSlots, setCargandoSlots] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState<AvailableSlot | null>(null);
  const [providerName, setProviderName] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [detalle, setDetalle] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarSlots = async () => {
    setCargandoSlots(true);
    setErrorCarga(null);
    try {
      const supabase = createClient();
      const { from, to } = rangoFechas();
      const data = await getAvailableSlotsByDate(supabase, from, to);
      setSlotsPorFecha(data);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar las franjas.");
    } finally {
      setCargandoSlots(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    cargarSlots();
  }, []);

  const fechasDisponibles = useMemo(() => Array.from(slotsPorFecha.keys()).sort(), [slotsPorFecha]);
  const slotsDelDia = fechaSeleccionada ? slotsPorFecha.get(fechaSeleccionada) ?? [] : [];

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      setFoto(null);
      setFotoPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Adjuntá una imagen (foto del remito).");
      return;
    }
    if (file.size > MAX_FOTO_MB * 1024 * 1024) {
      setError(`La imagen no puede superar los ${MAX_FOTO_MB} MB.`);
      return;
    }
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!fechaSeleccionada || !slotSeleccionado) {
      setError("Elegí una fecha y una franja horaria.");
      return;
    }
    if (!providerName.trim()) {
      setError("Ingresá el nombre del proveedor.");
      return;
    }

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("slotDate", slotSeleccionado.slotDate);
      fd.set("slotStartTime", slotSeleccionado.slotStartTime);
      fd.set("slotEndTime", slotSeleccionado.slotEndTime);
      fd.set("providerName", providerName.trim());
      fd.set("providerEmail", providerEmail.trim());
      fd.set("detalle", detalle.trim());
      if (foto) fd.set("foto", foto);

      const res = await solicitarTurnoComex(fd);
      if (!res.success) {
        setError(res.error ?? "No se pudo solicitar el turno.");
        if (res.error?.includes("franja")) {
          setSlotSeleccionado(null);
          await cargarSlots();
        }
        return;
      }

      setExito(
        `Solicitud enviada para "${providerName.trim()}" el ${formatFecha(slotSeleccionado.slotDate)}. Queda pendiente de aprobación del depósito.`
      );
      setProviderName("");
      setProviderEmail("");
      setDetalle("");
      setFoto(null);
      setFotoPreview(null);
      setSlotSeleccionado(null);
      await cargarSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-1">Solicitar turno</h1>
      <p className="text-sm text-slate-500 mb-6">
        Sugerí una fecha y franja. El depósito la revisa y puede aprobarla, reprogramarla a otra franja o
        rechazarla según su disponibilidad.
      </p>

      {cargandoSlots && <p className="text-sm text-slate-400">Cargando franjas disponibles...</p>}
      {errorCarga && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          {errorCarga}
        </div>
      )}

      {!cargandoSlots && !errorCarga && fechasDisponibles.length === 0 && (
        <p className="text-sm text-slate-500">No hay franjas disponibles por ahora.</p>
      )}

      {exito && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-4">
          {exito}
        </div>
      )}

      {!cargandoSlots && fechasDisponibles.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Fecha sugerida</label>
            <div className="flex flex-wrap gap-2">
              {fechasDisponibles.map((fecha) => (
                <button
                  key={fecha}
                  type="button"
                  onClick={() => {
                    setFechaSeleccionada(fecha);
                    setSlotSeleccionado(null);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    fechaSeleccionada === fecha
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                  }`}
                >
                  {formatFecha(fecha)}
                </button>
              ))}
            </div>
          </div>

          {fechaSeleccionada && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Franja horaria</label>
              <div className="flex flex-wrap gap-2">
                {slotsDelDia.map((slot) => {
                  const activo = slotSeleccionado?.slotStartTime === slot.slotStartTime;
                  return (
                    <button
                      key={slot.slotStartTime}
                      type="button"
                      onClick={() => setSlotSeleccionado(slot)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        activo
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                    >
                      {formatHora(slot.slotStartTime)} - {formatHora(slot.slotEndTime)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Proveedor</label>
            <input
              type="text"
              required
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Nombre de la empresa"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Email de contacto <span className="text-slate-400 font-normal">(opcional, para avisarle)</span>
            </label>
            <input
              type="email"
              value={providerEmail}
              onChange={(e) => setProviderEmail(e.target.value)}
              placeholder="contacto@proveedor.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Foto del remito <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
            />
            {fotoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Vista previa del remito" className="mt-3 max-h-56 rounded-lg border border-slate-200" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Detalle <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ej: 10 bultos de repuestos"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              enviando ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {enviando ? "Enviando..." : "Solicitar turno"}
          </button>
        </form>
      )}
    </div>
  );
}
