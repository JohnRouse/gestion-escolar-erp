"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Clase { hora_inicio: string; hora_fin: string; curso: string; docente: string; }

function classDuration(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} min` : null;
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function HorarioPage() {
  const router = useRouter();
  const { selectedChild, childrenLoading, childrenError } = useSelectedChild();
  const [horario, setHorario] = useState<Record<string, Clase[]>>({});
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const controller = new AbortController();
    const fetchHorario = async () => {
    setLoading(true);
    setHorario({});
    setError("");
    try {
      const res = await axios.get(`/api/academicos/padres/horario?alumno_id=${selectedChild.id_estudiante}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setHorario(res.data);
      const hoy = new Date().getDay();
      const diaHoy = DIAS[hoy - 1] || "Lunes";
      setDiaActivo(res.data[diaHoy] ? diaHoy : "Lunes");
    } catch (requestError) {
      if (axios.isCancel(requestError)) return;
      setHorario({});
      setError("No se pudo cargar el horario.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    };
    void fetchHorario();
    return () => controller.abort();
  }, [childrenLoading, retryKey, router, selectedChild]);

  const clases = horario[diaActivo] ?? [];

  return (
    <main className="portal-page">
      <ScreenHeader title="Horario" subtitle="Clases y docentes de la semana" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <div className="px-5 pt-5 md:px-8">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-4">
          {DIAS.map((dia) => (
            <button
              key={dia}
              onClick={() => setDiaActivo(dia)}
              aria-pressed={diaActivo === dia}
              className="portal-filter min-w-[64px]"
            >
              {dia.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative px-5 pb-8 pt-2 md:px-8">
        <div className="absolute left-7 top-2 bottom-32 w-px bg-border" />
        {childrenError || error ? (
          <PortalState kind="error" title="No pudimos cargar el horario" description={childrenError || error} actionLabel={error ? "Reintentar" : undefined} onAction={error ? () => setRetryKey((key) => key + 1) : undefined} />
        ) : !childrenLoading && !selectedChild ? (
          <PortalState title="Selecciona un estudiante" description="Elige un estudiante para consultar su horario." />
        ) : childrenLoading || loading ? (
          <PortalSkeletonList />
        ) : clases.length === 0 ? (
          <PortalState title={`Sin clases el ${diaActivo.toLowerCase()}`} description="No hay bloques académicos programados para este día." />
        ) : (
          clases.map((clase, idx) => (
            <div key={idx} className="relative mb-3 pl-6">
              <span className={`absolute left-[10px] top-4 w-3 h-3 rounded-full ring-4 ${
                idx % 2 === 0 ? "bg-accent ring-accent-soft" : "bg-info ring-info-soft"
              }`} />
              <div className="m-card p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-text">{clase.curso}</p>
                  <p className="text-xs text-text-secondary">{clase.docente}</p>
                  {classDuration(clase.hora_inicio, clase.hora_fin) ? <span className={`portal-badge mt-2 ${
                    idx % 2 === 0 ? "bg-accent-soft text-accent" : "bg-info-soft text-info"
                  }`}>
                    <span className={`dot ${idx % 2 === 0 ? "bg-accent" : "bg-info"}`} />
                    {classDuration(clase.hora_inicio, clase.hora_fin)}
                  </span> : null}
                </div>
                <div className="text-right">
                  <p className="font-mono font-extrabold text-text">{clase.hora_inicio}</p>
                  <p className="font-mono text-xs text-text-secondary">{clase.hora_fin}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}
