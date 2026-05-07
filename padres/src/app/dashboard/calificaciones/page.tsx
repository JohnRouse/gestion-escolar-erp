"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Evaluacion { tipo: string; descripcion: string; valor: number; }
interface Unidad { unidad: number; evaluaciones: Evaluacion[]; promedioUnidad: number | null; }
interface Curso { curso: string; unidades: Unidad[]; promedioBimestre: number | null; }

export default function CalificacionesPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);
  const [alumnoId] = useState(2);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchNotas(token, alumnoId, bimestre);
  }, [router, alumnoId, bimestre]);

  const fetchNotas = async (token: string, id: number, bim: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/calificaciones/padres/notas?alumno_id=${id}&bimestre_id=${bim}`, { headers: { Authorization: `Bearer ${token}` } });
      setCursos(res.data);
    } catch { setCursos([]); } finally { setLoading(false); }
  };

  const promedioGeneral = cursos.length > 0
    ? (cursos.filter(c => c.promedioBimestre !== null).reduce((s, c) => s + (c.promedioBimestre ?? 0), 0) / cursos.filter(c => c.promedioBimestre !== null).length)
    : null;

  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
      {/* Header */}
      <header className="px-5 pt-10 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0F2E 0%, #1A2766 60%, #2336A8 100%)" }}>
        <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C5CFC, transparent)" }} />
        <button onClick={() => router.back()} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Calificaciones</p>
            <h1 className="text-2xl font-extrabold text-white">
              {promedioGeneral !== null ? promedioGeneral.toFixed(1) : "—"}
            </h1>
            <p className="text-white/50 text-xs mt-0.5">Promedio Bimestre {bimestre}</p>
          </div>
          {/* Bimestre selector */}
          <div className="flex gap-1.5">
            {[1,2,3,4].map((b) => (
              <button key={b} onClick={() => setBimestre(b)}
                className="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                style={{ background: bimestre === b ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.10)", color: bimestre === b ? "#0A0F2E" : "rgba(255,255,255,0.6)" }}>
                {b}°
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 py-5 pb-28 flex flex-col gap-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)
        ) : cursos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">📭</span>
            <p className="font-semibold text-gray-500">Sin calificaciones</p>
            <p className="text-sm text-gray-400 mt-1">No hay notas para el Bimestre {bimestre}</p>
          </div>
        ) : (
          cursos.map((curso, idx) => {
            const isOpen = expanded === curso.curso;
            const prom = curso.promedioBimestre;
            const aprobado = prom !== null && prom >= 11;
            return (
              <div key={idx} className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  onClick={() => setExpanded(isOpen ? null : curso.curso)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: aprobado ? "#D1FAE5" : prom === null ? "#ECEFFE" : "#FEE2E2", color: aprobado ? "#059669" : prom === null ? "#2336A8" : "#DC2626" }}>
                      {prom !== null ? prom.toFixed(1) : "—"}
                    </span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#0A0F2E" }}>{curso.curso}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9499C0" }}>{curso.unidades.length} unidad{curso.unidades.length !== 1 ? "es" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prom !== null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: aprobado ? "#D1FAE5" : "#FEE2E2", color: aprobado ? "#059669" : "#DC2626" }}>
                        {aprobado ? "Aprobado" : "Desaprobado"}
                      </span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9499C0" strokeWidth="2" strokeLinecap="round"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    {curso.unidades.map((unidad, uIdx) => (
                      <div key={uIdx} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9499C0" }}>Unidad {unidad.unidad}</p>
                          {unidad.promedioUnidad !== null && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: unidad.promedioUnidad >= 11 ? "#D1FAE5" : "#FEE2E2", color: unidad.promedioUnidad >= 11 ? "#059669" : "#DC2626" }}>
                              Prom. {unidad.promedioUnidad.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {unidad.evaluaciones.map((eva, eIdx) => (
                            <div key={eIdx} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "#F6F7FF" }}>
                              <p className="text-xs" style={{ color: "#4A5080" }}>{eva.descripcion}</p>
                              <span className="text-sm font-extrabold font-mono" style={{ color: eva.valor >= 11 ? "#059669" : "#DC2626" }}>
                                {eva.valor}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {curso.promedioBimestre !== null && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: "#0A0F2E" }}>Promedio del Bimestre</span>
                        <span className="text-lg font-extrabold font-mono" style={{ color: aprobado ? "#059669" : "#DC2626" }}>
                          {curso.promedioBimestre.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}
