import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Copy, Loader2, MessageCircle, RefreshCw, Search } from 'lucide-react';
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

  const totalSaldo = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.deuda.saldo || 0), 0),
    [items],
  );

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

      setItems(res.data?.data || []);
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

  const copiarMensaje = async (item: AgendaItem) => {
    await navigator.clipboard.writeText(buildMensaje(item));
    setCopied((current) => ({ ...current, [item.id_gestion]: true }));

    showToast({
      type: 'success',
      title: 'Mensaje copiado',
      message: 'Ya puedes pegarlo en WhatsApp.',
    });

    window.setTimeout(() => {
      setCopied((current) => ({ ...current, [item.id_gestion]: false }));
    }, 1800);
  };

  const abrirWhatsapp = (item: AgendaItem) => {
    const telefono = phoneClean(item.telefono || item.apoderado?.telefono);
    const mensaje = buildMensaje(item);
    const url = telefono
      ? `https://wa.me/51${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tesorería"
        title="Agenda de cobranzas"
        description="Revisa seguimientos vencidos, pendientes para hoy y próximos contactos."
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
          { label: 'Vista', value: 'Seguimiento' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ['Total', resumen?.total ?? items.length],
          ['Vencidos', resumen?.vencidos ?? 0],
          ['Hoy', resumen?.hoy ?? 0],
          ['Próximos', resumen?.proximos ?? 0],
          ['Saldo', formatMoney(resumen?.total_saldo ?? totalSaldo)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
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

      <section className="space-y-4">
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
              key={item.id_gestion}
              className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100"
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
                        {item.estado_agenda}
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
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Programado</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatDateTime(item.fecha_programada)}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Vence</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatDate(item.deuda.fecha_vencimiento)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => copiarMensaje(item)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
                >
                  <Copy size={16} />
                  {copied[item.id_gestion] ? 'Copiado' : 'Copiar mensaje'}
                </button>

                <button
                  type="button"
                  onClick={() => abrirWhatsapp(item)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
                >
                  <MessageCircle size={16} />
                  Abrir WhatsApp
                </button>
              </div>
            </article>
          ))}
      </section>
    </div>
  );
}
