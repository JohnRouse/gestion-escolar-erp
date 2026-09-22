import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Mail,
  Paperclip,
  Plus,
  Search,
} from "lucide-react";
import AccessibleDialog from "../components/AccessibleDialog";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { useToast } from "../contexts/ToastContext";
import {
  createComunicado,
  getComunicadoOptions,
  listComunicados,
  uploadComunicadoAttachments,
  type Comunicado,
  type ComunicadoAudienciaTipo,
  type ComunicadoOptions,
} from "./comunicados/comunicadosApi";
import {
  AudienceLevelPicker,
  AudienceSectionPicker,
} from "./comunicados/AudiencePickers";
import {
  buildComunicadoAudience,
  changeComunicadoYear,
} from "./comunicados/comunicadosFormRules";

const CATEGORIES = [
  "General",
  "Académico",
  "Administrativo",
  "Urgente",
  "Actividad",
  "Recordatorio",
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-150 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 motion-reduce:transition-none";
const buttonFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const allowedAttachmentTypes: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    "pptx",
  ],
};

type FormState = {
  id_colegio: string;
  id_anio: string;
  titulo: string;
  contenido: string;
  categoria: string;
  urgente: boolean;
  requiere_confirmacion: boolean;
  audiencia_tipo: ComunicadoAudienciaTipo;
  audiencia_ids: number[];
};

const emptyForm: FormState = {
  id_colegio: "",
  id_anio: "",
  titulo: "",
  contenido: "",
  categoria: "General",
  urgente: false,
  requiere_confirmacion: false,
  audiencia_tipo: "colegio",
  audiencia_ids: [],
};

