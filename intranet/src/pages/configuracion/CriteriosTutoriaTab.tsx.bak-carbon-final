import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  ShieldCheck,
  UserRoundCheck,
  X,
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

type TipoCriterio = 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';

interface CriterioTutoria {
  id_criterio: number;
  id_colegio?: number | null;
  tipo: TipoCriterio;
  descripcion: string;
  orden: number;
  activo: boolean;
  usos?: number;
}

type ModalState =
  | { mode: 'create'; tipo: TipoCriterio }
  | { mode: 'edit'; criterio: CriterioTutoria };

const tipoInfo: Record<TipoCriterio, { label: string; icon: any; description: string }> = {
  CONDUCTA: {
    label: 'Conducta del alumno',
    icon: ShieldCheck,
    description: 'Indicadores que evalúan comportamiento, responsabilidad y participación.',
  },
  PARTICIPACION_FAMILIAR: {
    label: 'Participación de padres',
    icon: UserRoundCheck,
    description: 'Indicadores sobre acompañamiento y compromiso familiar.',
  },
};

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';

export default function CriteriosTutoriaTab() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
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

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const [criterios, setCriterios] = useState<CriterioTutoria[]>([]);
  const [tipoActivo, setTipoActivo] = useState<TipoCriterio>('CONDUCTA');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [ordenEditado, setOrdenEditado] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<CriterioTutoria | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CriterioTutoria | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  const loadData = async () => {
    if (!token || !colegioGestionActualId) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get(`/api/tutoria/criterios${scopedQuery}`, authHeader);
      setCriterios(Array.isArray(res.data?.criterios) ? res.data.criterios : []);
      setOrdenEditado(false);
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudieron cargar los criterios de tutoría.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopedQuery, colegioGestionActualId]);

  const criteriosOrdenadosTipo = useMemo(() => {
    return criterios
      .filter((criterio) => criterio.tipo === tipoActivo)
      .slice()
      .sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.id_criterio - b.id_criterio);
  }, [criterios, tipoActivo]);

  const criteriosPorTipo = useMemo(() => {
    const term = search.trim().toLowerCase();

    return criteriosOrdenadosTipo.filter((criterio) =>
      criterio.descripcion.toLowerCase().includes(term),
    );
  }, [criteriosOrdenadosTipo, search]);

  const resumen = useMemo(() => {
    const conducta = criterios.filter((item) => item.tipo === 'CONDUCTA');
    const familia = criterios.filter((item) => item.tipo === 'PARTICIPACION_FAMILIAR');

    return {
      total: criterios.length,
      activos: criterios.filter((item) => item.activo).length,
      conducta: conducta.filter((item) => item.activo).length,
      familia: familia.filter((item) => item.activo).length,
    };
  }, [criterios]);

  const openCreate = (tipo: TipoCriterio) => {
    const ultimoOrden =
      Math.max(0, ...criterios.filter((item) => item.tipo === tipo).map((item) => item.orden || 0)) + 1;

    setModal({ mode: 'create', tipo });
    setDescripcion('');
    setOrden(ultimoOrden);
    setMensaje(null);
  };

  const openEdit = (criterio: CriterioTutoria) => {
    setModal({ mode: 'edit', criterio });
    setDescripcion(criterio.descripcion);
    setOrden(criterio.orden || 1);
    setMensaje(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setDescripcion('');
    setOrden(1);
  };

  const handleSave = async () => {
    if (!token || !modal) return;

    const cleanDescripcion = descripcion.replace(/\s+/g, ' ').trim();

    if (!cleanDescripcion) {
      setMensaje({ type: 'error', text: 'Escribe la descripción del criterio.' });
      return;
    }

    setSaving(true);
    setMensaje(null);

    try {
      if (modal.mode === 'edit') {
        await axios.patch(
          `/api/tutoria/criterios/${modal.criterio.id_criterio}${scopedQuery}`,
          {
            descripcion: cleanDescripcion,
            orden: Number(orden || 1),
          },
          authHeader,
        );
      } else {
        await axios.post(
          `/api/tutoria/criterios${scopedQuery}`,
          {
            tipo: modal.tipo,
            descripcion: cleanDescripcion,
            orden: Number(orden || 1),
            id_colegio: colegioGestionActualId || undefined,
          },
          authHeader,
        );
      }

      await loadData();
      closeModal();

      setMensaje({ type: 'success', text: 'Criterio guardado correctamente.' });
      showToast({
        type: 'success',
        title: 'Criterio guardado',
        message: `Indicador actualizado para ${nombreColegioGestion}.`,
      });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo guardar el criterio.',
      });
    } finally {
      setSaving(false);
    }
  };

  const moverCriterio = (criterio: CriterioTutoria, direccion: -1 | 1) => {
    if (guardandoOrden) return;

    const lista = criterios
      .filter((item) => item.tipo === criterio.tipo)
      .slice()
      .sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.id_criterio - b.id_criterio);

    const index = lista.findIndex((item) => item.id_criterio === criterio.id_criterio);
    const destino = index + direccion;

    if (index < 0 || destino < 0 || destino >= lista.length) return;

    const nuevaLista = [...lista];
    const [movido] = nuevaLista.splice(index, 1);
    nuevaLista.splice(destino, 0, movido);

    const reordenados = nuevaLista.map((item, itemIndex) => ({
      ...item,
      orden: itemIndex + 1,
    }));

    setCriterios((prev) => {
      const otros = prev.filter((item) => item.tipo !== criterio.tipo);
      return [...otros, ...reordenados];
    });

    setOrdenEditado(true);
    setMensaje(null);
  };

  const guardarOrdenCriterios = async () => {
    if (!token || guardandoOrden || !ordenEditado) return;

    const lista = criterios
      .filter((item) => item.tipo === tipoActivo)
      .slice()
      .sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.id_criterio - b.id_criterio);

    setGuardandoOrden(true);
    setMensaje(null);

    try {
      await axios.post(
        `/api/tutoria/criterios/reordenar${scopedQuery}`,
        {
          tipo: tipoActivo,
          orden: lista.map((item, itemIndex) => ({
            id_criterio: item.id_criterio,
            orden: itemIndex + 1,
          })),
        },
        authHeader,
      );

      await loadData();

      showToast({
        type: 'success',
        title: 'Orden guardado',
        message: 'El orden de los criterios fue actualizado correctamente.',
      });

      setMensaje({
        type: 'success',
        text: 'Orden de criterios guardado correctamente.',
      });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo guardar el orden de los criterios.',
      });
    } finally {
      setGuardandoOrden(false);
    }
  };

  const ejecutarEliminarCriterio = async () => {
    if (!confirmDelete) return;

    const criterio = confirmDelete;
    setConfirmDelete(null);

    try {
      await axios.delete(`/api/tutoria/criterios/${criterio.id_criterio}${scopedQuery}`, authHeader);
      await loadData();

      setMensaje({
        type: 'success',
        text: 'Criterio eliminado correctamente.',
      });

      showToast({
        type: 'success',
        title: 'Criterio eliminado',
        message: 'El indicador fue retirado de la configuración.',
      });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text:
          err.response?.data?.message ||
          'No se pudo eliminar el criterio. Si ya tiene registros, desactívalo para conservar el historial.',
      });
    }
  };

  const ejecutarToggle = async () => {
    if (!confirmToggle) return;

    const criterio = confirmToggle;
    setConfirmToggle(null);

    try {
      await axios.patch(
        `/api/tutoria/criterios/${criterio.id_criterio}${scopedQuery}`,
        { activo: !criterio.activo },
        authHeader,
      );

      await loadData();

      setMensaje({
        type: 'success',
        text: criterio.activo ? 'Criterio desactivado correctamente.' : 'Criterio reactivado correctamente.',
      });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo actualizar el estado del criterio.',
      });
    }
  };

  const TipoIcon = tipoInfo[tipoActivo].icon;

  if (loading) {
    return (
      <div className="space-y-4 erp-page-enter">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
        </div>
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 erp-page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Criterios de tutoría</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configura los indicadores que se usarán en conducta y participación familiar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreate(tipoActivo)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:-translate-y-0.5 hover:bg-accent-600"
        >
          <Plus size={17} /> Nuevo criterio
        </button>
      </div>

      {mostrarSelectorInstitucion && (
        <section className={`${panelClass} p-4 erp-section-enter`}>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
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
            <p className="mt-2 text-xs font-semibold text-gray-500">
              En vista consolidada, primero elige la institución para no mezclar criterios entre colegios.
            </p>
          </label>
        </section>
      )}

      {mensaje && (
        <div
          className={`flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.text}</span>
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-4 erp-stagger">
        {[
          { label: 'Criterios', value: resumen.total, helper: 'Registrados', icon: ClipboardList },
          { label: 'Activos', value: resumen.activos, helper: 'Visibles en Tutoría', icon: Eye },
          { label: 'Conducta', value: resumen.conducta, helper: 'Indicadores activos', icon: ShieldCheck },
          { label: 'Familia', value: resumen.familia, helper: 'Indicadores activos', icon: UserRoundCheck },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className={`${panelClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-gray-950">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{card.helper}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className={`${panelClass} overflow-hidden erp-section-enter`}>
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(tipoInfo) as TipoCriterio[]).map((tipo) => {
                const Icon = tipoInfo[tipo].icon;
                const active = tipoActivo === tipo;

                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTipoActivo(tipo);
                      setSearch('');
                      setMensaje(null);
                    }}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100 hover:bg-white hover:text-slate-950'
                    }`}
                  >
                    <span className={`rounded-xl p-2 ${active ? 'bg-white/10 text-white' : 'bg-white text-blue-600'}`}>
                      <Icon size={17} />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{tipoInfo[tipo].label}</span>
                      <span className={`block text-xs font-semibold ${active ? 'text-white/65' : 'text-slate-400'}`}>
                        {criterios.filter((item) => item.tipo === tipo && item.activo).length} activos
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {ordenEditado && (
                <button
                  type="button"
                  onClick={guardarOrdenCriterios}
                  disabled={guardandoOrden}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {guardandoOrden ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar orden
                </button>
              )}

              <div className="relative min-w-0 lg:w-80">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar criterio..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 px-4 py-3">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
              <TipoIcon size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">{tipoInfo[tipoActivo].label}</h4>
              <p className="mt-1 text-sm text-slate-500">{tipoInfo[tipoActivo].description}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50">
              <tr className="border-y border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Criterio</th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">Uso en libretas</th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {criteriosPorTipo.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                    No hay criterios para mostrar.
                  </td>
                </tr>
              ) : (
                criteriosPorTipo.map((criterio) => (
                  <tr key={criterio.id_criterio} className={`border-b border-slate-100 transition hover:bg-slate-50/70 ${!criterio.activo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                          {criterio.orden}
                        </span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moverCriterio(criterio, -1)}
                            disabled={
                              guardandoOrden ||
                              criteriosOrdenadosTipo.findIndex((item) => item.id_criterio === criterio.id_criterio) === 0
                            }
                            className="inline-flex h-5 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Subir criterio"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverCriterio(criterio, 1)}
                            disabled={
                              guardandoOrden ||
                              criteriosOrdenadosTipo.findIndex((item) => item.id_criterio === criterio.id_criterio) === criteriosOrdenadosTipo.length - 1
                            }
                            className="inline-flex h-5 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Bajar criterio"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">{criterio.descripcion}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {criterio.activo ? 'Visible en Tutoría y Libreta' : 'No visible en nuevos cierres'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          (criterio.usos || 0) > 0
                            ? 'bg-blue-50 text-blue-700 ring-blue-100'
                            : 'bg-slate-50 text-slate-500 ring-slate-100'
                        }`}
                      >
                        {(criterio.usos || 0) > 0 ? 'En uso' : 'Sin uso'}
                      </span>
                      {(criterio.usos || 0) > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-slate-400">
                          {criterio.usos} registro{criterio.usos === 1 ? '' : 's'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
                        criterio.activo
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-slate-50 text-slate-500 ring-slate-100'
                      }`}>
                        {criterio.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(criterio)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Editar criterio"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmToggle(criterio)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            criterio.activo
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={criterio.activo ? 'Desactivar criterio' : 'Reactivar criterio'}
                        >
                          {criterio.activo ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if ((criterio.usos || 0) > 0) {
                              setMensaje({
                                type: 'error',
                                text: 'Este criterio está en uso en libretas o cierres anteriores. Para conservar el historial, desactívalo en lugar de eliminarlo.',
                              });
                              return;
                            }

                            setConfirmDelete(criterio);
                          }}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            (criterio.usos || 0) > 0
                              ? 'cursor-not-allowed text-slate-300'
                              : 'text-red-500 hover:bg-red-50'
                          }`}
                          title={
                            (criterio.usos || 0) > 0
                              ? 'No se puede eliminar porque está en uso'
                              : 'Eliminar criterio'
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && createPortal(
        <div className="carbon-config-modal-overlay fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closeModal} />

          <section className="carbon-config-modal-panel relative w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)] ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {modal.mode === 'edit' ? 'Editar criterio' : 'Nuevo criterio'}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {modal.mode === 'edit'
                    ? modal.criterio.descripcion
                    : tipoInfo[modal.tipo].label}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label>
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Descripción del criterio
                </span>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  placeholder="Ej. Mantiene orden y buena presentación personal..."
                />
              </label>

              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                El orden se modifica desde la tabla con las flechas de subir y bajar.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar criterio
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        eyebrow="Criterios de tutoría"
        title="Confirmar eliminación de criterio"
        description={
          confirmDelete
            ? `Se eliminará definitivamente el criterio "${confirmDelete.descripcion}". Esta acción solo está permitida si no tiene registros asociados.`
            : ''
        }
        tone="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          void ejecutarEliminarCriterio();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        eyebrow="Criterios de tutoría"
        title={confirmToggle?.activo ? 'Desactivar criterio' : 'Reactivar criterio'}
        description={
          confirmToggle?.activo
            ? 'El criterio dejará de aparecer en nuevos cierres de tutoría, pero se conservarán sus registros anteriores.'
            : 'El criterio volverá a estar disponible para los cierres de tutoría.'
        }
        tone={confirmToggle?.activo ? 'warning' : 'neutral'}
        confirmLabel={confirmToggle?.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
        cancelLabel="Cancelar"
        onCancel={() => setConfirmToggle(null)}
        onConfirm={() => {
          void ejecutarToggle();
        }}
      />
    </div>
  );
}
