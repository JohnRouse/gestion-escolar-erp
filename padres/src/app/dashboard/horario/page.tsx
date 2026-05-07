"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Clase { hora_inicio: string; hora_fin: string; curso: string; docente: string; }

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const CURSO_COLORS = [
  { bg: "#EDE9FF", dot: "#7C5CFC" },
  { bg: "#D1FAE5", dot: "#059669" },
  { bg: "#DBEAFE", dot: "#2563EB" },
  { bg: "#FEF3C7", dot: "#D97706" },
  { bg: "#FEE2E2", dot: "#DC2626" },
  { bg: "#E8EBFD", dot: "#2336A8" },
];

export default function HorarioPage() {
  const router = useRouter();
  const [alumnoId] = useState(2);
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
      const res = await axios.get(`/api/academicos/padres/horario?alumno_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setHorario(res.data);
      const hoy = new Date().getDay();
      const diaHoy = DIAS[hoy - 1] || "Lunes";
      setDiaActivo(res.data[diaHoy] ? diaHoy : "Lunes");
    } catch { setHorario({}); } finally { setLoading(false); }
  };

  const clases = horario[diaActivo] ?? [];

  // Assign colors deterministically per curso
  const colorMap: Record<string, typeof CURSO_COLORS[0]> = {};
  let colorIdx = 0;
  Object.values(horario).flat().forEach(c => {
    if (!colorMap[c.curso]) { colorMap[c.curso] = CURSO_COLORS[colorIdx % CURSO_COLORS.length]; colorIdx++; }
  });

  const hoyIdx = new Date().getDay() - 1;
  const diaCorto = (dia: string) => dia === "Miércoles" ? "Mié" : dia.slice(0, 3);

  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
      <header className="px-5 pt-10 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0F2E 0%, #1A2766 60%, #7C5CFC 100%)" }}>
        <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <button onClick={() => router.back()} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Semana</p>
          <h1 className="text-2xl font-extrabold text-white">{diaActivo}</h1>
          <p className="text-white/50 text-xs mt-0.5">{clases.length} clase{clases.length !== 1 ? "s" : ""} programada{clases.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      {/* Day selector */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none">
        {DIAS.map((dia, idx) => {
          const isToday = idx === hoyIdx;
          const isActive = diaActivo === dia;
          return (
            <button key={dia} onClick={() => setDiaActivo(dia)}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl flex-shrink-0 min-w-[56px] transition-all duration-150"
              style={{
                background: isActive ? "#0A0F2E" : "white",
                border: `1px solid ${isActive ? "#0A0F2E" : "#E4E7F5"}`,
                boxShadow: isActive ? "0 2px 8px rgba(10,15,46,0.25)" : "none",
              }}>
              <span className="text-[10px] font-bold" style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#9499C0" }}>
                {diaCorto(dia)}
              </span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#7C5CFC" : "#2336A8" }} />
              )}
              {!isToday && <span className="w-1.5 h-1.5 opacity-0" />}
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-28">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 mb-3" />)
        ) : clases.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">☀️</span>
            <p className="font-semibold text-gray-500">Sin clases</p>
            <p className="text-sm text-gray-400 mt-1">No hay clases programadas el {diaActivo}</p>
          </div>
        ) : (
          <div className="relative pl-5">
            {/* Timeline line */}
            <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, #E4E7F5 0%, transparent 100%)" }} />
            <div className="flex flex-col gap-3">
              {clases.map((clase, idx) => {
                const cfg = colorMap[clase.curso] || CURSO_COLORS[0];
                return (
                  <div key={idx} className="relative">
                    {/* Timeline dot */}
                    <span className="absolute -left-[22px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: cfg.dot }} />
                    <div className="card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold mb-0.5" style={{ color: "#0A0F2E" }}>{clase.curso}</p>
                          <p className="text-xs" style={{ color: "#9499C0" }}>{clase.docente}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold font-mono" style={{ color: "#0A0F2E" }}>{clase.hora_inicio}</p>
                          <p className="text-[10px]" style={{ color: "#9499C0" }}>{clase.hora_fin}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                        <span className="text-[10px] font-semibold" style={{ color: cfg.dot }}>
                          {(() => {
                            const [h1, m1] = clase.hora_inicio.split(":").map(Number);
                            const [h2, m2] = clase.hora_fin.split(":").map(Number);
                            const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                            return `${mins} min`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
