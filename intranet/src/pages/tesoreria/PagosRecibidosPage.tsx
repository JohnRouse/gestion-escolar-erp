import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import PersonAvatar from '../../components/PersonAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type PagoRecibido = {
  id_pago_recibido: number;
  medio_pago: string;
  monto_recibido: string | number;
  fecha_pago_reportada: string;
  nombre_pagador?: string | null;
  telefono_pagador?: string | null;
  numero_operacion?: string | null;
  referencia_escrita?: string | null;
  estado: string;
  observacion?: string | null;
  id_cronograma?: number | null;
  banco_destino?: string | null;
  captura_url?: string | null;
  origen_reporte?: string | null;
  validacion?: {
    monto_esperado?: number | null;
    pagado_actual?: number | null;
    saldo_actual?: number | null;
    monto_reportado?: number | null;
    diferencia?: number | null;
    monto_coincide?: boolean | null;
    excede_saldo?: boolean;
    operacion_duplicada?: boolean;
    cantidad_operaciones_similares?: number;
  };
  cronograma?: {
    id_cronograma: number;
    referencia_pago?: string | null;
    estado_pago?: string | null;
    concepto?: { nombre_concepto?: string | null };
  } | null;
  estudiante?: {
    persona: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
      dni: string;
    };
  } | null;
  apoderado?: {
    persona: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
      dni: string;
      telefono?: string | null;
    };
  } | null;
  matricula?: {
    codigo_matricula?: string | null;
  } | null;
};

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const formatMoney = (value: string | number | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
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

function estadoTone(estado: string) {
  if (estado === 'Aplicado') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (estado === 'Identificado') return 'bg-sky-50 text-sky-700 ring-sky-100';
  if (estado === 'Observado') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (estado === 'Rechazado') return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (estado === 'Reemplazado') return 'bg-slate-100 text-slate-500 ring-slate-200';
  return 'bg-slate-50 text-slate-600 ring-slate-100';
}

function validacionTone(pago: PagoRecibido) {
  if (pago.validacion?.operacion_duplicada) {
    return { label: 'Operación repetida', className: 'bg-rose-50 text-rose-700 ring-rose-100' };
  }
  if (pago.validacion?.excede_saldo) {
    return { label: 'Monto excede saldo', className: 'bg-amber-50 text-amber-700 ring-amber-100' };
  }
  if (pago.validacion?.monto_coincide) {
    return { label: 'Monto coincide', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
  }
  if (pago.validacion?.monto_coincide === false) {
    return { label: 'Monto distinto', className: 'bg-sky-50 text-sky-700 ring-sky-100' };
  }
  return null;
}

export default function PagosRecibidosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [pagos, setPagos] = useState<PagoRecibido[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [medio, setMedio] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PagoRecibido | null>(null);
  const [referencia, setReferencia] = useState('');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  const resumen = useMemo(() => {
    const total = pagos.reduce((sum, item) => sum + Number(item.monto_recibido || 0), 0);
    const pendientes = pagos.filter((item) => item.estado === 'Pendiente').length;
    const identificados = pagos.filter((item) => item.estado === 'Identificado').length;
    const aplicados = pagos.filter((item) => item.estado === 'Aplicado').length;
    return { total, pendientes, identificados, aplicados };
  }, [pagos]);

  const fetchPagos = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams(queryString.replace('?', ''));
      params.set('limit', '150');
      if (q.trim()) params.set('q', q.trim());
      if (estado) params.set('estado', estado);
      if (medio && medio !== 'Todos') params.set('medio', medio);

      const res = await axios.get(`/api/tesoreria/pagos-recibidos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPagos(res.data || []);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargaron pagos',
        message: error.response?.data?.message || 'Revisa el backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchPagos, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, q, estado, medio]);

  const abrirDetalle = (pago: PagoRecibido) => {
    setSelected(pago);
    setReferencia(pago.referencia_escrita || pago.cronograma?.referencia_pago || '');
    setObservacion(pago.observacion || '');
  };

  const identificar = async () => {
    if (!token || !selected) return;

    if (!referencia.trim()) {
      showToast({
        type: 'warning',
        title: 'Falta código de pago',
        message: 'Ingresa el código de pago para identificarlo.',
      });
      return;
    }

    setSaving(true);

    try {
      const res = await axios.patch(
        `/api/tesoreria/pagos-recibidos/${selected.id_pago_recibido}/identificar${queryString}`,
        { referencia_pago: referencia.trim(), observacion },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Pago identificado',
        message: res.data?.message || 'Ahora puedes aplicarlo.',
      });

      setSelected(res.data?.pago || selected);
      await fetchPagos();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo identificar',
        message: error.response?.data?.message || 'Revisa el código de pago.',
      });
    } finally {
      setSaving(false);
    }
  };

  const aplicar = async () => {
    if (!token || !selected?.id_pago_recibido) return;

    setSaving(true);

    try {
      const res = await axios.post(
        `/api/tesoreria/pagos-recibidos/${selected.id_pago_recibido}/aplicar${queryString}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Pago aplicado',
        message: res.data?.message || 'El pago se aplicó correctamente.',
      });

      setSelected(null);
      await fetchPagos();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo aplicar',
        message: error.response?.data?.message || 'Identifica el pago antes de aplicarlo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: 'Observado' | 'Rechazado') => {
    if (!token || !selected) return;

    setSaving(true);

    try {
      const res = await axios.patch(
        `/api/tesoreria/pagos-recibidos/${selected.id_pago_recibido}/estado${queryString}`,
        { estado: nuevoEstado, observacion },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: `Pago ${nuevoEstado.toLowerCase()}`,
        message: res.data?.message || 'Estado actualizado.',
      });

      setSelected(null);
      await fetchPagos();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo actualizar',
        message: error.response?.data?.message || 'Revisa el pago.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Tesorería"
        title="Pagos recibidos"
        description="Revisa pagos por Yape, Plin, transferencia o efectivo que necesitan identificarse o confirmarse."
        icon={Smartphone}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Uso', value: 'Identificar y aplicar pagos' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Kpi label="Monto listado" value={formatMoney(resumen.total)} />
        <Kpi label="Pendientes" value={String(resumen.pendientes)} />
        <Kpi label="Identificados" value={String(resumen.identificados)} />
        <Kpi label="Aplicados" value={String(resumen.aplicados)} />
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Search size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Buscar pagos recibidos</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Busca por código de pago, operación, pagador, alumno, DNI o matrícula.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Escribe para buscar"
          />

          <select className={inputClass} value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="Pendiente">Pendientes</option>
            <option value="Identificado">Identificados</option>
            <option value="Aplicado">Aplicados</option>
            <option value="Observado">Observados</option>
            <option value="Rechazado">Rechazados</option>
            <option value="Reemplazado">Reemplazados</option>
            <option value="Todos">Todos</option>
          </select>

          <select className={inputClass} value={medio} onChange={(event) => setMedio(event.target.value)}>
            <option value="Todos">Todos los medios</option>
            <option value="Yape">Yape</option>
            <option value="Plin">Plin</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
            <Loader2 className="mx-auto animate-spin text-accent-600" size={32} />
            <p className="mt-3 text-sm font-black text-slate-500">Cargando pagos...</p>
          </div>
        ) : pagos.length === 0 ? (
          <div className="rounded-[30px] bg-white p-8 text-center shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
            <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
            <p className="mt-3 text-sm font-black text-slate-700">No hay pagos con esos filtros.</p>
          </div>
        ) : (
          pagos.map((pago) => {
            const alumno = fullName(pago.estudiante?.persona);
            const apoderado = fullName(pago.apoderado?.persona);
            const estadoValidacion = validacionTone(pago);

            return (
              <article key={pago.id_pago_recibido} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-3">
                    <PersonAvatar
                      persona={pago.estudiante?.persona || { nombres: pago.nombre_pagador || 'Pago', apellido_paterno: pago.medio_pago }}
                      size="lg"
                      rounded="2xl"
                    />

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">
                          {alumno !== '—' ? alumno : pago.nombre_pagador || 'Pago sin identificar'}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoTone(pago.estado)}`}>
                          {pago.estado}
                        </span>

                        {estadoValidacion && (
                          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoValidacion.className}`}>
                            {estadoValidacion.label}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {formatMoney(pago.monto_recibido)} · {pago.medio_pago} · {formatDateTime(pago.fecha_pago_reportada)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Operación: {pago.numero_operacion || 'Sin operación'} · Pagador: {pago.nombre_pagador || 'Sin nombre'}
                      </p>

                      {pago.validacion && (
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          Esperado: {pago.validacion.saldo_actual !== null && pago.validacion.saldo_actual !== undefined
                            ? formatMoney(pago.validacion.saldo_actual)
                            : '—'} · Reportado: {formatMoney(pago.validacion.monto_reportado || pago.monto_recibido)}
                          {pago.validacion.diferencia !== null && pago.validacion.diferencia !== undefined
                            ? ` · Diferencia: ${formatMoney(pago.validacion.diferencia)}`
                            : ''}
                        </p>
                      )}

                      {pago.banco_destino && (
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          Banco destino: {pago.banco_destino}
                        </p>
                      )}

                      {pago.origen_reporte === 'Portal público' && (
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          Reportado por el padre
                        </span>
                      )}

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Código escrito: {pago.referencia_escrita || 'Sin código'} · Concepto: {pago.cronograma?.concepto?.nombre_concepto || 'No identificado'}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">Apoderado: {apoderado}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirDetalle(pago)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <Eye size={16} />
                    Ver / gestionar
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-modal-pop rounded-[30px] bg-white p-6 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Pago recibido #{selected.id_pago_recibido}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Identifica el pago con un código y luego confírmalo.</p>
                </div>
              </div>

              <button type="button" onClick={() => setSelected(null)} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-200">
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="Monto recibido" value={formatMoney(selected.monto_recibido)} />
              <Info label="Medio" value={selected.medio_pago} />
              <Info label="Pagador" value={selected.nombre_pagador || 'Sin nombre'} />
              <Info label="Operación" value={selected.numero_operacion || 'Sin operación'} />
              <Info label="Fecha reportada" value={formatDateTime(selected.fecha_pago_reportada)} />
              <Info label="Estado" value={selected.estado} />
              <Info label="Banco destino" value={selected.banco_destino || '—'} />
              <Info label="Origen" value={selected.origen_reporte || 'Interno'} />
            </div>

            {selected.validacion && (
              <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Validación rápida
                    </p>
                    <h3 className="mt-1 text-base font-black text-slate-950">
                      {selected.validacion.monto_coincide
                        ? 'El monto reportado coincide con el saldo.'
                        : 'Revisa el monto antes de confirmar.'}
                    </h3>
                  </div>

                  {selected.validacion.operacion_duplicada && (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                      Operación repetida
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Info label="Monto esperado" value={
                    selected.validacion.saldo_actual !== null && selected.validacion.saldo_actual !== undefined
                      ? formatMoney(selected.validacion.saldo_actual)
                      : '—'
                  } />
                  <Info label="Monto reportado" value={formatMoney(selected.validacion.monto_reportado || selected.monto_recibido)} />
                  <Info label="Diferencia" value={
                    selected.validacion.diferencia !== null && selected.validacion.diferencia !== undefined
                      ? formatMoney(selected.validacion.diferencia)
                      : '—'
                  } />
                  <Info label="Coincidencia" value={selected.validacion.monto_coincide ? 'Sí' : 'Revisar'} />
                </div>

                {selected.validacion.excede_saldo && (
                  <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-black text-amber-700 ring-1 ring-amber-100">
                    El monto reportado excede el saldo pendiente. Revisa antes de confirmar.
                  </p>
                )}

                {selected.validacion.operacion_duplicada && (
                  <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-black text-rose-700 ring-1 ring-rose-100">
                    Ya existe más de un pago con este número de operación. Revisa antes de confirmar.
                  </p>
                )}
              </div>
            )}

            {selected.captura_url && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Comprobante adjunto
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Archivo enviado desde el portal público.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={selected.captura_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      <ExternalLink size={16} />
                      Abrir
                    </a>

                    <a
                      href={selected.captura_url}
                      download
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                    >
                      Descargar
                    </a>
                  </div>
                </div>

                {selected.captura_url.match(/\.(png|jpg|jpeg|webp)$/i) && (
                  <img
                    src={selected.captura_url}
                    alt="Comprobante de pago"
                    className="max-h-80 w-full rounded-2xl object-contain bg-white"
                  />
                )}

                {selected.captura_url.match(/\.pdf$/i) && (
                  <div className="rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                    El comprobante es un PDF. Usa "Abrir" para revisarlo en otra pestaña.
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Código de pago</span>
                <input
                  className={inputClass}
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  placeholder="Ej. SMV-PG-2027-000001"
                  disabled={selected.estado === 'Aplicado'}
                />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Observación</span>
                <textarea
                  className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-100"
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  placeholder="Ej. El padre envió captura por WhatsApp."
                  disabled={selected.estado === 'Aplicado'}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {selected.estado !== 'Aplicado' && (
                <>
                  <button type="button" onClick={() => cambiarEstado('Observado')} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 text-sm font-black text-amber-700 ring-1 ring-amber-100 transition hover:bg-amber-100 disabled:opacity-50">
                    <AlertCircle size={16} />
                    Observar
                  </button>

                  <button type="button" onClick={() => cambiarEstado('Rechazado')} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 text-sm font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50">
                    <XCircle size={16} />
                    Rechazar
                  </button>

                  <button type="button" onClick={identificar} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Identificar
                  </button>

                  <button type="button" onClick={aplicar} disabled={saving || !selected.id_cronograma || selected.estado === 'Reemplazado'} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirmar pago
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-100/80 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{value || '—'}</p>
    </div>
  );
}