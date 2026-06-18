import { useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Coins,
  Loader2,
  Megaphone,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type AnioLectivo = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  estado: string;
};

type PlanPensiones = {
  id_plan_pension: number;
  nombre: string;
  monto_mensual: number | string;
  estado: string;
  colegio?: { nombre: string; nombre_corto?: string | null };
  anio?: { nombre_anio: string };
  detalles?: {
    id_plan_detalle: number;
    nombre_mes: string;
    fecha_publicacion: string;
    fecha_vencimiento: string;
    estado: string;
  }[];
};

type CampanaDescuento = {
  id_campana_descuento: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_concepto_aplica?: string | null;
  monto_promocional?: number | string | null;
  descuento_monto?: number | string | null;
  descuento_porcentaje?: number | string | null;
  estado: string;
  colegio?: { nombre: string; nombre_corto?: string | null };
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-bold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 hover:bg-white focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100';

const labelClass =
  'mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const currency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const meses = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

function estadoClass(estado?: string) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('activo') || value.includes('publicado')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }
  if (value.includes('programado') || value.includes('plan')) {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }
  if (value.includes('cerrado') || value.includes('inactivo')) {
    return 'bg-slate-100 text-slate-500 ring-slate-200';
  }
  return 'bg-blue-50 text-blue-700 ring-blue-100';
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="group rounded-[26px] border border-white bg-white/90 p-4 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Paso {step}</p>
      <h3 className="mt-1 text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({ label, value, helper, icon: Icon }: { label: string; value: string | number; helper: string; icon: any }) {
  return (
    <div className="rounded-[26px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, description, icon: Icon, children }: { title: string; description: string; icon: any; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white bg-white/95 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
      {text}
    </p>
  );
}

