import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company_name")
    .eq("id", user.id)
    .single();

  const role =
    profile?.role === "admin" ? "admin" : profile?.role === "supervisor" ? "supervisor" : "proveedor";
  const displayName = profile?.company_name || profile?.full_name || user.email || "";

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Navbar role={role} displayName={displayName} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
