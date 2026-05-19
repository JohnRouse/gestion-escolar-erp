"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";

interface Evento {
  id_evento: number;
  titulo: string;
  fecha: string;
  hora?: string | null;
  tipo: string;
  descripcion: string | null;
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

export default function CalendarioPage() {
  const router = useRouter();
  const [anioId] = useState(1);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    axios
      .get(`/api/eventos?anio_id=${anioId}&mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEventos(res.data))
      .catch(() => setEventos([]))
      .finally(() => setLoading(false));
  }, [anioId, mes, router]);

  const hoy = new Date();
  const esMesActual = mes === hoy.getMonth() + 1;

  const diasDelMes = useMemo(() => {
    const primerDia = new Date(2025, mes - 1, 1);
    const ultimoDia = new Date(2025, mes, 0);
    const dias: number[] = [];
    for (let i = 0; i < primerDia.getDay(); i++) {
      dias.push(0);
    }
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(d);
    }
    return dias;
  }, [mes]);

  const eventosPorDia = useMemo(() => {
    const mapa: Record<number, Evento[]> = {};
    for (const ev of eventos) {
      // Tomar solo la parte de la fecha (YYYY-MM-DD) y forzar medianoche local
      const dia = new Date(ev.fecha.split('T')[0] + 'T00:00:00').getDate();
      if (!mapa[dia]) mapa[dia] = [];
      mapa[dia].push(ev);
    }
    return mapa;
  }, [eventos]);

  const cambiarMes = (delta: number) => {
    setMes((prev) => {
      const nuevo = prev + delta;
      if (nuevo < 1) return 12;
      if (nuevo > 12) return 1;
      return nuevo;
    });
    setSelectedDia(null);
  };

  const eventosDelDia = selectedDia ? eventosPorDia[selectedDia] || [] : [];

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
            >
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <h2 className="text-lg font-extrabold text-text">
              {MESES[mes - 1]} 2025
            </h2>
            <button
              onClick={() => cambiarMes(1)}
              className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-text hover:bg-surface-alt"
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
                      className="flex items-start gap-3 p-2 rounded-xl bg-surface-alt"
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
                          {ev.hora && (
                            <span className="text-xs text-text-muted ml-1">
                              · {ev.hora}
                            </span>
                          )}
                        </p>
                        {ev.descripcion && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {ev.descripcion}
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