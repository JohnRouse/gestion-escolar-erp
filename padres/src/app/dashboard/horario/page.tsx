"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Clase {
  hora_inicio: string;
  hora_fin: string;
  curso: string;
  docente: string;
}

export default function HorarioPage() {
  const router = useRouter();
  const [alumnoId] = useState(2); // Se actualizará con el selector dinámico
  const [horario, setHorario] = useState<Record<string, Clase[]>>({});
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchHorario(token, alumnoId);
  }, [router, alumnoId]);

  const fetchHorario = async (token: string, alumnoId: number) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/academicos/padres/horario?alumno_id=${alumnoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHorario(response.data);
      // Seleccionar el día de hoy si hay horario, si no Lunes
      const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
      const hoy = new Date().getDay(); // 0=Domingo
      const diaHoy = dias[hoy - 1] || "Lunes";
      setDiaActivo(response.data[diaHoy] ? diaHoy : "Lunes");
    } catch (err) {
      console.error("Error al cargar horario:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <h1 className="text-sm font-semibold text-navy">Horario Semanal</h1>
      </div>

      {/* Selector de día */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((dia) => (
          <button
            key={dia}
            onClick={() => setDiaActivo(dia)}
            className={`px-4 py-2 text-xs rounded-full whitespace-nowrap ${
              diaActivo === dia
                ? "bg-navy text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {dia.substring(0, 3)}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando horario...</p>
        ) : horario[diaActivo]?.length > 0 ? (
          <div className="flex flex-col gap-3">
            {horario[diaActivo].map((clase, idx) => (
              <div key={idx} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold text-navy">{clase.curso}</p>
                  <span className="text-xs text-gray-400">
                    {clase.hora_inicio} – {clase.hora_fin}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{clase.docente}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            No hay clases el {diaActivo}.
          </p>
        )}
      </div>

      <BottomNav />
    </main>
  );
}