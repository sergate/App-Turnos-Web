export type AccionLog =
  | "login"
  | "turno_aprobado"
  | "turno_rechazado"
  | "usuario_creado"
  | "usuario_rol_actualizado"
  | "franja_creada"
  | "franja_actualizada"
  | "franja_eliminada";

export const ACCION_LABELS: Record<AccionLog, string> = {
  login: "Inicio de sesión",
  turno_aprobado: "Aprobó un turno",
  turno_rechazado: "Rechazó un turno",
  usuario_creado: "Dio de alta un usuario",
  usuario_rol_actualizado: "Cambió un rol",
  franja_creada: "Creó una franja horaria",
  franja_actualizada: "Actualizó una franja horaria",
  franja_eliminada: "Eliminó una franja horaria",
};
