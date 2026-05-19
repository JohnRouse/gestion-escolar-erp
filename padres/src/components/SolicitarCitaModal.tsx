"use client";

import { useState, useMemo } from "react";
import axios from "axios";

interface HorarioDia {
  hora_inicio: string;
  hora_fin: string;
  curso: string;
}

interface SolicitarCitaModalProps {
  idStaff: number;
  nombreStaff: string;
  horario?: Record<string, HorarioDia[]>; // horario del staff por día
  isOpen: boolean;
  onClose: () => void;
}

// Genera opciones cada 30 minutos entre dos horas
function generarOpcionesHorarias(inicio: string, fin: string): string[] {
  const opciones: string[] = [];
  const [hIni, mIni] = inicio.split(":").map(Number);
  const [hFin, mFin] = fin.split(":").map(Number);
  let actual = hIni * 60 + mIni;
  const finMinutos = hFin * 60 + mFin;

  while (actual < finMinutos) {
    const h = Math.floor(actual / 60);
    const m = actual % 60;
    opciones.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    actual += 30;
  }
  return opciones;
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function SolicitarCitaModal({
  idStaff,
  nombreStaff,
  horario,
  isOpen,
  onClose,
}: SolicitarCitaModalProps) {
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Determinar el día de la semana de la fecha seleccionada
  const diaSemana = useMemo(() => {
    if (!fecha) return null;
    const date = new Date(fecha + "T00:00:00");
    return DIAS_SEMANA[date.getDay() - 1] || null; // getDay: 0=Dom, 1=Lun...
  }, [fecha]);

  // Obtener bloques del horario del staff para ese día
  const bloquesDisponibles = useMemo(() => {
    if (!horario || !diaSemana) return [];
    return horario[diaSemana] || [];
  }, [horario, diaSemana]);

  // Generar opciones de hora según bloques o rango por defecto (07:00-19:00)
  const opcionesHorarias = useMemo(() => {
    if (bloquesDisponibles.length > 0) {
      // Unir todos los intervalos de los bloques para crear opciones cada 30 min
      const horas: string[] = [];
      for (const bloque of bloquesDisponibles) {
        horas.push(...generarOpcionesHorarias(bloque.hora_inicio, bloque.hora_fin));
      }
      return [...new Set(horas)].sort();
    }
    // Rango por defecto
    return generarOpcionesHorarias("07:00", "19:00");
  }, [bloquesDisponibles]);

  // Filtrar horas de fin: solo las posteriores a la hora de inicio seleccionada
  const opcionesHoraFin = useMemo(() => {
    if (!horaInicio) return opcionesHorarias;
    return opcionesHorarias.filter((h) => h > horaInicio);
  }, [horaInicio, opcionesHorarias]);

  // Resetear horas al cambiar fecha
  const handleFechaChange = (nuevaFecha: string) => {
    setFecha(nuevaFecha);
    setHoraInicio("");
    setHoraFin("");
  };

  if (!isOpen) return null;

  const handleEnviar = async () => {
    setMensaje("");
    if (!fecha || !horaInicio || !horaFin) {
      setMensaje("Completa todos los campos");
      return;
    }

    setEnviando(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/citas",
        {
          id_staff: idStaff,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensaje("✅ Cita solicitada correctamente");
      setTimeout(() => {
        onClose();
        setFecha("");
        setHoraInicio("");
        setHoraFin("");
        setMotivo("");
        setMensaje("");
      }, 1500);
    } catch (err: any) {
      setMensaje(
        "❌ " + (err.response?.data?.message || "Error al solicitar cita")
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[28px] p-6 animate-slide-up max-w-[420px] mx-auto overflow-y-auto max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-4" />
        <h3 className="text-xl font-extrabold text-text">
          Solicitar cita con {nombreStaff}
        </h3>

        <div className="space-y-3 mt-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Fecha
            </label>
            <input
              type="date"
              className="input-underline"
              value={fecha}
              onChange={(e) => handleFechaChange(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Horas */}
          {fecha && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Hora inicio
                  </label>
                  <select
                    className="input-underline"
                    value={horaInicio}
                    onChange={(e) => {
                      setHoraInicio(e.target.value);
                      setHoraFin(""); // reset fin al cambiar inicio
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {opcionesHorarias.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Hora fin
                  </label>
                  <select
                    className="input-underline"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    disabled={!horaInicio}
                  >
                    <option value="">Seleccionar</option>
                    {opcionesHoraFin.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {bloquesDisponibles.length > 0 && (
                <p className="text-[10px] text-text-muted">
                  Horario de {nombreStaff} el {diaSemana}:{" "}
                  {bloquesDisponibles
                    .map((b) => `${b.hora_inicio}–${b.hora_fin}`)
                    .join(", ")}
                </p>
              )}
            </>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Motivo (opcional)
            </label>
            <textarea
              className="input-underline min-h-[60px]"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Hablar sobre rendimiento académico"
            />
          </div>

          {mensaje && (
            <p
              className={`text-xs ${
                mensaje.startsWith("✅") ? "text-success" : "text-danger"
              }`}
            >
              {mensaje}
            </p>
          )}

          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="btn-contained"
          >
            {enviando ? "Enviando..." : "Solicitar cita"}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-text-secondary font-bold text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}