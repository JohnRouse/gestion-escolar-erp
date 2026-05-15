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
    localStorage.setItem("tema", nuevoTema);
    if (nuevoTema === "oscuro") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
          <p className="text-sm font-bold text-text dark:text-gray-100">Notificaciones</p>
          <p className="text-xs text-text-muted">Recibir notificaciones del colegio</p>
        </div>
        <button
          onClick={() => handleNotificacionesChange(!notificaciones)}
          className={`w-12 h-7 rounded-full transition-colors relative ${
            notificaciones ? "bg-accent" : "bg-border dark:bg-gray-600"
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
        <p className="text-sm font-bold text-text dark:text-gray-100 mb-2">Tema</p>
        <p className="text-xs text-text-muted mb-3">Elige la apariencia de la aplicación</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleTemaChange("claro")}
            className={`theme-card ${tema === "claro" ? "theme-card-selected" : "theme-card-unselected"}`}
          >
            <span className="text-2xl">☀️</span>
            <span className={`text-xs font-bold ${tema === "claro" ? "text-text dark:text-gray-900" : "text-text-muted"}`}>
              Claro
            </span>
          </button>
          <button
            onClick={() => handleTemaChange("oscuro")}
            className={`theme-card ${tema === "oscuro" ? "theme-card-selected" : "theme-card-unselected"}`}
          >
            <span className="text-2xl">🌙</span>
            <span className={`text-xs font-bold ${tema === "oscuro" ? "text-gray-900" : "text-text-muted"}`}>
              Oscuro
            </span>
          </button>
        </div>
      </div>

      {mensaje && (
        <p className="text-xs text-danger">{mensaje}</p>
      )}
    </div>
  );
}