"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Comentario {
  curso: string;
  tipo: string;
  comentario: string;
  valor_nota: number;
  emocion: string;
}

export default function ComentarioDocente() {
  const { selectedChild } = useSelectedChild();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(
        `/api/calificaciones/padres/comentarios?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bimestre}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((res) => setComentarios(res.data))
      .catch(() => setComentarios([]));
  }, [selectedChild, bimestre]);

  if (comentarios.length === 0) return null;

  const getEmocionStyle = (emocion: string) => {
    switch (emocion) {
      case "positiva":
        return { bg: "bg-success-soft", text: "text-success", icon: "😊" };
      case "neutral":
        return { bg: "bg-warning-soft", text: "text-warning", icon: "😐" };
      case "preocupante":
        return { bg: "bg-danger-soft", text: "text-danger", icon: "😟" };
      default:
        return { bg: "bg-surface-alt", text: "text-text-muted", icon: "💬" };
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text">Comentarios del docente</p>
      {comentarios.map((c, idx) => {
        const style = getEmocionStyle(c.emocion);
        return (
          <div key={idx} className={`${style.bg} rounded-xl p-3 text-xs`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold ${style.text}`}>
                {style.icon} {c.curso} · {c.tipo}
              </span>
              <span className={`font-bold ${style.text}`}>{c.valor_nota}</span>
            </div>
            <p className="text-text mt-1 italic">"{c.comentario}"</p>
          </div>
        );
      })}
    </div>
  );
}