"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Clase { hora_inicio: string; hora_fin: string; curso: string; docente: string; }

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function HorarioPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const alumnoId = selectedChild?.id_estudiante ?? 2;
  const [horario, setHorario] = useState<Record<string, Clase[]>>({});
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchHorario(token, alumnoId);
  }, [router, alumnoId]);

  const fetchHorario = async (token: string, id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/padres/horario?alumno_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHorario(res.data);
      const hoy = new Date().getDay();
      const diaHoy = DIAS[hoy - 1] || "Lunes";
      setDiaActivo(res.data[diaHoy] ? diaHoy : "Lunes");
    } catch { setHorario({}); } finally { setLoading(false); }
  };

  const clases = horario[diaActivo] ?? [];

  return (
    <main className="min-h-screen bg-surface-alt pb-20">
      <ScreenHeader title="Horario" />
      <div className="px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-4">
          {DIAS.map((dia) => (
            <button
              key={dia}
              onClick={() => setDiaActivo(dia)}
              className={`press w-12 h-12 rounded-2xl font-bold text-sm transition-all ${
                diaActivo === dia
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "bg-white text-text-secondary border border-border hover:bg-surface-alt"
              }`}
            >
              {dia.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pt-2 pb-28 space-y-3 relative">
        <div className="absolute left-7 top-2 bottom-32 w-px bg-border" />
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 flex items-start gap-3 relative pl-6">
              <div className="skel w-3 h-3 rounded-full absolute left-[10px] top-4" />
              <div className="flex-1 space-y-2">
                <div className="skel h-4 w-32" />
                <div className="skel h-3 w-24" />
              </div>
            </div>
          ))
        ) : clases.length === 0 ? (
          <p className="text-center text-text-secondary py-10">Sin clases el {diaActivo}.</p>
        ) : (
          clases.map((clase, idx) => (
            <div key={idx} className="relative pl-6">
              <span className={`absolute left-[10px] top-4 w-3 h-3 rounded-full ring-4 ${
                idx % 2 === 0 ? "bg-accent ring-accent-soft" : "bg-info ring-info-soft"
              }`} />
              <div className="m-card p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-text">{clase.curso}</p>
                  <p className="text-xs text-text-secondary">{clase.docente}</p>
                  <span className={`inline-flex mt-2 items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    idx % 2 === 0 ? "bg-accent-soft text-accent" : "bg-info-soft text-info"
                  }`}>
                    <span className={`dot ${idx % 2 === 0 ? "bg-accent" : "bg-info"}`} />
                    45 min
                  </span>
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