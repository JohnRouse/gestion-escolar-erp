import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '../hooks/useCountUp';
import {
  GraduationCap,
  Users,
  Mail,
  Wallet,
  Calendar,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface Kpis {
  matriculados: number;
  docentes: number;
  circulares: number;
  pagosPendientes: number;
}

interface Evento {
  id_evento: number;
  titulo: string;
  fecha: string;
  hora: string | null;
  tipo: string;
  descripcion: string | null;
}

const TIPO_COLORS: Record<string, string> = {
  feriado: 'bg-rose-50 text-rose-600 ring-rose-100',
  examen: 'bg-sky-50 text-sky-600 ring-sky-100',
  reunion: 'bg-violet-50 text-violet-600 ring-violet-100',
  actividad: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
};

const formatNumber = (value: number) => value.toLocaleString('es-PE');

export default function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<Kpis>({
    matriculados: 0,
    docentes: 0,
    circulares: 0,
    pagosPendientes: 0,
  });
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const matriculadosAnim = useCountUp(kpis.matriculados, 600);
  const docentesAnim = useCountUp(kpis.docentes, 600);
  const circularesAnim = useCountUp(kpis.circulares, 600);
  const pagosPendientesAnim = useCountUp(kpis.pagosPendientes, 600);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const hoy = new Date();
    const mes = hoy.getMonth() + 1;

    Promise.all([
      Promise.allSettled([
        axios.get('/api/academicos/matriculas/count?anio_id=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/academicos/docentes/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/circulares/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/tesoreria/pagos/pendientes/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]),
      axios
        .get(`/api/eventos?anio_id=1&mes=${mes}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => ({ data: [] })),
    ])
      .then(([results, eventosRes]) => {
        const [matRes, docRes, circRes, pagosRes] = results;

        setKpis({
          matriculados: matRes.status === 'fulfilled' ? matRes.value.data : 0,
          docentes: docRes.status === 'fulfilled' ? docRes.value.data : 0,
          circulares: circRes.status === 'fulfilled' ? circRes.value.data : 0,
          pagosPendientes: pagosRes.status === 'fulfilled' ? pagosRes.value.data : 0,
        });

        const hoyDate = new Date();
        hoyDate.setHours(0, 0, 0, 0);

        const eventosFuturos = (eventosRes.data || [])
          .filter((e: Evento) => {
            const fechaEvento = new Date(e.fecha);
            fechaEvento.setHours(0, 0, 0, 0);
            return fechaEvento >= hoyDate;
          })
          .slice(0, 5);

        setEventos(eventosFuturos);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const kpiCards = useMemo(
    () => [
      {
        label: 'Matriculados',
        value: matriculadosAnim,
        helper: 'Estudiantes activos',
        icon: GraduationCap,
        color: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
        path: '/matricula',
      },
      {
        label: 'Docentes',
        value: docentesAnim,
        helper: 'Equipo académico',
        icon: Users,
        color: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        path: '/docentes',
      },
      {
        label: 'Circulares',
        value: circularesAnim,
        helper: 'Comunicados enviados',
        icon: Mail,
        color: 'bg-amber-50 text-amber-600 ring-amber-100',
        path: '/circulares',
      },
      {
        label: 'Pagos pend.',
        value: pagosPendientesAnim,
        helper: 'Por regularizar',
        icon: Wallet,
        color: 'bg-rose-50 text-rose-600 ring-rose-100',
        path: '/tesoreria',
      },
    ],
    [matriculadosAnim, docentesAnim, circularesAnim, pagosPendientesAnim]
  );

  const pagosTotales = kpis.matriculados * 10;
  const porcentajePendiente = Math.min(
    100,
    pagosTotales > 0 ? Math.round((kpis.pagosPendientes / pagosTotales) * 100) : 0
  );

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7f8fb] px-4 py-6 sm:px-6 lg:px-8 animate-slide-in-right">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm shadow-slate-200/60 backdrop-blur md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
              <Sparkles size={13} className="text-indigo-500" />
              Resumen administrativo
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Panel principal
            </h1>
            <p className="mt-1 text-sm text-slate-500">
  Bienvenido,{' '}
  <span className="font-semibold text-slate-700">
    {user?.nombre
      ? user.nombre.split(' ').slice(0, 2).join(' ')
      : 'Usuario'}
  </span>
  . Aquí tienes una vista rápida del colegio.
</p>
          </div>

          <button
            onClick={() => navigate('/reportes')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 md:w-auto"
          >
            Ver reportes
            <ArrowUpRight size={16} />
          </button>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="skeleton h-3 w-24 rounded-full" />
                      <div className="skeleton h-8 w-16 rounded-full" />
                      <div className="skeleton h-3 w-32 rounded-full" />
                    </div>
                    <div className="skeleton h-11 w-11 rounded-2xl" />
                  </div>
                </div>
              ))
            : kpiCards.map((kpi) => (
                <button
                  key={kpi.label}
                  onClick={() => navigate(kpi.path)}
                  className="group rounded-[24px] border border-slate-100 bg-white p-5 text-left shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-1 hover:border-slate-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        {kpi.label}
                      </p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 tabular-nums">
                        {formatNumber(kpi.value)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{kpi.helper}</p>
                    </div>

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${kpi.color}`}
                    >
                      <kpi.icon size={20} strokeWidth={2.2} />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-slate-400 transition group-hover:text-slate-700">
                    Abrir módulo
                    <ArrowUpRight size={13} />
                  </div>
                </button>
              ))}
        </section>

        {/* Main widgets */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Próximos eventos */}
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/60 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Próximos eventos</h2>
                  <p className="text-xs text-slate-400">Agenda cercana del mes actual</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/calendario')}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Ver calendario
              </button>
            </div>

            {eventos.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Calendar size={20} />
                </div>
                <p className="text-sm font-bold text-slate-600">No hay eventos próximos</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                  Cuando se registren actividades, reuniones o evaluaciones, aparecerán en esta sección.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {eventos.map((evento) => {
                  const fecha = new Date(evento.fecha + 'T00:00:00');
                  const dia = fecha.getDate();
                  const mes = fecha.toLocaleDateString('es-PE', { month: 'short' });

                  return (
                    <div
                      key={evento.id_evento}
                      className="group flex items-start gap-4 rounded-2xl px-2 py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <span className="text-lg font-black leading-none">{dia}</span>
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                          {mes}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 pt-1">
                        <p className="truncate text-sm font-bold text-slate-800">{evento.titulo}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {evento.hora && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-100">
                              <Clock size={12} />
                              {evento.hora}
                            </span>
                          )}
                          {evento.tipo && (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold capitalize ring-1 ${
                                TIPO_COLORS[evento.tipo] || 'bg-slate-50 text-slate-500 ring-slate-100'
                              }`}
                            >
                              {evento.tipo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado de pagos */}
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/60">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <Wallet size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Estado de pagos</h2>
                  <p className="text-xs text-slate-400">Seguimiento de tesorería</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Pendientes
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 tabular-nums">
                    {formatNumber(kpis.pagosPendientes)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-600 ring-1 ring-rose-100">
                  {porcentajePendiente}%
                </span>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-700"
                  style={{ width: `${porcentajePendiente}%` }}
                />
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                {kpis.matriculados > 0
                  ? `${formatNumber(kpis.pagosPendientes)} pagos pendientes de ${formatNumber(
                      pagosTotales
                    )} cronogramas totales.`
                  : 'Cargando datos de tesorería...'}
              </p>
            </div>

            <button
              onClick={() => navigate('/tesoreria')}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Ir a tesorería
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}