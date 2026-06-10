import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import ReportarPagoModal from '../../components/publico/ReportarPagoModal';

type ColegioPublico = {
  id_colegio: number;
  nombre: string;
  nombre_corto?: string | null;
  codigo?: string | null;
};

type ConsultaResponse = {
  colegio: any;
  alumno: any;
  resumen: {
    total_por_pagar?: number;
    total_pendiente_programado?: number;
    total_pendiente?: number; // fallback
    cantidad_por_pagar?: number;
    cantidad_proximos?: number;
    cantidad_pagados?: number;
    cantidad_total: number;
  };
  matriculas: any[];
  pagos: any[];
  pagos_para_pagar?: any[];
  proximos_pagos?: any[];
  pagos_cubiertos?: any[];
  datos_cobro: any | null;
  instrucciones: { mensaje: string };
};

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100';

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

export default function ConsultaPagosPublicaPage() {
  const [colegios, setColegios] = useState<ColegioPublico[]>([]);
  const [colegioId, setColegioId] = useState('');
  const [dni, setDni] = useState('');
  const [loadingColegios, setLoadingColegios] = useState(true);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [data, setData] = useState<ConsultaResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [pagoAReportar, setPagoAReportar] = useState<any | null>(null);

  const pagosPorPagar = useMemo(
    () => data?.pagos_para_pagar || (data?.pagos || []).filter((pago) => pago.requiere_pago),
    [data],
  );

  const proximosPagos = useMemo(
    () => data?.proximos_pagos || [],
    [data],
  );

  const pagosPagados = useMemo(
    () => data?.pagos_cubiertos || (data?.pagos || []).filter((pago) => !pago.requiere_pago),
    [data],
  );

  useEffect(() => {
    const fetchColegios = async () => {
      setLoadingColegios(true);

      try {
        const res = await axios.get('/api/tesoreria/public/colegios');
        setColegios(res.data || []);

        if (res.data?.length === 1) {
          setColegioId(String(res.data[0].id_colegio));
        }
      } catch {
        setError('No se pudo cargar la lista de colegios.');
      } finally {
        setLoadingColegios(false);
      }
    };

    fetchColegios();
  }, []);

  const consultar = async (event?: FormEvent) => {
    event?.preventDefault();

    const dniLimpio = dni.replace(/\D/g, '');

    if (!colegioId) {
      setError('Selecciona el colegio.');
      return;
    }

    if (dniLimpio.length !== 8) {
      setError('Ingresa un DNI válido de 8 dígitos.');
      return;
    }

    setLoadingConsulta(true);
    setError('');
    setData(null);

    try {
      const params = new URLSearchParams({
        colegio_id: colegioId,
        dni: dniLimpio,
      });

      const res = await axios.get(`/api/tesoreria/public/consulta-pagos?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No encontramos pagos para los datos ingresados.',
      );
    } finally {
      setLoadingConsulta(false);
    }
  };

  const copy = async (value?: string | null, label = 'Dato') => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <WalletCards size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Portal de pagos
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-950">
                  Consulta tus pagos pendientes
                </h1>
                <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                  Ingresa el DNI del estudiante para ver pagos, códigos de pago y datos para pagar.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-700 ring-1 ring-emerald-100">
              No solicita contraseña ni datos bancarios.
            </div>
          </div>

          <form onSubmit={consultar} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              className={inputClass}
              value={colegioId}
              onChange={(event) => setColegioId(event.target.value)}
              disabled={loadingColegios}
            >
              <option value="">Selecciona colegio</option>
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre_corto || colegio.nombre}
                </option>
              ))}
            </select>

            <input
              className={inputClass}
              value={dni}
              onChange={(event) => setDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="DNI del alumno"
              inputMode="numeric"
              maxLength={8}
            />

            <button
              type="submit"
              disabled={loadingConsulta}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loadingConsulta ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Consultar
            </button>
          </form>

          {error && (
            <div className="mt-5 rounded-3xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-100">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} />
                <p className="text-sm font-black">{error}</p>
              </div>
            </div>
          )}
        </div>

        {data && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-5">
              <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Alumno
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      {fullName(data.alumno)}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {data.colegio?.nombre_corto || data.colegio?.nombre}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-rose-50 p-5 text-rose-800 ring-1 ring-rose-100">
                    <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                      Por pagar ahora
                    </p>
                    <p className="mt-1 text-3xl font-black">
                      {formatMoney(data.resumen.total_por_pagar ?? data.resumen.total_pendiente)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4">
                  <Mini label="Por pagar ahora" value={String(data.resumen.cantidad_por_pagar ?? data.resumen.cantidad_pendiente)} />
                  <Mini label="Próximos pagos" value={String(data.resumen.cantidad_proximos || 0)} />
                  <Mini label="Pagos visibles" value={String(data.resumen.cantidad_total)} />
                  <Mini label="Matrículas" value={String(data.matriculas.length)} />
                </div>
              </div>

              <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h2 className="text-lg font-black text-slate-950">Por pagar ahora</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                  Copia el código del concepto que vas a pagar y colócalo en la descripción.
                </p>

                <div className="mt-5 space-y-3">
                  {pagosPorPagar.length === 0 ? (
                    <div className="rounded-3xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-100">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={22} />
                        <div>
                          <p className="font-black">No tienes pagos vencidos ni pagos del mes actual.</p>
                          <p className="mt-1 text-sm font-bold leading-6">
                            Los conceptos visibles figuran pagados o sin saldo pendiente.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    pagosPorPagar.map((pago) => (
                      <PagoCard
                        key={pago.id_cronograma}
                        pago={pago}
                        onCopy={copy}
                        copied={copied}
                        onReport={() => setPagoAReportar(pago)}
                      />
                    ))
                  )}
                </div>
              </div>

              {proximosPagos.length > 0 && (
                <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                  <h2 className="text-lg font-black text-slate-950">Próximos pagos publicados</h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                    Estos conceptos aún no vencen. Se muestran para que puedas planificar, pero no se consideran dentro de “Por pagar ahora”.
                  </p>

                  <div className="mt-5 space-y-3">
                    {proximosPagos.map((pago) => (
                      <article key={pago.id_cronograma} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">{pago.concepto}</h3>
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                                Próximo
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-slate-500">
                              {pago.matricula?.anio} · {pago.matricula?.aula || 'Aula no indicada'} · Vence {formatDate(pago.fecha_vencimiento)}
                            </p>
                            <p className="mt-2 text-xl font-black text-slate-700">{formatMoney(pago.saldo)}</p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Código de pago
                            </p>
                            <p className="mt-1 break-all text-sm font-black text-slate-950">
                              {pago.referencia_pago || 'Sin código'}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {pagosPagados.length > 0 && (
                <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                  <h2 className="text-lg font-black text-slate-950">Pagos ya cubiertos</h2>
                  <div className="mt-4 space-y-3">
                    {pagosPagados.slice(0, 8).map((pago) => (
                      <div key={pago.id_cronograma} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-black text-slate-900">{pago.concepto}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {pago.matricula?.anio} · {pago.matricula?.aula || 'Aula no indicada'}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                            {pago.estado_pago}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <DatosCobroCard datos={data.datos_cobro} instrucciones={data.instrucciones?.mensaje} onCopy={copy} copied={copied} />

              <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-sky-700" size={22} />
                  <div>
                    <h3 className="font-black text-slate-950">Importante</h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                      Esta página solo muestra información de pago. No confirma depósitos automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {pagoAReportar && data && (
          <ReportarPagoModal
            pago={pagoAReportar}
            alumno={data.alumno}
            colegioId={colegioId}
            dni={dni}
            onClose={() => setPagoAReportar(null)}
            onSuccess={() => consultar()}
          />
        )}
      </section>
    </main>
  );
}

function PagoCard({
  pago,
  onCopy,
  copied,
  onReport,
}: {
  pago: any;
  onCopy: (value?: string | null, label?: string) => void;
  copied: string;
  onReport: () => void;
}) {
  const link = pago.referencia_pago
    ? `${window.location.origin}/pago/${pago.referencia_pago}`
    : '';

  return (
    <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{pago.concepto}</h3>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
              Pendiente
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {pago.matricula?.anio} · {pago.matricula?.aula || 'Aula no indicada'} · Vence {formatDate(pago.fecha_vencimiento)}
          </p>
          <p className="mt-2 text-2xl font-black text-rose-700">{formatMoney(pago.saldo)}</p>
        </div>

        <div className="min-w-[260px] rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            Código de pago
          </p>
          <p className="mt-1 break-all text-base font-black text-slate-950">
            {pago.referencia_pago || 'Sin código'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {pago.referencia_pago && (
              <button
                type="button"
                onClick={() => onCopy(pago.referencia_pago, pago.referencia_pago)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Copy size={16} />
                {copied === pago.referencia_pago ? 'Copiado' : 'Copiar'}
              </button>
            )}

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-sky-50 px-4 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
              >
                <ExternalLink size={16} />
                Ver detalle
              </a>
            )}

            <button
              type="button"
              onClick={onReport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
            >
              Ya realicé el pago
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function DatosCobroCard({
  datos,
  instrucciones,
  onCopy,
  copied,
}: {
  datos: any | null;
  instrucciones?: string;
  onCopy: (value?: string | null, label?: string) => void;
  copied: string;
}) {
  if (!datos) {
    return (
      <div className="rounded-[30px] bg-amber-50 p-5 text-amber-800 shadow-sm ring-1 ring-amber-100">
        <AlertCircle size={22} />
        <h3 className="mt-2 font-black">El colegio aún no configuró sus datos de cobro.</h3>
        <p className="mt-1 text-sm font-bold leading-6">
          Comunícate con el colegio para solicitar el número o cuenta de pago.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Datos para pagar
      </p>

      <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">
        <div className="flex items-start gap-3">
          <Smartphone size={20} />
          <div>
            <h3 className="font-black">Yape / Plin</h3>
            <p className="mt-1 text-sm font-bold">Destinatario: {datos.nombre_destinatario || '—'}</p>

            {datos.numero_yape && (
              <button
                type="button"
                onClick={() => onCopy(datos.numero_yape, 'yape')}
                className="mt-2 block text-left text-sm font-black"
              >
                Yape: {datos.numero_yape} {copied === 'yape' ? '· Copiado' : ''}
              </button>
            )}

            {datos.numero_plin && (
              <button
                type="button"
                onClick={() => onCopy(datos.numero_plin, 'plin')}
                className="mt-1 block text-left text-sm font-black"
              >
                Plin: {datos.numero_plin} {copied === 'plin' ? '· Copiado' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {(datos.qr_yape_url || datos.qr_plin_url) && (
        <div className="mt-4 grid gap-3">
          {datos.qr_yape_url && <QrImage title="QR Yape" url={datos.qr_yape_url} />}
          {datos.qr_plin_url && <QrImage title="QR Plin" url={datos.qr_plin_url} />}
        </div>
      )}

      {(datos.banco_1 || datos.cuenta_1 || datos.cci_1) && (
        <div className="mt-4 rounded-3xl bg-sky-50 p-4 text-sky-800 ring-1 ring-sky-100">
          <div className="flex items-start gap-3">
            <Banknote size={20} />
            <div>
              <h3 className="font-black">Transferencia</h3>
              {datos.banco_1 && <p className="mt-1 text-sm font-bold">Banco: {datos.banco_1}</p>}

              {datos.cuenta_1 && (
                <button
                  type="button"
                  onClick={() => onCopy(datos.cuenta_1, 'cuenta')}
                  className="mt-1 block text-left text-sm font-black"
                >
                  Cuenta: {datos.cuenta_1} {copied === 'cuenta' ? '· Copiado' : ''}
                </button>
              )}

              {datos.cci_1 && (
                <button
                  type="button"
                  onClick={() => onCopy(datos.cci_1, 'cci')}
                  className="mt-1 block text-left text-sm font-black"
                >
                  CCI: {datos.cci_1} {copied === 'cci' ? '· Copiado' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(datos.banco_2 || datos.cuenta_2 || datos.cci_2) && (
        <div className="mt-4 rounded-3xl bg-indigo-50 p-4 text-indigo-800 ring-1 ring-indigo-100">
          <div className="flex items-start gap-3">
            <Banknote size={20} />
            <div>
              <h3 className="font-black">Segunda cuenta</h3>
              {datos.banco_2 && <p className="mt-1 text-sm font-bold">Banco: {datos.banco_2}</p>}
              {datos.cuenta_2 && (
                <button
                  type="button"
                  onClick={() => onCopy(datos.cuenta_2, 'cuenta2')}
                  className="mt-1 block text-left text-sm font-black"
                >
                  Cuenta: {datos.cuenta_2} {copied === 'cuenta2' ? '· Copiado' : ''}
                </button>
              )}
              {datos.cci_2 && (
                <button
                  type="button"
                  onClick={() => onCopy(datos.cci_2, 'cci2')}
                  className="mt-1 block text-left text-sm font-black"
                >
                  CCI: {datos.cci_2} {copied === 'cci2' ? '· Copiado' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-100">
        <p className="text-sm font-black">Instrucción</p>
        <p className="mt-1 text-sm font-bold leading-6">
          {instrucciones || 'Coloca el código de pago en la descripción.'}
        </p>
      </div>
    </div>
  );
}

function QrImage({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 text-center ring-1 ring-slate-100">
      <QrCode className="mx-auto mb-2 text-slate-500" size={20} />
      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <img src={url} alt={title} className="mx-auto max-h-56 rounded-2xl object-contain" />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}