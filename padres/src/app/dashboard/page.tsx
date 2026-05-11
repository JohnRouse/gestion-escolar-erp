"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import DashboardHeader from "@/components/DashboardHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Hijo {
  id_estudiante: number;
  nombre: string;
  grado: string;
}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  totalPendiente: number;
  circularReciente: { titulo: string; fecha: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchHijos(token);
  }, [router]);

  const fetchHijos = async (token: string) => {
    try {
      const res = await axios.get("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hijos = res.data;
      setHijos(hijos);
      if (hijos.length > 0) {
        if (selectedChild && hijos.find((h: Hijo) => h.id_estudiante === selectedChild.id_estudiante)) {
          fetchDashboardData(token, selectedChild.id_estudiante);
        } else {
          setSelectedChild(hijos[0]);
          fetchDashboardData(token, hijos[0].id_estudiante);
        }
      }
    } catch {
      const mock = [{ id_estudiante: 2, nombre: "Lucas García López", grado: "1.er Grado · Sección A" }];
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
      const presentes = asistencias.filter((a: any) => a.estado === "Presente").length;
      const pct = total > 0 ? Math.round((presentes / total) * 100) : null;
      const notas = notasRes.status === "fulfilled" ? notasRes.value.data : [];
      const promedios = notas.map((c: any) => c.promedioBimestre).filter((p: any) => p !== null);
      const prom = promedios.length > 0 ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10 : null;
      const pendiente = pagosRes.status === "fulfilled" ? (pagosRes.value.data.total_pendiente || 0) : 0;
      const estado = pendiente === 0 ? "Al día" : "Por pagar";
      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0 ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion } : null;
      setDashboardData({ asistencia: pct, promedio: prom, estadoPagos: estado, totalPendiente: pendiente, circularReciente: circ });
    } catch {
      setDashboardData({ asistencia: 92, promedio: 15.4, estadoPagos: "Por pagar", totalPendiente: 3150, circularReciente: { titulo: "Aviso – Primaria", fecha: "2025-05-06" } });
    } finally {
      setLoading(false);
      setTimeout(() => setShowActivity(true), 600);
    }
  };

  return (
    <main className="min-h-screen bg-surface-alt pb-20">
      <DashboardHeader />
      <div className="-mt-4 px-5 pb-6 relative z-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="m-card p-4 space-y-3">
                <div className="skel h-3 w-16" />
                <div className="skel h-8 w-20" />
                <div className="skel h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push("/dashboard/asistencia")} className="press m-card p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-text-secondary uppercase">ASISTENCIA</p>
                <span className="w-7 h-7 rounded-full bg-success-soft flex items-center justify-center">
                  <span className="material-symbols-rounded text-success text-lg">check</span>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-text mt-2">{dashboardData?.asistencia ?? "—"}<span className="text-xl">%</span></p>
              <p className="text-xs text-text-secondary">Bimestre I</p>
              <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-success transition-all duration-700" style={{ width: `${dashboardData?.asistencia ?? 0}%` }} />
              </div>
            </button>
            <button onClick={() => router.push("/dashboard/calificaciones")} className="press m-card p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-text-secondary uppercase">PROMEDIO</p>
                <span className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center">
                  <span className="material-symbols-rounded text-accent text-lg">trending_up</span>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-text mt-2">{dashboardData?.promedio ?? "—"}<span className="text-base text-text-secondary">.0</span></p>
              <p className="text-xs text-text-secondary">General</p>
              <span className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-[11px] font-bold ${(dashboardData?.promedio ?? 0) >= 11 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                {(dashboardData?.promedio ?? 0) >= 11 ? "Aprobado" : "En riesgo"}
              </span>
            </button>
            <button onClick={() => router.push("/dashboard/pagos")} className="press m-card p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-text-secondary uppercase">PAGOS</p>
                <span className="w-7 h-7 rounded-full bg-danger-soft flex items-center justify-center">
                  <span className="material-symbols-rounded text-danger text-lg">credit_card</span>
                </span>
              </div>
              <p className="text-xl font-extrabold text-text mt-2">S/ {dashboardData?.totalPendiente?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ?? "0.00"}</p>
              <p className="text-xs text-text-secondary">{dashboardData?.estadoPagos}</p>
              <span className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-[11px] font-bold ${dashboardData?.estadoPagos === "Al día" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {dashboardData?.estadoPagos === "Al día" ? "Al día" : "Por pagar"}
              </span>
            </button>
            <button onClick={() => router.push("/dashboard/circulares")} className="press m-card p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-text-secondary uppercase">ÚLTIMO AVISO</p>
                <span className="w-7 h-7 rounded-full bg-info-soft flex items-center justify-center">
                  <span className="material-symbols-rounded text-info text-lg">campaign</span>
                </span>
              </div>
              <p className="text-base font-extrabold text-text mt-2 line-clamp-1">{dashboardData?.circularReciente?.titulo ?? "Sin avisos"}</p>
              <p className="text-xs text-text-secondary truncate">{dashboardData?.circularReciente ? "Nuevo comunicado" : "No hay circulares"}</p>
              {dashboardData?.circularReciente && (
                <p className="text-[11px] text-text-secondary mt-2">
                  {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </p>
              )}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mt-6">
          <p className="text-[10px] tracking-[.22em] font-extrabold text-text-secondary uppercase">ACTIVIDAD RECIENTE</p>
          <button className="text-xs font-bold text-accent">Ver todo</button>
        </div>
        {!showActivity ? (
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="m-card p-3 flex items-center gap-3">
                <div className="skel w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skel h-3 w-3/4" />
                  <div className="skel h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="m-card p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
                <span className="material-symbols-rounded text-success text-xl">description</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-text">Nota de Matemáticas registrada</p>
                <p className="text-xs text-text-secondary">Hace 2 días</p>
              </div>
              <span className="material-symbols-rounded text-text-muted">chevron_right</span>
            </div>
            <div className="m-card p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-info-soft flex items-center justify-center">
                <span className="material-symbols-rounded text-info text-xl">check_circle</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-text">Asistencia del lunes confirmada</p>
                <p className="text-xs text-text-secondary">Hace 3 días</p>
              </div>
              <span className="material-symbols-rounded text-text-muted">chevron_right</span>
            </div>
            <div className="m-card p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
                <span className="material-symbols-rounded text-accent text-xl">campaign</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-text">Nueva circular publicada</p>
                <p className="text-xs text-text-secondary">Hace 4 días</p>
              </div>
              <span className="material-symbols-rounded text-text-muted">chevron_right</span>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}