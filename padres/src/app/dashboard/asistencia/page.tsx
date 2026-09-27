"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";
import { childDateRange, useSelectedChild } from "@/contexts/SelectedChildContext";

interface AsistenciaItem { fecha: string; estado: string; }

export default function AsistenciaPage() {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedChild, childrenLoading, childrenError } = useSelectedChild();
  const [filtro, setFiltro] = useState("Todos");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const controller = new AbortController();
    const fetchAsistencia = async () => {
    setLoading(true);
    setError("");
    setAsistencias([]);
    try {
      const range = childDateRange(selectedChild);
      const res = await axios.get(`/api/academicos/padres/asistencia?alumno_id=${selectedChild.id_estudiante}&desde=${range.desde}&hasta=${range.hasta}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setAsistencias(res.data);
    } catch (requestError) {
      if (axios.isCancel(requestError)) return;
      setAsistencias([]);
      setError("No se pudo cargar la asistencia.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    };
    void fetchAsistencia();
    return () => controller.abort();
  }, [childrenLoading, retryKey, router, selectedChild]);

  const total = asistencias.length;
  const presentes = asistencias.filter(a => a.estado === "Presente").length;
  const ausentes = asistencias.filter(a => a.estado === "Ausente").length;
  const tardanzas = asistencias.filter(a => a.estado === "Tardanza").length;
  const justificados = asistencias.filter(a => a.estado === "Justificado").length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : null;

  const filtros = ["Todos", "Presente", "Ausente", "Tardanza", "Justificado"];
  const listaFiltrada = filtro === "Todos" ? asistencias : asistencias.filter(a => a.estado === filtro);

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case "Presente": return { bg: "bg-success-soft", text: "text-success", dot: "bg-success" };
      case "Ausente": return { bg: "bg-danger-soft", text: "text-danger", dot: "bg-danger" };
      case "Tardanza": return { bg: "bg-warning-soft", text: "text-warning", dot: "bg-warning" };
      case "Justificado": return { bg: "bg-info-soft", text: "text-info", dot: "bg-info" };
      default: return { bg: "bg-border", text: "text-text-muted", dot: "bg-text-muted" };
    }
  };

  return (
    <main className="portal-page">
      <ScreenHeader title="Asistencia" subtitle="Resumen e historial del año lectivo" />
      <div className="portal-content pb-3">
        <section className="portal-summary m-card mb-4 flex items-center gap-5 p-5">
          <div className="relative h-20 w-20 shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--portal-success) ${porcentaje ?? 0}%, var(--portal-border) 0)` }}>
              <div className="absolute inset-[8px] rounded-full bg-white" />
            </div>
            <span className="absolute inset-0 grid place-items-center text-xl text-text font-extrabold">{porcentaje === null ? "—" : `${porcentaje}%`}</span>
          </div>
          <div>
            <p className="portal-summary-value">{total > 0 ? presentes : "—"}<span className="text-xl text-text-secondary">{total > 0 ? `/${total}` : ""}</span></p>
            <p className="text-text-secondary text-sm mt-1">{total > 0 ? "días presentes" : "Sin registros en el periodo"}</p>
          </div>
        </section>
        <div className="portal-attendance-stats mb-5">
          <div>
            <p className="text-2xl font-extrabold text-text">{ausentes}</p>
            <p className="text-xs text-text-secondary">Ausencias</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text">{tardanzas}</p>
            <p className="text-xs text-text-secondary">Tardanzas</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text">{justificados}</p>
            <p className="text-xs text-text-secondary">Justificadas</p>
          </div>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className="portal-filter">
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 md:px-8">
        {childrenError || error ? (
          <PortalState kind="error" title="No pudimos cargar la asistencia" description={childrenError || error} actionLabel={error ? "Reintentar" : undefined} onAction={error ? () => setRetryKey((key) => key + 1) : undefined} />
        ) : !childrenLoading && !selectedChild ? (
          <PortalState title="Selecciona un estudiante" description="Elige un estudiante para consultar su asistencia." />
        ) : childrenLoading || loading ? (
          <PortalSkeletonList />
        ) : listaFiltrada.length === 0 ? (
          <PortalState title="No hay registros" description={filtro === "Todos" ? "La asistencia del periodo aparecerá aquí." : `No hay registros con estado ${filtro.toLowerCase()}.`} />
        ) : (
          listaFiltrada.map((item, idx) => {
            const est = getEstadoStyle(item.estado);
            const fecha = new Date(item.fecha + "T00:00:00");
            return (
              <div key={idx} className="portal-list-item px-1">
                <span className={`dot ${est.dot}`} />
                <div className="flex-1">
                  <p className="font-extrabold text-text">{fecha.toLocaleDateString("es-PE", { weekday: "long" })}</p>
                  <p className="text-xs text-text-secondary">{fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`portal-badge ${est.bg} ${est.text}`}>{item.estado}</span>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}
