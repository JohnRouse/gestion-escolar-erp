"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CalendarCheck2, ChevronRight, CreditCard, Megaphone, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DashboardHeader from "@/components/DashboardHeader";
import { PortalNotificationIcon, PortalSection, PortalState } from "@/components/PortalUI";
import { childDateRange, useSelectedChild } from "@/contexts/SelectedChildContext";
import AlertasAcademicas from "@/components/AlertasAcademicas";
import {
  attendancePercentage,
  averageAvailableScores,
  formatPortalScore,
  paymentSummary,
} from "@/lib/portalDashboard";
import { portalNotificationTarget } from "@/lib/portalNotificationNavigation";

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  totalPendiente: number | null;
  pagosTone: "success" | "warning" | "neutral";
  circularReciente: { titulo: string; fecha: string } | null;
  circularError: boolean;
}

interface EventoActividad {
  tipo: string;
  mensaje: string;
  fecha: string;
  url: string;
}

interface AttendanceDto { estado: string }
interface GradeDto { promedioBimestre: number | null }
interface PortalNotificationDto {
  origen?: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  fecha_creacion: string;
  url?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedChild, childrenLoading, childrenError, reloadChildren } = useSelectedChild();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [actividad, setActividad] = useState<EventoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const alumnoId = selectedChild.id_estudiante;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setDashboardData(null);
      setActividad([]);
      setPartialError(false);
      setActivityError(false);
    });
    const range = childDateRange(selectedChild);
    const controller = new AbortController();
    const requestConfig = {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    };
    const bimestreQuery = selectedChild.bimestre_actual
      ? `&bimestre_id=${selectedChild.bimestre_actual}`
      : "";

    Promise.allSettled([
      axios.get(`/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=${range.desde}&hasta=${range.hasta}`, {
        ...requestConfig,
      }),
      axios.get(`/api/calificaciones/padres/notas?alumno_id=${alumnoId}${bimestreQuery}`, requestConfig),
      axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`, requestConfig),
      axios.get("/api/circulares/padres", requestConfig),
      axios.get("/api/notificaciones/portal?limit=3", requestConfig),
    ]).then(([asistRes, notasRes, pagosRes, circRes, actRes]) => {
      const asistencias: AttendanceDto[] = asistRes.status === "fulfilled" ? asistRes.value.data : [];
      const pct = attendancePercentage(asistencias);

      const notas: GradeDto[] = notasRes.status === "fulfilled" ? notasRes.value.data : [];
      const prom = averageAvailableScores(notas.map((course) => course.promedioBimestre));

      const payment = paymentSummary(
        pagosRes.status,
        pagosRes.status === "fulfilled" ? pagosRes.value.data.total_pendiente : null,
      );

      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0
        ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion }
        : null;

      const actividadReciente = actRes.status === "fulfilled"
        ? (actRes.value.data.data ?? []).map((item: PortalNotificationDto) => ({
          tipo: item.origen || item.tipo,
            mensaje: item.titulo || item.mensaje,
            fecha: item.fecha_creacion,
            url: portalNotificationTarget(item, window.location.origin),
          }))
        : [];

      if (controller.signal.aborted) return;
      setDashboardData({
        asistencia: pct,
        promedio: prom,
        estadoPagos: payment.label,
        totalPendiente: payment.total,
        pagosTone: payment.tone,
        circularReciente: circ,
        circularError: circRes.status === "rejected",
      });
      setActividad(actividadReciente.slice(0, 3));
      setActivityError(actRes.status === "rejected");
      setPartialError([asistRes, notasRes, pagosRes, circRes, actRes].some((result) => result.status === "rejected"));
    }).catch((error) => {
      if (axios.isCancel(error)) return;
      setDashboardData({
        asistencia: null,
        promedio: null,
        estadoPagos: "Sin datos",
        totalPendiente: null,
        pagosTone: "neutral",
        circularReciente: null,
        circularError: true,
      });
      setActivityError(true);
      setPartialError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [childrenLoading, retryKey, selectedChild]);

  const pageLoading = childrenLoading || (Boolean(selectedChild) && loading);

  return (
    <main className="portal-page">
      <DashboardHeader />
      <div
        key={selectedChild?.id_estudiante}
        className="portal-content"
      >
        <div>
          {childrenError ? (
            <div role="alert" className="m-card mb-4 p-4 text-sm text-text-secondary">
              <p>{childrenError}</p>
              <button type="button" onClick={reloadChildren} className="mt-2 font-bold text-accent">Reintentar</button>
            </div>
          ) : null}
          {!pageLoading && !selectedChild && !childrenError ? (
            <PortalState title="No hay estudiantes vinculados" description="Cuando la institución vincule un estudiante, su información aparecerá aquí." />
          ) : null}
          {partialError && selectedChild ? (
            <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning-soft p-3 text-sm text-text-secondary">
              <span>Algunos datos no pudieron actualizarse.</span>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="shrink-0 font-bold text-accent">Reintentar</button>
            </div>
          ) : null}
          {pageLoading || selectedChild ? (
            <>
          {/* Métricas principales */}
          {pageLoading ? (
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
              <button onClick={() => router.push("/dashboard/asistencia")} className="portal-kpi press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="portal-eyebrow">Asistencia</p>
                  <span className="portal-icon-box">
                    <CalendarCheck2 size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-text dark:text-gray-100 mt-2">
                  {dashboardData?.asistencia ?? "—"}{dashboardData?.asistencia !== null ? <span className="text-xl md:text-2xl">%</span> : null}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">{selectedChild?.anio || "Año lectivo"}</p>
                <div className="mt-3 h-1.5 bg-border dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-[width] duration-300"
                    style={{ width: `${dashboardData?.asistencia ?? 0}%` }}
                  />
                </div>
              </button>

              {/* Promedio */}
              <button onClick={() => router.push("/dashboard/calificaciones")} className="portal-kpi press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="portal-eyebrow">Promedio</p>
                  <span className="portal-icon-box">
                    <TrendingUp size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-text dark:text-gray-100 mt-2">
                  {formatPortalScore(dashboardData?.promedio ?? null)}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">General</p>
                <span className="portal-badge mt-3 bg-surface-alt text-text-secondary">
                  {dashboardData?.promedio === null ? "Sin notas" : "Promedio disponible"}
                </span>
              </button>

              {/* Pagos */}
              <button onClick={() => router.push("/dashboard/pagos")} className="portal-kpi press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="portal-eyebrow">Pagos</p>
                  <span className="portal-icon-box">
                    <CreditCard size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className="portal-kpi-value text-2xl md:text-3xl font-extrabold text-text dark:text-gray-100 mt-2">
                  {dashboardData?.totalPendiente === null ? "—" : `S/ ${dashboardData?.totalPendiente?.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  })}`}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400">{dashboardData?.estadoPagos}</p>
                <span
                  className={`portal-badge mt-3 ${
                    dashboardData?.pagosTone === "success"
                      ? "bg-success-soft text-success"
                      : dashboardData?.pagosTone === "warning"
                        ? "bg-warning-soft text-warning"
                        : "bg-surface-alt text-text-secondary"
                  }`}
                >
                  {dashboardData?.estadoPagos}
                </span>
              </button>

              {/* Último comunicado */}
              <button onClick={() => router.push("/dashboard/comunicados")} className="portal-kpi press m-card p-4 md:p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="portal-eyebrow">Último comunicado</p>
                  <span className="portal-icon-box bg-info-soft text-info">
                    <Megaphone size={18} aria-hidden="true" />
                  </span>
                </div>
                <p className="text-base md:text-lg font-extrabold text-text dark:text-gray-100 mt-2 line-clamp-2">
                  {dashboardData?.circularReciente?.titulo ?? (dashboardData?.circularError ? "No disponible" : "Sin comunicados")}
                </p>
                <p className="text-xs md:text-sm text-text-secondary dark:text-gray-400 truncate">
                  {dashboardData?.circularReciente ? "Nuevo comunicado" : dashboardData?.circularError ? "No se pudo actualizar" : "No hay comunicados"}
                </p>
                {dashboardData?.circularReciente && (
                  <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
                    {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                )}
              </button>
            </div>
          )}

          {/* Alertas académicas */}
          <div className="mt-4">
            <AlertasAcademicas />
          </div>

          {/* Actividad Reciente */}
          <PortalSection title="Actividad reciente" action={<button
              onClick={() => router.push("/dashboard/actividad")}
              className="portal-button portal-button-quiet min-h-8 px-2 text-xs"
            >
              Ver más
            </button>}>
          {pageLoading ? (
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
          ) : activityError ? (
            <p role="status" className="mt-6 text-center text-sm text-text-secondary">No se pudo cargar la actividad reciente.</p>
          ) : actividad.length > 0 ? (
            <div className="portal-activity-list mt-3">
              {actividad.map((evento, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(evento.url)}
                  className="portal-list-item press w-full text-left"
                >
                  <span className="portal-icon-box">
                    <PortalNotificationIcon origin={evento.tipo} />
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
                  <ChevronRight size={18} className="text-text-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <PortalState title="No hay actividad reciente" description="Los avisos de pagos, eventos y comunicados aparecerán aquí." />
          )}
          </PortalSection>
            </>
          ) : null}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
