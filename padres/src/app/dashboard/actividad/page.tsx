"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface EventoActividad {
  tipo: string;
  icono: string;
  mensaje: string;
  fecha: string;
  url: string;
}

export default function ActividadPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const [eventos, setEventos] = useState<EventoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetchActividad(token, selectedChild.id_estudiante);
  }, [selectedChild]);

  const fetchActividad = async (token: string, alumnoId: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/actividad?alumno_id=${alumnoId}&limite=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEventos(res.data);
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Actividad Reciente" />
        <div className="px-5 pt-4 pb-28 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="m-card p-3 flex items-center gap-3">
              <div className="skel w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3 w-3/4" />
                <div className="skel h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Actividad Reciente" />
      <div className="px-5 pt-4 pb-28">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="m-card p-3 flex items-center gap-3">
                <div className="skel w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skel h-3 w-3/4" />
                  <div className="skel h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <p className="text-center text-text-secondary py-10">No hay actividad registrada.</p>
        ) : (
          <div className="space-y-3">
            {eventos.map((evento, idx) => (
              <button
                key={idx}
                onClick={() => router.push(evento.url)}
                className="m-card p-3 flex items-center gap-3 press w-full text-left"
              >
                <span className="w-10 h-10 rounded-xl bg-surface-alt flex items-center justify-center text-lg">
                  {evento.icono}
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
                <span className="material-symbols-rounded text-text-muted">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}