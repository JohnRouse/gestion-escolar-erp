"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Evaluacion { id: number; tipo: string; descripcion: string; valor: number; }
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
    <main className="min-h-screen bg-surface-alt pb-20">
      <ScreenHeader title="Calificaciones" />
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {promedioGeneral !== null && (
              <>
                <p className="text-4xl font-extrabold text-text">{promedioGeneral.toFixed(1)}</p>
                <p className="text-text-secondary text-sm mt-1">Promedio del bimestre</p>
              </>
            )}
          </div>
          <select
            className="bg-white border border-border rounded-full px-4 py-2 text-sm font-bold text-text"
            value={bimestre}
            onChange={(e) => setBimestre(Number(e.target.value))}
          >
            <option value={1}>Bimestre I</option>
            <option value={2}>Bimestre II</option>
            <option value={3}>Bimestre III</option>
            <option value={4}>Bimestre IV</option>
          </select>
        </div>

        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 flex items-center gap-3">
              <div className="skel w-11 h-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3.5 w-1/2" />
                <div className="skel h-2.5 w-1/4" />
              </div>
              <div className="skel h-6 w-20 rounded-full" />
            </div>
          ))
        ) : cursos.length === 0 ? (
          <p className="text-center text-text-secondary py-10">Sin calificaciones para este bimestre.</p>
        ) : (
          cursos.map((curso) => {
            const isOpen = expanded === curso.curso;
            const prom = curso.promedioBimestre;
            const aprobado = prom !== null && prom >= 11;
            return (
              <div key={curso.curso} className="m-card overflow-hidden">
                <button className="w-full press p-4 flex items-center gap-3" onClick={() => setExpanded(isOpen ? null : curso.curso)}>
                  <span className={`w-11 h-11 rounded-full grid place-items-center font-extrabold ${
                    prom !== null
                      ? (aprobado ? "bg-success-soft text-success" : "bg-danger-soft text-danger")
                      : "bg-border text-text-muted"
                  }`}>
                    {prom !== null ? prom.toFixed(1) : "—"}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-extrabold text-text">{curso.curso}</p>
                    <p className="text-xs text-text-secondary">{curso.unidades.length} unidad{curso.unidades.length !== 1 ? "es" : ""}</p>
                  </div>
                  {prom !== null && (
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${aprobado ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                      {aprobado ? "Aprobado" : "En riesgo"}
                    </span>
                  )}
                  <span className="material-symbols-rounded text-text-muted">{isOpen ? "expand_less" : "expand_more"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-surface-alt p-4 space-y-3 text-sm">
                    {curso.unidades.map((unidad) => (
                      <div key={unidad.unidad}>
                        <p className="text-xs font-bold text-text-secondary mb-2">Unidad {unidad.unidad}</p>
                        {unidad.evaluaciones.map((eva) => (
                          <div key={eva.id} className="flex justify-between py-1">
                            <span className="text-text">{eva.descripcion}</span>
                            <span className={`font-bold ${eva.valor >= 11 ? "text-success" : "text-danger"}`}>{eva.valor}</span>
                          </div>
                        ))}
                      </div>
                    ))}
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