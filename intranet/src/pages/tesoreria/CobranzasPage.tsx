import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  WalletCards,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import PersonAvatar from '../../components/PersonAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type DeudaPendiente = {
  id_cronograma: number;
  referencia_pago?: string | null;
  concepto: string;
  estado_pago: string;
  fecha_vencimiento?: string | null;
  monto: number;
  pagado: number;
  saldo: number;
  alumno: {
    id_persona: number;
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
    seccion?: {
      letra?: string | null;
      grado?: {
        nombre_grado?: string | null;
        nivel?: { nombre_nivel?: string | null };
      };
    };
  };
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin vencimiento';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const phoneClean = (value?: string | null) => String(value || '').replace(/\D/g, '');

const fullName = (persona: {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
}) =>
  `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
    persona.apellido_materno || ''
  }`.trim();

function buildMensaje(deuda: DeudaPendiente) {
  return [
    'Estimado padre/madre, le recordamos el pago pendiente:',
    '',
    `Alumno: ${fullName(deuda.alumno)}`,
    `Concepto: ${deuda.concepto}`,
    `Monto pendiente: ${formatMoney(deuda.saldo)}`,
    `Código de pago: ${deuda.referencia_pago || 'Sin código'}`,
    `Vencimiento: ${formatDate(deuda.fecha_vencimiento)}`,
    '',
    'Si paga por Yape/Plin/transferencia, coloque el código de pago en la descripción.',
    '',
    'Muchas gracias.',
  ].join('\n');
}

export default function CobranzasPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [copiadas, setCopiadas] = useState<Record<number, boolean>>({});

  const totalPendiente = useMemo(
    () => deudas.reduce((sum, deuda) => sum + Number(deuda.saldo || 0), 0),
    [deudas],
  );

  const fetchDeudas = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams(queryString.replace('?', ''));
      if (q.trim()) params.set('q', q.trim());
      if (estado) params.set('estado', estado);
      params.set('limit', '150');

      const res = await axios.get(`/api/tesoreria/deudas-pendientes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDeudas(res.data || []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargaron deudas',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeudas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, estado]);

  const copiarMensaje = async (deuda: DeudaPendiente) => {
    await navigator.clipboard.writeText(buildMensaje(deuda));
    setCopiadas((current) => ({ ...current, [deuda.id_cronograma]: true }));

    showToast({
      type: 'success',
      title: 'Mensaje copiado',
      message: 'Ya puedes pegarlo en WhatsApp.',
    });
  };

  const abrirWhatsapp = (deuda: DeudaPendiente) => {
    const telefono = phoneClean(deuda.apoderado?.telefono);
    const mensaje = buildMensaje(deuda);
    const url = telefono
      ? `https://wa.me/51${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copiarTodos = async () => {
    const texto = deudas
      .map((deuda, index) => `#${index + 1}\n${buildMensaje(deuda)}`)
      .join('\n\n--------------------\n\n');

    await navigator.clipboard.writeText(texto);

    showToast({
      type: 'success',
      title: 'Mensajes copiados',
      message: `Se copiaron ${deudas.length} mensajes.`,
    });
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Tesorería"
        title="Cobranza y recordatorios"
        description="Lista pagos pendientes y copia mensajes claros para enviar por WhatsApp."
        icon={WalletCards}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Uso', value: 'Recordar pagos pendientes' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Deudas pendientes
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{deudas.length}</p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Monto pendiente
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {formatMoney(totalPendiente)}
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Estado
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? '...' : 'Listo'}
          </p>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Search size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Buscar deudas</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Busca por alumno, DNI, matrícula o código de pago.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && fetchDeudas()}
            placeholder="Alumno, DNI, matrícula o código de pago"
          />

          <select
            className={inputClass}
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
          >
            <option value="">Pendiente y parcial</option>
            <option value="Pendiente">Solo pendiente</option>
            <option value="Parcial">Solo parcial</option>
          </select>

          <button
            type="button"
            onClick={fetchDeudas}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Actualizar
          </button>

          <button
            type="button"
            onClick={copiarTodos}
            disabled={!deudas.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Copy size={16} />
            Copiar todos
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {deudas.length === 0 && !loading ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
            <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
            <p className="mt-3 text-sm font-black text-slate-700">
              No hay deudas pendientes con esos filtros.
            </p>
          </div>
        ) : (
          deudas.map((deuda) => {
            const alumno = fullName(deuda.alumno);
            const apoderado = deuda.apoderado ? fullName(deuda.apoderado) : 'Sin apoderado';
            const aula = `${deuda.matricula.seccion?.grado?.nombre_grado || 'Grado'} "${
              deuda.matricula.seccion?.letra || '-'
            }"`;

            return (
              <article
                key={deuda.id_cronograma}
                className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-3">
                    <PersonAvatar persona={deuda.alumno} size="lg" rounded="2xl" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">{alumno}</h3>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                          {deuda.estado_pago}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {deuda.concepto} · {aula}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Apoderado: {apoderado} · Tel: {deuda.apoderado?.telefono || 'Sin teléfono'}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Código de pago: {deuda.referencia_pago || 'Sin código'} · Matrícula:{' '}
                        {deuda.matricula.codigo_matricula || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
                    <Mini label="Saldo" value={formatMoney(deuda.saldo)} tone="rose" />
                    <Mini label="Pagado" value={formatMoney(deuda.pagado)} />
                    <Mini label="Vence" value={formatDate(deuda.fecha_vencimiento)} />
                  </div>
                </div>

                {!deuda.referencia_pago && (
                  <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700 ring-1 ring-amber-100">
                    <AlertCircle size={14} className="mr-1 inline" />
                    Esta deuda todavía no tiene código de pago. Genera referencias faltantes desde backend.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copiarMensaje(deuda)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <Copy size={16} />
                    {copiadas[deuda.id_cronograma] ? 'Copiado' : 'Copiar mensaje'}
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirWhatsapp(deuda)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    <MessageCircle size={16} />
                    Abrir WhatsApp
                  </button>

                  <a
                    href="/tesoreria/validar-pagos"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-sky-50 px-4 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                  >
                    <Send size={16} />
                    Validar cuando pague
                  </a>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'rose';
}) {
  const cls =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : 'bg-slate-50 text-slate-700 ring-slate-100';

  return (
    <div className={`rounded-2xl p-3 ring-1 ${cls}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
