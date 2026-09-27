"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";

export default function TabSeguridad() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");

  const handleCambiar = async () => {
    setMensaje("");

    if (nueva.length < 6) {
      setMessageTone("error");
      setMensaje("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (nueva !== confirmar) {
      setMessageTone("error");
      setMensaje("Las contraseñas no coinciden");
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/auth/portal/cambiar-password", {
        password_actual: actual,
        password_nueva: nueva,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessageTone("success");
      setMensaje("Contraseña actualizada correctamente");
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err: unknown) {
      const msg = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || "Error al cambiar la contraseña"
        : "Error al cambiar la contraseña";
      setMessageTone("error");
      setMensaje(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Contraseña actual
        </label>
        <div className="relative">
          <input
            name="current-password"
            autoComplete="current-password"
            type={mostrarActual ? "text" : "password"}
            className="input-underline pr-10"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setMostrarActual(!mostrarActual)}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-text-muted hover:bg-surface-alt"
            aria-label={mostrarActual ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
          >
            {mostrarActual ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            name="new-password"
            autoComplete="new-password"
            type={mostrarNueva ? "text" : "password"}
            className="input-underline pr-10"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setMostrarNueva(!mostrarNueva)}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-text-muted hover:bg-surface-alt"
            aria-label={mostrarNueva ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
          >
            {mostrarNueva ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mínimo 6 caracteres</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Confirmar nueva contraseña
        </label>
        <input
          name="confirm-password"
          autoComplete="new-password"
          type="password"
          className="input-underline"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repite la nueva contraseña"
        />
      </div>

      {mensaje && (
        <p role="status" className={`rounded-lg p-3 text-sm ${messageTone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {mensaje}
        </p>
      )}

      <button
        onClick={handleCambiar}
        disabled={guardando}
        className="btn-contained"
      >
        {guardando ? "Cambiando..." : "Cambiar contraseña"}
      </button>
    </div>
  );
}
