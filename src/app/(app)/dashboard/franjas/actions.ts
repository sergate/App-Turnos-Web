"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: boolean; error?: string };

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

async function registrarLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: "franja_creada" | "franja_actualizada" | "franja_eliminada",
  detalle: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("activity_log")
    .insert({ actor_id: user.id, actor_email: user.email ?? "", action, detalle });
}

export async function crearRegla(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("time_slot_rules").insert({
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    slot_duration_minutes: input.slotDurationMinutes,
  });

  if (error) return { success: false, error: error.message };
  await registrarLog(
    supabase,
    "franja_creada",
    `Creó la franja ${DIAS[input.dayOfWeek]} ${input.startTime}-${input.endTime} (bloques de ${input.slotDurationMinutes} min).`
  );
  revalidatePath("/dashboard/franjas");
  return { success: true };
}

export async function toggleReglaActiva(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: regla } = await supabase
    .from("time_slot_rules")
    .select("day_of_week, start_time, end_time")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("time_slot_rules").update({ active }).eq("id", id);
  if (error) return { success: false, error: error.message };

  const descripcion = regla ? `${DIAS[regla.day_of_week]} ${regla.start_time.slice(0, 5)}-${regla.end_time.slice(0, 5)}` : id;
  await registrarLog(supabase, "franja_actualizada", `${active ? "Activó" : "Desactivó"} la franja ${descripcion}.`);
  revalidatePath("/dashboard/franjas");
  return { success: true };
}

export async function eliminarRegla(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: regla } = await supabase
    .from("time_slot_rules")
    .select("day_of_week, start_time, end_time")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("time_slot_rules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  const descripcion = regla ? `${DIAS[regla.day_of_week]} ${regla.start_time.slice(0, 5)}-${regla.end_time.slice(0, 5)}` : id;
  await registrarLog(supabase, "franja_eliminada", `Eliminó la franja ${descripcion}.`);
  revalidatePath("/dashboard/franjas");
  return { success: true };
}
