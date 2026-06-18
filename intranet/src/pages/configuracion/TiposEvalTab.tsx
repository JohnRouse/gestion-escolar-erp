import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface TipoEval {
  id_tipo_eval: number;
  nombre_tipo: string;
  id_colegio?: number | null;
}

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; tipo: TipoEval };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';
const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-700';

export default function TiposEvalTab() {
  const { token } = useAuth();
  const { tenant, colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const colegioConfigId =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : null;

  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;
  const [colegioGestionId, setColegioGestionId] = useState('');

  const colegioGestionActualId = Number(
    mostrarSelectorInstitucion
      ? colegioGestionId
      : colegioConfigId || colegios[0]?.id_colegio || 0,
  );

  const scopedQuery = useMemo(() => {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');

    if (colegioGestionActualId) {
      params.delete('scope');
      params.set('colegio_id', String(colegioGestionActualId));
    }

    return `?${params.toString()}`;
  }, [queryString, colegioGestionActualId]);

  const nombreColegioGestion = useMemo(() => {
    const colegio = colegios.find((item) => item.id_colegio === colegioGestionActualId);
    return colegio?.nombre || colegio?.nombre_corto || scopeLabel;
  }, [colegios, colegioGestionActualId, scopeLabel]);

  const [tipos, setTipos] = useState<TipoEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TipoEval | null>(null);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  const tiposInstitucion = useMemo(() => {
    return tipos.filter((tipo) => {
      if (!colegioGestionActualId) return true;

      // Refuerzo frontend: aunque el backend devuelva más datos, la pantalla
      // solo muestra los tipos de la institución seleccionada.
      return Number(tipo.id_colegio) === Number(colegioGestionActualId);
    });
  }, [tipos, colegioGestionActualId]);

  const tiposFiltrados = tiposInstitucion.filter((tipo) =>
    tipo.nombre_tipo.toLowerCase().includes(search.trim().toLowerCase())
  );

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/calificaciones/tipos-evaluacion${scopedQuery}`, authHeader);
      setTipos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar los tipos de evaluación.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopedQuery]);

  const openCreate = () => {
    setModal({ mode: 'create' });
    setNombre('');
    setMensaje(null);
  };

  const openEdit = (tipo: TipoEval) => {
    setModal({ mode: 'edit', tipo });
    setNombre(tipo.nombre_tipo);
    setMensaje(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setNombre('');
  };

  const handleSave = async () => {
    if (!token || !modal) return;
    const cleanName = nombre.trim();

    if (!cleanName) {
      setMensaje({ type: 'error', text: 'Escribe el nombre del tipo de evaluación.' });
      return;
    }

    setSaving(true);
    setMensaje(null);
    try {
      if (modal.mode === 'edit') {
        await axios.put(
          `/api/calificaciones/tipos-evaluacion/${modal.tipo.id_tipo_eval}`,
          {
            nombre_tipo: cleanName,
            id_tenant: tenant?.id_tenant || undefined,
            id_colegio: colegioGestionActualId || undefined,
          },
          authHeader
        );
      } else {
        await axios.post(
          `/api/calificaciones/tipos-evaluacion${scopedQuery}`,
          {
            nombre_tipo: cleanName,
            id_tenant: tenant?.id_tenant || undefined,
            id_colegio: colegioGestionActualId || undefined,
          },
          authHeader,
        );
      }

      await loadData();
      setModal(null);
      setNombre('');
      setMensaje({ type: 'success', text: 'Tipo de evaluación guardado correctamente.' });
      showToast({
        type: 'success',
        title: 'Tipo guardado',
        message: `Tipo de evaluación guardado para ${nombreColegioGestion}.`,
      });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const pedirEliminarTipo = (tipo: TipoEval) => {
    setConfirmDelete(tipo);
  };

  const ejecutarEliminarTipo = async () => {
    if (!confirmDelete) return;

    const tipo = confirmDelete;
    setConfirmDelete(null);

    try {
      await axios.delete(`/api/calificaciones/tipos-evaluacion/${tipo.id_tipo_eval}`, authHeader);
      setTipos((prev) => prev.filter((item) => item.id_tipo_eval !== tipo.id_tipo_eval));
      setMensaje({ type: 'success', text: 'Tipo de evaluación eliminado correctamente.' });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo eliminar.',
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
        <div className="skeleton h-56 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Tipos de evaluación</h3>
          <p className="mt-1 text-sm text-gray-500">Define las categorías que se usarán al crear columnas en la grilla de notas.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nuevo tipo
        </button>
      </div>

      {mostrarSelectorInstitucion && (
        <section className={`${panelClass} p-4`}>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Institución para gestionar
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              value={colegioGestionId}
              onChange={(event) => {
                setColegioGestionId(event.target.value);
                setSearch('');
                setMensaje(null);
              }}
            >
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre || colegio.nombre_corto}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            En vista consolidada, primero elige una institución para evitar duplicados entre colegios.
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
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Tipos</span>
            <ClipboardCheck size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{tiposInstitucion.length}</p>
          <p className="mt-1 text-sm text-gray-500">Categorías registradas</p>
        </div>
        <div className={`${panelClass} p-4 md:col-span-2`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
              <Layers3 size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-950">Recomendación de uso</p>
              <p className="mt-1 text-sm text-gray-500">Mantén nombres cortos: Práctica, Examen, Cuaderno, Participación o Exposición.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelClass} p-4`}>
        <div className="relative max-w-md">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
            placeholder="Buscar tipo de evaluación..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {tiposFiltrados.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <ClipboardCheck size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">No hay tipos para mostrar</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Crea un tipo nuevo o ajusta la búsqueda.</p>
        </div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50/80">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Nombre</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Uso sugerido</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiposFiltrados.map((tipo, index) => (
                  <tr key={tipo.id_tipo_eval} className="transition hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-sm font-bold text-accent-600">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <span className="font-semibold text-gray-900">{tipo.nombre_tipo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
                        Registro de notas
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(tipo)} className={iconButtonClass}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => pedirEliminarTipo(tipo)} className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}>
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
          <div className="relative w-full max-w-md rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.7)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Tipo de evaluación</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">
                  {modal.mode === 'edit' ? 'Editar tipo' : 'Nuevo tipo'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Ejemplo: Práctica, Examen o Participación.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Nombre</label>
                <input
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Práctica"
                  autoFocus
                />
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Eliminar tipo "${confirmDelete?.nombre_tipo || ''}"`}
        description="Si este tipo ya fue usado en evaluaciones o plantillas, el sistema puede impedir la eliminación para proteger el historial."
        tone="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={ejecutarEliminarTipo}
      />
    </div>
  );
}