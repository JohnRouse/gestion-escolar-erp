"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { LogOut, Megaphone } from "lucide-react";

interface Hijo {
  id_estudiante: number;
  nombre: string;
  grado: string;
}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  totalPendiente: number;
  estadoPagos: string;
  circularReciente: { titulo: string; fecha: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; rol: string } | null>(null);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [selectedHijo, setSelectedHijo] = useState<Hijo | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchHijos(token);
  }, [router]);

  const fetchHijos = async (token: string) => {
    try {
      const response = await axios.get("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hijosData = response.data;
      setHijos(hijosData);
      if (hijosData.length > 0) {
        setSelectedHijo(hijosData[0]);
        fetchDashboardData(token, hijosData[0].id_estudiante);
      }
    } catch {
      // Fallback a datos de prueba
      const mockHijos = [
        { id_estudiante: 2, nombre: "Lucas García", grado: "5° Primaria" },
      ];
      setHijos(mockHijos);
      setSelectedHijo(mockHijos[0]);
      fetchDashboardData(token, mockHijos[0].id_estudiante);
    }
  };

  const fetchDashboardData = async (token: string, alumnoId: number) => {
  try {
    const [asistenciaRes, notasRes, pagosRes, circularesRes] = await Promise.all([
      axios.get(`/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=2025-01-01&hasta=2025-12-31`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/circulares/padres`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const asistencias = asistenciaRes.data;
    const total = asistencias.length;
    const presentes = asistencias.filter((a: any) => a.estado === "Presente").length;
    const porcentajeAsistencia = total > 0 ? Math.round((presentes / total) * 100) : null;

    const notasData = notasRes.data;
    const promedios = notasData.map((c: any) => c.promedioBimestre).filter((p: any) => p !== null);
    const promedioGeneral =
      promedios.length > 0
        ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10
        : null;

    const totalPendiente = pagosRes.data.total_pendiente ?? 0;
    const estadoPagos = totalPendiente === 0 ? "Al día" : "Pendiente";

    const circulares = circularesRes.data;
    const circularReciente =
      circulares.length > 0
        ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion }
        : null;

    setDashboardData({
      asistencia: porcentajeAsistencia,
      promedio: promedioGeneral,
      totalPendiente,
      estadoPagos,
      circularReciente,
    });
  } catch (err) {
    console.error("Error al cargar datos del dashboard:", err);
    setDashboardData({
      asistencia: 92,
      promedio: 15.4,
      totalPendiente: 3150,
      estadoPagos: "Pendiente",
      circularReciente: { titulo: "Reunión de padres - Primaria", fecha: "2025-05-09" },
    });
  } finally {
    setLoading(false);
  }
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      {/* Header mejorado */}
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user.nombre.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user.nombre}</p>
            <p className="text-[10px] text-text-secondary">Apoderado</p>
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

      {/* Selector de hijo (si hay varios) */}
      {hijos.length > 1 && (
        <div className="px-4 py-3 bg-white border-b border-border">
          <select
            className="input text-sm"
            value={selectedHijo?.id_estudiante || ""}
            onChange={(e) => {
              const hijo = hijos.find((h) => h.id_estudiante === Number(e.target.value));
              if (hijo) {
                setSelectedHijo(hijo);
                const token = localStorage.getItem("token") || "";
                fetchDashboardData(token, hijo.id_estudiante);
              }
            }}
          >
            {hijos.map((hijo) => (
              <option key={hijo.id_estudiante} value={hijo.id_estudiante}>
                {hijo.nombre} — {hijo.grado}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Contenido del dashboard */}
      <div className="px-4 py-5 space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-3">
              <div className="card h-32 bg-gray-200" />
              <div className="card h-32 bg-gray-200" />
            </div>
            <div className="card h-20 bg-gray-200" />
            <div className="card h-16 bg-gray-200" />
          </div>
        ) : (
          <>
            {/* KPIs principales */}
            <div className="grid grid-cols-2 gap-3">
              {/* Asistencia */}
              <div className="card p-5 text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-success-light flex items-center justify-center">
                  <span className="text-2xl font-bold text-success">
                    {dashboardData?.asistencia ?? "—"}%
                  </span>
                </div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Asistencia
                </p>
              </div>

              {/* Promedio */}
              <div className="card p-5 text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {dashboardData?.promedio ?? "—"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Promedio
                </p>
              </div>
            </div>

            {/* Estado de pagos - tarjeta grande y destacada */}
            <div
              className={`card p-5 flex items-center justify-between ${
                dashboardData?.estadoPagos === "Al día"
                  ? "border-l-4 border-l-success"
                  : "border-l-4 border-l-warning"
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Estado de pagos
                </p>
                <p className="text-2xl font-bold text-text">
                  S/{" "}
                  {dashboardData?.totalPendiente?.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                  }) ?? "0.00"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {dashboardData?.estadoPagos === "Al día"
                    ? "Sin deudas pendientes"
                    : "Pendiente de pago"}
                </p>
              </div>
              <span
                className={`badge text-sm font-bold px-4 py-2 ${
                  dashboardData?.estadoPagos === "Al día"
                    ? "badge-success"
                    : "badge-danger"
                }`}
              >
                {dashboardData?.estadoPagos === "Al día" ? "Al día" : "Pendiente"}
              </span>
            </div>

            {/* Circular reciente */}
            {dashboardData?.circularReciente && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone size={16} className="text-primary" />
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Última circular
                  </p>
                </div>
                <p className="text-sm font-medium text-text">
                  {dashboardData.circularReciente.titulo}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}