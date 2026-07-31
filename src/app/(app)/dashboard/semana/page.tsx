import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatHora } from "@/lib/slots";
import { addDaysISO, formatFechaCorta, getWeekRange, toFechaISO } from "@/lib/turnos";
import SemanaDatePicker from "./SemanaDatePicker";

type ProviderInfo = { company_name: string | null; full_name: string | null } | null;

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : toFechaISO(new Date());
  const semana = getWeekRange(fecha);

  const supabase = await createClient();
  const { data: turnos, error } = await supabase
    .from("turnos")
    .select(
      "id, slot_date, slot_start_time, slot_end_time, detalle, provider:profiles!turnos_provider_id_fkey(company_name, full_name)"
    )
    .eq("estado", "aprobado")
    .gte("slot_date", semana.start)
    .lte("slot_date", semana.end)
    .order("slot_date", { ascending: true })
    .order("slot_start_time", { ascending: true });

  const turnosPorDia = new Map<string, { id: string; horario: string; provider: ProviderInfo; detalle: string }[]>();
  for (const turno of turnos ?? []) {
    const provider = (Array.isArray(turno.provider) ? turno.provider[0] : turno.provider) as ProviderInfo;
    const entry = {
      id: turno.id,
      horario: `${formatHora(turno.slot_start_time)} - ${formatHora(turno.slot_end_time)}`,
      provider,
      detalle: turno.detalle,
    };
    const existing = turnosPorDia.get(turno.slot_date);
    if (existing) existing.push(entry);
    else turnosPorDia.set(turno.slot_date, [entry]);
  }

  const semanaAnterior = addDaysISO(semana.start, -7);
  const semanaSiguiente = addDaysISO(semana.start, 7);
  const totalTurnos = turnos?.length ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-bold text-slate-800">Turnos otorgados de la semana</h1>
        <SemanaDatePicker fecha={fecha} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/dashboard/semana?fecha=${semanaAnterior}`}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← Semana anterior
        </Link>
        <p className="text-sm text-slate-500">
          {formatFechaCorta(semana.start)} — {formatFechaCorta(semana.end)} · {totalTurnos}{" "}
          {totalTurnos === 1 ? "turno" : "turnos"}
        </p>
        <Link
          href={`/dashboard/semana?fecha=${semanaSiguiente}`}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Semana siguiente →
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudieron cargar los turnos: {error.message}
        </div>
      )}

      <div className="space-y-3">
        {semana.days.map((dia) => {
          const turnosDelDia = turnosPorDia.get(dia) ?? [];
          return (
            <div key={dia} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2 capitalize">{formatFechaCorta(dia)}</p>
              {turnosDelDia.length === 0 ? (
                <p className="text-sm text-slate-400">Sin turnos otorgados.</p>
              ) : (
                <div className="space-y-2">
                  {turnosDelDia.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-700">{t.horario}</span>
                      <span className="text-slate-600">{t.provider?.company_name ?? "—"}</span>
                      <span className="text-slate-400 text-xs w-full sm:w-auto">{t.detalle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
