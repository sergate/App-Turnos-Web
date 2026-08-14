import { createClient } from "@/lib/supabase/server";
import { formatFecha, ESTADO_LABELS, ESTADO_STYLES, type EstadoTurno } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

export default async function SolicitudesComexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: turnos, error } = await supabase
    .from("turnos")
    .select(
      "id, provider_name, slot_date, slot_start_time, slot_end_time, requested_date, requested_start_time, requested_end_time, estado, motivo_rechazo, created_at"
    )
    .eq("requested_by", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-6">Mis solicitudes</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudieron cargar tus solicitudes: {error.message}
        </div>
      )}

      {!error && (turnos ?? []).length === 0 && (
        <p className="text-sm text-slate-500">Todavía no solicitaste ningún turno.</p>
      )}

      <div className="space-y-3">
        {(turnos ?? []).map((turno) => {
          const estado = turno.estado as EstadoTurno;
          const reprogramado =
            turno.requested_date !== turno.slot_date || turno.requested_start_time !== turno.slot_start_time;
          return (
            <div key={turno.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-medium text-slate-800 text-sm">{turno.provider_name}</p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADO_STYLES[estado]}`}>
                  {ESTADO_LABELS[estado]}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                Solicitaste: {formatFecha(turno.requested_date)}, {formatHora(turno.requested_start_time)} -{" "}
                {formatHora(turno.requested_end_time)}
              </p>

              {reprogramado && estado === "aprobado" && (
                <p className="text-sm text-blue-600 mt-1">
                  El depósito lo reprogramó para: {formatFecha(turno.slot_date)}, {formatHora(turno.slot_start_time)} -{" "}
                  {formatHora(turno.slot_end_time)}
                </p>
              )}

              {estado === "rechazado" && turno.motivo_rechazo && (
                <p className="text-sm text-red-600 mt-1">Motivo: {turno.motivo_rechazo}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
