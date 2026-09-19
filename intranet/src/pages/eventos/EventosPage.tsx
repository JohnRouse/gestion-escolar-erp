import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  MapPin,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import AccessibleDialog from "../../components/AccessibleDialog";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useToast } from "../../contexts/ToastContext";
import {
  cancelEvento,
  createEvento,
  finishEvento,
  getEvento,
  getEventoOptions,
  listEventos,
  updateEvento,
  type AudienciaTipo,
  type Evento,
  type EventoOptions,
} from "./eventosApi";
import {
  changeEventYear,
  eventDateBelongsToYear,
} from "./eventosFormRules";

const EVENT_TYPES = [
  "actividad escolar",
  "reunión general",
  "día no laborable",
  "ceremonia",
  "paseo",
  "evaluación institucional",
  "celebración",
  "jornada especial",
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-150 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 motion-reduce:transition-none";
const buttonFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

type FormState = {
  id_colegio: string;
  id_anio: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  ubicacion: string;
  audiencia_tipo: AudienciaTipo;
  audiencia_ids: number[];
};

const emptyForm: FormState = {
  id_colegio: "",
  id_anio: "",
  titulo: "",
  tipo: EVENT_TYPES[0],
  descripcion: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  ubicacion: "",
  audiencia_tipo: "colegio",
  audiencia_ids: [],
};

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message)
      ? message.join(" ")
      : message || error.message;
  }
  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

