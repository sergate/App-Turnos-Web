"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REMITOS_BUCKET } from "@/lib/storage";
import { formatFecha } from "@/lib/turnos";
import { formatHora } from "@/lib/slots";

type ActionResult = { success: boolean; error?: string };

export async function solicitarTurnoComex(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado." };

  const slotDate = String(formData.get("slotDate") || "");
  const slotStartTime = String(formData.get("slotStartTime") || "");
  const slotEndTime = String(formData.get("slotEndTime") || "");
  const providerName = String(formData.get("providerName") || "").trim();
  const providerEmail = String(formData.get("providerEmail") || "").trim();
  const detalle = String(formData.get("detalle") || "").trim();
  const foto = formData.get("foto");

  if (!slotDate || !slotStartTime || !slotEndTime) {
    return { success: false, error: "Elegí una fecha y una franja horaria." };
  }
  if (!providerName) {
    return { success: false, error: "Ingresá el nombre del proveedor." };
  }

  let remitoPath: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    const extension = foto.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(REMITOS_BUCKET)
      .upload(path, foto, { contentType: foto.type });
    if (uploadError) return { success: false, error: `No se pudo subir la foto: ${uploadError.message}` };
    remitoPath = path;
  }

  const { error: insertError } = await supabase.from("turnos").insert({
    provider_id: null,
    provider_name: providerName,
    provider_contact_email: providerEmail || null,
    slot_date: slotDate,
    slot_start_time: slotStartTime,
    slot_end_time: slotEndTime,
    detalle: detalle || "(solicitado por Compras MRN, sin detalle)",
    remito_path: remitoPath,
    estado: "pendiente",
    requested_by: user.id,
    requested_date: slotDate,
    requested_start_time: slotStartTime,
    requested_end_time: slotEndTime,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: false, error: "Esa franja ya no está disponible, elegí otra." };
    }
    return { success: false, error: insertError.message };
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? "",
    action: "turno_solicitado",
    detalle: `Solicitó un turno para "${providerName}" el ${formatFecha(slotDate)} (${formatHora(slotStartTime)} - ${formatHora(slotEndTime)}).`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/comex/solicitudes");
  return { success: true };
}
