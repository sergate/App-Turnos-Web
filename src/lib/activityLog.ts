export type AccionLog =
  | "login"
  | "turno_aprobado"
  | "turno_rechazado"
  | "turno_otorgado"
  | "turno_solicitado"
  | "turno_reprogramado"
  | "turno_eliminado"
  | "usuario_creado"
  | "usuario_eliminado"
  | "usuario_rol_actualizado"
  | "franja_creada"
  | "franja_actualizada"
  | "franja_eliminada";

export const ACCION_LABELS: Record<AccionLog, string> = {
  login: "Inicio de sesión",
  turno_aprobado: "Aprobó un turno",
  turno_rechazado: "Rechazó un turno",
  turno_otorgado: "Otorgó un turno directamente",
  turno_solicitado: "Solicitó un turno (Compras MRN)",
  turno_reprogramado: "Reprogramó un turno",
  turno_eliminado: "Eliminó un turno",
  usuario_creado: "Dio de alta un usuario",
  usuario_eliminado: "Eliminó un usuario",
  usuario_rol_actualizado: "Cambió un rol",
  franja_creada: "Creó una franja horaria",
  franja_actualizada: "Actualizó una franja horaria",
  franja_eliminada: "Eliminó una franja horaria",
};
