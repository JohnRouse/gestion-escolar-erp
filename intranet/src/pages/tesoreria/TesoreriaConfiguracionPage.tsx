import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Coins,
  Loader2,
  Send,
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
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const labelClass =
  'mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400';

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
  return 'bg-slate-50 text-slate-600 ring-slate-100';
}

function GuideCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-accent-600">
        Paso {step}
      </p>
      <h3 className="mt-1 text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Card({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function TesoreriaConfiguracionPage() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, scopeLabel, queryString } = useSchool();
  const { showToast } = useToast();

  const colegioDefault =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
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

  const selectedColegioQuery = (idColegio: number | string | '') => {
    if (!idColegio) return queryString;
    return `?colegio_id=${idColegio}`;
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

  const crearPlan = async () => {
    if (!token) return;

    if (!planForm.id_colegio || !planForm.id_anio) {
      showToast({ type: 'warning', title: 'Faltan datos', message: 'Selecciona colegio y año lectivo.' });
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
        title="Configuración de pensiones"
        description={`Define las pensiones del año, crea descuentos y activa los cobros del mes para ${scopeLabel.toLowerCase()}.`}
        icon={WalletCards}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Estado', value: loading ? 'Cargando...' : 'Listo' },
        ]}
      />

      {/* Guía visual de tres pasos */}
      <section className="grid gap-3 md:grid-cols-3">
        <GuideCard
          step={1}
          title="Crear pensiones del año"
          description="Define los meses, montos y fechas de vencimiento para el año escolar."
        />
        <GuideCard
          step={2}
          title="Crear descuentos o campañas"
          description="Úsalo para matrícula anticipada, promociones o descuentos especiales."
        />
        <GuideCard
          step={3}
          title="Activar cobros del mes"
          description="Cuando llegue el mes, publica la pensión para que aparezca como deuda."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          icon={Coins}
          title="Cronograma base de pensiones"
          description="Crea automáticamente las pensiones de marzo a diciembre, con publicación y vencimiento mensual."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Colegio</span>
              <select
                className={inputClass}
                value={planForm.id_colegio}
                onChange={(e) => setPlanForm((c) => ({ ...c, id_colegio: Number(e.target.value), id_anio: '' }))}
              >
                <option value="">Seleccionar</option>
                {colegios.map((colegio) => (
                  <option key={colegio.id_colegio} value={colegio.id_colegio}>
                    {colegio.nombre_corto || colegio.nombre}
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
                <option value="">Seleccionar</option>
                {anios
                  .filter((anio) => !planForm.id_colegio || anio.id_colegio === Number(planForm.id_colegio))
                  .map((anio) => (
                    <option key={anio.id_anio} value={anio.id_anio}>
                      {anio.nombre_anio} · {anio.estado}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Nombre</span>
              <input
                className={inputClass}
                placeholder="Pensiones 2027"
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
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <CheckCircle2 size={16} />
            Crear cronograma base
          </button>

          <div className="mt-5 space-y-3">
            {planes.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                No hay cronogramas base registrados.
              </p>
            ) : (
              planes.map((plan) => (
                <div key={plan.id_plan_pension} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{plan.nombre}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {plan.colegio?.nombre_corto || plan.colegio?.nombre} · {plan.anio?.nombre_anio}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoClass(plan.estado)}`}>
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
            description="Publica un mes para que sea visible en la app de padres."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className={labelClass}>Colegio</span>
                <select
                  className={inputClass}
                  value={publicarForm.id_colegio}
                  onChange={(e) => setPublicarForm((c) => ({ ...c, id_colegio: Number(e.target.value), id_anio: '' }))}
                >
                  <option value="">Seleccionar</option>
                  {colegios.map((colegio) => (
                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                      {colegio.nombre_corto || colegio.nombre}
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
                  <option value="">Seleccionar</option>
                  {anios
                    .filter((anio) => !publicarForm.id_colegio || anio.id_colegio === Number(publicarForm.id_colegio))
                    .map((anio) => (
                      <option key={anio.id_anio} value={anio.id_anio}>
                        {anio.nombre_anio}
                      </option>
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
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-accent-600"
                >
                  <Send size={16} />
                  Publicar
                </button>
              </div>
            </div>
          </Card>

          <Card
            icon={BadgePercent}
            title="Campañas y descuentos"
            description="Aplica descuentos a matrícula, pensión, extraordinarios u otros conceptos."
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
                  {colegios.map((colegio) => (
                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                      {colegio.nombre_corto || colegio.nombre}
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
                  {anios
                    .filter((anio) => !campanaForm.id_colegio || anio.id_colegio === Number(campanaForm.id_colegio))
                    .map((anio) => (
                      <option key={anio.id_anio} value={anio.id_anio}>
                        {anio.nombre_anio}
                      </option>
                    ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className={labelClass}>Nombre</span>
                <input
                  className={inputClass}
                  value={campanaForm.nombre}
                  onChange={(e) => setCampanaForm((c) => ({ ...c, nombre: e.target.value }))}
                  placeholder="Matrícula anticipada / Descuento pronto pago"
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
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <BadgePercent size={16} />
              Crear campaña/descuento
            </button>

            <div className="mt-5 space-y-3">
              {campanas.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                  No hay campañas registradas.
                </p>
              ) : (
                campanas.map((campana) => (
                  <div key={campana.id_campana_descuento} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{campana.nombre}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {formatDate(campana.fecha_inicio)} - {formatDate(campana.fecha_fin)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {campana.colegio?.nombre_corto || campana.colegio?.nombre || 'Todos'} · {campana.tipo_concepto_aplica || 'Todos'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoClass(campana.estado)}`}>
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