"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Alerta {
  curso: string;
  promedioActual: number | null;
  promedioAnterior: number | null;
  promedioSeccion: number | null;
  diferencia: number | null;
  tendencia: "mejora" | "bajada" | "estable" | "sin_datos";
  mensaje: string;
}

export default function AlertasAcademicas() {
  const { selectedChild } = useSelectedChild();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    axios
      .get(`/api/calificaciones/padres/alertas?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bimestre}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAlertas(res.data.slice(0, 3))) // mostrar máximo 3 alertas
      .catch(() => setAlertas([]))
      .finally(() => setLoading(false));
  }, [selectedChild, bimestre]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="skel h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (alertas.length === 0) return null;

  const getAlertStyle = (tendencia: string) => {
    switch (tendencia) {
      case "mejora":
        return { bg: "bg-success-soft dark:bg-green-900/30", border: "border-success", text: "text-success", icon: "🌟" };
      case "bajada":
        return { bg: "bg-danger-soft dark:bg-red-900/30", border: "border-danger", text: "text-danger", icon: "📉" };
      case "estable":
        return { bg: "bg-surface-alt dark:bg-gray-800", border: "border-border dark:border-gray-600", text: "text-text-secondary dark:text-gray-400", icon: "📊" };
      default:
        return { bg: "bg-surface-alt dark:bg-gray-800", border: "border-border dark:border-gray-600", text: "text-text-muted", icon: "💬" };
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] tracking-[.22em] font-extrabold text-text-muted uppercase">Alertas académicas</p>
      {alertas.map((alerta, idx) => {
        const style = getAlertStyle(alerta.tendencia);
        return (
          <div
            key={idx}
            className={`${style.bg} border ${style.border} rounded-xl p-3 flex items-center gap-3 animate-fade-in`}
          >
            <span className="text-xl">{style.icon}</span>
            <div className="flex-1">
              <p className={`text-xs font-bold ${style.text}`}>{alerta.curso}</p>
              <p className="text-xs text-text dark:text-gray-300 mt-0.5">{alerta.mensaje}</p>
            </div>
            {alerta.promedioActual !== null && (
              <span className={`text-lg font-extrabold ${style.text}`}>{Math.round(alerta.promedioActual)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}