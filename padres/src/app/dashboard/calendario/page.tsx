"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { PortalState, portalStateIcons } from "@/components/PortalUI";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import {
  PortalAcademicYear,
  selectPortalAcademicYear,
} from "@/lib/portalAcademicYear";
import {
  authorizedDeepLinkDay,
  parsePortalCalendarDeepLink,
} from "@/lib/portalCalendarDeepLink";

interface Evento {
  id_evento: number;
  titulo: string;
  fecha: string;
  hora?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  tipo: string;
  descripcion: string | null;
  estado: "programado" | "cancelado" | "realizado";
  ubicacion?: string | null;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPO_COLORS: Record<string, string> = {
  feriado: "bg-danger-soft text-danger",
  examen: "bg-accent-soft text-accent-dark",
  reunion: "bg-info-soft text-info",
  actividad: "bg-success-soft text-success",
};

function CalendarFallback() {
  return (
    <main className="portal-page">
      <ScreenHeader title="Calendario escolar" subtitle="Eventos y actividades" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <div className="portal-content">
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
              <div key={i} className="aspect-square skel rounded-lg" />
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}

function CalendarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkQuery = searchParams.toString();
  const deepLink = useMemo(
    () => parsePortalCalendarDeepLink(new URLSearchParams(deepLinkQuery)),
    [deepLinkQuery],
  );
  const { selectedChild } = useSelectedChild();
  const [anioId, setAnioId] = useState<number | null>(null);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "no-year" | "error"
  >("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();
    axios
      .get("/api/academicos/padres/anios", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => {
        const selected = selectPortalAcademicYear(
          res.data as PortalAcademicYear[],
          selectedChild?.id_anio,
          deepLink.anioId,
        );
        if (!selected) {
          setAnioId(null);
          setEventos([]);
          setStatus("no-year");
          setLoading(false);
          return;
        }
        setAnioId(selected.id_anio);
        setAnio(new Date(selected.fecha_inicio).getFullYear());
        if (!deepLink.anioId || selected.id_anio === deepLink.anioId) {
          if (deepLink.mes) setMes(deepLink.mes);
          if (!deepLink.eventoId) setSelectedDia(deepLink.dia);
        }
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setAnioId(null);
        setEventos([]);
        setStatus("error");
        setLoading(false);
      });

    return () => controller.abort();
  }, [
    deepLink.anioId,
    deepLink.dia,
    deepLink.eventoId,
    deepLink.mes,
    retryKey,
    router,
    selectedChild?.id_anio,
  ]);

