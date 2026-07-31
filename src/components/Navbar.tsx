"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavbarProps = {
  role: "proveedor" | "admin";
  displayName: string;
};

const PROVIDER_LINKS = [
  { href: "/nuevo-turno", label: "Solicitar turno" },
  { href: "/mis-turnos", label: "Mis turnos" },
];

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Turnos pendientes" },
  { href: "/dashboard/franjas", label: "Franjas horarias" },
];

export default function Navbar({ role, displayName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "admin" ? ADMIN_LINKS : PROVIDER_LINKS;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-800 text-sm sm:text-base">Turnos de Entrega</span>
          <nav className="flex gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">{displayName}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
