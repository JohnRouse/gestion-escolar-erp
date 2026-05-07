"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface AsistenciaItem { fecha: string; estado: string; }

export default function AsistenciaPage() {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedChild } = useSelectedChild();
  const alumnoId = selectedChild?.id_estudiante ?? 2;
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchAsistencia(token, alumnoId);
  }, [router, alumnoId]);

  const fetchAsistencia = async (token: string, id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/padres/asistencia?alumno_id=${id}&desde=2025-01-01&hasta=2025-12-31`, { headers: { Authorization: `Bearer ${token}` } });
      setAsistencias(res.data);
    } catch { setAsistencias([]); } finally { setLoading(false); }
  };

  const total = asistencias.length;
  const presentes = asistencias.filter(a => a.estado === "Presente").length;
  const ausentes = asistencias.filter(a => a.estado === "Ausente").length;
  const tardanzas = asistencias.filter(a => a.estado === "Tardanza").length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const asistenciaAlta = porcentaje >= 80;

  const filtros = ["Todos", "Presente", "Ausente", "Tardanza", "Justificado"];
  const listaFiltrada = filtro === "Todos" ? asistencias : asistencias.filter(a => a.estado === filtro);

  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case "Presente": return "bg-green-100 text-green-700";
      case "Ausente": return "bg-red-100 text-red-700";
      case "Tardanza": return "bg-amber-100 text-amber-700";
      case "Justificado": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getDotColor = (estado: string) => {
    switch (estado) {
      case "Presente": return "bg-green-500";
      case "Ausente": return "bg-red-500";
      case "Tardanza": return "bg-amber-500";
      case "Justificado": return "bg-blue-500";
      default: return "bg-gray-300";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-5 py-5">
        <h1 className="text-lg font-bold text-gray-900 mb-4">Asistencia</h1>
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={asistenciaAlta ? "#10B981" : "#EF4444"} strokeWidth="4"
                strokeDasharray={`${porcentaje} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">{porcentaje}%</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">{presentes} de {total} días presente</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-red-500 font-medium">Aus: {ausentes}</span>
              <span className="text-xs text-amber-500 font-medium">Tar: {tardanzas}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filtro === f ? "bg-red-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-14 mb-2 animate-pulse" />)
        ) : listaFiltrada.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Sin registros</p>
        ) : (
          <div className="flex flex-col gap-2">
            {listaFiltrada.map((item, idx) => {
              const fecha = new Date(item.fecha + "T00:00:00");
              return (
                <div key={idx} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${getDotColor(item.estado)}`} />
                    <span className="text-sm text-gray-700">
                      {fecha.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getBadgeStyle(item.estado)}`}>
                    {item.estado}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}