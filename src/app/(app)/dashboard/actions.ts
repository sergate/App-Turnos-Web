"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { formatFecha } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

type ActionResult = { success: boolean; error?: string };

async function notificarProveedor(turnoId: string, estado: "aprobado" | "rechazado", motivo?: string) {
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from("turnos")
    .select("slot_date, slot_start_time, slot_end_time, provider:profiles!turnos_provider_id_fkey(email, company_name)")
    .eq("id", turnoId)
    .single();

  const provider = Array.isArray(turno?.provider) ? turno?.provider[0] : turno?.provider;
  if (!turno || !provider?.email) return;

  const fecha = formatFecha(turno.slot_date);
  const horario = `${formatHora(turno.slot_start_time)} - ${formatHora(turno.slot_end_time)}`;

  const html =
    estado === "aprobado"
      ? `
        <p>Hola${provider.company_name ? ` ${provider.company_name}` : ""},</p>
        <p>Tu turno de entrega quedó <strong>aprobado</strong>:</p>
        <ul>
          <li><strong>Fecha:</strong> ${fecha}</li>
          <li><strong>Horario:</strong> ${horario}</li>
        </ul>
        <p>Te esperamos en el horario indicado.</p>
      `
      : `
        <p>Hola${provider.company_name ? ` ${provider.company_name}` : ""},</p>
        <p>Tu turno de entrega para el <strong>${fecha}</strong> (${horario}) fue <strong>rechazado</strong>.</p>
        ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
        <p>Podés solicitar un nuevo turno cuando quieras.</p>
      `;

  await sendNotificationEmail({
    to: provider.email,
    subject: estado === "aprobado" ? "Turno de entrega aprobado" : "Turno de entrega rechazado",
    html,
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

  await notificarProveedor(turnoId, "aprobado");
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

  await notificarProveedor(turnoId, "rechazado", motivo.trim() || undefined);
  revalidatePath("/dashboard");
  return { success: true };
}
