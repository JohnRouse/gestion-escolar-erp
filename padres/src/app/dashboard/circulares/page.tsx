"use client";

import { useEffect, useState } from "react";
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
  destinatarios: {
    leida: boolean;
    confirmada: boolean;
  }[];
}

export default function CircularesPage() {
  const router = useRouter();
  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Circular | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchCirculares(token);
  }, [router]);

  const fetchCirculares = async (token: string) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/circulares/padres", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(res.data);
    } catch { setCirculares([]); } finally { setLoading(false); }
  };

  const marcarLeida = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/circulares/${id}/leida`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(prev => prev.map(c => c.id_circular === id ? { ...c, destinatarios: [{ ...c.destinatarios[0], leida: true }] } : c));
    } catch {}
  };

  const confirmarAutorizacion = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/circulares/${id}/confirmar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(prev => prev.map(c => c.id_circular === id ? { ...c, destinatarios: [{ ...c.destinatarios[0], confirmada: true }] } : c));
      alert("Autorización confirmada correctamente.");
    } catch {
      alert("Error al confirmar la autorización.");
    }
  };

  // Vista de detalle
  if (selected) {
    const esLeida = selected.destinatarios?.[0]?.leida;
    if (!esLeida) marcarLeida(selected.id_circular);

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
                <span className="px-2.5 py-0.5 rounded-full bg-danger-soft text-danger text-[11px] font-bold">
                  URGENTE
                </span>
              )}
            </div>

            <h2 className="text-xl font-extrabold text-text mb-3">{selected.titulo}</h2>
            <p className="text-sm text-text-secondary mb-1">
              De: {selected.remitente.persona.nombres} {selected.remitente.persona.apellido_paterno}
            </p>
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
                  <a key={adj.id_adjunto} href={adj.url} target="_blank" className="flex items-center gap-2 text-accent text-sm hover:underline">
                    <span className="material-symbols-rounded">attach_file</span> {adj.nombre_archivo}
                  </a>
                ))}
              </div>
            )}

            {selected.requiere_autorizacion && !selected.destinatarios?.[0]?.confirmada && (
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

  // Listado de circulares
  const noLeidas = circulares.filter(c => !c.destinatarios?.[0]?.leida).length;

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Avisos" />
      <div className="px-5 pt-4 pb-28">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-secondary">
            {noLeidas > 0 ? `${noLeidas} sin leer` : "Todas leídas"}
          </p>
          <p className="text-xs text-text-muted">{circulares.length} circulares</p>
        </div>

        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 mb-3 space-y-3">
              <div className="skel h-4 w-3/4" />
              <div className="skel h-3 w-full" />
              <div className="skel h-3 w-1/4" />
            </div>
          ))
        ) : circulares.length === 0 ? (
          <p className="text-center text-text-secondary py-10">No hay circulares</p>
        ) : (
          circulares.map((circ) => {
            const leida = circ.destinatarios?.[0]?.leida;
            return (
              <button
                key={circ.id_circular}
                onClick={() => setSelected(circ)}
                className={`w-full text-left m-card p-4 mb-3 press ${
                  !leida ? "border-l-4 border-l-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!leida && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />}
                    <p className={`font-extrabold truncate ${!leida ? "text-text" : "text-text-secondary"}`}>
                      {circ.titulo}
                    </p>
                  </div>
                  {circ.urgente && (
                    <span className="px-2 py-0.5 rounded-full bg-danger-soft text-danger text-[10px] font-bold flex-shrink-0 ml-2">
                      !
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate mb-1">
                  {circ.remitente.persona.nombres} {circ.remitente.persona.apellido_paterno}
                </p>
                <p className="text-xs text-text-muted line-clamp-2 mb-2">{circ.contenido}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span>{new Date(circ.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  {circ.categoria && (
                    <>
                      <span>·</span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary">{circ.categoria}</span>
                    </>
                  )}
                  {circ.adjuntos && circ.adjuntos.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="material-symbols-rounded text-sm">attach_file</span>
                    </>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}