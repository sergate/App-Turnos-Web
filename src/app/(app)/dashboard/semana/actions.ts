"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { formatFecha } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

type ActionResult = { success: boolean; error?: string };

async function getTurnoContacto(supabase: SupabaseClient, turnoId: string) {
  const { data } = await supabase
    .from("turnos")
    .select(
      "slot_date, slot_start_time, slot_end_time, provider_name, provider_contact_email, provider:profiles!turnos_provider_id_fkey(email, company_name)"
    )
    .eq("id", turnoId)
    .single();
  if (!data) return null;

  const provider = Array.isArray(data.provider) ? data.provider[0] : data.provider;
  return {
    slotDate: data.slot_date as string,
    slotStartTime: data.slot_start_time as string,
    slotEndTime: data.slot_end_time as string,
    email: (provider?.email as string | undefined) || data.provider_contact_email || null,
    nombre: (provider?.company_name as string | undefined) || data.provider_name || "el proveedor",
  };
}

export async function reprogramarTurno(
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

  const anterior = await getTurnoContacto(supabase, turnoId);
  if (!anterior) return { success: false, error: "No se encontró el turno." };

  const { error } = await supabase
    .from("turnos")
    .update({ slot_date: nuevaFecha, slot_start_time: nuevaHoraInicio, slot_end_time: nuevaHoraFin })
    .eq("id", turnoId)
    .eq("estado", "aprobado");

  if (error) {
    if (error.code === "23505") return { success: false, error: "Esa franja ya está ocupada." };
    return { success: false, error: error.message };
  }

  const fechaAnterior = formatFecha(anterior.slotDate);
  const horarioAnterior = `${formatHora(anterior.slotStartTime)} - ${formatHora(anterior.slotEndTime)}`;
  const fechaNueva = formatFecha(nuevaFecha);
  const horarioNuevo = `${formatHora(nuevaHoraInicio)} - ${formatHora(nuevaHoraFin)}`;

  if (anterior.email) {
    await sendNotificationEmail({
      to: anterior.email,
      subject: "Turno de entrega reprogramado",
      html: `
        <p>Hola ${anterior.nombre},</p>
        <p>Tu turno de entrega fue reprogramado:</p>
        <ul>
          <li><strong>Antes:</strong> ${fechaAnterior}, ${horarioAnterior}</li>
          <li><strong>Ahora:</strong> ${fechaNueva}, ${horarioNuevo}</li>
        </ul>
      `,
    });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? "",
    action: "turno_reprogramado",
    detalle: `Reprogramó el turno de ${anterior.nombre}: ${fechaAnterior} ${horarioAnterior} → ${fechaNueva} ${horarioNuevo}.`,
  });

  revalidatePath("/dashboard/semana");
  return { success: true };
}

export async function eliminarTurno(turnoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { success: false, error: "No autorizado." };

  const turno = await getTurnoContacto(supabase, turnoId);
  if (!turno) return { success: false, error: "No se encontró el turno." };

  const { error } = await supabase.from("turnos").delete().eq("id", turnoId);
  if (error) return { success: false, error: error.message };

  const fecha = formatFecha(turno.slotDate);
  const horario = `${formatHora(turno.slotStartTime)} - ${formatHora(turno.slotEndTime)}`;

  if (turno.email) {
    await sendNotificationEmail({
      to: turno.email,
      subject: "Turno de entrega cancelado",
      html: `
        <p>Hola ${turno.nombre},</p>
        <p>Tu turno de entrega del <strong>${fecha}</strong> (${horario}) fue cancelado.</p>
        <p>Si necesitás coordinar uno nuevo, contactanos.</p>
      `,
    });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? "",
    action: "turno_eliminado",
    detalle: `Eliminó el turno de ${turno.nombre} del ${fecha} (${horario}).`,
  });

  revalidatePath("/dashboard/semana");
  return { success: true };
}
