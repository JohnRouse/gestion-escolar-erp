import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

interface Area {
  id_area: number;
  nombre_area: string;
}

interface Curso {
  id_curso: number;
  nombre_curso: string;
  id_area?: number;
  area?: { id_area?: number; nombre_area: string };
}

type ModalState =
  | { type: 'area'; mode: 'create' }
  | { type: 'area'; mode: 'edit'; area: Area }
  | { type: 'curso'; mode: 'create'; area: Area }
  | { type: 'curso'; mode: 'edit'; area: Area; curso: Curso };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';
const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-700';

export default function CursosTab() {
  const { token } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [areasRes, cursosRes] = await Promise.all([
        axios.get('/api/academicos/areas', authHeader),
        axios.get('/api/academicos/cursos', authHeader),
      ]);
      setAreas(areasRes.data);
      setCursos(cursosRes.data);
    } catch {
      setMensaje({ type: 'error', text: 'No se pudieron cargar áreas y cursos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const cursosPorArea = (area: Area) =>
    cursos.filter((curso) => curso.id_area === area.id_area || curso.area?.id_area === area.id_area || curso.area?.nombre_area === area.nombre_area);

  const openModal = (state: ModalState) => {
    setModal(state);
    setMensaje(null);
    if (state.type === 'area') {
      setNombre(state.mode === 'edit' ? state.area.nombre_area : '');
    } else {
      setNombre(state.mode === 'edit' ? state.curso.nombre_curso : '');
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
      if (modal.type === 'area') {
        if (modal.mode === 'edit') {
          await axios.put(`/api/academicos/areas/${modal.area.id_area}`, { nombre_area: cleanName }, authHeader);
        } else {
          await axios.post('/api/academicos/areas', { nombre_area: cleanName }, authHeader);
        }
      } else if (modal.mode === 'edit') {
        await axios.put(
          `/api/academicos/cursos/${modal.curso.id_curso}`,
          { nombre_curso: cleanName, id_area: modal.area.id_area },
          authHeader
        );
      } else {
        await axios.post(
          '/api/academicos/cursos',
          { nombre_curso: cleanName, id_area: modal.area.id_area },
          authHeader
        );
      }

      await loadData();
      setModal(null);
      setNombre('');
      setMensaje({ type: 'success', text: 'Cambios guardados correctamente.' });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteArea = async (area: Area) => {
    if (!confirm(`¿Eliminar el área "${area.nombre_area}"?`)) return;
    try {
      await axios.delete(`/api/academicos/areas/${area.id_area}`, authHeader);
      setAreas((prev) => prev.filter((item) => item.id_area !== area.id_area));
      setCursos((prev) => prev.filter((curso) => curso.id_area !== area.id_area && curso.area?.nombre_area !== area.nombre_area));
      setMensaje({ type: 'success', text: 'Área eliminada correctamente.' });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo eliminar el área.' });
    }
  };

  const deleteCurso = async (curso: Curso) => {
    if (!confirm(`¿Eliminar el curso "${curso.nombre_curso}"?`)) return;
    try {
      await axios.delete(`/api/academicos/cursos/${curso.id_curso}`, authHeader);
      setCursos((prev) => prev.filter((item) => item.id_curso !== curso.id_curso));
      setMensaje({ type: 'success', text: 'Curso eliminado correctamente.' });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo eliminar el curso.' });
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
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Áreas curriculares y cursos</h3>
          <p className="mt-1 text-sm text-gray-500">Agrupa los cursos por área para mantener el plan académico claro.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal({ type: 'area', mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nueva área
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
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Áreas</span>
            <FolderKanban size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{areas.length}</p>
          <p className="mt-1 text-sm text-gray-500">Agrupadores académicos</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Cursos</span>
            <BookOpenCheck size={18} className="text-accent-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{cursos.length}</p>
          <p className="mt-1 text-sm text-gray-500">Cursos registrados</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Promedio</span>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
            {areas.length ? Math.round(cursos.length / areas.length) : 0}
          </p>
          <p className="mt-1 text-sm text-gray-500">Cursos por área</p>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <FolderKanban size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">Aún no hay áreas curriculares</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Crea un área para comenzar a registrar cursos.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {areas.map((area, index) => {
            const cursosDelArea = cursosPorArea(area);
            return (
              <article key={area.id_area} className={`${panelClass} overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-sm font-bold text-accent-600 ring-1 ring-accent-100">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-gray-950">{area.nombre_area}</h4>
                      <p className="text-xs text-gray-500">{cursosDelArea.length} cursos asociados</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => openModal({ type: 'curso', mode: 'create', area })} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-accent-200 hover:text-accent-600">
                      <Plus size={14} /> Curso
                    </button>
                    <button type="button" onClick={() => openModal({ type: 'area', mode: 'edit', area })} className={iconButtonClass}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => deleteArea(area)} className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  {cursosDelArea.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-5 text-center text-sm text-gray-500">
                      Sin cursos en esta área.
                    </div>
                  ) : (
                    cursosDelArea.map((curso) => (
                      <div key={curso.id_curso} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/70 bg-gray-50/60 px-3 py-3 transition hover:bg-white hover:shadow-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-2 w-2 shrink-0 rounded-full bg-accent-400" />
                          <span className="truncate text-sm font-medium text-gray-800">{curso.nombre_curso}</span>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => openModal({ type: 'curso', mode: 'edit', area, curso })} className={iconButtonClass}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => deleteCurso(curso)} className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.7)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">
                  {modal.type === 'area' ? 'Área curricular' : 'Curso'}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">
                  {modal.mode === 'edit' ? 'Editar registro' : 'Crear registro'}
                </h3>
                {modal.type === 'curso' && <p className="mt-1 text-sm text-gray-500">Área: {modal.area.nombre_area}</p>}
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
                  placeholder={modal.type === 'area' ? 'Ej. Ciencia y Tecnología' : 'Ej. Biología'}
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
    </div>
  );
}
