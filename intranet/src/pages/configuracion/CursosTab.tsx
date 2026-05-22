import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Area {
  id_area: number;
  nombre_area: string;
}

interface Curso {
  id_curso: number;
  nombre_curso: string;
  area: { nombre_area: string };
}

export default function CursosTab() {
  const { token } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar áreas y cursos
  useEffect(() => {
    if (!token) return;
    Promise.all([
      axios.get('/api/academicos/areas', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/academicos/cursos', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([areasRes, cursosRes]) => {
        setAreas(areasRes.data);
        setCursos(cursosRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Acciones (simplificadas)
  const crearArea = async () => {
    const nombre = prompt('Nombre de la nueva área:');
    if (!nombre) return;
    await axios.post('/api/academicos/areas', { nombre_area: nombre }, { headers: { Authorization: `Bearer ${token}` } });
    const res = await axios.get('/api/academicos/areas', { headers: { Authorization: `Bearer ${token}` } });
    setAreas(res.data);
  };

  const crearCurso = async (idArea: number) => {
    const nombre = prompt('Nombre del nuevo curso:');
    if (!nombre) return;
    await axios.post('/api/academicos/cursos', { nombre_curso: nombre, id_area: idArea }, { headers: { Authorization: `Bearer ${token}` } });
    const res = await axios.get('/api/academicos/cursos', { headers: { Authorization: `Bearer ${token}` } });
    setCursos(res.data);
  };

  if (loading) return <div className="skeleton h-40 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Áreas Curriculares y Cursos</h3>
        <button onClick={crearArea} className="btn btn-primary btn-sm">
          <Plus size={16} /> Nueva Área
        </button>
      </div>

      {areas.map(area => {
        const cursosDelArea = cursos.filter(c => c.area?.nombre_area === area.nombre_area);
        return (
          <div key={area.id_area} className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">{area.nombre_area}</h4>
              <button
                onClick={() => crearCurso(area.id_area)}
                className="text-sm text-brand-600 hover:underline"
              >
                + Agregar curso
              </button>
            </div>
            {cursosDelArea.length > 0 ? (
              <div className="space-y-2">
                {cursosDelArea.map(curso => (
                  <div key={curso.id_curso} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{curso.nombre_curso}</span>
                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><Pencil size={14} /></button>
                      <button className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin cursos en esta área</p>
            )}
          </div>
        );
      })}
    </div>
  );
}