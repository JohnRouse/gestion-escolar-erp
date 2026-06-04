import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
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
  X,
} from 'lucide-react';

interface Concepto {
  id_concepto: number;
  nombre_concepto: string;
  monto_base: number;
  es_pension: boolean;
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
  const { colegios, activeColegio, activeScope, tenant, queryString } = useSchool();
  const { showToast } = useToast();

  const colegioDefault =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : colegios[0]?.id_colegio || '';

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [esPension, setEsPension] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [colegioId, setColegioId] = useState<number | ''>(colegioDefault);
  const [anioId, setAnioId] = useState<number | ''>('');
  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [loadingAnios, setLoadingAnios] = useState(false);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

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

  const pensiones = conceptos.filter((concepto) => concepto.es_pension);
  const otros = conceptos.filter((concepto) => !concepto.es_pension);
  const totalPensiones = pensiones.reduce((total, concepto) => total + Number(concepto.monto_base || 0), 0);

  const conceptosFiltrados = conceptos.filter((concepto) => {
    const matchesSearch = concepto.nombre_concepto.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === 'todos' ||
      (filter === 'pension' && concepto.es_pension) ||
      (filter === 'otros' && !concepto.es_pension);
    return matchesSearch && matchesFilter;
  });

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = colegioId ? `?colegio_id=${colegioId}` : queryString;
      const res = await axios.get(`/api/tesoreria/conceptos${query}`, authHeader);
      setConceptos(res.data);
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar los conceptos de pago.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, colegioId]);

  const openCreate = () => {
    setModal({ mode: 'create' });
    setNombre('');
    setMonto('');
    setEsPension(false);
    setColegioId(colegioDefault);
    setTimeout(() => loadAnios(colegioDefault), 0);
    setMensaje(null);
  };

  const openEdit = (concepto: Concepto) => {
    setModal({ mode: 'edit', concepto });
    setNombre(concepto.nombre_concepto);
    setMonto(String(concepto.monto_base));
    setEsPension(concepto.es_pension);
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
      es_pension: esPension,
      id_tenant: tenant?.id_tenant || null,
      id_colegio: Number(colegioId),
      id_anio: Number(anioId),
      scope: activeScope.tipo === 'todos' ? 'all' : undefined,
      es_extraordinario: false,
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

  const handleDelete = async (concepto: Concepto) => {
    if (!confirm(`¿Eliminar el concepto "${concepto.nombre_concepto}"?`)) return;
    try {
      await axios.delete(`/api/tesoreria/conceptos/${concepto.id_concepto}`, authHeader);
      setConceptos((prev) => prev.filter((item) => item.id_concepto !== concepto.id_concepto));
      showToast({
        type: 'success',
        title: 'Concepto eliminado',
        message: `"${concepto.nombre_concepto}" fue eliminado correctamente.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error al eliminar',
        message: err.response?.data?.message || 'No se pudo eliminar el concepto.',
      });
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
          <p className="mt-1 text-sm text-gray-500">Define pensiones, matrícula y otros cobros base del colegio.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nuevo concepto
        </button>
      </div>

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
                        {concepto.colegio?.nombre_corto || concepto.colegio?.nombre || 'Colegio no identificado'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">{formatCurrency(concepto.monto_base)}</td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          concepto.es_pension ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {concepto.es_pension ? 'Pensión' : 'Matrícula / otro'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(concepto)} className={iconButtonClass}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(concepto)} className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}>
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-xl rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.7)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Concepto de pago</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">
                  {modal.mode === 'edit' ? 'Editar concepto' : 'Nuevo concepto'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Se usará para generar cuentas por cobrar.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500">Colegio</label>
                  <select
                    value={colegioId}
                    onChange={(event) => {
                      const value = event.target.value ? Number(event.target.value) : '';
                      setColegioId(value);
                      setAnioId('');
                      loadAnios(value);
                    }}
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                  >
                    <option value="">Seleccionar colegio</option>
                    {colegios.map((colegio) => (
                      <option key={colegio.id_colegio} value={colegio.id_colegio}>
                        {colegio.nombre_corto || colegio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500">Año lectivo</label>
                  <select
                    value={anioId}
                    onChange={(event) => setAnioId(event.target.value ? Number(event.target.value) : '')}
                    disabled={loadingAnios}
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10 disabled:opacity-60"
                  >
                    <option value="">{loadingAnios ? 'Cargando...' : 'Seleccionar año'}</option>
                    {aniosDisponibles.map((anio) => (
                      <option key={anio.id_anio} value={anio.id_anio}>
                        {anio.nombre_anio} · {anio.estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                  Nombre
                  <button
                    type="button"
                    onClick={() => {
                      const anio = aniosDisponibles.find((item) => item.id_anio === anioId);
                      const year = anio?.nombre_anio?.match(/\d{4}/)?.[0] || new Date().getFullYear();
                      setNombre(`Matrícula ${year}`);
                      setEsPension(false);
                    }}
                    className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100"
                  >
                    <CalendarDays size={13} />
                    Usar “Matrícula año”
                  </button>
                </label>
                <input
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Pensión Abril"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Monto base</label>
                <div className="flex h-11 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition focus-within:border-accent-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-accent-500/10">
                  <span className="flex items-center border-r border-gray-200 px-4 text-sm font-semibold text-gray-400">S/</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-gray-800 outline-none"
                    value={monto}
                    inputMode="decimal"
                    onChange={(event) => setMonto(event.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Tipo</label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setEsPension(true)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${esPension ? 'bg-white text-accent-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Pensión
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsPension(false)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${!esPension ? 'bg-white text-accent-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Matrícula / otro
                  </button>
                </div>
              </div>

              {mensaje && modal && (
                <div className={`rounded-2xl border px-3 py-2 text-sm ${mensaje.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {mensaje.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button type="button" onClick={closeModal} className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}