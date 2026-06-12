import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  WalletCards,
  X,
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
  estado_cuenta?: {
    total_programado?: number;
    total_pagado?: number;
    saldo_pendiente?: number;
    cantidad_total?: number;
    cantidad_pagados?: number;
    cantidad_pendientes?: number;
    cantidad_vencidos?: number;
    cantidad_proximos?: number;
    cantidad_en_revision?: number;
    cantidad_observados?: number;
    cantidad_rechazados?: number;
    anios?: string[];
    generado_en?: string;
  };
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
  const [constanciaPago, setConstanciaPago] = useState<any | null>(null);
  const [estadoCuentaOpen, setEstadoCuentaOpen] = useState(false);

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
                  <Mini label="Por pagar ahora" value={String(data.resumen.cantidad_por_pagar ?? 0)} />
                  <Mini label="Próximos pagos" value={String(data.resumen.cantidad_proximos || 0)} />
                  <Mini label="Pagos visibles" value={String(data.resumen.cantidad_total)} />
                  <Mini label="Matrículas" value={String(data.matriculas.length)} />
                </div>
              </div>

              {data.estado_cuenta && (
                <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Estado de cuenta
                      </p>
                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        Resumen financiero del estudiante
                      </h2>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                        Vista general de pagos programados, pagados y pendientes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEstadoCuentaOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      <FileText size={16} />
                      Imprimir estado
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Mini label="Programado" value={formatMoney(data.estado_cuenta.total_programado || 0)} />
                    <Mini label="Pagado" value={formatMoney(data.estado_cuenta.total_pagado || 0)} />
                    <Mini label="Pendiente" value={formatMoney(data.estado_cuenta.saldo_pendiente || 0)} />
                    <Mini label="Vencidos" value={String(data.estado_cuenta.cantidad_vencidos || 0)} />
                  </div>

                  <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Mini label="En revisión" value={String(data.estado_cuenta.cantidad_en_revision || 0)} />
                    <Mini label="Observados" value={String(data.estado_cuenta.cantidad_observados || 0)} />
                    <Mini label="Próximos" value={String(data.estado_cuenta.cantidad_proximos || 0)} />
                    <Mini label="Pagados" value={String(data.estado_cuenta.cantidad_pagados || 0)} />
                  </div>
                </div>
              )}

              <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h2 className="text-lg font-black text-slate-950">Por pagar ahora</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                  Copia el código para pagar. Si ya enviaste tu comprobante, verás el estado "En revisión".
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
                    Estos conceptos aún no vencen. Se muestran para que puedas planificar, pero no se consideran dentro de "Por pagar ahora".
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
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-900">{pago.concepto}</p>
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                                {pago.estado_pago}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {pago.matricula?.anio} · {pago.matricula?.aula || 'Aula no indicada'}
                            </p>

                            {pago.ultimo_pago && (
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                Recibo: {pago.ultimo_pago.codigo_recibo} · Pagado: {formatMoney(pago.ultimo_pago.monto_pagado)} · {formatDate(pago.ultimo_pago.fecha_pago)}
                              </p>
                            )}
                          </div>

                          {pago.ultimo_pago && (
                            <button
                              type="button"
                              onClick={() => setConstanciaPago(pago)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                            >
                              <ReceiptText size={16} />
                              Ver constancia
                            </button>
                          )}
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

        {constanciaPago && data && (
          <ConstanciaPagoModal
            pago={constanciaPago}
            alumno={data.alumno}
            colegio={data.colegio}
            onClose={() => setConstanciaPago(null)}
          />
        )}

        {estadoCuentaOpen && data && (
          <EstadoCuentaModal
            data={data}
            onClose={() => setEstadoCuentaOpen(false)}
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
            {pago.en_revision ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                Comprobante en revisión
              </span>
            ) : pago.reporte_observado ? (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                Comprobante observado
              </span>
            ) : pago.reporte_rechazado ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                Comprobante rechazado
              </span>
            ) : (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                Pendiente
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {pago.matricula?.anio} · {pago.matricula?.aula || 'Aula no indicada'} · Vence {formatDate(pago.fecha_vencimiento)}
          </p>
          <p className="mt-2 text-2xl font-black text-rose-700">{formatMoney(pago.saldo)}</p>

          {pago.reporte_pago && (
            <div
              className={`mt-3 rounded-2xl p-3 ring-1 ${
                pago.en_revision
                  ? 'bg-amber-50 text-amber-800 ring-amber-100'
                  : pago.reporte_observado
                    ? 'bg-orange-50 text-orange-800 ring-orange-100'
                    : pago.reporte_rechazado
                      ? 'bg-rose-50 text-rose-800 ring-rose-100'
                      : 'bg-slate-50 text-slate-700 ring-slate-100'
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
                {pago.en_revision
                  ? 'Reporte recibido'
                  : pago.reporte_observado
                    ? 'Reporte observado'
                    : pago.reporte_rechazado
                      ? 'Reporte rechazado'
                      : 'Reporte'}
              </p>

              <p className="mt-1 text-sm font-bold leading-5">
                {pago.en_revision
                  ? 'El colegio está revisando el comprobante enviado.'
                  : pago.reporte_observado
                    ? 'El colegio observó el comprobante. Puedes corregirlo y enviarlo nuevamente.'
                    : pago.reporte_rechazado
                      ? 'El colegio rechazó este reporte. Puedes enviar un nuevo comprobante.'
                      : 'Revisa el estado del reporte.'}
              </p>

              {pago.reporte_pago.observacion && (
                <p className="mt-2 rounded-xl bg-white/70 p-2 text-xs font-black">
                  Observación: {pago.reporte_pago.observacion}
                </p>
              )}

              <p className="mt-1 text-xs font-black">
                Operación: {pago.reporte_pago.numero_operacion || 'No indicada'}
              </p>
            </div>
          )}
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

            {pago.en_revision ? (
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 text-sm font-black text-amber-700 ring-1 ring-amber-100 opacity-80"
              >
                En revisión
              </button>
            ) : (
              <button
                type="button"
                onClick={onReport}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ring-1 transition ${
                  pago.reporte_observado || pago.reporte_rechazado
                    ? 'bg-orange-50 text-orange-700 ring-orange-100 hover:bg-orange-100'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100'
                }`}
              >
                {pago.reporte_observado
                  ? 'Corregir comprobante'
                  : pago.reporte_rechazado
                    ? 'Enviar nuevo comprobante'
                    : 'Ya realicé el pago'}
              </button>
            )}
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

function ConstanciaPagoModal({
  pago,
  alumno,
  colegio,
  onClose,
}: {
  pago: any;
  alumno: any;
  colegio: any;
  onClose: () => void;
}) {
  const recibo = pago.ultimo_pago;

  const imprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm print:static print:bg-white print:p-0">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-100 print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <ReceiptText size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Constancia de pago
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {recibo?.codigo_recibo || 'Recibo de pago'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-5 print:mt-0 print:border-slate-300">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Institución
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                {colegio?.nombre_corto || colegio?.nombre || 'Colegio'}
              </h3>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Constancia emitida desde el portal de pagos.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
                Estado
              </p>
              <p className="mt-1 text-sm font-black">Pagado</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoPublic label="Recibo" value={recibo?.codigo_recibo || '—'} />
            <InfoPublic label="Fecha de pago" value={formatDate(recibo?.fecha_pago)} />
            <InfoPublic label="Alumno" value={fullName(alumno)} />
            <InfoPublic label="Concepto" value={pago.concepto} />
            <InfoPublic label="Código de pago" value={pago.referencia_pago || '—'} />
            <InfoPublic label="Aula" value={pago.matricula?.aula || '—'} />
            <InfoPublic label="Método" value={recibo?.metodo_pago || '—'} />
            <InfoPublic label="Operación" value={recibo?.nro_operacion || '—'} />
          </div>

          <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Monto pagado
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatMoney(recibo?.monto_pagado || pago.pagado)}
            </p>
          </div>

          <p className="mt-5 text-xs font-bold leading-5 text-slate-400">
            Esta constancia refleja un pago registrado en el sistema. Para trámites administrativos, la institución puede validar el código de recibo.
          </p>
        </section>

        <div className="mt-5 flex flex-wrap justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={imprimir}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Printer size={16} />
            Imprimir / guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function EstadoCuentaModal({
  data,
  onClose,
}: {
  data: ConsultaResponse;
  onClose: () => void;
}) {
  const estadoCuenta = data.estado_cuenta;
  const pagos = data.pagos || [];

  const imprimir = () => imprimirEstadoCuentaPdf(data);

  const nombreColegio = data.colegio?.nombre || data.colegio?.nombre_corto || 'Institución educativa';
  const nombreCorto = data.colegio?.nombre_corto || nombreColegio;
  const nombreAlumno = fullName(data.alumno);
  const totalPendiente = Number(estadoCuenta?.saldo_pendiente || 0);

  const pagosPorAnio = pagos.reduce((acc: Record<string, any[]>, pago: any) => {
    const anio = pago.matricula?.anio || 'Sin año';
    if (!acc[anio]) acc[anio] = [];
    acc[anio].push(pago);
    return acc;
  }, {});

  const estadoPagoLabel = (pago: any) => {
    if (!pago.requiere_pago) return 'Pagado';
    if (pago.en_revision) return 'En revisión';
    if (pago.reporte_observado) return 'Observado';
    if (pago.reporte_rechazado) return 'Rechazado';
    return pago.estado_pago || 'Pendiente';
  };

  const estadoPagoClass = (pago: any) => {
    if (!pago.requiere_pago) return 'text-emerald-700';
    if (pago.en_revision) return 'text-amber-700';
    if (pago.reporte_observado) return 'text-orange-700';
    if (pago.reporte_rechazado) return 'text-rose-700';
    return 'text-slate-700';
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }

            html,
            body {
              background: #ffffff !important;
            }

            body * {
              visibility: hidden !important;
            }

            #estado-cuenta-print,
            #estado-cuenta-print * {
              visibility: visible !important;
            }

            #estado-cuenta-print {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
            }

            .no-print {
              display: none !important;
            }

            .print-section {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-keep {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .print-row {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            table {
              page-break-inside: auto;
              border-collapse: collapse;
            }

            tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}
      </style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm">
        <div className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-100">
          <div className="no-print flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Estado de cuenta
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {nombreAlumno}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <section id="estado-cuenta-print" className="mt-6 bg-white text-slate-950 print:mt-0">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4 print:rounded-none print:border-0 print:p-0">
              <div className="grid grid-cols-[72px_1fr_86px] items-start gap-3 border-b-[3px] border-sky-900 pb-3">
                <div className="flex justify-center">
                  {data.colegio?.logo_url ? (
                    <img
                      src={data.colegio.logo_url}
                      alt="Logo institucional"
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center border border-slate-300 bg-slate-50 text-base font-black text-slate-500">
                      IE
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-base font-black uppercase tracking-wide text-slate-700">
                    Colegio Privado
                  </p>
                  <h1 className="mt-0.5 text-3xl font-black uppercase tracking-wide text-sky-900">
                    {nombreCorto}
                  </h1>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Estado de cuenta escolar
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-700">
                    {estadoCuenta?.anios?.join(' · ') || 'Año escolar'}
                  </p>
                </div>

                <div className="h-16 border border-slate-400 bg-white" />
              </div>

              <div className="print-keep mt-3 grid grid-cols-[1fr_170px] gap-3">
                <div className="overflow-hidden rounded-2xl border border-slate-300">
                  <div className="grid grid-cols-[120px_1fr_90px_1fr] border-b border-slate-300 text-xs">
                    <div className="bg-slate-100 px-3 py-2 font-black text-slate-600">Código</div>
                    <div className="px-3 py-2 font-bold">{data.matriculas?.[0]?.codigo_matricula || '—'}</div>
                    <div className="bg-slate-100 px-3 py-2 font-black text-slate-600">DNI</div>
                    <div className="px-3 py-2 font-bold">{data.alumno?.dni || '—'}</div>
                  </div>

                  <div className="grid grid-cols-[150px_1fr] border-b border-slate-300 text-xs">
                    <div className="bg-slate-100 px-3 py-2 font-black text-slate-600">Apellidos y nombres</div>
                    <div className="px-3 py-2 font-bold uppercase">{nombreAlumno}</div>
                  </div>

                  <div className="grid grid-cols-[120px_1fr_90px_1fr] text-xs">
                    <div className="bg-slate-100 px-3 py-2 font-black text-slate-600">Nivel / aula</div>
                    <div className="px-3 py-2 font-bold">
                      {data.matriculas?.[0]?.nivel || '—'} · {data.matriculas?.[0]?.aula || '—'}
                    </div>
                    <div className="bg-slate-100 px-3 py-2 font-black text-slate-600">Emitido</div>
                    <div className="px-3 py-2 font-bold">{formatDate(estadoCuenta?.generado_en)}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950 p-3 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                    Saldo pendiente
                  </p>
                  <p className="mt-1 text-2xl font-black">{formatMoney(totalPendiente)}</p>
                  <p className="mt-2 text-xs font-bold text-white/60">
                    Al {formatDate(estadoCuenta?.generado_en)}
                  </p>
                </div>
              </div>

              <div className="print-keep mt-3 grid grid-cols-4 gap-2">
                <ResumenBanco label="Total programado" value={formatMoney(estadoCuenta?.total_programado || 0)} />
                <ResumenBanco label="Total pagado" value={formatMoney(estadoCuenta?.total_pagado || 0)} />
                <ResumenBanco label="Total pendiente" value={formatMoney(estadoCuenta?.saldo_pendiente || 0)} />
                <ResumenBanco label="Pagos vencidos" value={String(estadoCuenta?.cantidad_vencidos || 0)} />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Detalle de movimientos
                    </p>
                    <h2 className="text-lg font-black text-slate-950">
                      Cronograma de pagos por año escolar
                    </h2>
                  </div>

                  <p className="text-xs font-bold text-slate-500">
                    Total conceptos: {pagos.length}
                  </p>
                </div>

                {Object.entries(pagosPorAnio).map(([anio, items]) => (
                  <div key={anio} className="mb-3 overflow-hidden rounded-2xl border border-slate-300">
                    <div className="bg-sky-900 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                      {anio}
                    </div>

                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-100 text-[9px] uppercase tracking-[0.06em] text-slate-600">
                        <tr>
                          <th className="w-[28%] px-3 py-1.5 text-left font-black">Concepto / código</th>
                          <th className="w-[11%] px-2 py-1.5 text-left font-black">Vence</th>
                          <th className="w-[12%] px-2 py-1.5 text-right font-black">Importe</th>
                          <th className="w-[12%] px-2 py-1.5 text-right font-black">Pagado</th>
                          <th className="w-[12%] px-2 py-1.5 text-right font-black">Pendiente</th>
                          <th className="w-[12%] px-2 py-1.5 text-left font-black">Fecha pago</th>
                          <th className="w-[13%] px-2 py-1.5 text-center font-black">Estado</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {items.map((pago: any) => (
                          <tr key={pago.id_cronograma} className="print-row align-top">
                            <td className="px-3 py-1.5">
                              <p className="font-black text-slate-950">{pago.concepto}</p>
                              <p className="mt-0.5 font-bold text-slate-500">
                                {pago.referencia_pago || 'Sin código'} · {pago.matricula?.aula || 'Aula no indicada'}
                              </p>
                            </td>
                            <td className="px-2 py-1.5 font-bold text-slate-600">{formatDate(pago.fecha_vencimiento)}</td>
                            <td className="px-2 py-1.5 text-right font-black text-slate-800">{formatMoney(pago.monto)}</td>
                            <td className="px-2 py-1.5 text-right font-black text-emerald-700">{formatMoney(pago.pagado || 0)}</td>
                            <td className="px-2 py-1.5 text-right font-black text-rose-700">{formatMoney(pago.saldo || 0)}</td>
                            <td className="px-2 py-1.5 font-bold text-slate-600">
                              {pago.ultimo_pago?.fecha_pago ? formatDate(pago.ultimo_pago.fecha_pago) : '—'}
                            </td>
                            <td className={`px-2 py-1.5 text-center font-black ${estadoPagoClass(pago)}`}>
                              {estadoPagoLabel(pago)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <div className="print-keep mt-4 grid gap-3 border-t border-slate-300 pt-3 md:grid-cols-[1fr_230px]">
                <p className="text-xs font-bold leading-5 text-slate-600">
                  Este estado de cuenta es informativo y refleja los importes programados, pagos registrados y saldos pendientes visibles en el portal de pagos.
                  Para validación administrativa, la institución puede contrastar códigos de pago, recibos y operaciones asociadas.
                </p>

                <div className="rounded-2xl border border-slate-300 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Área administrativa
                  </p>
                  <div className="mt-6 border-t border-slate-400 pt-2 text-xs font-bold text-slate-600">
                    Firma / sello
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="no-print mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={imprimir}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Printer size={16} />
              Imprimir / guardar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ResumenBanco({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.10em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoPublic({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 print:bg-white print:ring-slate-200">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{value || '—'}</p>
    </div>
  );
}

// ── Helper para imprimir estado de cuenta como documento independiente ──
function imprimirEstadoCuentaPdf(data: ConsultaResponse) {
  const estadoCuenta = data.estado_cuenta;
  const pagos = data.pagos || [];

  const escapeHtml = (value: any) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const nombreColegio = data.colegio?.nombre || data.colegio?.nombre_corto || 'Institución educativa';
  const nombreCorto = data.colegio?.nombre_corto || nombreColegio;
  const nombreAlumno = fullName(data.alumno);
  const totalPendiente = Number(estadoCuenta?.saldo_pendiente || 0);

  const estadoPagoLabel = (pago: any) => {
    if (!pago.requiere_pago) return 'Pagado';
    if (pago.en_revision) return 'En revisión';
    if (pago.reporte_observado) return 'Observado';
    if (pago.reporte_rechazado) return 'Rechazado';
    return pago.estado_pago || 'Pendiente';
  };

  const estadoClass = (pago: any) => {
    if (!pago.requiere_pago) return 'ok';
    if (pago.en_revision) return 'warn';
    if (pago.reporte_observado) return 'orange';
    if (pago.reporte_rechazado) return 'bad';
    return 'neutral';
  };

  const pagosPorAnio = pagos.reduce((acc: Record<string, any[]>, pago: any) => {
    const anio = pago.matricula?.anio || 'Sin año';
    if (!acc[anio]) acc[anio] = [];
    acc[anio].push(pago);
    return acc;
  }, {});

  const logo = data.colegio?.logo_url
    ? `<img src="${escapeHtml(data.colegio.logo_url)}" alt="Logo institucional" class="logo-img" />`
    : `<div class="logo-box">IE</div>`;

  const tablas = Object.entries(pagosPorAnio).map(([anio, items]) => {
    const rows = items.map((pago: any) => {
      const fechaPago = pago.ultimo_pago?.fecha_pago ? formatDate(pago.ultimo_pago.fecha_pago) : '—';

      return `
        <tr>
          <td class="concepto">
            <strong>${escapeHtml(pago.concepto)}</strong>
            <small>${escapeHtml(pago.referencia_pago || 'Sin código')} · ${escapeHtml(pago.matricula?.aula || 'Aula no indicada')}</small>
          </td>
          <td>${escapeHtml(formatDate(pago.fecha_vencimiento))}</td>
          <td class="num">${escapeHtml(formatMoney(pago.monto))}</td>
          <td class="num paid">${escapeHtml(formatMoney(pago.pagado || 0))}</td>
          <td class="num pending">${escapeHtml(formatMoney(pago.saldo || 0))}</td>
          <td>${escapeHtml(fechaPago)}</td>
          <td class="state ${estadoClass(pago)}">${escapeHtml(estadoPagoLabel(pago))}</td>
        </tr>
      `;
    }).join('');

    return `
      <section class="year-section">
        <div class="year-title">${escapeHtml(anio)}</div>
        <table>
          <thead>
            <tr>
              <th>Concepto / código</th>
              <th>Vence</th>
              <th class="num">Importe</th>
              <th class="num">Pagado</th>
              <th class="num">Pendiente</th>
              <th>Fecha pago</th>
              <th class="center">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estado de cuenta - ${escapeHtml(nombreAlumno)}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .document { width: 100%; background: #fff; }
    .header { display: grid; grid-template-columns: 76px 1fr 90px; gap: 12px; align-items: start; padding-bottom: 10px; border-bottom: 3px solid #075985; }
    .logo-box,.photo-box { height: 66px; border: 1px solid #94a3b8; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #475569; background: #f8fafc; }
    .logo-img { width: 66px; height: 66px; object-fit: contain; }
    .school { text-align: center; }
    .school .type { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #334155; letter-spacing: .04em; }
    .school .name { margin-top: 2px; font-size: 28px; line-height: 1; font-weight: 900; color: #075985; text-transform: uppercase; letter-spacing: .04em; }
    .school .doc { margin-top: 5px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: .22em; }
    .school .years { margin-top: 4px; font-size: 11px; font-weight: 900; color: #334155; }
    .info-row { display: grid; grid-template-columns: 1fr 176px; gap: 10px; margin-top: 10px; break-inside: avoid; }
    .student-table { border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
    .student-line { display: grid; grid-template-columns: 115px 1fr 80px 1fr; border-bottom: 1px solid #cbd5e1; min-height: 26px; font-size: 10px; }
    .student-line:last-child { border-bottom: 0; }
    .student-label { background: #f1f5f9; padding: 7px 9px; font-weight: 900; color: #475569; }
    .student-value { padding: 7px 9px; font-weight: 800; }
    .balance { background: #020617; color: #fff; border-radius: 10px; padding: 12px; min-height: 86px; }
    .balance small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .16em; color: rgba(255,255,255,.62); font-weight: 900; }
    .balance strong { display: block; margin-top: 6px; font-size: 25px; line-height: 1; font-weight: 900; }
    .balance span { display: block; margin-top: 8px; font-size: 10px; color: rgba(255,255,255,.65); font-weight: 800; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; break-inside: avoid; }
    .summary-card { border: 1px solid #cbd5e1; border-radius: 9px; padding: 9px; background: #f8fafc; }
    .summary-card small { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .16em; color: #64748b; font-weight: 900; }
    .summary-card strong { display: block; margin-top: 5px; font-size: 12px; color: #020617; font-weight: 900; }
    .section-head { margin-top: 13px; display: flex; justify-content: space-between; align-items: end; break-inside: avoid; }
    .section-head small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .18em; color: #64748b; font-weight: 900; }
    .section-head h2 { margin: 3px 0 0; font-size: 15px; line-height: 1.1; color: #020617; }
    .total-concepts { font-size: 10px; color: #64748b; font-weight: 800; }
    .year-section { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; page-break-inside: auto; }
    .year-title { background: #075985; color: white; padding: 7px 10px; font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    thead { display: table-header-group; background: #f1f5f9; }
    th { padding: 6px 7px; text-align: left; color: #475569; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #cbd5e1; }
    td { padding: 6px 7px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-weight: 800; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .concepto strong { display: block; font-size: 9.5px; color: #020617; }
    .concepto small { display: block; margin-top: 2px; font-size: 8.5px; color: #64748b; font-weight: 900; }
    .num { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    .paid { color: #047857; }
    .pending { color: #be123c; }
    .state { text-align: center; font-size: 9px; white-space: nowrap; font-weight: 900; }
    .state.ok { color: #047857; }
    .state.warn { color: #b45309; }
    .state.orange { color: #c2410c; }
    .state.bad { color: #be123c; }
    .state.neutral { color: #334155; }
    .footer { margin-top: 12px; display: grid; grid-template-columns: 1fr 220px; gap: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; break-inside: avoid; page-break-inside: avoid; }
    .note { font-size: 10px; line-height: 1.5; color: #475569; font-weight: 800; }
    .signature { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 14px 10px; text-align: center; min-height: 78px; }
    .signature small { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .18em; color: #64748b; font-weight: 900; }
    .signature div { margin-top: 28px; border-top: 1px solid #94a3b8; padding-top: 7px; font-size: 10px; font-weight: 800; color: #475569; }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div>${logo}</div>
      <div class="school">
        <div class="type">Colegio Privado</div>
        <div class="name">${escapeHtml(nombreCorto)}</div>
        <div class="doc">Estado de cuenta escolar</div>
        <div class="years">${escapeHtml(estadoCuenta?.anios?.join(' · ') || 'Año escolar')}</div>
      </div>
      <div class="photo-box"></div>
    </header>

    <section class="info-row">
      <div class="student-table">
        <div class="student-line">
          <div class="student-label">Código</div>
          <div class="student-value">${escapeHtml(data.matriculas?.[0]?.codigo_matricula || '—')}</div>
          <div class="student-label">DNI</div>
          <div class="student-value">${escapeHtml(data.alumno?.dni || '—')}</div>
        </div>
        <div class="student-line" style="grid-template-columns: 150px 1fr;">
          <div class="student-label">Apellidos y nombres</div>
          <div class="student-value">${escapeHtml(nombreAlumno.toUpperCase())}</div>
        </div>
        <div class="student-line">
          <div class="student-label">Nivel / aula</div>
          <div class="student-value">${escapeHtml(data.matriculas?.[0]?.nivel || '—')} · ${escapeHtml(data.matriculas?.[0]?.aula || '—')}</div>
          <div class="student-label">Emitido</div>
          <div class="student-value">${escapeHtml(formatDate(estadoCuenta?.generado_en))}</div>
        </div>
      </div>

      <div class="balance">
        <small>Saldo pendiente</small>
        <strong>${escapeHtml(formatMoney(totalPendiente))}</strong>
        <span>Al ${escapeHtml(formatDate(estadoCuenta?.generado_en))}</span>
      </div>
    </section>

    <section class="summary">
      <div class="summary-card"><small>Total programado</small><strong>${escapeHtml(formatMoney(estadoCuenta?.total_programado || 0))}</strong></div>
      <div class="summary-card"><small>Total pagado</small><strong>${escapeHtml(formatMoney(estadoCuenta?.total_pagado || 0))}</strong></div>
      <div class="summary-card"><small>Total pendiente</small><strong>${escapeHtml(formatMoney(estadoCuenta?.saldo_pendiente || 0))}</strong></div>
      <div class="summary-card"><small>Pagos vencidos</small><strong>${escapeHtml(String(estadoCuenta?.cantidad_vencidos || 0))}</strong></div>
    </section>

    <section class="section-head">
      <div>
        <small>Detalle de movimientos</small>
        <h2>Cronograma de pagos por año escolar</h2>
      </div>
      <div class="total-concepts">Total conceptos: ${escapeHtml(String(pagos.length))}</div>
    </section>

    ${tablas}

    <footer class="footer">
      <p class="note">
        Este estado de cuenta es informativo y refleja los importes programados, pagos registrados y saldos pendientes visibles en el portal de pagos.
        Para validación administrativa, la institución puede contrastar códigos de pago, recibos y operaciones asociadas.
      </p>
      <div class="signature">
        <small>Área administrativa</small>
        <div>Firma / sello</div>
      </div>
    </footer>
  </main>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 300);
    };
    window.onafterprint = function () {
      window.close();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=950,height=1200');

  if (!printWindow) {
    alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para generar el PDF.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}