import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import CenteredFormModal from '../../components/CenteredFormModal';

interface Area {
  id_area: number;
  nombre_area: string;
  id_tenant?: number | null;
  id_colegio?: number | null;
}

interface Curso {
  id_curso: number;
  nombre_curso: string;
  id_area?: number;
  id_colegio?: number | null;
  id_tenant?: number | null;
  area?: {
    id_area?: number;
    nombre_area: string;
    id_colegio?: number | null;
  };
}

type ModalState =
  | { type: 'area'; mode: 'create' }
  | { type: 'area'; mode: 'edit'; area: Area }
  | { type: 'curso'; mode: 'create'; area: Area }
  | {
      type: 'curso';
      mode: 'edit';
      area: Area;
      curso: Curso;
    };

const panelClass =
  'config-surface rounded-2xl border border-slate-200 bg-white shadow-sm';

const iconButtonClass =
  'config-icon-action inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700';

export default function CursosTab() {
  const { token } = useAuth();

  const {
    tenant,
    colegios,
    activeScope,
    activeColegio,
    queryString,
    scopeLabel,
  } = useSchool();

  const { showToast } = useToast();

  const colegioConfigId =
    activeScope.tipo === 'colegio' &&
    activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : null;

  const mostrarSelectorInstitucion =
    activeScope.tipo === 'todos' && colegios.length > 1;

  const [colegioGestionId, setColegioGestionId] =
    useState('');

  const colegioGestionActualId = Number(
    mostrarSelectorInstitucion
      ? colegioGestionId
      : colegioConfigId ||
          colegios[0]?.id_colegio ||
          0,
  );

  const scopedQuery = useMemo(() => {
    const params = new URLSearchParams(
      queryString.startsWith('?')
        ? queryString.slice(1)
        : queryString,
    );

    if (colegioGestionActualId) {
      params.delete('scope');
      params.set(
        'colegio_id',
        String(colegioGestionActualId),
      );
    }

    const value = params.toString();
    return value ? `?${value}` : '';
  }, [queryString, colegioGestionActualId]);

  const nombreColegioGestion = useMemo(() => {
    const colegio = colegios.find(
      (item) =>
        item.id_colegio === colegioGestionActualId,
    );

    return (
      colegio?.nombre ||
      colegio?.nombre_corto ||
      scopeLabel
    );
  }, [
    colegios,
    colegioGestionActualId,
    scopeLabel,
  ]);

  const [areas, setAreas] = useState<Area[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] =
    useState<ModalState | null>(null);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const [mensaje, setMensaje] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] =
    useState<
      | { type: 'area'; area: Area }
      | { type: 'curso'; curso: Curso }
      | null
    >(null);

  const authHeader = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  useEffect(() => {
    if (
      mostrarSelectorInstitucion &&
      !colegioGestionId &&
      colegios[0]?.id_colegio
    ) {
      setColegioGestionId(
        String(colegios[0].id_colegio),
      );
    }
  }, [
    mostrarSelectorInstitucion,
    colegioGestionId,
    colegios,
  ]);

  const loadData = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const [areasRes, cursosRes] =
        await Promise.all([
          axios.get(
            `/api/academicos/areas${scopedQuery}`,
            authHeader,
          ),
          axios.get(
            `/api/academicos/cursos${scopedQuery}`,
            authHeader,
          ),
        ]);

      setAreas(
        Array.isArray(areasRes.data)
          ? areasRes.data
          : [],
      );

      setCursos(
        Array.isArray(cursosRes.data)
          ? cursosRes.data
          : [],
      );
    } catch {
      setMensaje({
        type: 'error',
        text: 'No se pudieron cargar áreas y cursos.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopedQuery]);

  const areasInstitucion = useMemo(
    () =>
      areas.filter((area) => {
        if (!colegioGestionActualId) return true;

        return (
          Number(area.id_colegio) ===
          Number(colegioGestionActualId)
        );
      }),
    [areas, colegioGestionActualId],
  );

  const cursosInstitucion = useMemo(
    () =>
      cursos.filter((curso) => {
        if (!colegioGestionActualId) return true;

        const cursoColegioId =
          curso.id_colegio ??
          curso.area?.id_colegio;

        return (
          Number(cursoColegioId) ===
          Number(colegioGestionActualId)
        );
      }),
    [cursos, colegioGestionActualId],
  );

  const cursosPorArea = (area: Area) =>
    cursosInstitucion.filter(
      (curso) =>
        Number(
          curso.id_area ?? curso.area?.id_area,
        ) === Number(area.id_area),
    );

  const openModal = (state: ModalState) => {
    setModal(state);
    setMensaje(null);

    if (state.type === 'area') {
      setNombre(
        state.mode === 'edit'
          ? state.area.nombre_area
          : '',
      );
      return;
    }

    setNombre(
      state.mode === 'edit'
        ? state.curso.nombre_curso
        : '',
    );
  };

  const closeModal = () => {
    if (saving) return;

    setModal(null);
    setNombre('');
    setMensaje(null);
  };

  const handleSave = async () => {
    if (!token || !modal) return;

    const cleanName = nombre.trim();

    if (!cleanName) {
      setMensaje({
        type: 'error',
        text: 'Escribe un nombre antes de guardar.',
      });
      return;
    }

    setSaving(true);
    setMensaje(null);

    try {
      if (modal.type === 'area') {
        if (modal.mode === 'edit') {
          await axios.put(
            `/api/academicos/areas/${modal.area.id_area}`,
            {
              nombre_area: cleanName,
            },
            authHeader,
          );
        } else {
          await axios.post(
            `/api/academicos/areas${scopedQuery}`,
            {
              nombre_area: cleanName,
              id_tenant:
                tenant?.id_tenant || undefined,
              id_colegio:
                colegioGestionActualId ||
                undefined,
            },
            authHeader,
          );
        }
      } else if (modal.mode === 'edit') {
        await axios.put(
          `/api/academicos/cursos/${modal.curso.id_curso}`,
          {
            nombre_curso: cleanName,
            id_area: modal.area.id_area,
          },
          authHeader,
        );
      } else {
        await axios.post(
          `/api/academicos/cursos${scopedQuery}`,
          {
            nombre_curso: cleanName,
            id_area: modal.area.id_area,
            id_tenant:
              tenant?.id_tenant || undefined,
            id_colegio:
              colegioGestionActualId ||
              modal.area.id_colegio ||
              undefined,
          },
          authHeader,
        );
      }

      await loadData();

      setModal(null);
      setNombre('');

      setMensaje({
        type: 'success',
        text: 'Cambios guardados correctamente.',
      });

      showToast({
        type: 'success',
        title: 'Configuración guardada',
        message: `Cursos actualizados para ${nombreColegioGestion}.`,
      });
    } catch (error: any) {
      setMensaje({
        type: 'error',
        text:
          error.response?.data?.message ||
          'No se pudo guardar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const ejecutarEliminar = async () => {
    if (!confirmDelete) return;

    const item = confirmDelete;
    setConfirmDelete(null);

    try {
      if (item.type === 'area') {
        await axios.delete(
          `/api/academicos/areas/${item.area.id_area}`,
          authHeader,
        );

        setAreas((current) =>
          current.filter(
            (area) =>
              area.id_area !== item.area.id_area,
          ),
        );

        setCursos((current) =>
          current.filter(
            (curso) =>
              curso.id_area !==
                item.area.id_area &&
              curso.area?.nombre_area !==
                item.area.nombre_area,
          ),
        );

        setMensaje({
          type: 'success',
          text: 'Área eliminada correctamente.',
        });
      } else {
        await axios.delete(
          `/api/academicos/cursos/${item.curso.id_curso}`,
          authHeader,
        );

        setCursos((current) =>
          current.filter(
            (curso) =>
              curso.id_curso !==
              item.curso.id_curso,
          ),
        );

        setMensaje({
          type: 'success',
          text: 'Curso eliminado correctamente.',
        });
      }
    } catch (error: any) {
      setMensaje({
        type: 'error',
        text:
          error.response?.data?.message ||
          'No se pudo eliminar el registro.',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>

        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const promedio =
    areasInstitucion.length > 0
      ? Math.round(
          cursosInstitucion.length /
            areasInstitucion.length,
        )
      : 0;

  return (
    <div className="config-cursos-page space-y-5">
      <header className="config-cursos-hero flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Áreas curriculares y cursos
          </h3>

          <p className="mt-1 max-w-3xl text-sm font-normal leading-6 text-slate-600">
            Organiza los cursos por área para mantener
            clara la estructura académica de{' '}
            {nombreColegioGestion}.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            openModal({
              type: 'area',
              mode: 'create',
            })
          }
          className="config-primary-action inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Plus size={17} />
          Nueva área
        </button>
      </header>

      {mostrarSelectorInstitucion && (
        <section className={`${panelClass} p-4`}>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
              Institución para gestionar
            </span>

            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={colegioGestionId}
              onChange={(event) => {
                setColegioGestionId(
                  event.target.value,
                );
                setMensaje(null);
              }}
            >
              {colegios.map((colegio) => (
                <option
                  key={colegio.id_colegio}
                  value={colegio.id_colegio}
                >
                  {colegio.nombre ||
                    colegio.nombre_corto}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-xs font-normal text-slate-600">
            Selecciona primero la institución para
            evitar mezclar cursos entre sedes.
          </p>
        </section>
      )}

      {mensaje && !modal && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}

          {mensaje.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div
          className={`${panelClass} config-cursos-kpi p-5`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
              Áreas
            </span>
            <FolderKanban
              size={20}
              className="text-blue-600"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-950">
            {areasInstitucion.length}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Agrupadores académicos
          </p>
        </div>

        <div
          className={`${panelClass} config-cursos-kpi p-5`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
              Cursos
            </span>
            <BookOpenCheck
              size={20}
              className="text-violet-600"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-950">
            {cursosInstitucion.length}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Cursos registrados
          </p>
        </div>

        <div
          className={`${panelClass} config-cursos-kpi p-5`}
        >
          <span className="text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
            Promedio
          </span>

          <p className="mt-3 text-3xl font-bold text-slate-950">
            {promedio}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Cursos por área
          </p>
        </div>
      </div>

      {areasInstitucion.length === 0 ? (
        <div
          className={`${panelClass} flex flex-col items-center justify-center px-6 py-14 text-center`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban size={25} />
          </div>

          <h4 className="text-base font-bold text-slate-950">
            Aún no hay áreas curriculares
          </h4>

          <p className="mt-1 max-w-md text-sm text-slate-600">
            Crea un área para comenzar a registrar
            cursos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {areasInstitucion.map((area, index) => {
            const cursosDelArea =
              cursosPorArea(area);

            return (
              <article
                key={area.id_area}
                className={`${panelClass} config-area-card overflow-hidden`}
              >
                <div className="config-area-card__header flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                      {String(index + 1).padStart(
                        2,
                        '0',
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-950">
                        {area.nombre_area}
                      </h4>

                      <p className="mt-0.5 text-xs text-slate-600">
                        {cursosDelArea.length}{' '}
                        curso
                        {cursosDelArea.length === 1
                          ? ''
                          : 's'}{' '}
                        asociado
                        {cursosDelArea.length === 1
                          ? ''
                          : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          type: 'curso',
                          mode: 'create',
                          area,
                        })
                      }
                      className="config-secondary-action inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      <Plus size={14} />
                      Curso
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          type: 'area',
                          mode: 'edit',
                          area,
                        })
                      }
                      className={iconButtonClass}
                      title="Editar área"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          type: 'area',
                          area,
                        })
                      }
                      className={`${iconButtonClass} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                      title="Eliminar área"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  {cursosDelArea.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
                      Sin cursos en esta área.
                    </div>
                  ) : (
                    cursosDelArea.map((curso) => (
                      <div
                        key={curso.id_curso}
                        className="config-course-row flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-sm bg-blue-500" />

                          <span className="truncate text-sm font-semibold text-slate-800">
                            {curso.nombre_curso}
                          </span>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openModal({
                                type: 'curso',
                                mode: 'edit',
                                area,
                                curso,
                              })
                            }
                            className={iconButtonClass}
                            title="Editar curso"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: 'curso',
                                curso,
                              })
                            }
                            className={`${iconButtonClass} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                            title="Eliminar curso"
                          >
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

      <CenteredFormModal
        open={Boolean(modal)}
        eyebrow={
          modal?.type === 'area'
            ? 'Área curricular'
            : 'Curso'
        }
        title={
          modal?.mode === 'edit'
            ? 'Editar registro'
            : 'Crear registro'
        }
        description={
          modal?.type === 'curso'
            ? `Área: ${modal.area.nombre_area}`
            : `Institución: ${nombreColegioGestion}`
        }
        message={modal ? mensaje?.text : null}
        messageTone={mensaje?.type || 'info'}
        saving={saving}
        submitLabel={
          modal?.mode === 'edit'
            ? 'Guardar cambios'
            : 'Crear registro'
        }
        maxWidthClassName="max-w-lg"
        onClose={closeModal}
        onSubmit={handleSave}
      >
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Nombre
          </span>

          <input
            className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={nombre}
            onChange={(event) =>
              setNombre(event.target.value)
            }
            placeholder={
              modal?.type === 'area'
                ? 'Ej. Ciencia y Tecnología'
                : 'Ej. Biología'
            }
            autoFocus
          />
        </label>
      </CenteredFormModal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={
          confirmDelete?.type === 'area'
            ? `Eliminar área "${confirmDelete.area.nombre_area}"`
            : `Eliminar curso "${
                confirmDelete?.curso.nombre_curso ||
                ''
              }"`
        }
        description={
          confirmDelete?.type === 'area'
            ? 'Si el área tiene cursos vinculados, el sistema puede impedir la eliminación para proteger la configuración.'
            : 'Si el curso tiene asignaciones o notas, el sistema puede impedir la eliminación.'
        }
        tone="danger"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={ejecutarEliminar}
      />
    </div>
  );
}
