"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
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
  feriado: "bg-red-100 text-red-700",
  examen: "bg-blue-100 text-blue-700",
  reunion: "bg-purple-100 text-purple-700",
  actividad: "bg-green-100 text-green-700",
};

function CalendarFallback() {
  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Calendario Escolar" />
      <div className="px-5 pt-4 pb-28">
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square skel rounded-xl" />
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
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Calendario Escolar" />
        <div className="px-5 pt-8 text-center">
          <p className="text-sm text-text-secondary">
            {status === "no-year"
              ? "No hay un año lectivo disponible para mostrar el calendario."
              : "No se pudo cargar el calendario."}
          </p>
          {status === "error" ? (
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setLoading(true);
                setRetryKey((value) => value + 1);
              }}
              className="btn-contained mt-4 min-h-11 px-5"
            >
              Reintentar
            </button>
          ) : null}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Calendario Escolar" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          <button
            onClick={() => router.push("/dashboard?open=servicios")}
            className="text-accent text-sm font-bold hover:underline mb-4 flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-lg">arrow_back</span> Servicios
          </button>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => cambiarMes(-1)}
              className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-text hover:bg-surface-alt"
              aria-label="Mes anterior"
            >
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <h2 className="text-lg font-extrabold text-text">
              {MESES[mes - 1]} {anio}
            </h2>
            <button
              onClick={() => cambiarMes(1)}
              className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-text hover:bg-surface-alt"
              aria-label="Mes siguiente"
            >
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-text-muted mb-2">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square skel rounded-xl" />
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
                    className={`aspect-square rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${
                      esSeleccionado
                        ? "bg-accent text-white shadow-lg"
                        : esHoy
                        ? "bg-primary text-white"
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
            <p className="py-4 text-center text-sm text-text-secondary">
              No hay eventos programados para este mes.
            </p>
          ) : null}

          {selectedDia && (
            <div className="mt-4 bg-white rounded-2xl border border-border p-4 animate-fade-in">
              <p className="text-sm font-bold text-text mb-2">
                {selectedDia} de {MESES[mes - 1]}
              </p>
              {eventosDelDia.length === 0 ? (
                <p className="text-xs text-text-muted">Sin eventos</p>
              ) : (
                <div className="space-y-2">
                  {eventosDelDia.map((ev) => (
                    <div
                      key={ev.id_evento}
                      className={`flex items-start gap-3 p-2 rounded-xl bg-surface-alt ${ev.estado === "cancelado" ? "opacity-70" : ""}`}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          TIPO_COLORS[ev.tipo] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ev.tipo}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-text">
                          {ev.titulo}
                          {(ev.hora_inicio || ev.hora) && (
                            <span className="text-xs text-text-muted ml-1">
                              · {ev.hora_inicio || ev.hora}
                              {ev.hora_fin ? `–${ev.hora_fin}` : ""}
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-bold capitalize text-text-secondary mt-0.5">
                          {ev.estado}
                        </p>
                        {ev.descripcion && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {ev.descripcion}
                          </p>
                        )}
                        {ev.ubicacion && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {ev.ubicacion}
                          </p>
                        )}
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