const emptyOptions: ComunicadoOptions = {
  anios: [],
  anio_seleccionado: null,
  niveles: [],
  secciones: [],
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CircularesPage() {
  const { token } = useAuth();
  const { tenant, colegios, activeScope, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const tenantId = tenant?.id_tenant ?? null;
  const titleRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [urgentFilter, setUrgentFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [options, setOptions] = useState<ComunicadoOptions>(emptyOptions);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Comunicado | null>(null);

  const load = useCallback(async () => {
    if (!token || !tenantId) {
      setItems([]);
      setLoading(false);
      setError(
        "No existe un contexto institucional activo para consultar comunicados.",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number | boolean> = {
        tenant_id: tenantId,
        page,
        limit: 15,
      };
      const selectedSchool =
        activeScope.tipo === "colegio"
          ? activeScope.id_colegio
          : schoolFilter
            ? Number(schoolFilter)
            : null;
      if (selectedSchool) params.colegio_id = selectedSchool;
      else params.scope = "all";
      if (q.trim()) params.q = q.trim();
      if (categoryFilter) params.categoria = categoryFilter;
      if (urgentFilter) params.urgente = urgentFilter === "si";
      const response = await listComunicados(token, params);
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
    categoryFilter,
    page,
    q,
    schoolFilter,
    tenantId,
    token,
    urgentFilter,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), q ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, q]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [activeScope]);

  const loadOptions = async (schoolId: number, yearId?: number) => {
    if (!token || !tenantId || !schoolId) return;
    setOptionsLoading(true);
    try {
      const loaded = await getComunicadoOptions(token, {
        tenant_id: tenantId,
        colegio_id: schoolId,
        ...(yearId ? { id_anio: yearId } : {}),
      });
      setOptions(loaded);
      setForm((current) => {
        if (Number(current.id_colegio) !== schoolId) return current;
        const selectedYear = yearId ?? loaded.anio_seleccionado?.id_anio;
        if (!selectedYear || current.id_anio) return current;
        return { ...current, id_anio: String(selectedYear) };
      });
    } catch (requestError) {
      setOptions(emptyOptions);
      showToast({
        type: "error",
        title: "No se pudo cargar la audiencia",
        message: errorMessage(requestError),
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  const openCreate = () => {
    const schoolId =
      activeScope.tipo === "colegio"
        ? Number(activeScope.id_colegio || 0)
        : Number(schoolFilter || colegios[0]?.id_colegio || 0);
    if (!schoolId) {
      showToast({ type: "error", message: "Selecciona una institución." });
      return;
    }
    setForm({ ...emptyForm, id_colegio: String(schoolId) });
    setFiles([]);
    setOptions(emptyOptions);
    setFormOpen(true);
    void loadOptions(schoolId);
  };

  const changeSchool = (value: string) => {
    setForm((current) => ({
      ...current,
      id_colegio: value,
      id_anio: "",
      audiencia_tipo: "colegio",
      audiencia_ids: [],
    }));
    setOptions(emptyOptions);
    if (value) void loadOptions(Number(value));
  };

  const changeYear = (value: string) => {
    setForm((current) => changeComunicadoYear(current, value));
    setOptions((current) => ({
      ...current,
      anio_seleccionado: null,
      niveles: [],
      secciones: [],
    }));
    if (value && form.id_colegio) {
      void loadOptions(Number(form.id_colegio), Number(value));
    }
  };

  const changeAudienceSelection = (audienciaIds: number[]) => {
    setForm((current) => ({
      ...current,
      audiencia_ids: audienciaIds,
    }));
  };

  const selectFiles = (selected: FileList | null) => {
    const next = Array.from(selected ?? []);
    const invalidType = next.some((file) => {
      const extension =
        file.name.split(".").pop()?.toLocaleLowerCase("es") ?? "";
      return !allowedAttachmentTypes[file.type]?.includes(extension);
    });
    if (
      next.length > 5 ||
      next.some((file) => file.size <= 0 || file.size > 10 * 1024 * 1024) ||
      invalidType
    ) {
      showToast({
        type: "error",
        title: "Revisa los archivos",
        message:
          "Adjunta hasta 5 archivos válidos de 10 MB: PDF, imágenes o documentos de Office.",
      });
      setFiles([]);
      return;
    }
    setFiles(next);
  };

  const save = async () => {
    if (!token || !tenantId) return;
    if (
      !form.id_colegio ||
      !form.id_anio ||
      !form.titulo.trim() ||
      !form.contenido.trim()
    ) {
      showToast({
        type: "error",
        title: "Completa los campos obligatorios",
        message:
          "Institución, año lectivo, título y contenido son obligatorios.",
      });
      return;
    }
    if (form.audiencia_tipo !== "colegio" && !form.audiencia_ids.length) {
      showToast({
        type: "error",
        title: "Selecciona la audiencia",
        message: "Elige al menos un nivel o sección.",
      });
      return;
    }
    setSaving(true);
    try {
      const created = await createComunicado(token, {
        id_tenant: tenantId,
        id_colegio: Number(form.id_colegio),
        id_anio: Number(form.id_anio),
        titulo: form.titulo.trim(),
        contenido: form.contenido.trim(),
        categoria: form.categoria,
        urgente: form.urgente,
        requiere_autorizacion: form.requiere_confirmacion,
        audiencia: buildComunicadoAudience(
          form.audiencia_tipo,
          form.audiencia_ids,
        ),
      });
      if (files.length) {
        try {
          await uploadComunicadoAttachments(token, created.id_circular, files);
        } catch (uploadError) {
          showToast({
            type: "warning",
            title: "Comunicado publicado sin todos los archivos",
            message: errorMessage(uploadError),
            duration: 7000,
          });
        }
      }
      if (created.notificaciones?.error) {
        showToast({
          type: "warning",
          title: "Comunicado publicado con una advertencia",
          message: created.notificaciones.error,
          duration: 7000,
        });
      } else {
        showToast({
          type: "success",
          title: "Comunicado publicado",
          message: "Las familias destinatarias ya pueden consultarlo.",
        });
      }
      setFormOpen(false);
      setForm(emptyForm);
      setFiles([]);
      setPage(1);
      await load();
    } catch (requestError) {
      showToast({
        type: "error",
        title: "No se pudo publicar",
        message: errorMessage(requestError),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in motion-reduce:animate-none">
      <PageHeader
        eyebrow="Comunicación institucional"
        title="Comunicados"
        description="Publica avisos y comunicaciones formales para las familias."
        icon={Mail}
        meta={[
          { label: "Alcance", value: scopeLabel },
          { label: "Resultados", value: total },
        ]}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 motion-reduce:transition-none ${buttonFocus}`}
          >
            <Plus size={18} /> Nuevo comunicado
          </button>
        }
      />

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {activeScope.tipo === "todos" && (
            <label className="text-sm font-bold text-slate-700">
              Institución
              <select
                className={`${inputClass} mt-1`}
                value={schoolFilter}
                onChange={(event) => {
                  setSchoolFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas las instituciones</option>
                {colegios.map((school) => (
                  <option key={school.id_colegio} value={school.id_colegio}>
                    {school.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-bold text-slate-700">
            Buscar
            <span className="relative mt-1 block">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                className={`${inputClass} pl-10`}
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Título o contenido"
              />
            </span>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Categoría
            <select
              className={`${inputClass} mt-1`}
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Urgencia
            <select
              className={`${inputClass} mt-1`}
              value={urgentFilter}
              onChange={(event) => {
                setUrgentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="si">Urgentes</option>
              <option value="no">No urgentes</option>
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5" aria-label="Cargando comunicados">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <AlertCircle className="text-rose-600" size={30} />
            <p className="font-bold text-slate-900">
              No se pudieron cargar los comunicados
            </p>
            <p className="max-w-xl text-sm text-slate-500">{error}</p>
            <button
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${buttonFocus}`}
              onClick={() => void load()}
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Mail className="text-slate-300" size={36} />
            <p className="font-bold text-slate-900">
              No hay comunicados para mostrar
            </p>
            <p className="text-sm text-slate-500">
              Publica el primero o modifica los filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Fecha y título</th>
                    <th className="px-4 py-4">Categoría</th>
                    <th className="px-4 py-4">Institución</th>
                    <th className="px-4 py-4">Audiencia</th>
                    <th className="px-4 py-4">Remitente</th>
                    <th className="px-4 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id_circular} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-900">
                          {item.titulo}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.fecha_creacion)}
                        </p>
                        {item.anio_lectivo && (
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {item.anio_lectivo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {item.categoria}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {item.institucion}
                      </td>
                      <td className="max-w-[260px] px-4 py-4 text-slate-600">
                        {item.audiencia.etiquetas.join(", ")}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.remitente}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.urgente && (
                            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                              Urgente
                            </span>
                          )}
                          {item.requiere_autorizacion && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                              Requiere confirmación
                            </span>
                          )}
                          {item.adjuntos.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              <Paperclip size={12} /> {item.adjuntos.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setDetail(item)}
                          className={`inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-bold text-slate-700 hover:bg-slate-50 ${buttonFocus}`}
                        >
                          <Eye size={16} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 lg:hidden">
              {items.map((item) => (
                <article key={item.id_circular} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{item.titulo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.fecha_creacion)} · {item.institucion}
                      </p>
                      {item.anio_lectivo && (
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {item.anio_lectivo}
                        </p>
                      )}
                    </div>
                    {item.urgente && (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                        Urgente
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {item.audiencia.etiquetas.join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.categoria} · {item.remitente}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.requiere_autorizacion && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                        Requiere confirmación
                      </span>
                    )}
                    {item.adjuntos.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        <Paperclip size={12} /> {item.adjuntos.length}{" "}
                        adjunto(s)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDetail(item)}
                    className={`mt-4 inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${buttonFocus}`}
                  >
                    <Eye size={16} /> Ver comunicado
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border disabled:opacity-40 ${buttonFocus}`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Página siguiente"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border disabled:opacity-40 ${buttonFocus}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      <AccessibleDialog
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        preventClose={saving}
        title="Nuevo comunicado"
        description="Publica una comunicación formal para las familias seleccionadas."
        eyebrow="Comunicados"
        icon={<Mail size={20} />}
        initialFocusRef={titleRef}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              disabled={saving}
              onClick={() => setFormOpen(false)}
              className={`h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 disabled:opacity-50 ${buttonFocus}`}
            >
              Cancelar
            </button>
            <button
              disabled={saving || optionsLoading}
              onClick={() => void save()}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50 ${buttonFocus}`}
            >
              {saving ? "Publicando…" : "Publicar comunicado"}
            </button>
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            Institución <span aria-hidden="true">*</span>
            <select
              className={`${inputClass} mt-1`}
              value={form.id_colegio}
              onChange={(event) => changeSchool(event.target.value)}
              disabled={saving}
            >
              <option value="">Selecciona una institución</option>
              {colegios.map((school) => (
                <option key={school.id_colegio} value={school.id_colegio}>
                  {school.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Año lectivo <span aria-hidden="true">*</span>
            <select
              className={`${inputClass} mt-1`}
              value={form.id_anio}
              onChange={(event) => changeYear(event.target.value)}
              disabled={saving || optionsLoading || !form.id_colegio}
            >
              <option value="">Selecciona un año lectivo</option>
              {options.anios.map((year) => (
                <option key={year.id_anio} value={year.id_anio}>
                  {year.nombre_anio} — {year.estado}
                </option>
              ))}
            </select>
            {!optionsLoading &&
              form.id_colegio &&
              options.anios.length === 0 && (
                <span className="mt-1 block text-xs font-normal text-amber-700">
                  No hay años lectivos disponibles para publicar.
                </span>
              )}
          </label>
          <label className="text-sm font-bold text-slate-700">
            Categoría
            <select
              className={`${inputClass} mt-1`}
              value={form.categoria}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categoria: event.target.value,
                }))
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">
            Título <span aria-hidden="true">*</span>
            <input
              ref={titleRef}
              className={`${inputClass} mt-1`}
              maxLength={150}
              value={form.titulo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  titulo: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">
            Contenido <span aria-hidden="true">*</span>
            <textarea
              className={`${inputClass} mt-1 min-h-40 py-3`}
              maxLength={20000}
              value={form.contenido}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contenido: event.target.value,
                }))
              }
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-bold text-slate-700">
              Audiencia
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["colegio", "Todo el colegio"],
                  ["niveles", "Uno o varios niveles"],
                  ["secciones", "Una o varias secciones"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none ${
                    form.audiencia_tipo === value
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                  } has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-slate-100 has-[:disabled]:text-slate-400`}
                >
                  <input
                    type="radio"
                    name="audiencia"
                    checked={form.audiencia_tipo === value}
                    disabled={
                      value !== "colegio" &&
                      (!form.id_anio ||
                        optionsLoading ||
                        options.secciones.length === 0)
                    }
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        audiencia_tipo: value,
                        audiencia_ids: [],
                      }))
                    }
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
            {optionsLoading ? (
              <div
                className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                aria-label="Cargando estructura institucional"
              >
                <div className="h-10 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
                </div>
                <span className="sr-only">Cargando estructura institucional…</span>
              </div>
            ) : form.audiencia_tipo === "niveles" && options.niveles.length ? (
              <AudienceLevelPicker
                levels={options.niveles}
                selectedIds={form.audiencia_ids}
                onChange={changeAudienceSelection}
                disabled={saving}
              />
            ) : form.audiencia_tipo === "secciones" && options.secciones.length ? (
              <AudienceSectionPicker
                levels={options.niveles}
                sections={options.secciones}
                selectedIds={form.audiencia_ids}
                onChange={changeAudienceSelection}
                disabled={saving}
              />
            ) : form.audiencia_tipo !== "colegio" ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  No existe estructura activa para este año.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Elige otro año o publica el comunicado para todo el colegio.
                </p>
              </div>
            ) : null}
            {!optionsLoading &&
              form.id_anio &&
              options.secciones.length === 0 &&
              form.audiencia_tipo === "colegio" && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No existe estructura activa para este año.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Puedes publicar el comunicado para todo el colegio.
                  </p>
                </div>
              )}
          </fieldset>
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.urgente}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    urgente: event.target.checked,
                  }))
                }
              />{" "}
              Marcar como urgente
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.requiere_confirmacion}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requiere_confirmacion: event.target.checked,
                  }))
                }
              />{" "}
              Requiere confirmación
            </label>
          </div>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">
            Adjuntos
            <input
              className={`${inputClass} mt-1 py-2`}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(event) => selectFiles(event.target.files)}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Hasta 5 archivos de 10 MB: PDF, imágenes o documentos de Office.
            </span>
          </label>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.titulo || "Comunicado"}
        description={
          detail
            ? `${formatDate(detail.fecha_creacion)} · ${detail.institucion}`
            : undefined
        }
        eyebrow="Detalle del comunicado"
        icon={<FileText size={20} />}
        maxWidthClassName="max-w-3xl"
        footer={
          <button
            onClick={() => setDetail(null)}
            className={`h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white ${buttonFocus}`}
          >
            Cerrar
          </button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {detail.categoria}
              </span>
              {detail.urgente && (
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  Urgente
                </span>
              )}
              {detail.requiere_autorizacion && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  <CheckCircle2 size={13} /> Requiere confirmación
                </span>
              )}
            </div>
            <dl className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Audiencia
                </dt>
                <dd className="mt-1 text-sm font-bold text-slate-800">
                  {detail.audiencia.etiquetas.join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Año lectivo
                </dt>
                <dd className="mt-1 text-sm font-bold text-slate-800">
                  {detail.anio_lectivo || "Sin año atribuido (legacy)"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Remitente
                </dt>
                <dd className="mt-1 text-sm font-bold text-slate-800">
                  {detail.remitente}
                </dd>
              </div>
            </dl>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {detail.contenido}
            </p>
            {detail.adjuntos.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-sm font-black text-slate-900">
                  Archivos adjuntos
                </p>
                <div className="space-y-2">
                  {detail.adjuntos.map((file) => (
                    <a
                      key={file.id_adjunto}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 ${buttonFocus}`}
                    >
                      <Paperclip size={16} /> {file.nombre_archivo}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
