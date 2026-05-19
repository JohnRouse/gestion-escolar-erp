"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Foto {
  id_foto: number;
  url: string;
  titulo: string | null;
  creado_en: string;
}

export default function GaleriaPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFoto, setSelectedFoto] = useState<Foto | null>(null);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    setLoading(true);
    // 1. Obtener la sección del alumno
    axios
      .get(`/api/academicos/seccion-alumno?alumno_id=${selectedChild.id_estudiante}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => res.data.id_seccion)
      .then((seccionId) =>
        axios.get(`/api/fotos?seccion_id=${seccionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => setFotos(res.data))
      .catch(() => setFotos([]))
      .finally(() => setLoading(false));
  }, [selectedChild, router]);

  // ── Vista detalle (imagen ampliada) ──
  if (selectedFoto) {
    return (
      <main className="min-h-screen bg-black/95 pb-24">
        <div className="relative h-screen flex items-center justify-center">
          <button
            onClick={() => setSelectedFoto(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
          <img
            src={selectedFoto.url}
            alt={selectedFoto.titulo || "Foto"}
            className="max-h-[90vh] max-w-full object-contain"
          />
        </div>
        <BottomNav />
      </main>
    );
  }

  // ── Galería principal ──
  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Momentos Victoria" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          <button
            onClick={() => router.push("/dashboard?open=servicios")}
            className="text-accent text-sm font-bold hover:underline mb-4 flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-lg">arrow_back</span> Servicios
          </button>

          {loading ? (
            <div className="columns-2 gap-2 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="skel rounded-xl"
                  style={{ height: `${Math.random() * 150 + 100}px` }}
                />
              ))}
            </div>
          ) : fotos.length === 0 ? (
            <p className="text-center text-text-secondary py-10">
              No hay fotos disponibles para esta sección
            </p>
          ) : (
            <div className="columns-2 md:columns-3 gap-2 space-y-2">
              {fotos.map((foto) => (
                <button
                  key={foto.id_foto}
                  onClick={() => setSelectedFoto(foto)}
                  className="w-full break-inside-avoid mb-2 press"
                >
                  <img
                    src={foto.url}
                    alt={foto.titulo || "Foto"}
                    className="w-full rounded-xl shadow-sm"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}