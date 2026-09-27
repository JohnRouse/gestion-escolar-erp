"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { MessageSquareText, Minus, TrendingDown, TrendingUp } from "lucide-react";
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

  useEffect(() => {
    if (!selectedChild) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const controller = new AbortController();
    const bimestreQuery = selectedChild.bimestre_actual
      ? `&bimestre_id=${selectedChild.bimestre_actual}`
      : "";
    axios
      .get(
        `/api/calificaciones/padres/alertas?alumno_id=${selectedChild.id_estudiante}${bimestreQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )
      .then((res) => setAlertas(res.data.slice(0, 3))) // mostrar máximo 3 alertas
      .catch((error) => {
        if (!axios.isCancel(error)) setAlertas([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedChild]);

  if (!selectedChild) return null;

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
        return { bg: "bg-success-soft dark:bg-green-900/30", border: "border-success/25", text: "text-success", icon: TrendingUp };
      case "bajada":
        return { bg: "bg-danger-soft dark:bg-red-900/30", border: "border-danger/25", text: "text-danger", icon: TrendingDown };
      case "estable":
        return { bg: "bg-surface-alt dark:bg-gray-800", border: "border-border dark:border-gray-600", text: "text-text-secondary dark:text-gray-400", icon: Minus };
      default:
        return { bg: "bg-surface-alt dark:bg-gray-800", border: "border-border dark:border-gray-600", text: "text-text-muted", icon: MessageSquareText };
    }
  };

  return (
    <div className="space-y-2">
      <p className="portal-section-title">Alertas académicas</p>
      {alertas.map((alerta, idx) => {
        const style = getAlertStyle(alerta.tendencia);
        const Icon = style.icon;
        return (
          <div
            key={idx}
            className={`${style.bg} border ${style.border} rounded-xl p-3 flex items-center gap-3 animate-fade-in`}
          >
            <span className={`portal-icon-box h-9 w-9 ${style.bg} ${style.text}`}><Icon size={18} aria-hidden="true" /></span>
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
