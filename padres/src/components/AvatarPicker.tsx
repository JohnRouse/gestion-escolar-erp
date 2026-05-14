"use client";

import { useState, useMemo } from "react";

const GENEROS = ["male", "female"];
const ESTILOS = ["avataaars", "micah"];
const SEMILLAS_BASE = ["Felix", "Aneka", "Salem", "Mia", "Max", "Sassy", "Tinkerbell", "Bootsy"];

interface AvatarPickerProps {
  valorActual: string;
  onSelect: (url: string) => void;
}

function generarUrl(estilo: string, semilla: string) {
  return `https://api.dicebear.com/9.x/${estilo}/svg?seed=${encodeURIComponent(
    semilla
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
}

export default function AvatarPicker({ valorActual, onSelect }: AvatarPickerProps) {
  const [estiloSeleccionado, setEstiloSeleccionado] = useState("avataaars");

  // Generar lista de avatares combinando géneros y semillas base
  const opciones = useMemo(() => {
    const resultado: { url: string; semilla: string }[] = [];
    for (const estilo of [estiloSeleccionado]) {
      for (const semilla of SEMILLAS_BASE) {
        resultado.push({
          url: generarUrl(estilo, `${semilla}-${GENEROS[0]}`),
          semilla: `${semilla} (M)`,
        });
        resultado.push({
          url: generarUrl(estilo, `${semilla}-${GENEROS[1]}`),
          semilla: `${semilla} (F)`,
        });
      }
    }
    return resultado;
  }, [estiloSeleccionado]);

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {ESTILOS.map((estilo) => (
          <button
            key={estilo}
            onClick={() => setEstiloSeleccionado(estilo)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              estiloSeleccionado === estilo
                ? "bg-accent text-white"
                : "bg-surface-alt text-text-muted hover:bg-border"
            }`}
          >
            {estilo === "avataaars" ? "Clásico" : "Sobrio"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
        {opciones.map((op, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(op.url)}
            className={`p-1 rounded-xl border-2 transition-all ${
              valorActual === op.url
                ? "border-accent bg-accent-soft"
                : "border-transparent hover:border-border"
            }`}
            title={op.semilla}
          >
            <img
              src={op.url}
              alt={op.semilla}
              className="w-full h-auto rounded-lg"
            />
          </button>
        ))}
      </div>
    </div>
  );
}