export default function TesoreriaConfiguracionPage() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, scopeLabel, queryString } = useSchool();
  const { showToast } = useToast();

  const colegioDefault =
    activeScope?.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : colegios[0]?.id_colegio || '';

  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [planes, setPlanes] = useState<PlanPensiones[]>([]);
  const [campanas, setCampanas] = useState<CampanaDescuento[]>([]);
  const [loading, setLoading] = useState(false);

  const [planForm, setPlanForm] = useState({
    id_colegio: colegioDefault,
    id_anio: '',
    nombre: '',
    monto_mensual: '500',
    mes_inicio: 3,
    mes_fin: 12,
    dia_publicacion: 1,
    dia_vencimiento: 5,
  });

  const [campanaForm, setCampanaForm] = useState({
    id_colegio: colegioDefault,
    id_anio: '',
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    tipo_concepto_aplica: 'PENSION',
    monto_promocional: '',
    descuento_monto: '',
    descuento_porcentaje: '',
    solo_alumnos_vigentes: false,
  });

  const [publicarForm, setPublicarForm] = useState({
    id_colegio: colegioDefault,
    id_anio: '',
    mes: new Date().getMonth() + 1,
  });

  const aniosPorColegio = (idColegio: number | string | '') =>
    anios.filter((anio) => !idColegio || anio.id_colegio === Number(idColegio));

  const planesActivos = useMemo(
    () => planes.filter((plan) => String(plan.estado || '').toLowerCase().includes('activo')).length,
    [planes],
  );

  const selectedColegioQuery = (idColegio: number | string | '') => {
    if (!idColegio) return queryString;
    return `?colegio_id=${idColegio}`;
  };

  const nombreColegio = (idColegio: number | string | '') => {
    const colegio = colegios.find((item: any) => item.id_colegio === Number(idColegio));
    return colegio?.nombre || colegio?.nombre_corto || 'Selecciona colegio';
  };

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [aniosRes, planesRes, campanasRes] = await Promise.all([
        axios.get(`/api/academicos/anios${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/tesoreria/planes-pensiones${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/tesoreria/campanas-descuento${queryString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setAnios(aniosRes.data || []);
      setPlanes(planesRes.data || []);
      setCampanas(campanasRes.data || []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo cargar',
        message: error.response?.data?.message || 'Revisa la conexión con el backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  useEffect(() => {
    if (!colegioDefault) return;

    setPlanForm((current) => ({
      ...current,
      id_colegio: current.id_colegio || colegioDefault,
    }));
    setCampanaForm((current) => ({
      ...current,
      id_colegio: current.id_colegio || colegioDefault,
    }));
    setPublicarForm((current) => ({
      ...current,
      id_colegio: current.id_colegio || colegioDefault,
    }));
  }, [colegioDefault]);

  const crearPlan = async () => {
    if (!token) return;

    if (!planForm.id_colegio || !planForm.id_anio) {
      showToast({ type: 'warning', title: 'Faltan datos', message: 'Selecciona colegio y año lectivo.' });
      return;
    }

    if (Number(planForm.mes_inicio) > Number(planForm.mes_fin)) {
      showToast({ type: 'warning', title: 'Revisa los meses', message: 'El mes de inicio no puede ser mayor al mes final.' });
      return;
    }

    try {
      const res = await axios.post(
        `/api/tesoreria/planes-pensiones${selectedColegioQuery(planForm.id_colegio)}`,
        {
          id_anio: Number(planForm.id_anio),
          nombre: planForm.nombre || undefined,
          monto_mensual: Number(planForm.monto_mensual),
          mes_inicio: Number(planForm.mes_inicio),
          mes_fin: Number(planForm.mes_fin),
          dia_publicacion: Number(planForm.dia_publicacion),
          dia_vencimiento: Number(planForm.dia_vencimiento),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Cronograma creado',
        message: res.data?.message || 'Se creó el cronograma base.',
      });
      await fetchAll();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo crear',
        message: error.response?.data?.message || 'Revisa los datos.',
      });
    }
  };

  const crearCampana = async () => {
    if (!token) return;

    if (!campanaForm.nombre || !campanaForm.fecha_inicio || !campanaForm.fecha_fin) {
      showToast({ type: 'warning', title: 'Faltan datos', message: 'Completa nombre y fechas.' });
      return;
    }

    const payload: any = {
      id_anio: campanaForm.id_anio ? Number(campanaForm.id_anio) : undefined,
      id_colegio: campanaForm.id_colegio ? Number(campanaForm.id_colegio) : undefined,
      nombre: campanaForm.nombre,
      fecha_inicio: campanaForm.fecha_inicio,
      fecha_fin: campanaForm.fecha_fin,
      tipo_concepto_aplica: campanaForm.tipo_concepto_aplica || undefined,
      solo_alumnos_vigentes: campanaForm.solo_alumnos_vigentes,
    };

    if (campanaForm.monto_promocional) payload.monto_promocional = Number(campanaForm.monto_promocional);
    if (campanaForm.descuento_monto) payload.descuento_monto = Number(campanaForm.descuento_monto);
    if (campanaForm.descuento_porcentaje) payload.descuento_porcentaje = Number(campanaForm.descuento_porcentaje);

    try {
      await axios.post(
        `/api/tesoreria/campanas-descuento${selectedColegioQuery(campanaForm.id_colegio)}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Campaña creada',
        message: 'La campaña/descuento fue registrada correctamente.',
      });
      await fetchAll();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo crear',
        message: error.response?.data?.message || 'Revisa los datos.',
      });
    }
  };

  const publicarMes = async () => {
    if (!token) return;

    if (!publicarForm.id_colegio || !publicarForm.id_anio) {
      showToast({ type: 'warning', title: 'Faltan datos', message: 'Selecciona colegio y año.' });
      return;
    }

    try {
      const res = await axios.post(
        `/api/tesoreria/pensiones/publicar-mes${selectedColegioQuery(publicarForm.id_colegio)}`,
        {
          id_anio: Number(publicarForm.id_anio),
          id_colegio: Number(publicarForm.id_colegio),
          mes: Number(publicarForm.mes),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Pensiones publicadas',
        message: res.data?.message || 'Se publicó el mes seleccionado.',
      });
      await fetchAll();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo publicar',
        message: error.response?.data?.message || 'Revisa el cronograma base.',
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Tesorería"
        title="Pensiones y descuentos"
        description={`Configura pensiones anuales, descuentos y publicación mensual para ${scopeLabel.toLowerCase()}.`}
        icon={WalletCards}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Estado', value: loading ? 'Cargando...' : 'Listo' },
        ]}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <StepCard
          step={1}
          title="Crea el cronograma"
          description="Define meses, monto mensual, fecha de publicación y fecha de vencimiento."
        />
        <StepCard
          step={2}
          title="Registra descuentos"
          description="Úsalo para matrícula anticipada, pronto pago o campañas por temporada."
        />
        <StepCard
          step={3}
          title="Publica el mes"
          description="Cuando corresponda, activa la pensión para que aparezca como deuda."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Cronogramas" value={planes.length} helper={`${planesActivos} activos`} icon={CalendarDays} />
        <StatCard label="Campañas" value={campanas.length} helper="Descuentos configurados" icon={BadgePercent} />
        <StatCard label="Instituciones" value={colegios.length} helper="Disponibles para gestionar" icon={ShieldCheck} />
      </section>

      <div className="rounded-[30px] border border-blue-100 bg-blue-50/60 p-4 text-sm font-semibold leading-6 text-blue-900">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 ring-1 ring-blue-100">
            <Megaphone size={17} />
          </div>
          <div>
            <p className="font-black text-blue-950">Uso recomendado</p>
            <p className="mt-1 text-blue-800/80">
              Esta pantalla debe usarse por colegio. En vista consolidada, selecciona primero la institución para evitar mezclar planes de pensiones entre colegios.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card
          icon={Coins}
          title="Cronograma base de pensiones"
          description="Crea automáticamente las pensiones del año con publicación y vencimiento mensual."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Colegio</span>
              <select
                className={inputClass}
                value={planForm.id_colegio}
                onChange={(e) => setPlanForm((c) => ({ ...c, id_colegio: Number(e.target.value), id_anio: '' }))}
              >
                <option value="">Seleccionar colegio</option>
                {colegios.map((colegio: any) => (
                  <option key={colegio.id_colegio} value={colegio.id_colegio}>
                    {colegio.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Año lectivo</span>
              <select
                className={inputClass}
                value={planForm.id_anio}
                onChange={(e) => setPlanForm((c) => ({ ...c, id_anio: e.target.value }))}
              >
                <option value="">Seleccionar año</option>
                {aniosPorColegio(planForm.id_colegio).map((anio) => (
                  <option key={anio.id_anio} value={anio.id_anio}>
                    {anio.nombre_anio} · {anio.estado}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Nombre del plan</span>
              <input
                className={inputClass}
                placeholder="Ej. Plan regular 2027"
                value={planForm.nombre}
                onChange={(e) => setPlanForm((c) => ({ ...c, nombre: e.target.value }))}
              />
            </label>

            <label>
              <span className={labelClass}>Monto mensual</span>
              <input
                type="number"
                className={inputClass}
                value={planForm.monto_mensual}
                onChange={(e) => setPlanForm((c) => ({ ...c, monto_mensual: e.target.value }))}
              />
            </label>

            <label>
              <span className={labelClass}>Mes inicio</span>
              <select
                className={inputClass}
                value={planForm.mes_inicio}
                onChange={(e) => setPlanForm((c) => ({ ...c, mes_inicio: Number(e.target.value) }))}
              >
                {meses.map((mes) => (
                  <option key={mes.value} value={mes.value}>{mes.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Mes fin</span>
              <select
                className={inputClass}
                value={planForm.mes_fin}
                onChange={(e) => setPlanForm((c) => ({ ...c, mes_fin: Number(e.target.value) }))}
              >
                {meses.map((mes) => (
                  <option key={mes.value} value={mes.value}>{mes.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Día publicación</span>
              <input
                type="number"
                min="1"
                max="31"
                className={inputClass}
                value={planForm.dia_publicacion}
                onChange={(e) => setPlanForm((c) => ({ ...c, dia_publicacion: Number(e.target.value) }))}
              />
            </label>

            <label>
              <span className={labelClass}>Día vencimiento</span>
              <input
                type="number"
                min="1"
                max="31"
                className={inputClass}
                value={planForm.dia_vencimiento}
                onChange={(e) => setPlanForm((c) => ({ ...c, dia_vencimiento: Number(e.target.value) }))}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={crearPlan}
            disabled={loading}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Crear cronograma base
          </button>

          <div className="mt-5 space-y-3">
            {planes.length === 0 ? (
              <EmptyBox text="No hay cronogramas base registrados." />
            ) : (
              planes.map((plan) => (
                <div key={plan.id_plan_pension} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{plan.nombre}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {plan.colegio?.nombre || plan.colegio?.nombre_corto} · {plan.anio?.nombre_anio}
                      </p>
                    </div>
                    <span className={cx('rounded-full px-3 py-1 text-xs font-black ring-1', estadoClass(plan.estado))}>
                      {plan.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-700">
                    {currency(plan.monto_mensual)} mensual · {plan.detalles?.length || 0} meses
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            icon={Send}
            title="Publicar pensión del mes"
            description="Activa un mes para que sea visible como deuda en la vista de padres y cobranza."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className={labelClass}>Colegio</span>
                <select
                  className={inputClass}
                  value={publicarForm.id_colegio}
                  onChange={(e) => setPublicarForm((c) => ({ ...c, id_colegio: Number(e.target.value), id_anio: '' }))}
                >
                  <option value="">Seleccionar colegio</option>
                  {colegios.map((colegio: any) => (
                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                      {colegio.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Año lectivo</span>
                <select
                  className={inputClass}
                  value={publicarForm.id_anio}
                  onChange={(e) => setPublicarForm((c) => ({ ...c, id_anio: e.target.value }))}
                >
                  <option value="">Seleccionar año</option>
                  {aniosPorColegio(publicarForm.id_colegio).map((anio) => (
                    <option key={anio.id_anio} value={anio.id_anio}>{anio.nombre_anio}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Mes</span>
                <select
                  className={inputClass}
                  value={publicarForm.mes}
                  onChange={(e) => setPublicarForm((c) => ({ ...c, mes: Number(e.target.value) }))}
                >
                  {meses.map((mes) => (
                    <option key={mes.value} value={mes.value}>{mes.label}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={publicarMes}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Publicar
                </button>
              </div>
            </div>

            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-bold leading-5 text-slate-500 ring-1 ring-slate-100">
              Se publicará la pensión para {nombreColegio(publicarForm.id_colegio)}. Si el cronograma base no existe, el backend debe devolver un mensaje claro.
            </p>
          </Card>

          <Card
            icon={BadgePercent}
            title="Campañas y descuentos"
            description="Registra descuentos para matrícula anticipada, pensión, extraordinarios u otros conceptos."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className={labelClass}>Colegio</span>
                <select
                  className={inputClass}
                  value={campanaForm.id_colegio}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, id_colegio: Number(e.target.value), id_anio: '' }))}
                >
                  <option value="">Todos</option>
                  {colegios.map((colegio: any) => (
                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                      {colegio.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={labelClass}>Año lectivo</span>
                <select
                  className={inputClass}
                  value={campanaForm.id_anio}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, id_anio: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {aniosPorColegio(campanaForm.id_colegio).map((anio) => (
                    <option key={anio.id_anio} value={anio.id_anio}>{anio.nombre_anio}</option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className={labelClass}>Nombre</span>
                <input
                  className={inputClass}
                  value={campanaForm.nombre}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, nombre: e.target.value }))}
                  placeholder="Ej. Matrícula anticipada 2027"
                />
              </label>

              <label>
                <span className={labelClass}>Fecha inicio</span>
                <input
                  type="date"
                  className={inputClass}
                  value={campanaForm.fecha_inicio}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, fecha_inicio: e.target.value }))}
                />
              </label>

              <label>
                <span className={labelClass}>Fecha fin</span>
                <input
                  type="date"
                  className={inputClass}
                  value={campanaForm.fecha_fin}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, fecha_fin: e.target.value }))}
                />
              </label>

              <label>
                <span className={labelClass}>Aplica a</span>
                <select
                  className={inputClass}
                  value={campanaForm.tipo_concepto_aplica}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, tipo_concepto_aplica: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="MATRICULA">Matrícula</option>
                  <option value="PENSION">Pensión</option>
                  <option value="EXTRAORDINARIO">Extraordinario</option>
                  <option value="OTRO">Otro</option>
                </select>
              </label>

              <label>
                <span className={labelClass}>Monto promocional</span>
                <input
                  type="number"
                  className={inputClass}
                  value={campanaForm.monto_promocional}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, monto_promocional: e.target.value }))}
                  placeholder="350"
                />
              </label>

              <label>
                <span className={labelClass}>Descuento fijo</span>
                <input
                  type="number"
                  className={inputClass}
                  value={campanaForm.descuento_monto}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, descuento_monto: e.target.value }))}
                  placeholder="150"
                />
              </label>

              <label>
                <span className={labelClass}>Descuento %</span>
                <input
                  type="number"
                  className={inputClass}
                  value={campanaForm.descuento_porcentaje}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, descuento_porcentaje: e.target.value }))}
                  placeholder="10"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <input
                  type="checkbox"
                  checked={campanaForm.solo_alumnos_vigentes}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, solo_alumnos_vigentes: e.target.checked }))}
                />
                <span className="text-sm font-bold text-slate-600">Solo alumnos vigentes</span>
              </label>
            </div>

            <button
              type="button"
              onClick={crearCampana}
              disabled={loading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BadgePercent size={16} />}
              Crear campaña/descuento
            </button>

            <div className="mt-5 space-y-3">
              {campanas.length === 0 ? (
                <EmptyBox text="No hay campañas registradas." />
              ) : (
                campanas.map((campana) => (
                  <div key={campana.id_campana_descuento} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{campana.nombre}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {formatDate(campana.fecha_inicio)} - {formatDate(campana.fecha_fin)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {campana.colegio?.nombre || campana.colegio?.nombre_corto || 'Todos'} · {campana.tipo_concepto_aplica || 'Todos'}
                        </p>
                      </div>
                      <span className={cx('rounded-full px-3 py-1 text-xs font-black ring-1', estadoClass(campana.estado))}>
                        {campana.estado}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campana.monto_promocional && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          Promo {currency(campana.monto_promocional)}
                        </span>
                      )}
                      {campana.descuento_monto && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                          Desc. {currency(campana.descuento_monto)}
                        </span>
                      )}
                      {campana.descuento_porcentaje && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                          {Number(campana.descuento_porcentaje)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
