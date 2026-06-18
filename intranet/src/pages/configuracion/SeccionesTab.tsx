import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface ColegioBasico {
  id_colegio: number;
  nombre?: string | null;
  nombre_corto?: string | null;
}

interface Grado {
  id_grado: number;
  nombre_grado: string;
  nivel: { id_nivel: number; nombre_nivel: string };
}

interface Seccion {
  id_seccion: number;
  id_colegio?: number | null;
  colegio?: ColegioBasico | null;
  letra: string;
  id_grado: number;
  id_aula: number;
  grado: { nombre_grado: string; nivel: { nombre_nivel: string } };
  aula: { nombre_aula: string; capacidad: number };
  _count?: { matriculas: number };
}

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

interface AnioLectivo {
  id_anio: number;
  id_colegio?: number | null;
  colegio?: ColegioBasico | null;
  nombre_anio: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado: string;
}

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; seccion: Seccion };

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';
const iconButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-700';

export default function SeccionesTab() {
  const { token } = useAuth();
  const { tenant, colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const colegioConfigId =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : null;

  // ════ Estados (importante: declarar todos los useState antes de cualquier useMemo que los consuma) ════
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [nivelSeleccionado, setNivelSeleccionado] = useState<number | null>(null);
  const [gradoSeleccionado, setGradoSeleccionado] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [letra, setLetra] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | null>(null);
  const [capacidad, setCapacidad] = useState('30');
  const [colegioGestionId, setColegioGestionId] = useState('');

  // ════ Variables derivadas (después de los estados) ════
  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;

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

  const aniosFiltrados = useMemo(() => {
    return anios.filter((anio) => {
      if (!colegioGestionActualId) return true;
      return !anio.id_colegio || anio.id_colegio === colegioGestionActualId;
    });
  }, [anios, colegioGestionActualId]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  // ════ Efectos iniciales ════
  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  // Cargar niveles
  useEffect(() => {
    if (!token) return;
    axios
      .get(`/api/academicos/niveles${scopedQuery}`, authHeader)
      .then((res) => setNiveles(res.data))
      .catch(() => setMensaje({ type: 'error', text: 'No se pudieron cargar los niveles.' }));
  }, [token, authHeader, scopedQuery]);

  // Cargar años lectivos
  useEffect(() => {
    if (!token) return;

    axios
      .get(`/api/academicos/anios${scopedQuery}`, authHeader)
      .then((res) => {
        const data: AnioLectivo[] = res.data || [];
        setAnios(data);

        const disponibles = data.filter((item) => {
          const estado = String(item.estado || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          return !['cerrado', 'archivado'].includes(estado);
        });

        const preferido =
          disponibles.find((item) =>
            String(item.estado || '').toLowerCase().includes('curso'),
          ) ||
          disponibles.find((item) =>
            String(item.estado || '').toLowerCase().includes('matr'),
          ) ||
          disponibles[0];

        setAnioSeleccionado(preferido?.id_anio || null);
      })
      .catch(() =>
        setMensaje({ type: 'error', text: 'No se pudieron cargar los años lectivos.' }),
      );
  }, [token, authHeader, scopedQuery]);

  // Resetear al cambiar de colegio/contexto
  useEffect(() => {
    setNivelSeleccionado(null);
    setGradoSeleccionado(null);
    setSecciones([]);
    setGrados([]);
  }, [scopedQuery]);

  // Cargar grados cuando cambia el nivel
  useEffect(() => {
    if (!token || !nivelSeleccionado) {
      setGrados([]);
      setGradoSeleccionado(null);
      setSecciones([]);
      return;
    }

    const separator = scopedQuery ? '&' : '?';

    axios
      .get(
        `/api/academicos/grados${scopedQuery}${separator}nivel_id=${nivelSeleccionado}`,
        authHeader,
      )
      .then((res) => {
        setGrados(res.data);
        setGradoSeleccionado(null);
        setSecciones([]);
      })
      .catch(() => setMensaje({ type: 'error', text: 'No se pudieron cargar los grados.' }));
  }, [nivelSeleccionado, token, authHeader, scopedQuery]);

  const cargarSecciones = async () => {
    if (!token || !gradoSeleccionado || !anioSeleccionado) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/academicos/secciones${scopedQuery ? `${scopedQuery}&` : '?'}grado_id=${gradoSeleccionado}&anio_id=${anioSeleccionado}`,
        authHeader,
      );
      setSecciones(res.data);
    } catch {
      setSecciones([]);
      setMensaje({ type: 'error', text: 'No se pudieron cargar las secciones.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradoSeleccionado, anioSeleccionado, token, scopedQuery]);

  // ════ Acciones ════
  const openCreate = () => {
    setModal({ mode: 'create' });
    setLetra('');
    setCapacidad('30');
    setMensaje(null);
  };

  const openEdit = (seccion: Seccion) => {
    setModal({ mode: 'edit', seccion });
    setLetra(seccion.letra);
    setMensaje(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setLetra('');
  };

  const handleSave = async () => {
    if (!token || !gradoSeleccionado || !modal) return;
    const cleanLetter = letra.trim().toUpperCase();

    if (!cleanLetter) {
      setMensaje({ type: 'error', text: 'Ingresa una letra para la sección.' });
      return;
    }

    setSaving(true);
    setMensaje(null);
    try {
      if (modal.mode === 'edit') {
        await axios.put(
          `/api/academicos/secciones/${modal.seccion.id_seccion}`,
          { letra: cleanLetter },
          authHeader,
        );
      } else {
        await axios.post(
          `/api/academicos/secciones${scopedQuery}`,
          {
            letra: cleanLetter,
            id_grado: gradoSeleccionado,
            id_colegio: colegioGestionActualId || undefined,
            id_tenant: tenant?.id_tenant || undefined,
            capacidad: Number(capacidad) || 30,
          },
          authHeader,
        );
      }

      await cargarSecciones();
      setModal(null);
      setLetra('');
      setMensaje({ type: 'success', text: 'Sección guardada correctamente.' });
      showToast({
        type: 'success',
        title: 'Sección guardada',
        message: `Sección guardada para ${scopeLabel}.`,
      });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo guardar la sección.' });
    } finally {
      setSaving(false);
    }
  };

  const eliminarSeccion = async (seccion: Seccion) => {
    if (!confirm(`¿Eliminar la sección ${seccion.grado?.nombre_grado || ''} "${seccion.letra}"?`)) return;
    try {
      await axios.delete(`/api/academicos/secciones/${seccion.id_seccion}`, authHeader);
      setSecciones((prev) => prev.filter((item) => item.id_seccion !== seccion.id_seccion));
      setMensaje({ type: 'success', text: 'Sección eliminada correctamente.' });
    } catch (err: any) {
      setMensaje({ type: 'error', text: err.response?.data?.message || 'No se pudo eliminar la sección.' });
    }
  };

  // ════ Lecturas derivadas ════
  const nivelActivo = niveles.find((nivel) => nivel.id_nivel === nivelSeleccionado);
  const gradoActivo = grados.find((grado) => grado.id_grado === gradoSeleccionado);
  const capacidadTotal = secciones.reduce((total, sec) => total + Number(sec.aula?.capacidad || 0), 0);
  const matriculadosTotal = secciones.reduce((total, sec) => total + Number(sec._count?.matriculas || 0), 0);
  const ocupacion = capacidadTotal > 0 ? Math.round((matriculadosTotal / capacidadTotal) * 100) : 0;

  // ════ Interfaz ════
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Secciones</h3>
          <p className="mt-1 text-sm text-gray-500">Filtra por nivel y grado para administrar aulas, aforo y grupos.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!gradoSeleccionado || !anioSeleccionado || !colegioGestionActualId}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          <Plus size={17} /> Nueva sección
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
            En vista consolidada, primero elige una institución para no mezclar años, grados ni secciones.
          </p>
        </section>
      )}

      <div className={`${panelClass} p-4`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Nivel educativo</label>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
              value={nivelSeleccionado || ''}
              onChange={(event) => setNivelSeleccionado(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Seleccionar nivel</option>
              {niveles.map((nivel) => (
                <option key={nivel.id_nivel} value={nivel.id_nivel}>
                  {nivel.nombre_nivel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Grado</label>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              value={gradoSeleccionado || ''}
              disabled={!nivelSeleccionado}
              onChange={(event) => setGradoSeleccionado(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Seleccionar grado</option>
              {grados.map((grado) => (
                <option key={grado.id_grado} value={grado.id_grado}>
                  {grado.nombre_grado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">Año lectivo</label>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
              value={anioSeleccionado || ''}
              onChange={(event) => setAnioSeleccionado(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Seleccionar año</option>
              {aniosFiltrados.map((anio) => (
                <option key={anio.id_anio} value={anio.id_anio}>
                  {anio.nombre_anio} · {anio.estado}
                  {mostrarSelectorInstitucion && anio.colegio?.nombre ? ` · ${anio.colegio.nombre}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm lg:min-w-64">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Vista actual</p>
            <p className="mt-1 truncate font-semibold text-gray-900">
              {nombreColegioGestion} · {nivelActivo?.nombre_nivel || 'Sin nivel'} {gradoActivo ? `· ${gradoActivo.nombre_grado}` : ''}
            </p>
          </div>
        </div>
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Secciones</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{secciones.length}</p>
          <p className="mt-1 text-sm text-gray-500">Registradas en el grado</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Matriculados</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{matriculadosTotal}</p>
          <p className="mt-1 text-sm text-gray-500">Alumnos asignados</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Ocupación</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{ocupacion}%</p>
          <div className="mt-3 h-2 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, ocupacion)}%` }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-44 rounded-3xl" />
      ) : !gradoSeleccionado ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <Building2 size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">Selecciona un nivel y grado</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Luego podrás crear, editar o revisar las secciones disponibles.</p>
        </div>
      ) : secciones.length === 0 ? (
        <div className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
            <Users size={25} />
          </div>
          <h4 className="text-base font-semibold text-gray-900">No hay secciones para este grado</h4>
          <p className="mt-1 max-w-md text-sm text-gray-500">Crea la primera sección para empezar a matricular alumnos.</p>
        </div>
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50/80">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Sección</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Aula</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Capacidad</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Matriculados</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {secciones.map((sec) => (
                  <tr key={sec.id_seccion} className="transition hover:bg-gray-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-sm font-bold text-accent-600">
                          {sec.letra}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{sec.grado?.nombre_grado || 'Grado'} “{sec.letra}”</p>
                          <p className="text-xs text-gray-500">
                            {sec.grado?.nivel?.nombre_nivel || nivelActivo?.nombre_nivel || 'Nivel'}
                            {sec.colegio?.nombre ? ` · ${sec.colegio.nombre}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{sec.aula?.nombre_aula || 'Sin aula'}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-700">{sec.aula?.capacidad || '—'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                        <Users size={14} /> {sec._count?.matriculas ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openEdit(sec)} className={iconButtonClass}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarSeccion(sec)}
                          className={`${iconButtonClass} hover:border-red-100 hover:bg-red-50 hover:text-red-500`}
                        >
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">Sección</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">
                  {modal.mode === 'edit' ? 'Editar sección' : 'Nueva sección'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{gradoActivo?.nombre_grado || 'Grado seleccionado'}</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Letra o código de sección</label>
                <input
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold uppercase text-gray-800 outline-none transition placeholder:normal-case placeholder:text-gray-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                  value={letra}
                  onChange={(event) => setLetra(event.target.value.toUpperCase())}
                  placeholder="Ej. A"
                  maxLength={3}
                  autoFocus
                />
              </div>

              {modal.mode === 'create' && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500">Capacidad del aula</label>
                  <input
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                    value={capacidad}
                    inputMode="numeric"
                    onChange={(event) => setCapacidad(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="30"
                  />
                </div>
              )}

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