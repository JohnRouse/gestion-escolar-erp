import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Save,
  School,
  Trash2,
  X,
} from 'lucide-react';

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
  grados?: Grado[];
}

interface Grado {
  id_grado: number;
  nombre_grado: string;
  id_nivel: number;
}

type ModalState =
  | { type: 'nivel'; mode: 'create' }
  | { type: 'nivel'; mode: 'edit'; nivel: Nivel }
  | { type: 'grado'; mode: 'create'; nivel: Nivel }
  | { type: 'grado'; mode: 'edit'; nivel: Nivel; grado: Grado };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';
const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-gray-400 transition-all hover:border-gray-200 hover:bg-white hover:text-gray-700';

export default function NivelesGradosTab() {
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
      params.set('colegio_id', String(colegioGestionActualId));
    }

    return `?${params.toString()}`;
  }, [queryString, colegioGestionActualId]);

  const nombreColegioGestion = useMemo(() => {
    const colegio = colegios.find((item) => item.id_colegio === colegioGestionActualId);
    return colegio?.nombre || colegio?.nombre_corto || scopeLabel;
  }, [colegios, colegioGestionActualId, scopeLabel]);

  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [grados, setGrados] = useState<Record<number, Grado[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: 'nivel'; nivel: Nivel }
    | { type: 'grado'; nivel: Nivel; grado: Grado }
    | null
  >(null);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const totalGradosCargados = useMemo(
    () => (Object.values(grados) as Grado[][]).reduce((total, lista) => total + lista.length, 0),
    [grados]
  );

  const nivelExpandido = niveles.find((nivel) => nivel.id_nivel === expanded);

  const fetchNiveles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/niveles${scopedQuery}`, authHeader);
      setNiveles(res.data);
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar los niveles.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGrados = async (nivelId: number, force = false) => {
    if (!token || (!force && grados[nivelId])) return;
    try {
      const res = await axios.get(`/api/academicos/grados${scopedQuery}&nivel_id=${nivelId}`, authHeader);
      setGrados((prev) => ({ ...prev, [nivelId]: res.data }));
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar los grados del nivel.' });
    }
  };

  useEffect(() => {
    setExpanded(null);
    setGrados({});
    fetchNiveles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopedQuery]);

  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  const toggleExpand = (nivelId: number) => {
    if (expanded === nivelId) {
      setExpanded(null);
      return;
    }

    setExpanded(nivelId);
    fetchGrados(nivelId);
  };

  const openModal = (state: ModalState) => {
    setModal(state);
    setMensaje(null);
    if (state.type === 'nivel') {
      setNombre(state.mode === 'edit' ? state.nivel.nombre_nivel : '');
    } else {
      setNombre(state.mode === 'edit' ? state.grado.nombre_grado : '');
    }
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
      setMensaje({ type: 'error', text: 'Escribe un nombre antes de guardar.' });
      return;
    }

    setSaving(true);
    setMensaje(null);
    try {
      if (modal.type === 'nivel') {
        if (modal.mode === 'edit') {
          await axios.put(
            `/api/academicos/niveles/${modal.nivel.id_nivel}`,
            { nombre_nivel: cleanName },
            authHeader
          );
        } else {
          await axios.post(
            `/api/academicos/niveles${scopedQuery}`,
            {
              nombre_nivel: cleanName,
              id_colegio: colegioGestionActualId || undefined,
              id_tenant: tenant?.id_tenant || undefined,
            },
            authHeader,
          );
        }
        await fetchNiveles();
      } else {
        if (modal.mode === 'edit') {
          await axios.put(
            `/api/academicos/grados/${modal.grado.id_grado}`,
            { nombre_grado: cleanName, id_nivel: modal.nivel.id_nivel },
            authHeader
          );
        } else {
          await axios.post(
            `/api/academicos/grados${scopedQuery}`,
            {
              nombre_grado: cleanName,
              id_nivel: modal.nivel.id_nivel,
              id_colegio: colegioGestionActualId || undefined,
            },
            authHeader
          );
        }
        await fetchGrados(modal.nivel.id_nivel, true);
        setExpanded(modal.nivel.id_nivel);
      }

      setModal(null);
      setNombre('');
      setMensaje({ type: 'success', text: 'Cambios guardados correctamente.' });
      showToast({
        type: 'success',
        title: 'Configuración guardada',
        message: `Cambios aplicados para ${scopeLabel}.`,
      });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const ejecutarEliminarNivel = async (nivel: Nivel) => {
    try {
      await axios.delete(`/api/academicos/niveles/${nivel.id_nivel}${scopedQuery}`, authHeader);
      setNiveles((prev) => prev.filter((item) => item.id_nivel !== nivel.id_nivel));
      setExpanded((prev) => (prev === nivel.id_nivel ? null : prev));
      setGrados((prev) => {
        const next = { ...prev };
        delete next[nivel.id_nivel];
        return next;
      });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo eliminar el nivel.' });
    }
  };

  const eliminarNivel = (nivel: Nivel) => {
    setConfirmDelete({ type: 'nivel', nivel });
  };

  const ejecutarEliminarGrado = async (nivel: Nivel, grado: Grado) => {
    try {
      await axios.delete(`/api/academicos/grados/${grado.id_grado}${scopedQuery}`, authHeader);
      await fetchGrados(nivel.id_nivel, true);
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo eliminar el grado.' });
    }
  };

  const eliminarGrado = (nivel: Nivel, grado: Grado) => {
    setConfirmDelete({ type: 'grado', nivel, grado });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
        </div>
        <div className="skeleton h-52 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Niveles educativos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Ordena Inicial, Primaria y Secundaria con sus grados respectivos. Contexto: {nombreColegioGestion}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal({ type: 'nivel', mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nuevo nivel
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
              onChange={(event) => setColegioGestionId(event.target.value)}
            >
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre || colegio.nombre_corto}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            En vista consolidada, primero elige la institución para evitar mezclar grados entre colegios.
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
          <AlertCircle size={17} /> {mensaje.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Niveles</span>
            <Layers3 size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{niveles.length}</p>
          <p className="mt-1 text-sm text-gray-500">Estructuras registradas</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Grados visibles</span>
            <BookOpen size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{totalGradosCargados}</p>
          <p className="mt-1 text-sm text-gray-500">Cargados al expandir</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Seleccionado</span>
            <School size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 truncate text-lg font-semibold text-gray-950">{nivelExpandido?.nombre_nivel || 'Ninguno'}</p>
          <p className="mt-1 text-sm text-gray-500">Nivel desplegado</p>
        </div>
      </div>

      {niveles.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <GraduationCap size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">Aún no hay niveles educativos</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Crea tu primer nivel para empezar a organizar grados, secciones y cursos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {niveles.map((nivel, index) => {
            const isOpen = expanded === nivel.id_nivel;
            const gradosDelNivel = grados[nivel.id_nivel] || [];
            return (
              <article key={nivel.id_nivel} className={`${panelClass} overflow-hidden transition-all hover:-translate-y-0.5`}>
                <div
                  onClick={() => toggleExpand(nivel.id_nivel)}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:bg-gray-50/70"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleExpand(nivel.id_nivel);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-gray-950">{nivel.nombre_nivel}</h4>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {gradosDelNivel.length > 0 ? `${gradosDelNivel.length} grados cargados` : 'Haz clic para ver sus grados'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal({ type: 'nivel', mode: 'edit', nivel });
                      }}
                      className={actionButtonClass}
                      aria-label="Editar nivel"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        eliminarNivel(nivel);
                      }}
                      className={`${actionButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}
                      aria-label="Eliminar nivel"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="ml-1 text-gray-400">
                      {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/45 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Grados</p>
                      <button
                        type="button"
                        onClick={() => openModal({ type: 'grado', mode: 'create', nivel })}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-accent-200 hover:text-accent-600"
                      >
                        <Plus size={14} /> Agregar grado
                      </button>
                    </div>

                    {gradosDelNivel.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-5 text-center text-sm text-gray-500">
                        Este nivel todavía no tiene grados registrados.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {gradosDelNivel.map((grado) => (
                          <div
                            key={grado.id_grado}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/70 bg-white px-3 py-3 shadow-sm"
                          >
                            <span className="truncate text-sm font-medium text-gray-800">{grado.nombre_grado}</span>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => openModal({ type: 'grado', mode: 'edit', nivel, grado })}
                                className={actionButtonClass}
                                aria-label="Editar grado"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarGrado(nivel, grado)}
                                className={`${actionButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}
                                aria-label="Eliminar grado"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {modal && createPortal(
        <div className="carbon-config-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="carbon-config-modal-panel relative w-full max-w-md rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.7)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">
                  {modal.type === 'nivel' ? 'Nivel educativo' : 'Grado académico'}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">
                  {modal.mode === 'edit' ? 'Editar registro' : 'Crear registro'}
                </h3>
                {modal.type === 'grado' && (
                  <p className="mt-1 text-sm text-gray-500">Nivel: {modal.nivel.nombre_nivel}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
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
                  placeholder={modal.type === 'nivel' ? 'Ej. Primaria' : 'Ej. Quinto Grado'}
                  autoFocus
                />
              </div>

              {mensaje && modal && (
                <div
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    mensaje.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {mensaje.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-500 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={
          confirmDelete?.type === 'grado'
            ? `Retirar grado "${confirmDelete.grado.nombre_grado}"`
            : `Retirar nivel "${confirmDelete?.nivel.nombre_nivel || ''}"`
        }
        description={
          confirmDelete?.type === 'grado'
            ? 'Se retirará este grado solo de la institución actual. No afectará a otros colegios.'
            : 'Se retirará este nivel de la institución actual si no tiene secciones vinculadas.'
        }
        tone="danger"
        confirmLabel="Sí, retirar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const item = confirmDelete;
          setConfirmDelete(null);
          if (!item) return;
          if (item.type === 'grado') await ejecutarEliminarGrado(item.nivel, item.grado);
          else await ejecutarEliminarNivel(item.nivel);
        }}
      />
    </div>
  );
}