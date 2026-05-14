"use client";

import { useState } from "react";
import axios from "axios";

interface TabPreferenciasProps {
  temaActual: string;
  notificacionesActual: boolean;
  onTemaChange: (tema: string) => void;
}

export default function TabPreferencias({ temaActual, notificacionesActual, onTemaChange }: TabPreferenciasProps) {
  const [tema, setTema] = useState(temaActual || "claro");
  const [notificaciones, setNotificaciones] = useState(notificacionesActual);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleTemaChange = async (nuevoTema: string) => {
  setTema(nuevoTema);
  localStorage.setItem('tema', nuevoTema);
  if (nuevoTema === 'oscuro') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  onTemaChange(nuevoTema);
  await guardarPreferencias(nuevoTema, notificaciones);
};

  const handleNotificacionesChange = async (valor: boolean) => {
    setNotificaciones(valor);
    await guardarPreferencias(tema, valor);
  };

  const guardarPreferencias = async (nuevoTema: string, nuevasNotif: boolean) => {
    setGuardando(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/apoderados/perfil", {
        tema: nuevoTema,
        notificaciones_activas: nuevasNotif,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setMensaje("Error al guardar preferencias");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle de notificaciones */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-text">Notificaciones</p>
          <p className="text-xs text-text-muted">Recibir notificaciones del colegio</p>
        </div>
        <button
          onClick={() => handleNotificacionesChange(!notificaciones)}
          className={`w-12 h-7 rounded-full transition-colors relative ${
            notificaciones ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              notificaciones ? "right-0.5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Selector de tema */}
      <div>
        <p className="text-sm font-bold text-text mb-2">Tema</p>
        <p className="text-xs text-text-muted mb-3">Elige la apariencia de la aplicación</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleTemaChange("claro")}
            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
              tema === "claro"
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface-alt"
            }`}
          >
            <span className="text-2xl">☀️</span>
            <p className="text-xs font-bold mt-1">Claro</p>
          </button>
          <button
            onClick={() => handleTemaChange("oscuro")}
            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
              tema === "oscuro"
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface-alt"
            }`}
          >
            <span className="text-2xl">🌙</span>
            <p className="text-xs font-bold mt-1">Oscuro</p>
          </button>
        </div>
      </div>

      {mensaje && (
        <p className="text-xs text-danger">{mensaje}</p>
      )}
    </div>
  );
}