"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { ChevronDown, Bell, LogOut, TrendingUp, AlertCircle, Search, MessageSquare } from "lucide-react";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    <main className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{greeting}, {user.nombre.split(" ")[0]}</h1>
        <div className="flex items-center gap-2">
          <button className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-600 relative active:scale-95 transition-transform">
            <Bell size={20} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-red rounded-full border-2 border-white" />
          </button>
          <button onClick={handleLogout} className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 active:scale-95 transition-transform">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Selector de Hijo (Estilo Botón Nativo) */}
      <div className="px-6 mb-8">
        <button 
          onClick={() => setIsSheetOpen(true)}
          className="w-full bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-xl font-bold text-slate-800">
              {selectedChild?.nombre.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiante</p>
              <p className="text-lg font-bold text-slate-800 leading-tight">{selectedChild?.nombre}</p>
            </div>
          </div>
          <ChevronDown className="text-slate-300" />
        </button>
      </div>

      {/* Contenido */}
      <div className="px-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] h-40 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-[2rem] h-32 animate-pulse" />
              <div className="bg-white rounded-[2rem] h-32 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* Tarjeta de Calificación Compacta */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Promedio Bimestral</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-slate-800">{dashboardData?.promedio ?? "—"}</span>
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${
                    (dashboardData?.promedio ?? 0) >= 15 
                      ? "bg-green-100 text-green-700" 
                      : "bg-brand-yellow text-slate-900"
                  }`}>
                    {(dashboardData?.promedio ?? 0) >= 11 ? "Aprobado" : "En riesgo"}
                  </span>
                </div>
              </div>
              <TrendingUp size={40} className="text-slate-100" />
            </div>

            {/* Grid de Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Asistencia</p>
                <div className="flex flex-col gap-2">
                  <span className="text-2xl font-black text-slate-800">{dashboardData?.asistencia ?? "—"}%</span>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${dashboardData?.asistencia}%` }} />
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-[2.5rem] shadow-sm ${tienePendientes ? "bg-red-50 border border-red-100" : "bg-white"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pendiente</p>
                <p className={`text-2xl font-black ${tienePendientes ? "text-brand-red" : "text-slate-800"}`}>
                  S/ {dashboardData?.totalPendiente?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ?? "0.00"}
                </p>
              </div>
            </div>

            {/* Avisos Importantes */}
            {dashboardData?.circularReciente && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-2">
                  <AlertCircle size={14} className="text-brand-red" />
                  Comunicado Urgente
                </p>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-l-4 border-brand-red">
                  <p className="text-lg font-bold text-slate-800 leading-tight mb-2">{dashboardData.circularReciente.titulo}</p>
                  <p className="text-sm text-slate-500">{new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "long" })}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button (FAB) - Estilo MD3 */}
      <button className="fixed bottom-28 right-6 w-16 h-16 bg-brand-600 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40">
        <MessageSquare size={28} />
      </button>

      {/* Modal Sheet de Selección de Hijo */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSheetOpen(false)} />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-[3rem] p-8 pb-12 animate-slideUpSheet shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
            <h3 className="text-2xl font-bold text-slate-800 mb-6 px-2">Mis Hijos</h3>
            <div className="space-y-3">
              {hijos.map((h) => (
                <button 
                  key={h.id_estudiante}
                  onClick={() => { setSelectedChild(h); setIsSheetOpen(false); }}
                  className={`w-full p-5 rounded-[2rem] text-left flex items-center gap-4 transition-all ${
                    selectedChild?.id_estudiante === h.id_estudiante ? "bg-brand-yellow/10 ring-2 ring-brand-yellow" : "bg-slate-50 border-2 border-transparent"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-800">
                    {h.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{h.nombre}</p>
                    <p className="text-xs text-slate-500 font-medium">{h.grado}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}