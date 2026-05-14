"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import AvatarPicker from "./AvatarPicker";
import { useSelectedChild, type Child } from "@/contexts/SelectedChildContext";

export default function TabHijos() {
  const { selectedChild, setSelectedChild, hijos, setHijos } = useSelectedChild();
  const [hijoSeleccionado, setHijoSeleccionado] = useState<number | null>(null);
  const [avatarTmp, setAvatarTmp] = useState<string>("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (hijos.length > 0 && !hijoSeleccionado) {
      setHijoSeleccionado(hijos[0].id_estudiante);
    }
  }, [hijos]);

  const hijoActual = hijos.find((h) => h.id_estudiante === hijoSeleccionado);

  const handleGuardarAvatarHijo = async () => {
    if (!hijoSeleccionado || !avatarTmp) return;
    setGuardando(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/estudiantes/${hijoSeleccionado}/avatar`, {
        avatar_url: avatarTmp,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Actualizar el hijo en el contexto local
const updatedHijos = hijos.map((h) =>
  h.id_estudiante === hijoSeleccionado ? { ...h, avatar_url: avatarTmp } : h
);
setHijos(updatedHijos);

      // Si el hijo modificado es el que está seleccionado actualmente, actualizar selectedChild
      if (selectedChild?.id_estudiante === hijoSeleccionado) {
        setSelectedChild({
          ...selectedChild,
          avatar_url: avatarTmp,
        });
      }

      setMensaje("✅ Avatar del estudiante actualizado");
    } catch {
      setMensaje("❌ Error al guardar el avatar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {hijos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {hijos.map((h) => (
            <button
              key={h.id_estudiante}
              onClick={() => {
                setHijoSeleccionado(h.id_estudiante);
                setAvatarTmp(h.avatar_url || "");
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                hijoSeleccionado === h.id_estudiante
                  ? "bg-accent text-white"
                  : "bg-surface-alt text-text-muted hover:bg-border"
              }`}
            >
              {h.nombre}
            </button>
          ))}
        </div>
      )}

      {hijoActual && (
        <>
          <div className="flex items-center gap-3">
            <img
              src={
                avatarTmp ||
                hijoActual.avatar_url ||
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
                  hijoActual.nombre
                )}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
              }
              alt={hijoActual.nombre}
              className="w-16 h-16 rounded-full border-2 border-accent"
            />
            <div>
              <p className="font-extrabold text-text">{hijoActual.nombre}</p>
              <p className="text-xs text-text-muted">{hijoActual.grado}</p>
            </div>
          </div>

          <AvatarPicker
            valorActual={avatarTmp || hijoActual.avatar_url || ""}
            onSelect={setAvatarTmp}
            genero={hijoActual.nombre?.endsWith("a") ? "F" : "M"}
          />

          {mensaje && (
            <p className={`text-xs ${mensaje.startsWith("✅") ? "text-success" : "text-danger"}`}>
              {mensaje}
            </p>
          )}

          <button
            onClick={handleGuardarAvatarHijo}
            disabled={guardando}
            className="btn btn-primary w-full"
          >
            {guardando ? "Guardando..." : "Guardar avatar del estudiante"}
          </button>
        </>
      )}
    </div>
  );
}