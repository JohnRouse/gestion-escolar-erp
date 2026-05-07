"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Clase { hora_inicio: string; hora_fin: string; curso: string; docente: string; }

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function HorarioPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const alumnoId = selectedChild?.id_estudiante ?? 2;
  const [horario, setHorario] = useState<Record<string, Clase[]>>({});
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchHorario(token, alumnoId);
  }, [router, alumnoId]);

  const fetchHorario = async (token: string, id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/padres/horario?alumno_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setHorario(res.data);
      const hoy = new Date().getDay();
      const diaHoy = DIAS[hoy - 1] || "Lunes";
      setDiaActivo(res.data[diaHoy] ? diaHoy : "Lunes");
    } catch { setHorario({}); } finally { setLoading(false); }
  };

  const clases = horario[diaActivo] ?? [];

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">Horario</h1>
      </header>
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {DIAS.map((dia) => (
          <button key={dia} onClick={() => setDiaActivo(dia)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              diaActivo === dia ? "bg-red-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {dia.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 mb-3 animate-pulse" />)
        ) : clases.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Sin clases el {diaActivo}.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {clases.map((clase, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold text-gray-900">{clase.curso}</span>
                  <span className="text-xs text-gray-500">{clase.hora_inicio} – {clase.hora_fin}</span>
                </div>
                <p className="text-xs text-gray-500">{clase.docente}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}