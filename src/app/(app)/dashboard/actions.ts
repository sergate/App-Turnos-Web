"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { formatFecha } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

type ActionResult = { success: boolean; error?: string };

async function notificarYRegistrar(
  supabase: SupabaseClient,
  turnoId: string,
  estado: "aprobado" | "rechazado",
  actorId: string,
  actorEmail: string,
  motivo?: string,
  reprogramado?: boolean
) {
  const { data: turno } = await supabase
    .from("turnos")
    .select(
      "slot_date, slot_start_time, slot_end_time, provider_name, provider_contact_email, provider:profiles!turnos_provider_id_fkey(email, company_name)"
    )
    .eq("id", turnoId)
    .single();

  if (!turno) return;

  const provider = Array.isArray(turno.provider) ? turno.provider[0] : turno.provider;
  const email = provider?.email || turno.provider_contact_email || null;
  const nombre = provider?.company_name || turno.provider_name || "un proveedor";

  const fecha = formatFecha(turno.slot_date);
  const horario = `${formatHora(turno.slot_start_time)} - ${formatHora(turno.slot_end_time)}`;

  if (email) {
    const html =
      estado === "aprobado"
        ? `
          <p>Hola ${nombre},</p>
          <p>Tu turno de entrega quedó <strong>aprobado</strong>${reprogramado ? " (con fecha reprogramada por el depósito)" : ""}:</p>
          <ul>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Horario:</strong> ${horario}</li>
          </ul>
          <p>Te esperamos en el horario indicado.</p>
        `
        : `
          <p>Hola ${nombre},</p>
          <p>Tu turno de entrega para el <strong>${fecha}</strong> (${horario}) fue <strong>rechazado</strong>.</p>
          ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
          <p>Podés solicitar un nuevo turno cuando quieras.</p>
        `;

    await sendNotificationEmail({
      to: email,
      subject: estado === "aprobado" ? "Turno de entrega aprobado" : "Turno de entrega rechazado",
      html,
    });
  }

  await supabase.from("activity_log").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action: estado === "aprobado" ? "turno_aprobado" : "turno_rechazado",
    detalle: `${estado === "aprobado" ? "Aprobó" : "Rechazó"} el turno de ${nombre} para el ${fecha} (${horario})${reprogramado ? " -- reprogramado al aprobar" : ""}${motivo ? ` -- motivo: ${motivo}` : ""}.`,
  });
}

export async function aprobarTurno(turnoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const { error } = await supabase
    .from("turnos")
    .update({ estado: "aprobado", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", turnoId)
    .eq("estado", "pendiente");

  if (error) return { success: false, error: error.message };

  await notificarYRegistrar(supabase, turnoId, "aprobado", user.id, user.email ?? "");
  revalidatePath("/dashboard");
  return { success: true };
}

// Igual que aprobarTurno, pero además cambia la franja -- para cuando la
// fecha sugerida (típicamente por Comex) no le sirve al depósito y
// prefieren reprogramar en el mismo paso en vez de rechazar y esperar
// una nueva solicitud.
export async function aprobarConNuevaFecha(
  turnoId: string,
  nuevaFecha: string,
  nuevaHoraInicio: string,
  nuevaHoraFin: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const { error } = await supabase
    .from("turnos")
    .update({
      estado: "aprobado",
      slot_date: nuevaFecha,
      slot_start_time: nuevaHoraInicio,
      slot_end_time: nuevaHoraFin,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", turnoId)
    .eq("estado", "pendiente");

  if (error) {
    if (error.code === "23505") return { success: false, error: "Esa franja ya está ocupada." };
    return { success: false, error: error.message };
  }

  await notificarYRegistrar(supabase, turnoId, "aprobado", user.id, user.email ?? "", undefined, true);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rechazarTurno(turnoId: string, motivo: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const { error } = await supabase
    .from("turnos")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", turnoId)
    .eq("estado", "pendiente");

  if (error) return { success: false, error: error.message };

  await notificarYRegistrar(supabase, turnoId, "rechazado", user.id, user.email ?? "", motivo.trim() || undefined);
  revalidatePath("/dashboard");
  return { success: true };
}
