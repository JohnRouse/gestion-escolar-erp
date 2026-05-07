"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

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

  // Detail view
  if (selected) {
    const fecha = new Date(selected.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
    return (
      <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
        <header className="px-5 pt-10 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0F2E 0%, #1A2766 60%, #2336A8 100%)" }}>
          <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C5CFC, transparent)" }} />
          <button onClick={() => setSelected(null)} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Circulares
          </button>
          <div className="relative z-10">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Circular</p>
            <h1 className="text-lg font-extrabold text-white leading-snug">{selected.titulo}</h1>
          </div>
        </header>
        <div className="px-4 py-5 pb-28">
          <div className="card p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold" style={{ background: "#E8EBFD", color: "#2336A8" }}>
              {selected.remitente.persona.nombres[0]}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#0A0F2E" }}>
                {selected.remitente.persona.nombres} {selected.remitente.persona.apellido_paterno}
              </p>
              <p className="text-[10px]" style={{ color: "#9499C0" }}>{fecha}</p>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#4A5080" }}>{selected.contenido}</p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  // List view
  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
      <header className="px-5 pt-10 pb-5 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #0A0F2E 0%, #1A2766 60%, #2336A8 100%)" }}>
        <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C5CFC, transparent)" }} />
        <button onClick={() => router.back()} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Avisos</p>
            <h1 className="text-2xl font-extrabold text-white">Circulares</h1>
          </div>
          {circulares.length > 0 && (
            <span className="text-white/60 text-sm font-medium">{circulares.length} recibidas</span>
          )}
        </div>
      </header>

      <div className="px-4 py-5 pb-28 flex flex-col gap-3">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)
        ) : circulares.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📭</span>
            <p className="font-semibold text-gray-500">Sin circulares</p>
            <p className="text-sm text-gray-400 mt-1">No hay avisos disponibles</p>
          </div>
        ) : (
          circulares.map((circ, idx) => {
            const fecha = new Date(circ.fecha_creacion);
            const isRecent = (Date.now() - fecha.getTime()) < 7 * 24 * 60 * 60 * 1000;
            return (
              <button
                key={circ.id_circular}
                onClick={() => setSelected(circ)}
                className="card p-4 text-left active:scale-[0.99] transition-transform w-full"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#E8EBFD" }}>
                    📨
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold leading-snug" style={{ color: "#0A0F2E" }}>{circ.titulo}</p>
                      {isRecent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#EDE9FF", color: "#7C5CFC" }}>NUEVO</span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: "#9499C0" }}>{circ.contenido}</p>
                    <p className="text-[10px] font-semibold" style={{ color: "#9499C0" }}>
                      {fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <svg className="flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8CEED" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
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
