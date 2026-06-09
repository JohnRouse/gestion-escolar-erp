import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Copy, Loader2, ShieldCheck, WalletCards } from 'lucide-react';
import { useParams } from 'react-router-dom';

const formatMoney = (value: number | string | null | undefined) => `S/ ${Number(value || 0).toFixed(2)}`;

const fullName = (p?: any) =>
  p ? `${p.nombres || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim() : '—';

export default function PagoPublicoPage() {
  const { referencia } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPago = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/tesoreria/public/pagos/${referencia}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'No se encontró el pago.');
      } finally {
        setLoading(false);
      }
    };

    if (referencia) fetchPago();
  }, [referencia]);

  const copyCode = async () => {
    if (!data?.referencia_pago) return;
    await navigator.clipboard.writeText(data.referencia_pago);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="rounded-[30px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <Loader2 className="mx-auto animate-spin text-slate-700" size={34} />
          <p className="mt-4 text-sm font-black text-slate-600">Cargando pago...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="w-full max-w-md rounded-[30px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <AlertCircle className="mx-auto text-rose-600" size={36} />
          <h1 className="mt-4 text-xl font-black text-slate-950">No encontramos este pago</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{error}</p>
        </div>
      </main>
    );
  }

  const pagado = data.estado_pago === 'Pagado' || Number(data.saldo || 0) <= 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-2xl rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <WalletCards size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {data.colegio?.nombre_corto || data.colegio?.nombre || 'Colegio'}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Detalle de pago</h1>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              Revisa el monto y copia el código para colocarlo en Yape, Plin o transferencia.
            </p>
          </div>
        </div>

        {pagado ? (
          <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-100">
            <CheckCircle2 size={22} />
            <h2 className="mt-2 font-black">Este pago ya figura como pagado</h2>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-rose-50 p-5 text-rose-800 ring-1 ring-rose-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Monto pendiente</p>
            <p className="mt-1 text-4xl font-black">{formatMoney(data.saldo)}</p>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info label="Alumno" value={fullName(data.alumno)} />
          <Info label="Concepto" value={data.concepto?.nombre_concepto || '—'} />
          <Info label="Aula" value={data.matricula?.aula || '—'} />
          <Info label="Matrícula" value={data.matricula?.codigo_matricula || '—'} />
        </div>

        <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Código de pago</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-2xl bg-white px-4 py-3 text-lg font-black text-slate-950 ring-1 ring-slate-200">
              {data.referencia_pago}
            </div>
            <button type="button" onClick={copyCode} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800">
              <Copy size={16} />
              {copied ? 'Copiado' : 'Copiar código'}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-sky-50 p-5 text-sky-800 ring-1 ring-sky-100">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} />
            <div>
              <h2 className="font-black">Instrucciones</h2>
              <p className="mt-1 text-sm font-bold leading-6">
                Paga por Yape, Plin o transferencia y coloca el código de pago en la descripción.
              </p>
              <p className="mt-2 text-sm font-black">Código: {data.referencia_pago}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-400">
          Este enlace solo sirve para consultar el pago. No solicita contraseñas ni datos bancarios.
        </p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
