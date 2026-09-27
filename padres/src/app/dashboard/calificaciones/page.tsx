"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import ComparativaNotas from "@/components/ComparativaNotas";

interface Evaluacion { id: number; tipo: string; descripcion: string; valor: number | null; }
interface Unidad { unidad: number; evaluaciones: Evaluacion[]; promedioUnidad: number | null; }
interface Curso { curso: string; unidades: Unidad[]; promedioBimestre: number | null; }

export default function CalificacionesPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState<number | null>(null);
  const { selectedChild, childrenLoading, childrenError } = useSelectedChild();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mostrarComparativa, setMostrarComparativa] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!selectedChild) {
      return;
    }
    if (!token) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setCursos([]);
      setExpanded(null);
      setError("");
    });
    const numero = bimestre ?? selectedChild.bimestre_actual;
    const bimestreQuery = numero ? `&bimestre_id=${numero}` : "";
    axios
      .get(
        `/api/calificaciones/padres/notas?alumno_id=${selectedChild.id_estudiante}${bimestreQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )
      .then((res) => setCursos(res.data))
      .catch((error) => {
        if (!axios.isCancel(error)) {
          setCursos([]);
          setError("No se pudieron cargar las calificaciones.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [bimestre, childrenLoading, retryKey, selectedChild]);

  const promediosDisponibles = cursos.flatMap((course) => course.promedioBimestre === null ? [] : [course.promedioBimestre]);
  const promedioGeneral = promediosDisponibles.length > 0
    ? Math.round(promediosDisponibles.reduce((sum, value) => sum + value, 0) / promediosDisponibles.length)
    : null;

  return (
    <main className="portal-page">
      <ScreenHeader title="Calificaciones" subtitle="Notas y avances por materia" />
      <div className="portal-content space-y-3">
        <div className="portal-summary m-card flex flex-wrap items-end justify-between gap-3 p-4">
          <div>
            {promedioGeneral !== null && (
              <>
                <p className="portal-summary-value">
                  {promedioGeneral}
                </p>
                <p className="text-text-secondary dark:text-gray-400 text-sm mt-1">
                  Promedio del bimestre
                </p>
              </>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setMostrarComparativa(!mostrarComparativa)}
              className="portal-button portal-button-secondary"
            >
              <BarChart3 size={16} aria-hidden="true" />
              {mostrarComparativa ? "Ocultar análisis" : "Ver análisis"}
            </button>
            <select
              className="portal-field w-auto min-w-[148px] font-medium"
              value={bimestre ?? selectedChild?.bimestre_actual ?? ""}
              onChange={(e) => setBimestre(Number(e.target.value))}
            >
              {!bimestre && !selectedChild?.bimestre_actual ? (
                <option value="">Bimestre disponible</option>
              ) : null}
              <option value={1}>Bimestre I</option>
              <option value={2}>Bimestre II</option>
              <option value={3}>Bimestre III</option>
              <option value={4}>Bimestre IV</option>
            </select>
          </div>
        </div>

        {mostrarComparativa && (bimestre ?? selectedChild?.bimestre_actual) && (
          <div className="m-card p-4 animate-fade-in">
            <ComparativaNotas
              bimestre={(bimestre ?? selectedChild?.bimestre_actual)!}
            />
          </div>
        )}

        {childrenError || error ? (
          <PortalState kind="error" title="No pudimos cargar las calificaciones" description={childrenError || error} actionLabel={error ? "Reintentar" : undefined} onAction={error ? () => setRetryKey((key) => key + 1) : undefined} />
        ) : !childrenLoading && !selectedChild ? (
          <PortalState title="Selecciona un estudiante" description="Elige un estudiante para consultar sus calificaciones." />
        ) : childrenLoading || loading ? (
          <PortalSkeletonList />
        ) : cursos.length === 0 ? (
          <PortalState title="No hay calificaciones todavía" description="Las notas publicadas para este bimestre aparecerán aquí." />
        ) : (
          cursos.map((curso) => {
            const isOpen = expanded === curso.curso;
            const prom = curso.promedioBimestre;
            return (
              <div key={curso.curso} className="m-card overflow-hidden">
                <button
                  className="w-full press p-4 flex items-center gap-3"
                  onClick={() => setExpanded(isOpen ? null : curso.curso)}
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg text-xl font-bold ${prom !== null ? "bg-accent text-white" : "bg-border text-text-muted"}`}
                  >
                    {prom !== null ? Math.round(prom) : "—"}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-extrabold text-text dark:text-gray-100">{curso.curso}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {curso.unidades.length} unidad{curso.unidades.length !== 1 ? "es" : ""}
                    </p>
                  </div>
                  {prom !== null ? <span className="portal-badge bg-surface-muted text-text-secondary">Promedio</span> : null}
                  {isOpen ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
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
                        <div className="divide-y divide-border rounded-lg border border-border bg-white">
                              {unidad.evaluaciones.map((eva) => (
                                <div key={eva.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-text dark:text-gray-200">{eva.descripcion}</p>
                                    <p className="text-xs text-text-secondary dark:text-gray-400">{eva.tipo}</p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`portal-badge min-w-[3rem] justify-center ${
                                        eva.valor === null ? "bg-border text-text-muted" : Math.round(eva.valor) >= 15
                                          ? "bg-success-soft text-success"
                                          : Math.round(eva.valor) >= 11
                                          ? "bg-warning-soft text-warning"
                                          : "bg-danger-soft text-danger"
                                      }`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          eva.valor !== null && Math.round(eva.valor) >= 15
                                            ? "bg-success"
                                            : eva.valor !== null && Math.round(eva.valor) >= 11
                                            ? "bg-warning"
                                            : "bg-danger"
                                        }`}
                                      />
                                      {eva.valor === null ? "—" : Math.round(eva.valor)}
                                    </span>
                                  </div>
                                </div>
                              ))}
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
