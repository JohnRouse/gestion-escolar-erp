"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface AsistenciaItem { fecha: string; estado: string; }

export default function AsistenciaPage() {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { selectedChild } = useSelectedChild();
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchAsistencia(token, selectedChild.id_estudiante);
  }, [selectedChild]);

  const fetchAsistencia = async (token: string, id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/padres/asistencia?alumno_id=${id}&desde=2025-01-01&hasta=2025-12-31`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case "Presente": return { bg: "bg-success-soft", text: "text-success", dot: "bg-success" };
      case "Ausente": return { bg: "bg-danger-soft", text: "text-danger", dot: "bg-danger" };
      case "Tardanza": return { bg: "bg-warning-soft", text: "text-warning", dot: "bg-warning" };
      case "Justificado": return { bg: "bg-info-soft", text: "text-info", dot: "bg-info" };
      default: return { bg: "bg-border", text: "text-text-muted", dot: "bg-text-muted" };
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt pb-20">
        <ScreenHeader title="Asistencia" />
        <div className="px-5 pt-4 pb-28 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 flex items-center gap-3">
              <div className="skel w-3 h-3 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skel h-4 w-1/3" />
                <div className="skel h-3 w-1/4" />
              </div>
              <div className="skel h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-20">
      <ScreenHeader title="Asistencia" />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-5 mb-5">
          <div className="relative w-24 h-24">
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#10B981 ${porcentaje}%, #E2E8F0 0)` }}>
              <div className="absolute inset-[10px] rounded-full bg-white" />
            </div>
            <span className="absolute inset-0 grid place-items-center text-text font-extrabold">{porcentaje}%</span>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-text">{presentes}<span className="text-2xl text-text-secondary">/{total}</span></p>
            <p className="text-text-secondary text-sm mt-1">días presentes</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="m-card p-3 text-center">
            <p className="text-2xl font-extrabold text-text">{ausentes}</p>
            <p className="text-[11px] text-text-secondary">Ausencias</p>
          </div>
          <div className="m-card p-3 text-center">
            <p className="text-2xl font-extrabold text-text">{tardanzas}</p>
            <p className="text-[11px] text-text-secondary">Tardanzas</p>
          </div>
          <div className="m-card p-3 text-center">
            <p className="text-2xl font-extrabold text-text">{justificados}</p>
            <p className="text-[11px] text-text-secondary">Justificadas</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`press px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filtro === f ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-white text-text-secondary border border-border hover:bg-surface-alt"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 mt-3 pb-28 space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 flex items-center gap-3">
              <div className="skel w-3 h-3 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skel h-4 w-1/3" />
                <div className="skel h-3 w-1/4" />
              </div>
              <div className="skel h-6 w-20 rounded-full" />
            </div>
          ))
        ) : listaFiltrada.length === 0 ? (
          <p className="text-center text-text-secondary py-10">Sin registros</p>
        ) : (
          listaFiltrada.map((item, idx) => {
            const est = getEstadoStyle(item.estado);
            const fecha = new Date(item.fecha + "T00:00:00");
            return (
              <div key={idx} className="m-card p-4 flex items-center gap-3">
                <span className={`dot ${est.dot}`} />
                <div className="flex-1">
                  <p className="font-extrabold text-text">{fecha.toLocaleDateString("es-PE", { weekday: "long" })}</p>
                  <p className="text-xs text-text-secondary">{fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${est.bg} ${est.text}`}>{item.estado}</span>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}