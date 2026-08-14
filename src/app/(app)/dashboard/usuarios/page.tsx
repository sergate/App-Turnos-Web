import { createClient } from "@/lib/supabase/server";
import CrearProveedorForm from "./CrearProveedorForm";
import CrearPersonalForm from "./CrearPersonalForm";
import RolSelector from "./RolSelector";

const ROL_LABELS: Record<string, string> = {
  proveedor: "Proveedor",
  supervisor: "Supervisor",
  admin: "Admin",
  comex: "Comex",
};

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfiles, error } = await supabase
    .from("profiles")
    .select("id, role, email, full_name, company_name, phone, created_at")
    .order("created_at", { ascending: false });

  const personalInterno = (perfiles ?? []).filter((p) => p.role !== "proveedor");
  const proveedores = (perfiles ?? []).filter((p) => p.role === "proveedor");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-slate-800">Usuarios</h1>

      <CrearProveedorForm />
      <CrearPersonalForm />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          No se pudieron cargar los usuarios: {error.message}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Personal interno</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {personalInterno.length === 0 && <p className="text-sm text-slate-400 p-4">No hay personal interno cargado.</p>}
          {personalInterno.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{p.full_name || "—"}</p>
                <p className="text-slate-500 text-xs">{p.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{ROL_LABELS[p.role] ?? p.role}</span>
                <RolSelector profileId={p.id} role={p.role} esUnoMismo={p.id === user?.id} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Proveedores</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {proveedores.length === 0 && <p className="text-sm text-slate-400 p-4">No hay proveedores cargados.</p>}
          {proveedores.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{p.company_name || "—"}</p>
                <p className="text-slate-500 text-xs">
                  {p.email} {p.phone ? `· ${p.phone}` : ""}
                </p>
              </div>
              <RolSelector profileId={p.id} role={p.role} esUnoMismo={p.id === user?.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
