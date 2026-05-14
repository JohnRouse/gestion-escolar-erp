"use client";

import { useState } from "react";
import axios from "axios";

export default function TabSeguridad() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleCambiar = async () => {
    setMensaje("");

    if (nueva.length < 6) {
      setMensaje("❌ La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (nueva !== confirmar) {
      setMensaje("❌ Las contraseñas no coinciden");
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/auth/cambiar-password", {
        password_actual: actual,
        password_nueva: nueva,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensaje("✅ Contraseña actualizada correctamente");
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Error al cambiar la contraseña";
      setMensaje(`❌ ${msg}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">
          Contraseña actual
        </label>
        <div className="relative">
          <input
            type={mostrarActual ? "text" : "password"}
            className="input pr-10"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setMostrarActual(!mostrarActual)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <span className="material-symbols-rounded text-lg">
              {mostrarActual ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={mostrarNueva ? "text" : "password"}
            className="input pr-10"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setMostrarNueva(!mostrarNueva)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <span className="material-symbols-rounded text-lg">
              {mostrarNueva ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          className="input"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repite la nueva contraseña"
        />
      </div>

      {mensaje && (
        <p className={`text-xs ${mensaje.startsWith("✅") ? "text-success" : "text-danger"}`}>
          {mensaje}
        </p>
      )}

      <button
        onClick={handleCambiar}
        disabled={guardando}
        className="btn btn-primary w-full"
      >
        {guardando ? "Cambiando..." : "Cambiar contraseña"}
      </button>
    </div>
  );
}