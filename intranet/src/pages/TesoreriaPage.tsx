import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import PageHeader from '../components/PageHeader';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Search,
  Wallet,
  X,
} from 'lucide-react';

interface KpiTesoreria {
  recaudadoHoy: number;
  vencidosDelMes: number;
  proximos48h: number;
  pagosPendientes?: number;
}

interface Deuda {
  id_cronograma: number;
  concepto: string;
  fecha_vencimiento: string;
  monto_base: number | string;
  monto_base_original?: number | string;
  descuento_aplicado?: number | string;
  monto_programado?: number | string;
  estado_publicacion?: string;
  visible_apoderado?: boolean;
  total_pagado?: number;
  saldo?: number;
  estado: string;
}

interface EstadoCuenta {
  id_matricula: number;
  id_colegio?: number | null;
  colegio?: string | null;
  alumno?: string | null;
  estado_matricula: string;
  deudas: Deuda[];
  total_pendiente: number;
}

const currency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const estadoStyles: Record<string, string> = {
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-100',
  Vencido: 'bg-rose-50 text-rose-700 ring-rose-100',
  Pagado: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: any;
  tone: string;
}) {
  return (
    <div className="min-h-[128px] rounded-[28px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 tabular-nums">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function TesoreriaPage() {
  const { token } = useAuth();
  const { activeScope, activeColegio, scopeLabel, queryString } = useSchool();

  const [dni, setDni] = useState('');
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [kpi, setKpi] = useState<KpiTesoreria>({
    recaudadoHoy: 0,
    vencidosDelMes: 0,
    proximos48h: 0,
    pagosPendientes: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Deuda | null>(null);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [nroOperacion, setNroOperacion] = useState('');
  const [montoPago, setMontoPago] = useState('');

  const deudasPorEstado = useMemo(() => {
    const grupos: Record<string, Deuda[]> = { Vencido: [], Pendiente: [], Pagado: [] };
    (estado?.deudas || []).forEach((deuda) => {
      const key = deuda.estado === 'Pagado' ? 'Pagado' : deuda.estado === 'Vencido' ? 'Vencido' : 'Pendiente';
      grupos[key].push(deuda);
    });
    return grupos;
  }, [estado]);

  const fetchKpis = async () => {
    if (!token) return;
    setLoadingKpis(true);
    try {
      const res = await axios.get(`/api/tesoreria/kpis${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKpi(res.data);
    } catch (err) {
      console.warn('Error al cargar KPIs de tesorería:', err);
    } finally {
      setLoadingKpis(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    setEstado(null);
  }, [token, queryString]);

  const buscar = async () => {
    if (!dni.trim() || !token) return;
    setBuscando(true);
    try {
      const alumnoRes = await axios.get(`/api/academicos/alumnos/buscar?dni=${dni.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const matriculas = alumnoRes.data.estudiantes?.[0]?.matriculas || [];

      const matriculasFiltradas = matriculas
        .filter((m: any) => {
          if (activeScope.tipo === 'colegio') return m.id_colegio === activeScope.id_colegio;
          return true;
        })
        .sort((a: any, b: any) => {
          const getYear = (m: any) => {
            const fromName = String(m.anio?.nombre_anio || '').match(/\d{4}/)?.[0];
            if (fromName) return Number(fromName);
            if (m.anio?.fecha_inicio) return new Date(m.anio.fecha_inicio).getFullYear();
            return 0;
          };

          const prioridad: Record<string, number> = {
            Activo: 5,
            'Pre-matriculado': 4,
            Reserva: 3,
            Pendiente: 2,
          };

          return (
            (prioridad[b.estado_matricula] || 0) - (prioridad[a.estado_matricula] || 0) ||
            getYear(b) - getYear(a) ||
            Number(b.id_matricula || 0) - Number(a.id_matricula || 0)
          );
        });

      const matriculaSeleccionada = matriculasFiltradas[0];

      if (!matriculaSeleccionada) {
        alert(
          activeScope.tipo === 'colegio'
            ? `No se encontró matrícula para ${activeColegio?.nombre || 'este colegio'}.`
            : 'No se encontraron matrículas para este alumno.',
        );
        setEstado(null);
        return;
      }

      const res = await axios.get(
        `/api/tesoreria/estado-cuenta/${matriculaSeleccionada.id_matricula}${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEstado(res.data);
      fetchKpis();
    } catch (e) {
      alert('No se pudo consultar el estado de cuenta.');
    } finally {
      setBuscando(false);
    }
  };

  const registrarPago = async () => {
    if (!token || !pagoSeleccionado || !estado) return;
    try {
      await axios.post(
        `/api/tesoreria/pagos${queryString}`,
        {
          id_matricula: estado.id_matricula,
          id_apoderado: 4,
          metodo_pago: metodoPago,
          nro_operacion: nroOperacion || undefined,
          pagos: [
            {
              id_cronograma: pagoSeleccionado.id_cronograma,
              monto_pagado: montoPago ? Number(montoPago) : Number(pagoSeleccionado.saldo || pagoSeleccionado.monto_base),
            },
          ],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setShowModal(false);
      setPagoSeleccionado(null);
      setMontoPago('');
      buscar();
      fetchKpis();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al registrar el pago');
    }
  };

  return (
    <div className="carbon-tesoreria-page w-full space-y-6">
      <PageHeader
        eyebrow="Gestión de tesorería"
        title="Tesorería"
        description={`Consulta pagos, registra abonos y revisa el estado financiero de ${scopeLabel.toLowerCase()}.`}
        icon={Wallet}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Vista', value: activeScope.tipo === 'todos' ? 'Consolidada' : 'Por colegio' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href="/tesoreria/configuracion"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-accent-600"
            >
              Config. pensiones
              <ArrowUpRight size={16} />
            </a>
            <a
              href="/tesoreria/pagos-extraordinarios"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Pago extraordinario
              <ArrowUpRight size={16} />
            </a>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Recaudado hoy"
          value={currency(kpi.recaudadoHoy)}
          helper={loadingKpis ? 'Actualizando...' : 'Ingresos registrados'}
          icon={Banknote}
          tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiCard
          label="Vencidos"
          value={currency(kpi.vencidosDelMes)}
          helper="Saldo vencido acumulado"
          icon={AlertTriangle}
          tone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiCard
          label="Próximos 48h"
          value={String(kpi.proximos48h || 0)}
          helper="Cronogramas por vencer"
          icon={Clock}
          tone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <KpiCard
          label="Pendientes"
          value={String(kpi.pagosPendientes || 0)}
          helper="Cronogramas sin pagar"
          icon={CreditCard}
          tone="bg-blue-50 text-blue-600 ring-blue-100"
        />
      </section>

      <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Buscar estado de cuenta</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ingresa el DNI del estudiante. La búsqueda respetará el colegio activo.
            </p>
          </div>
          <div className="flex w-full gap-2 lg:w-[420px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                placeholder="DNI del alumno"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
            </div>
            <button
              type="button"
              onClick={buscar}
              disabled={buscando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-bold text-white shadow-lg shadow-accent-500/20 transition hover:-translate-y-0.5 hover:bg-accent-600 disabled:opacity-60"
            >
              {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>
        </div>

        {estado ? (
          <div className="space-y-5">
            <div className="rounded-[26px] bg-slate-50 p-5 ring-1 ring-slate-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Alumno</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{estado.alumno || 'Estudiante'}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{estado.colegio || scopeLabel}</p>
                </div>
                <div className="rounded-3xl bg-white px-5 py-4 text-right ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Total pendiente</p>
                  <p className="mt-1 text-2xl font-black text-rose-600">{currency(estado.total_pendiente)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {['Vencido', 'Pendiente', 'Pagado'].map((est) => (
                <div key={est} className="rounded-[26px] bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoStyles[est]}`}>
                      {est}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{deudasPorEstado[est]?.length || 0}</span>
                  </div>

                  <div className="space-y-2">
                    {(deudasPorEstado[est] || []).length === 0 ? (
                      <p className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-400 ring-1 ring-slate-100">
                        Sin registros.
                      </p>
                    ) : (
                      deudasPorEstado[est].map((deuda) => (
                        <div key={deuda.id_cronograma} className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-800">{deuda.concepto}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                Vence: {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-PE')}
                              </p>
                              {deuda.estado_publicacion && (
                                <p className="mt-1 text-[11px] font-bold text-slate-400">
                                  Publicación: {deuda.estado_publicacion}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-950">
                                {currency(deuda.saldo ?? deuda.monto_programado ?? deuda.monto_base)}
                              </p>
                              {Number(deuda.descuento_aplicado || 0) > 0 && (
                                <p className="text-[11px] font-black text-emerald-600">
                                  Desc. {currency(deuda.descuento_aplicado)}
                                </p>
                              )}
                            </div>
                          </div>
                          {est !== 'Pagado' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagoSeleccionado(deuda);
                                setMontoPago(String(deuda.saldo ?? deuda.monto_programado ?? deuda.monto_base));
                                setShowModal(true);
                              }}
                              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-slate-800"
                            >
                              Registrar pago
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[180px] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm text-slate-400">
            Busca un alumno para visualizar sus cronogramas de pago.
          </div>
        )}
      </section>

      {showModal && pagoSeleccionado && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <CheckCircle2 size={13} />
                  Registrar pago
                </div>
                <h3 className="mt-3 text-xl font-black text-slate-950">{pagoSeleccionado.concepto}</h3>
                <p className="mt-1 text-sm text-slate-500">Saldo: {currency(pagoSeleccionado.saldo ?? pagoSeleccionado.monto_base)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Monto a pagar</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Método</span>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Yape/Plin</option>
                  <option>Tarjeta</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">N° operación</span>
                <input
                  value={nroOperacion}
                  onChange={(e) => setNroOperacion(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={registrarPago}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-accent-500 px-5 text-sm font-bold text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-600"
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}