"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface ComparativaData {
  evolucion: { bimestre: number; promedio: number | null }[];
  radar: { curso: string; promedioAlumno: number | null; promedioSeccion: number | null }[];
  mensaje: string;
}

export default function ComparativaNotas() {
  const { selectedChild } = useSelectedChild();
  const [data, setData] = useState<ComparativaData | null>(null);
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(
        `/api/calificaciones/padres/comparativa?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bimestre}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, [selectedChild, bimestre]);

  if (!data) return null;

  const maxNota = 20;

  // ── Gráfico de evolución ──
  const EvolucionBarras = () => {
    const bimestres = data.evolucion.filter((e) => e.promedio !== null);
    if (bimestres.length === 0) return <p className="text-xs text-text-muted">Sin datos de evolución</p>;

    const barWidth = 32;
    const chartHeight = 120;
    const gap = 8;

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-text">Evolución</p>
        <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${bimestres.length * (barWidth + gap)} ${chartHeight + 20}`}>
          {bimestres.map((item, idx) => {
            const barHeight = (item.promedio! / maxNota) * chartHeight;
            return (
              <g key={item.bimestre}>
                <rect
                  x={idx * (barWidth + gap)}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  className="fill-accent"
                />
                <text
                  x={idx * (barWidth + gap) + barWidth / 2}
                  y={chartHeight - barHeight - 4}
                  textAnchor="middle"
                  className="text-[9px] fill-text"
                >
                  {item.promedio}
                </text>
                <text
                  x={idx * (barWidth + gap) + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  className="text-[9px] fill-text-muted"
                >
                  B{item.bimestre}
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
    if (cursos.length < 3) return <p className="text-xs text-text-muted">Se necesitan al menos 3 cursos para el radar</p>;

    const cx = 140, cy = 140, radius = 100;
    const angleSlice = (2 * Math.PI) / cursos.length;

    const getCoords = (idx: number, value: number) => {
      const angle = angleSlice * idx - Math.PI / 2;
      const r = (value / maxNota) * radius;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    const seccionPoints = cursos.map((_, i) => getCoords(i, cursos[i].promedioSeccion!));
    const alumnoPoints = cursos.map((_, i) => getCoords(i, cursos[i].promedioAlumno!));

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-text">Radar comparativo</p>
        <svg width="100%" height="300" viewBox="0 0 280 290">
          {/* Niveles */}
          {[5, 10, 15, 20].map((nivel) => (
            <circle key={nivel} cx={cx} cy={cy} r={(nivel / maxNota) * radius} fill="none" className="stroke-border" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {/* Ejes */}
          {cursos.map((c, i) => {
            const end = getCoords(i, maxNota);
            return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} className="stroke-border" strokeWidth="1" />;
          })}
          {/* Etiquetas */}
          {cursos.map((c, i) => {
            const pos = getCoords(i, maxNota + 8);
            return (
              <text key={i} x={pos.x} y={pos.y} textAnchor="middle" className="text-[9px] fill-text-muted">
                {c.curso.substring(0, 8)}
              </text>
            );
          })}
          {/* Polígono sección */}
          <polygon
            points={seccionPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            className="stroke-text-muted"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
          {/* Polígono alumno */}
          <polygon
            points={alumnoPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            className="fill-accent/20 stroke-accent"
            strokeWidth="2"
          />
          {/* Puntos del alumno */}
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

  return (
    <div className="space-y-4">
      <EvolucionBarras />
      <RadarChart />
      <div className="bg-accent-soft rounded-xl p-3 text-xs text-text leading-relaxed">
        💬 {data.mensaje}
      </div>
    </div>
  );
}