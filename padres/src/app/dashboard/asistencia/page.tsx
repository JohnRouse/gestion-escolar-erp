"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { LogOut } from "lucide-react";

interface AsistenciaItem {
  fecha: string;
  estado: string;
}

export default function AsistenciaPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumnoId] = useState(2);
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchAsistencia(token, alumnoId, bimestre);
  }, [router, alumnoId, bimestre]);

  const fetchAsistencia = async (token: string, alumnoId: number, bimestreId: number) => {
    setLoading(true);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const total = asistencias.length;
  const presentes = asistencias.filter((a) => a.estado === "Presente").length;
  const ausentes = asistencias.filter((a) => a.estado === "Ausente").length;
  const tardanzas = asistencias.filter((a) => a.estado === "Tardanza").length;
  const justificados = asistencias.filter((a) => a.estado === "Justificado").length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case "Presente": return "badge-success";
      case "Ausente": return "badge-danger";
      case "Tardanza": return "badge-warning";
      case "Justificado": return "badge-info";
      default: return "";
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user?.nombre?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user?.nombre}</p>
            <p className="text-[10px] text-text-secondary">Asistencia</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-danger transition-colors p-2"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Contenido */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="card h-32 bg-gray-200" />
            <div className="card h-40 bg-gray-200" />
          </div>
        ) : (
          <>
            {/* Gráfico de dona */}
            <div className="card p-5 mb-4">
              <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">
                Resumen — Bimestre I
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="4"
                      strokeDasharray={`${porcentaje} 100`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-text">{porcentaje}%</span>
                    <span className="text-[10px] text-text-muted">Asistencia</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-success"></span>
                    <span className="text-text-secondary">Presente <b className="text-text">{presentes}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-danger"></span>
                    <span className="text-text-secondary">Ausente <b className="text-text">{ausentes}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-warning"></span>
                    <span className="text-text-secondary">Tardanza <b className="text-text">{tardanzas}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="text-text-secondary">Justificado <b className="text-text">{justificados}</b></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial */}
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Historial</h2>
            {asistencias.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-text-secondary">No hay registros de asistencia.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {asistencias.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-3 px-4 bg-white rounded-2xl border border-border/50"
                  >
                    <span className="text-sm text-text">
                      {new Date(item.fecha + "T00:00:00").toLocaleDateString("es-PE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span className={`badge text-xs font-bold ${getBadgeClass(item.estado)}`}>
                      {item.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}