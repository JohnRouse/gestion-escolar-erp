import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { LayoutGrid, List } from 'lucide-react';

interface Docente {
  id_persona: number;
  persona: { nombres: string; apellido_paterno: string; apellido_materno: string; dni: string; correo: string | null };
  fecha_ingreso: string | null;
  especialidades: { area: { nombre_area: string } }[];
  _count?: { asignaciones: number };
}

export default function DocentesPage() {
  const { token } = useAuth();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [vista, setVista] = useState<'card' | 'table'>('card');

  useEffect(() => { if (token) fetchDocentes(token); }, [token]);

  const fetchDocentes = async (token: string) => {
    try {
      const res = await axios.get('/api/academicos/docentes', { headers: { Authorization: `Bearer ${token}` } });
      setDocentes(res.data);
    } catch (e) {}
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumb />
      <div className="flex justify-between items-center mb-6">
        <h2 className="section-title">Docentes</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setVista('card')} className={`p-2 rounded ${vista === 'card' ? 'bg-yellow-500/20 text-yellow-500' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setVista('table')} className={`p-2 rounded ${vista === 'table' ? 'bg-yellow-500/20 text-yellow-500' : 'text-slate-400'}`}><List size={18} /></button>
        </div>
      </div>

      {vista === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docentes.map(d => {
            const iniciales = `${d.persona.nombres.charAt(0)}${d.persona.apellido_paterno.charAt(0)}`;
            return (
              <div key={d.id_persona} className="card card-interactive p-5 group">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-lg font-bold text-yellow-500">{iniciales}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{d.persona.nombres} {d.persona.apellido_paterno}</p>
                    <p className="text-xs text-slate-400">{d.persona.dni}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {d.especialidades?.map((esp, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{esp.area.nombre_area}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mb-3">{d._count?.asignaciones ?? 0} secciones asignadas</p>
                <button className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 transition-opacity">Ver perfil</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800"><th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Docente</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">DNI</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Especialidades</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Secciones</th></tr></thead>
            <tbody>
              {docentes.map(d => (
                <tr key={d.id_persona} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-300">{d.persona.nombres} {d.persona.apellido_paterno}</td>
                  <td className="px-4 py-3 text-slate-400">{d.persona.dni}</td>
                  <td className="px-4 py-3">{d.especialidades?.map(e => <span key={e.area.nombre_area} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full mr-1">{e.area.nombre_area}</span>)}</td>
                  <td className="px-4 py-3 text-slate-400">{d._count?.asignaciones ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}