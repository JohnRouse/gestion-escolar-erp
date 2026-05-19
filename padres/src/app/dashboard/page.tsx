"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import DashboardHeader from "@/components/DashboardHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import AlertasAcademicas from "@/components/AlertasAcademicas";

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  totalPendiente: number;
  circularReciente: { titulo: string; fecha: string } | null;
}

interface EventoActividad {
  tipo: string;
  icono: string;
  mensaje: string;
  fecha: string;
  url: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedChild, setSelectedChild, setHijos } = useSelectedChild();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [actividad, setActividad] = useState<EventoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // ── Inicializar hijos y seleccionar primer hijo si no hay uno ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const fetchHijos = async () => {
      try {
        const res = await axios.get("/api/academicos/padres/hijos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hijosData = res.data.map((h: any) => ({ ...h, color: undefined }));
        setHijos(hijosData);

        // Si no hay hijo seleccionado, seleccionar el primero
        if (!selectedChild && hijosData.length > 0) {
          setSelectedChild(hijosData[0]);
        }
      } catch {
        const mock = [{ id_estudiante: 2, nombre: "Lucas García López", grado: "1.er Grado · Sección A" }];
        setHijos(mock);
        if (!selectedChild) setSelectedChild(mock[0]);
      }
    };

    fetchHijos();
  }, [router, selectedChild, setSelectedChild, setHijos]);

  // ── Cargar datos cuando cambia el hijo seleccionado ──
  useEffect(() => {
    if (!selectedChild) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    const alumnoId = selectedChild.id_estudiante;

    Promise.allSettled([
      axios.get(`/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=2025-01-01&hasta=2025-12-31`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("/api/circulares/padres", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/actividad?alumno_id=${alumnoId}&limite=3`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]).then(([asistRes, notasRes, pagosRes, circRes, actRes]) => {
      // Asistencia
      const asistencias = asistRes.status === "fulfilled" ? asistRes.value.data : [];
      const total = asistencias.length;
      const presentes = asistencias.filter((a: any) => a.estado === "Presente").length;
      const pct = total > 0 ? Math.round((presentes / total) * 100) : null;

      // Promedio
      const notas = notasRes.status === "fulfilled" ? notasRes.value.data : [];
      const promedios = notas.map((c: any) => c.promedioBimestre).filter((p: any) => p !== null);
      const prom = promedios.length > 0
        ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10
        : null;

      // Pagos
      const pendiente = pagosRes.status === "fulfilled" ? pagosRes.value.data.total_pendiente || 0 : 0;
      const estado = pendiente === 0 ? "Al día" : "Por pagar";

      // Circulares
      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0
        ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion }
        : null;

      // Actividad reciente
      const actividadReciente = actRes.status === "fulfilled" ? actRes.value.data : [];

      setDashboardData({
        asistencia: pct,
        promedio: prom !== null ? Math.round(prom) : null,
        estadoPagos: estado,
        totalPendiente: pendiente,
        circularReciente: circ,
      });
      setActividad(actividadReciente.slice(0, 3));
    }).catch(() => {
      setDashboardData({
        asistencia: null,
        promedio: null,
        estadoPagos: "Sin datos",
        totalPendiente: 0,
        circularReciente: null,
      });
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedChild]);

  return (
    <main className="min-h-screen bg-surface-alt dark:bg-[#0F172A] pb-24">
      <DashboardHeader />
      <div
        key={selectedChild?.id_estudiante}
        className="-mt-4 px-5 pb-6 relative z-20"
      >
        {/* Contenedor con transición de opacidad suave */}
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          {/* ── Métricas principales ── */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="m-card p-4 md:p-5 space-y-3">
                  <div className="skel h-3 md:h-4 w-16" />
                  <div className="skel h-8 md:h-10 w-20" />
                  <div className="skel h-2 md:h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Asistencia */}
              <button onClick={() => router.push("/dashboard/asistencia")} className="press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs tracking-[.18em] font-bold text-text-secondary dark:text-gray-400 uppercase">ASISTENCIA</p>
                  <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-success-soft flex items-center justify-center">
                    <span className="material-symbols-rounded text-success text-lg md:text-xl">check</span>
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-text dark:text-gray-100 mt-2">
                  {dashboardData?.asistencia ?? "—"}<span className="text-xl md:text-2xl">%</span>
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">Bimestre I</p>
                <div className="mt-3 h-1.5 bg-border dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-700"
                    style={{ width: `${dashboardData?.asistencia ?? 0}%` }}
                  />
                </div>
              </button>

              {/* Promedio */}
              <button onClick={() => router.push("/dashboard/calificaciones")} className="press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs tracking-[.18em] font-bold text-text-secondary dark:text-gray-400 uppercase">PROMEDIO</p>
                  <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent-soft flex items-center justify-center">
                    <span className="material-symbols-rounded text-accent text-lg md:text-xl">trending_up</span>
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-text dark:text-gray-100 mt-2">
                  {dashboardData?.promedio ?? "—"}
                  <span className="text-base md:text-lg text-text-secondary dark:text-gray-400">.0</span>
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">General</p>
                <span
                  className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-[11px] md:text-xs font-bold ${
                    (dashboardData?.promedio ?? 0) >= 11
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {(dashboardData?.promedio ?? 0) >= 11 ? "Aprobado" : "En riesgo"}
                </span>
              </button>

              {/* Pagos */}
              <button onClick={() => router.push("/dashboard/pagos")} className="press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs tracking-[.18em] font-bold text-text-secondary dark:text-gray-400 uppercase">PAGOS</p>
                  <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-danger-soft flex items-center justify-center">
                    <span className="material-symbols-rounded text-danger text-lg md:text-xl">credit_card</span>
                  </span>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-text dark:text-gray-100 mt-2">
                  S/{" "}
                  {dashboardData?.totalPendiente?.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  }) ?? "0.00"}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">{dashboardData?.estadoPagos}</p>
                <span
                  className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-[11px] md:text-xs font-bold ${
                    dashboardData?.estadoPagos === "Al día"
                      ? "bg-success-soft text-success"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  {dashboardData?.estadoPagos === "Al día" ? "Al día" : "Por pagar"}
                </span>
              </button>

              {/* Último aviso */}
              <button onClick={() => router.push("/dashboard/circulares")} className="press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs tracking-[.18em] font-bold text-text-secondary dark:text-gray-400 uppercase">ÚLTIMO AVISO</p>
                  <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-info-soft flex items-center justify-center">
                    <span className="material-symbols-rounded text-info text-lg md:text-xl">campaign</span>
                  </span>
                </div>
                <p className="text-base md:text-lg font-extrabold text-text dark:text-gray-100 mt-2 line-clamp-1">
                  {dashboardData?.circularReciente?.titulo ?? "Sin avisos"}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400 truncate">
                  {dashboardData?.circularReciente ? "Nuevo comunicado" : "No hay circulares"}
                </p>
                {dashboardData?.circularReciente && (
                  <p className="text-[11px] md:text-xs text-text-secondary dark:text-gray-400 mt-2">
                    {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                )}
              </button>
            </div>
          )}

          {/* ── Alertas académicas ── */}
          <div className="mt-4">
            <AlertasAcademicas />
          </div>

          {/* ── Actividad Reciente ── */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-[10px] md:text-xs tracking-[.22em] font-extrabold text-text-secondary dark:text-gray-400 uppercase">
              ACTIVIDAD RECIENTE
            </p>
            <button
              onClick={() => router.push("/dashboard/actividad")}
              className="text-xs md:text-sm font-bold text-accent"
            >
              Ver más
            </button>
          </div>
          {loading ? (
            <div className="mt-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="m-card p-3 md:p-4 flex items-center gap-3">
                  <div className="skel w-10 h-10 md:w-11 md:h-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skel h-3 md:h-4 w-3/4" />
                    <div className="skel h-2.5 md:h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : actividad.length > 0 ? (
            <div className="mt-3 space-y-3">
              {actividad.map((evento, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(evento.url)}
                  className="m-card p-3 md:p-4 flex items-center gap-3 press w-full text-left"
                >
                  <span className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-surface-alt dark:bg-gray-700 flex items-center justify-center text-lg md:text-xl">
                    {evento.icono}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-bold text-text dark:text-gray-100">{evento.mensaje}</p>
                    <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400 mt-0.5">
                      {new Date(evento.fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="material-symbols-rounded text-text-muted">chevron_right</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-muted dark:text-gray-500 text-sm mt-6">
              No hay actividad reciente.
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}