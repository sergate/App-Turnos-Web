import { createClient } from "@/lib/supabase/server";
import { getSignedRemitoUrl } from "@/lib/storage";
import { formatFecha } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";
import TurnoActions from "./TurnoActions";

type ProviderInfo = { company_name: string | null; full_name: string | null; phone: string | null } | null;
type RequesterInfo = { email: string | null } | null;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: turnos, error } = await supabase
    .from("turnos")
    .select(
      "id, slot_date, slot_start_time, slot_end_time, detalle, remito_path, created_at, provider_name, requested_by, provider:profiles!turnos_provider_id_fkey(company_name, full_name, phone), requester:profiles!turnos_requested_by_fkey(email)"
    )
    .eq("estado", "pendiente")
    .order("slot_date", { ascending: true })
    .order("slot_start_time", { ascending: true });

  const turnosConFoto = await Promise.all(
    (turnos ?? []).map(async (turno) => ({
      ...turno,
      provider: (Array.isArray(turno.provider) ? turno.provider[0] : turno.provider) as ProviderInfo,
      requester: (Array.isArray(turno.requester) ? turno.requester[0] : turno.requester) as RequesterInfo,
      fotoUrl: await getSignedRemitoUrl(supabase, turno.remito_path),
    }))
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-6">Turnos pendientes de aprobación</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudieron cargar los turnos: {error.message}
        </div>
      )}

      {!error && turnosConFoto.length === 0 && (
        <p className="text-sm text-slate-500">No hay turnos pendientes por el momento.</p>
      )}

      <div className="space-y-3">
        {turnosConFoto.map((turno) => (
          <div key={turno.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-medium text-slate-800 text-sm capitalize">{formatFecha(turno.slot_date)}</p>
                <p className="text-sm text-slate-500">
                  {formatHora(turno.slot_start_time)} - {formatHora(turno.slot_end_time)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">
                  {turno.provider?.company_name ?? turno.provider_name ?? "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {[turno.provider?.full_name, turno.provider?.phone].filter(Boolean).join(" · ")}
                </p>
                {turno.requested_by && (
                  <p className="text-xs text-blue-500" title="Solicitado por Compras MRN">
                    Compras MRN{turno.requester?.email ? ` · ${turno.requester.email}` : ""}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">{turno.detalle}</p>
            {turno.fotoUrl && (
              <a href={turno.fotoUrl} target="_blank" rel="noopener noreferrer" className="inline-block mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={turno.fotoUrl}
                  alt="Foto del remito"
                  className="max-h-40 rounded-lg border border-slate-200"
                />
              </a>
            )}
            <TurnoActions turnoId={turno.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
