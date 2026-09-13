"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import axios from "axios";

export interface CitaRecipient {
  key: string;
  tipo: "staff" | "docente";
  id_destinatario: number;
  id_persona: number;
  nombre: string;
  contexto: "staff" | "docente" | "tutor";
  funcion: string;
  detalle: string;
}

interface SolicitarCitaModalProps {
  idMatricula: number;
  destinatario: CitaRecipient;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join(" · ") : message;
  }
  return "No se pudo solicitar la cita.";
}

export default function SolicitarCitaModal({
  idMatricula,
  destinatario,
  isOpen,
  onClose,
  onCreated,
}: SolicitarCitaModalProps) {
  const dateRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const closeFromKeyboard = useEffectEvent(() => {
    if (!enviando) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => dateRef.current?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFromKeyboard();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnviar = async () => {
    setMensaje("");
    if (!fecha || !horaInicio || !horaFin || horaInicio >= horaFin || motivo.trim().length < 3) {
      setMensaje("Completa una fecha, un rango horario válido y el motivo.");
      return;
    }
    setEnviando(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/citas/apoderado",
        {
          id_matricula: idMatricula,
          tipo_destinatario: destinatario.tipo,
          id_destinatario: destinatario.id_destinatario,
          contexto_destinatario: destinatario.contexto,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo: motivo.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onCreated?.();
      onClose();
    } catch (error) {
      setMensaje(errorMessage(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Cerrar solicitud de cita"
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={() => !enviando && onClose()}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="solicitar-cita-title"
        aria-describedby="solicitar-cita-help"
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
      >
        <header className="border-b border-border px-6 py-5">
          <p className="text-sm font-semibold text-accent">Solicitud de cita</p>
          <h3 id="solicitar-cita-title" className="mt-1 text-xl font-extrabold text-text">
            {destinatario.nombre}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{destinatario.funcion}</p>
        </header>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <p id="solicitar-cita-help" className="rounded-xl bg-accent-soft p-3 text-sm leading-6 text-text-secondary">
            Propón un horario. El colegio o la persona destinataria deberá confirmarlo; el horario de clases no se muestra como disponibilidad.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-secondary">Fecha</span>
            <input
              ref={dateRef}
              type="date"
              className="input-underline min-h-11"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-sm font-semibold text-text-secondary">Hora inicial</span>
              <input type="time" className="input-underline min-h-11" value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-text-secondary">Hora final</span>
              <input type="time" className="input-underline min-h-11" value={horaFin} onChange={(event) => setHoraFin(event.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text-secondary">Motivo</span>
            <textarea
              className="input-underline min-h-24 resize-y"
              value={motivo}
              maxLength={2000}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describe brevemente el motivo"
            />
          </label>
          {mensaje ? <p className="text-sm font-semibold text-danger" role="alert">{mensaje}</p> : null}
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-border bg-white px-6 py-4">
          <button type="button" onClick={onClose} disabled={enviando} className="min-h-11 rounded-xl text-sm font-bold text-text-secondary focus-visible:outline-2 focus-visible:outline-accent">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleEnviar()} disabled={enviando} className="btn-contained min-h-11 disabled:opacity-60">
            {enviando ? "Enviando…" : "Solicitar cita"}
          </button>
        </footer>
      </section>
    </div>
  );
}
