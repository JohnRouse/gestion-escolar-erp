"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import ComparativaNotas from "@/components/ComparativaNotas";

interface Evaluacion { id: number; tipo: string; descripcion: string; valor: number; }
interface Unidad { unidad: number; evaluaciones: Evaluacion[]; promedioUnidad: number | null; }
interface Curso { curso: string; unidades: Unidad[]; promedioBimestre: number | null; }

export default function CalificacionesPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [bimestre, setBimestre] = useState(1);
  const { selectedChild } = useSelectedChild();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mostrarComparativa, setMostrarComparativa] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !selectedChild) return;
    fetchNotas(token, selectedChild.id_estudiante, bimestre);
  }, [selectedChild, bimestre]);

  const fetchNotas = async (token: string, id: number, bim: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/calificaciones/padres/notas?alumno_id=${id}&bimestre_id=${bim}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCursos(res.data);
    } catch { setCursos([]); } finally { setLoading(false); }
  };

  const promedioGeneral =
    cursos.length > 0
      ? Math.round(
          cursos
            .filter((c) => c.promedioBimestre !== null)
            .reduce((s, c) => s + (c.promedioBimestre ?? 0), 0) /
          cursos.filter((c) => c.promedioBimestre !== null).length
        )
      : null;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt dark:bg-[#0F172A] pb-20">
        <ScreenHeader title="Calificaciones" />
        <div className="px-5 pt-5 pb-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 flex items-center gap-3">
              <div className="skel w-11 h-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3.5 w-1/2" />
                <div className="skel h-2.5 w-1/4" />
              </div>
              <div className="skel h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt dark:bg-[#0F172A] pb-20">
      <ScreenHeader title="Calificaciones" />
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {promedioGeneral !== null && (
              <>
                <p className="text-4xl font-extrabold text-text dark:text-gray-100">
                  {promedioGeneral}
                </p>
                <p className="text-text-secondary dark:text-gray-400 text-sm mt-1">
                  Promedio del bimestre
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarComparativa(!mostrarComparativa)}
              className="press px-4 py-2 rounded-full text-xs font-bold bg-accent text-white shadow-md"
            >
              {mostrarComparativa ? "Ocultar análisis" : "Ver análisis"}
            </button>
            <select
              className="bg-white dark:bg-gray-800 border border-border dark:border-gray-600 rounded-full px-4 py-2 text-sm font-bold text-text dark:text-gray-200"
              value={bimestre}
              onChange={(e) => setBimestre(Number(e.target.value))}
            >
              <option value={1}>Bimestre I</option>
              <option value={2}>Bimestre II</option>
              <option value={3}>Bimestre III</option>
              <option value={4}>Bimestre IV</option>
            </select>
          </div>
        </div>

        {mostrarComparativa && (
          <div className="m-card p-4 animate-fade-in">
            <ComparativaNotas bimestre={bimestre} />
          </div>
        )}

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
          <p className="text-center text-text-secondary dark:text-gray-400 py-10">
            Sin calificaciones para este bimestre.
          </p>
        ) : (
          cursos.map((curso) => {
            const isOpen = expanded === curso.curso;
            const prom = curso.promedioBimestre;
            const aprobado = prom !== null && prom >= 11;
            return (
              <div key={curso.curso} className="m-card overflow-hidden">
                <button
                  className="w-full press p-4 flex items-center gap-3"
                  onClick={() => setExpanded(isOpen ? null : curso.curso)}
                >
                  <span
                    className={`w-11 h-11 rounded-full grid place-items-center font-extrabold ${
                      prom !== null
                        ? aprobado
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                        : "bg-border text-text-muted"
                    }`}
                  >
                    {prom !== null ? Math.round(prom) : "—"}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-extrabold text-text dark:text-gray-100">{curso.curso}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {curso.unidades.length} unidad{curso.unidades.length !== 1 ? "es" : ""}
                    </p>
                  </div>
                  {prom !== null && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        aprobado
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger"
                      }`}
                    >
                      {aprobado ? "Aprobado" : "En riesgo"}
                    </span>
                  )}
                  <span className="material-symbols-rounded text-text-muted">
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border dark:border-gray-700 bg-surface-alt dark:bg-gray-800 p-4 space-y-3 text-sm">
                    {curso.unidades.map((unidad) => (
                      <div key={unidad.unidad}>
                        <p className="text-xs font-bold text-text-secondary dark:text-gray-400 mb-2">
                          Unidad {unidad.unidad}
                          {unidad.promedioUnidad !== null && (
                            <span className="ml-2 text-text dark:text-gray-200 font-bold">
                              Promedio: {Math.round(unidad.promedioUnidad)}
                            </span>
                          )}
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border dark:border-gray-600">
                                <th className="text-left py-1 text-text-muted font-medium">Evaluación</th>
                                <th className="text-left py-1 text-text-muted font-medium">Tipo</th>
                                <th className="text-right py-1 text-text-muted font-medium">Nota</th>
                              </tr>
                            </thead>
                            <tbody>
                              {unidad.evaluaciones.map((eva) => (
                                <tr key={eva.id} className="border-b border-border/50 dark:border-gray-700">
                                  <td className="py-1.5 text-text dark:text-gray-200">{eva.descripcion}</td>
                                  <td className="py-1.5 text-text-secondary dark:text-gray-400">{eva.tipo}</td>
                                  <td className="py-1.5 text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                        Math.round(eva.valor) >= 15
                                          ? "bg-success-soft text-success"
                                          : Math.round(eva.valor) >= 11
                                          ? "bg-warning-soft text-warning"
                                          : "bg-danger-soft text-danger"
                                      }`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          Math.round(eva.valor) >= 15
                                            ? "bg-success"
                                            : Math.round(eva.valor) >= 11
                                            ? "bg-warning"
                                            : "bg-danger"
                                        }`}
                                      />
                                      {Math.round(eva.valor)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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