"use client";

import { Star, ThumbsUp, TrendingUp } from "lucide-react";

interface Evaluacion {
  id: number;
  tipo: string;
  descripcion: string;
  valor: number;
}

interface Unidad {
  unidad: number;
  evaluaciones: Evaluacion[];
  promedioUnidad: number | null;
}

interface SemaforoNotasProps {
  unidades: Unidad[];
}

export default function SemaforoNotas({ unidades }: SemaforoNotasProps) {
  const getColor = (valor: number) => {
    if (valor >= 15) return "bg-success-soft text-success border-success";
    if (valor >= 11) return "bg-warning-soft text-warning border-warning";
    return "bg-danger-soft text-danger border-danger";
  };

  const getIcon = (valor: number) => {
    if (valor >= 15) return Star;
    if (valor >= 11) return ThumbsUp;
    return TrendingUp;
  };

  return (
    <div className="space-y-3">
      {unidades.map((unidad) => (
        <div key={unidad.unidad}>
          <p className="text-xs font-bold text-text-secondary mb-2">Unidad {unidad.unidad}</p>
          <div className="flex flex-wrap gap-2">
            {unidad.evaluaciones.map((eva) => {
              const Icon = getIcon(Math.round(eva.valor));
              return (
              <div
                key={eva.id}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${getColor(Math.round(eva.valor))}`}
                title={eva.tipo}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{eva.descripcion}</span>
                <span className="ml-1">{Math.round(eva.valor)}</span>
              </div>
              );
            })}
          </div>
          {unidad.promedioUnidad !== null && (
            <p className="mt-1 text-xs text-text-muted">
              Promedio unidad: <span className="font-bold text-text">{Math.round(unidad.promedioUnidad)}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
