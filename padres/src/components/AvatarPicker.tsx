"use client";

import { useState, useMemo, useCallback } from "react";

const ESTILOS = [
  { id: "avataaars", nombre: "Clásico" },
  { id: "micah", nombre: "Sobrio" },
];

const SEMILLAS_BASE = [
  "Felix", "Aneka", "Salem", "Mia", "Max", "Sassy", "Tinkerbell", "Bootsy",
  "Milo", "Cleo", "Bandit", "Luna", "Oliver", "Daisy", "Rocky", "Coco",
  "Leo", "Ginger", "Zoe", "Oscar", "Lily", "Bella", "Charlie", "Lucy",
];

interface AvatarPickerProps {
  valorActual: string;
  onSelect: (url: string) => void;
  genero?: string | null;
}

function generarUrl(estilo: string, semilla: string, genero: string) {
  return `https://api.dicebear.com/9.x/${estilo}/svg?seed=${encodeURIComponent(
    semilla
  )}&gender=${genero}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
}

function barajarSemillas(): string[] {
  const copia = [...SEMILLAS_BASE];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, 4);
}

export default function AvatarPicker({ valorActual, onSelect, genero }: AvatarPickerProps) {
  const [estiloSeleccionado, setEstiloSeleccionado] = useState("avataaars");
  const [semillasMostradas, setSemillasMostradas] = useState<string[]>(() => barajarSemillas());
  const [claveRegeneracion, setClaveRegeneracion] = useState(0);

  const generosAMostrar = genero === "M" ? ["male"] : genero === "F" ? ["female"] : ["male", "female"];

  const opciones = useMemo(() => {
    const resultado: { url: string; semilla: string }[] = [];
    for (const semilla of semillasMostradas) {
      for (const gen of generosAMostrar) {
        resultado.push({
          url: generarUrl(estiloSeleccionado, semilla, gen),
          semilla: `${semilla} (${gen === "male" ? "M" : "F"})`,
        });
      }
    }
    return resultado;
  }, [estiloSeleccionado, semillasMostradas, generosAMostrar, claveRegeneracion]);

  const regenerarAvatares = useCallback(() => {
    setSemillasMostradas(barajarSemillas());
    setClaveRegeneracion((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-3">
      {/* Selector de estilo */}
      <div className="flex justify-center gap-2">
        {ESTILOS.map((estilo) => (
          <button
            key={estilo.id}
            onClick={() => setEstiloSeleccionado(estilo.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              estiloSeleccionado === estilo.id
                ? "bg-accent text-white"
                : "bg-surface-alt text-text-muted hover:bg-border dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {estilo.nombre}
          </button>
        ))}
      </div>

      {/* Grid de avatares */}
      <div className="avatar-grid custom-scrollbar">
        {opciones.map((op, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(op.url)}
            className={`p-1 rounded-xl border-2 transition-all ${
              valorActual === op.url
                ? "border-accent bg-accent-soft dark:bg-accent/20"
                : "border-transparent hover:border-border dark:hover:border-gray-600"
            }`}
            title={op.semilla}
          >
            <img src={op.url} alt={op.semilla} className="w-full h-auto rounded-lg" />
          </button>
        ))}
      </div>

      {/* Botón para regenerar */}
      <button
        onClick={regenerarAvatares}
        className="w-full py-2 rounded-xl bg-surface-alt dark:bg-gray-700 text-text-secondary dark:text-gray-300 font-bold text-xs hover:bg-border dark:hover:bg-gray-600 transition-colors"
      >
        🔄 Más opciones
      </button>
    </div>
  );
}