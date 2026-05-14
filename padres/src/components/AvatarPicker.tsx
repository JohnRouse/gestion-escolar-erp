"use client";

import { useState, useMemo } from "react";

const ESTILOS = [
  { id: "avataaars", nombre: "Clásico" },
  { id: "micah", nombre: "Sobrio" },
];

const SEMILLAS_BASE = ["Felix", "Aneka", "Salem", "Mia", "Max", "Sassy", "Tinkerbell", "Bootsy"];

interface AvatarPickerProps {
  valorActual: string;
  onSelect: (url: string) => void;
  genero?: string | null;   // "M" | "F" | null
}

function generarUrl(estilo: string, semilla: string, genero: string) {
  return `https://api.dicebear.com/9.x/${estilo}/svg?seed=${encodeURIComponent(
    semilla
  )}&gender=${genero}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
}

export default function AvatarPicker({ valorActual, onSelect, genero }: AvatarPickerProps) {
  const [estiloSeleccionado, setEstiloSeleccionado] = useState("avataaars");

  // Determinar qué géneros mostrar
  const generosAMostrar = genero === "M" ? ["male"] : genero === "F" ? ["female"] : ["male", "female"];

  const opciones = useMemo(() => {
    const resultado: { url: string; semilla: string }[] = [];
    for (const semilla of SEMILLAS_BASE) {
      for (const gen of generosAMostrar) {
        resultado.push({
          url: generarUrl(estiloSeleccionado, semilla, gen),
          semilla: `${semilla} (${gen === "male" ? "M" : "F"})`,
        });
      }
    }
    return resultado;
  }, [estiloSeleccionado, generosAMostrar]);

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {ESTILOS.map((estilo) => (
          <button
            key={estilo.id}
            onClick={() => setEstiloSeleccionado(estilo.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              estiloSeleccionado === estilo.id
                ? "bg-accent text-white"
                : "bg-surface-alt text-text-muted hover:bg-border"
            }`}
          >
            {estilo.nombre}
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