import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
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
}

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

interface Curso {
  id_curso: number;
  nombre_curso: string;
}

interface PlantillaDetalle {
  id_detalle?: number;
  id_tipo_eval: number;
  descripcion: string;
  orden: number;
  tipo?: TipoEval;
}

interface Plantilla {
  id_plantilla: number;
  nombre: string;
  id_tenant?: number | null;
  id_colegio?: number | null;
  id_nivel?: number | null;
  id_curso?: number | null;
  nivel?: Nivel | null;
  curso?: Curso | null;
  detalles: PlantillaDetalle[];
}

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; plantilla: Plantilla };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';

const inputClass =
  'h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

const labelClass =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400';

const detalleVacio = (orden: number, tipoDefault?: number): PlantillaDetalle => ({
  id_tipo_eval: tipoDefault || 0,
  descripcion: '',
  orden,
});

export default function PlantillasEvaluacionTab() {
  const { token } = useAuth();
  const { tenant, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const colegioConfigId =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : null;

  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [tipos, setTipos] = useState<TipoEval[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [search, setSearch] = useState('');
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [nombre, setNombre] = useState('');
  const [idNivel, setIdNivel] = useState('');
  const [idCurso, setIdCurso] = useState('');
  const [detalles, setDetalles] = useState<PlantillaDetalle[]>([]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const plantillasFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return plantillas;

    return plantillas.filter((plantilla) =>
      [
        plantilla.nombre,
        plantilla.nivel?.nombre_nivel,
        plantilla.curso?.nombre_curso,
        ...(plantilla.detalles || []).map((detalle) => detalle.descripcion),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [plantillas, search]);

  const tipoDefault = tipos[0]?.id_tipo_eval;

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setMensaje(null);

    try {
      const [plantillasRes, tiposRes, nivelesRes, cursosRes] = await Promise.all([
        axios.get(`/api/plantillas${queryString}`, authHeader),
        axios.get(`/api/calificaciones/tipos-evaluacion${queryString}`, authHeader),
        axios.get(`/api/academicos/niveles${queryString}`, authHeader),
        axios.get(`/api/academicos/cursos${queryString}`, authHeader),
      ]);

      setPlantillas(Array.isArray(plantillasRes.data) ? plantillasRes.data : []);
      setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
      setNiveles(Array.isArray(nivelesRes.data) ? nivelesRes.data : []);
      setCursos(Array.isArray(cursosRes.data) ? cursosRes.data : []);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      setMensaje({ type: 'error', text: 'No se pudieron cargar las plantillas de evaluación.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  const resetForm = () => {
    setNombre('');
    setIdNivel('');
    setIdCurso('');
    setDetalles([
      detalleVacio(1, tipoDefault),
      detalleVacio(2, tipoDefault),
      detalleVacio(3, tipoDefault),
    ]);
  };

  const openCreate = () => {
    setModal({ mode: 'create' });
    setMensaje(null);
    resetForm();
  };

  const openEdit = (plantilla: Plantilla) => {
    setModal({ mode: 'edit', plantilla });
    setMensaje(null);
    setNombre(plantilla.nombre || '');
    setIdNivel(plantilla.id_nivel ? String(plantilla.id_nivel) : '');
    setIdCurso(plantilla.id_curso ? String(plantilla.id_curso) : '');
    setDetalles(
      plantilla.detalles?.length
        ? plantilla.detalles
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((detalle, index) => ({
              id_tipo_eval: detalle.id_tipo_eval || detalle.tipo?.id_tipo_eval || tipoDefault || 0,
              descripcion: detalle.descripcion || '',
              orden: detalle.orden || index + 1,
            }))
        : [detalleVacio(1, tipoDefault)],
    );
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    resetForm();
  };

  const addDetalle = () => {
    setDetalles((current) => [
      ...current,
      detalleVacio(current.length + 1, tipoDefault),
    ]);
  };

  const updateDetalle = (index: number, patch: Partial<PlantillaDetalle>) => {
    setDetalles((current) =>
      current.map((detalle, idx) =>
        idx === index ? { ...detalle, ...patch } : detalle,
      ),
    );
  };

  const removeDetalle = (index: number) => {
    setDetalles((current) =>
      current
        .filter((_, idx) => idx !== index)
        .map((detalle, idx) => ({ ...detalle, orden: idx + 1 })),
    );
  };

  const handleSave = async () => {
    if (!token || !modal) return;

    const cleanNombre = nombre.trim();
    const cleanDetalles = detalles
      .map((detalle, index) => ({
        id_tipo_eval: Number(detalle.id_tipo_eval),
        descripcion: detalle.descripcion.trim(),
        orden: index + 1,
      }))
      .filter((detalle) => detalle.id_tipo_eval && detalle.descripcion);

    if (!cleanNombre) {
      setMensaje({ type: 'error', text: 'Escribe el nombre de la plantilla.' });
      return;
    }

    if (cleanDetalles.length === 0) {
      setMensaje({ type: 'error', text: 'Agrega al menos una evaluación a la plantilla.' });
      return;
    }

    const payload = {
      nombre: cleanNombre,
      id_tenant: tenant?.id_tenant || undefined,
      id_colegio: colegioConfigId || undefined,
      id_nivel: idNivel ? Number(idNivel) : null,
      id_curso: idCurso ? Number(idCurso) : null,
      detalles: cleanDetalles,
    };

    setSaving(true);
    setMensaje(null);

    try {
      if (modal.mode === 'edit') {
        await axios.put(`/api/plantillas/${modal.plantilla.id_plantilla}`, payload, authHeader);
      } else {
        await axios.post('/api/plantillas', payload, authHeader);
      }

      await loadData();
      setModal(null);
      resetForm();
      setMensaje({ type: 'success', text: 'Plantilla guardada correctamente.' });
      showToast({
        type: 'success',
        title: 'Plantilla guardada',
        message: `La plantilla quedó configurada para ${scopeLabel}.`,
      });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo guardar la plantilla.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plantilla: Plantilla) => {
    if (!token) return;
    if (!confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) return;

    try {
      await axios.delete(`/api/plantillas/${plantilla.id_plantilla}`, authHeader);
      setPlantillas((current) => current.filter((item) => item.id_plantilla !== plantilla.id_plantilla));
      setMensaje({ type: 'success', text: 'Plantilla eliminada correctamente.' });
    } catch (error: any) {
      setMensaje({ type: 'error', text: error.response?.data?.message || 'No se pudo eliminar la plantilla.' });
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
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes softFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .soft-fade-up { animation: softFadeUp 0.28s ease-out both; }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between soft-fade-up">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Plantillas de evaluación</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
            Dirección define las evaluaciones iniciales antes de abrir la unidad. Los docentes verán estas columnas ya cargadas en Registro de Notas.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <Plus size={17} /> Nueva plantilla
        </button>
      </div>

      {mensaje && !modal && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium soft-fade-up ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          {mensaje.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3 soft-fade-up">
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Plantillas</span>
            <ClipboardList size={18} className="text-blue-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{plantillas.length}</p>
          <p className="mt-1 text-sm text-gray-500">Configuradas para {scopeLabel}</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Evaluaciones</span>
            <Layers3 size={18} className="text-violet-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
            {plantillas.reduce((total, item) => total + (item.detalles?.length || 0), 0)}
          </p>
          <p className="mt-1 text-sm text-gray-500">Columnas base listas para aplicar</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Flujo correcto</span>
            <BookOpenCheck size={18} className="text-emerald-500" />
          </div>
          <p className="mt-3 text-base font-black text-gray-950">Dirección primero</p>
          <p className="mt-1 text-sm text-gray-500">Luego el docente registra notas sin aplicar plantillas.</p>
        </div>
      </div>

      <div className={`${panelClass} p-4 soft-fade-up`}>
        <div className="relative max-w-md">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            placeholder="Buscar plantilla, curso, nivel o evaluación..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {plantillasFiltradas.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center soft-fade-up`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <ClipboardList size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">No hay plantillas para mostrar</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Crea una plantilla inicial para que luego pueda aplicarse a cursos, niveles o al año académico.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 soft-fade-up">
          {plantillasFiltradas.map((plantilla) => (
            <article key={plantilla.id_plantilla} className={`${panelClass} overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-50px_rgba(15,23,42,0.65)]`}>
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <h4 className="truncate text-base font-black text-gray-950">{plantilla.nombre}</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {plantilla.curso?.nombre_curso || plantilla.nivel?.nombre_nivel || 'Alcance general'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => openEdit(plantilla)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-700">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => handleDelete(plantilla)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 px-5 py-4">
                {(plantilla.detalles || []).slice().sort((a, b) => a.orden - b.orden).map((detalle, index) => (
                  <div key={`${plantilla.id_plantilla}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{String(index + 1).padStart(2, '0')}. {detalle.descripcion}</p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-400">{detalle.tipo?.nombre_tipo || 'Tipo no especificado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-gray-200 soft-fade-up">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  <ClipboardList size={13} /> {modal.mode === 'edit' ? 'Editar plantilla' : 'Nueva plantilla'}
                </div>
                <h2 className="mt-3 text-xl font-black text-gray-950">Plantilla de evaluación</h2>
                <p className="mt-1 text-sm text-gray-500">Configura las columnas iniciales que usarán los docentes.</p>
              </div>
              <button type="button" onClick={closeModal} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              {mensaje && modal && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${mensaje.type === 'error' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}>
                  {mensaje.text}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block md:col-span-3">
                  <span className={labelClass}>Nombre de la plantilla</span>
                  <input className={inputClass} value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Plantilla general de Comunicación" />
                </label>

                <label className="block">
                  <span className={labelClass}>Nivel</span>
                  <select className={inputClass} value={idNivel} onChange={(event) => setIdNivel(event.target.value)}>
                    <option value="">Todos los niveles</option>
                    {niveles.map((nivel) => (
                      <option key={nivel.id_nivel} value={nivel.id_nivel}>{nivel.nombre_nivel}</option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className={labelClass}>Curso</span>
                  <select className={inputClass} value={idCurso} onChange={(event) => setIdCurso(event.target.value)}>
                    <option value="">Todos los cursos</option>
                    {cursos.map((curso) => (
                      <option key={curso.id_curso} value={curso.id_curso}>{curso.nombre_curso}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-950">Evaluaciones iniciales</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">Estas columnas aparecerán en Registro de Notas cuando la plantilla sea aplicada por Dirección.</p>
                  </div>
                  <button type="button" onClick={addDetalle} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700">
                    <Plus size={15} /> Agregar
                  </button>
                </div>

                <div className="space-y-3">
                  {detalles.map((detalle, index) => (
                    <div key={index} className="grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-100 md:grid-cols-[120px_1fr_44px]">
                      <select className={inputClass} value={detalle.id_tipo_eval || ''} onChange={(event) => updateDetalle(index, { id_tipo_eval: Number(event.target.value) })}>
                        <option value="">Tipo</option>
                        {tipos.map((tipo) => (
                          <option key={tipo.id_tipo_eval} value={tipo.id_tipo_eval}>{tipo.nombre_tipo}</option>
                        ))}
                      </select>
                      <input className={inputClass} value={detalle.descripcion} onChange={(event) => updateDetalle(index, { descripcion: event.target.value })} placeholder="Ej. Cuaderno, Práctica 1, Examen" />
                      <button type="button" onClick={() => removeDetalle(index)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-gray-300 transition hover:bg-red-50 hover:text-red-500" disabled={detalles.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="h-11 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}