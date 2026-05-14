"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";

interface Adjunto {
  id_adjunto: number;
  nombre_archivo: string;
  url: string;
}

interface Circular {
  id_circular: number;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  categoria: string | null;
  urgente: boolean;
  requiere_autorizacion: boolean;
  remitente: { persona: { nombres: string; apellido_paterno: string } };
  adjuntos: Adjunto[];
  leida?: boolean;
  dirigido_a?: string;
}

export default function CircularesPage() {
  const router = useRouter();
  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Circular | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroUrgente, setFiltroUrgente] = useState(false);
  const [filtroAdjuntos, setFiltroAdjuntos] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) { router.push("/login"); return; }
  fetchCirculares(token).then((data) => {
    const idParam = searchParams.get("id_circular");
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id)) {
        const encontrada = data.find((c: Circular) => c.id_circular === id);
        if (encontrada) setSelected(encontrada);
      }
    }
  });
}, [router, searchParams]);

  const fetchCirculares = async (token: string) => {
  setLoading(true);
  try {
    const res = await axios.get("/api/circulares/padres", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCirculares(res.data);
    return res.data; // <-- añadir este return
  } catch {
    setCirculares([]);
    return []; // <-- y este
  } finally {
    setLoading(false);
  }
};

  const marcarLeida = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/circulares/${id}/leida`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(prev => prev.map(c => c.id_circular === id ? { ...c, leida: true } : c));
      if (selected?.id_circular === id) setSelected(prev => prev ? { ...prev, leida: true } : null);
    } catch (err) {
      console.error("Error al marcar como leída:", err);
    }
  };

  const confirmarAutorizacion = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/circulares/${id}/confirmar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(prev => prev.map(c => c.id_circular === id ? { ...c, requiere_autorizacion: false } : c));
      alert("Autorización confirmada correctamente.");
    } catch {
      alert("Error al confirmar la autorización.");
    }
  };

  const circularesFiltradas = useMemo(() => {
    let resultado = circulares;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(
        c =>
          c.titulo.toLowerCase().includes(q) ||
          c.contenido.toLowerCase().includes(q) ||
          (c.remitente.persona.nombres + " " + c.remitente.persona.apellido_paterno).toLowerCase().includes(q)
      );
    }
    if (filtroUrgente) resultado = resultado.filter(c => c.urgente);
    if (filtroAdjuntos) resultado = resultado.filter(c => c.adjuntos && c.adjuntos.length > 0);
    return resultado;
  }, [circulares, busqueda, filtroUrgente, filtroAdjuntos]);

  if (selected) {
    if (!selected.leida) marcarLeida(selected.id_circular);

    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Circular" />
        <div className="px-5 pt-4 pb-28">
          <button onClick={() => setSelected(null)} className="text-accent font-semibold text-sm mb-4 flex items-center gap-1">
            <span className="material-symbols-rounded">arrow_back</span> Volver
          </button>

          <div className="m-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                selected.categoria === "Urgente" ? "bg-danger-soft text-danger" :
                selected.categoria === "Evento" ? "bg-info-soft text-info" :
                "bg-accent-soft text-accent"
              }`}>
                {selected.categoria || "General"}
              </span>
              {selected.urgente && (
                <span className="px-2.5 py-0.5 rounded-full bg-danger-soft text-danger text-[11px] font-bold">URGENTE</span>
              )}
            </div>

            <h2 className="text-xl font-extrabold text-text mb-3">{selected.titulo}</h2>
            <p className="text-sm text-text-secondary mb-1">
              De: {selected.remitente.persona.nombres} {selected.remitente.persona.apellido_paterno}
            </p>
            {selected.dirigido_a && (
              <p className="text-xs text-text-muted mb-1">Dirigido a: {selected.dirigido_a}</p>
            )}
            <p className="text-xs text-text-muted mb-4">
              {new Date(selected.fecha_creacion).toLocaleDateString("es-PE", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>

            <div className="border-t border-border pt-4">
              <p className="text-text leading-relaxed whitespace-pre-line">{selected.contenido}</p>
            </div>

            {selected.adjuntos && selected.adjuntos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-bold text-text mb-2">Adjuntos</p>
                {selected.adjuntos.map((adj) => (
                  <a key={adj.id_adjunto} href={adj.url} target="_blank" className="flex items-center gap-2 text-accent text-sm hover:underline" rel="noopener noreferrer">
                    <span className="material-symbols-rounded">attach_file</span> {adj.nombre_archivo}
                  </a>
                ))}
              </div>
            )}

            {selected.requiere_autorizacion && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-bold text-text mb-2">Acción requerida</p>
                <p className="text-xs text-text-secondary mb-3">Esta circular requiere tu autorización.</p>
                <button
                  onClick={() => confirmarAutorizacion(selected.id_circular)}
                  className="press px-5 py-2 rounded-xl bg-accent text-white font-bold text-sm shadow-md"
                >
                  Confirmar autorización
                </button>
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  const noLeidas = circulares.filter(c => !c.leida).length;

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Avisos" />
      <div className="px-5 pt-4 pb-28">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-secondary">{noLeidas > 0 ? `${noLeidas} sin leer` : "Todas leídas"}</p>
          <p className="text-xs text-text-muted">{circulares.length} circulares</p>
        </div>

        {/* Buscador */}
        <div className="relative mb-3">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
          <input
            type="text"
            placeholder="Buscar circulares..."
            className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button onClick={() => setFiltroUrgente(!filtroUrgente)} className={`press px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtroUrgente ? "bg-danger text-white shadow-md" : "bg-white text-text-secondary border border-border"}`}>
            Urgentes
          </button>
          <button onClick={() => setFiltroAdjuntos(!filtroAdjuntos)} className={`press px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtroAdjuntos ? "bg-info text-white shadow-md" : "bg-white text-text-secondary border border-border"}`}>
            Con adjuntos
          </button>
        </div>

        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 mb-3 space-y-3">
              <div className="skel h-4 w-3/4" />
              <div className="skel h-3 w-full" />
              <div className="skel h-3 w-1/4" />
            </div>
          ))
        ) : circularesFiltradas.length === 0 ? (
          <p className="text-center text-text-secondary py-10">No se encontraron circulares.</p>
        ) : (
          circularesFiltradas.map((circular) => (
            <button
              key={circular.id_circular}
              onClick={() => setSelected(circular)}
              className={`w-full text-left m-card p-4 mb-3 press ${!circular.leida ? "border-l-4 border-l-accent" : ""}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {!circular.leida && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />}
                  <p className={`font-extrabold truncate ${!circular.leida ? "text-text" : "text-text-secondary"}`}>{circular.titulo}</p>
                </div>
                {circular.urgente && <span className="px-2 py-0.5 rounded-full bg-danger-soft text-danger text-[10px] font-bold flex-shrink-0 ml-2">!</span>}
              </div>
              <p className="text-xs text-text-secondary truncate mb-1">{circular.remitente.persona.nombres} {circular.remitente.persona.apellido_paterno}</p>
              {circular.dirigido_a && <p className="text-[10px] text-text-muted mb-1">Dirigido a: {circular.dirigido_a}</p>}
              <p className="text-xs text-text-muted line-clamp-2 mb-2">{circular.contenido}</p>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <span>{new Date(circular.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                {circular.categoria && <><span>·</span><span className="px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary">{circular.categoria}</span></>}
                {circular.adjuntos && circular.adjuntos.length > 0 && <><span>·</span><span className="material-symbols-rounded text-sm">attach_file</span></>}
              </div>
            </button>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}