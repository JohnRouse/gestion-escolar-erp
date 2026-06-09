import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
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

        {data.datos_cobro ? (
          <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Datos para realizar el pago
            </p>

            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">
              <div className="flex items-start gap-3">
                <Smartphone size={20} />
                <div>
                  <h2 className="font-black">Yape / Plin</h2>
                  <p className="mt-1 text-sm font-bold">
                    Destinatario: {data.datos_cobro.nombre_destinatario || '—'}
                  </p>
                  {data.datos_cobro.numero_yape && (
                    <p className="mt-1 text-sm font-black">Yape: {data.datos_cobro.numero_yape}</p>
                  )}
                  {data.datos_cobro.numero_plin && (
                    <p className="mt-1 text-sm font-black">Plin: {data.datos_cobro.numero_plin}</p>
                  )}
                </div>
              </div>
            </div>

            {(data.datos_cobro.qr_yape_url || data.datos_cobro.qr_plin_url) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.datos_cobro.qr_yape_url && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
                    <QrCode className="mx-auto mb-2 text-slate-500" size={20} />
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      QR Yape
                    </p>
                    <img src={data.datos_cobro.qr_yape_url} alt="QR Yape" className="mx-auto max-h-56 rounded-2xl object-contain" />
                  </div>
                )}
                {data.datos_cobro.qr_plin_url && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
                    <QrCode className="mx-auto mb-2 text-slate-500" size={20} />
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      QR Plin
                    </p>
                    <img src={data.datos_cobro.qr_plin_url} alt="QR Plin" className="mx-auto max-h-56 rounded-2xl object-contain" />
                  </div>
                )}
              </div>
            )}

            {(data.datos_cobro.banco_1 || data.datos_cobro.cuenta_1 || data.datos_cobro.cci_1) && (
              <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sky-800 ring-1 ring-sky-100">
                <div className="flex items-start gap-3">
                  <Banknote size={20} />
                  <div>
                    <h2 className="font-black">Transferencia bancaria</h2>
                    {data.datos_cobro.banco_1 && <p className="mt-1 text-sm font-bold">Banco: {data.datos_cobro.banco_1}</p>}
                    {data.datos_cobro.cuenta_1 && <p className="mt-1 text-sm font-black">Cuenta: {data.datos_cobro.cuenta_1}</p>}
                    {data.datos_cobro.cci_1 && <p className="mt-1 text-sm font-black">CCI: {data.datos_cobro.cci_1}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl bg-amber-50 p-5 text-amber-800 ring-1 ring-amber-100">
            <p className="text-sm font-black">El colegio aún no configuró sus datos de cobro.</p>
            <p className="mt-1 text-sm font-bold leading-6">
              Comunícate con el colegio para solicitar el número o cuenta de pago.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-3xl bg-sky-50 p-5 text-sky-800 ring-1 ring-sky-100">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} />
            <div>
              <h2 className="font-black">Instrucciones</h2>
              <p className="mt-1 text-sm font-bold leading-6">
                {data.datos_cobro?.instrucciones ||
                  'Realiza el pago por Yape, Plin o transferencia y coloca el código de pago en la descripción.'}
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