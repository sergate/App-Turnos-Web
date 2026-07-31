import type { SupabaseClient } from "@supabase/supabase-js";

export type AvailableSlot = {
  slotDate: string; // YYYY-MM-DD
  slotStartTime: string; // HH:MM:SS
  slotEndTime: string; // HH:MM:SS
};

// Franjas disponibles agrupadas por fecha, ya sin las ocupadas (ver RPC
// get_available_slots en supabase/migrations).
export async function getAvailableSlotsByDate(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<Map<string, AvailableSlot[]>> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    from_date: fromDate,
    to_date: toDate,
  });

  if (error) {
    throw new Error(`No se pudieron cargar las franjas disponibles: ${error.message}`);
  }

  const byDate = new Map<string, AvailableSlot[]>();
  for (const row of data ?? []) {
    const slot: AvailableSlot = {
      slotDate: row.slot_date,
      slotStartTime: row.slot_start_time,
      slotEndTime: row.slot_end_time,
    };
    const existing = byDate.get(slot.slotDate);
    if (existing) {
      existing.push(slot);
    } else {
      byDate.set(slot.slotDate, [slot]);
    }
  }
  return byDate;
}

export function formatHora(time: string): string {
  return time.slice(0, 5); // "08:00:00" -> "08:00"
}
