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
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import PageHeader from '../../components/PageHeader';

interface CodigoColegio {
  id_estudiante: number;
  id_colegio: number;
  codigo: string;
}

interface MatriculaItem {
  id_matricula: number;
  fecha_matricula: string;
  estado_matricula: string;
  id_colegio?: number | null;
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
    codigo_estudiante?: string;
    codigos_colegio?: CodigoColegio[];
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

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const Label = ({ children }: { children: string }) => (
  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
    {children}
  </span>
);

const DetailBox = ({
  label,
  value,
  white = false,
}: {
  label: string;
  value: string;
  white?: boolean;
}) => (
  <div
    className={`rounded-2xl p-4 ring-1 ring-slate-100 ${
      white ? 'bg-white' : 'bg-slate-50'
    }`}
  >
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
  </div>
);

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

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleMatricula, setDetalleMatricula] = useState<any | null>(null);
  const [cronogramaOpen, setCronogramaOpen] = useState(false);

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

  const getCodigoAlumno = (matricula: MatriculaItem) => {
    const codigoColegio = matricula.estudiante.codigos_colegio?.find(
      (item) => item.id_colegio === matricula.id_colegio,
    );

    return codigoColegio?.codigo || matricula.estudiante.codigo_estudiante || 'Sin código';
  };

  const abrirDetalleMatricula = async (idMatricula: number) => {
    if (!token) return;

    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleMatricula(null);
    setCronogramaOpen(false);

    try {
      const res = await axios.get(
        `/api/academicos/matriculas/${idMatricula}/detalle${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setDetalleMatricula(res.data);
    } catch {
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
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
                      {getCodigoAlumno(matricula)} · {alumno.nombres} {alumno.apellido_paterno} {alumno.apellido_materno}
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
                    onClick={() => abrirDetalleMatricula(matricula.id_matricula)}
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

      {/* Modal de detalle de matrícula (reutilizado de MatriculaPage) */}
      {detalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600 ring-1 ring-accent-100">
                  Detalle de matrícula
                </div>

                <h3 className="mt-3 text-xl font-black text-slate-950">
                  {detalleMatricula?.estudiante?.persona
                    ? `${detalleMatricula.estudiante.persona.nombres} ${detalleMatricula.estudiante.persona.apellido_paterno}`
                    : 'Cargando matrícula'}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Información académica, apoderados y cronograma generado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetalleOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-6">
              {detalleLoading ? (
                <div className="flex min-h-[260px] items-center justify-center text-sm font-bold text-slate-500">
                  Cargando detalle...
                </div>
              ) : detalleMatricula ? (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <DetailBox
                      label="Estado"
                      value={detalleMatricula.estado_matricula}
                    />
                    <DetailBox
                      label="Fecha"
                      value={formatFechaHora(detalleMatricula.fecha_matricula)}
                    />
                    <DetailBox
                      label="Registrado por"
                      value={
                        detalleMatricula.registrado_por?.persona
                          ? `${detalleMatricula.registrado_por.persona.nombres} ${detalleMatricula.registrado_por.persona.apellido_paterno}`
                          : 'No registrado'
                      }
                    />
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Datos académicos
                    </h4>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailBox
                        label="Colegio"
                        value={detalleMatricula.colegio?.nombre || '—'}
                        white
                      />
                      <DetailBox
                        label="Nivel"
                        value={
                          detalleMatricula.seccion?.grado?.nivel
                            ?.nombre_nivel || '—'
                        }
                        white
                      />
                      <DetailBox
                        label="Grado"
                        value={
                          detalleMatricula.seccion?.grado?.nombre_grado || '—'
                        }
                        white
                      />
                      <DetailBox
                        label="Sección"
                        value={detalleMatricula.seccion?.letra || '—'}
                        white
                      />
                      <DetailBox
                        label="Año lectivo"
                        value={detalleMatricula.anio?.nombre_anio || '—'}
                        white
                      />
                      <DetailBox
                        label="Aula"
                        value={detalleMatricula.seccion?.aula?.nombre_aula || '—'}
                        white
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Apoderados
                    </h4>

                    <div className="mt-3 space-y-3">
                      {detalleMatricula.estudiante?.apoderados?.length ? (
                        detalleMatricula.estudiante.apoderados.map(
                          (relacion: any) => (
                            <div
                              key={relacion.id_apoderado}
                              className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                            >
                              <p className="text-sm font-black text-slate-800">
                                {relacion.parentesco}:{' '}
                                {relacion.apoderado.persona.nombres}{' '}
                                {relacion.apoderado.persona.apellido_paterno}
                              </p>

                              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-2">
                                <p>
                                  <span className="text-slate-400">DNI:</span>{' '}
                                  {relacion.apoderado.persona.dni || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Número:
                                  </span>{' '}
                                  {relacion.apoderado.persona.telefono || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Correo:
                                  </span>{' '}
                                  {relacion.apoderado.persona.correo || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Distrito:
                                  </span>{' '}
                                  {relacion.apoderado.persona.distrito || '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Departamento:
                                  </span>{' '}
                                  {relacion.apoderado.persona.departamento ||
                                    '—'}
                                </p>
                                <p>
                                  <span className="text-slate-400">
                                    Dirección:
                                  </span>{' '}
                                  {relacion.apoderado.persona.direccion || '—'}
                                </p>
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <p className="text-sm font-bold text-slate-400">
                          Sin apoderados vinculados.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <h4 className="text-sm font-black text-slate-900">
                      Resumen financiero
                    </h4>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <DetailBox
                        label="Pago matrícula"
                        value={
                          detalleMatricula.resumen_financiero
                            ?.estado_pago_matricula || 'No generado'
                        }
                        white
                      />
                      <DetailBox
                        label="Programado"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero
                            ?.total_programado,
                        )}
                        white
                      />
                      <DetailBox
                        label="Pagado"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero?.total_pagado,
                        )}
                        white
                      />
                      <DetailBox
                        label="Saldo"
                        value={formatMoney(
                          detalleMatricula.resumen_financiero?.saldo,
                        )}
                        white
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                    <button
                      type="button"
                      onClick={() => setCronogramaOpen(!cronogramaOpen)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          Cronograma de pagos
                        </h4>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {detalleMatricula.cronogramas?.length || 0} conceptos
                          generados
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                        {cronogramaOpen ? 'Ocultar' : 'Ver detalle'}
                      </span>
                    </button>

                    {cronogramaOpen && (
                      <div className="mt-4 space-y-2">
                        {detalleMatricula.cronogramas?.length ? (
                          detalleMatricula.cronogramas.map((item: any) => (
                            <div
                              key={item.id_cronograma}
                              className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-800">
                                  {item.concepto.nombre_concepto}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Vencimiento:{' '}
                                  {new Date(
                                    item.fecha_vencimiento,
                                  ).toLocaleDateString('es-PE')}{' '}
                                  · Monto:{' '}
                                  {formatMoney(item.concepto.monto_base)}
                                </p>
                              </div>

                              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                                {item.estado_pago}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm font-bold text-slate-400">
                            No hay conceptos generados.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}