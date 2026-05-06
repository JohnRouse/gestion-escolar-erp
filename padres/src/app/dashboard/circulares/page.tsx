"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, LogOut, Megaphone } from "lucide-react";

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
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [circulares, setCirculares] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Detalle de circular
  if (selectedCircular) {
    return (
      <main className="min-h-screen bg-slate-100 pb-20">
        <header className="bg-white border-b border-border px-5 py-3 flex items-center gap-3">
          <button onClick={() => setSelectedCircular(null)} className="p-1 -ml-1">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <h1 className="text-sm font-semibold text-text">Detalle circular</h1>
          <button
            onClick={handleLogout}
            className="text-text-muted hover:text-danger transition-colors p-2 ml-auto"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </header>
        <div className="px-4 py-4">
          <div className="card p-5">
            <h2 className="text-base font-bold text-text mb-2">{selectedCircular.titulo}</h2>
            <p className="text-xs text-text-muted mb-4">
              {new Date(selectedCircular.fecha_creacion).toLocaleDateString("es-PE")} ·{" "}
              {selectedCircular.remitente.persona.nombres}{" "}
              {selectedCircular.remitente.persona.apellido_paterno}
            </p>
            <p className="text-sm text-text leading-relaxed whitespace-pre-line">
              {selectedCircular.contenido}
            </p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  // Listado
  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user?.nombre?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user?.nombre}</p>
            <p className="text-[10px] text-text-secondary">Circulares</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-danger transition-colors p-2"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-24 bg-gray-200" />
            ))}
          </div>
        ) : circulares.length === 0 ? (
          <div className="card p-8 text-center">
            <Megaphone size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No hay circulares disponibles.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {circulares.map((circ) => (
              <button
                key={circ.id_circular}
                onClick={() => setSelectedCircular(circ)}
                className="card p-4 w-full text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text">{circ.titulo}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(circ.fecha_creacion).toLocaleDateString("es-PE")}
                    </p>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
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