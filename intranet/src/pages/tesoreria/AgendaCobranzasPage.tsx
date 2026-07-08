import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarClock, Copy, Loader2, MessageCircle, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import PersonAvatar from '../../components/PersonAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type AgendaItem = {
  id_gestion: number;
  id_cronograma: number;
  canal: string;
  estado_contacto: string;
  telefono?: string | null;
  observacion?: string | null;
  fecha_gestion?: string | null;
  fecha_programada?: string | null;
  estado_agenda: string;
  proximo_seguimiento?: string | null;
  historial_count?: number;
  deuda: {
    referencia_pago?: string | null;
    concepto: string;
    saldo: number;
    monto: number;
    pagado: number;
    fecha_vencimiento?: string | null;
  };
  alumno: {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  };
  apoderado?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    telefono?: string | null;
  } | null;
  matricula: {
    codigo_matricula?: string | null;
    anio?: string | null;
    colegio?: string | null;
    aula?: string | null;
  };
};

type HistorialGestion = {
  id_gestion: number;
  canal: string;
  estado_contacto: string;
  telefono?: string | null;
  mensaje?: string | null;
  observacion?: string | null;
  fecha_gestion?: string | null;
  fecha_programada?: string | null;
  usuario?: {
    username?: string | null;
    persona?: {
      nombres?: string | null;
      apellido_paterno?: string | null;
    } | null;
  } | null;
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const datePart = String(value).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fullName = (persona?: {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
} | null) =>
  persona
    ? `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
        persona.apellido_materno || ''
      }`.trim()
    : '—';

const phoneClean = (value?: string | null) => String(value || '').replace(/\D/g, '');

function buildMensaje(item: AgendaItem) {
  const linkPago =
    item.deuda.referencia_pago && typeof window !== 'undefined'
      ? `${window.location.origin}/pago/${item.deuda.referencia_pago}`
      : '';

  const linkConsulta =
    typeof window !== 'undefined' ? `${window.location.origin}/consulta-pagos` : '';

  return [
    'Estimado padre/madre, le escribimos para hacer seguimiento al pago pendiente:',
    '',
    `Alumno: ${fullName(item.alumno)}`,
    `Concepto: ${item.deuda.concepto}`,
    `Monto pendiente: ${formatMoney(item.deuda.saldo)}`,
    `Código de pago: ${item.deuda.referencia_pago || 'Sin código'}`,
    `Vencimiento: ${formatDate(item.deuda.fecha_vencimiento)}`,
    '',
    linkPago ? `Detalle del pago: ${linkPago}` : '',
    linkConsulta ? `Consulta de pagos: ${linkConsulta}` : '',
    '',
    'Si ya realizó el pago, por favor envíe el comprobante por el portal.',
    'Muchas gracias.',
  ].filter(Boolean).join('\n');
}

function badgeAgenda(estado: string) {
  if (estado === 'Vencido') return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (estado === 'Hoy') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (estado === 'Próximo') return 'bg-sky-50 text-sky-700 ring-sky-100';
  return 'bg-slate-50 text-slate-600 ring-slate-100';
}

const nombreUsuarioGestion = (gestion?: HistorialGestion | null) => {
  if (!gestion) return '—';
  const persona = gestion.usuario?.persona;
  const nombre = persona
    ? `${persona.nombres || ''} ${persona.apellido_paterno || ''}`.trim()
    : '';
  return nombre || gestion.usuario?.username || 'Usuario no identificado';
};

export default function AgendaCobranzasPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  // Editor de mensaje
  const [mensajeItem, setMensajeItem] = useState<AgendaItem | null>(null);
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [mensajeModo, setMensajeModo] = useState<'copiar' | 'whatsapp'>('copiar');

  // Historial
  const [historialItem, setHistorialItem] = useState<AgendaItem | null>(null);
  const [historial, setHistorial] = useState<HistorialGestion[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const totalSaldo = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.deuda.saldo || 0), 0),
    [items],
  );

  const totalGestiones = useMemo(() => {
    const totalBackend = Number(resumen?.total_gestiones);

    if (Number.isFinite(totalBackend) && totalBackend >= 0) {
      return totalBackend;
    }

    return items.reduce((sum, item) => sum + Number(item.historial_count || 0), 0);
  }, [items, resumen]);

  const fetchAgenda = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams(queryString.replace('?', ''));
      if (q.trim()) params.set('q', q.trim());
      if (estado !== 'Todos') params.set('estado', estado);
      params.set('limit', '200');

      const res = await axios.get(`/api/tesoreria/cobranzas/agenda?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawItems: AgendaItem[] = res.data?.data || [];
      const map = new Map<number, AgendaItem>();

      rawItems.forEach((item) => {
        const key = Number(item.id_cronograma ?? item.id_gestion);

        if (!Number.isInteger(key) || key <= 0) {
          console.warn('AgendaItem sin ID válido para historial:', item);
          return;
        }

        const prev = map.get(key);

        const currentTime = item.fecha_gestion ? new Date(item.fecha_gestion).getTime() : 0;
        const prevTime = prev?.fecha_gestion ? new Date(prev.fecha_gestion).getTime() : 0;

        if (!prev || currentTime >= prevTime) {
          map.set(key, item);
        }
      });

      const unicos = Array.from(map.values());

      setItems(unicos);
      setResumen(res.data?.resumen || null);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargó la agenda',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchAgenda, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, q, estado]);

  const abrirEditorMensaje = (item: AgendaItem, modo: 'copiar' | 'whatsapp') => {
    setMensajeItem(item);
    setMensajeModo(modo);
    setMensajeTexto(buildMensaje(item));
  };

  const confirmarMensaje = async () => {
    if (!mensajeItem) return;

    if (mensajeModo === 'copiar') {
      await navigator.clipboard.writeText(mensajeTexto);

      showToast({
        type: 'success',
        title: 'Mensaje copiado',
        message: 'Se copió el mensaje editado.',
      });

      setMensajeItem(null);
      return;
    }

    const telefono = phoneClean(mensajeItem.telefono || mensajeItem.apoderado?.telefono);
    const url = telefono
      ? `https://wa.me/51${telefono}?text=${encodeURIComponent(mensajeTexto)}`
      : `https://wa.me/?text=${encodeURIComponent(mensajeTexto)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    setMensajeItem(null);
  };

  const getHistorialId = (item: Partial<AgendaItem>) => {
    const rawId = item.id_cronograma ?? item.id_gestion ?? null;
    const id = Number(rawId);

    return Number.isInteger(id) && id > 0 ? id : null;
  };

  const abrirHistorial = async (item: AgendaItem) => {
    if (!token) return;

    const historialId = getHistorialId(item);

    if (!historialId) {
      console.error('AgendaItem sin ID válido para historial:', item);

      showToast({
        type: 'error',
        title: 'No se puede abrir el historial',
        message: 'Este registro no tiene un ID válido de cobranza o cronograma.',
      });

      return;
    }

    setHistorialItem(item);
    setHistorial([]);
    setLoadingHistorial(true);

    try {
      const scopeQuery = queryString || '';
      const res = await axios.get(
        `/api/tesoreria/cobranzas/${historialId}/historial${scopeQuery}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setHistorial(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargó el historial',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setLoadingHistorial(false);
    }
  };


  return (
    <div className="carbon-tesoreria-page agenda-cobranzas-page space-y-6">
      <PageHeader
        eyebrow="Tesorería"
        title="Agenda de cobranzas"
        description="Muestra una tarjeta por deuda en seguimiento; las gestiones anteriores se revisan desde el historial."
        actions={
          <button
            type="button"
            onClick={fetchAgenda}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
        meta={[
          { label: 'Ámbito', value: scopeLabel },
          { label: 'Vista', value: 'Una tarjeta por deuda' },
        ]}
      />

      <section className="agenda-summary-grid grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ['Deudas en seguimiento', resumen?.total ?? items.length],
          ['Gestiones registradas', totalGestiones],
          ['Vencidos', resumen?.vencidos ?? 0],
          ['Hoy', resumen?.hoy ?? 0],
          ['Próximos', resumen?.proximos ?? 0],
          ['Saldo pendiente', formatMoney(resumen?.total_saldo ?? totalSaldo)],
        ].map(([label, value]) => (
          <div key={label} className="agenda-summary-card rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="agenda-info-box rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black text-slate-900">Vista consolidada por deuda</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
          Cada tarjeta representa una deuda pendiente. Si esa deuda tiene varias gestiones, se muestra la última y el botón “Ver historial de gestiones” permite revisar todo el seguimiento.
        </p>
      </section>

      <section className="agenda-filter-panel rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className={`${inputClass} pl-11`}
              placeholder="Buscar alumno, DNI, matrícula, código de pago..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <select className={inputClass} value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option>Todos</option>
            <option>Vencidos</option>
            <option>Hoy</option>
            <option>Próximos</option>
            <option>Sin fecha</option>
          </select>
        </div>
      </section>

      <section className="agenda-list-section space-y-4">
        {loading && (
          <div className="rounded-[28px] bg-white p-8 text-center text-sm font-black text-slate-500 ring-1 ring-slate-100">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            Cargando agenda...
          </div>
        )}

        {!loading && !items.length && (
          <div className="rounded-[28px] bg-white p-8 text-center text-sm font-black text-slate-500 ring-1 ring-slate-100">
            No hay seguimientos pendientes en esta vista.
          </div>
        )}

        {!loading &&
          items.map((item) => (
            <article
              key={getHistorialId(item) || item.id_gestion || item.id_cronograma}
              onClick={() => abrirHistorial(item)}
              className="agenda-debt-card cursor-pointer rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <PersonAvatar
                    persona={item.alumno}
                    size="lg"
                    rounded="2xl"
                    className="mt-1"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">
                        {fullName(item.alumno)}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badgeAgenda(item.estado_agenda)}`}>
                        {item.estado_agenda === 'Sin fecha' ? 'Sin próximo seguimiento' : item.estado_agenda}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      DNI: {item.alumno.dni} · {item.matricula.colegio} · {item.matricula.aula || 'Sin aula'}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Apoderado: {fullName(item.apoderado)} · Tel: {item.telefono || item.apoderado?.telefono || 'Sin teléfono'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600 ring-1 ring-slate-100">
                        {item.deuda.concepto}
                      </span>
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600 ring-1 ring-slate-100">
                        Código: {item.deuda.referencia_pago || 'Sin código'}
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 ring-1 ring-indigo-100">
                        {item.canal} · {item.estado_contacto}
                      </span>
                    </div>

                    {item.observacion && (
                      <p className="mt-3 max-w-3xl rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
                        {item.observacion}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 xl:min-w-[520px]">
                  <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-400">Saldo</p>
                    <p className="mt-1 text-xl font-black text-rose-700">{formatMoney(item.deuda.saldo)}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Próximo seguimiento
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {item.proximo_seguimiento || item.fecha_programada
                        ? formatDate(item.proximo_seguimiento || item.fecha_programada)
                        : 'Sin próximo seguimiento'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Vencimiento de deuda
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {formatDate(item.deuda.fecha_vencimiento)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirEditorMensaje(item, 'copiar');
                  }}
                  className="agenda-action agenda-action-copy inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
                >
                  <Copy size={16} />
                  {copied[item.id_gestion] ? 'Copiado' : 'Copiar mensaje'}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirEditorMensaje(item, 'whatsapp');
                  }}
                  className="agenda-action agenda-action-whatsapp inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
                >
                  <MessageCircle size={16} />
                  Abrir WhatsApp
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    abrirHistorial(item);
                  }}
                  className="agenda-action agenda-action-history inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-50 px-4 text-sm font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100"
                >
                  <CalendarClock size={16} />
                  Ver historial de gestiones{item.historial_count ? ` (${item.historial_count})` : ''}
                </button>
              </div>
            </article>
          ))}
      </section>

      {/* Modal editor de mensaje */}
      {mensajeItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Preparar mensaje
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  {fullName(mensajeItem.alumno)}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {mensajeItem.deuda.concepto} · {formatMoney(mensajeItem.deuda.saldo)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMensajeItem(null)}
                className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-100"
              >
                Cerrar
              </button>
            </div>

            <textarea
              className="mt-5 min-h-[280px] w-full rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-4 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
              value={mensajeTexto}
              onChange={(event) => setMensajeTexto(event.target.value)}
            />

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setMensajeItem(null)}
                className="h-11 rounded-2xl bg-slate-50 px-5 text-sm font-black text-slate-600 ring-1 ring-slate-100"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarMensaje}
                className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
              >
                {mensajeModo === 'copiar' ? 'Copiar mensaje editado' : 'Abrir WhatsApp con este mensaje'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de historial completo */}
      {historialItem && (
        <div className="agenda-history-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="agenda-history-modal max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[30px] bg-white shadow-2xl ring-1 ring-slate-100">
            <div className="agenda-history-header border-b border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Historial de seguimiento
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {fullName(historialItem.alumno)}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {historialItem.deuda.concepto} · {formatMoney(historialItem.deuda.saldo)}
                  </p>
                  <p className="mt-1 text-xs font-black text-slate-400">
                    Código: {historialItem.deuda.referencia_pago || 'Sin código'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setHistorialItem(null)}
                  className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-100"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="agenda-history-body max-h-[62vh] overflow-y-auto p-6">
              {loadingHistorial && (
                <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
                  <Loader2 className="mx-auto mb-3 animate-spin" />
                  Cargando historial...
                </div>
              )}

              {!loadingHistorial && !historial.length && (
                <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
                  Todavía no hay gestiones registradas.
                </div>
              )}

              {!loadingHistorial && historial.length > 0 && (
                <div className="relative space-y-4">
                  {historial.map((gestion, index) => (
                    <div
                      key={gestion.id_gestion}
                      className="agenda-history-entry relative rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                              {gestion.canal}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                              {gestion.estado_contacto}
                            </span>
                            {index === 0 && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                                Última gestión
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm font-black text-slate-950">
                            Registrado por: {nombreUsuarioGestion(gestion)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Fecha de gestión: {formatDateTime(gestion.fecha_gestion)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Próximo seguimiento: {gestion.fecha_programada ? formatDate(gestion.fecha_programada) : 'Sin próximo seguimiento'}
                          </p>

                          {gestion.telefono && (
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Teléfono usado: {gestion.telefono}
                            </p>
                          )}
                        </div>
                      </div>

                      {gestion.observacion && (
                        <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-600 ring-1 ring-slate-100">
                          {gestion.observacion}
                        </div>
                      )}

                      {gestion.mensaje && (
                        <details className="agenda-history-message mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                            Ver mensaje enviado
                          </summary>
                          <pre className="mt-3 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600">
                            {gestion.mensaje}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}