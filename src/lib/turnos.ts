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

const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Parsea "YYYY-MM-DD" en horario local, evitando el corrimiento de un día
// que causa `new Date("YYYY-MM-DD")` (la interpreta como UTC medianoche).
export function parseFechaISO(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toFechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export function formatFecha(fechaISO: string): string {
  const fecha = parseFechaISO(fechaISO);
  const [y, m, d] = fechaISO.split("-").map(Number);
  const diaSemana = DIAS_SEMANA_LARGO[fecha.getDay()];
  return `${diaSemana} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatFechaCorta(fechaISO: string): string {
  const fecha = parseFechaISO(fechaISO);
  const [, m, d] = fechaISO.split("-").map(Number);
  return `${DIAS_SEMANA_CORTO[fecha.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export type SemanaRange = { start: string; end: string; days: string[] };

// Semana de lunes a domingo que contiene fechaISO.
export function getWeekRange(fechaISO: string): SemanaRange {
  const fecha = parseFechaISO(fechaISO);
  const dow = fecha.getDay(); // 0=domingo
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(fecha);
  monday.setDate(fecha.getDate() + diffToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(toFechaISO(d));
  }
  return { start: days[0], end: days[6], days };
}

export function addDaysISO(fechaISO: string, dias: number): string {
  const fecha = parseFechaISO(fechaISO);
  fecha.setDate(fecha.getDate() + dias);
  return toFechaISO(fecha);
}

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Formatea un timestamp (ISO con hora, ej. de activity_log.created_at) fijo
// en horario de Buenos Aires -- sin esto, toLocaleString() usa la zona
// horaria del entorno donde corre (UTC en Vercel), no la del usuario.
export function formatFechaHora(timestampISO: string): string {
  return new Date(timestampISO).toLocaleString("es-AR", { timeZone: ZONA_HORARIA });
}
