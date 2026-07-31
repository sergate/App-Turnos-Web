import { createClient } from "@/lib/supabase/server";
import ReglaForm from "./ReglaForm";
import ReglaRow from "./ReglaRow";

export default async function FranjasPage() {
  const supabase = await createClient();

  const { data: reglas, error } = await supabase
    .from("time_slot_rules")
    .select("id, day_of_week, start_time, end_time, slot_duration_minutes, active")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-6">Franjas horarias</h1>

      <ReglaForm />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
          No se pudieron cargar las reglas: {error.message}
        </div>
      )}

      {!error && (reglas ?? []).length === 0 && (
        <p className="text-sm text-slate-500">Todavía no hay reglas cargadas.</p>
      )}

      <div className="space-y-2">
        {(reglas ?? []).map((regla) => (
          <ReglaRow key={regla.id} regla={regla} />
        ))}
      </div>
    </div>
  );
}
