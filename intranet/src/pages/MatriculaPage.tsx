import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Search, UserPlus } from 'lucide-react';

export default function MatriculaPage() {
  const { token } = useAuth();
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const buscarAlumno = async () => {
    if (!dni) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlumno(response.data);
    } catch (err) {
      console.error('Error al buscar alumno:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatricular = async () => {
    // Lógica simplificada: matricular en sección 7 (1° Primaria A)
    try {
      const response = await axios.post(
        '/api/academicos/matriculas',
        { id_estudiante: alumno.estudiantes[0].id_persona, id_seccion: 7, id_anio: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResultado(response.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al matricular');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-6">Gestión de Matrícula</h2>

      <div className="card p-6 mb-4">
        <p className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">
          Buscar alumno por DNI
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="Ingrese DNI del alumno"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button onClick={buscarAlumno} disabled={loading} className="btn btn-primary">
            <Search size={16} className="mr-2" /> Buscar
          </button>
        </div>

        {alumno && (
          <div className="mt-4 p-4 bg-success-light/30 border border-success/30 rounded-2xl">
            <p className="text-sm font-semibold text-text">
              {alumno.nombres} {alumno.apellido_paterno} {alumno.apellido_materno}
            </p>
            <p className="text-xs text-text-secondary">DNI: {alumno.dni}</p>
            <button onClick={handleMatricular} className="btn btn-primary mt-3">
              <UserPlus size={16} className="mr-2" /> Matricular
            </button>
          </div>
        )}

        {resultado && (
          <div className="mt-4 p-4 bg-success-light/30 border border-success/30 rounded-2xl">
            <p className="text-sm font-semibold text-success">¡Matrícula exitosa!</p>
            <p className="text-xs text-text-secondary">Estado: {resultado.estado_matricula}</p>
          </div>
        )}
      </div>
    </div>
  );
}