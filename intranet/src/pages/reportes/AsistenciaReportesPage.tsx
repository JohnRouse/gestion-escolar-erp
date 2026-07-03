import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  School,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';

type SeccionOption = {
  id_seccion: number;
  label: string;
  colegio?: string | null;
  nivel?: string | null;
  grado?: string | null;
};

type PorSeccion = {
  id_seccion: number;
  seccion: string;
  colegio?: string | null;
  nivel?: string | null;
  grado?: string | null;
  total_alumnos: number;
  registros: number;
  presentes: number;
  tardanzas: number;
  ausentes: number;
  justificados: number;
  pendientes_justificacion: number;
  porcentaje_asistencia: number;
};

type ArchivoPreview = {
  url: string;
  nombre?: string;
  mime?: string;
};

type ReporteAsistencia = {
  resumen: {
    total_registros: number;
    presentes: number;
    tardanzas: number;
    ausentes: number;
    justificados: number;
    pendientes_justificacion: number;
    porcentaje_asistencia: number;
  };
  por_seccion: PorSeccion[];
  por_docente?: Array<{
    id_docente: number;
    docente: string;
    colegio?: string | null;
    secciones: string[];
    cursos: string[];
    registros: number;
    presentes: number;
    tardanzas: number;
    ausentes: number;
    justificados: number;
    pendientes_justificacion: number;
    porcentaje_asistencia: number;
  }>;
  motivos: Array<{
    motivo: string;
    total: number;
  }>;
  justificaciones: Array<{
    id_asistencia: number;
    fecha: string;
    alumno: string;
    codigo?: string | null;
    seccion?: string | null;
    colegio?: string | null;
    motivo: string;
    observacion: string;
    pendiente: boolean;
    archivo_url?: string;
    archivo_nombre?: string;
    archivo_mime?: string;
  }>;
};

const todayISO = () => new Date().toISOString().split('T')[0];

const firstDayMonthISO = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

