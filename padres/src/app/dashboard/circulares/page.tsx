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
  remitente: {
    persona: {
      nombres: string;
      apellido_paterno: string;
    };
  };
}

export default function CircularesPage() {
  const router = useRouter();
  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchCirculares(token);
  }, [router]);

  const fetchCirculares = async (token: string) => {
    setLoading(true);
    try {
      const response = await axios.get("/api/circulares/padres", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCirculares(response.data);
    } catch (err) {
      console.error("Error al cargar circulares:", err);
    } finally {
      setLoading(false);
    }
  };

  // Vista de detalle
  if (selectedCircular) {
    return (
      <main className="min-h-screen bg-gray-50 pb-16">
        <div className="px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => setSelectedCircular(null)}
            className="text-gray-400 text-lg"
          >
            ‹
          </button>
          <h1 className="text-sm font-semibold text-navy">Detalle circular</h1>
        </div>
        <div className="px-4 py-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            {selectedCircular.titulo}
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Enviado el {new Date(selectedCircular.fecha_creacion).toLocaleDateString("es-PE")}{" "}
            · {selectedCircular.remitente.persona.nombres}{" "}
            {selectedCircular.remitente.persona.apellido_paterno}
          </p>
          <div className="card p-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {selectedCircular.contenido}
            </p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  // Vista de listado
  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="px-4 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-navy">Circulares</h1>
        {circulares.length > 0 && (
          <span className="text-xs text-gray-400">{circulares.length} recibidas</span>
        )}
      </div>
      <div className="px-4 py-4">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        ) : circulares.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">No hay circulares disponibles.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {circulares.map((circ) => (
              <button
                key={circ.id_circular}
                onClick={() => setSelectedCircular(circ)}
                className="card p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{circ.titulo}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(circ.fecha_creacion).toLocaleDateString("es-PE")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {circ.contenido.substring(0, 100)}...
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
