import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarDays,
  Edit3,
  ListChecks,
  Loader2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import CenteredFormModal from '../../components/CenteredFormModal';

type AnioLectivo = {
  id_anio: number;
  id_tenant?: number | null;
  id_colegio?: number | null;
  nombre_anio: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

type AnioForm = {
  nombre_anio: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  id_colegio: number | '';
};

type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

const estados = [
  'Planificación',
  'Matrícula abierta',
  'En curso',
  'Cerrado',
  'Archivado',
];

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const formatDateInput = (
  value?: string | null,
) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) return '—';

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart
    .split('-')
    .map(Number);

  if (!year || !month || !day) return '—';

  return new Date(
    year,
    month - 1,
    day,
  ).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const estadoBadge = (estado: string) => {
  const normalizado = estado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizado.includes('matricula')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (
    normalizado.includes('curso') ||
    normalizado === 'activo'
  ) {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }

  if (
    normalizado.includes('planificacion')
  ) {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

const defaultForm = (
  colegioId: number | '',
): AnioForm => {
  const nextYear =
    new Date().getFullYear() + 1;

  return {
    nombre_anio: `Año Escolar ${nextYear}`,
    fecha_inicio: `${nextYear}-03-01`,
    fecha_fin: `${nextYear}-12-20`,
    estado: 'Planificación',
    id_colegio: colegioId,
  };
};

export default function AniosLectivosTab() {
  const { token } = useAuth();

  const {
    tenant,
    colegios,
    activeScope,
    activeColegio,
    queryString,
    scopeLabel,
    institutionSingularLabel,
  } = useSchool();

  const [, setSearchParams] =
    useSearchParams();

  const colegioDefault =
    activeScope.tipo === 'colegio' &&
    activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : colegios[0]?.id_colegio || '';

  const [anios, setAnios] =
    useState<AnioLectivo[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [openForm, setOpenForm] =
    useState(false);

  const [editing, setEditing] =
    useState<AnioLectivo | null>(null);

  const [form, setForm] =
    useState<AnioForm>(() =>
      defaultForm(colegioDefault),
    );

  const [mensaje, setMensaje] =
    useState<PageMessage | null>(null);

  const aniosOrdenados = useMemo(
    () =>
      [...anios].sort((a, b) =>
        String(b.fecha_inicio).localeCompare(
          String(a.fecha_inicio),
        ),
      ),
    [anios],
  );

  useEffect(() => {
    fetchAnios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  const fetchAnios = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await axios.get(
        `/api/academicos/anios${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setAnios(
        Array.isArray(response.data)
          ? response.data
          : [],
      );
    } catch (error: any) {
      setAnios([]);

      setMensaje({
        type: 'error',
        text:
          error.response?.data?.message ||
          'No se pudieron cargar los años lectivos.',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = () => {
    setEditing(null);
    setForm(defaultForm(colegioDefault));
    setMensaje(null);
    setOpenForm(true);
  };

  const abrirEditar = (
    anio: AnioLectivo,
  ) => {
    setEditing(anio);

    setForm({
      nombre_anio: anio.nombre_anio,
      fecha_inicio: formatDateInput(
        anio.fecha_inicio,
      ),
      fecha_fin: formatDateInput(
        anio.fecha_fin,
      ),
      estado:
        anio.estado || 'Planificación',
      id_colegio:
        anio.id_colegio ||
        colegioDefault,
    });

    setMensaje(null);
    setOpenForm(true);
  };

  const cerrarFormulario = () => {
    if (saving) return;

    setOpenForm(false);
    setEditing(null);
    setMensaje(null);
  };

  const abrirPreparacion = (
    anio: AnioLectivo,
  ) => {
    setSearchParams({
      tab: 'preparacion',
      anio_id: String(anio.id_anio),
    });
  };

  const validarForm = () => {
    if (!form.nombre_anio.trim()) {
      return 'Ingresa el nombre del año lectivo.';
    }

    if (!form.fecha_inicio) {
      return 'Ingresa la fecha de inicio.';
    }

    if (!form.fecha_fin) {
      return 'Ingresa la fecha de fin.';
    }

    if (!form.id_colegio) {
      return `Selecciona la ${institutionSingularLabel.toLowerCase()} a la que pertenece el año lectivo.`;
    }

    const inicio = new Date(
      `${form.fecha_inicio}T00:00:00`,
    );

    const fin = new Date(
      `${form.fecha_fin}T00:00:00`,
    );

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      return 'Las fechas ingresadas no son válidas.';
    }

    if (fin <= inicio) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }

    return null;
  };

  const guardarAnio = async () => {
    if (!token) return;

    const validationError =
      validarForm();

    if (validationError) {
      setMensaje({
        type: 'error',
        text: validationError,
      });
      return;
    }

    setSaving(true);
    setMensaje(null);

    const payload = {
      nombre_anio:
        form.nombre_anio.trim(),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      estado: form.estado,
      id_tenant:
        tenant?.id_tenant || null,
      id_colegio: Number(
        form.id_colegio,
      ),
    };

    try {
      if (editing) {
        await axios.put(
          `/api/academicos/anios/${editing.id_anio}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } else {
        await axios.post(
          '/api/academicos/anios',
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      const successText = editing
        ? 'Año lectivo actualizado correctamente.'
        : 'Año lectivo creado correctamente.';

      setOpenForm(false);
      setEditing(null);

      setMensaje({
        type: 'success',
        text: successText,
      });

      await fetchAnios();
    } catch (error: any) {
      setMensaje({
        type: 'error',
        text:
          error.response?.data?.message ||
          'No se pudo guardar el año lectivo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-anios-page space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">
            Años lectivos
          </p>

          <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
            Contexto actual: {scopeLabel}. Configura
            el periodo que Matrícula podrá utilizar.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Nuevo año
        </button>
      </div>

      {mensaje && !openForm && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.text}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2
              size={24}
              className="animate-spin text-blue-600"
            />
          </div>
        ) : aniosOrdenados.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <CalendarDays
              size={32}
              className="text-slate-400"
            />

            <p className="mt-3 text-sm font-bold text-slate-800">
              Sin años lectivos
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Crea primero un año lectivo para poder
              matricular correctamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {aniosOrdenados.map((anio) => {
              const colegio = colegios.find(
                (item) =>
                  item.id_colegio ===
                  anio.id_colegio,
              );

              return (
                <div
                  key={anio.id_anio}
                  className="grid gap-4 p-5 transition hover:bg-slate-50 lg:grid-cols-[1.1fr_1fr_0.7fr_auto] lg:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {anio.nombre_anio}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {colegio?.nombre ||
                        colegio?.nombre_corto ||
                        'Institución no identificada'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(
                        anio.fecha_inicio,
                      )}{' '}
                      -{' '}
                      {formatDate(
                        anio.fecha_fin,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      ID año: {anio.id_anio}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ring-1 ${estadoBadge(
                        anio.estado,
                      )}`}
                    >
                      {anio.estado}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        abrirPreparacion(anio)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <ListChecks size={16} />
                      Preparación
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        abrirEditar(anio)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      <Edit3 size={16} />
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CenteredFormModal
        open={openForm}
        eyebrow="Año lectivo"
        title={
          editing
            ? 'Editar año lectivo'
            : 'Nuevo año lectivo'
        }
        description="Define el nombre, las fechas, el estado y la institución a la que pertenecerá."
        message={
          openForm ? mensaje?.text : null
        }
        messageTone={
          mensaje?.type || 'info'
        }
        saving={saving}
        submitLabel={
          editing
            ? 'Guardar cambios'
            : 'Crear año lectivo'
        }
        maxWidthClassName="max-w-3xl"
        onClose={cerrarFormulario}
        onSubmit={guardarAnio}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <Label>Nombre</Label>

            <input
              value={form.nombre_anio}
              onChange={(event) =>
                setForm({
                  ...form,
                  nombre_anio:
                    event.target.value,
                })
              }
              placeholder="Año Escolar 2027"
              className={inputClass}
              autoFocus
            />
          </label>

          <label>
            <Label>Fecha de inicio</Label>

            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(event) =>
                setForm({
                  ...form,
                  fecha_inicio:
                    event.target.value,
                })
              }
              className={inputClass}
            />
          </label>

          <label>
            <Label>Fecha de fin</Label>

            <input
              type="date"
              value={form.fecha_fin}
              onChange={(event) =>
                setForm({
                  ...form,
                  fecha_fin:
                    event.target.value,
                })
              }
              className={inputClass}
            />
          </label>

          <label>
            <Label>Estado</Label>

            <select
              value={form.estado}
              onChange={(event) =>
                setForm({
                  ...form,
                  estado: event.target.value,
                })
              }
              className={inputClass}
            >
              {estados.map((estado) => (
                <option
                  key={estado}
                  value={estado}
                >
                  {estado}
                </option>
              ))}
            </select>
          </label>

          <label>
            <Label>
              {institutionSingularLabel}
            </Label>

            <select
              value={form.id_colegio}
              onChange={(event) =>
                setForm({
                  ...form,
                  id_colegio:
                    event.target.value
                      ? Number(
                          event.target.value,
                        )
                      : '',
                })
              }
              className={inputClass}
            >
              <option value="">
                Seleccionar institución
              </option>

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
        </div>
      </CenteredFormModal>
    </div>
  );
}

function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
      {children}
    </span>
  );
}
