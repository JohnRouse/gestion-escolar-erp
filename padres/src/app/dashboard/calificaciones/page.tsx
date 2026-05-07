"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Evaluacion { tipo: string; descripcion: string; valor: number; }
interface Unidad { unidad: number; evaluaciones: Evaluacion[]; promedioUnidad: number | null; }
interface Curso { curso: string; unidades: Unidad[]; promedioBimestre: number | null; }

export default function CalificacionesPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);
  const { selectedChild } = useSelectedChild();
  const alumnoId = selectedChild?.id_estudiante ?? 2;
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
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className={`px-5 py-6 ${(promedioGeneral ?? 0) >= 11 ? "bg-green-500" : "bg-red-500"}`}>
        <h1 className="text-lg font-bold text-white mb-1">Calificaciones</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-white">{promedioGeneral?.toFixed(1) ?? "—"}</span>
          <span className="text-sm text-white/80">promedio</span>
        </div>
        <div className="flex gap-1 mt-4 bg-white/20 p-1 rounded-lg">
          {[1,2,3,4].map((b) => (
            <button key={b} onClick={() => { setBimestre(b); setExpanded(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                bimestre === b ? "bg-white text-gray-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}>
              {b}° Bim
            </button>
          ))}
        </div>
      </header>
      <div className="px-4 py-4 flex flex-col gap-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />)
        ) : cursos.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Sin calificaciones para este bimestre.</p>
        ) : (
          cursos.map((curso) => {
            const isOpen = expanded === curso.curso;
            const prom = curso.promedioBimestre;
            const aprobado = prom !== null && prom >= 11;
            return (
              <div key={curso.curso} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setExpanded(isOpen ? null : curso.curso)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      prom !== null
                        ? (aprobado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {prom !== null ? prom.toFixed(1) : "—"}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{curso.curso}</span>
                      {prom !== null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-500">{aprobado ? "↑ Aprobado" : "↓ En riesgo"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                    {curso.unidades.map((unidad) => (
                      <div key={unidad.unidad} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Unidad {unidad.unidad}</p>
                          {unidad.promedioUnidad !== null && (
                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{unidad.promedioUnidad.toFixed(1)}</span>
                          )}
                        </div>
                        {unidad.evaluaciones.map((eva) => (
                          <div key={eva.descripcion} className="flex justify-between py-1.5 text-sm">
                            <span className="text-gray-600">{eva.descripcion}</span>
                            <span className={`font-semibold ${eva.valor >= 11 ? "text-green-600" : "text-red-500"}`}>{eva.valor}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {prom !== null && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">Promedio Bimestre</span>
                        <span className={`text-lg font-bold ${aprobado ? "text-green-600" : "text-red-500"}`}>{prom.toFixed(1)}</span>
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