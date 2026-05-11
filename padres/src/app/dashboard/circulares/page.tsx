"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";

interface Circular {
  id_circular: number;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  remitente: { persona: { nombres: string; apellido_paterno: string } };
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
      const res = await axios.get("/api/circulares/padres", { headers: { Authorization: `Bearer ${token}` } });
      setCirculares(res.data);
    } catch { setCirculares([]); } finally { setLoading(false); }
  };

  if (selected) {
    return (
      <main className="min-h-screen bg-surface-alt pb-20">
        <ScreenHeader title="Aviso" />
        <div className="px-5 py-5">
          <div className="m-card p-5">
            <h2 className="text-2xl font-extrabold text-text mb-3">{selected.titulo}</h2>
            <p className="text-sm text-text-secondary mb-4">{new Date(selected.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p className="text-text leading-relaxed whitespace-pre-line">{selected.contenido}</p>
            <p className="text-xs text-text-secondary mt-4">Por {selected.remitente.persona.nombres} {selected.remitente.persona.apellido_paterno}</p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-20">
      <ScreenHeader title="Avisos" />
      <div className="px-5 pt-5 pb-28 space-y-3">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="m-card p-4 flex items-start gap-3">
              <div className="skel w-11 h-11 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="skel h-4 w-3/4" />
                <div className="skel h-3 w-full" />
                <div className="skel h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : circulares.length === 0 ? (
          <p className="text-center text-text-secondary py-10">No hay circulares disponibles.</p>
        ) : (
          circulares.map((circ) => {
            const isNew = new Date(circ.fecha_creacion).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
            return (
              <button key={circ.id_circular} onClick={() => setSelected(circ)} className="m-card p-4 flex items-start gap-3 press w-full text-left">
                <span className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <span className="material-symbols-rounded text-accent text-2xl">campaign</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-text truncate">{circ.titulo}</p>
                    {isNew && <span className="px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-extrabold">NUEVO</span>}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{circ.contenido}</p>
                  <p className="text-[11px] text-text-muted mt-1">{new Date(circ.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <span className="material-symbols-rounded text-text-muted mt-2">chevron_right</span>
              </button>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}