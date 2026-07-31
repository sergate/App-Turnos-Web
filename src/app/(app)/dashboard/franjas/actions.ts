"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: boolean; error?: string };

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
  revalidatePath("/dashboard/franjas");
  return { success: true };
}

export async function toggleReglaActiva(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("time_slot_rules").update({ active }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/franjas");
  return { success: true };
}

export async function eliminarRegla(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("time_slot_rules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/franjas");
  return { success: true };
}
