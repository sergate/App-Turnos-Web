export type EstadoTurno = "pendiente" | "aprobado" | "rechazado";

export const ESTADO_LABELS: Record<EstadoTurno, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const ESTADO_STYLES: Record<EstadoTurno, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
};

const DIAS_SEMANA_LARGO = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

export function formatFecha(fechaISO: string): string {
  // fechaISO viene como "YYYY-MM-DD"; se arma la fecha en horario local
  // para evitar el corrimiento de un día que causa `new Date("YYYY-MM-DD")`.
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const diaSemana = DIAS_SEMANA_LARGO[fecha.getDay()];
  return `${diaSemana} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
