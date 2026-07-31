// El middleware redirige "/" a /login, /nuevo-turno o /dashboard según la
// sesión y el rol, así que este componente casi nunca llega a renderizarse.
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
      <p className="text-sm text-slate-400">Cargando...</p>
    </div>
  );
}