  useEffect(() => {
    if (!anioId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const controller = new AbortController();
    axios
      .get(`/api/eventos/padres?anio_id=${anioId}&mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => {
        const authorizedEvents = (res.data.data ?? []) as Evento[];
        setEventos(authorizedEvents);
        if (!deepLink.anioId || anioId === deepLink.anioId) {
          setSelectedDia(authorizedDeepLinkDay(deepLink, authorizedEvents));
        }
        setStatus("ready");
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setEventos([]);
        setStatus("error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [anioId, deepLink, mes, retryKey]);

  const hoy = new Date();
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;

  const diasDelMes = useMemo(() => {
    if (!anio) return [];
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    const dias: number[] = [];
    for (let i = 0; i < primerDia.getDay(); i++) {
      dias.push(0);
    }
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(d);
    }
    return dias;
  }, [anio, mes]);

  const eventosPorDia = useMemo(() => {
    const mapa: Record<number, Evento[]> = {};
    for (const ev of eventos) {
      const dia = new Date(ev.fecha.split('T')[0] + 'T00:00:00').getDate();
      if (!mapa[dia]) mapa[dia] = [];
      mapa[dia].push(ev);
    }
    return mapa;
  }, [eventos]);

  const cambiarMes = (delta: number) => {
    setLoading(true);
    setMes((prev) => {
      const nuevo = prev + delta;
      if (nuevo < 1) return 12;
      if (nuevo > 12) return 1;
      return nuevo;
    });
    setSelectedDia(null);
  };

  const eventosDelDia = selectedDia ? eventosPorDia[selectedDia] || [] : [];

  if (!mounted) {
    return <CalendarFallback />;
  }

  if (status === "error" || status === "no-year") {
    return (
      <main className="portal-page">
        <ScreenHeader title="Calendario escolar" subtitle="Eventos y actividades" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
        <div className="portal-content">
          <PortalState
            kind={status === "error" ? "error" : "empty"}
            icon={portalStateIcons.calendar}
            title={status === "no-year" ? "No hay un año lectivo disponible" : "No pudimos cargar el calendario"}
            description={status === "no-year" ? "La institución aún no tiene un año operativo para mostrar." : "No se pudo cargar el calendario. Revisa tu conexión e intenta nuevamente."}
            actionLabel={status === "error" ? "Reintentar" : undefined}
            onAction={status === "error" ? () => { setStatus("loading"); setLoading(true); setRetryKey((value) => value + 1); } : undefined}
          />
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="portal-page">
      <ScreenHeader title="Calendario escolar" subtitle="Eventos y actividades" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <PageTransition>
        <div className="portal-content">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => cambiarMes(-1)}
              className="portal-icon-button"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
            <h2 className="text-lg font-extrabold text-text">
              {MESES[mes - 1]} {anio}
            </h2>
            <button
              onClick={() => cambiarMes(1)}
              className="portal-icon-button"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-text-muted">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square skel rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes.map((dia, idx) => {
                if (dia === 0) return <div key={`empty-${idx}`} />;

                const esHoy = esMesActual && dia === hoy.getDate();
                const tieneEventos = !!eventosPorDia[dia];
                const esSeleccionado = dia === selectedDia;

                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDia(esSeleccionado ? null : dia)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                      esSeleccionado
                        ? "bg-accent text-white shadow-sm"
                        : esHoy
                        ? "border border-accent bg-white text-accent-dark"
                        : tieneEventos
                        ? "bg-accent-soft text-accent"
                        : "bg-white text-text hover:bg-surface-alt"
                    }`}
                  >
                    {dia}
                    {tieneEventos && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && status === "ready" && eventos.length === 0 ? (
            <PortalState icon={portalStateIcons.calendar} title="No hay eventos este mes" description="Las actividades publicadas por la institución aparecerán aquí." className="mt-4" />
          ) : null}

          {!loading && status === "ready" && eventos.length > 0 && !selectedDia ? (
            <div className="mt-4 flex min-h-16 items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
              <span className="portal-icon-box h-9 w-9"><Clock3 size={16} aria-hidden="true" /></span>
              <p><span className="font-semibold text-text">Selecciona un día con indicador</span><br />Verás debajo los eventos y sus detalles.</p>
            </div>
          ) : null}

          {selectedDia && (
            <div className="m-card mt-4 p-4 animate-fade-in">
              <p className="text-sm font-bold text-text mb-2">
                {selectedDia} de {MESES[mes - 1]}
              </p>
              {eventosDelDia.length === 0 ? (
                <p className="text-sm text-text-muted">Sin eventos para este día.</p>
              ) : (
                <div className="space-y-2">
                  {eventosDelDia.map((ev) => (
                    <div
                      key={ev.id_evento}
                      className={`rounded-lg border border-border bg-surface-alt p-3 ${ev.estado === "cancelado" ? "opacity-70" : ""}`}
                    >
                      <span
                        className={`portal-badge ${
                          TIPO_COLORS[ev.tipo] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ev.tipo}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-text">
                          {ev.titulo}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold capitalize text-text-secondary">
                          {ev.estado}
                        </p>
                        {ev.descripcion && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {ev.descripcion}
                          </p>
                        )}
                        {ev.ubicacion && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                            <MapPin size={13} aria-hidden="true" /> {ev.ubicacion}
                          </p>
                        )}
                        {(ev.hora_inicio || ev.hora) ? <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary"><Clock3 size={13} aria-hidden="true" />{ev.hora_inicio || ev.hora}{ev.hora_fin ? `–${ev.hora_fin}` : ""}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<CalendarFallback />}>
      <CalendarioContent />
    </Suspense>
  );
}
