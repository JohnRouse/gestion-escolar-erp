import { useState } from 'react';
import axios from 'axios';
import { CheckCircle2, CreditCard, Loader2, Search, Smartphone, Wallet } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400';
const formatMoney = (value: number | string | null | undefined) => `S/ ${Number(value || 0).toFixed(2)}`;

export default function ValidarPagosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [referencia, setReferencia] = useState('');
  const [deuda, setDeuda] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [pagoRecibido, setPagoRecibido] = useState<any | null>(null);
  const [form, setForm] = useState({
    medio_pago: 'Yape',
    monto_recibido: '',
    fecha_pago_reportada: new Date().toISOString().slice(0, 16),
    nombre_pagador: '',
    telefono_pagador: '',
    numero_operacion: '',
    observacion: '',
  });

  const buscarReferencia = async () => {
    if (!token || !referencia.trim()) return;
    setLoading(true);
    setDeuda(null);
    setPagoRecibido(null);

    try {
      const res = await axios.get(`/api/tesoreria/referencias/${referencia.trim()}${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeuda(res.data);
      setForm((current) => ({ ...current, monto_recibido: String(res.data?.saldo || res.data?.monto || '') }));
    } catch (error: any) {
      showToast({ type: 'error', title: 'No se encontró la referencia', message: error.response?.data?.message || 'Revisa el código de pago.' });
    } finally {
      setLoading(false);
    }
  };

  const registrarPagoRecibido = async () => {
    if (!token) return;
    setRegistrando(true);
    try {
      const res = await axios.post(`/api/tesoreria/pagos-recibidos${queryString}`, {
        ...form,
        referencia_escrita: referencia.trim(),
        monto_recibido: Number(form.monto_recibido),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPagoRecibido(res.data?.pago || res.data);
      showToast({ type: 'success', title: 'Pago recibido registrado', message: res.data?.message || 'El pago quedó registrado.' });
    } catch (error: any) {
      showToast({ type: 'error', title: 'No se pudo registrar', message: error.response?.data?.message || 'Revisa los datos del pago.' });
    } finally {
      setRegistrando(false);
    }
  };

  const aplicarPago = async () => {
    if (!token || !pagoRecibido?.id_pago_recibido || !deuda?.id_cronograma) return;
    setAplicando(true);
    try {
      const res = await axios.post(`/api/tesoreria/pagos-recibidos/${pagoRecibido.id_pago_recibido}/aplicar${queryString}`, {
        id_cronograma: deuda.id_cronograma,
        monto_aplicar: Number(form.monto_recibido),
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast({ type: 'success', title: 'Pago aplicado', message: res.data?.message || 'El pago se aplicó correctamente.' });
      await buscarReferencia();
      setPagoRecibido(null);
    } catch (error: any) {
      showToast({ type: 'error', title: 'No se pudo aplicar', message: error.response?.data?.message || 'No se pudo aplicar el pago.' });
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Tesorería"
        title="Validar pagos"
        description="Busca códigos de pago, registra Yape/Plin/transferencias y aplica pagos a deudas del alumno."
        icon={Wallet}
        meta={[{ label: 'Contexto activo', value: scopeLabel }, { label: 'Canales', value: 'Yape, Plin, transferencia y pasarela' }]}
      />

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100"><Search size={18} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-950">Buscar por código de pago</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Ejemplo: SMV-PG-2027-000045.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <input className={inputClass} value={referencia} onChange={(event) => setReferencia(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && buscarReferencia()} placeholder="Código de pago" />
          <button type="button" onClick={buscarReferencia} disabled={loading || !referencia.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar
          </button>
        </div>
      </section>

      {deuda && (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><CreditCard size={18} /></div>
              <div>
                <h2 className="text-sm font-black text-slate-950">Deuda encontrada</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Verifica que el monto y alumno coincidan con el Yape recibido.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Referencia" value={deuda.referencia_pago} />
              <Info label="Estado" value={deuda.estado_pago} />
              <Info label="Concepto" value={deuda.concepto?.nombre_concepto || '—'} />
              <Info label="Saldo" value={formatMoney(deuda.saldo)} />
              <Info label="Alumno" value={`${deuda.matricula?.estudiante?.persona?.nombres || ''} ${deuda.matricula?.estudiante?.persona?.apellido_paterno || ''}`} />
              <Info label="Matrícula" value={deuda.matricula?.codigo_matricula || '—'} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100"><Smartphone size={18} /></div>
              <div>
                <h2 className="text-sm font-black text-slate-950">Registrar pago recibido</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Para Yape, Plin, transferencia o efectivo.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Medio</span><select className={inputClass} value={form.medio_pago} onChange={(event) => setForm({ ...form, medio_pago: event.target.value })}><option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option></select></label>
              <label><span className={labelClass}>Monto recibido</span><input type="number" className={inputClass} value={form.monto_recibido} onChange={(event) => setForm({ ...form, monto_recibido: event.target.value })} /></label>
              <label><span className={labelClass}>Fecha y hora</span><input type="datetime-local" className={inputClass} value={form.fecha_pago_reportada} onChange={(event) => setForm({ ...form, fecha_pago_reportada: event.target.value })} /></label>
              <label><span className={labelClass}>N.º operación</span><input className={inputClass} value={form.numero_operacion} onChange={(event) => setForm({ ...form, numero_operacion: event.target.value })} /></label>
              <label><span className={labelClass}>Nombre pagador</span><input className={inputClass} value={form.nombre_pagador} onChange={(event) => setForm({ ...form, nombre_pagador: event.target.value })} /></label>
              <label><span className={labelClass}>Teléfono pagador</span><input className={inputClass} value={form.telefono_pagador} onChange={(event) => setForm({ ...form, telefono_pagador: event.target.value })} /></label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={registrarPagoRecibido} disabled={registrando} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                {registrando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Registrar recibido
              </button>
              <button type="button" onClick={aplicarPago} disabled={aplicando || !pagoRecibido} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {aplicando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Aplicar a deuda
              </button>
            </div>

            {pagoRecibido && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">Pago recibido #{pagoRecibido.id_pago_recibido} registrado. Ahora puedes aplicarlo.</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1.5 text-sm font-black text-slate-900">{value || '—'}</p></div>;
}
