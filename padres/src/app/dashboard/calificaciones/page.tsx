"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { LogOut } from "lucide-react";

interface Evaluacion {
  tipo: string;
  descripcion: string;
  valor: number;
}

interface Unidad {
  unidad: number;
  evaluaciones: Evaluacion[];
  promedioUnidad: number | null;
}

interface Curso {
  curso: string;
  unidades: Unidad[];
  promedioBimestre: number | null;
}

export default function CalificacionesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);
  const [alumnoId] = useState(2);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchNotas(token, alumnoId, bimestre);
  }, [router, alumnoId, bimestre]);

  const fetchNotas = async (token: string, alumnoId: number, bimestreId: number) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/calificaciones/padres/notas?alumno_id=${alumnoId}&bimestre_id=${bimestreId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCursos(response.data);
    } catch (err) {
      console.error("Error al cargar calificaciones:", err);
      setCursos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user?.nombre?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user?.nombre}</p>
            <p className="text-[10px] text-text-secondary">Calificaciones</p>
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

      {/* Selector de bimestre */}
      <div className="px-4 py-3 bg-white border-b border-border">
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => setBimestre(b)}
              className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                bimestre === b
                  ? "bg-primary text-white shadow-md"
                  : "bg-surface-secondary text-text-secondary hover:bg-gray-200"
              }`}
            >
              {b}° Bimestre
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="card h-40 bg-gray-200" />
            ))}
          </div>
        ) : cursos.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-secondary">No hay calificaciones para este bimestre.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cursos.map((curso, idx) => (
              <div key={idx} className="card overflow-hidden">
                <div className="bg-surface-secondary px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text">{curso.curso}</h2>
                </div>
                <div className="p-5">
                  {curso.unidades.map((unidad, uIdx) => (
                    <div key={uIdx} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                          Unidad {unidad.unidad}
                        </p>
                        {unidad.promedioUnidad !== null && (
                          <span
                            className={`badge text-xs font-bold ${
                              unidad.promedioUnidad >= 11 ? "badge-success" : "badge-danger"
                            }`}
                          >
                            {unidad.promedioUnidad.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 text-text-secondary font-medium">Evaluación</th>
                              <th className="text-right py-2 text-text-secondary font-medium">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidad.evaluaciones.map((eva, eIdx) => (
                              <tr key={eIdx} className="border-b border-border/50 last:border-0">
                                <td className="py-2 text-text">{eva.descripcion}</td>
                                <td
                                  className={`py-2 text-right font-semibold ${
                                    eva.valor >= 11 ? "text-success" : "text-danger"
                                  }`}
                                >
                                  {eva.valor}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {curso.promedioBimestre !== null && (
                    <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          curso.promedioBimestre >= 11 ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {curso.promedioBimestre.toFixed(1)}
                      </div>
                      <span className="text-sm font-medium text-text">Promedio Bimestre</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}