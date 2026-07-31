import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedRemitoUrl } from "@/lib/storage";
import { formatFecha, ESTADO_LABELS, ESTADO_STYLES, type EstadoTurno } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

export default async function MisTurnosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: turnos, error } = await supabase
    .from("turnos")
    .select("id, slot_date, slot_start_time, slot_end_time, detalle, remito_path, estado, motivo_rechazo, created_at")
    .eq("provider_id", user!.id)
    .order("slot_date", { ascending: false })
    .order("slot_start_time", { ascending: false });

  const turnosConFoto = await Promise.all(
    (turnos ?? []).map(async (turno) => ({
      ...turno,
      fotoUrl: await getSignedRemitoUrl(supabase, turno.remito_path),
    }))
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-slate-800">Mis turnos</h1>
        <Link
          href="/nuevo-turno"
          className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Solicitar turno
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudieron cargar tus turnos: {error.message}
        </div>
      )}

      {!error && turnosConFoto.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no solicitaste ningún turno.</p>
      )}

      <div className="space-y-3">
        {turnosConFoto.map((turno) => {
          const estado = turno.estado as EstadoTurno;
          return (
            <div key={turno.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-slate-800 text-sm capitalize">{formatFecha(turno.slot_date)}</p>
                  <p className="text-sm text-slate-500">
                    {formatHora(turno.slot_start_time)} - {formatHora(turno.slot_end_time)}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ESTADO_STYLES[estado]}`}>
                  {ESTADO_LABELS[estado]}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{turno.detalle}</p>
              {estado === "rechazado" && turno.motivo_rechazo && (
                <p className="text-sm text-red-600 mb-2">Motivo: {turno.motivo_rechazo}</p>
              )}
              {turno.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={turno.fotoUrl}
                  alt="Foto del remito"
                  className="max-h-40 rounded-lg border border-slate-200"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
