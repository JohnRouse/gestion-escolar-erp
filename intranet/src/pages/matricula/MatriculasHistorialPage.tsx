import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Users,
  X,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Banknote,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../contexts/ToastContext';

// ─── Interfaces ──────────────────────────────────────────
interface CodigoColegio {
  id_estudiante: number;
  id_colegio: number;
  codigo: string;
}

interface MatriculaItem {
  id_matricula: number;
  codigo_matricula?: string | null;
  fecha_matricula: string;
  estado_matricula: string;
  id_colegio?: number | null;
  colegio?: { nombre: string };
  anio?: { nombre_anio: string };
  registrado_por?: {
    username: string;
    persona?: {
      nombres: string;
      apellido_paterno: string;
    };
  } | null;
  estudiante: {
    codigo_estudiante?: string;
    codigos_colegio?: CodigoColegio[];
    persona: {
      dni: string;
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    };
    apoderados?: {
      parentesco: string;
      apoderado: {
        persona: {
          dni: string;
          nombres: string;
          apellido_paterno: string;
          telefono?: string | null;
        };
      };
    }[];
  };
  seccion: {
    letra: string;
    grado: {
      nombre_grado: string;
      nivel?: { nombre_nivel: string };
    };
  };
  tipo_ingreso?: string;
  colegio_procedencia?: string | null;
  codigo_modular_procedencia?: string | null;
  grado_procedencia?: string | null;
  observacion_procedencia?: string | null;
  estado_revision?: string;
  fecha_revision?: string | null;
  observacion_revision?: string | null;
  revisado_por?: {
    persona?: {
      nombres: string;
      apellido_paterno: string;
    };
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────
const formatFechaHora = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatNumeroMatricula = (detalle: any) => {
  if (detalle?.codigo_matricula) return detalle.codigo_matricula;
  if (!detalle?.id_matricula) return '—';
  return `MAT-${String(detalle.id_matricula).padStart(6, '0')}`;
};

const getCodigoAlumnoDetalle = (detalle: any) => {
  const codigoColegio = detalle?.estudiante?.codigos_colegio?.find(
    (item: CodigoColegio) => item.id_colegio === detalle?.id_colegio,
  );
  return codigoColegio?.codigo || detalle?.estudiante?.codigo_estudiante || 'Sin código';
};

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

// ─── Badge de estado con color semántico ─────────────────
const EstadoBadge = ({ estado }: { estado: string }) => {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    Activo: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
    'Pre-matriculado': { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock },
    Inactivo: { bg: 'bg-neutral-100', text: 'text-neutral-500', icon: XCircle },
    Anulado: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
    Retirado: { bg: 'bg-neutral-100', text: 'text-neutral-500', icon: XCircle },
    Reserva: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  };
  const c = config[estado] || { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: Clock };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {estado}
    </span>
  );
};

const RevisionBadge = ({ estado }: { estado: string }) => {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    Aprobado: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
    'Por revisar': { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    Observado: { bg: 'bg-orange-50', text: 'text-orange-700', icon: AlertTriangle },
    Rechazado: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  };
  const c = config[estado] || config['Por revisar'];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {estado || 'Por revisar'}
    </span>
  );
};

// ─── Componentes UI ──────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
    {children}
  </span>
);

const DetailCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: any;
}) => (
  <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold text-neutral-900 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-neutral-400 flex-shrink-0" />}
      {value}
    </p>
  </div>
);

const ModalSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-neutral-50 p-5 ring-1 ring-neutral-200/60">
    <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
      <Icon size={16} className="text-[#0f62fe]" />
      {title}
    </h4>
    <div className="mt-4">{children}</div>
  </div>
);

// ─── Estados finales ─────────────────────────────────────
const estadosMatriculaFinales = [
  'Anulado', 'Retirado', 'No continúa', 'Finalizado', 'Promocionado', 'Egresado',
];
const estadosRevisionFinales = ['Rechazado'];

const esMatriculaFinal = (detalle: any) => {
  if (!detalle) return false;
  return (
    estadosMatriculaFinales.includes(String(detalle.estado_matricula || '')) ||
    estadosRevisionFinales.includes(String(detalle.estado_revision || ''))
  );
};

const mensajeMatriculaFinal = (detalle: any) => {
  const estado = detalle?.estado_matricula || '—';
  const revision = detalle?.estado_revision || '—';
  return `Esta matrícula está cerrada. Estado: ${estado}. Revisión: ${revision}. No se puede aprobar, cobrar ni activar desde este modal.`;
};

