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

  if (selected) {
    return (
      <main className="min-h-screen bg-slate-50 pb-20">
        <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Detalle</h1>
        </header>
        <div className="px-4 py-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{new Date(selected.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{selected.titulo}</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selected.contenido}</p>
            <p className="text-xs text-gray-400 mt-4">Por {selected.remitente.persona.nombres} {selected.remitente.persona.apellido_paterno}</p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <h1 className="text-lg font-bold text-gray-900">Circulares</h1>
      </header>
      <div className="px-4 py-4 flex flex-col gap-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />)
        ) : circulares.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No hay circulares disponibles.</p>
        ) : (
          circulares.map((circ) => (
            <button key={circ.id_circular} onClick={() => setSelected(circ)}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left hover:shadow-md transition-shadow">
              <p className="text-sm font-semibold text-gray-900 mb-1">{circ.titulo}</p>
              <p className="text-xs text-gray-500 mb-2">{new Date(circ.fecha_creacion).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{circ.contenido}</p>
            </button>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}