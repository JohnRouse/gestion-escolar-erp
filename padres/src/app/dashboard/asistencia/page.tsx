"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface AsistenciaItem { fecha: string; estado: string; }

export default function AsistenciaPage() {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alumnoId] = useState(2);
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
  const justificados = asistencias.filter(a => a.estado === "Justificado").length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const filtros = ["Todos", "Presente", "Ausente", "Tardanza", "Justificado"];
  const listaFiltrada = filtro === "Todos" ? asistencias : asistencias.filter(a => a.estado === filtro);

  const estadoConfig: Record<string, { bg: string; color: string; dot: string }> = {
    Presente:    { bg: "#D1FAE5", color: "#059669", dot: "#10B981" },
    Ausente:     { bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" },
    Tardanza:    { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
    Justificado: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
  };

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (porcentaje / 100) * circumference;

  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
      {/* Header */}
      <header className="px-5 pt-10 pb-6 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #059669 0%, #10B981 60%, #34D399 100%)" }}>
        <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <button onClick={() => router.back()} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <div className="relative z-10 flex items-center gap-5">
          {/* Donut */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10"/>
              <circle cx="50" cy="50" r={radius} fill="none" stroke="white" strokeWidth="10"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-white">{porcentaje}%</span>
          </div>
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Asistencia</p>
            <p className="text-white text-2xl font-extrabold">{presentes}/{total}</p>
            <p className="text-white/60 text-xs mt-0.5">días presentes</p>
          </div>
        </div>

        {/* Mini stats */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-5">
          {[
            { label: "Ausencias", val: ausentes, color: "rgba(239,68,68,0.3)" },
            { label: "Tardanzas", val: tardanzas, color: "rgba(245,158,11,0.3)" },
            { label: "Justific.", val: justificados, color: "rgba(59,130,246,0.3)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-3 py-2 text-center" style={{ background: s.color }}>
              <p className="text-white font-extrabold text-lg">{s.val}</p>
              <p className="text-white/70 text-[10px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 pb-28">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`chip flex-shrink-0 ${filtro === f ? "chip-active" : "chip-inactive"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 mb-2" />)
        ) : listaFiltrada.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-500 font-semibold text-sm">Sin registros</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {listaFiltrada.map((item, idx) => {
              const cfg = estadoConfig[item.estado] || { bg: "#F6F7FF", color: "#4A5080", dot: "#9499C0" };
              const fecha = new Date(item.fecha + "T00:00:00");
              return (
                <div key={idx} className="card flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    <div>
                      <p className="text-sm font-semibold capitalize" style={{ color: "#0A0F2E" }}>
                        {fecha.toLocaleDateString("es-PE", { weekday: "long" })}
                      </p>
                      <p className="text-[10px]" style={{ color: "#9499C0" }}>
                        {fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
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
