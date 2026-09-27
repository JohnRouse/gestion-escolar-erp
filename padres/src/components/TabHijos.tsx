"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Camera, Check, LoaderCircle, Trash2 } from "lucide-react";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import { isRealStudentPhoto } from "@/lib/portalAvatar";
import AvatarCropDialog from "./AvatarCropDialog";
import PortalAvatar from "./PortalAvatar";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Feedback = {
  studentId: number;
  tone: "success" | "error";
  text: string;
} | null;

function apiMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

export default function TabHijos() {
  const { selectedChild, setSelectedChild, hijos, updateChildAvatar } = useSelectedChild();
  const [busyStudentId, setBusyStudentId] = useState<number | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [cropDraft, setCropDraft] = useState<{ studentId: number; file: File } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmRemoveId !== null) confirmButtonRef.current?.focus();
  }, [confirmRemoveId]);

  async function uploadPhoto(studentId: number, file?: File) {
    if (!file) return;
    setFeedback(null);

    if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
      setFeedback({ studentId, tone: "error", text: "Selecciona una imagen JPG, PNG o WEBP." });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFeedback({ studentId, tone: "error", text: "La imagen no debe superar los 5 MB." });
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("foto", file);
    setBusyStudentId(studentId);

    try {
      const response = await axios.post<{ avatar_url: string | null }>(
        `/api/academicos/padres/hijos/${studentId}/avatar`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      updateChildAvatar(studentId, response.data.avatar_url);
      setFeedback({ studentId, tone: "success", text: "Foto actualizada correctamente." });
    } catch (error) {
      const message = apiMessage(error, "No se pudo actualizar la foto.");
      setFeedback({
        studentId,
        tone: "error",
        text: message,
      });
      throw new Error(message);
    } finally {
      setBusyStudentId(null);
    }
  }

  async function removePhoto(studentId: number) {
    const token = localStorage.getItem("token");
    setBusyStudentId(studentId);
    setFeedback(null);

    try {
      const response = await axios.delete<{ avatar_url: null }>(
        `/api/academicos/padres/hijos/${studentId}/avatar`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      updateChildAvatar(studentId, response.data.avatar_url);
      setConfirmRemoveId(null);
      setFeedback({ studentId, tone: "success", text: "La foto se quitó correctamente." });
      window.requestAnimationFrame(() => {
        document.getElementById(`photo-picker-trigger-${studentId}`)?.focus();
      });
    } catch (error) {
      setFeedback({
        studentId,
        tone: "error",
        text: apiMessage(error, "No se pudo quitar la foto."),
      });
    } finally {
      setBusyStudentId(null);
    }
  }

  return (
    <div className="space-y-4">
      {hijos.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">No hay estudiantes vinculados.</p>
      ) : hijos.map((child) => {
        const active = child.id_estudiante === selectedChild?.id_estudiante;
        const busy = busyStudentId === child.id_estudiante;
        const hasPhoto = isRealStudentPhoto(child.avatar_url);
        return (
          <article
            key={child.id_estudiante}
            className={`rounded-xl border p-3 ${active ? "border-accent bg-accent-soft" : "border-border bg-white"}`}
          >
            <button
              type="button"
              onClick={() => setSelectedChild(child)}
              className="flex min-h-14 w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/40"
              aria-pressed={active}
            >
              <PortalAvatar name={child.nombre} src={child.avatar_url} className="h-14 w-14 rounded-full border border-border" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-text">{child.nombre}</span>
                <span className="block text-xs text-text-muted">{child.grado}{child.anio ? ` · ${child.anio}` : ""}</span>
              </span>
              {active ? <span className="portal-icon-box h-8 w-8"><Check size={17} aria-hidden="true" /></span> : null}
            </button>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              <button
                id={`photo-picker-trigger-${child.id_estudiante}`}
                type="button"
                disabled={busy}
                className="portal-button portal-button-secondary min-h-11"
                onClick={() => document.getElementById(`photo-picker-${child.id_estudiante}`)?.click()}
              >
                {busy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
                {hasPhoto ? "Cambiar foto" : "Agregar foto"}
              </button>
              <input
                id={`photo-picker-${child.id_estudiante}`}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setFeedback(null);
                  if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
                    setFeedback({ studentId: child.id_estudiante, tone: "error", text: "Selecciona una imagen JPG, PNG o WEBP." });
                    return;
                  }
                  if (file.size > MAX_PHOTO_BYTES) {
                    setFeedback({ studentId: child.id_estudiante, tone: "error", text: "La imagen no debe superar los 5 MB." });
                    return;
                  }
                  setCropDraft({ studentId: child.id_estudiante, file });
                }}
              />
              {hasPhoto ? (
                <button
                  id={`remove-photo-trigger-${child.id_estudiante}`}
                  type="button"
                  onClick={() => setConfirmRemoveId(child.id_estudiante)}
                  disabled={busy}
                  className="portal-button min-h-11 border border-danger/30 bg-white text-danger hover:bg-danger-soft"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Quitar foto
                </button>
              ) : null}
            </div>

            {confirmRemoveId === child.id_estudiante ? (
              <div
                role="alertdialog"
                aria-labelledby={`remove-photo-title-${child.id_estudiante}`}
                aria-describedby={`remove-photo-description-${child.id_estudiante}`}
                className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !busy) {
                    event.preventDefault();
                    event.stopPropagation();
                    setConfirmRemoveId(null);
                    window.requestAnimationFrame(() => {
                      document.getElementById(`remove-photo-trigger-${child.id_estudiante}`)?.focus();
                    });
                  } else if (event.key === "Tab") {
                    if (event.shiftKey && document.activeElement === confirmButtonRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelButtonRef.current?.focus();
                    } else if (!event.shiftKey && document.activeElement === cancelButtonRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      confirmButtonRef.current?.focus();
                    }
                  }
                }}
              >
                <p id={`remove-photo-title-${child.id_estudiante}`} className="text-sm font-bold text-text">¿Quitar la foto?</p>
                <p id={`remove-photo-description-${child.id_estudiante}`} className="mt-1 text-xs text-text-secondary">Se mostrarán las iniciales del estudiante en todo el portal.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button ref={confirmButtonRef} type="button" onClick={() => void removePhoto(child.id_estudiante)} disabled={busy} className="portal-button min-h-11 bg-danger text-white">
                    {busy ? "Quitando…" : "Sí, quitar foto"}
                  </button>
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    onClick={() => {
                      setConfirmRemoveId(null);
                      window.requestAnimationFrame(() => {
                        document.getElementById(`remove-photo-trigger-${child.id_estudiante}`)?.focus();
                      });
                    }}
                    disabled={busy}
                    className="portal-button portal-button-secondary min-h-11"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {feedback?.studentId === child.id_estudiante ? (
              <p className={`mt-3 text-sm ${feedback.tone === "error" ? "text-danger" : "text-success"}`} role={feedback.tone === "error" ? "alert" : "status"}>
                {feedback.text}
              </p>
            ) : null}
          </article>
        );
      })}
      {cropDraft ? (
        <AvatarCropDialog
          file={cropDraft.file}
          busy={busyStudentId === cropDraft.studentId}
          onCancel={() => setCropDraft(null)}
          onConfirm={async (file) => {
            await uploadPhoto(cropDraft.studentId, file);
            setCropDraft(null);
          }}
        />
      ) : null}
    </div>
  );
}
