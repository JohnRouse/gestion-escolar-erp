import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Loader2, Send, Upload } from 'lucide-react';
import AccessibleDialog from '../AccessibleDialog';

type PersonaPublica = {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
};

type ReportePagoResumen = {
  observacion?: string | null;
};

type PagoReportable = {
  id_cronograma: number;
  concepto?: string | null;
  saldo?: number | string | null;
  referencia_pago?: string | null;
  reporte_observado?: boolean;
  reporte_rechazado?: boolean;
  reporte_pago?: ReportePagoResumen | null;
};

type ReportarPagoModalProps = {
  pago: PagoReportable;
  alumno: PersonaPublica | null;
  colegioId: string | number;
  dni: string;
  onClose: () => void;
  onSuccess?: () => void;
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 motion-reduce:transition-none';

const labelClass =
  'mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const fullName = (persona?: PersonaPublica | null) => {
  if (!persona) return '—';

  return (
    [persona.nombres, persona.apellido_paterno, persona.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim() || '—'
  );
};

const getAxiosErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export default function ReportarPagoModal({
  pago,
  alumno,
  colegioId,
  dni,
  onClose,
  onSuccess,
}: ReportarPagoModalProps) {
  const formId = useId();
  const fileInputId = useId();
  const fileHelpId = useId();

  const medioSelectRef = useRef<HTMLSelectElement>(null);
  const successButtonRef = useRef<HTMLButtonElement>(null);

  const [medio, setMedio] = useState('Yape');
  const [banco, setBanco] = useState('');
  const [monto, setMonto] = useState(String(Number(pago.saldo || 0).toFixed(2)));
  const [operacion, setOperacion] = useState('');
  const [pagador, setPagador] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const esCorreccion = Boolean(pago.reporte_observado || pago.reporte_rechazado);
  const observacionAnterior = pago.reporte_pago?.observacion || '';

  useEffect(() => {
    if (!sent) return;

    const frame = window.requestAnimationFrame(() => {
      successButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [sent]);

  const cerrar = () => {
    if (loading) return;

    const debeRefrescar = sent;

    onClose();

    if (debeRefrescar) {
      onSuccess?.();
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!pagador.trim()) {
      setError('Ingresa el nombre del pagador.');
      return;
    }

    if (!operacion.trim()) {
      setError('Ingresa el número de operación.');
      return;
    }

    const montoNumerico = Number(monto);

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    if (medio === 'Transferencia' && !banco) {
      setError('Selecciona el banco destino.');
      return;
    }

    if (!file) {
      setError('Adjunta la captura del comprobante.');
      return;
    }

    const form = new FormData();

    form.append('colegio_id', String(colegioId));
    form.append('dni', dni);
    form.append('id_cronograma', String(pago.id_cronograma));
    form.append('referencia_pago', pago.referencia_pago || '');
    form.append('medio_pago', medio);
    form.append('banco_destino', medio === 'Transferencia' ? banco : '');
    form.append('monto_recibido', monto);
    form.append('numero_operacion', operacion.trim());
    form.append('nombre_pagador', pagador.trim());
    form.append('comprobante', file);

    setLoading(true);

    try {
      await axios.post('/api/tesoreria/public/reportar-pago', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      /*
       * El refresco se posterga hasta cerrar la confirmación.
       * Así el padre no desmonta el modal antes de que el usuario
       * pueda percibir el estado de éxito.
       */
      setSent(true);
    } catch (submitError: unknown) {
      setError(
        getAxiosErrorMessage(
          submitError,
          'No se pudo enviar el comprobante.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const title = sent
    ? esCorreccion
      ? 'Corrección enviada'
      : 'Comprobante enviado'
    : esCorreccion
      ? 'Corregir comprobante'
      : 'Ya realicé el pago';

  const description = sent
    ? 'El colegio revisará tu reporte y confirmará el pago en el sistema.'
    : esCorreccion
      ? 'Vuelve a enviar los datos corregidos para que el colegio revise tu comprobante.'
      : 'Envía los datos mínimos para que el colegio valide tu comprobante.';

  return (
    <AccessibleDialog
      open
      eyebrow={sent ? 'Reporte recibido' : 'Reporte de pago'}
      title={title}
      description={description}
      icon={
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
            sent
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-blue-50 text-blue-700 ring-blue-100'
          }`}
        >
          {sent ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <Send size={20} aria-hidden="true" />
          )}
        </div>
      }
      onClose={cerrar}
      preventClose={loading}
      closeOnEscape
      closeOnOverlay
      closeLabel={sent ? 'Cerrar confirmación' : 'Cerrar reporte de pago'}
      initialFocusRef={sent ? successButtonRef : medioSelectRef}
      maxWidthClassName="max-w-xl"
      bodyClassName="px-5 py-5 sm:px-6 sm:py-6"
      footerClassName="gap-3 px-5 py-4 sm:px-6 sm:py-5"
      footer={
        sent ? (
          <button
            ref={successButtonRef}
            type="button"
            onClick={cerrar}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Entendido
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={cerrar}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form={formId}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {loading ? (
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}

              {esCorreccion ? 'Enviar corrección' : 'Enviar comprobante'}
            </button>
          </>
        )
      }
    >
      {sent ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={22}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-bold">Reporte registrado correctamente</p>
              <p className="mt-1 text-sm font-medium leading-6">
                Puedes cerrar esta ventana. Actualizaremos el estado de tus
                pagos al hacerlo.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form id={formId} onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className={labelClass}>Alumno</p>
            <p className="mt-1 font-bold text-slate-950">{fullName(alumno)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {pago.concepto || 'Pago escolar'} · {formatMoney(pago.saldo)}
            </p>
            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
              Código: {pago.referencia_pago || 'Sin código'}
            </p>
          </div>

          {esCorreccion && observacionAnterior && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
              <p className={labelClass}>Observación del colegio</p>
              <p className="mt-1 text-sm font-semibold leading-6">
                {observacionAnterior}
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={16}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Medio de pago</span>
              <select
                ref={medioSelectRef}
                className={inputClass}
                value={medio}
                disabled={loading}
                onChange={(event) => {
                  const value = event.target.value;
                  setMedio(value);

                  if (value !== 'Transferencia') {
                    setBanco('');
                  }
                }}
              >
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia bancaria</option>
              </select>
            </label>

            {medio === 'Transferencia' && (
              <label>
                <span className={labelClass}>Banco destino</span>
                <select
                  className={inputClass}
                  value={banco}
                  disabled={loading}
                  onChange={(event) => setBanco(event.target.value)}
                >
                  <option value="">Selecciona banco</option>
                  <option value="BCP">BCP</option>
                  <option value="BBVA">BBVA</option>
                  <option value="Interbank">Interbank</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
            )}

            <label>
              <span className={labelClass}>Monto pagado</span>
              <input
                className={inputClass}
                value={monto}
                disabled={loading}
                inputMode="decimal"
                onChange={(event) => setMonto(event.target.value)}
              />
            </label>

            <label>
              <span className={labelClass}>N.º operación</span>
              <input
                className={inputClass}
                value={operacion}
                disabled={loading}
                placeholder="Ej. 92838372"
                onChange={(event) => setOperacion(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Nombre del pagador</span>
            <input
              className={inputClass}
              value={pagador}
              disabled={loading}
              autoComplete="name"
              placeholder="Nombre de quien realizó el pago"
              onChange={(event) => setPagador(event.target.value)}
            />
          </label>

          <label
            htmlFor={fileInputId}
            className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition-colors duration-150 hover:border-slate-400 hover:bg-slate-100 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 motion-reduce:transition-none"
          >
            <Upload
              className="mx-auto text-slate-500"
              size={24}
              aria-hidden="true"
            />

            <p className="mt-2 text-sm font-bold text-slate-700">
              {file ? file.name : 'Adjuntar captura del comprobante'}
            </p>

            <p
              id={fileHelpId}
              className="mt-1 text-xs font-semibold text-slate-500"
            >
              JPG, PNG, WEBP o PDF · máximo 5 MB
            </p>

            <input
              id={fileInputId}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              disabled={loading}
              aria-describedby={fileHelpId}
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
        </form>
      )}
    </AccessibleDialog>
  );
}
