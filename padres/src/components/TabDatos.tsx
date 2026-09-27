"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import AvatarCropDialog from "./AvatarCropDialog";
import PortalAvatar from "./PortalAvatar";

interface Perfil {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  genero: string;
  correo: string;
  telefono: string;
  ocupacion: string;
  avatar_url: string | null;
}

interface TabDatosProps {
  onAvatarChange?: (url: string | null) => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function apiMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

export default function TabDatos({ onAvatarChange }: TabDatosProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cropDraft, setCropDraft] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/auth/portal/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPerfil(res.data);
        setCorreo(res.data.correo || "");
        setTelefono(res.data.telefono || "");
        setOcupacion(res.data.ocupacion || "");
        setAvatar(res.data.avatar_url || "");
        localStorage.setItem("avatar_url", res.data.avatar_url || "");
        onAvatarChange?.(res.data.avatar_url || null);
      } catch {
        setMessageTone("error");
        setMensaje("Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    });
  }, [onAvatarChange]);

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      await axios.put("/api/auth/portal/perfil", {
        correo,
        telefono,
        ocupacion,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessageTone("success");
      setMensaje("Datos actualizados correctamente");
    } catch {
      setMessageTone("error");
      setMensaje("No se pudieron guardar los cambios");
    } finally {
      setGuardando(false);
    }
  };

  const prepareAvatar = (file?: File) => {
    if (!file) return;
    setMensaje("");
    if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
      setMessageTone("error");
      setMensaje("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMessageTone("error");
      setMensaje("La imagen no debe superar los 5 MB.");
      return;
    }
    setCropDraft(file);
  };

  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await axios.post<Perfil>("/api/auth/portal/perfil/avatar", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextAvatar = response.data.avatar_url || "";
      setPerfil(response.data);
      setAvatar(nextAvatar);
      localStorage.setItem("avatar_url", nextAvatar);
      onAvatarChange?.(nextAvatar || null);
      setCropDraft(null);
      setMessageTone("success");
      setMensaje("Foto de perfil actualizada correctamente.");
    } catch (error) {
      const message = apiMessage(error, "No se pudo actualizar la foto de perfil.");
      setMessageTone("error");
      setMensaje(message);
      throw new Error(message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setMensaje("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete<Perfil>("/api/auth/portal/perfil/avatar", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPerfil(response.data);
      setAvatar("");
      localStorage.setItem("avatar_url", "");
      onAvatarChange?.(null);
      setMessageTone("success");
      setMensaje("La foto de perfil se quitó correctamente.");
    } catch (error) {
      setMessageTone("error");
      setMensaje(apiMessage(error, "No se pudo quitar la foto de perfil."));
    } finally {
      setAvatarBusy(false);
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

  const nombreAvatar = perfil?.nombres?.trim().split(/\s+/)[0] || "Apoderado";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt p-3">
        <PortalAvatar
          name={nombreAvatar}
          src={avatar}
          className="h-16 w-16 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text">Imagen de perfil</p>
          <p className="text-xs text-text-muted">Se usa la imagen registrada; si no existe, mostramos tus iniciales.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => document.getElementById("guardian-avatar-picker")?.click()}
              className="portal-button portal-button-secondary min-h-11"
            >
              {avatarBusy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
              {avatar ? "Cambiar foto" : "Agregar foto"}
            </button>
            <input
              id="guardian-avatar-picker"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              disabled={avatarBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                prepareAvatar(file);
              }}
            />
            {avatar ? (
              <button type="button" onClick={() => void removeAvatar()} disabled={avatarBusy} className="portal-button min-h-11 border border-danger/30 bg-white text-danger hover:bg-danger-soft">
                <Trash2 size={16} aria-hidden="true" />
                Quitar foto
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-text dark:text-gray-100">
          {perfil?.nombres} {perfil?.apellido_paterno} {perfil?.apellido_materno}
        </p>
        <p className="text-xs text-text-muted">Apoderado</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">Correo electrónico</label>
        <input
          type="email"
          className="input-underline"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">Teléfono</label>
        <input
          type="text"
          className="input-underline"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="999 888 777"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">Ocupación</label>
        <input
          type="text"
          className="input-underline"
          value={ocupacion}
          onChange={(e) => setOcupacion(e.target.value)}
          placeholder="Ej. Ingeniero"
        />
      </div>

      {mensaje && (
        <p role="status" className={`rounded-lg p-3 text-sm ${messageTone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {mensaje}
        </p>
      )}

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="btn-contained"
      >
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>

      {cropDraft ? (
        <AvatarCropDialog
          file={cropDraft}
          busy={avatarBusy}
          onCancel={() => setCropDraft(null)}
          onConfirm={uploadAvatar}
        />
      ) : null}
    </div>
  );
}
