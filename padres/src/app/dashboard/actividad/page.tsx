"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { PortalNotificationIcon, PortalState, PortalSkeletonList } from "@/components/PortalUI";
import { portalNotificationTarget } from "@/lib/portalNotificationNavigation";

interface EventoActividad {
  tipo: string;
  mensaje: string;
  fecha: string;
  url: string;
}

interface PortalNotificationDto {
  origen?: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  fecha_creacion: string;
  url?: string | null;
}

export default function ActividadPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<EventoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const controller = new AbortController();
    const fetchActividad = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/notificaciones/portal?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      setEventos((res.data.data ?? []).map((item: PortalNotificationDto) => ({
        tipo: item.origen || item.tipo,
        mensaje: item.titulo || item.mensaje,
        fecha: item.fecha_creacion,
        url: portalNotificationTarget(item, window.location.origin),
      })));
    } catch (requestError) {
      if (axios.isCancel(requestError)) return;
      setEventos([]);
      setError("No se pudo cargar la actividad.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    };
    void fetchActividad();
    return () => controller.abort();
  }, [retryKey]);

  return (
    <main className="portal-page">
      <ScreenHeader title="Actividad" subtitle="Notificaciones y movimientos recientes" />
      <div className="portal-content">
        {loading ? (
          <PortalSkeletonList rows={5} />
        ) : error ? (
          <PortalState kind="error" title="No pudimos cargar la actividad" description={error} actionLabel="Reintentar" onAction={() => setRetryKey((key) => key + 1)} />
        ) : eventos.length === 0 ? (
          <PortalState title="No hay actividad registrada" description="Los avisos y movimientos del portal aparecerán aquí." />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-white px-4">
            {eventos.map((evento, idx) => (
              <button
                key={idx}
                onClick={() => router.push(evento.url)}
                className="portal-list-item press w-full text-left"
              >
                <span className="portal-icon-box">
                  <PortalNotificationIcon origin={evento.tipo} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text">{evento.mensaje}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
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
        )}
      </div>
      <BottomNav />
    </main>
  );
}
