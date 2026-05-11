"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild, Child } from "@/contexts/SelectedChildContext";

interface Hijo extends Child {}

interface DashboardData {
  asistencia: number | null;
  promedio: number | null;
  estadoPagos: string;
  totalPendiente: number;
  circularReciente: { titulo: string; fecha: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; rol: string } | null>(null);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

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
      const res = await axios.get("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hijos = res.data;
      setHijos(hijos);
      if (hijos.length > 0) {
        if (selectedChild && hijos.find((h: Hijo) => h.id_estudiante === selectedChild.id_estudiante)) {
          fetchDashboardData(token, selectedChild.id_estudiante);
        } else {
          setSelectedChild(hijos[0]);
          fetchDashboardData(token, hijos[0].id_estudiante);
        }
      }
    } catch {
      const mock = [{ id_estudiante: 2, nombre: "Lucas García López", grado: "1.er Grado · Sección A" }];
      setHijos(mock);
      if (!selectedChild) setSelectedChild(mock[0]);
      fetchDashboardData(token, mock[0].id_estudiante);
    }
  };

  const fetchDashboardData = async (token: string, alumnoId: number) => {
    try {
      const [asistRes, notasRes, pagosRes, circRes] = await Promise.allSettled([
        axios.get(`/api/academicos/padres/asistencia?alumno_id=${alumnoId}&desde=2025-01-01&hasta=2025-12-31`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/circulares/padres", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const asistencias = asistRes.status === "fulfilled" ? asistRes.value.data : [];
      const total = asistencias.length;
      const presentes = asistencias.filter((a: any) => a.estado === "Presente").length;
      const pct = total > 0 ? Math.round((presentes / total) * 100) : null;
      const notas = notasRes.status === "fulfilled" ? notasRes.value.data : [];
      const promedios = notas.map((c: any) => c.promedioBimestre).filter((p: any) => p !== null);
      const prom = promedios.length > 0
        ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10
        : null;
      const pendiente = pagosRes.status === "fulfilled" ? (pagosRes.value.data.total_pendiente || 0) : 0;
      const estado = pendiente === 0 ? "Al día" : "Por pagar";
      const circulares = circRes.status === "fulfilled" ? circRes.value.data : [];
      const circ = circulares.length > 0
        ? { titulo: circulares[0].titulo, fecha: circulares[0].fecha_creacion }
        : null;
      setDashboardData({ asistencia: pct, promedio: prom, estadoPagos: estado, totalPendiente: pendiente, circularReciente: circ });
    } catch {
      setDashboardData({ asistencia: 92, promedio: 15.4, estadoPagos: "Por pagar", totalPendiente: 3150, circularReciente: { titulo: "Aviso – Primaria", fecha: "2025-05-06" } });
    } finally {
      setLoading(false);
      setTimeout(() => setShowActivity(true), 600);
    }
  };

  const initials = user ? user.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2) : "";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  if (!user) return null;

  return (
    <main className="min-h-screen bg-brand-paper pb-20">
      {/* Header pastel */}
      <div className="bg-brand-redSoft pt-14 pb-28 px-6 relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/70 blur-2xl" />
        <div className="absolute left-[-20px] bottom-[-30px] w-32 h-32 rounded-full bg-white/50 blur-2xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-brand-line grid place-items-center font-extrabold text-brand-redDeep shadow-sm">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-brand-inkSoft text-sm">{greeting},</p>
            <p className="text-xl font-extrabold leading-tight text-brand-ink">{user.nombre.split(" ")[0]}</p>
          </div>
          <button className="relative w-11 h-11 rounded-full bg-white border border-brand-line grid place-items-center shadow-sm text-brand-ink">
            <span className="material-symbols-rounded">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-red ring-2 ring-white" />
          </button>
        </div>

        {/* Selector de estudiante */}
        {selectedChild && (
          <div className="mt-5 m-card p-4 animate-slide-up relative z-10">
            <p className="text-[10px] tracking-[.22em] text-brand-inkSoft font-bold">ESTUDIANTE</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-12 h-12 rounded-2xl bg-brand-redSoft grid place-items-center text-brand-redDeep font-extrabold shrink-0">
                  {selectedChild.nombre.charAt(0)}
                </span>
                <div className="min-w-0">
                  {hijos.length > 1 ? (
                    <select
                      className="pill-select appearance-none bg-transparent font-extrabold text-brand-ink text-sm pr-6"
                      value={selectedChild.id_estudiante}
                      onChange={(e) => {
                        const hijo = hijos.find((h) => h.id_estudiante === Number(e.target.value));
                        if (hijo) {
                          setSelectedChild(hijo);
                          const token = localStorage.getItem("token") ?? "";
                          fetchDashboardData(token, hijo.id_estudiante);
                        }
                      }}
                    >
                      {hijos.map((h) => (
                        <option key={h.id_estudiante} value={h.id_estudiante}>
                          {h.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-extrabold text-brand-ink text-sm truncate">{selectedChild.nombre}</p>
                  )}
                  <p className="text-xs text-brand-inkSoft mt-0.5">{selectedChild.grado}</p>
                </div>
              </div>
              <span className="material-symbols-rounded text-brand-yellowDeep text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                workspace_premium
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contenido con métricas */}
      <div className="-mt-20 px-5 pb-6 relative z-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="m-card p-4 space-y-3">
                <div className="skel h-3 w-16" />
                <div className="skel h-8 w-20" />
                <div className="skel h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Asistencia */}
            <button
              onClick={() => router.push("/dashboard/asistencia")}
              className="press m-card p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-brand-inkSoft">ASISTENCIA</p>
                <span className="w-7 h-7 rounded-full bg-okSoft grid place-items-center">
                  <span className="material-symbols-rounded text-ok text-lg">check</span>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-brand-ink mt-2">
                {dashboardData?.asistencia ?? "—"}<span className="text-xl">%</span>
              </p>
              <p className="text-xs text-brand-inkSoft">Bimestre I</p>
              <div className="mt-3 h-1.5 bg-brand-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-ok transition-all duration-700"
                  style={{ width: `${dashboardData?.asistencia ?? 0}%` }}
                />
              </div>
            </button>

            {/* Promedio */}
            <button
              onClick={() => router.push("/dashboard/calificaciones")}
              className="press m-card p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-brand-inkSoft">PROMEDIO</p>
                <span className="w-7 h-7 rounded-full bg-brand-yellowSoft grid place-items-center">
                  <span className="material-symbols-rounded text-brand-yellowDeep text-lg">trending_up</span>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-brand-ink mt-2">
                {dashboardData?.promedio ?? "—"}
                <span className="text-base text-brand-inkSoft">.0</span>
              </p>
              <p className="text-xs text-brand-inkSoft">General</p>
              <span className="inline-flex mt-3 px-2 py-0.5 rounded-full bg-okSoft text-ok text-[11px] font-bold">
                {(dashboardData?.promedio ?? 0) >= 11 ? "Aprobado" : "En riesgo"}
              </span>
            </button>

            {/* Pagos */}
            <button
              onClick={() => router.push("/dashboard/pagos")}
              className="press m-card p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-brand-inkSoft">PAGOS</p>
                <span className="w-7 h-7 rounded-full bg-brand-redSoft grid place-items-center">
                  <span className="material-symbols-rounded text-brand-redDeep text-lg">credit_card</span>
                </span>
              </div>
              <p className="text-xl font-extrabold text-brand-ink mt-2">
                S/ {dashboardData?.totalPendiente?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) ?? "0.00"}
              </p>
              <p className="text-xs text-brand-inkSoft">{dashboardData?.estadoPagos}</p>
              <span className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                dashboardData?.estadoPagos === "Al día" ? "bg-okSoft text-ok" : "bg-warnSoft text-warn"
              }`}>
                {dashboardData?.estadoPagos === "Al día" ? "Al día" : "Por pagar"}
              </span>
            </button>

            {/* Último aviso */}
            <button
              onClick={() => router.push("/dashboard/circulares")}
              className="press m-card p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[.18em] font-bold text-brand-inkSoft">ÚLTIMO AVISO</p>
                <span className="w-7 h-7 rounded-full bg-brand-yellowSoft grid place-items-center">
                  <span className="material-symbols-rounded text-brand-yellowDeep text-lg">campaign</span>
                </span>
              </div>
              <p className="text-base font-extrabold text-brand-ink mt-2 line-clamp-1">
                {dashboardData?.circularReciente?.titulo ?? "Sin avisos"}
              </p>
              <p className="text-xs text-brand-inkSoft truncate">
                {dashboardData?.circularReciente ? "Nuevo comunicado" : "No hay circulares"}
              </p>
              {dashboardData?.circularReciente && (
                <p className="text-[11px] text-brand-inkSoft mt-2">
                  {new Date(dashboardData.circularReciente.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </p>
              )}
            </button>

            {/* Horario (acceso extra, no en el HTML original pero preservamos funcionalidad) */}
            <button
              onClick={() => router.push("/dashboard/horario")}
              className="press m-card p-4 text-left col-span-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-lilacSoft grid place-items-center">
                  <span className="material-symbols-rounded text-lilac text-2xl">calendar_month</span>
                </span>
                <div>
                  <p className="font-extrabold text-brand-ink">Horario semanal</p>
                  <p className="text-xs text-brand-inkSoft">Ver clases programadas</p>
                </div>
                <span className="material-symbols-rounded text-brand-inkSoft ml-auto">chevron_right</span>
              </div>
            </button>
          </div>
        )}

        {/* Actividad reciente */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-[10px] tracking-[.22em] font-extrabold text-brand-inkSoft">ACTIVIDAD RECIENTE</p>
          <button className="text-xs font-bold text-brand-redDeep">Ver todo</button>
        </div>

        {!showActivity ? (
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="m-card p-3 flex items-center gap-3">
                <div className="skel w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skel h-3 w-3/4" />
                  <div className="skel h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="m-card p-3 flex items-center gap-3 press">
              <span className="w-10 h-10 rounded-xl bg-brand-redSoft grid place-items-center">
                <span className="material-symbols-rounded text-brand-redDeep text-xl">description</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-ink">Nota de Matemáticas registrada</p>
                <p className="text-xs text-brand-inkSoft">Hace 2 días</p>
              </div>
              <span className="material-symbols-rounded text-brand-inkSoft">chevron_right</span>
            </div>
            <div className="m-card p-3 flex items-center gap-3 press">
              <span className="w-10 h-10 rounded-xl bg-okSoft grid place-items-center">
                <span className="material-symbols-rounded text-ok text-xl">check_circle</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-ink">Asistencia del lunes confirmada</p>
                <p className="text-xs text-brand-inkSoft">Hace 3 días</p>
              </div>
              <span className="material-symbols-rounded text-brand-inkSoft">chevron_right</span>
            </div>
            <div className="m-card p-3 flex items-center gap-3 press">
              <span className="w-10 h-10 rounded-xl bg-brand-yellowSoft grid place-items-center">
                <span className="material-symbols-rounded text-brand-yellowDeep text-xl">campaign</span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-ink">Nueva circular publicada</p>
                <p className="text-xs text-brand-inkSoft">Hace 4 días</p>
              </div>
              <span className="material-symbols-rounded text-brand-inkSoft">chevron_right</span>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}