import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  History,
  Loader2,
  MessageCircle,
  ReceiptText,
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
import ComprobantePagoModal from '../../components/tesoreria/ComprobantePagoModal';

type EstadoFiltro = 'Todos' | 'Pendiente' | 'Parcial' | 'Pagado' | '';

type DeudaRegistro = {
  id_cronograma: number;
  referencia_pago?: string | null;
  concepto: string;
  estado_pago: string;
  fecha_vencimiento?: string | null;
  monto: number;
  pagado: number;
  saldo: number;
  ultimo_pago?: {
    id_transaccion: number;
    monto_pagado: number | string;
    metodo_pago?: string | null;
    nro_operacion?: string | null;
    fecha_pago?: string | null;
  } | null;
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
      };
    };
  };
  ultima_gestion?: {
    id_gestion: number;
    canal: string;
    estado_contacto: string;
    telefono?: string | null;
    observacion?: string | null;
    fecha_gestion?: string | null;
    fecha_programada?: string | null;
    usuario?: any;
  } | null;
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const phoneClean = (value?: string | null) => String(value || '').replace(/\D/g, '');

const fullName = (persona: {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
}) =>
  `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
    persona.apellido_materno || ''
  }`.trim();

function buildMensaje(deuda: DeudaRegistro) {
  const linkPago =
    deuda.referencia_pago && typeof window !== 'undefined'
      ? `${window.location.origin}/pago/${deuda.referencia_pago}`
      : '';

  const linkConsulta =
    typeof window !== 'undefined' ? `${window.location.origin}/consulta-pagos` : '';

  return [
    'Estimado padre/madre, le recordamos el pago pendiente:',
    '',
    `Alumno: ${fullName(deuda.alumno)}`,
    `Concepto: ${deuda.concepto}`,
    `Monto pendiente: ${formatMoney(deuda.saldo)}`,
    `Código de pago: ${deuda.referencia_pago || 'Sin código'}`,
    `Vencimiento: ${formatDate(deuda.fecha_vencimiento)}`,
    '',
    linkPago ? `Puede ver el detalle aquí: ${linkPago}` : '',
    linkConsulta ? `También puede consultar sus pagos aquí: ${linkConsulta}` : '',
    '',
    'Si paga por Yape/Plin/transferencia, coloque el código de pago en la descripción.',
    '',
    'Muchas gracias.',
  ].filter(Boolean).join('\n');
}

function GuideCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent-600 ring-1 ring-slate-100">
        <Icon size={16} />
      </div>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default function CobranzasPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [registros, setRegistros] = useState<DeudaRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<EstadoFiltro>('Todos');
  const [copiadas, setCopiadas] = useState<Record<number, boolean>>({});
  const [comprobante, setComprobante] = useState<any | null>(null);
  const [loadingComprobante, setLoadingComprobante] = useState<number | null>(null);

  const [gestionDeuda, setGestionDeuda] = useState<DeudaRegistro | null>(null);
  const [guardandoGestion, setGuardandoGestion] = useState(false);
  const [gestionForm, setGestionForm] = useState({
    canal: 'WhatsApp',
    estado_contacto: 'Mensaje enviado',
    observacion: '',
    fecha_programada: '',
  });

  const totalVisible = useMemo(() => {
    return registros.reduce((sum, item) => {
      if (estado === 'Pagado') return sum + Number(item.pagado || 0);
      if (estado === 'Todos') {
        return sum + (item.estado_pago === 'Pagado' ? Number(item.pagado || 0) : Number(item.saldo || 0));
      }
      return sum + Number(item.saldo || 0);
    }, 0);
  }, [registros, estado]);

  const countLabel =
    estado === 'Pagado'
      ? 'Pagos encontrados'
      : estado === 'Todos'
        ? 'Registros encontrados'
        : 'Deudas pendientes';

  const montoLabel =
    estado === 'Pagado'
      ? 'Monto pagado'
      : estado === 'Todos'
        ? 'Monto visible'
        : 'Monto pendiente';

  const fetchRegistros = async () => {
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

      setRegistros(res.data || []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargaron registros',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  const verComprobante = async (idTransaccion?: number | null) => {
    if (!token || !idTransaccion) return;

    setLoadingComprobante(idTransaccion);

    try {
      const res = await axios.get(
        `/api/tesoreria/pagos/${idTransaccion}/comprobante${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setComprobante(res.data);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se abrió el comprobante',
        message: error.response?.data?.message || 'No se pudo cargar el comprobante.',
      });
    } finally {
      setLoadingComprobante(null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRegistros, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, estado, q]);

  const copiarMensaje = async (deuda: DeudaRegistro) => {
    await navigator.clipboard.writeText(buildMensaje(deuda));
    setCopiadas((current) => ({ ...current, [deuda.id_cronograma]: true }));
    showToast({ type: 'success', title: 'Mensaje copiado', message: 'Ya puedes pegarlo en WhatsApp.' });
  };

  const abrirWhatsapp = (deuda: DeudaRegistro) => {
    const telefono = phoneClean(deuda.apoderado?.telefono);
    const mensaje = buildMensaje(deuda);
    const url = telefono
      ? `https://wa.me/51${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const guardarGestion = async () => {
    if (!token || !gestionDeuda) return;

    setGuardandoGestion(true);

    try {
      await axios.post(
        `/api/tesoreria/cobranzas/${gestionDeuda.id_cronograma}/gestiones${queryString}`,
        {
          canal: gestionForm.canal,
          estado_contacto: gestionForm.estado_contacto,
          observacion: gestionForm.observacion,
          fecha_programada: gestionForm.fecha_programada || null,
          telefono: gestionDeuda.apoderado?.telefono || null,
          mensaje: buildMensaje(gestionDeuda),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Gestión registrada',
        message: 'Se guardó el seguimiento de cobranza.',
      });

      setGestionDeuda(null);
      setGestionForm({
        canal: 'WhatsApp',
        estado_contacto: 'Mensaje enviado',
        observacion: '',
        fecha_programada: '',
      });
      fetchRegistros();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se guardó la gestión',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setGuardandoGestion(false);
    }
  };

  const copiarTodos = async () => {
    const soloPorCobrar = registros.filter((item) => item.estado_pago !== 'Pagado');

    if (!soloPorCobrar.length) {
      showToast({
        type: 'warning',
        title: 'No hay mensajes para cobrar',
        message: 'Los registros visibles están pagados.',
      });
      return;
    }

    const texto = soloPorCobrar
      .map((deuda, index) => `#${index + 1}\n${buildMensaje(deuda)}`)
      .join('\n\n--------------------\n\n');

    await navigator.clipboard.writeText(texto);

    showToast({
      type: 'success',
      title: 'Mensajes copiados',
      message: `Se copiaron ${soloPorCobrar.length} mensajes de cobranza.`,
    });
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Tesorería"
        title="Centro de pagos"
        description="Busca pagos, revisa deudas y encuentra rápidamente los últimos pagos registrados."
        icon={WalletCards}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Uso', value: 'Buscar, cobrar y revisar pagos' },
        ]}
      />

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="mb-4">
          <h2 className="text-base font-black text-slate-950">¿Para qué sirve esta pantalla?</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Es el buscador principal de pagos. Si alguien pagó y no sabes dónde quedó, busca aquí por alumno, DNI, matrícula o código de pago.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <GuideCard icon={Search} title="Buscar cualquier pago" description="Escribe el nombre, DNI, matrícula o código. La búsqueda se actualiza sola." />
          <GuideCard icon={History} title="Ver últimos pagados" description="Selecciona “Pagados recientes” para ver los pagos ya aplicados." />
          <GuideCard icon={MessageCircle} title="Cobrar pendientes" description="En pendientes puedes copiar o abrir WhatsApp con el mensaje listo." />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{countLabel}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{registros.length}</p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{montoLabel}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatMoney(totalVisible)}</p>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Vista actual</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {estado === '' ? 'Por cobrar' : estado}
          </p>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Search size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Buscar en pagos y deudas</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Escribe y el sistema buscará automáticamente.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Escribe alumno, DNI, matrícula o código de pago"
          />

          <select className={inputClass} value={estado} onChange={(event) => setEstado(event.target.value as EstadoFiltro)}>
            <option value="Todos">Todos</option>
            <option value="">Por cobrar</option>
            <option value="Pendiente">Solo pendientes</option>
            <option value="Parcial">Pagos parciales</option>
            <option value="Pagado">Pagados recientes</option>
          </select>

          <button
            type="button"
            onClick={fetchRegistros}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Actualizar
          </button>
        </div>

        {estado === 'Pagado' && (
          <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-700 ring-1 ring-emerald-100">
            Estás viendo pagos ya aplicados. Los más recientes deben aparecer arriba.
          </p>
        )}

        {estado === '' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copiarTodos}
              disabled={!registros.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Copy size={16} />
              Copiar mensajes de cobranza
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {registros.length === 0 && !loading ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
            <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
            <p className="mt-3 text-sm font-black text-slate-700">No hay registros con esos filtros.</p>
          </div>
        ) : (
          registros.map((deuda) => {
            const alumno = fullName(deuda.alumno);
            const apoderado = deuda.apoderado ? fullName(deuda.apoderado) : 'Sin apoderado';
            const aula = `${deuda.matricula.seccion?.grado?.nombre_grado || 'Grado'} "${
              deuda.matricula.seccion?.letra || '-'
            }"`;
            const pagado = deuda.estado_pago === 'Pagado';

            return (
              <article key={deuda.id_cronograma} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-3">
                    <PersonAvatar persona={deuda.alumno} size="lg" rounded="2xl" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">{alumno}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          pagado
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                            : deuda.estado_pago === 'Parcial'
                              ? 'bg-amber-50 text-amber-700 ring-amber-100'
                              : 'bg-slate-50 text-slate-600 ring-slate-100'
                        }`}>
                          {deuda.estado_pago}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-500">{deuda.concepto} · {aula}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Apoderado: {apoderado} · Tel: {deuda.apoderado?.telefono || 'Sin teléfono'}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Código de pago: {deuda.referencia_pago || 'Sin código'} · Matrícula: {deuda.matricula.codigo_matricula || '—'}
                      </p>

                      {pagado && deuda.ultimo_pago && (
                        <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                          Último pago: {formatMoney(deuda.ultimo_pago.monto_pagado)} · {deuda.ultimo_pago.metodo_pago || 'Método no indicado'} · {formatDateTime(deuda.ultimo_pago.fecha_pago)}
                          {deuda.ultimo_pago.nro_operacion ? ` · Op: ${deuda.ultimo_pago.nro_operacion}` : ''}
                        </p>
                      )}

                      {deuda.ultima_gestion && (
                        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                          <span>Última gestión:</span>
                          <span>{deuda.ultima_gestion.canal}</span>
                          <span>·</span>
                          <span>{deuda.ultima_gestion.estado_contacto}</span>
                          <span>·</span>
                          <span>{formatDateTime(deuda.ultima_gestion.fecha_gestion)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
                    <Mini label={pagado ? 'Pagado' : 'Saldo'} value={formatMoney(pagado ? deuda.pagado : deuda.saldo)} tone={pagado ? 'emerald' : 'rose'} />
                    <Mini label="Total" value={formatMoney(deuda.monto)} />
                    <Mini label={pagado ? 'Fecha pago' : 'Vence'} value={pagado ? formatDateTime(deuda.ultimo_pago?.fecha_pago) : formatDate(deuda.fecha_vencimiento)} />
                  </div>
                </div>

                {!deuda.referencia_pago && (
                  <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700 ring-1 ring-amber-100">
                    <AlertCircle size={14} className="mr-1 inline" />
                    Esta deuda todavía no tiene código de pago. Genera referencias faltantes desde backend.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {!pagado ? (
                    <>
                      <button type="button" onClick={() => copiarMensaje(deuda)} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800">
                        <Copy size={16} />
                        {copiadas[deuda.id_cronograma] ? 'Copiado' : 'Copiar mensaje'}
                      </button>

                      <button type="button" onClick={() => abrirWhatsapp(deuda)} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700">
                        <MessageCircle size={16} />
                        Abrir WhatsApp
                      </button>

                      <button
                        type="button"
                        onClick={() => setGestionDeuda(deuda)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-50 px-4 text-sm font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100"
                      >
                        <History size={16} />
                        Registrar gestión
                      </button>

                      <a href="/tesoreria/validar-pagos" className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-sky-50 px-4 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100">
                        <Send size={16} />
                        Validar cuando pague
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => verComprobante(deuda.ultimo_pago?.id_transaccion)}
                      disabled={!deuda.ultimo_pago?.id_transaccion || loadingComprobante === deuda.ultimo_pago?.id_transaccion}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {loadingComprobante === deuda.ultimo_pago?.id_transaccion ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ReceiptText size={16} />
                      )}
                      Ver comprobante
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      {comprobante && (
        <ComprobantePagoModal
          comprobante={comprobante}
          onClose={() => setComprobante(null)}
        />
      )}

      {gestionDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Seguimiento de cobranza
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  {fullName(gestionDeuda.alumno)}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {gestionDeuda.concepto} · {formatMoney(gestionDeuda.saldo)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGestionDeuda(null)}
                className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Canal
              </label>
              <select
                className={inputClass}
                value={gestionForm.canal}
                onChange={(event) =>
                  setGestionForm((current) => ({ ...current, canal: event.target.value }))
                }
              >
                <option>WhatsApp</option>
                <option>Llamada</option>
                <option>Presencial</option>
                <option>Correo</option>
              </select>

              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Estado
              </label>
              <select
                className={inputClass}
                value={gestionForm.estado_contacto}
                onChange={(event) =>
                  setGestionForm((current) => ({ ...current, estado_contacto: event.target.value }))
                }
              >
                <option>Mensaje enviado</option>
                <option>Respondió</option>
                <option>No respondió</option>
                <option>Promesa de pago</option>
                <option>Requiere seguimiento</option>
                <option>No contactar</option>
              </select>

              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Próximo seguimiento
              </label>
              <input
                type="datetime-local"
                className={inputClass}
                value={gestionForm.fecha_programada}
                onChange={(event) =>
                  setGestionForm((current) => ({ ...current, fecha_programada: event.target.value }))
                }
              />

              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Observación
              </label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
                placeholder="Ejemplo: se envió WhatsApp, indicó que pagará el viernes."
                value={gestionForm.observacion}
                onChange={(event) =>
                  setGestionForm((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGestionDeuda(null)}
                className="h-11 rounded-2xl bg-slate-50 px-4 text-sm font-black text-slate-600 ring-1 ring-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarGestion}
                disabled={guardandoGestion}
                className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-60"
              >
                {guardandoGestion ? 'Guardando...' : 'Guardar gestión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'rose' | 'emerald' }) {
  const cls =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-100'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : 'bg-slate-50 text-slate-700 ring-slate-100';

  return (
    <div className={`rounded-2xl p-3 ring-1 ${cls}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}