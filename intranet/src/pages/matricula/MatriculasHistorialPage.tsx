import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import PageHeader from '../../components/PageHeader';

interface MatriculaItem {
  id_matricula: number;
  fecha_matricula: string;
  estado_matricula: string;
  colegio?: { nombre: string };
  anio?: { nombre_anio: string };
  registrado_por?: {
    username: string;
    persona?: {
      nombres: string;
      apellido_paterno: string;
    };
  } | null;
  estudiante: {
    persona: {
      dni: string;
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    };
    apoderados?: {
      parentesco: string;
      apoderado: {
        persona: {
          dni: string;
          nombres: string;
          apellido_paterno: string;
          telefono?: string | null;
        };
      };
    }[];
  };
  seccion: {
    letra: string;
    grado: {
      nombre_grado: string;
      nivel?: { nombre_nivel: string };
    };
  };
}

const formatFechaHora = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function MatriculasHistorialPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const navigate = useNavigate();

  const [data, setData] = useState<MatriculaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [registradoPor, setRegistradoPor] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));

    if (q.trim()) search.set('q', q.trim());
    if (desde) search.set('desde', desde);
    if (hasta) search.set('hasta', hasta);
    if (registradoPor.trim()) search.set('registrado_por', registradoPor.trim());
    if (estado !== 'Todos') search.set('estado', estado);
    search.set('page', String(page));
    search.set('limit', '10');

    const query = search.toString();
    return query ? `?${query}` : '';
  }, [desde, estado, hasta, page, q, queryString, registradoPor]);

  useEffect(() => {
    fetchMatriculas();
  }, [params, token]);

  const fetchMatriculas = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await axios.get(`/api/academicos/matriculas/buscar${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setQ('');
    setDesde('');
    setHasta('');
    setRegistradoPor('');
    setEstado('Todos');
    setPage(1);
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Gestión académica"
        title="Historial de matrículas"
        description="Consulta pre-matrículas y matrículas por alumno, apoderado, DNI, número de matrícula, fecha o usuario registrador."
        icon={Users}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
      />

      <div className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) => {
                setPage(1);
                setQ(event.target.value);
              }}
              placeholder="Alumno, apoderado, DNI o N° matrícula"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
            />
          </div>

          <input
            type="date"
            value={desde}
            onChange={(event) => {
              setPage(1);
              setDesde(event.target.value);
            }}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />

          <input
            type="date"
            value={hasta}
            onChange={(event) => {
              setPage(1);
              setHasta(event.target.value);
            }}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />

          <input
            value={registradoPor}
            onChange={(event) => {
              setPage(1);
              setRegistradoPor(event.target.value);
            }}
            placeholder="Registrado por"
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />

          <select
            value={estado}
            onChange={(event) => {
              setPage(1);
              setEstado(event.target.value);
            }}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          >
            <option value="Todos">Todos</option>
            <option value="Pre-matriculado">Pre-matriculado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <button
            type="button"
            onClick={() => navigate('/matricula')}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <div className="text-sm font-bold text-slate-400">
            Página {meta.page} de {meta.totalPages || 1}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center">
            <Loader2 size={26} className="animate-spin text-accent-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
            <CalendarDays size={34} className="text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600">Sin resultados</p>
            <p className="mt-1 text-sm text-slate-400">Ajusta los filtros para buscar otra matrícula.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((matricula) => {
              const alumno = matricula.estudiante.persona;
              const apoderado = matricula.estudiante.apoderados?.[0];
              const registrador = matricula.registrado_por?.persona
                ? `${matricula.registrado_por.persona.nombres} ${matricula.registrado_por.persona.apellido_paterno}`
                : 'No registrado';

              return (
                <div key={matricula.id_matricula} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      #{matricula.id_matricula} · {alumno.nombres} {alumno.apellido_paterno} {alumno.apellido_materno}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">DNI alumno: {alumno.dni}</p>
                    {apoderado && (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Apoderado: {apoderado.apoderado.persona.nombres} {apoderado.apoderado.persona.apellido_paterno} · DNI {apoderado.apoderado.persona.dni}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-700">
                      {matricula.colegio?.nombre || 'Colegio'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {matricula.seccion.grado.nivel?.nombre_nivel} · {matricula.seccion.grado.nombre_grado} "{matricula.seccion.letra}"
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-700">{formatFechaHora(matricula.fecha_matricula)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">Registrado por: {registrador}</p>
                    <span className="mt-2 inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                      {matricula.estado_matricula}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/matricula?detalle=${matricula.id_matricula}`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <p className="text-sm font-bold text-slate-400">
            {meta.total} registros
          </p>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
            disabled={page >= (meta.totalPages || 1)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