// ═══════════════════════════════════════════════════════════
export default function MatriculasHistorialPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // ─── States ────────────────────────────────────────────
  const [data, setData] = useState<MatriculaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [registradoPor, setRegistradoPor] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [estadoRevision, setEstadoRevision] = useState('Todos');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleMatricula, setDetalleMatricula] = useState<any | null>(null);
  const [cronogramaOpen, setCronogramaOpen] = useState(false);
  const [detalleTab, setDetalleTab] =
    useState<'general' | 'finanzas'>('general');
  const [isClosing, setIsClosing] = useState(false);

  const [revisionEstado, setRevisionEstado] = useState('Aprobado');
  const [revisionObservacion, setRevisionObservacion] = useState('');
  const [savingRevision, setSavingRevision] = useState(false);
  const [mensajeRevision, setMensajeRevision] = useState<string | null>(null);

  const [pagoApoderadoId, setPagoApoderadoId] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');
  const [pagoOperacion, setPagoOperacion] = useState('');
  const [savingPago, setSavingPago] = useState(false);
  const [mensajePago, setMensajePago] = useState<string | null>(null);

  const [autoOpenedMatriculaId, setAutoOpenedMatriculaId] = useState<number | null>(null);

  // ─── Computed ──────────────────────────────────────────
  const cronogramaMatriculaDetalle = useMemo(() => {
    if (!detalleMatricula?.cronogramas?.length) return null;
    return (
      detalleMatricula.cronogramas.find(
        (item: any) => item.concepto?.tipo_concepto === 'MATRICULA',
      ) || null
    );
  }, [detalleMatricula]);

  const totalMatriculaDetalle = useMemo(() => {
    if (!cronogramaMatriculaDetalle) return 0;
    return Number(
      cronogramaMatriculaDetalle.monto_programado ??
        cronogramaMatriculaDetalle.concepto?.monto_base ?? 0,
    );
  }, [cronogramaMatriculaDetalle]);

  const totalPagadoMatriculaDetalle = useMemo(() => {
    if (!cronogramaMatriculaDetalle?.pagos?.length) return 0;
    return cronogramaMatriculaDetalle.pagos.reduce(
      (sum: number, pago: any) => sum + Number(pago.monto_pagado || 0), 0,
    );
  }, [cronogramaMatriculaDetalle]);

  const matriculaPagadaParaPensiones =
    Boolean(cronogramaMatriculaDetalle) &&
    (cronogramaMatriculaDetalle.estado_pago === 'Pagado' ||
      totalPagadoMatriculaDetalle + 0.01 >= totalMatriculaDetalle);

  const cronogramaMatriculaTienePagos =
    Boolean(cronogramaMatriculaDetalle?.pagos?.length) || totalPagadoMatriculaDetalle > 0;

  const puedeAplicarPromocionMatricula =
    Boolean(detalleMatricula) &&
    Boolean(cronogramaMatriculaDetalle) &&
    !cronogramaMatriculaTienePagos &&
    cronogramaMatriculaDetalle?.estado_pago !== 'Pagado' &&
    !esMatriculaFinal(detalleMatricula);

  // ─── Params ────────────────────────────────────────────
  const params = useMemo(() => {
    const search = new URLSearchParams(queryString.replace('?', ''));
    if (q.trim()) search.set('q', q.trim());
    if (desde) search.set('desde', desde);
    if (hasta) search.set('hasta', hasta);
    if (registradoPor.trim()) search.set('registrado_por', registradoPor.trim());
    if (estado !== 'Todos') search.set('estado', estado);
    if (estadoRevision !== 'Todos') search.set('estado_revision', estadoRevision);
    search.set('page', String(page));
    search.set('limit', '10');
    const query = search.toString();
    return query ? `?${query}` : '';
  }, [desde, estado, estadoRevision, hasta, page, q, queryString, registradoPor]);

  const detalleQueryString = useMemo(() => {
    const colegioIdUrl = searchParams.get('colegio_id');
    if (colegioIdUrl) return `?colegio_id=${colegioIdUrl}`;
    return queryString;
  }, [queryString, searchParams]);

  // ─── Fetch ─────────────────────────────────────────────
  useEffect(() => {
    fetchMatriculas();
  }, [params, token]);

  const fetchMatriculas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/matriculas/buscar${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setQ(''); setDesde(''); setHasta(''); setRegistradoPor('');
    setEstado('Todos'); setEstadoRevision('Todos'); setPage(1);
  };

  const getCodigoAlumno = (matricula: MatriculaItem) => {
    const codigoColegio = matricula.estudiante.codigos_colegio?.find(
      (item) => item.id_colegio === matricula.id_colegio,
    );
    return codigoColegio?.codigo || matricula.estudiante.codigo_estudiante || 'Sin código';
  };

  const getCronogramaMatricula = (detalle: any) => {
    return (
      detalle?.cronogramas?.find((item: any) => {
        const tipo = item.concepto?.tipo_concepto;
        if (tipo) return tipo === 'MATRICULA';
        return String(item.concepto?.nombre_concepto || '')
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes('matric');
      }) || null
    );
  };

  const getSaldoMatricula = (detalle: any) => {
    const cronograma = getCronogramaMatricula(detalle);
    if (!cronograma) return 0;
    const montoBase = Number(cronograma.monto_programado ?? cronograma.concepto?.monto_base ?? 0);
    const pagado = (cronograma.pagos || []).reduce(
      (acc: number, pago: any) => acc + Number(pago.monto_pagado || 0), 0,
    );
    return Math.max(montoBase - pagado, 0);
  };

  // ─── Acciones ──────────────────────────────────────────
  const generarCobroMatricula = async () => {
    if (!token || !detalleMatricula?.id_matricula) return;
    if (esMatriculaFinal(detalleMatricula)) {
      const message = mensajeMatriculaFinal(detalleMatricula);
      setMensajePago(message);
      showToast({ type: 'warning', title: 'Matrícula cerrada', message });
      return;
    }
    setSavingPago(true); setMensajePago(null);
    try {
      const res = await axios.post(
        `/api/academicos/matriculas/${detalleMatricula.id_matricula}/generar-cobro-matricula${detalleQueryString}`,
        {}, { headers: { Authorization: `Bearer ${token}` } },
      );
      const detalleActualizado = res.data?.matricula || detalleMatricula;
      const saldo = getSaldoMatricula(detalleActualizado);
      setDetalleMatricula(detalleActualizado);
      setPagoMonto(saldo ? String(saldo.toFixed(2)) : '');
      const successMessage = res.data?.message || 'Cobro de matrícula generado correctamente.';
      setMensajePago(successMessage);
      showToast({ type: 'success', title: 'Cobro generado', message: successMessage });
      await fetchMatriculas();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo generar el cobro de matrícula.';
      setMensajePago(errorMessage);
      showToast({ type: 'error', title: 'No se pudo generar cobro', message: errorMessage });
    } finally { setSavingPago(false); }
  };

  const aplicarPromocionMatricula = async () => {
    if (!token || !detalleMatricula) return;
    const codigo = detalleMatricula.codigo_matricula || detalleMatricula.id_matricula;
    setSavingPago(true); setMensajePago(null);
    try {
      const res = await axios.post(
        `/api/tesoreria/matriculas/${codigo}/aplicar-promocion-matricula${detalleQueryString}`,
        {}, { headers: { Authorization: `Bearer ${token}` } },
      );
      const message = res.data?.message || 'Promoción aplicada correctamente al cobro de matrícula.';
      setMensajePago(message);
      showToast({ type: 'success', title: 'Promoción aplicada', message, duration: 6500 });
      await abrirDetalleMatricula(detalleMatricula.id_matricula);
      await fetchMatriculas();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo aplicar la promoción vigente.';
      setMensajePago(errorMessage);
      showToast({ type: 'error', title: 'No se pudo aplicar', message: errorMessage, duration: 6500 });
    } finally { setSavingPago(false); }
  };

  const abrirDetalleMatricula = async (idMatricula: number) => {
    if (!token) return;
    setDetalleOpen(true); setDetalleLoading(true); setDetalleMatricula(null);
    setCronogramaOpen(false);
    setDetalleTab('general');
    setIsClosing(false);
    try {
      const res = await axios.get(
        `/api/academicos/matriculas/${idMatricula}/detalle${detalleQueryString}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      let detalle = res.data;
      if (
        !esMatriculaFinal(detalle) &&
        detalle?.estado_matricula === 'Reserva' &&
        !getCronogramaMatricula(detalle)
      ) {
        try {
          const cobroRes = await axios.post(
            `/api/academicos/matriculas/${idMatricula}/generar-cobro-matricula${detalleQueryString}`,
            {}, { headers: { Authorization: `Bearer ${token}` } },
          );
          detalle = cobroRes.data?.matricula || detalle;
          showToast({ type: 'success', title: 'Cobro generado', message: 'Se generó el cobro de matrícula para esta reserva.' });
        } catch (error: any) {
          showToast({
            type: 'warning', title: 'Reserva sin cobro',
            message: error.response?.data?.message || 'No se pudo generar el cobro de matrícula.',
            duration: 6500,
          });
        }
      }
      setDetalleMatricula(detalle);
      setRevisionEstado(detalle?.estado_revision || 'Aprobado');
      setRevisionObservacion(detalle?.observacion_revision || '');
      setMensajeRevision(null);
      const apoderadoDefault = detalle?.estudiante?.apoderados?.[0]?.id_apoderado;
      const saldoMatricula = getSaldoMatricula(detalle);
      setPagoApoderadoId(apoderadoDefault ? String(apoderadoDefault) : '');
      setPagoMonto(saldoMatricula ? String(saldoMatricula.toFixed(2)) : '');
      setPagoMetodo('Efectivo'); setPagoOperacion(''); setMensajePago(null);
    } catch {
      setDetalleOpen(false);
    } finally { setDetalleLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    const matriculaIdParam = searchParams.get('matricula_id');
    if (!matriculaIdParam) { if (autoOpenedMatriculaId !== null) setAutoOpenedMatriculaId(null); return; }
    const matriculaId = Number(matriculaIdParam);
    if (!Number.isInteger(matriculaId) || matriculaId <= 0) return;
    if (autoOpenedMatriculaId === matriculaId) return;
    setAutoOpenedMatriculaId(matriculaId);
    abrirDetalleMatricula(matriculaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, searchParams, autoOpenedMatriculaId]);

  const cerrarDetalle = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('matricula_id'); next.delete('colegio_id');
      setSearchParams(next, { replace: true });
      setDetalleOpen(false); setIsClosing(false);
      setDetalleMatricula(null); setCronogramaOpen(false);
      setMensajeRevision(null); setMensajePago(null);
    }, 280);
  }, [searchParams, setSearchParams]);

  const guardarRevision = async () => {
    if (!token || !detalleMatricula?.id_matricula) return;
    if (esMatriculaFinal(detalleMatricula)) {
      const message = mensajeMatriculaFinal(detalleMatricula);
      setMensajeRevision(message);
      showToast({ type: 'warning', title: 'Matrícula cerrada', message });
      return;
    }
    setSavingRevision(true); setMensajeRevision(null);
    try {
      const res = await axios.patch(
        `/api/academicos/matriculas/${detalleMatricula.id_matricula}/revision${queryString}`,
        { estado_revision: revisionEstado, observacion_revision: revisionObservacion },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDetalleMatricula(res.data?.matricula || detalleMatricula);
      const successMessage = res.data?.message || 'Revisión actualizada.';
      setMensajeRevision(successMessage);
      showToast({ type: 'success', title: 'Revisión guardada', message: successMessage });
      await fetchMatriculas();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo actualizar la revisión.';
      setMensajeRevision(errorMessage);
      showToast({ type: 'error', title: 'Error en revisión', message: errorMessage });
    } finally { setSavingRevision(false); }
  };

  const registrarPagoMatricula = async () => {
    if (!token || !detalleMatricula?.id_matricula) return;
    if (esMatriculaFinal(detalleMatricula)) {
      const message = mensajeMatriculaFinal(detalleMatricula);
      setMensajePago(message);
      showToast({ type: 'warning', title: 'Matrícula cerrada', message });
      return;
    }
    setSavingPago(true); setMensajePago(null);
    try {
      const res = await axios.post(
        `/api/academicos/matriculas/${detalleMatricula.id_matricula}/pago-matricula${queryString}`,
        {
          id_apoderado: Number(pagoApoderadoId), monto_pagado: Number(pagoMonto),
          metodo_pago: pagoMetodo, nro_operacion: pagoOperacion, activar_automaticamente: true,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const detalleActualizado = res.data?.matricula || detalleMatricula;
      setDetalleMatricula(detalleActualizado);
      const saldo = getSaldoMatricula(detalleActualizado);
      setPagoMonto(saldo ? String(saldo.toFixed(2)) : '');
      const successMessage = res.data?.message || 'Pago registrado correctamente.';
      setMensajePago(successMessage);
      showToast({ type: 'success', title: 'Pago registrado', message: successMessage });
      await fetchMatriculas();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo registrar el pago.';
      setMensajePago(errorMessage);
      showToast({ type: 'error', title: 'Error al registrar pago', message: errorMessage });
    } finally { setSavingPago(false); }
  };

  const activarMatricula = async () => {
    if (!token || !detalleMatricula?.id_matricula) return;
    if (esMatriculaFinal(detalleMatricula)) {
      const message = mensajeMatriculaFinal(detalleMatricula);
      setMensajePago(message);
      showToast({ type: 'warning', title: 'Matrícula cerrada', message });
      return;
    }
    setSavingPago(true); setMensajePago(null);
    try {
      const res = await axios.post(
        `/api/academicos/matriculas/${detalleMatricula.id_matricula}/activar${queryString}`,
        {}, { headers: { Authorization: `Bearer ${token}` } },
      );
      setDetalleMatricula(res.data?.matricula || detalleMatricula);
      const successMessage = res.data?.message || 'Matrícula activada correctamente.';
      setMensajePago(successMessage);
      showToast({ type: 'success', title: 'Matrícula activada', message: successMessage });
      await fetchMatriculas();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'No se pudo activar la matrícula.';
      setMensajePago(errorMessage);
      showToast({ type: 'error', title: 'Error al activar matrícula', message: errorMessage });
    } finally { setSavingPago(false); }
  };

  const generarPensionesMatricula = async () => {
    if (!token || !detalleMatricula?.id_matricula) return;
    setSavingPago(true); setMensajePago(null);
    try {
      const res = await axios.post(
        `/api/tesoreria/matriculas/${detalleMatricula.id_matricula}/generar-pensiones${queryString}`,
        {}, { headers: { Authorization: `Bearer ${token}` } },
      );
      const message = res.data?.message || 'Se revisó el cronograma de pensiones de la matrícula.';
      showToast({ type: 'success', title: 'Cronograma de pensiones', message, duration: 6500 });
      setMensajePago(message);
      await abrirDetalleMatricula(detalleMatricula.id_matricula);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo generar el cronograma de pensiones.';
      setMensajePago(message);
      showToast({ type: 'error', title: 'No se pudo generar', message, duration: 6500 });
    } finally { setSavingPago(false); }
  };

  // ─── Input class helper ────────────────────────────────
  const inputClass =
    'h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-800 outline-none transition-all duration-150 focus:border-[#0f62fe] focus:bg-white focus:ring-2 focus:ring-[#0f62fe]/20 hover:border-neutral-300 placeholder:text-neutral-400';

  const selectClass =
    'h-11 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-800 outline-none transition-all duration-150 focus:border-[#0f62fe] focus:bg-white focus:ring-2 focus:ring-[#0f62fe]/20 hover:border-neutral-300 appearance-none cursor-pointer';

  // ═══════════════════════════════════════════════════════
  return (
    <div className="carbon-matricula-page w-full space-y-6">
      {/* Animaciones del modal */}
      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalPanelIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modalPanelOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(16px) scale(0.98); }
        }
        .modal-overlay-enter { animation: modalOverlayIn 0.25s ease-out forwards; }
        .modal-overlay-exit { animation: modalOverlayOut 0.2s ease-in forwards; }
        .modal-panel-enter { animation: modalPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .modal-panel-exit { animation: modalPanelOut 0.2s ease-in forwards; }
      `}</style>

      <PageHeader
        eyebrow="Gestión académica"
        title="Historial de matrículas"
        description="Consulta pre-matrículas y matrículas por alumno, apoderado, DNI, número de matrícula, fecha o usuario registrador."
        icon={Users}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
      />

      {/* ── Filtros ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid gap-3 xl:grid-cols-[1.3fr_1.15fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              placeholder="Alumno, apoderado, DNI o N° matrícula"
              className={`${inputClass} pl-11`}
            />
          </div>

          <div
            className="matricula-history-date-range"
            aria-label="Periodo de matrícula"
          >
            <label className="matricula-history-date-field">
              <span className="matricula-history-date-label">
                Desde
              </span>

              <input
                type="date"
                aria-label="Fecha desde"
                value={desde}
                onChange={(event) => {
                  setPage(1);
                  setDesde(event.target.value);
                }}
                className="matricula-history-date-input"
              />
            </label>

            <span
              className="matricula-history-date-separator"
              aria-hidden="true"
            >
              —
            </span>

            <label className="matricula-history-date-field">
              <span className="matricula-history-date-label">
                Hasta
              </span>

              <input
                type="date"
                aria-label="Fecha hasta"
                value={hasta}
                onChange={(event) => {
                  setPage(1);
                  setHasta(event.target.value);
                }}
                className="matricula-history-date-input"
              />
            </label>
          </div>

          <input
            value={registradoPor}
            onChange={(e) => { setPage(1); setRegistradoPor(e.target.value); }}
            placeholder="Registrado por"
            className={inputClass}
          />

          <select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }} className={selectClass}>
            <option value="Todos">Todos los estados</option>
            <option value="Pre-matriculado">Pre-matriculado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <select value={estadoRevision} onChange={(e) => { setPage(1); setEstadoRevision(e.target.value); }} className={selectClass}>
            <option value="Todos">Revisión: todos</option>
            <option value="Por revisar">Por revisar</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Observado">Observado</option>
            <option value="Rechazado">Rechazado</option>
          </select>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 hover:border-neutral-300"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* ── Tabla / Lista ────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* history-table-v2 */}
        <div className="matricula-history-header hidden gap-5 px-5 py-4 lg:grid lg:grid-cols-[170px_1.35fr_1fr_1fr_auto] lg:items-center">
          <span>Matrícula</span>
          <span>Alumno</span>
          <span>Institución y sección</span>
          <span>Estado y registro</span>
          <span className="text-right">Acción</span>
        </div>

        {loading ? (
          <div className="flex min-h-[340px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2
                size={28}
                className="animate-spin text-[#0f62fe]"
              />

              <p className="text-sm text-slate-500">
                Cargando matrículas…
              </p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
              <CalendarDays
                size={28}
                className="text-slate-400"
              />
            </div>

            <p className="text-sm font-semibold text-slate-700">
              Sin resultados
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Ajusta los filtros para buscar otra matrícula.
            </p>
          </div>
        ) : (
          <div className="matricula-history-list divide-y divide-slate-200">
            {data.map((matricula) => {
              const alumno =
                matricula.estudiante.persona;

              const apoderado =
                matricula.estudiante.apoderados?.[0];

              const registrador =
                matricula.registrado_por?.persona
                  ? `${matricula.registrado_por.persona.nombres} ${matricula.registrado_por.persona.apellido_paterno}`
                  : 'No registrado';

              return (
                <div
                  key={matricula.id_matricula}
                  className="group grid gap-5 px-5 py-5 transition-colors even:bg-slate-50/60 hover:bg-blue-50/50 lg:grid-cols-[170px_1.35fr_1fr_1fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500 lg:hidden">
                      Matrícula
                    </span>

                    <p className="break-words text-sm font-bold text-slate-950">
                      {matricula.codigo_matricula ||
                        `MAT-${String(
                          matricula.id_matricula,
                        ).padStart(6, '0')}`}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500 lg:hidden">
                      Alumno
                    </span>

                    <p className="truncate text-sm font-semibold text-slate-950">
                      {alumno.nombres}
                      {' '}
                      {alumno.apellido_paterno}
                      {' '}
                      {alumno.apellido_materno}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      DNI:
                      {' '}
                      {alumno.dni}
                      {' · '}
                      Código:
                      {' '}
                      {getCodigoAlumno(matricula)}
                    </p>

                    {apoderado && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        Apoderado:
                        {' '}
                        {apoderado.apoderado.persona.nombres}
                        {' '}
                        {apoderado.apoderado.persona.apellido_paterno}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500 lg:hidden">
                      Institución y sección
                    </span>

                    <p className="truncate text-sm font-semibold text-slate-900">
                      {matricula.colegio?.nombre ||
                        'Institución'}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {matricula.seccion.grado.nivel?.nombre_nivel ||
                        'Nivel'}
                      {' · '}
                      {matricula.seccion.grado.nombre_grado}
                      {' '}
                      &ldquo;{matricula.seccion.letra}&rdquo;
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {matricula.anio?.nombre_anio ||
                        'Año no registrado'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500 lg:hidden">
                      Estado y registro
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoBadge
                        estado={matricula.estado_matricula}
                      />

                      <RevisionBadge
                        estado={
                          matricula.estado_revision ||
                          'Por revisar'
                        }
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-600">
                      {formatFechaHora(
                        matricula.fecha_matricula,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Registrado por:
                      {' '}
                      {registrador}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      abrirDetalleMatricula(
                        matricula.id_matricula,
                      )
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#0f62fe] bg-white px-4 text-sm font-semibold text-[#0043ce] transition hover:bg-blue-50"
                  >
                    <Eye size={15} />
                    Ver detalles
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setPage((c) => Math.max(c - 1, 1))}
            disabled={page <= 1}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              Página {meta.page || page} de {meta.totalPages || 1}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              {meta.total} registros
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPage((c) => Math.min(c + 1, meta.totalPages || 1))}
            disabled={page >= (meta.totalPages || 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ══════════ Modal de detalle ══════════ */}
      {detalleOpen && (
        <div
          className={`carbon-matricula-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm px-4 py-6 ${
            isClosing ? 'modal-overlay-exit' : 'modal-overlay-enter'
          }`}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarDetalle(); }}
        >
          <div
            className={`carbon-matricula-modal-panel w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200/50 flex flex-col max-h-[88vh] ${
              isClosing ? 'modal-panel-exit' : 'modal-panel-enter'
            }`}
          >
            {/* ── Header del modal ── */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5 flex-shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0f62fe]/10 px-3 py-1 text-xs font-semibold text-neutral-800">
                  <GraduationCap size={13} />
                  Detalle de matrícula
                </div>
                <h3 className="mt-3 text-xl font-semibold text-neutral-900 tracking-tight">
                  {detalleMatricula?.estudiante?.persona
                    ? `${detalleMatricula.estudiante.persona.nombres} ${detalleMatricula.estudiante.persona.apellido_paterno}`
                    : 'Cargando matrícula'}
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Información académica, apoderados, procedencia y cronograma.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Body del modal ── */}
            <div className="overflow-y-auto flex-1 p-6">
              {detalleLoading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin text-[#0f62fe]" />
                    <p className="text-sm text-neutral-400">Cargando detalle…</p>
                  </div>
                </div>
              ) : detalleMatricula ? (
                <div className="space-y-5">
                  {/* Alerta de matrícula cerrada */}
                  {esMatriculaFinal(detalleMatricula) && (
                    <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200/60">
                      <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-red-700">{mensajeMatriculaFinal(detalleMatricula)}</p>
                    </div>
                  )}

                  <div
                    className="matricula-detail-tabs"
                    role="tablist"
                    aria-label="Secciones del detalle de matrícula"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={detalleTab === 'general'}
                      onClick={() => setDetalleTab('general')}
                      className={
                        detalleTab === 'general'
                          ? 'matricula-detail-tab matricula-detail-tab--active'
                          : 'matricula-detail-tab'
                      }
                    >
                      <GraduationCap size={16} />
                      Datos generales
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={detalleTab === 'finanzas'}
                      onClick={() => setDetalleTab('finanzas')}
                      className={
                        detalleTab === 'finanzas'
                          ? 'matricula-detail-tab matricula-detail-tab--active'
                          : 'matricula-detail-tab'
                      }
                    >
                      <CreditCard size={16} />
                      Finanzas y pagos
                    </button>
                  </div>

                  {detalleTab === 'general' && (
                    <div className="matricula-general-panel space-y-5">
                  {/* Info general */}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <DetailCard label="ID matrícula" value={formatNumeroMatricula(detalleMatricula)} icon={FileText} />
                    <DetailCard label="Código alumno" value={getCodigoAlumnoDetalle(detalleMatricula)} icon={GraduationCap} />
                    <DetailCard label="Estado" value={detalleMatricula.estado_matricula} icon={CheckCircle2} />
                    <DetailCard label="Matriculado el" value={formatFechaHora(detalleMatricula.fecha_matricula)} icon={Clock} />
                    <DetailCard
                      label="Registrado por"
                      value={
                        detalleMatricula.registrado_por?.persona
                          ? `${detalleMatricula.registrado_por.persona.nombres} ${detalleMatricula.registrado_por.persona.apellido_paterno}`
                          : 'No registrado'
                      }
                      icon={Users}
                    />
                  </div>

                  {/* Datos académicos */}
                  <ModalSection title="Datos académicos" icon={GraduationCap}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailCard label="Colegio" value={detalleMatricula.colegio?.nombre || '—'} />
                      <DetailCard label="Nivel" value={detalleMatricula.seccion?.grado?.nivel?.nombre_nivel || '—'} />
                      <DetailCard label="Grado" value={detalleMatricula.seccion?.grado?.nombre_grado || '—'} />
                      <DetailCard label="Sección" value={detalleMatricula.seccion?.letra || '—'} />
                      <DetailCard label="Año lectivo" value={detalleMatricula.anio?.nombre_anio || '—'} />
                      <DetailCard label="Aula" value={detalleMatricula.seccion?.aula?.nombre_aula || '—'} />
                    </div>
                  </ModalSection>

                  {/* Apoderados */}
                  <ModalSection title="Apoderados" icon={Users}>
                    <div className="space-y-3">
                      {detalleMatricula.estudiante?.apoderados?.length ? (
                        detalleMatricula.estudiante.apoderados.map((relacion: any) => (
                          <div key={relacion.id_apoderado} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                            <p className="text-sm font-semibold text-neutral-800">
                              {relacion.parentesco}:{' '}
                              {relacion.apoderado.persona.nombres} {relacion.apoderado.persona.apellido_paterno}
                            </p>
                            <div className="mt-3 grid gap-2 text-xs text-neutral-500 md:grid-cols-2">
                              <p><span className="text-neutral-400">DNI:</span> {relacion.apoderado.persona.dni || '—'}</p>
                              <p><span className="text-neutral-400">Teléfono:</span> {relacion.apoderado.persona.telefono || '—'}</p>
                              <p><span className="text-neutral-400">Correo:</span> {relacion.apoderado.persona.correo || '—'}</p>
                              <p><span className="text-neutral-400">Distrito:</span> {relacion.apoderado.persona.distrito || '—'}</p>
                              <p><span className="text-neutral-400">Departamento:</span> {relacion.apoderado.persona.departamento || '—'}</p>
                              <p><span className="text-neutral-400">Dirección:</span> {relacion.apoderado.persona.direccion || '—'}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-neutral-400">Sin apoderados vinculados.</p>
                      )}
                    </div>
                  </ModalSection>

                  {/* Procedencia */}
                  <ModalSection title="Procedencia" icon={Banknote}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailCard label="Tipo de ingreso" value={detalleMatricula.tipo_ingreso || 'Nuevo'} />
                      <DetailCard label="Colegio procedencia" value={detalleMatricula.colegio_procedencia || '—'} />
                      <DetailCard label="Código modular" value={detalleMatricula.codigo_modular_procedencia || '—'} />
                      <DetailCard label="Grado procedencia" value={detalleMatricula.grado_procedencia || '—'} />
                    </div>
                    {detalleMatricula.observacion_procedencia && (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-neutral-500 ring-1 ring-neutral-200/60">
                        {detalleMatricula.observacion_procedencia}
                      </p>
                    )}
                  </ModalSection>

                  {/* Revisión administrativa */}
                  <ModalSection
                    title="Revisión administrativa"
                    icon={CheckCircle2}
                  >
                    <div className="matricula-review-status-grid">
                      <div className="matricula-review-status-card matricula-review-status-card--state">
                        <span className="matricula-review-status-label">
                          Estado actual
                        </span>

                        <div className="mt-3">
                          <RevisionBadge
                            estado={
                              detalleMatricula.estado_revision ||
                              'Por revisar'
                            }
                          />
                        </div>
                      </div>

                      <div className="matricula-review-status-card">
                        <span className="matricula-review-status-label">
                          Revisado por
                        </span>

                        <strong className="matricula-review-status-value">
                          {detalleMatricula.revisado_por?.persona
                            ? `${detalleMatricula.revisado_por.persona.nombres} ${detalleMatricula.revisado_por.persona.apellido_paterno}`
                            : 'Aún no revisado'}
                        </strong>
                      </div>

                      <div className="matricula-review-status-card">
                        <span className="matricula-review-status-label">
                          Fecha de revisión
                        </span>

                        <strong className="matricula-review-status-value">
                          {detalleMatricula.fecha_revision
                            ? formatFechaHora(
                                detalleMatricula.fecha_revision,
                              )
                            : 'Sin fecha registrada'}
                        </strong>
                      </div>
                    </div>

                    {detalleMatricula.observacion_revision && (
                      <div className="matricula-review-current-note">
                        <div>
                          <span className="matricula-review-status-label">
                            Observación registrada
                          </span>

                          <p>
                            {detalleMatricula.observacion_revision}
                          </p>
                        </div>
                      </div>
                    )}

                    {!esMatriculaFinal(detalleMatricula) ? (
                      <div className="matricula-review-editor">
                        <div className="matricula-review-editor__header">
                          <div>
                            <h5>
                              Actualizar revisión
                            </h5>

                            <p>
                              Selecciona el resultado y registra una
                              observación cuando sea necesaria.
                            </p>
                          </div>

                          <span>
                            Acción administrativa
                          </span>
                        </div>

                        <div className="matricula-review-editor__fields">
                          <label className="block">
                            <SectionLabel>
                              Nuevo estado
                            </SectionLabel>

                            <select
                              value={revisionEstado}
                              onChange={(event) =>
                                setRevisionEstado(
                                  event.target.value,
                                )
                              }
                              className="matricula-review-control"
                            >
                              <option value="Aprobado">
                                Aprobado
                              </option>

                              <option value="Observado">
                                Observado
                              </option>

                              <option value="Rechazado">
                                Rechazado
                              </option>

                              <option value="Por revisar">
                                Por revisar
                              </option>
                            </select>
                          </label>

                          <label className="block">
                            <SectionLabel>
                              Nueva observación
                            </SectionLabel>

                            <textarea
                              value={revisionObservacion}
                              onChange={(event) =>
                                setRevisionObservacion(
                                  event.target.value,
                                )
                              }
                              placeholder="Describe el motivo de la observación o deja una nota administrativa."
                              rows={4}
                              className="matricula-review-control matricula-review-textarea"
                            />
                          </label>
                        </div>

                        <div className="matricula-review-editor__footer">
                          <p>
                            El cambio quedará registrado con el
                            usuario y la fecha de actualización.
                          </p>

                          <button
                            type="button"
                            onClick={guardarRevision}
                            disabled={savingRevision}
                            className="matricula-review-save"
                          >
                            {savingRevision ? (
                              <>
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                                Guardando…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={16} />
                                Guardar revisión
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="matricula-review-locked">
                        <AlertTriangle size={17} />

                        <p>
                          La revisión no puede modificarse porque
                          esta matrícula está cerrada.
                        </p>
                      </div>
                    )}

                    {mensajeRevision && (
                      <div
                        className={
                          mensajeRevision.includes(
                            'No se pudo',
                          ) ||
                          mensajeRevision.includes(
                            'cerrada',
                          )
                            ? 'matricula-review-message matricula-review-message--error'
                            : 'matricula-review-message matricula-review-message--success'
                        }
                      >
                        {mensajeRevision}
                      </div>
                    )}
                  </ModalSection>

                    </div>
                  )}

                  {detalleTab === 'finanzas' && (
                    <div className="matricula-finance-panel space-y-5">
                  {/* Resumen financiero */}
                  <ModalSection title="Resumen financiero" icon={CreditCard}>
                    <div className="grid gap-3 md:grid-cols-4">
                      <DetailCard
                        label="Pago matrícula"
                        value={detalleMatricula.resumen_financiero?.estado_pago_matricula || 'No generado'}
                      />
                      <DetailCard
                        label="Programado"
                        value={formatMoney(detalleMatricula.resumen_financiero?.total_programado)}
                      />
                      <DetailCard
                        label="Pagado"
                        value={formatMoney(detalleMatricula.resumen_financiero?.total_pagado)}
                      />
                      <DetailCard
                        label="Saldo"
                        value={formatMoney(detalleMatricula.resumen_financiero?.saldo)}
                      />
                    </div>
                  </ModalSection>

                  {/* Pago y activación */}
                  <ModalSection title="Pago de matrícula y activación" icon={CreditCard}>
                    {detalleMatricula && !getCronogramaMatricula(detalleMatricula) && !esMatriculaFinal(detalleMatricula) && (
                      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/60">
                        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            Esta matrícula todavía no tiene cobro de matrícula generado.
                          </p>
                          <button
                            type="button"
                            onClick={generarCobroMatricula}
                            disabled={savingPago}
                            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                          >
                            {savingPago ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                            Generar cobro de matrícula
                          </button>
                        </div>
                      </div>
                    )}

                    {(() => {
                      const cronogramaMatricula = getCronogramaMatricula(detalleMatricula);
                      const saldoMatricula = getSaldoMatricula(detalleMatricula);
                      const revisionAprobada = detalleMatricula.estado_revision === 'Aprobado';
                      const pagoPagado = cronogramaMatricula?.estado_pago === 'Pagado';
                      const matriculaActiva = detalleMatricula.estado_matricula === 'Activo';

                      if (esMatriculaFinal(detalleMatricula)) {
                        return (
                          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200/60">
                            <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-red-700">
                              No se puede registrar pago ni activar una matrícula anulada, rechazada o finalizada.
                            </p>
                          </div>
                        );
                      }

                      if (matriculaActiva) {
                        return (
                          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200/60">
                            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-emerald-700">
                              La matrícula ya está activa. Las pensiones del año deben estar generadas en el cronograma.
                            </p>
                          </div>
                        );
                      }

                      if (!revisionAprobada) {
                        return (
                          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/60">
                            <Clock size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-amber-700">
                              Primero debes aprobar la revisión administrativa para poder registrar el pago y activar la matrícula.
                            </p>
                          </div>
                        );
                      }

                      if (pagoPagado) {
                        return (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200/60">
                              <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm font-medium text-emerald-700">
                                El pago de matrícula figura como pagado. Puedes activar la matrícula.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={activarMatricula}
                              disabled={savingPago}
                              className="h-11 rounded-2xl bg-[#0f62fe] px-6 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#0043ce] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                              {savingPago ? (
                                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Activando…</span>
                              ) : 'Activar matrícula'}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <SectionLabel>Apoderado pagador</SectionLabel>
                              <select value={pagoApoderadoId} onChange={(e) => setPagoApoderadoId(e.target.value)} className={selectClass}>
                                <option value="">Seleccionar</option>
                                {detalleMatricula.estudiante?.apoderados?.map((relacion: any) => (
                                  <option key={relacion.id_apoderado} value={relacion.id_apoderado}>
                                    {relacion.parentesco}: {relacion.apoderado.persona.nombres} {relacion.apoderado.persona.apellido_paterno}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <SectionLabel>Monto</SectionLabel>
                              <input value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                              <SectionLabel>Método</SectionLabel>
                              <select value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)} className={selectClass}>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Yape">Yape</option>
                                <option value="Plin">Plin</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta</option>
                              </select>
                            </div>
                            <div>
                              <SectionLabel>N° operación</SectionLabel>
                              <input value={pagoOperacion} onChange={(e) => setPagoOperacion(e.target.value)} placeholder="Opcional" className={inputClass} />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-xs text-neutral-400">
                              Saldo de matrícula: <span className="font-semibold text-neutral-600">{formatMoney(saldoMatricula)}</span>
                            </p>
                            <button
                              type="button"
                              onClick={registrarPagoMatricula}
                              disabled={savingPago}
                              className="h-11 rounded-2xl bg-[#0f62fe] px-6 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#0043ce] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                              {savingPago ? (
                                <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Registrando…</span>
                              ) : 'Registrar pago y activar'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {mensajePago && (
                      <p className={`mt-3 rounded-xl p-3 text-sm font-medium ring-1 ${
                        mensajePago.includes('No se pudo') || mensajePago.includes('cerrada') || mensajePago.includes('No se puede')
                          ? 'bg-red-50 text-red-600 ring-red-200/60'
                          : 'bg-emerald-50 text-emerald-600 ring-emerald-200/60'
                      }`}>
                        {mensajePago}
                      </p>
                    )}
                  </ModalSection>

                  {/* Aplicar promoción */}
                  {!esMatriculaFinal(detalleMatricula) && (
                    <ModalSection title="Promoción vigente" icon={Sparkles}>
                      <button
                        type="button"
                        onClick={aplicarPromocionMatricula}
                        disabled={savingPago || !puedeAplicarPromocionMatricula}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f62fe] px-4 text-sm font-semibold text-white transition hover:bg-[#0043ce] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {savingPago ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        Aplicar promoción vigente
                      </button>
                      {cronogramaMatriculaDetalle && !puedeAplicarPromocionMatricula && !matriculaPagadaParaPensiones && (
                        <p className="mt-3 text-xs text-neutral-400">
                          La promoción solo puede aplicarse si el cobro de matrícula no tiene pagos registrados.
                        </p>
                      )}
                    </ModalSection>
                  )}

                  {/* Generar pensiones */}
                  {!esMatriculaFinal(detalleMatricula) && (
                    <ModalSection title="Cronograma de pensiones" icon={FileText}>
                      {detalleMatricula && !matriculaPagadaParaPensiones && (
                        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/60 mb-4">
                          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-medium text-amber-700">
                            Para generar el cronograma de pensiones, primero debe registrarse el pago completo de matrícula.
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={generarPensionesMatricula}
                        disabled={savingPago || esMatriculaFinal(detalleMatricula) || !matriculaPagadaParaPensiones}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {savingPago ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                        Generar cronograma de pensiones
                      </button>
                    </ModalSection>
                  )}

                  {/* Cronograma desplegable */}
                  <div className="rounded-2xl bg-neutral-50 p-5 ring-1 ring-neutral-200/60">
                    <button
                      type="button"
                      onClick={() => setCronogramaOpen(!cronogramaOpen)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                          <CreditCard size={16} className="text-[#0f62fe]" />
                          Cronograma de pagos
                        </h4>
                        <p className="mt-1 text-xs text-neutral-400">
                          {detalleMatricula.cronogramas?.length || 0} conceptos generados
                        </p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 ring-1 ring-neutral-200/60">
                        {cronogramaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {cronogramaOpen ? 'Ocultar' : 'Ver detalle'}
                      </span>
                    </button>

                    {cronogramaOpen && (
                      <div className="mt-4 space-y-2">
                        {detalleMatricula.cronogramas?.length ? (
                          detalleMatricula.cronogramas.map((item: any) => (
                            <div
                              key={item.id_cronograma}
                              className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-semibold text-neutral-800">
                                  {item.concepto.nombre_concepto}
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  Vence: {new Date(item.fecha_vencimiento).toLocaleDateString('es-PE')} · Monto: {formatMoney(item.concepto.monto_base)}
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                item.estado_pago === 'Pagado'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.estado_pago === 'Parcial'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-neutral-100 text-neutral-500'
                              }`}>
                                {item.estado_pago === 'Pagado' && <CheckCircle2 size={11} />}
                                {item.estado_pago === 'Parcial' && <Clock size={11} />}
                                {item.estado_pago}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-neutral-400">No hay conceptos generados.</p>
                        )}
                      </div>
                    )}
                  </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}