"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Hijo {
  id_estudiante: number;
  nombre: string;
  grado: string;
}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
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

  // Verificar autenticación al cargar
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

  // Obtener hijos del apoderado (ajusta el endpoint según tu API)
  const fetchHijos = async (token: string) => {
  // Simulación con datos de prueba (más adelante conectaremos al endpoint real)
  const mockHijos = [
    { id_estudiante: 2, nombre: "Lucas García", grado: "5° Primaria" },
    { id_estudiante: 5, nombre: "Sofía García", grado: "3° Inicial" },
  ];
  setHijos(mockHijos);
  setSelectedHijo(mockHijos[0]);
  fetchDashboardData(token, mockHijos[0].id_estudiante);
};

  // Obtener datos del dashboard (usando endpoints existentes)
  const fetchDashboardData = async (token: string, alumnoId: number) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  try {
    // Asistencia del bimestre actual
    const asistenciaRes = await axios.get(
      `${apiUrl}/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=2025-01-01&hasta=2025-12-31`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const asistencias = asistenciaRes.data;
    const total = asistencias.length;
    const presentes = asistencias.filter((a: any) => a.estado === "Presente").length;
    const porcentajeAsistencia = total > 0 ? Math.round((presentes / total) * 100) : null;

    // Calificaciones del bimestre 1
    const notasRes = await axios.get(
      `${apiUrl}/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const notasData = notasRes.data;
    const promedios = notasData.map((c: any) => c.promedioBimestre).filter((p: any) => p !== null);
    const promedioGeneral =
      promedios.length > 0
        ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10
        : null;

    // Estado de pagos
    const pagosRes = await axios.get(
      `${apiUrl}/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const totalPendiente = pagosRes.data.total_pendiente || 0;
    const estadoPagos = totalPendiente === 0 ? "Al día" : `${totalPendiente} pendiente`;

    // Circulares recientes
    const circularesRes = await axios.get(`${apiUrl}/circulares/padres`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const circulares = circularesRes.data;
    const circularReciente =
      circulares.length > 0
        ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion }
        : null;

    setDashboardData({
      asistencia: porcentajeAsistencia,
      promedio: promedioGeneral,
      estadoPagos,
      circularReciente,
    });
  } catch (err) {
    console.error("Error al cargar datos del dashboard:", err);
    setDashboardData({
      asistencia: 92,
      promedio: 15.4,
      estadoPagos: "1 pendiente",
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
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-lt flex items-center justify-center text-xs font-semibold text-indigo">
            {user.nombre
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <p className="text-xs font-medium">{user.nombre}</p>
            <p className="text-[10px] text-gray-400">Apoderado</p>
          </div>
        </div>
        <div className="relative">
          <span className="text-lg">🔔</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red rounded-full"></span>
        </div>
      </header>

      {/* Selector de hijo */}
      {hijos.length > 1 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <select
            className="input text-xs"
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

      {/* Tarjetas de resumen */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando datos...</p>
        ) : (
          <>
            {/* Asistencia */}
            <div className="card p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Asistencia — Bimestre I</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardData?.asistencia !== null ? `${dashboardData?.asistencia}%` : "—"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-green flex items-center justify-center text-green text-sm">
                ✓
              </div>
            </div>

            {/* Promedio general */}
            <div className="card p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Promedio general</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardData?.promedio !== null ? dashboardData?.promedio : "—"}
                </p>
              </div>
              <span className="badge badge-green">Aprobado</span>
            </div>

            {/* Estado de pagos */}
            <div className="card p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Estado de pagos</p>
                <p className="text-sm font-medium text-gray-900">{dashboardData?.estadoPagos}</p>
              </div>
              <span
                className={`badge ${
                  dashboardData?.estadoPagos === "Al día" ? "badge-green" : "badge-amber"
                }`}
              >
                {dashboardData?.estadoPagos === "Al día" ? "Al día" : "Pendiente"}
              </span>
            </div>

            {/* Circular reciente */}
            {dashboardData?.circularReciente && (
              <div className="card p-4">
                <p className="text-[10px] font-medium mb-2">Circular reciente</p>
                <p className="text-xs text-gray-700">{dashboardData.circularReciente.titulo}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(dashboardData.circularReciente.fecha).toLocaleDateString()}
                </p>
              </div>
            )}
          </>
        )}

        {/* Botón de logout temporal */}
        <button onClick={handleLogout} className="btn btn-primary w-full mt-2">
          Cerrar sesión
        </button>
      </div>

      {/* Navegación inferior */}
      <BottomNav />
    </main>
  );
}