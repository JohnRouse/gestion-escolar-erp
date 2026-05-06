"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface AsistenciaItem {
  fecha: string;
  estado: string;
}

export default function AsistenciaPage() {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumnoId] = useState(2); // Lucas García
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAsistencia(token, alumnoId, bimestre);
  }, [router, alumnoId, bimestre]);

  const fetchAsistencia = async (token: string, alumnoId: number, bimestreId: number) => {
    setLoading(true);
    // Calcular fechas según bimestre (simplificado: tomamos todo el año 2025)
    const desde = "2025-01-01";
    const hasta = "2025-12-31";
    try {
      const response = await axios.get(
        `/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=${desde}&hasta=${hasta}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAsistencias(response.data);
    } catch (err) {
      console.error("Error al cargar asistencia:", err);
      setAsistencias([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular porcentajes
  const total = asistencias.length;
  const presentes = asistencias.filter((a) => a.estado === "Presente").length;
  const ausentes = asistencias.filter((a) => a.estado === "Ausente").length;
  const tardanzas = asistencias.filter((a) => a.estado === "Tardanza").length;
  const justificados = asistencias.filter((a) => a.estado === "Justificado").length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case "Presente": return "badge-green";
      case "Ausente": return "badge-red";
      case "Tardanza": return "badge-amber";
      case "Justificado": return "badge-blue";
      default: return "";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Título */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <h1 className="text-sm font-semibold text-navy">Asistencia</h1>
      </div>

      {/* Resumen donut (versión simplificada con barras) */}
      <div className="px-4 py-4">
        <div className="card p-4 mb-4">
          <h2 className="text-xs font-medium text-gray-500 mb-3">Resumen — Bimestre I</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3"
                  strokeDasharray={`${porcentaje} 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-navy">
                {porcentaje}%
              </span>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green"></span>
                <span className="text-gray-500">Presente <b>{presentes}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red"></span>
                <span className="text-gray-500">Ausente <b>{ausentes}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber"></span>
                <span className="text-gray-500">Tardanza <b>{tardanzas}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue"></span>
                <span className="text-gray-500">Justificado <b>{justificados}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Listado diario */}
        <h2 className="text-xs font-medium text-gray-500 mb-3">Historial</h2>
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        ) : asistencias.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">No hay registros de asistencia.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {asistencias.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 px-3 bg-white rounded-lg border border-gray-100"
              >
                <span className="text-xs text-gray-700">
                  {new Date(item.fecha + 'T00:00:00').toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" })}
                </span>
                <span className={`badge ${getBadgeClass(item.estado)}`}>{item.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}