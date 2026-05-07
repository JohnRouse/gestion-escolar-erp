import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Docente {
  id_persona: number;
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    dni: string;
    correo: string | null;
  };
  fecha_ingreso: string | null;
}

export default function DocentesPage() {
  const { token } = useAuth();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchDocentes(token);
  }, [token]);

  const fetchDocentes = async (token: string) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/academicos/docentes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocentes(response.data);
    } catch (err) {
      console.error('Error al cargar docentes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Docentes</h2>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]">
          + Nuevo docente
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-32 animate-pulse" />
          ))}
        </div>
      ) : docentes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-semibold">No hay docentes registrados</p>
          <p className="text-sm mt-2">Utiliza el botón "Nuevo docente" para agregar uno.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docentes.map((docente) => (
            <div key={docente.id_persona} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-700">
                  {docente.persona.nombres.charAt(0)}{docente.persona.apellido_paterno.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {docente.persona.nombres} {docente.persona.apellido_paterno}
                  </p>
                  <p className="text-xs text-gray-500">{docente.persona.dni}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {docente.persona.correo && <p>📧 {docente.persona.correo}</p>}
                {docente.fecha_ingreso && (
                  <p>📅 Ingreso: {new Date(docente.fecha_ingreso).toLocaleDateString('es-PE')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}