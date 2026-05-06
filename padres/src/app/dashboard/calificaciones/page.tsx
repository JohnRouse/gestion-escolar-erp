"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

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
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);
  const [alumnoId, setAlumnoId] = useState(2); // Lucas García

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
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

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Título y selector de bimestre */}
      <div className="px-4 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-navy">Calificaciones</h1>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((b) => (
            <button
              key={b}
              onClick={() => setBimestre(b)}
              className={`px-3 py-1 text-xs rounded-full ${
                bimestre === b
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {b}° Bim
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        ) : cursos.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">No hay calificaciones disponibles.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {cursos.map((curso, idx) => (
              <div key={idx} className="card overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-navy">{curso.curso}</h2>
                </div>
                <div className="p-4">
                  {curso.unidades.map((unidad, uIdx) => (
                    <div key={uIdx} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-gray-500">
                          Unidad {unidad.unidad}
                        </p>
                        {unidad.promedioUnidad !== null && (
                          <span className={`badge ${unidad.promedioUnidad >= 11 ? "badge-green" : "badge-red"}`}>
                            {unidad.promedioUnidad.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-1 text-gray-400 font-medium">Evaluación</th>
                              <th className="text-right py-1 text-gray-400 font-medium">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidad.evaluaciones.map((eva, eIdx) => (
                              <tr key={eIdx} className="border-b border-gray-50">
                                <td className="py-1 text-gray-700">{eva.descripcion}</td>
                                <td className={`py-1 text-right font-medium ${eva.valor >= 11 ? "text-green" : "text-red"}`}>
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
  <div className="flex items-center gap-2 mt-2">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
      curso.promedioBimestre >= 11 ? "bg-success" : "bg-danger"
    }`}>
      {curso.promedioBimestre.toFixed(1)}
    </div>
    <span className="text-xs text-text-secondary">Promedio Bimestre</span>
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