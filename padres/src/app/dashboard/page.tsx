"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Hijo {
  id_estudiante: number;
  nombre: string;
  grado: string;
}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  circularReciente: { titulo: string; fecha: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; rol: string } | null>(null);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [selectedHijo, setSelectedHijo] = useState<Hijo | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) { router.push("/login"); return; }
    setUser(JSON.parse(userData));
    fetchHijos(token);
  }, [router]);

  const fetchHijos = async (token: string) => {
    try {
      const res = await axios.get("/api/academicos/padres/hijos", { headers: { Authorization: `Bearer ${token}` } });
      const hijos = res.data;
      setHijos(hijos);
      if (hijos.length > 0) { setSelectedHijo(hijos[0]); fetchDashboardData(token, hijos[0].id_estudiante); }
    } catch {
      const mock = [{ id_estudiante: 2, nombre: "Lucas García", grado: "5° Primaria" }];
      setHijos(mock); setSelectedHijo(mock[0]); fetchDashboardData(token, mock[0].id_estudiante);
    }
  };

  const fetchDashboardData = async (token: string, alumnoId: number) => {
    try {
      const [asistRes, notasRes, pagosRes, circRes] = await Promise.allSettled([
        axios.get(`/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=2025-01-01&hasta=2025-12-31`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=1`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/circulares/padres", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const asistencias = asistRes.status === "fulfilled" ? asistRes.value.data : [];
      const total = asistencias.length;
      const presentes = asistencias.filter((a: { estado: string }) => a.estado === "Presente").length;
      const pct = total > 0 ? Math.round((presentes / total) * 100) : null;
      const notas = notasRes.status === "fulfilled" ? notasRes.value.data : [];
      const promedios = notas.map((c: { promedioBimestre: number }) => c.promedioBimestre).filter((p: number) => p !== null);
      const prom = promedios.length > 0 ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10 : null;
      const pendiente = pagosRes.status === "fulfilled" ? (pagosRes.value.data.total_pendiente || 0) : 0;
      const estado = pendiente === 0 ? "Al día" : `S/ ${pendiente} pendiente`;
      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0 ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion } : null;
      setDashboardData({ asistencia: pct, promedio: prom, estadoPagos: estado, circularReciente: circ });
    } catch {
      setDashboardData({ asistencia: 92, promedio: 15.4, estadoPagos: "1 pendiente", circularReciente: { titulo: "Reunión de padres — Primaria", fecha: "2025-05-09" } });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const initials = user ? user.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2) : "";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  if (!user) return null;

  const quickLinks = [
    { label: "Notas", path: "/dashboard/calificaciones", color: "#EDE9FF", icon: "📋" },
    { label: "Asistencia", path: "/dashboard/asistencia", color: "#D1FAE5", icon: "✅" },
    { label: "Pagos", path: "/dashboard/pagos", color: "#FEF3C7", icon: "💳" },
    { label: "Horario", path: "/dashboard/horario", color: "#DBEAFE", icon: "🕐" },
  ];

  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>

      {/* Top header */}
      <header className="px-5 pt-12 pb-6 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0F2E 0%, #1A2766 60%, #2336A8 100%)" }}>
        {/* decorative */}
        <div className="absolute top-[-30px] right-[-20px] w-44 h-44 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C5CFC, transparent)" }} />
        <div className="absolute bottom-[-50px] left-[30%] w-32 h-32 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #6179E8, transparent)" }} />

        <div className="relative z-10 flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.25)" }}>
              {initials}
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium">{greeting},</p>
              <p className="text-white font-bold text-sm">{user.nombre.split(" ")[0]}</p>
            </div>
          </div>
          <button className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-red-300" />
          </button>
        </div>

        {/* Hero card dentro del header */}
        {selectedHijo && (
          <div className="relative z-10 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Estudiante</p>
                <p className="text-white font-bold text-base">{selectedHijo.nombre}</p>
                <p className="text-white/60 text-xs mt-0.5">{selectedHijo.grado}</p>
              </div>
              {hijos.length > 1 && (
                <select
                  className="text-xs bg-white/10 text-white border border-white/20 rounded-xl px-3 py-1.5 outline-none"
                  value={selectedHijo.id_estudiante}
                  onChange={(e) => {
                    const hijo = hijos.find((h) => h.id_estudiante === Number(e.target.value));
                    if (hijo) { setSelectedHijo(hijo); fetchDashboardData(localStorage.getItem("token") || "", hijo.id_estudiante); }
                  }}
                >
                  {hijos.map((h) => <option key={h.id_estudiante} value={h.id_estudiante}>{h.nombre}</option>)}
                </select>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="px-4 py-5 pb-28 flex flex-col gap-5">

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Asistencia */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9499C0" }}>Asistencia</span>
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#D1FAE5" }}>✓</span>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: "#0A0F2E" }}>
                {dashboardData?.asistencia !== null ? `${dashboardData?.asistencia}%` : "—"}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "#9499C0" }}>Bimestre I</p>
              {dashboardData?.asistencia !== null && (
                <div className="mt-2.5 h-1.5 rounded-full" style={{ background: "#ECEFFE" }}>
                  <div className="h-full rounded-full" style={{ width: `${dashboardData?.asistencia}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
                </div>
              )}
            </div>

            {/* Promedio */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9499C0" }}>Promedio</span>
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#E8EBFD" }}>📊</span>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: "#0A0F2E" }}>
                {dashboardData?.promedio ?? "—"}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "#9499C0" }}>General</p>
              {dashboardData?.promedio !== null && (
                <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: (dashboardData?.promedio ?? 0) >= 11 ? "#D1FAE5" : "#FEE2E2", color: (dashboardData?.promedio ?? 0) >= 11 ? "#059669" : "#DC2626" }}>
                  {(dashboardData?.promedio ?? 0) >= 11 ? "Aprobado" : "En riesgo"}
                </span>
              )}
            </div>

            {/* Pagos */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9499C0" }}>Pagos</span>
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: dashboardData?.estadoPagos === "Al día" ? "#D1FAE5" : "#FEF3C7" }}>💳</span>
              </div>
              <p className="text-sm font-bold mt-1" style={{ color: "#0A0F2E" }}>{dashboardData?.estadoPagos}</p>
              <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: dashboardData?.estadoPagos === "Al día" ? "#D1FAE5" : "#FEF3C7", color: dashboardData?.estadoPagos === "Al día" ? "#059669" : "#92400E" }}>
                {dashboardData?.estadoPagos === "Al día" ? "Al día ✓" : "Pendiente"}
              </span>
            </div>

            {/* Aviso reciente */}
            <div className="card p-4" style={{ gridColumn: dashboardData?.circularReciente ? undefined : undefined }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9499C0" }}>Último aviso</span>
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#DBEAFE" }}>📨</span>
              </div>
              {dashboardData?.circularReciente ? (
                <>
                  <p className="text-xs font-semibold leading-snug" style={{ color: "#0A0F2E" }}>{dashboardData.circularReciente.titulo}</p>
                  <p className="text-[10px] mt-1.5" style={{ color: "#9499C0" }}>
                    {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                  </p>
                </>
              ) : (
                <p className="text-xs" style={{ color: "#9499C0" }}>Sin avisos</p>
              )}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div>
          <p className="section-label">Acceso rápido</p>
          <div className="grid grid-cols-4 gap-2">
            {quickLinks.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all active:scale-95"
                style={{ background: item.color }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-bold" style={{ color: "#0A0F2E" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actividad reciente placeholder */}
        <div>
          <p className="section-label">Actividad reciente</p>
          <div className="card divide-y divide-gray-100">
            {[
              { icon: "📋", text: "Nota de Matemáticas registrada", sub: "Hace 2 días", color: "#EDE9FF" },
              { icon: "✅", text: "Asistencia del lunes confirmada", sub: "Hace 3 días", color: "#D1FAE5" },
              { icon: "📨", text: "Nueva circular publicada", sub: "Hace 5 días", color: "#DBEAFE" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-base flex-shrink-0" style={{ background: item.color }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#0A0F2E" }}>{item.text}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9499C0" }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="btn btn-ghost w-full text-sm" style={{ color: "#9499C0" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar sesión
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