function monthBounds(month: string) {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value) return null;
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return {
    desde: `${year}-${String(value).padStart(2, "0")}-01`,
    hasta: `${year}-${String(value).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "es-PE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status: Evento["estado"]) {
  if (status === "cancelado") return "bg-red-50 text-red-700 ring-red-100";
  if (status === "realizado")
    return "bg-green-50 text-green-700 ring-green-100";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function displayValue(value: string) {
  return value ? `${value[0].toLocaleUpperCase("es")}${value.slice(1)}` : value;
}

export default function EventosPage() {
  const { token, user } = useAuth();
  const { tenant, colegios, activeScope, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const tenantId = tenant?.id_tenant ?? null;
  const canManage = ["Admin", "Director", "Secretaria"].includes(
    user?.rol || "",
  );
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [items, setItems] = useState<Evento[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  const [detail, setDetail] = useState<Evento | null>(null);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [options, setOptions] = useState<EventoOptions>({
    anios: [],
    anio_predeterminado_id: null,
    niveles: [],
    grados: [],
    secciones: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Evento | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [finishTarget, setFinishTarget] = useState<Evento | null>(null);

  const load = useCallback(async () => {
    if (!token || !tenantId) return;
    setLoading(true);
    setError("");
    try {
      const bounds = monthBounds(month);
      const params: Record<string, string | number> = {
        tenant_id: tenantId,
        page,
        limit: 15,
      };
      const selectedSchool =
        activeScope.tipo === "colegio"
          ? activeScope.id_colegio
          : schoolFilter &&
              colegios.some(
                (school) => school.id_colegio === Number(schoolFilter),
              )
            ? Number(schoolFilter)
            : null;
      if (selectedSchool) params.colegio_id = selectedSchool;
      else params.scope = "all";
      if (bounds) Object.assign(params, bounds);
      if (q.trim()) params.q = q.trim();
      if (type) params.tipo = type;
      if (status) params.estado = status;
      const response = await listEventos(token, params);
      setItems(response.data);
      setTotal(response.meta.total);
      setTotalPages(Math.max(1, response.meta.totalPages));
    } catch (requestError) {
      setItems([]);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [
    activeScope,
    colegios,
    month,
    page,
    q,
    schoolFilter,
    status,
    tenantId,
    token,
    type,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), q ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, q]);

  const loadOptions = async (schoolId: number, yearId?: number) => {
    if (!token || !tenantId) return null;
    setOptionsLoading(true);
    try {
      const result = await getEventoOptions(token, {
        tenant_id: tenantId,
        colegio_id: schoolId,
        ...(yearId ? { anio_id: yearId } : {}),
      });
      setOptions(result);
      return result;
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudieron cargar las opciones",
        message: errorMessage(requestError),
      });
      return null;
    } finally {
      setOptionsLoading(false);
    }
  };

  const openCreate = async () => {
    const schoolId =
      activeScope.tipo === "colegio"
        ? Number(activeScope.id_colegio || 0)
        : Number(schoolFilter || colegios[0]?.id_colegio || 0);
    if (!schoolId) return;
    setEditing(null);
    setOptions({
      anios: [],
      anio_predeterminado_id: null,
      niveles: [],
      grados: [],
      secciones: [],
    });
    const base = { ...emptyForm, id_colegio: String(schoolId) };
    setForm(base);
    setFormOpen(true);
    const loaded = await loadOptions(schoolId);
    const yearId = loaded?.anio_predeterminado_id;
    if (yearId) {
      setForm((current) => ({ ...current, id_anio: String(yearId) }));
      await loadOptions(schoolId, yearId);
    }
  };

  const openEdit = async (event: Evento) => {
    setEditing(event);
    setForm({
      id_colegio: String(event.id_colegio),
      id_anio: String(event.id_anio),
      titulo: event.titulo,
      tipo: event.tipo,
      descripcion: event.descripcion || "",
      fecha: event.fecha.slice(0, 10),
      hora_inicio: event.hora_inicio || "",
      hora_fin: event.hora_fin || "",
      ubicacion: event.ubicacion || "",
      audiencia_tipo: event.audiencia.tipo,
      audiencia_ids: event.audiencia.ids,
    });
    setFormOpen(true);
    await loadOptions(event.id_colegio, event.id_anio);
  };

  const changeSchool = async (value: string) => {
    setForm((current) => ({
      ...current,
      id_colegio: value,
      id_anio: "",
      fecha: "",
      audiencia_tipo: "colegio",
      audiencia_ids: [],
    }));
    setOptions({
      anios: [],
      anio_predeterminado_id: null,
      niveles: [],
      grados: [],
      secciones: [],
    });
    const loaded = await loadOptions(Number(value));
    const yearId = loaded?.anio_predeterminado_id;
    if (yearId) {
      setForm((current) => ({ ...current, id_anio: String(yearId) }));
      await loadOptions(Number(value), yearId);
    }
  };

  const changeYear = async (value: string) => {
    const selectedYear = options.anios.find(
      (year) => year.id_anio === Number(value),
    );
    const clearsDate = Boolean(
      form.fecha && !eventDateBelongsToYear(form.fecha, selectedYear),
    );
    setForm((current) => changeEventYear(current, value, options.anios));
    if (clearsDate) {
      showToast({
        type: "info",
        title: "Selecciona una fecha del nuevo año",
        message:
          "La fecha anterior se limpió porque no corresponde al año lectivo seleccionado.",
      });
    }
    if (value) await loadOptions(Number(form.id_colegio), Number(value));
  };

  const selectedYear = useMemo(
    () =>
      options.anios.find((year) => year.id_anio === Number(form.id_anio)),
    [form.id_anio, options.anios],
  );
  const invalidEventDate = Boolean(
    form.fecha &&
      selectedYear &&
      !eventDateBelongsToYear(form.fecha, selectedYear),
  );

  const audienceChoices = useMemo(() => {
    if (form.audiencia_tipo === "niveles") {
      return options.niveles.map((item) => ({
        id: item.id_nivel,
        label: item.nombre_nivel,
      }));
    }
    if (form.audiencia_tipo === "grados") {
      return options.grados.map((item) => ({
        id: item.id_grado,
        label: item.nombre_grado,
      }));
    }
    if (form.audiencia_tipo === "secciones") {
      return options.secciones.map((item) => ({
        id: item.id_seccion,
        label: item.nombre,
      }));
    }
    return [];
  }, [form.audiencia_tipo, options]);

  const toggleAudience = (id: number) => {
    setForm((current) => ({
      ...current,
      audiencia_ids: current.audiencia_ids.includes(id)
        ? current.audiencia_ids.filter((item) => item !== id)
        : [...current.audiencia_ids, id],
    }));
  };

  const save = async () => {
    if (!token || !tenantId) return;
    if (!form.titulo.trim() || !form.fecha || !form.id_anio) {
      showToast({
        type: "error",
        title: "Completa los campos obligatorios",
        message:
          "Institución, año, título, tipo, fecha y audiencia son obligatorios.",
      });
      return;
    }
    if (invalidEventDate) {
      showToast({
        type: "error",
        title: "Revisa la fecha",
        message:
          "La fecha del evento no corresponde al año lectivo seleccionado.",
      });
      return;
    }
    if (
      form.hora_fin &&
      (!form.hora_inicio || form.hora_fin <= form.hora_inicio)
    ) {
      showToast({
        type: "error",
        title: "Revisa el horario",
        message: "La hora de fin debe ser posterior a la hora de inicio.",
      });
      return;
    }
    if (form.audiencia_tipo !== "colegio" && !form.audiencia_ids.length) {
      showToast({
        type: "error",
        title: "Selecciona la audiencia",
        message: "Elige al menos un nivel, grado o sección.",
      });
      return;
    }
    setSaving(true);
    try {
      const common = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        ubicacion: form.ubicacion.trim(),
        audiencia: {
          tipo: form.audiencia_tipo,
          ids: form.audiencia_tipo === "colegio" ? [] : form.audiencia_ids,
        },
      };
      if (editing) {
        await updateEvento(token, editing.id_evento, common);
      } else {
        await createEvento(token, {
          ...common,
          id_tenant: tenantId,
          id_colegio: Number(form.id_colegio),
          id_anio: Number(form.id_anio),
          tipo: form.tipo,
        });
      }
      setFormOpen(false);
      showToast({
        type: "success",
        title: editing ? "Evento actualizado" : "Evento creado",
        message: editing
          ? "Los cambios y su trazabilidad fueron guardados."
          : "El evento quedó programado y se avisó a su audiencia.",
      });
      await load();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudo guardar el evento",
        message: errorMessage(requestError),
      });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (event: Evento) => {
    if (!token) return;
    try {
      setDetail(await getEvento(token, event.id_evento));
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudo abrir el evento",
        message: errorMessage(requestError),
      });
    }
  };

  const confirmCancel = async () => {
    if (!token || !cancelTarget || !cancelReason.trim()) return;
    setSaving(true);
    try {
      await cancelEvento(token, cancelTarget.id_evento, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason("");
      showToast({
        type: "success",
        title: "Evento cancelado",
        message: "El registro se conserva y la audiencia fue notificada.",
      });
      await load();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudo cancelar",
        message: errorMessage(requestError),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmFinish = async () => {
    if (!token || !finishTarget) return;
    setSaving(true);
    try {
      await finishEvento(token, finishTarget.id_evento);
      setFinishTarget(null);
      showToast({
        type: "success",
        title: "Evento marcado como realizado",
        message: "El cambio quedó registrado en el historial.",
      });
      await load();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudo actualizar el estado",
        message: errorMessage(requestError),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Calendario institucional"
        title="Eventos"
        description="Gestiona actividades y fechas institucionales del calendario escolar."
        icon={CalendarDays}
        meta={[{ label: "Alcance actual", value: scopeLabel }]}
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => void openCreate()}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 motion-reduce:transition-none ${buttonFocus}`}
            >
              <Plus size={18} aria-hidden="true" />
              Nuevo evento
            </button>
          ) : null
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {activeScope.tipo === "todos" && (
            <label className="space-y-1 text-sm font-bold text-slate-700">
              <span>Institución</span>
              <select
                value={schoolFilter}
                onChange={(event) => {
                  setSchoolFilter(event.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">Todos los colegios</option>
                {colegios.map((school) => (
                  <option key={school.id_colegio} value={school.id_colegio}>
                    {school.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>Búsqueda</span>
            <span className="relative block">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Título, descripción o lugar"
                className={`${inputClass} pl-10`}
              />
            </span>
          </label>
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>Mes</span>
            <input
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>Tipo</span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos</option>
              {EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold text-slate-700">
            <span>Estado</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="programado">Programado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">
              Agenda institucional
            </h2>
            <p className="text-sm text-slate-500">
              {total} evento(s) en el rango seleccionado
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-label="Cargando eventos">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="font-bold text-red-700">
              No se pudieron cargar los eventos.
            </p>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className={`mt-4 h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold ${buttonFocus}`}
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays
              className="mx-auto text-slate-300"
              size={40}
              aria-hidden="true"
            />
            <p className="mt-3 font-black text-slate-800">
              No hay eventos para estos filtros
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cambia el mes o limpia la búsqueda.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fecha y hora</th>
                    <th className="px-5 py-3">Evento</th>
                    <th className="px-5 py-3">Institución</th>
                    <th className="px-5 py-3">Audiencia</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((event) => (
                    <EventRow
                      key={event.id_evento}
                      event={event}
                      canManage={canManage}
                      onView={openDetail}
                      onEdit={openEdit}
                      onCancel={(item) => setCancelTarget(item)}
                      onFinish={(item) => setFinishTarget(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 lg:hidden">
              {items.map((event) => (
                <EventCard
                  key={event.id_evento}
                  event={event}
                  canManage={canManage}
                  onView={openDetail}
                  onEdit={openEdit}
                  onCancel={(item) => setCancelTarget(item)}
                  onFinish={(item) => setFinishTarget(item)}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-600">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className={`inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold disabled:opacity-40 ${buttonFocus}`}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className={`inline-flex h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-bold disabled:opacity-40 ${buttonFocus}`}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <AccessibleDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        preventClose={saving}
        eyebrow={editing ? "Edición" : "Nuevo registro"}
        title={editing ? "Editar evento" : "Nuevo evento"}
        description="Los avisos llegarán únicamente a los apoderados vinculados con matrículas operativas de la audiencia."
        maxWidthClassName="max-w-4xl"
        footer={
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => setFormOpen(false)}
              className={`h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold disabled:opacity-50 ${buttonFocus}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                saving ||
                optionsLoading ||
                (!editing && options.anios.length === 0)
              }
              onClick={() => void save()}
              className={`h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 ${buttonFocus}`}
            >
              {saving ? "Guardando…" : "Guardar evento"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Institución" required>
            <select
              value={form.id_colegio}
              disabled={Boolean(editing) || activeScope.tipo === "colegio"}
              onChange={(event) => void changeSchool(event.target.value)}
              className={inputClass}
            >
              {colegios.map((school) => (
                <option key={school.id_colegio} value={school.id_colegio}>
                  {school.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Año lectivo" required>
            <select
              value={form.id_anio}
              disabled={Boolean(editing) || optionsLoading}
              onChange={(event) => void changeYear(event.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona un año</option>
              {options.anios.map((year) => (
                <option key={year.id_anio} value={year.id_anio}>
                  {year.nombre_anio} · {year.estado}
                </option>
              ))}
            </select>
            {!editing && !optionsLoading && options.anios.length === 0 && (
              <span className="block text-sm font-medium text-amber-700">
                No hay años lectivos abiertos o en planificación para crear un
                evento.
              </span>
            )}
          </Field>
          <Field label="Título" required>
            <input
              value={form.titulo}
              onChange={(event) =>
                setForm({ ...form, titulo: event.target.value })
              }
              maxLength={200}
              className={inputClass}
            />
          </Field>
          <Field label="Tipo" required>
            <select
              value={form.tipo}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm({ ...form, tipo: event.target.value })
              }
              className={inputClass}
            >
              {EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha" required>
            <input
              type="date"
              value={form.fecha}
              min={selectedYear?.fecha_inicio.slice(0, 10)}
              max={selectedYear?.fecha_fin.slice(0, 10)}
              aria-invalid={invalidEventDate}
              onChange={(event) =>
                setForm({ ...form, fecha: event.target.value })
              }
              className={inputClass}
            />
            {invalidEventDate && (
              <span className="block text-sm font-medium text-red-700">
                La fecha del evento no corresponde al año lectivo seleccionado.
              </span>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora inicio">
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(event) =>
                  setForm({ ...form, hora_inicio: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Hora fin">
              <input
                type="time"
                value={form.hora_fin}
                onChange={(event) =>
                  setForm({ ...form, hora_fin: event.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Ubicación">
            <input
              value={form.ubicacion}
              onChange={(event) =>
                setForm({ ...form, ubicacion: event.target.value })
              }
              maxLength={200}
              className={inputClass}
            />
          </Field>
          <Field label="Audiencia" required>
            <select
              value={form.audiencia_tipo}
              onChange={(event) =>
                setForm({
                  ...form,
                  audiencia_tipo: event.target.value as AudienciaTipo,
                  audiencia_ids: [],
                })
              }
              className={inputClass}
            >
              <option value="colegio">Todo el colegio</option>
              <option value="niveles">Uno o varios niveles</option>
              <option value="grados">Uno o varios grados</option>
              <option value="secciones">Una o varias secciones</option>
            </select>
          </Field>
          <Field label="Descripción" className="md:col-span-2">
            <textarea
              value={form.descripcion}
              onChange={(event) =>
                setForm({ ...form, descripcion: event.target.value })
              }
              rows={4}
              maxLength={5000}
              className={`${inputClass} h-auto py-3`}
            />
          </Field>
          {form.audiencia_tipo !== "colegio" && (
            <fieldset className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-black text-slate-800">
                Destinatarios
              </legend>
              {optionsLoading ? (
                <p className="text-sm text-slate-500">
                  Cargando estructura académica…
                </p>
              ) : audienceChoices.length === 0 ? (
                <p className="text-sm text-amber-700">
                  {form.audiencia_tipo === "niveles"
                    ? "No hay niveles configurados para este año lectivo."
                    : form.audiencia_tipo === "grados"
                      ? "No hay grados configurados para este año lectivo."
                      : "No hay secciones configuradas para este año lectivo."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {audienceChoices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.audiencia_ids.includes(choice.id)}
                        onChange={() => toggleAudience(choice.id)}
                        className="h-4 w-4"
                      />
                      {choice.label}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.titulo || "Detalle del evento"}
        eyebrow="Evento institucional"
        maxWidthClassName="max-w-3xl"
      >
        {detail && (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Fecha y hora"
                value={`${formatDate(detail.fecha)}${detail.hora_inicio ? ` · ${detail.hora_inicio}${detail.hora_fin ? `–${detail.hora_fin}` : ""}` : ""}`}
              />
              <Detail label="Estado" value={displayValue(detail.estado)} />
              <Detail
                label="Institución"
                value={detail.colegio?.nombre || "Institución"}
              />
              <Detail label="Año lectivo" value={detail.anio.nombre_anio} />
              <Detail label="Tipo" value={displayValue(detail.tipo)} />
              <Detail
                label="Ubicación"
                value={detail.ubicacion || "Sin ubicación indicada"}
              />
              <Detail
                label="Audiencia"
                value={detail.audiencia.etiquetas.join(", ")}
                className="sm:col-span-2"
              />
              <Detail
                label="Creado por"
                value={detail.creado_por || "Dato histórico no disponible"}
              />
              <Detail
                label="Descripción"
                value={detail.descripcion || "Sin descripción"}
                className="sm:col-span-2"
              />
              {detail.motivo_cancelacion && (
                <Detail
                  label="Motivo de cancelación"
                  value={detail.motivo_cancelacion}
                  className="sm:col-span-2"
                />
              )}
            </dl>
            <section>
              <h3 className="text-sm font-black text-slate-900">Historial</h3>
              <div className="mt-3 space-y-2">
                {detail.historial.map((movement, index) => (
                  <div
                    key={`${movement.accion}-${movement.fecha}-${index}`}
                    className="rounded-2xl bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-bold capitalize text-slate-800">
                      {movement.accion.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {movement.actor || "Actor histórico"} ·{" "}
                      {formatDateTime(movement.fecha)}
                    </p>
                    {movement.motivo && (
                      <p className="mt-1 text-slate-700">
                        Motivo: {movement.motivo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </AccessibleDialog>

      <AccessibleDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason("");
        }}
        preventClose={saving}
        title="Cancelar evento"
        description="El evento seguirá visible y la audiencia recibirá un aviso de cancelación."
        maxWidthClassName="max-w-lg"
        footer={
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
              }}
              className={`h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold ${buttonFocus}`}
            >
              Volver
            </button>
            <button
              type="button"
              disabled={saving || !cancelReason.trim()}
              onClick={() => void confirmCancel()}
              className={`h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-50 ${buttonFocus}`}
            >
              {saving ? "Cancelando…" : "Cancelar evento"}
            </button>
          </>
        }
      >
        <Field label="Motivo de cancelación" required>
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={4}
            maxLength={1000}
            className={`${inputClass} h-auto py-3`}
          />
        </Field>
      </AccessibleDialog>

      <ConfirmDialog
        open={Boolean(finishTarget)}
        title="¿Marcar el evento como realizado?"
        description="El cambio quedará en el historial y no enviará un mensaje masivo."
        confirmLabel="Marcar realizado"
        loading={saving}
        onConfirm={() => void confirmFinish()}
        onCancel={() => setFinishTarget(null)}
      />
    </div>
  );
}

type EventActions = {
  event: Evento;
  canManage: boolean;
  onView: (event: Evento) => void;
  onEdit: (event: Evento) => void;
  onCancel: (event: Evento) => void;
  onFinish: (event: Evento) => void;
};

function Actions({
  event,
  canManage,
  onView,
  onEdit,
  onCancel,
  onFinish,
}: EventActions) {
  const editable = canManage && event.estado === "programado";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onView(event)}
        className={`inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 ${buttonFocus}`}
      >
        <Eye size={14} /> Ver
      </button>
      {editable && (
        <button
          type="button"
          onClick={() => void onEdit(event)}
          className={`inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 ${buttonFocus}`}
        >
          <Edit3 size={14} /> Editar
        </button>
      )}
      {editable && (
        <button
          type="button"
          onClick={() => onFinish(event)}
          className={`inline-flex h-9 items-center gap-1 rounded-lg border border-green-200 px-3 text-xs font-bold text-green-700 ${buttonFocus}`}
        >
          <CheckCircle2 size={14} /> Realizado
        </button>
      )}
      {editable && (
        <button
          type="button"
          onClick={() => onCancel(event)}
          className={`inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 ${buttonFocus}`}
        >
          <XCircle size={14} /> Cancelar
        </button>
      )}
    </div>
  );
}

function EventRow(props: EventActions) {
  const { event } = props;
  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">
        {formatDate(event.fecha)}
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {event.hora_inicio
            ? `${event.hora_inicio}${event.hora_fin ? `–${event.hora_fin}` : ""}`
            : "Sin hora"}
        </span>
      </td>
      <td className="max-w-xs px-5 py-4">
        <p className="font-black text-slate-900">{event.titulo}</p>
        <p className="mt-1 capitalize text-xs text-slate-500">{event.tipo}</p>
        {event.ubicacion && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} /> {event.ubicacion}
          </p>
        )}
      </td>
      <td className="px-5 py-4 text-slate-700">
        {event.colegio?.nombre || "Institución"}
      </td>
      <td className="max-w-xs px-5 py-4 text-slate-700">
        {event.audiencia.etiquetas.join(", ")}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusClass(event.estado)}`}
        >
          {event.estado}
        </span>
      </td>
      <td className="px-5 py-4">
        <Actions {...props} />
      </td>
    </tr>
  );
}

function EventCard(props: EventActions) {
  const { event } = props;
  return (
    <article className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-900">{event.titulo}</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(event.fecha)} · {event.hora_inicio || "Sin hora"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusClass(event.estado)}`}
        >
          {event.estado}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        {event.colegio?.nombre} · {event.audiencia.etiquetas.join(", ")}
      </p>
      <Actions {...props} />
    </article>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`space-y-1 text-sm font-bold text-slate-700 ${className || ""}`}
    >
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-3 ${className || ""}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}
