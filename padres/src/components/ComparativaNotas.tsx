"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface ComparativaData {
  evolucion: { bimestre: number; promedio: number | null }[];
  radar: { curso: string; promedioAlumno: number | null; promedioSeccion: number | null }[];
  mensaje: string;
}

interface UnidadesCurso {
  curso: string;
  unidades: { unidad: number; promedio: number | null }[];
}

interface ComparativaNotasProps {
  bimestre: number;
}

const ABREVIATURAS: Record<string, string> = {
  "Comunicación": "Comunic.",
  "Matemática": "Matem.",
  "Ciencia y Tecnología": "Ciencia y Tec.",
  "Personal Social": "Personal Soc.",
  "Inglés": "Inglés",
  "Educación Física": "Educ. Física",
  "Arte": "Arte",
};

function abreviarCurso(nombre: string) {
  return ABREVIATURAS[nombre] || nombre.substring(0, 12);
}

export default function ComparativaNotas({ bimestre }: ComparativaNotasProps) {
  const { selectedChild } = useSelectedChild();
  const [data, setData] = useState<ComparativaData | null>(null);
  const [unidades, setUnidades] = useState<UnidadesCurso[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>("");

  const fetchData = async (bim: number) => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const [compRes, unidRes] = await Promise.all([
      axios.get(`/api/calificaciones/padres/comparativa?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bim}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/calificaciones/padres/unidades?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bim}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    setData(compRes.data);
    setUnidades(unidRes.data);
    if (unidRes.data.length > 0 && !cursoSeleccionado) {
      setCursoSeleccionado(unidRes.data[0].curso);
    }
  };

  useEffect(() => {
    fetchData(bimestre);
  }, [selectedChild, bimestre]);

  if (!data) return null;

  const maxNota = 20;

  // ── Gráfico de evolución (con placeholders) ──
  const EvolucionBarras = () => {
    if (data.evolucion.every((e) => e.promedio === null)) {
      return <p className="text-xs text-text-muted">Sin notas registradas en ningún bimestre.</p>;
    }

    const chartHeight = 120;
    const barWidth = 32;
    const gap = 12;
    const totalBimestres = 4;

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-text dark:text-gray-200">Evolución</p>
        <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${totalBimestres * (barWidth + gap)} ${chartHeight + 20}`}>
          {Array.from({ length: totalBimestres }, (_, i) => {
            const bim = i + 1;
            const item = data.evolucion.find((e) => e.bimestre === bim);
            const tieneDato = item && item.promedio !== null;
            const valorEntero = tieneDato ? Math.round(item!.promedio!) : 0;
            const barHeight = tieneDato ? (valorEntero / maxNota) * chartHeight : 0;
            const isHigh = barHeight > chartHeight * 0.8;

            return (
              <g key={bim}>
                <rect
                  x={i * (barWidth + gap)}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight || 3}
                  rx={4}
                  className={tieneDato ? "fill-accent" : "fill-gray-200 dark:fill-gray-700"}
                  opacity={tieneDato ? 1 : 0.5}
                />
                {tieneDato && (
                  <text
                    x={i * (barWidth + gap) + barWidth / 2}
                    y={isHigh ? chartHeight - barHeight + 12 : chartHeight - barHeight - 4}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${isHigh ? "fill-white" : "fill-text dark:fill-gray-300"}`}
                  >
                    {valorEntero}
                  </text>
                )}
                <text
                  x={i * (barWidth + gap) + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  className={`text-[9px] ${tieneDato ? "fill-text dark:fill-gray-300" : "fill-text-muted dark:fill-gray-500"}`}
                >
                  B{bim}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ── Gráfico de radar ──
  const RadarChart = () => {
    const cursos = data.radar.filter((c) => c.promedioAlumno !== null && c.promedioSeccion !== null);
    if (cursos.length === 0) {
      return <p className="text-xs text-text-muted">No hay suficientes datos comparativos para este bimestre.</p>;
    }
    if (cursos.length < 3) return <p className="text-xs text-text-muted">Se necesitan al menos 3 cursos para el radar</p>;

    const cx = 140, cy = 140, radius = 100;
    const angleSlice = (2 * Math.PI) / cursos.length;

    const getCoords = (idx: number, value: number) => {
      const angle = angleSlice * idx - Math.PI / 2;
      const r = (value / maxNota) * radius;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    const seccionPoints = cursos.map((_, i) => getCoords(i, Math.round(cursos[i].promedioSeccion!)));
    const alumnoPoints = cursos.map((_, i) => getCoords(i, Math.round(cursos[i].promedioAlumno!)));

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-text dark:text-gray-200">Radar comparativo</p>
        <svg width="100%" height="300" viewBox="0 0 280 290">
          {[5, 10, 15, 20].map((nivel) => (
            <circle key={nivel} cx={cx} cy={cy} r={(nivel / maxNota) * radius} fill="none" className="stroke-border dark:stroke-gray-600" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {cursos.map((c, i) => {
            const end = getCoords(i, maxNota);
            return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} className="stroke-border dark:stroke-gray-600" strokeWidth="1" />;
          })}
          {cursos.map((c, i) => {
            const pos = getCoords(i, maxNota + 8);
            return (
              <text key={i} x={pos.x} y={pos.y} textAnchor="middle" className="text-[9px] fill-text-muted dark:fill-gray-400">
                {abreviarCurso(c.curso)}
              </text>
            );
          })}
          <polygon points={seccionPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" className="stroke-text-muted dark:stroke-gray-500" strokeWidth="2" strokeDasharray="6 3" />
          <polygon points={alumnoPoints.map((p) => `${p.x},${p.y}`).join(" ")} className="fill-accent/20 stroke-accent" strokeWidth="2" />
          {alumnoPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" className="fill-accent" />
          ))}
        </svg>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block" /> Alumno</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-text-muted inline-block" style={{ borderTop: '2px dashed' }} /> Sección</span>
        </div>
      </div>
    );
  };

  // ── Gráfico de unidades por curso ──
  const UnidadesBarras = () => {
    const cursoData = unidades.find((u) => u.curso === cursoSeleccionado);
    if (!cursoData || cursoData.unidades.every((u) => u.promedio === null)) {
      return <p className="text-xs text-text-muted">Sin notas registradas en este bimestre para el curso seleccionado.</p>;
    }

    const chartHeight = 100;
    const barWidth = 40;
    const gap = 30;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-text dark:text-gray-200">Unidades de</p>
          <select
            className="bg-white dark:bg-gray-800 border border-border dark:border-gray-600 rounded-lg px-2 py-1 text-xs font-bold text-text dark:text-gray-200"
            value={cursoSeleccionado}
            onChange={(e) => setCursoSeleccionado(e.target.value)}
          >
            {unidades.map((u) => (
              <option key={u.curso} value={u.curso}>{u.curso}</option>
            ))}
          </select>
        </div>
        <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${cursoData.unidades.length * (barWidth + gap)} ${chartHeight + 20}`}>
          {cursoData.unidades.map((unidad, idx) => {
            const valorEntero = unidad.promedio !== null ? Math.round(unidad.promedio) : 0;
            const barHeight = unidad.promedio !== null ? (valorEntero / maxNota) * chartHeight : 0;
            const isHigh = barHeight > chartHeight * 0.8;
            return (
              <g key={unidad.unidad}>
                <rect
                  x={idx * (barWidth + gap)}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight || 3}
                  rx={4}
                  className={unidad.promedio !== null ? "fill-accent" : "fill-gray-200 dark:fill-gray-700"}
                  opacity={unidad.promedio !== null ? 1 : 0.5}
                />
                {unidad.promedio !== null && (
                  <text
                    x={idx * (barWidth + gap) + barWidth / 2}
                    y={isHigh ? chartHeight - barHeight + 12 : chartHeight - barHeight - 4}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${isHigh ? "fill-white" : "fill-text dark:fill-gray-300"}`}
                  >
                    {valorEntero}
                  </text>
                )}
                <text
                  x={idx * (barWidth + gap) + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  className="text-[9px] fill-text-muted dark:fill-gray-400"
                >
                  U{unidad.unidad}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <EvolucionBarras />
      <UnidadesBarras />
      <RadarChart />
      <div className="bg-accent-soft dark:bg-accent/20 rounded-xl p-3 text-xs text-text dark:text-gray-200 leading-relaxed">
        🌟 {data.mensaje}
      </div>
    </div>
  );
}