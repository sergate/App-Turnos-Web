import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Corre en cada request: refresca la sesión de Supabase y protege las
// rutas según si hay usuario logueado y su rol (proveedor vs admin).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida el token contra el servidor de Auth (no
  // solo lee la cookie), así que es seguro usarlo para proteger rutas.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esLogin = pathname.startsWith("/login");

  if (!user && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return response;
  }

  // Rutas que dependen del rol: solo se consulta profiles cuando hace falta.
  const necesitaRol = esLogin || pathname === "/" || pathname.startsWith("/dashboard");

  if (necesitaRol) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const esAdmin = profile?.role === "admin";
    const esStaff = esAdmin || profile?.role === "supervisor";
    const home = esStaff ? "/dashboard" : "/nuevo-turno";

    if (esLogin || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard") && !esStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/nuevo-turno";
      return NextResponse.redirect(url);
    }

    // Franjas, usuarios y el log de auditoría quedan reservados a admin;
    // un supervisor que intente entrar vuelve al listado de pendientes.
    const RUTAS_SOLO_ADMIN = ["/dashboard/franjas", "/dashboard/usuarios", "/dashboard/log"];
    if (RUTAS_SOLO_ADMIN.some((ruta) => pathname.startsWith(ruta)) && esStaff && !esAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Corre en las páginas, pero NO en /api (esas rutas se protegen aparte),
    // ni en archivos estáticos/imágenes.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
