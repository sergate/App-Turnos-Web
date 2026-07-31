"use client";

import { useRouter } from "next/navigation";

export default function SemanaDatePicker({ fecha }: { fecha: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      defaultValue={fecha}
      onChange={(e) => {
        if (e.target.value) router.push(`/dashboard/semana?fecha=${e.target.value}`);
      }}
      className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white"
    />
  );
}
