"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild, Child } from "@/contexts/SelectedChildContext";

interface Hijo extends Child {}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  totalPendiente: number;
  circularReciente: { titulo: string; fecha: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; rol: string } | null>(null);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const { selectedChild, setSelectedChild } = useSelectedChild();
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
      if (hijos.length > 0) {
        // Si hay un hijo guardado en el contexto y está en la lista, usarlo
        if (selectedChild && hijos.find((h: Hijo) => h.id_estudiante === selectedChild.id_estudiante)) {
          fetchDashboardData(token, selectedChild.id_estudiante);
        } else {
          setSelectedChild(hijos[0]);
          fetchDashboardData(token, hijos[0].id_estudiante);
        }
      }
    } catch {
      const mock = [{ id_estudiante: 2, nombre: "Lucas García", grado: "5° Primaria" }];
      setHijos(mock);
      if (!selectedChild) setSelectedChild(mock[0]);
      fetchDashboardData(token, mock[0].id_estudiante);
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
      const estado = pendiente === 0 ? "Al día" : "Pendiente";
      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0 ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion } : null;
      setDashboardData({ asistencia: pct, promedio: prom, estadoPagos: estado, totalPendiente: pendiente, circularReciente: circ });
    } catch {
      setDashboardData({ asistencia: 92, promedio: 15.4, estadoPagos: "Pendiente", totalPendiente: 3150, circularReciente: null });
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

  const promedioAprobado = (dashboardData?.promedio ?? 0) >= 11;
  const asistenciaAlta = (dashboardData?.asistencia ?? 0) >= 80;
  const tienePendientes = dashboardData && dashboardData.totalPendiente > 0;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-sm font-bold text-white">{initials}</div>
          <div>
            <p className="text-xs font-medium text-gray-500">{greeting},</p>
            <p className="text-sm font-semibold text-gray-900">{user.nombre.split(" ")[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-white" />
          </button>
          <button onClick={handleLogout} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-red-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Barra con nombre del hijo */}
      {selectedChild && (
        <div className="bg-white border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700">
              {selectedChild.nombre.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedChild.nombre}</p>
              <p className="text-xs text-gray-500">{selectedChild.grado}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selector de hijos */}
      {hijos.length > 1 && (
        <div className="bg-white border-b border-gray-100 px-5 py-2">
          <select
            className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-yellow-500"
            value={selectedChild?.id_estudiante ?? ""}
            onChange={(e) => {
              const hijo = hijos.find((h) => h.id_estudiante === Number(e.target.value));
              if (hijo) {
                setSelectedChild(hijo);
                const token = localStorage.getItem("token") ?? "";
                fetchDashboardData(token, hijo.id_estudiante);
              }
            }}
          >
            {hijos.map((h) => (
              <option key={h.id_estudiante} value={h.id_estudiante}>{h.nombre} — {h.grado}</option>
            ))}
          </select>
        </div>
      )}

      {/* Contenido */}
      <div className="px-4 py-5 flex flex-col gap-4">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 h-32 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
              <div className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* Hero card: Promedio General */}
            <div className={`rounded-2xl p-6 text-white ${promedioAprobado ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-400 to-red-600"}`}>
              <p className="text-sm font-medium opacity-90">Promedio General</p>
              <p className="text-5xl font-extrabold mt-1">{dashboardData?.promedio ?? "—"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-white/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">1er Bimestre</span>
                <span className="bg-white/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {promedioAprobado ? "Aprobado" : "En riesgo"}
                </span>
              </div>
            </div>

            {/* Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Asistencia */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Asistencia</p>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={asistenciaAlta ? "#10B981" : "#EF4444"} strokeWidth="4"
                        strokeDasharray={`${dashboardData?.asistencia ?? 0} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                      {dashboardData?.asistencia ?? "—"}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Bimestre I</p>
                </div>
              </div>

              {/* Pagos */}
              <div className={`bg-white rounded-2xl border p-5 shadow-sm ${tienePendientes ? "border-red-200" : "border-gray-100"}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagos</p>
                <p className="text-xl font-bold text-gray-900">
                  S/ {dashboardData?.totalPendiente?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ?? "0.00"}
                </p>
                <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  dashboardData?.estadoPagos === "Al día" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {dashboardData?.estadoPagos ?? "Pendiente"}
                </span>
                {tienePendientes && (
                  <button className="mt-3 w-full py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all active:scale-[0.98]">
                    Pagar ahora
                  </button>
                )}
              </div>
            </div>

            {/* Último aviso */}
            {dashboardData?.circularReciente && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Último aviso</p>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">{dashboardData.circularReciente.titulo}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}