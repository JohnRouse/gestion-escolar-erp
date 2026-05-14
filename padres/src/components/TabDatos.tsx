"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import AvatarPicker from "./AvatarPicker";

interface Perfil {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  telefono: string;
  ocupacion: string;
  avatar_url: string;
}

interface TabDatosProps {
  onSave?: () => void;
  onAvatarChange?: (url: string) => void;
}

export default function TabDatos({ onSave, onAvatarChange }: TabDatosProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/apoderados/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPerfil(res.data);
      setCorreo(res.data.correo || "");
      setTelefono(res.data.telefono || "");
      setOcupacion(res.data.ocupacion || "");
      setAvatar(res.data.avatar_url || "");
    } catch {
      setMensaje("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/apoderados/perfil", {
        correo,
        telefono,
        ocupacion,
        avatar_url: avatar,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensaje("✅ Datos actualizados correctamente");
      localStorage.setItem('avatar_url', avatar);
      onSave?.();
      onAvatarChange?.(avatar);
    } catch {
      setMensaje("❌ Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skel h-24 w-24 rounded-full mx-auto" />
        <div className="skel h-4 w-48 mx-auto" />
        <div className="skel h-10 w-full" />
        <div className="skel h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AvatarPicker valorActual={avatar} onSelect={setAvatar} />

      <div>
        <p className="text-sm font-bold text-text">{perfil?.nombres} {perfil?.apellido_paterno} {perfil?.apellido_materno}</p>
        <p className="text-xs text-text-muted">Apoderado</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">Correo electrónico</label>
        <input
          type="email"
          className="input"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">Teléfono</label>
        <input
          type="text"
          className="input"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="999 888 777"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted mb-1">Ocupación</label>
        <input
          type="text"
          className="input"
          value={ocupacion}
          onChange={(e) => setOcupacion(e.target.value)}
          placeholder="Ej. Ingeniero"
        />
      </div>

      {mensaje && (
        <p className={`text-xs ${mensaje.startsWith("✅") ? "text-success" : "text-danger"}`}>
          {mensaje}
        </p>
      )}

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="btn btn-primary w-full"
      >
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}