import { useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';

type MatriculaResultado = {
  id_matricula: number;
  codigo_matricula?: string | null;
  estado_matricula: string;
  colegio?: { nombre?: string | null; nombre_corto?: string | null } | null;
  anio?: { nombre_anio?: string | null } | null;
  estudiante?: {
    persona?: {
      dni?: string | null;
      nombres?: string | null;
      apellido_paterno?: string | null;
      apellido_materno?: string | null;
    } | null;
  } | null;
  seccion?: {
    letra?: string | null;
    grado?: {
      nombre_grado?: string | null;
      nivel?: { nombre_nivel?: string | null } | null;
    } | null;
  } | null;
};

type EstadoCuenta = {
  id_matricula: number;
  colegio?: any;
  alumno?: any;
  matricula?: any;
  resumen?: {
    total_programado?: number;
    total_pagado?: number;
    total_pendiente?: number;
    cantidad_total?: number;
    cantidad_pagados?: number;
    cantidad_pendientes?: number;
    cantidad_vencidos?: number;
    cantidad_en_revision?: number;
    cantidad_observados?: number;
  };
  deudas: any[];
  total_pendiente: number;
};

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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

const fullName = (persona: any) =>
  [persona?.nombres, persona?.apellido_paterno, persona?.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim() || '—';

const alumnoResultado = (item: MatriculaResultado) => fullName(item.estudiante?.persona);

const aulaResultado = (item: MatriculaResultado) =>
  item.seccion?.grado
    ? `${item.seccion.grado.nivel?.nombre_nivel || ''} · ${item.seccion.grado.nombre_grado || ''} ${item.seccion.letra || ''}`.trim()
    : 'Aula no indicada';

const badgeEstado = (estado: string) => {
  const value = estado || 'Pendiente';
  if (value === 'Pagado') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (value === 'Vencido') return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (value === 'Parcial') return 'bg-sky-50 text-sky-700 ring-sky-100';
  return 'bg-amber-50 text-amber-700 ring-amber-100';
};

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: any;
}) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-100">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function EstadoCuentaInternoPage() {
  const { token } = useAuth();
  const { queryParams, queryString, scopeLabel } = useSchool();

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<MatriculaResultado[]>([]);
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [error, setError] = useState('');
  const [savingVisibilityId, setSavingVisibilityId] = useState<number | null>(null);

  const deudasPorAnio = useMemo(() => {
    const grupos: Record<string, any[]> = {};
    (estado?.deudas || []).forEach((item) => {
      const anio = estado?.matricula?.anio || 'Sin año';
      if (!grupos[anio]) grupos[anio] = [];
      grupos[anio].push(item);
    });
    return grupos;
  }, [estado]);

  const buscarMatriculas = async () => {
    if (!token || q.trim().length < 2) return;

    setBuscando(true);
    setError('');
    setEstado(null);

    try {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => params.set(key, String(value)));
      params.set('q', q.trim());
      params.set('limit', '10');

      const res = await axios.get(`/api/academicos/matriculas/buscar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.data || [];
      setResultados(items);

      if (!items.length) {
        setError('No se encontraron matrículas con ese criterio.');
      }
    } catch (err: any) {
      setResultados([]);
      setError(err.response?.data?.message || 'No se pudo buscar matrículas.');
    } finally {
      setBuscando(false);
    }
  };

  const cargarEstadoCuenta = async (idMatricula: number) => {
    if (!token) return;

    setCargandoEstado(true);
    setError('');

    try {
      const res = await axios.get(`/api/tesoreria/estado-cuenta/${idMatricula}${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEstado(res.data);
    } catch (err: any) {
      setEstado(null);
      setError(err.response?.data?.message || 'No se pudo cargar el estado de cuenta.');
    } finally {
      setCargandoEstado(false);
    }
  };

  const toggleVisibilidadCronograma = async (item: any) => {
    if (!token || !estado) return;

    setSavingVisibilityId(item.id_cronograma);

    try {
      const nextVisible = !item.visible_apoderado;

      await axios.patch(
        `/api/tesoreria/cronogramas/${item.id_cronograma}/visibilidad-apoderado${queryString}`,
        { visible_apoderado: nextVisible },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await cargarEstadoCuenta(estado.id_matricula);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo actualizar la visibilidad.');
    } finally {
      setSavingVisibilityId(null);
    }
  };

  const imprimir = () => {
    if (!estado) return;
    imprimirEstadoCuentaInterno(estado);
  };

  return (
    <div className="carbon-tesoreria-page w-full space-y-6">
      <PageHeader
        eyebrow="Tesorería"
        title="Estado de cuenta interno"
        description={`Busca una matrícula y revisa su cronograma, pagos aplicados y comprobantes reportados en ${scopeLabel.toLowerCase()}.`}
        icon={FileText}
        meta={[
          { label: 'Ámbito', value: scopeLabel },
          { label: 'Vista', value: 'Administrativa' },
        ]}
      />

      <section className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Buscar alumno o matrícula
            </label>
            <div className="mt-2 flex rounded-3xl bg-slate-50 p-2 ring-1 ring-slate-100">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') buscarMatriculas();
                }}
                placeholder="DNI, código de alumno, apellidos o código de matrícula"
                className="h-12 flex-1 bg-transparent px-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={buscarMatriculas}
                disabled={buscando || q.trim().length < 2}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Buscar
              </button>
            </div>
          </div>

        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
            {error}
          </div>
        )}

        {resultados.length > 0 && (
          <div className="mt-5 grid gap-3">
            {resultados.map((item) => (
              <button
                key={item.id_matricula}
                type="button"
                onClick={() => cargarEstadoCuenta(item.id_matricula)}
                className="estado-cuenta-result-card rounded-2xl border border-slate-300 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/40"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                      <UserRound size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-950">{alumnoResultado(item)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        DNI: {item.estudiante?.persona?.dni || '—'} · {item.codigo_matricula || `MAT-${item.id_matricula}`}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {item.colegio?.nombre_corto || item.colegio?.nombre || 'Colegio'} · {item.anio?.nombre_anio || 'Año'} · {aulaResultado(item)}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {item.estado_matricula}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {cargandoEstado && (
        <div className="rounded-[34px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <Loader2 className="mx-auto animate-spin text-slate-400" />
          <p className="mt-3 text-sm font-bold text-slate-500">Cargando estado de cuenta...</p>
        </div>
      )}

      {estado && !cargandoEstado && (
        <section className="space-y-5">
          <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Matrícula seleccionada
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{fullName(estado.alumno)}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {estado.colegio?.nombre_corto || estado.colegio?.nombre || 'Colegio'} · {estado.matricula?.anio || 'Año'} · {estado.matricula?.aula || 'Aula no indicada'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={imprimir}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  <Printer size={16} />
                  Imprimir estado
                </button>

                <button
                  type="button"
                  onClick={() => (window.location.href = `/matricula/historial?id=${estado.id_matricula}`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  <ExternalLink size={16} />
                  Detalle matrícula
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Programado" value={formatMoney(estado.resumen?.total_programado || 0)} helper="Cronograma completo" icon={CalendarDays} />
              <StatCard label="Pagado" value={formatMoney(estado.resumen?.total_pagado || 0)} helper={`${estado.resumen?.cantidad_pagados || 0} conceptos cubiertos`} icon={CheckCircle2} />
              <StatCard label="Pendiente" value={formatMoney(estado.resumen?.total_pendiente || estado.total_pendiente || 0)} helper={`${estado.resumen?.cantidad_pendientes || 0} por cobrar`} icon={Banknote} />
              <StatCard label="En revisión" value={String(estado.resumen?.cantidad_en_revision || 0)} helper={`${estado.resumen?.cantidad_observados || 0} observados`} icon={ShieldCheck} />
            </div>
          </div>

          <div className="rounded-[34px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Cronograma
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Detalle de pagos, saldos y comprobantes
                </h3>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                {estado.deudas.length} conceptos
              </span>
            </div>

            <div className="mt-5 space-y-5">
              {Object.entries(deudasPorAnio).map(([anio, items]) => (
                <div key={anio} className="overflow-hidden rounded-3xl border border-slate-100">
                  <div className="bg-slate-950 px-4 py-3 text-sm font-black text-white">{anio}</div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                        <tr>
                          <th className="px-4 py-3 text-left font-black">Concepto / Código</th>
                          <th className="px-4 py-3 text-left font-black">Vence</th>
                          <th className="px-4 py-3 text-right font-black">Programado</th>
                          <th className="px-4 py-3 text-right font-black">Pagado</th>
                          <th className="px-4 py-3 text-right font-black">Saldo</th>
                          <th className="px-4 py-3 text-left font-black">Último pago</th>
                          <th className="px-4 py-3 text-left font-black">Comprobante</th>
                          <th className="px-4 py-3 text-center font-black">Estado</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {items.map((item: any) => (
                          <tr key={item.id_cronograma} className="align-top">
                            <td className="px-4 py-3">
                              <p className="font-black text-slate-900">{item.concepto}</p>
                              <p className="mt-1 text-xs font-bold text-slate-400">{item.referencia_pago || 'Sin código'}</p>
                              <p className={`mt-1 text-[11px] font-black ${
                                item.visible_apoderado ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {item.visible_apoderado ? 'Visible al apoderado' : 'No visible al apoderado'}
                              </p>
                              {item.motivo_visibilidad === 'VENTANA_5_DIAS' && (
                                <p className="mt-1 text-[11px] font-black text-sky-600">
                                  Se mostrará automáticamente por fecha próxima
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleVisibilidadCronograma(item)}
                                disabled={savingVisibilityId === item.id_cronograma}
                                className={`mt-2 inline-flex h-8 items-center rounded-xl px-3 text-[11px] font-black transition disabled:opacity-60 ${
                                  item.visible_apoderado
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100'
                                }`}
                              >
                                {savingVisibilityId === item.id_cronograma
                                  ? 'Guardando...'
                                  : item.visible_apoderado
                                    ? 'Ocultar al apoderado'
                                    : 'Hacer visible'}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-500">{formatDate(item.fecha_vencimiento)}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">{formatMoney(item.monto_programado)}</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{formatMoney(item.total_pagado)}</td>
                            <td className="px-4 py-3 text-right font-black text-rose-700">{formatMoney(item.saldo)}</td>
                            <td className="px-4 py-3">
                              {item.ultimo_pago ? (
                                <>
                                  <p className="font-black text-slate-800">{formatMoney(item.ultimo_pago.monto_pagado)}</p>
                                  <p className="text-xs font-bold text-slate-400">{formatDateTime(item.ultimo_pago.fecha_pago)}</p>
                                  <p className="text-xs font-bold text-slate-400">{item.ultimo_pago.metodo_pago || '—'} · {item.ultimo_pago.nro_operacion || 'Sin operación'}</p>
                                </>
                              ) : (
                                <span className="font-bold text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {item.ultimo_reporte ? (
                                <>
                                  <p className="font-black text-slate-800">{item.ultimo_reporte.estado}</p>
                                  <p className="text-xs font-bold text-slate-400">{formatMoney(item.ultimo_reporte.monto_recibido)}</p>
                                  <p className="text-xs font-bold text-slate-400">{item.ultimo_reporte.numero_operacion || 'Sin operación'}</p>
                                </>
                              ) : (
                                <span className="font-bold text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${badgeEstado(item.estado)}`}>
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!estado && !cargandoEstado && resultados.length === 0 && (
        <div className="rounded-[34px] bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
          <WalletCards className="mx-auto text-slate-300" size={42} />
          <h3 className="mt-3 text-lg font-black text-slate-900">Busca una matrícula</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
            Ingresa DNI, nombres, apellidos o código de matrícula para revisar su estado de cuenta interno.
          </p>
        </div>
      )}
    </div>
  );
}

function imprimirEstadoCuentaInterno(estado: EstadoCuenta) {
  const alumno = fullName(estado.alumno);
  const colegio = estado.colegio?.nombre || estado.colegio?.nombre_corto || 'Institución educativa';
  const filas = (estado.deudas || [])
    .map((item) => `
      <tr>
        <td><strong>${item.concepto}</strong><br/><small>${item.referencia_pago || 'Sin código'}</small></td>
        <td>${formatDate(item.fecha_vencimiento)}</td>
        <td class="num">${formatMoney(item.monto_programado)}</td>
        <td class="num paid">${formatMoney(item.total_pagado)}</td>
        <td class="num pending">${formatMoney(item.saldo)}</td>
        <td>${item.ultimo_pago?.fecha_pago ? formatDate(item.ultimo_pago.fecha_pago) : '—'}</td>
        <td>${item.estado}</td>
      </tr>
    `)
    .join('');

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Estado de cuenta interno</title>
      <style>
        @page { size: A4; margin: 9mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
        header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; text-align: center; }
        h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
        h2 { margin: 4px 0 0; font-size: 14px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; }
        .info { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; }
        .label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 900; letter-spacing: .12em; }
        .value { margin-top: 4px; font-size: 13px; font-weight: 900; }
        .summary { margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10px; }
        th { background: #f1f5f9; padding: 7px; text-align: left; font-size: 8px; text-transform: uppercase; color: #64748b; border: 1px solid #cbd5e1; }
        td { padding: 7px; border: 1px solid #e2e8f0; vertical-align: top; font-weight: 700; }
        small { color: #64748b; font-weight: 700; }
        .num { text-align: right; white-space: nowrap; }
        .paid { color: #047857; }
        .pending { color: #be123c; }
        footer { margin-top: 18px; display: grid; grid-template-columns: 1fr 220px; gap: 16px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 10px; color: #475569; }
        .firma { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; text-align: center; }
        .linea { margin-top: 38px; border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: 800; }
      </style>
    </head>
    <body>
      <header>
        <h1>${colegio}</h1>
        <h2>Estado de cuenta interno</h2>
      </header>

      <section class="info">
        <div class="box"><div class="label">Alumno</div><div class="value">${alumno}</div></div>
        <div class="box"><div class="label">DNI</div><div class="value">${estado.alumno?.dni || '—'}</div></div>
        <div class="box"><div class="label">Matrícula</div><div class="value">${estado.matricula?.codigo_matricula || '—'}</div></div>
        <div class="box"><div class="label">Aula</div><div class="value">${estado.matricula?.nivel || '—'} · ${estado.matricula?.aula || '—'}</div></div>
      </section>

      <section class="summary">
        <div class="box"><div class="label">Programado</div><div class="value">${formatMoney(estado.resumen?.total_programado || 0)}</div></div>
        <div class="box"><div class="label">Pagado</div><div class="value">${formatMoney(estado.resumen?.total_pagado || 0)}</div></div>
        <div class="box"><div class="label">Pendiente</div><div class="value">${formatMoney(estado.resumen?.total_pendiente || 0)}</div></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Concepto / código</th>
            <th>Vence</th>
            <th>Programado</th>
            <th>Pagado</th>
            <th>Saldo</th>
            <th>Último pago</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <footer>
        <p>Documento interno generado desde Tesorería. Los importes reflejan el cronograma y pagos registrados en el sistema al momento de impresión.</p>
        <div class="firma">
          <strong>Área administrativa</strong>
          <div class="linea">Firma / sello</div>
        </div>
      </footer>
      <script>
        window.onload = () => setTimeout(() => window.print(), 250);
        window.onafterprint = () => window.close();
      </script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=950,height=1200');
  if (!win) {
    alert('Permite ventanas emergentes para imprimir el estado de cuenta.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}