function buildUrl(
  path: string,
  queryParams: Record<string, string | number>,
  extra: Record<string, string | number> = {},
) {
  const params = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== '') params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function formatDate(value: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isPdfFile(file?: ArchivoPreview | null) {
  const url = String(file?.url || '').toLowerCase();
  const mime = String(file?.mime || '').toLowerCase();

  return mime.includes('pdf') || url.includes('.pdf');
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: any;
  tone: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[tone] || tones.neutral}`}>
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}

export default function AsistenciaReportesPage() {
  const { token } = useAuth();
  const { queryParams, activeColegio, scopeLabel } = useSchool();

  const [desde, setDesde] = useState(firstDayMonthISO());
  const [hasta, setHasta] = useState(todayISO());
  const [seccionId, setSeccionId] = useState('');
  const [secciones, setSecciones] = useState<SeccionOption[]>([]);
  const [data, setData] = useState<ReporteAsistencia | null>(null);
  const [nivelesAbiertos, setNivelesAbiertos] = useState<Record<string, boolean>>({});
  const [archivoPreview, setArchivoPreview] = useState<ArchivoPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSecciones, setLoadingSecciones] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const scopeKey = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const cargarSecciones = async () => {
    if (!token || !headers) return;

    setLoadingSecciones(true);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia/secciones', queryParams),
        { headers },
      );

      setSecciones(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoadingSecciones(false);
    }
  };

  const cargarReporte = async () => {
    if (!token || !headers) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        buildUrl('/api/academicos/asistencia/reporte-global', queryParams, {
          desde,
          hasta,
          seccion_id: seccionId,
        }),
        { headers },
      );

      setData(res.data);
    } catch {
      setError('No se pudo cargar el reporte global de asistencia.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeKey]);

  useEffect(() => {
    cargarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeKey]);

  const resumen = data?.resumen;

  const seccionesPorNivel = useMemo(() => {
    const map = new Map<string, PorSeccion[]>();

    (data?.por_seccion || []).forEach((item) => {
      const key = item.nivel || 'Sin nivel';
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([nivel, items]) => {
      const registros = items.reduce((sum, item) => sum + item.registros, 0);
      const validos = items.reduce(
        (sum, item) => sum + item.presentes + item.tardanzas + item.justificados,
        0,
      );

      return {
        nivel,
        items,
        registros,
        totalAlumnos: items.reduce((sum, item) => sum + item.total_alumnos, 0),
        porcentaje: registros > 0 ? Math.round((validos / registros) * 100) : 0,
      };
    });
  }, [data]);

  useEffect(() => {
    if (!seccionesPorNivel.length) return;

    setNivelesAbiertos((current) => {
      const next: Record<string, boolean> = {};

      seccionesPorNivel.forEach((grupo, index) => {
        next[grupo.nivel] = current[grupo.nivel] ?? index === 0;
      });

      return next;
    });
  }, [seccionesPorNivel.length]);

  const maxDocentes = Math.max(1, ...(data?.por_docente || []).map((item) => item.registros));
  const maxMotivos = Math.max(1, ...(data?.motivos || []).map((item) => item.total));

  const contextoDocente = activeColegio
    ? `Docentes de ${activeColegio.nombre}`
    : 'Docentes de todos los colegios';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Reportes"
        title="Reporte global de asistencia"
        description={`Consulta asistencias, faltas, tardanzas y justificaciones de ${activeColegio?.nombre || scopeLabel}.`}
        icon={BarChart3}
        meta={[
          { label: 'Desde', value: formatDate(desde) },
          { label: 'Hasta', value: formatDate(hasta) },
          { label: 'Registros', value: String(resumen?.total_registros ?? 0) },
        ]}
      />

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Desde
            </span>
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Hasta
            </span>
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
              Sección
            </span>
            <select
              value={seccionId}
              disabled={loadingSecciones}
              onChange={(event) => setSeccionId(event.target.value)}
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:text-slate-400"
            >
              <option value="">Todas las secciones</option>
              {secciones.map((item) => (
                <option key={item.id_seccion} value={item.id_seccion}>
                  {item.label}{item.colegio ? ` · ${item.colegio}` : ''}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={cargarReporte}
            disabled={loading}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-slate-950 px-5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-300 lg:mt-[22px]"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-slate-700" size={30} />
            <p className="mt-3 text-sm font-black text-slate-500">Cargando reporte...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Presentes"
              value={resumen?.presentes ?? 0}
              helper="Registros con estado presente"
              icon={CheckCircle2}
              tone="emerald"
            />
            <KpiCard
              label="Tardanzas"
              value={resumen?.tardanzas ?? 0}
              helper="Llegadas tarde registradas"
              icon={Clock3}
              tone="amber"
            />
            <KpiCard
              label="Ausencias"
              value={resumen?.ausentes ?? 0}
              helper="Faltas sin asistencia"
              icon={XCircle}
              tone="rose"
            />
            <KpiCard
              label="Justificados"
              value={resumen?.justificados ?? 0}
              helper={`${resumen?.pendientes_justificacion ?? 0} pendiente(s) de regularizar`}
              icon={FileText}
              tone="blue"
            />
          </div>

          <section className="asistencia-panel rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <BarChart3 size={13} />
                  Indicador global
                </div>
                <h2 className="mt-3 text-lg font-black text-slate-950">
                  Distribución general
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Porcentaje de asistencia efectiva sobre los registros encontrados.
                </p>
              </div>

              <div className="rounded-sm border border-slate-200 bg-slate-50 px-5 py-4 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Asistencia efectiva
                </p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {resumen?.porcentaje_asistencia ?? 0}%
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${resumen?.porcentaje_asistencia ?? 0}%` }}
              />
            </div>
          </section>

          <section className="asistencia-panel rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <School size={18} />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-950">Resumen por salón</h2>
                <p className="text-xs font-semibold text-slate-400">
                  Agrupado por nivel para evitar listas extensas.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {seccionesPorNivel.length === 0 ? (
                <p className="rounded-sm border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                  No hay registros para el rango seleccionado.
                </p>
              ) : (
                seccionesPorNivel.map((grupo) => (
                  <div key={grupo.nivel} className="overflow-hidden rounded-sm border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() =>
                        setNivelesAbiertos((current) => ({
                          ...current,
                          [grupo.nivel]: !current[grupo.nivel],
                        }))
                      }
                      className="flex w-full items-center justify-between gap-4 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-950">{grupo.nivel}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {grupo.items.length} sección(es) · {grupo.totalAlumnos} alumno(s) · {grupo.registros} registro(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                          {grupo.porcentaje}%
                        </span>
                        <ChevronDown
                          size={17}
                          className={`text-slate-400 transition-transform ${nivelesAbiertos[grupo.nivel] ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {nivelesAbiertos[grupo.nivel] && (
                      <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
                        {grupo.items.map((item) => (
                          <div key={item.id_seccion} className="rounded-sm border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900">{item.seccion}</p>
                                <p className="text-xs font-semibold text-slate-400">
                                  {item.colegio || 'Colegio'} · {item.total_alumnos} alumno(s)
                                </p>
                              </div>

                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                                {item.porcentaje_asistencia}%
                              </span>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${item.porcentaje_asistencia}%` }}
                              />
                            </div>

                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              {item.registros} registros · {item.ausentes} faltas · {item.tardanzas} tardanzas · {item.justificados} justificadas
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="asistencia-panel grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <UsersRound size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950">Carga de asistencia por docente</h2>
                  <p className="text-xs font-semibold text-slate-400">
                    {contextoDocente}. Se calcula por las secciones asignadas al docente.
                  </p>
                </div>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {(data?.por_docente || []).length === 0 ? (
                  <p className="rounded-sm border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                    No hay docentes con secciones asignadas para este contexto.
                  </p>
                ) : (
                  data!.por_docente!.map((item) => {
                    const width = Math.round((item.registros / maxDocentes) * 100);

                    return (
                      <div key={item.id_docente} className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.docente}</p>
                            <p className="text-xs font-semibold text-slate-400">
                              {item.colegio || 'Colegio'} · {item.secciones.length} sección(es)
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                            {item.porcentaje_asistencia}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {item.registros} registros · {item.ausentes} faltas · {item.tardanzas} tardanzas · {item.justificados} justificadas
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950">Motivos de justificación</h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Frecuencia de motivos registrados.
                  </p>
                </div>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {(data?.motivos || []).length === 0 ? (
                  <p className="rounded-sm border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                    No hay justificaciones registradas.
                  </p>
                ) : (
                  data!.motivos.map((item) => {
                    const width = Math.round((item.total / maxMotivos) * 100);

                    return (
                      <div key={item.motivo}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-black text-slate-800">{item.motivo}</span>
                          <span className="text-xs font-black text-slate-500">{item.total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="asistencia-panel rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                  <FileText size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950">Detalle de justificaciones</h2>
                  <p className="text-xs font-semibold text-slate-400">
                    Motivos, observaciones y documentos de sustento.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Alumno</th>
                    <th className="px-5 py-3">Sección</th>
                    <th className="px-5 py-3">Motivo</th>
                    <th className="px-5 py-3">Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.justificaciones || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm font-bold text-slate-400">
                        No hay justificaciones para mostrar.
                      </td>
                    </tr>
                  ) : (
                    data!.justificaciones.map((item) => (
                      <tr key={item.id_asistencia} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-slate-500">
                          {formatDate(item.fecha)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-900">{item.alumno}</p>
                          <p className="text-xs font-semibold text-slate-400">{item.codigo || 'Sin código'}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {item.seccion || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                            item.pendiente
                              ? 'bg-amber-50 text-amber-700 ring-amber-100'
                              : 'bg-blue-50 text-blue-700 ring-blue-100'
                          }`}>
                            {item.pendiente ? 'Pendiente' : item.motivo}
                          </span>
                          {item.observacion && (
                            <p className="mt-2 max-w-md text-xs font-semibold text-slate-500">
                              {item.observacion}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.archivo_url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setArchivoPreview({
                                  url: item.archivo_url || '',
                                  nombre: item.archivo_nombre || 'Documento de sustento',
                                  mime: item.archivo_mime || '',
                                })
                              }
                              className="inline-flex rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-slate-900"
                            >
                              Ver sustento
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">Sin documento</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {archivoPreview && createPortal((
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Documento de sustento
                </p>
                <h3 className="mt-1 text-base font-black text-slate-950">
                  {archivoPreview.nombre || 'Archivo adjunto'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setArchivoPreview(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-700 hover:border-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-[60vh] overflow-auto bg-slate-100 p-4">
              {isPdfFile(archivoPreview) ? (
                <iframe
                  src={archivoPreview.url}
                  title={archivoPreview.nombre || 'Documento de sustento'}
                  className="h-[72vh] w-full rounded-sm border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={archivoPreview.url}
                  alt={archivoPreview.nombre || 'Documento de sustento'}
                  className="mx-auto max-h-[72vh] max-w-full rounded-sm bg-white object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
