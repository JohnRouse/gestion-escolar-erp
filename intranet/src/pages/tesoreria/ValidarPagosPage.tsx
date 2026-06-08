import { useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  MessageCircle,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const labelClass =
  'mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const phoneClean = (value?: string | null) => String(value || '').replace(/\D/g, '');

function StepHeader({
  step,
  title,
  description,
  done = false,
  warning = false,
}: {
  step: number;
  title: string;
  description: string;
  done?: boolean;
  warning?: boolean;
}) {
  const Icon = done ? CheckCircle2 : warning ? AlertCircle : CreditCard;
  const cls = done
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : warning
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : 'bg-slate-50 text-slate-600 ring-slate-100';

  return (
    <div className={`mb-4 rounded-2xl px-4 py-3 ring-1 ${cls}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80">
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em]">Paso {step}</p>
          <p className="mt-0.5 text-sm font-black">{title}</p>
          <p className="mt-1 text-xs font-bold leading-5 opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{value || '—'}</p>
    </div>
  );
}

function StatusPill({
  children,
  tone = 'slate',
}: {
  children: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function ValidarPagosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [deuda, setDeuda] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [pagoRecibido, setPagoRecibido] = useState<any | null>(null);
  const [modoSinCodigo, setModoSinCodigo] = useState(false);

  const [form, setForm] = useState({
    medio_pago: 'Yape',
    monto_recibido: '',
    fecha_pago_reportada: new Date().toISOString().slice(0, 16),
    nombre_pagador: '',
    telefono_pagador: '',
    numero_operacion: '',
    observacion: '',
  });

  const alumnoNombre = useMemo(() => {
    const persona = deuda?.matricula?.estudiante?.persona;
    if (!persona) return '—';
    return `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
      persona.apellido_materno || ''
    }`.trim();
  }, [deuda]);

  const apoderadoPrincipal = deuda?.matricula?.estudiante?.apoderados?.[0]?.apoderado?.persona;

  const mensajeWhatsapp = useMemo(() => {
    if (!deuda) return '';

    return [
      'Estimado padre/madre, le compartimos el detalle del pago pendiente:',
      '',
      `Alumno: ${alumnoNombre}`,
      `Concepto: ${deuda.concepto?.nombre_concepto || 'Pago pendiente'}`,
      `Monto pendiente: ${formatMoney(deuda.saldo)}`,
      `Código de pago: ${deuda.referencia_pago}`,
      '',
      'Si realiza el pago por Yape/Plin/transferencia, coloque este código en la descripción:',
      `${deuda.referencia_pago}`,
      '',
      'Muchas gracias.',
    ].join('\n');
  }, [alumnoNombre, deuda]);

  const buscar = async () => {
    if (!token || !busqueda.trim()) return;

    setLoading(true);
    setDeuda(null);
    setPagoRecibido(null);
    setModoSinCodigo(false);

    try {
      const res = await axios.get(`/api/tesoreria/referencias/${busqueda.trim()}${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDeuda(res.data);
      setForm((current) => ({
        ...current,
        monto_recibido: String(res.data?.saldo || res.data?.monto || ''),
      }));
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se encontró el código',
        message:
          error.response?.data?.message ||
          'Verifica el código de pago. También puedes registrar el pago como no identificado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const registrarPagoRecibido = async () => {
    if (!token) return;

    if (!form.monto_recibido || Number(form.monto_recibido) <= 0) {
      showToast({
        type: 'warning',
        title: 'Falta el monto',
        message: 'Ingresa el monto recibido.',
      });
      return;
    }

    setRegistrando(true);

    try {
      const res = await axios.post(
        `/api/tesoreria/pagos-recibidos${queryString}`,
        {
          ...form,
          referencia_escrita: deuda?.referencia_pago || busqueda.trim() || undefined,
          monto_recibido: Number(form.monto_recibido),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPagoRecibido(res.data?.pago || res.data);

      showToast({
        type: 'success',
        title: deuda ? 'Pago recibido registrado' : 'Pago no identificado registrado',
        message:
          res.data?.message ||
          (deuda
            ? 'El pago recibido quedó vinculado al código de pago.'
            : 'El pago quedó pendiente de identificar.'),
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo registrar',
        message: error.response?.data?.message || 'Revisa los datos del pago.',
      });
    } finally {
      setRegistrando(false);
    }
  };

  const aplicarPago = async () => {
    if (!token || !pagoRecibido?.id_pago_recibido || !deuda?.id_cronograma) return;

    setAplicando(true);

    try {
      const res = await axios.post(
        `/api/tesoreria/pagos-recibidos/${pagoRecibido.id_pago_recibido}/aplicar${queryString}`,
        {
          id_cronograma: deuda.id_cronograma,
          monto_aplicar: Number(form.monto_recibido),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast({
        type: 'success',
        title: 'Pago confirmado',
        message: res.data?.message || 'El pago se aplicó correctamente.',
      });

      await buscar();
      setPagoRecibido(null);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se pudo confirmar',
        message: error.response?.data?.message || 'No se pudo aplicar el pago.',
      });
    } finally {
      setAplicando(false);
    }
  };

  const copiarMensaje = async () => {
    if (!mensajeWhatsapp) return;

    await navigator.clipboard.writeText(mensajeWhatsapp);

    showToast({
      type: 'success',
      title: 'Mensaje copiado',
      message: 'Ya puedes pegarlo en WhatsApp.',
    });
  };

  const abrirWhatsapp = () => {
    if (!mensajeWhatsapp) return;

    const telefono = phoneClean(apoderadoPrincipal?.telefono);
    const url = telefono
      ? `https://wa.me/51${telefono}?text=${encodeURIComponent(mensajeWhatsapp)}`
      : `https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const empezarSinCodigo = () => {
    setModoSinCodigo(true);
    setDeuda(null);
    setPagoRecibido(null);
    setBusqueda('');
    setForm((current) => ({
      ...current,
      monto_recibido: '',
      nombre_pagador: '',
      numero_operacion: '',
      observacion: '',
    }));
  };

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Tesorería"
        title="Validar pagos"
        description="Registra pagos por Yape, Plin, transferencia o efectivo con una guía simple de tres pasos."
        icon={Wallet}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Uso diario', value: 'Buscar, registrar y confirmar' },
        ]}
      />

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <StepHeader
          step={1}
          title="Busca el código de pago"
          description="Pide al padre el código que aparece en su deuda o en el mensaje enviado por WhatsApp."
          done={Boolean(deuda)}
          warning={modoSinCodigo}
        />

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className={inputClass}
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && buscar()}
            placeholder="Ejemplo: SMV-PG-2027-000045"
          />
          <button
            type="button"
            onClick={buscar}
            disabled={loading || !busqueda.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Buscar
          </button>
          <button
            type="button"
            onClick={empezarSinCodigo}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-50 px-5 text-sm font-black text-amber-700 ring-1 ring-amber-100 transition hover:bg-amber-100"
          >
            No tengo código
          </button>
        </div>

        <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
          El código de pago sirve para saber automáticamente qué alumno, concepto y monto corresponde.
        </p>
      </section>

      {deuda && (
        <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Pago encontrado</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Verifica que coincida con el comprobante del padre.
              </p>
            </div>
            <StatusPill
              tone={
                deuda.estado_pago === 'Pagado'
                  ? 'emerald'
                  : deuda.estado_pago === 'Parcial'
                    ? 'amber'
                    : 'slate'
              }
            >
              {deuda.estado_pago}
            </StatusPill>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Código de pago" value={deuda.referencia_pago} />
            <Info label="Alumno" value={alumnoNombre} />
            <Info label="Concepto" value={deuda.concepto?.nombre_concepto || '—'} />
            <Info label="Saldo pendiente" value={formatMoney(deuda.saldo)} />
            <Info label="Matrícula" value={deuda.matricula?.codigo_matricula || '—'} />
            <Info
              label="Aula"
              value={`${deuda.matricula?.seccion?.grado?.nombre_grado || '—'} "${
                deuda.matricula?.seccion?.letra || '-'
              }"`}
            />
            <Info label="Monto total" value={formatMoney(deuda.monto)} />
            <Info label="Pagado" value={formatMoney(deuda.pagado)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copiarMensaje}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Copy size={16} />
              Copiar mensaje WhatsApp
            </button>
            <button
              type="button"
              onClick={abrirWhatsapp}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              <MessageCircle size={16} />
              Abrir WhatsApp
            </button>
          </div>
        </section>
      )}

      {(deuda || modoSinCodigo) && (
        <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
          <StepHeader
            step={2}
            title={deuda ? 'Registra el pago recibido' : 'Registra el pago no identificado'}
            description={
              deuda
                ? 'Copia los datos del comprobante de Yape, Plin o transferencia.'
                : 'Úsalo cuando el padre pagó, pero no indicó código o no se sabe todavía a qué alumno corresponde.'
            }
            done={Boolean(pagoRecibido)}
            warning={modoSinCodigo && !pagoRecibido}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className={labelClass}>Medio</span>
              <select
                className={inputClass}
                value={form.medio_pago}
                onChange={(event) => setForm({ ...form, medio_pago: event.target.value })}
              >
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </label>

            <label>
              <span className={labelClass}>Monto recibido</span>
              <input
                type="number"
                className={inputClass}
                value={form.monto_recibido}
                onChange={(event) => setForm({ ...form, monto_recibido: event.target.value })}
                placeholder="Ej. 350"
              />
            </label>

            <label>
              <span className={labelClass}>Fecha y hora</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.fecha_pago_reportada}
                onChange={(event) =>
                  setForm({ ...form, fecha_pago_reportada: event.target.value })
                }
              />
            </label>

            <label>
              <span className={labelClass}>N.º operación</span>
              <input
                className={inputClass}
                value={form.numero_operacion}
                onChange={(event) => setForm({ ...form, numero_operacion: event.target.value })}
                placeholder="Opcional"
              />
            </label>

            <label>
              <span className={labelClass}>Nombre que aparece en el pago</span>
              <input
                className={inputClass}
                value={form.nombre_pagador}
                onChange={(event) => setForm({ ...form, nombre_pagador: event.target.value })}
                placeholder="Ej. Juan Carlos"
              />
            </label>

            <label>
              <span className={labelClass}>Teléfono</span>
              <input
                className={inputClass}
                value={form.telefono_pagador}
                onChange={(event) => setForm({ ...form, telefono_pagador: event.target.value })}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className={labelClass}>Observación</span>
            <textarea
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
              value={form.observacion}
              onChange={(event) => setForm({ ...form, observacion: event.target.value })}
              placeholder="Ej. El padre indicó que pagó por matrícula."
            />
          </label>

          <button
            type="button"
            onClick={registrarPagoRecibido}
            disabled={registrando}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {registrando ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
            {deuda ? 'Registrar pago recibido' : 'Guardar como no identificado'}
          </button>

          {pagoRecibido && (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
              Pago recibido #{pagoRecibido.id_pago_recibido} registrado correctamente.
            </p>
          )}
        </section>
      )}

      {deuda && (
        <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
          <StepHeader
            step={3}
            title="Confirma el pago"
            description="Al confirmar, la deuda del alumno quedará pagada o parcialmente pagada."
            done={deuda.estado_pago === 'Pagado'}
            warning={Boolean(!pagoRecibido && deuda.estado_pago !== 'Pagado')}
          />

          <button
            type="button"
            onClick={aplicarPago}
            disabled={aplicando || !pagoRecibido || deuda.estado_pago === 'Pagado'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aplicando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Confirmar y aplicar pago
          </button>

          {!pagoRecibido && deuda.estado_pago !== 'Pagado' && (
            <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
              Primero registra el pago recibido del paso 2.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
