import { createClient } from "@/lib/supabase/server";
import { ACCION_LABELS, type AccionLog } from "@/lib/activityLog";

const LIMITE = 200;

export default async function LogPage() {
  const supabase = await createClient();

  const { data: eventos, error } = await supabase
    .from("activity_log")
    .select("id, actor_email, action, detalle, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-1">Actividad</h1>
      <p className="text-sm text-slate-500 mb-6">Últimas {LIMITE} acciones registradas.</p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudo cargar el historial: {error.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {!error && (eventos ?? []).length === 0 && <p className="text-sm text-slate-400 p-4">Todavía no hay actividad registrada.</p>}
        {(eventos ?? []).map((evento) => (
          <div key={evento.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-slate-800">
                {ACCION_LABELS[evento.action as AccionLog] ?? evento.action}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(evento.created_at).toLocaleString("es-AR")}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">{evento.actor_email}</p>
            {evento.detalle && <p className="text-slate-600 mt-1">{evento.detalle}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
