import { FormEvent, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Loader2, Send, Upload, X } from 'lucide-react';

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const fullName = (p?: any) =>
  p ? `${p.nombres || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim() : '—';

export default function ReportarPagoModal({
  pago,
  alumno,
  colegioId,
  dni,
  onClose,
  onSuccess,
}: {
  pago: any;
  alumno: any;
  colegioId: string | number;
  dni: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [medio, setMedio] = useState('Yape');
  const [banco, setBanco] = useState('');
  const [monto, setMonto] = useState(String(Number(pago?.saldo || 0).toFixed(2)));
  const [operacion, setOperacion] = useState('');
  const [pagador, setPagador] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!pagador.trim()) return setError('Ingresa el nombre del pagador.');
    if (!operacion.trim()) return setError('Ingresa el número de operación.');
    if (!Number(monto) || Number(monto) <= 0) return setError('Ingresa un monto válido.');
    if (medio === 'Transferencia' && !banco) return setError('Selecciona el banco destino.');
    if (!file) return setError('Adjunta la captura del comprobante.');

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
      setSent(true);
      onSuccess?.();

      window.setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo enviar el comprobante.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Reporte de pago</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Ya realicé el pago</h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Envía los datos mínimos para que el colegio valide tu comprobante.
            </p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="mt-6 rounded-3xl bg-emerald-50 p-6 text-emerald-800 ring-1 ring-emerald-100">
            <CheckCircle2 size={28} />
            <h3 className="mt-3 text-lg font-black">Comprobante enviado</h3>
            <p className="mt-1 text-sm font-bold leading-6">
              El colegio revisará tu reporte y confirmará el pago en el sistema.
            </p>
            <button onClick={onClose} className="mt-5 h-11 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white">
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Alumno</p>
              <p className="mt-1 font-black text-slate-950">{fullName(alumno)}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{pago.concepto} · {formatMoney(pago.saldo)}</p>
              <p className="mt-1 text-xs font-black text-slate-400">Código: {pago.referencia_pago}</p>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 p-3 text-sm font-black text-rose-700 ring-1 ring-rose-100">
                <div className="flex items-start gap-2"><AlertCircle size={16} /> {error}</div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Medio de pago</span>
                <select className={inputClass} value={medio} onChange={(e) => setMedio(e.target.value)}>
                  <option value="Yape">Yape</option>
                  <option value="Plin">Plin</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                </select>
              </label>

              {medio === 'Transferencia' && (
                <label>
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Banco destino</span>
                  <select className={inputClass} value={banco} onChange={(e) => setBanco(e.target.value)}>
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
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Monto pagado</span>
                <input className={inputClass} value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">N.º operación</span>
                <input className={inputClass} value={operacion} onChange={(e) => setOperacion(e.target.value)} placeholder="Ej. 92838372" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Nombre del pagador</span>
              <input className={inputClass} value={pagador} onChange={(e) => setPagador(e.target.value)} placeholder="Nombre de quien realizó el pago" />
            </label>

            <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center cursor-pointer hover:bg-slate-100">
              <Upload className="mx-auto text-slate-500" size={24} />
              <p className="mt-2 text-sm font-black text-slate-700">
                {file ? file.name : 'Adjuntar captura del comprobante'}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">JPG, PNG, WEBP o PDF · máximo 5 MB</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600">
                Cancelar
              </button>
              <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar comprobante
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}