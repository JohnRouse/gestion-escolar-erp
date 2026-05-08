import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { Search, UserPlus, ChevronRight, Clock } from 'lucide-react';

interface AlumnoEncontrado {
  id_persona: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  estudiantes: {
    id_persona: number;
    codigo_estudiante: string;
    matriculas: { id_matricula: number; estado_matricula: string; seccion: { letra: string; grado: { nombre_grado: string } } }[];
  }[];
  apoderados?: { id_apoderado: number; parentesco: string; persona: { nombres: string; apellido_paterno: string } }[];
}

interface UltimaMatricula {
  id_matricula: number;
  fecha_matricula: string;
  estudiante: { persona: { nombres: string; apellido_paterno: string } };
  seccion: { letra: string; grado: { nombre_grado: string } };
}

export default function MatriculaPage() {
  const { token } = useAuth();
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState<AlumnoEncontrado | null>(null);
  const [ultimas, setUltimas] = useState<UltimaMatricula[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [matriculando, setMatriculando] = useState(false);
  const [resultadoMatricula, setResultadoMatricula] = useState<string | null>(null);

  useEffect(() => { if (token) fetchUltimas(token); }, [token]);

  const fetchUltimas = async (token: string) => {
    try {
      const res = await axios.get('/api/academicos/matriculas/ultimas', { headers: { Authorization: `Bearer ${token}` } });
      setUltimas(res.data);
    } catch (e) {}
  };

  const buscarAlumno = async () => {
    if (!dni || !token) return;
    setBuscando(true);
    try {
      const res = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni}`, { headers: { Authorization: `Bearer ${token}` } });
      setAlumno(res.data);
    } catch { setAlumno(null); } finally { setBuscando(false); }
  };

  const matricular = async (idEstudiante: number, idSeccion: number, idAnio: number) => {
    if (!token) return;
    setMatriculando(true);
    setResultadoMatricula(null);
    try {
      const res = await axios.post('/api/academicos/matriculas', { id_estudiante: idEstudiante, id_seccion: idSeccion, id_anio: idAnio }, { headers: { Authorization: `Bearer ${token}` } });
      setResultadoMatricula('¡Matrícula exitosa!');
      fetchUltimas(token);
    } catch (err: any) {
      setResultadoMatricula(err.response?.data?.message || 'Error al matricular');
    } finally { setMatriculando(false); }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <h2 className="section-title mb-6">Gestión de Matrícula</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Buscador + Últimas matrículas */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><Search size={16} className="text-yellow-500" /> Buscar alumno</h3>
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" placeholder="DNI del alumno" value={dni} onChange={(e) => setDni(e.target.value)} />
              <button className="btn btn-primary" onClick={buscarAlumno} disabled={buscando}>Buscar</button>
            </div>
            <button className="btn btn-secondary w-full text-xs"><UserPlus size={14} /> + Nuevo Alumno</button>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Últimas matrículas hoy</h3>
            {ultimas.length === 0 ? <p className="text-xs text-slate-500">Sin matrículas hoy</p> : (
              <ul className="space-y-2">
                {ultimas.map((m) => (
                  <li key={m.id_matricula} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-300">{m.estudiante.persona.nombres} {m.estudiante.persona.apellido_paterno}</span>
                    <span className="text-slate-500">{m.seccion.grado.nombre_grado} {m.seccion.letra}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel derecho: Ficha del alumno */}
        <div className="lg:col-span-2">
          {buscando ? <div className="card p-8 text-center text-slate-400">Buscando...</div> : alumno ? (
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-lg font-bold text-yellow-500">
                  {alumno.nombres.charAt(0)}{alumno.apellido_paterno.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{alumno.nombres} {alumno.apellido_paterno}</h3>
                  <p className="text-xs text-slate-400">DNI: {alumno.dni}</p>
                </div>
                {alumno.estudiantes?.[0]?.matriculas?.length > 0 && (
                  <span className={`badge ml-auto ${alumno.estudiantes[0].matriculas[0].estado_matricula === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                    {alumno.estudiantes[0].matriculas[0].estado_matricula}
                  </span>
                )}
              </div>
              {alumno.estudiantes?.[0] && (
                <button onClick={() => matricular(alumno.estudiantes[0].id_persona, 7, 1)} disabled={matriculando} className="btn btn-primary w-full">
                  {matriculando ? 'Matriculando...' : 'Matricular en 1° Primaria A'}
                </button>
              )}
              {resultadoMatricula && <p className="mt-2 text-xs text-slate-400">{resultadoMatricula}</p>}
            </div>
          ) : (
            <div className="card p-8 text-center text-slate-500">Busca un alumno por DNI para ver su ficha.</div>
          )}
        </div>
      </div>
    </div>
  );
}