import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import AccessibleDialog from '../../components/AccessibleDialog';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';

interface Concepto {
  id_concepto: number;
  nombre_concepto: string;
  monto_base: number;
  es_pension: boolean;
  tipo_concepto?: string | null;
  id_anio?: number | null;
  id_colegio?: number | null;
  colegio?: {
    nombre?: string;
    nombre_corto?: string | null;
  } | null;
  anio?: {
    nombre_anio?: string;
    estado?: string;
  } | null;
}

type AnioLectivo = {
  id_anio: number;
  id_colegio?: number | null;
  nombre_anio: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: string;
};

function estadoNormalizado(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esAnioRegistrable(anio: AnioLectivo) {
  const estado = estadoNormalizado(anio.estado);

  if (['cerrado', 'archivado'].includes(estado)) return false;

  if (anio.fecha_fin) {
    const fin = new Date(`${String(anio.fecha_fin).slice(0, 10)}T23:59:59`);
    if (!Number.isNaN(fin.getTime()) && fin < new Date()) return false;
  }

  return true;
}

type Filter = 'todos' | 'pension' | 'otros';

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; concepto: Concepto };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';
const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-700';

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function ConceptosPagoTab() {
  const { token } = useAuth();
  const { colegios, activeColegio, activeScope, tenant, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const nombreInputRef = useRef<HTMLInputElement | null>(null);

  const colegioDefault =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : '';

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [esPension, setEsPension] = useState(true);
  const [tipoConcepto, setTipoConcepto] = useState('MATRICULA');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [colegioId, setColegioId] = useState<number | ''>(colegioDefault);
  const [filtroColegioId, setFiltroColegioId] = useState<number | ''>(colegioDefault);
  const [confirmDelete, setConfirmDelete] = useState<Concepto | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [anioId, setAnioId] = useState<number | ''>('');
  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [loadingAnios, setLoadingAnios] = useState(false);

  // Sincronizar colegioId al cambiar el contexto global
  useEffect(() => {
    setFiltroColegioId(colegioDefault);
    setColegioId(colegioDefault);
    setAnioId('');
    setMensaje(null);
  }, [colegioDefault]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const mostrarFiltroInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;

  const nombreColegio = (id?: number | null) => {
    if (!id) return 'Todos los colegios';
    const colegio = colegios.find((item) => item.id_colegio === id);
    return colegio?.nombre || colegio?.nombre_corto || `Colegio #${id}`;
  };

  const loadAnios = async (targetColegioId: number | '') => {
    if (!token || !targetColegioId) {
      setAnios([]);
      setAnioId('');
      return;
    }

    setLoadingAnios(true);

    try {
      const res = await axios.get(`/api/academicos/anios?colegio_id=${targetColegioId}`, authHeader);
      const data: AnioLectivo[] = res.data || [];
      const disponibles = data.filter(esAnioRegistrable);

      setAnios(data);

      const preferido =
        disponibles.find((item) => estadoNormalizado(item.estado).includes('curso')) ||
        disponibles.find((item) => estadoNormalizado(item.estado).includes('matricula')) ||
        disponibles.find((item) => estadoNormalizado(item.estado).includes('planificacion')) ||
        disponibles[0];

      setAnioId(preferido?.id_anio || '');
    } catch {
      setAnios([]);
      setAnioId('');
      setMensaje({ type: 'error', text: 'No se pudieron cargar los años lectivos del colegio.' });
    } finally {
      setLoadingAnios(false);
    }
  };

  const aniosDisponibles = useMemo(
    () => anios.filter(esAnioRegistrable),
    [anios],
  );

  const pensiones = conceptos.filter(
    (concepto) => (concepto.tipo_concepto || (concepto.es_pension ? 'PENSION' : 'MATRICULA')) === 'PENSION',
  );
  const otros = conceptos.filter(
    (concepto) => (concepto.tipo_concepto || (concepto.es_pension ? 'PENSION' : 'MATRICULA')) !== 'PENSION',
  );
  const totalPensiones = pensiones.reduce((total, concepto) => total + Number(concepto.monto_base || 0), 0);

  const conceptosFiltrados = conceptos.filter((concepto) => {
    const matchesSearch = concepto.nombre_concepto.toLowerCase().includes(search.trim().toLowerCase());
    const tipo = concepto.tipo_concepto || (concepto.es_pension ? 'PENSION' : 'MATRICULA');
    const matchesFilter =
      filter === 'todos' ||
      (filter === 'pension' && tipo === 'PENSION') ||
      (filter === 'otros' && tipo !== 'PENSION');
    return matchesSearch && matchesFilter;
  });

  const loadData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');

      if (filtroColegioId) {
        params.set('colegio_id', String(filtroColegioId));
      } else if (activeScope.tipo === 'todos') {
        params.set('scope', 'all');
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/tesoreria/conceptos${query}`, authHeader);
      setConceptos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar los conceptos de pago.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filtroColegioId, queryString]);

  const openCreate = () => {
    const colegioParaFormulario =
      activeScope.tipo === 'colegio'
        ? colegioDefault
        : filtroColegioId || '';

    setModal({ mode: 'create' });
    setNombre('');
    setMonto('');
    setTipoConcepto('MATRICULA');
    setEsPension(false);
    setColegioId(colegioParaFormulario);
    setAnioId('');
    if (colegioParaFormulario) {
      setTimeout(() => loadAnios(colegioParaFormulario), 0);
    } else {
      setAnios([]);
    }
    setMensaje(null);
  };

  const openEdit = (concepto: Concepto) => {
    setModal({ mode: 'edit', concepto });
    setNombre(concepto.nombre_concepto);
    setMonto(String(concepto.monto_base));

    const tipo =
      concepto.tipo_concepto ||
      (concepto.es_pension ? 'PENSION' : 'MATRICULA');

    setTipoConcepto(tipo);
    setEsPension(tipo === 'PENSION');
    setColegioId(concepto.id_colegio || colegioDefault);
    setAnioId(concepto.id_anio || '');

    if (concepto.id_colegio) {
      setTimeout(() => loadAnios(concepto.id_colegio || colegioDefault), 0);
    }

    setMensaje(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setNombre('');
    setMonto('');
  };

  const handleSave = async () => {
    if (!token || !modal) return;
    const cleanName = nombre.trim();
    const numericAmount = Number(String(monto).replace(',', '.'));

    if (!colegioId) {
      setMensaje({ type: 'error', text: 'Selecciona el colegio del concepto.' });
      return;
    }

    if (!anioId) {
      setMensaje({ type: 'error', text: 'Selecciona el año lectivo del concepto.' });
      return;
    }

    if (!cleanName) {
      setMensaje({ type: 'error', text: 'Escribe el nombre del concepto.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMensaje({ type: 'error', text: 'Ingresa un monto válido mayor a 0.' });
      return;
    }

    const data = {
      nombre_concepto: cleanName,
      monto_base: numericAmount,
      tipo_concepto: tipoConcepto,
      es_pension: tipoConcepto === 'PENSION',
      es_extraordinario: tipoConcepto === 'EXTRAORDINARIO',
      id_tenant: tenant?.id_tenant || null,
      id_colegio: Number(colegioId),
      id_anio: Number(anioId),
      scope: activeScope.tipo === 'todos' ? 'all' : undefined,
    };

    setSaving(true);
    setMensaje(null);
    try {
      if (modal.mode === 'edit') {
        await axios.put(`/api/tesoreria/conceptos/${modal.concepto.id_concepto}`, data, authHeader);
      } else {
        await axios.post('/api/tesoreria/conceptos', data, authHeader);
      }

      await loadData();
      setModal(null);
      setNombre('');
      setMonto('');
      showToast({
        type: 'success',
        title: 'Concepto guardado',
        message: `El concepto "${cleanName}" fue guardado correctamente.`,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'No se pudo guardar el concepto.';
      setMensaje({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const pedirEliminarConcepto = (concepto: Concepto) => {
    setConfirmDelete(concepto);
  };

  const ejecutarEliminarConcepto = async () => {
    if (!confirmDelete || confirming) return;

    const concepto = confirmDelete;
    setConfirming(true);

    try {
      const params = new URLSearchParams(
        queryString.startsWith('?')
          ? queryString.slice(1)
          : '',
      );

      if (concepto.id_colegio) {
        params.delete('scope');
        params.set(
          'colegio_id',
          String(concepto.id_colegio),
        );
      } else if (filtroColegioId) {
        params.delete('scope');
        params.set(
          'colegio_id',
          String(filtroColegioId),
        );
      } else if (
        activeScope.tipo === 'todos'
      ) {
        params.set('scope', 'all');
      }

      const query = params.toString()
        ? `?${params.toString()}`
        : '';

      await axios.delete(
        `/api/tesoreria/conceptos/${concepto.id_concepto}${query}`,
        authHeader,
      );

      setConceptos((prev) =>
        prev.filter(
          (item) =>
            item.id_concepto !==
            concepto.id_concepto,
        ),
      );

      showToast({
        type: 'success',
        title: 'Concepto eliminado',
        message:
          `"${concepto.nombre_concepto}" `
          + 'fue eliminado correctamente.',
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'No se pudo eliminar el concepto. '
        + 'Revisa si ya tiene deudas, pagos '
        + 'o cronogramas relacionados.';

      showToast({
        type: 'error',
        title: 'No se pudo eliminar',
        message,
      });
    } finally {
      setConfirming(false);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
        </div>
        <div className="skeleton h-60 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Conceptos de pago</h3>
          <p className="mt-1 text-sm text-gray-500">
            Define pensiones, matrícula y otros cobros base por colegio y año lectivo. Contexto: {nombreColegio(filtroColegioId || undefined)}.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nuevo concepto
        </button>
      </div>

      {mostrarFiltroInstitucion && (
        <section className={`${panelClass} p-4`}>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Institución para visualizar
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
              value={filtroColegioId}
              onChange={(event) => setFiltroColegioId(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Todos los colegios</option>
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre || colegio.nombre_corto}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            Usa todos para revisar conceptos consolidados o selecciona una institución para gestionarla.
          </p>
        </section>
      )}

      {mensaje && !modal && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          {mensaje.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Conceptos</span>
            <ReceiptText size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{conceptos.length}</p>
          <p className="mt-1 text-sm text-gray-500">Registros activos</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Pensiones</span>
            <CreditCard size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{pensiones.length}</p>
          <p className="mt-1 text-sm text-gray-500">Cobros mensuales</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Total pensiones</span>
            <WalletCards size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-gray-950">{formatCurrency(totalPensiones)}</p>
          <p className="mt-1 text-sm text-gray-500">Suma referencial</p>
        </div>
      </div>

      <div className={`${panelClass} p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
              placeholder="Buscar concepto..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['todos', 'Todos'],
              ['pension', 'Pensiones'],
              ['otros', 'Matrícula / otros'],
            ] as [Filter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? 'bg-accent-500 text-white shadow-[0_12px_30px_-18px_rgba(76,110,245,0.95)]'
                    : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {conceptosFiltrados.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <ReceiptText size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">No hay conceptos para mostrar</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Crea un concepto nuevo o cambia los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50/80">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Año / colegio</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conceptosFiltrados.map((concepto) => (
                  <tr key={concepto.id_concepto} className="transition hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                          {concepto.es_pension ? <CreditCard size={17} /> : <ReceiptText size={17} />}
                        </div>
                        <span className="font-semibold text-gray-900">{concepto.nombre_concepto}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-700">{concepto.anio?.nombre_anio || 'Año no identificado'}</p>
                      <p className="text-xs font-medium text-gray-400">
                        {concepto.colegio?.nombre || concepto.colegio?.nombre_corto || 'Colegio no identificado'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">{formatCurrency(concepto.monto_base)}</td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          concepto.tipo_concepto === 'MATRICULA'
                            ? 'bg-amber-50 text-amber-700'
                            : concepto.tipo_concepto === 'PENSION'
                              ? 'bg-blue-50 text-blue-700'
                              : concepto.tipo_concepto === 'EXTRAORDINARIO'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {concepto.tipo_concepto === 'MATRICULA'
                          ? 'Matrícula'
                          : concepto.tipo_concepto === 'PENSION'
                            ? 'Pensión'
                            : concepto.tipo_concepto === 'EXTRAORDINARIO'
                              ? 'Extraordinario'
                              : 'Otro'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(concepto)} className={iconButtonClass}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => pedirEliminarConcepto(concepto)} className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <AccessibleDialog
        open={Boolean(modal)}
        eyebrow="Concepto de pago"
        title={
          modal?.mode === 'edit'
            ? 'Editar concepto'
            : 'Nuevo concepto'
        }
        description="Se usará para generar cuentas por cobrar."
        onClose={closeModal}
        preventClose={saving}
        closeOnEscape
        closeOnOverlay
        closeLabel="Cerrar formulario de concepto"
        initialFocusRef={nombreInputRef}
        maxWidthClassName="max-w-xl"
        bodyClassName="px-6 py-6"
        footerClassName="gap-3 px-6 py-5"
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 motion-reduce:transition-none"
            >
              {saving ? (
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}

              {saving ? 'Guardando...' : 'Guardar concepto'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Colegio
              </span>

              <select
                value={colegioId}
                onChange={(event) => {
                  const value = event.target.value
                    ? Number(event.target.value)
                    : '';

                  setColegioId(value);
                  setAnioId('');
                  void loadAnios(value);
                }}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition-colors duration-150 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 motion-reduce:transition-none"
              >
                <option value="">
                  Seleccionar colegio
                </option>

                {colegios.map((colegio) => (
                  <option
                    key={colegio.id_colegio}
                    value={colegio.id_colegio}
                  >
                    {colegio.nombre
                      || colegio.nombre_corto}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Año lectivo
              </span>

              <select
                value={anioId}
                onChange={(event) =>
                  setAnioId(
                    event.target.value
                      ? Number(event.target.value)
                      : '',
                  )
                }
                disabled={loadingAnios}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition-colors duration-150 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
              >
                <option value="">
                  {loadingAnios
                    ? 'Cargando...'
                    : 'Seleccionar año'}
                </option>

                {aniosDisponibles.map((anio) => (
                  <option
                    key={anio.id_anio}
                    value={anio.id_anio}
                  >
                    {anio.nombre_anio} · {anio.estado}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              Nombre

              <button
                type="button"
                onClick={() => {
                  const anio = aniosDisponibles.find(
                    (item) =>
                      item.id_anio === anioId,
                  );

                  const year =
                    anio?.nombre_anio
                      ?.match(/\d{4}/)?.[0]
                    || new Date().getFullYear();

                  setNombre(`Matrícula ${year}`);
                  setTipoConcepto('MATRICULA');
                  setEsPension(false);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100 transition-colors duration-150 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <CalendarDays
                  size={13}
                  aria-hidden="true"
                />
                Usar “Matrícula año”
              </button>
            </span>

            <input
              ref={nombreInputRef}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 motion-reduce:transition-none"
              value={nombre}
              onChange={(event) =>
                setNombre(event.target.value)
              }
              placeholder="Ej. Pensión Abril"
              autoFocus
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Monto base
            </span>

            <div className="flex h-11 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-colors duration-150 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 motion-reduce:transition-none">
              <span className="flex items-center border-r border-slate-200 px-4 text-sm font-semibold text-slate-500">
                S/
              </span>

              <input
                className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-slate-800 outline-none"
                value={monto}
                inputMode="decimal"
                onChange={(event) =>
                  setMonto(
                    event.target.value.replace(
                      /[^0-9.,]/g,
                      '',
                    ),
                  )
                }
                placeholder="0.00"
              />
            </div>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Tipo de concepto
            </span>

            <select
              value={tipoConcepto}
              onChange={(event) => {
                const value = event.target.value;

                setTipoConcepto(value);
                setEsPension(value === 'PENSION');
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition-colors duration-150 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 motion-reduce:transition-none"
            >
              <option value="MATRICULA">
                Matrícula
              </option>
              <option value="PENSION">
                Pensión
              </option>
              <option value="EXTRAORDINARIO">
                Extraordinario
              </option>
              <option value="OTRO">
                Otro
              </option>
            </select>
          </label>

          {mensaje && modal && (
            <div
              role={
                mensaje.type === 'error'
                  ? 'alert'
                  : 'status'
              }
              aria-live={
                mensaje.type === 'error'
                  ? 'assertive'
                  : 'polite'
              }
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                mensaje.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {mensaje.text}
            </div>
          )}
        </div>
      </AccessibleDialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Eliminar concepto "${confirmDelete?.nombre_concepto || ''}"`}
        description="Si el concepto ya generó deudas o cronogramas, el sistema puede impedir su eliminación para proteger el historial financiero."
        tone="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        loading={confirming}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={ejecutarEliminarConcepto}
      />
    </div>
  );
}
