"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CalendarClock, Clock3, UserRound } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";

interface Cita {
  id_cita: number;
  tipo: "individual" | "seccion";
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: string;
  creado_en: string;
  legacy: boolean;
  estudiante: {
    nombre: string;
    seccion: string;
    anio: string;
  } | null;
  seccion: {
    id_seccion: number;
    nombre: string;
  } | null;
  destinatario: {
    nombre: string;
    contexto: "staff" | "docente" | "tutor";
    funcion: string;
  };
  permisos?: { cancelar?: boolean };
}

export default function CitasPage() {
  const router = useRouter();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError("");
      }
    });
    axios
      .get("/api/citas/apoderado", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => setCitas(res.data))
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return;
        setCitas([]);
        setError("No se pudieron cargar las citas.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retryKey, router]);

  const cancelAppointment = async (id: number) => {
    if (cancelReason.trim().length < 3) {
      setError("Indica un motivo breve para cancelar la cita.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `/api/citas/apoderado/${id}/cancelar`,
        { comentario: cancelReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCitas((current) => current.map((item) => item.id_cita === id ? response.data : item));
      setCancelId(null);
      setCancelReason("");
    } catch (requestError) {
      const message = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message
        : null;
      setError(message || "No se pudo cancelar la cita.");
    } finally {
      setSaving(false);
    }
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-warning-soft text-warning";
      case "confirmada":
        return "bg-success-soft text-success";
      case "rechazada":
        return "bg-danger-soft text-danger";
      case "cancelada":
        return "bg-border text-text-muted";
      case "realizada":
        return "bg-success-soft text-success";
      default:
        return "bg-border text-text-muted";
    }
  };

  return (
    <main className="portal-page">
      <ScreenHeader title="Mis citas" subtitle="Solicitudes y reuniones programadas" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <PageTransition>
        <div className="portal-content">
          {error && cancelId === null ? (
            <PortalState kind="error" title="No pudimos cargar las citas" description={error} actionLabel="Reintentar" onAction={() => setRetryKey((key) => key + 1)} className="mb-4" />
          ) : null}

          {loading ? (
            <PortalSkeletonList />
          ) : error && cancelId === null ? null : citas.length === 0 ? (
            <PortalState icon={<CalendarClock size={21} />} title="No tienes citas programadas" description="Solicita una cita desde el Directorio Académico cuando necesites conversar con el colegio." />
          ) : (
            citas.map((cita) => (
              <div key={cita.id_cita} className="m-card mb-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="portal-icon-box"><UserRound size={18} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text">
                        {cita.tipo === "seccion" ? "Reunión de sección" : cita.destinatario.nombre}
                      </p>
                      <span className={`portal-badge capitalize ${getEstadoStyle(cita.estado)}`}>
                        {cita.estado}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {cita.tipo === "seccion"
                        ? cita.seccion?.nombre || "Sección convocada"
                        : cita.destinatario.funcion}
                    </p>
                    {cita.tipo === "seccion" ? (
                      <p className="mt-1 text-sm text-text-muted">{cita.destinatario.nombre} · {cita.destinatario.funcion}</p>
                    ) : null}
                    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-secondary">
                      <CalendarClock size={15} aria-hidden="true" />
                      {new Date(cita.fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <span aria-hidden="true">·</span>
                      <Clock3 size={15} aria-hidden="true" />
                      {cita.hora_inicio} – {cita.hora_fin}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {cita.tipo === "seccion"
                        ? "Familias de la sección convocadas"
                        : cita.estudiante
                          ? `${cita.estudiante.nombre} · ${cita.estudiante.seccion}`
                          : "Sin estudiante asociado (registro histórico)"}
                    </p>
                    {cita.motivo && (
                      <p className="text-sm text-text-muted mt-1">
                        “{cita.motivo}”
                      </p>
                    )}
                  </div>
                </div>
                {cita.permisos?.cancelar ? (
                  cancelId === cita.id_cita ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <label className="block text-xs font-semibold text-text-secondary" htmlFor={`cancel-${cita.id_cita}`}>Motivo de cancelación</label>
                      <textarea id={`cancel-${cita.id_cita}`} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} className="portal-field mt-1 min-h-20 resize-y" />
                      {error ? <p role="alert" className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">{error}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={saving} onClick={() => void cancelAppointment(cita.id_cita)} className="portal-button flex-1 bg-danger hover:bg-danger">{saving ? "Cancelando…" : "Confirmar cancelación"}</button>
                        <button type="button" onClick={() => { setCancelId(null); setCancelReason(""); setError(""); }} className="portal-button portal-button-secondary">Volver</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setCancelId(cita.id_cita); setError(""); }} className="portal-button portal-button-secondary mt-3">Cancelar cita</button>
                  )
                ) : null}
              </div>
            ))
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}
