import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  ContactRound,
  FileHeart,
  HeartPulse,
  Loader2,
  Pill,
  Search,
  ShieldAlert,
  Stethoscope,
  XCircle,
} from "lucide-react";
import AccessibleDialog from "../../components/AccessibleDialog";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useToast } from "../../contexts/ToastContext";
import {
  enfermeriaApi,
  enfermeriaAtencionAbiertaId,
  enfermeriaError,
  type AlumnoEnfermeria,
  type AtencionEnfermeria,
  type AutorizacionMedicacion,
  type EnfermeriaDestino,
  type FichaAlumno,
} from "./enfermeriaApi";
import {
  currentMedicationAuthorizations,
  resolveMedicationState,
} from "./enfermeriaMedication";

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none";
const textareaClass = `${inputClass} min-h-24 resize-y py-2.5`;
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

const destinationLabels: Record<EnfermeriaDestino, string> = {
  regresa_aula: "Regresa al aula",
  retiro_apoderado: "Retiro por apoderado",
  derivacion_externa: "Derivación externa",
  observacion: "Permanece en observación",
};

const movementLabels: Record<string, string> = {
  apertura: "Apertura",
  actualizacion: "Actualización",
  correccion: "Corrección",
  contacto_registrado: "Contacto registrado",
  notificacion_emitida: "Notificación emitida",
  medicacion_administrada: "Medicación administrada",
  cierre: "Cierre",
};

type Api = ReturnType<typeof enfermeriaApi>;

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function movementLabel(value: string) {
  const known = movementLabels[value];
  if (known) return known;
  const readable = value.replaceAll("_", " ");
  return readable.charAt(0).toLocaleUpperCase("es-PE") + readable.slice(1);
}

export default function EnfermeriaPage() {
  const { token } = useAuth();
  const { activeScope, tenant, queryParams } = useSchool();
  const tenantId = activeScope.id_tenant ?? tenant?.id_tenant ?? 0;
  return (
    <EnfermeriaContent
      key={`${tenantId}:${JSON.stringify(queryParams)}`}
      api={enfermeriaApi(token, { ...queryParams, tenant_id: tenantId })}
    />
  );
}

function EnfermeriaContent({ api }: { api: Api }) {
  const { activeScope, colegios, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [date, setDate] = useState(todayInput());
  const [status, setStatus] = useState("");
  const [school, setSchool] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<Api["list"]>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<AtencionEnfermeria | null>(null);
  const [recordTarget, setRecordTarget] = useState<{
    studentId: number;
    schoolId: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [recordRefreshKey, setRecordRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .list(
          {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(date ? { fecha: date } : {}),
            ...(status ? { estado: status } : {}),
            ...(school ? { colegio_filtro_id: school } : {}),
            ...(section ? { seccion_id: section } : {}),
            page,
          },
          controller.signal,
        )
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted)
            setError(enfermeriaError(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, q, date, status, school, section, page, reload]);

  const sections = useMemo(
    () =>
      Array.from(
        new Map(
          (result?.data ?? []).map((item) => [
            item.estudiante.id_seccion,
            {
              id: item.estudiante.id_seccion,
              label: item.estudiante.seccion,
            },
          ]),
        ).values(),
      ),
    [result],
  );

  async function openDetail(id: number) {
    setBusyId(id);
    try {
      setDetail(await api.detail(id));
    } catch (requestError) {
      showToast({ type: "error", message: enfermeriaError(requestError) });
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(
    q || status || school || section || date !== todayInput(),
  );

  return (
    <div className="w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Bienestar"
        title="Enfermería"
        description="Registra atenciones y alertas de salud escolar con trazabilidad."
        icon={HeartPulse}
        meta={[{ label: "Alcance activo", value: scopeLabel }]}
        actions={
          <button
            type="button"
            className={primaryButton}
            onClick={() => setNewOpen(true)}
          >
            <ClipboardPlus size={18} aria-hidden="true" />
            Nueva atención
          </button>
        }
      />

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Resumen de Enfermería"
      >
        <Summary
          label="Atenciones hoy"
          value={result?.resumen.atenciones_hoy}
          icon={Stethoscope}
        />
        <Summary
          label="Atenciones abiertas"
          value={result?.resumen.en_observacion}
          icon={ShieldAlert}
        />
        <Summary
          label="Cerradas hoy"
          value={result?.resumen.cerradas_hoy}
          icon={CheckCircle2}
        />
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-white p-4"
        aria-labelledby="nursing-filters"
      >
        <h2 id="nursing-filters" className="sr-only">
          Filtros de atenciones
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_minmax(190px,1fr)_minmax(190px,1fr)_auto] xl:items-end">
          <Field label="Buscar">
            <span className="relative block">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className={`${inputClass} pl-9`}
                type="search"
                value={q}
                placeholder="Alumno, DNI, código o motivo"
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </Field>
          <Field label="Fecha">
            <input
              className={inputClass}
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="abierta">Abierta</option>
              <option value="cerrada">Cerrada</option>
            </select>
          </Field>
          {activeScope.tipo === "todos" ? (
            <Field label="Institución">
              <select
                className={inputClass}
                value={school}
                onChange={(event) => {
                  setSchool(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {colegios.map((item) => (
                  <option key={item.id_colegio} value={item.id_colegio}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <span />
          )}
          <Field label="Sección">
            <select
              className={inputClass}
              value={section}
              onChange={(event) => {
                setSection(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {sections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className={secondaryButton}
            disabled={!hasFilters}
            onClick={() => {
              setQ("");
              setDate(todayInput());
              setStatus("");
              setSchool("");
              setSection("");
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-labelledby="attention-list"
        aria-busy={loading}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <h2 id="attention-list" className="font-semibold text-slate-950">
              Atenciones
            </h2>
            <p className="text-sm text-slate-600">
              {result
                ? `${result.meta.total} registros en este alcance`
                : "Agenda escolar"}
            </p>
          </div>
          {loading && result ? (
            <span role="status" className="text-sm text-slate-600">
              Actualizando…
            </span>
          ) : null}
        </div>
        {loading && !result ? (
          <Loading />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setReload((value) => value + 1)}
          />
        ) : !result?.data.length ? (
          <Empty filtered={hasFilters} />
        ) : (
          <>
            <div
              className={`hidden min-h-11 items-center gap-4 border-b border-slate-300 bg-slate-100 px-5 text-xs font-semibold uppercase tracking-wide text-slate-700 lg:grid ${activeScope.tipo === "todos" ? "grid-cols-[80px_minmax(180px,1fr)_minmax(170px,1fr)_minmax(180px,1fr)_120px_130px_auto]" : "grid-cols-[80px_minmax(190px,1fr)_minmax(180px,1fr)_120px_130px_auto]"}`}
            >
              <span>Hora</span>
              <span>Alumno</span>
              <span>Motivo de atención</span>
              {activeScope.tipo === "todos" ? <span>Institución</span> : null}
              <span>Estado</span>
              <span>Responsable</span>
              <span className="sr-only">Acciones</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {result.data.map((item) => (
                <li
                  key={item.id_atencion}
                  className={`grid gap-3 px-5 py-4 text-sm lg:items-center lg:gap-4 ${activeScope.tipo === "todos" ? "lg:grid-cols-[80px_minmax(180px,1fr)_minmax(170px,1fr)_minmax(180px,1fr)_120px_130px_auto]" : "lg:grid-cols-[80px_minmax(190px,1fr)_minmax(180px,1fr)_120px_130px_auto]"}`}
                >
                  <span className="font-semibold text-slate-950">
                    {formatTime(item.fecha_hora_ingreso)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {item.estudiante.nombre}
                    </p>
                    <p className="text-sm text-slate-600">
                      {item.estudiante.seccion} ·{" "}
                      {item.estudiante.codigo_matricula ?? "Sin código"}
                    </p>
                  </div>
                  <p className="line-clamp-2 text-slate-700">{item.motivo}</p>
                  {activeScope.tipo === "todos" ? (
                    <p className="text-slate-700">{item.colegio.nombre}</p>
                  ) : null}
                  <div>
                    <Status value={item.estado} />
                    {item.destino ? (
                      <p className="mt-1 text-xs text-slate-600">
                        {destinationLabels[item.destino]}
                      </p>
                    ) : null}
                  </div>
                  <p className="truncate text-slate-700">{item.responsable}</p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={busyId === item.id_atencion}
                      onClick={() => void openDetail(item.id_atencion)}
                    >
                      {busyId === item.id_atencion
                        ? "Abriendo…"
                        : "Ver detalle"}
                    </button>
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() =>
                        setRecordTarget({
                          studentId: item.estudiante.id_estudiante,
                          schoolId: item.id_colegio,
                        })
                      }
                    >
                      Ficha
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={Math.max(result.meta.totalPages, 1)}
              total={result.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </section>

      {newOpen ? (
        <NewAttentionDialog
          api={api}
          onClose={() => setNewOpen(false)}
          onSaved={(created) => {
            setNewOpen(false);
            setDetail(created);
            setReload((value) => value + 1);
            showToast({
              type: "success",
              message: "La atención quedó abierta con trazabilidad.",
            });
          }}
          onOpenExisting={(id) => {
            setNewOpen(false);
            void openDetail(id);
          }}
        />
      ) : null}
      {detail ? (
        <AttentionDetailDialog
          api={api}
          initial={detail}
          recordRefreshKey={recordRefreshKey}
          onClose={() => setDetail(null)}
          onChanged={(value) => {
            setDetail(value);
            setReload((current) => current + 1);
          }}
          onRecord={(studentId, schoolId) =>
            setRecordTarget({ studentId, schoolId })
          }
        />
      ) : null}
      {recordTarget ? (
        <HealthRecordDialog
          api={api}
          target={recordTarget}
          onClose={() => setRecordTarget(null)}
          onRecordChanged={() =>
            setRecordRefreshKey((current) => current + 1)
          }
        />
      ) : null}
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: number;
  icon: typeof HeartPulse;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-xl font-bold text-slate-950">{value ?? "—"}</p>
      </div>
    </article>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {help ? (
        <span className="mt-1.5 block text-sm text-slate-600">{help}</span>
      ) : null}
    </label>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${value === "abierta" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}
    >
      {value === "abierta" ? "Abierta" : "Cerrada"}
    </span>
  );
}

function Loading() {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status">
      <Loader2
        className="animate-spin text-blue-600 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="sr-only">Cargando atenciones</span>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center px-5 text-center"
      role="alert"
    >
      <AlertCircle className="text-red-700" />
      <h3 className="mt-3 font-semibold text-slate-950">
        No se pudo cargar Enfermería
      </h3>
      <p className="mt-1 max-w-lg text-sm text-slate-600">{message}</p>
      <button
        type="button"
        className={`${secondaryButton} mt-4`}
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

function Empty({ filtered }: { filtered: boolean }) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center px-5 text-center"
      role="status"
    >
      <FileHeart className="text-slate-500" />
      <h3 className="mt-3 font-semibold text-slate-950">
        {filtered ? "No hay coincidencias" : "Aún no hay atenciones"}
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {filtered
          ? "Ajusta los filtros para ampliar la búsqueda."
          : "Registra una atención cuando un alumno requiera apoyo escolar."}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
      <button
        type="button"
        className={secondaryButton}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
        Anterior
      </button>
      <p className="text-sm text-slate-600">
        Página <strong>{page}</strong> de <strong>{totalPages}</strong> ·{" "}
        {total} registros
      </p>
      <button
        type="button"
        className={secondaryButton}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function NewAttentionDialog({
  api,
  onClose,
  onSaved,
  onOpenExisting,
}: {
  api: Api;
  onClose: () => void;
  onSaved: (item: AtencionEnfermeria) => void;
  onOpenExisting: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<AlumnoEnfermeria[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AlumnoEnfermeria | null>(null);
  const [record, setRecord] = useState<FichaAlumno | null>(null);
  const [motivo, setMotivo] = useState("");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openAttentionId, setOpenAttentionId] = useState<number | null>(null);

  useEffect(() => {
    if (selected || q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      api
        .students(q.trim(), controller.signal)
        .then(setStudents)
        .catch((requestError) => {
          if (!controller.signal.aborted)
            setError(enfermeriaError(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, q, selected]);

  async function choose(item: AlumnoEnfermeria) {
    setSelected(item);
    setQ(item.estudiante.nombre);
    setStudents([]);
    setError("");
    setOpenAttentionId(item.atencion_abierta_id);
    try {
      setRecord(
        await api.record(item.estudiante.id_estudiante, item.id_colegio),
      );
    } catch (requestError) {
      setError(enfermeriaError(requestError));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || motivo.trim().length < 3 || openAttentionId !== null)
      return;
    setSaving(true);
    setError("");
    try {
      onSaved(
        await api.create({
          id_matricula: selected.id_matricula,
          motivo: motivo.trim(),
          ...(observation.trim()
            ? { observacion_reportada: observation.trim() }
            : {}),
        }),
      );
    } catch (requestError) {
      const existingId = enfermeriaAtencionAbiertaId(requestError);
      if (existingId !== null) {
        setOpenAttentionId(existingId);
        setSaving(false);
        return;
      }
      setError(enfermeriaError(requestError));
      setSaving(false);
    }
  }

  const active = currentMedicationAuthorizations(
    record?.autorizaciones ?? [],
    todayInput(),
  );
  return (
    <AccessibleDialog
      open
      title="Nueva atención"
      eyebrow="Enfermería escolar"
      description="Busca una matrícula operativa. La ficha de salud puede estar vacía."
      icon={<ClipboardPlus size={20} />}
      onClose={onClose}
      preventClose={saving}
      maxWidthClassName="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            className={secondaryButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-attention"
            className={primaryButton}
            disabled={
              saving ||
              !selected ||
              motivo.trim().length < 3 ||
              openAttentionId !== null
            }
          >
            {saving ? "Abriendo…" : "Abrir atención"}
          </button>
        </>
      }
    >
      <form id="new-attention" className="space-y-5" onSubmit={submit}>
        <div className="relative">
          <Field label="Buscar alumno">
            <input
              className={inputClass}
              type="search"
              value={q}
              autoComplete="off"
              placeholder="Nombres, apellidos, DNI o código"
              onChange={(event) => {
                setQ(event.target.value);
                setSelected(null);
                setRecord(null);
                setStudents([]);
                setOpenAttentionId(null);
                setError("");
              }}
            />
          </Field>
          {searching ? (
            <p className="mt-2 text-sm text-slate-600">Buscando…</p>
          ) : null}
          {students.length ? (
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
              {students.map((item) => (
                <li key={item.id_matricula}>
                  <button
                    type="button"
                    className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                    onClick={() => void choose(item)}
                  >
                    <span className="block font-semibold text-slate-950">
                      {item.estudiante.nombre}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {item.estudiante.seccion} · {item.colegio} ·{" "}
                      {item.codigo_matricula ?? "Sin código"}
                    </span>
                    {item.atencion_abierta_id !== null ? (
                      <span className="mt-1 block text-sm font-semibold text-amber-800">
                        Atención abierta
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {selected ? (
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-950">
              {selected.estudiante.nombre}
            </h3>
            <p className="text-sm text-blue-800">
              {selected.estudiante.seccion} · {selected.colegio}
            </p>
          </section>
        ) : null}
        {openAttentionId !== null ? (
          <OpenAttentionNotice
            onOpen={() => onOpenExisting(openAttentionId)}
          />
        ) : null}
        {record ? (
          <section
            className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
            aria-label="Alertas declaradas"
          >
            <h3 className="flex items-center gap-2 font-semibold text-amber-950">
              <ShieldAlert size={18} />
              Alertas de información declarada por la familia
            </h3>
            {record.ficha?.alergias_declaradas ? (
              <AlertLine
                label="Alergias declaradas"
                value={record.ficha.alergias_declaradas}
              />
            ) : null}
            {record.ficha?.condiciones_declaradas ? (
              <AlertLine
                label="Condiciones declaradas"
                value={record.ficha.condiciones_declaradas}
              />
            ) : null}
            {active.length ? (
              <AlertLine
                label="Autorizaciones activas"
                value={active.map((item) => item.medicamento).join(", ")}
              />
            ) : null}
            {!record.ficha?.alergias_declaradas &&
            !record.ficha?.condiciones_declaradas &&
            !active.length ? (
              <p className="text-sm text-amber-900">
                No hay alertas declaradas registradas. Esto no confirma ausencia
                de condiciones.
              </p>
            ) : null}
          </section>
        ) : null}
        <Field
          label="Motivo de atención"
          help="Describe el motivo o los síntomas observados; no es necesario establecer un diagnóstico."
        >
          <input
            className={inputClass}
            value={motivo}
            maxLength={500}
            required
            onChange={(event) => setMotivo(event.target.value)}
          />
        </Field>
        <Field label="Observación o síntomas reportados">
          <textarea
            className={textareaClass}
            value={observation}
            maxLength={5000}
            onChange={(event) => setObservation(event.target.value)}
          />
        </Field>
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}
      </form>
    </AccessibleDialog>
  );
}

function AlertLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-amber-950">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-amber-900">{value}</p>
    </div>
  );
}

function OpenAttentionNotice({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      className="rounded-lg border border-amber-300 bg-amber-50 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="mt-0.5 shrink-0 text-amber-800"
          size={20}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-semibold text-amber-950">
            Este alumno ya tiene una atención abierta.
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Continúa registrando la información en esa atención.
          </p>
          <button
            type="button"
            className={`${secondaryButton} mt-3`}
            onClick={onOpen}
          >
            Ver atención abierta
          </button>
        </div>
      </div>
    </section>
  );
}

function AttentionDetailDialog({
  api,
  initial,
  recordRefreshKey,
  onClose,
  onChanged,
  onRecord,
}: {
  api: Api;
  initial: AtencionEnfermeria;
  recordRefreshKey: number;
  onClose: () => void;
  onChanged: (item: AtencionEnfermeria) => void;
  onRecord: (studentId: number, schoolId: number) => void;
}) {
  const [item, setItem] = useState(initial);
  const [record, setRecord] = useState<FichaAlumno | null>(null);
  const [observation, setObservation] = useState(
    item.observacion_reportada ?? "",
  );
  const [actions, setActions] = useState(item.acciones_realizadas ?? "");
  const [correction, setCorrection] = useState("");
  const [mode, setMode] = useState<"contact" | "medication" | "close" | null>(
    null,
  );
  const [guardian, setGuardian] = useState("");
  const [medium, setMedium] = useState<"telefono" | "presencial" | "otro">(
    "telefono",
  );
  const [contactNote, setContactNote] = useState("");
  const [notify, setNotify] = useState(false);
  const [authorization, setAuthorization] = useState("");
  const [destination, setDestination] =
    useState<EnfermeriaDestino>("regresa_aula");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedRecordRefreshKey, setLoadedRecordRefreshKey] = useState(-1);
  const recordLoading = loadedRecordRefreshKey !== recordRefreshKey;

  useEffect(() => {
    let cancelled = false;
    api
      .record(item.estudiante.id_estudiante, item.id_colegio)
      .then((value) => {
        if (!cancelled) setRecord(value);
      })
      .catch((requestError) => {
        if (!cancelled) setError(enfermeriaError(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoadedRecordRefreshKey(recordRefreshKey);
      });
    return () => {
      cancelled = true;
    };
  }, [
    api,
    item.estudiante.id_estudiante,
    item.id_colegio,
    recordRefreshKey,
  ]);
  const active = currentMedicationAuthorizations(
    record?.autorizaciones ?? [],
    todayInput(),
  );
  const medicationState = resolveMedicationState(
    item.medicacion_administrada,
    active.length,
  );
  async function execute(operation: () => Promise<AtencionEnfermeria>) {
    setBusy(true);
    setError("");
    try {
      const changed = await operation();
      setItem(changed);
      setObservation(changed.observacion_reportada ?? "");
      setActions(changed.acciones_realizadas ?? "");
      setMode(null);
      onChanged(changed);
    } catch (requestError) {
      setError(enfermeriaError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessibleDialog
      open
      title={`Atención de ${item.estudiante.nombre}`}
      eyebrow={item.estudiante.seccion}
      description={`${formatDateTime(item.fecha_hora_ingreso)} · Responsable: ${item.responsable}`}
      icon={<HeartPulse size={20} />}
      onClose={onClose}
      preventClose={busy}
      maxWidthClassName="max-w-4xl"
      footer={
        <>
          <button
            type="button"
            className={secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cerrar detalle
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() =>
              onRecord(item.estudiante.id_estudiante, item.id_colegio)
            }
          >
            <FileHeart size={17} />
            Ficha del alumno
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info
            label="Estado"
            value={item.estado === "abierta" ? "Abierta" : "Cerrada"}
          />
          <Info
            label="Ingreso"
            value={formatDateTime(item.fecha_hora_ingreso)}
          />
          <Info label="Responsable" value={item.responsable} />
          <Info
            label="Destino"
            value={item.destino ? destinationLabels[item.destino] : "Pendiente"}
          />
        </div>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-950">
            Motivo de atención
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {item.motivo}
          </p>
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Observación o síntomas reportados">
            <textarea
              className={textareaClass}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
          </Field>
          <Field
            label="Acciones y cuidados realizados"
            help="Registra aquí las acciones realizadas. La administración de medicamentos se registra por separado mediante una autorización vigente."
          >
            <textarea
              className={textareaClass}
              value={actions}
              onChange={(event) => setActions(event.target.value)}
            />
          </Field>
        </div>
        {item.estado === "cerrada" ? (
          <Field label="Motivo de corrección posterior al cierre">
            <input
              className={inputClass}
              value={correction}
              placeholder="Obligatorio para conservar trazabilidad"
              onChange={(event) => setCorrection(event.target.value)}
            />
          </Field>
        ) : null}
        <button
          type="button"
          className={secondaryButton}
          disabled={
            busy || (item.estado === "cerrada" && correction.trim().length < 3)
          }
          onClick={() =>
            void execute(() =>
              api.update(item.id_atencion, {
                observacion_reportada: observation,
                acciones_realizadas: actions,
                ...(item.estado === "cerrada"
                  ? { motivo_correccion: correction }
                  : {}),
              }),
            )
          }
        >
          Guardar observaciones
        </button>

        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-950">
            {medicationState === "administered"
              ? "Medicación administrada"
              : "Medicación"}
          </h3>
          {medicationState === "administered" ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <MedicationData
                label="Autorización de medicación utilizada"
                value={
                  item.autorizacion_medicacion?.medicamento ?? "No disponible"
                }
              />
              <MedicationData
                label="Dosis o instrucción declarada"
                value={
                  item.autorizacion_medicacion?.dosis_instruccion ??
                  "No disponible"
                }
              />
              <MedicationData
                label="Fecha y hora de administración"
                value={formatDateTime(item.fecha_medicacion)}
              />
              <MedicationData
                label="Registrada por"
                value={item.medicacion_registrada_por ?? "No disponible"}
              />
            </dl>
          ) : recordLoading ? (
            <p className="mt-2 text-sm text-slate-600" role="status">
              Comprobando autorizaciones de medicación…
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-800">
                No se administró medicación en esta atención.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {medicationState === "available"
                  ? "Hay una autorización de medicación vigente disponible."
                  : "La medicación solo puede registrarse si existe una autorización vigente de la familia."}
              </p>
            </div>
          )}
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-950">Contacto con familia</h3>
          {item.contactos.length ? (
            <ul className="mt-2 space-y-2">
              {item.contactos.map((contact) => (
                <li
                  key={contact.id_contacto}
                  className="text-sm text-slate-700"
                >
                  <strong>{contact.apoderado}</strong> · {contact.medio} ·{" "}
                  {formatDateTime(contact.fecha_hora)}
                  {contact.notificacion_enviada
                    ? " · Aviso portal enviado"
                    : ""}
                  <span className="block text-slate-600">
                    {contact.observacion || "Sin observación"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              No hay contactos registrados.
            </p>
          )}
        </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          onClick={() => setMode("contact")}
        >
          <ContactRound size={17} />
          Registrar contacto
        </button>
        {item.estado === "abierta" ? (
          <>
            <button
              type="button"
              className={secondaryButton}
              disabled={
                recordLoading ||
                item.medicacion_administrada ||
                !active.length
              }
              onClick={() => setMode("medication")}
            >
              <Pill size={17} />
              Administrar medicación autorizada
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => setMode("close")}
            >
              <CheckCircle2 size={17} />
              Cerrar atención
            </button>
          </>
        ) : null}
      </div>

        {mode === "contact" ? (
          <ActionPanel title="Registrar contacto">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Apoderado">
                <select
                  className={inputClass}
                  value={guardian}
                  onChange={(event) => setGuardian(event.target.value)}
                >
                  <option value="">Selecciona</option>
                  {record?.apoderados.map((value) => (
                    <option key={value.id_apoderado} value={value.id_apoderado}>
                      {value.nombre} · {value.parentesco}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Medio">
                <select
                  className={inputClass}
                  value={medium}
                  onChange={(event) =>
                    setMedium(event.target.value as typeof medium)
                  }
                >
                  <option value="telefono">Teléfono</option>
                  <option value="presencial">Presencial</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            </div>
            <Field label="Resultado u observación breve">
              <textarea
                className={textareaClass}
                value={contactNote}
                onChange={(event) => setContactNote(event.target.value)}
              />
            </Field>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
              />
              <span>
                <strong>Notificar al apoderado</strong>
                <br />
                El aviso del portal será mínimo y no incluirá síntomas, alergias
                ni medicación.
              </span>
            </label>
            <PanelActions
              onCancel={() => setMode(null)}
              disabled={busy || !guardian}
              onConfirm={() =>
                void execute(() =>
                  api.contact(item.id_atencion, {
                    id_apoderado: Number(guardian),
                    medio: medium,
                    observacion: contactNote,
                    notificar: notify,
                  }),
                )
              }
              label="Guardar contacto"
            />
          </ActionPanel>
        ) : null}
        {mode === "medication" ? (
          <ActionPanel title="Administrar medicación">
            <p className="text-sm text-slate-600">
              Selecciona una autorización de medicación activa y vigente del
              alumno.
            </p>
            <Field label="Autorización de medicación">
              <select
                className={inputClass}
                value={authorization}
                onChange={(event) => setAuthorization(event.target.value)}
              >
                <option value="">Selecciona</option>
                {active.map((value) => (
                  <option
                    key={value.id_autorizacion}
                    value={value.id_autorizacion}
                  >
                    {value.medicamento} · {value.dosis_instruccion}
                  </option>
                ))}
              </select>
            </Field>
            <PanelActions
              onCancel={() => setMode(null)}
              disabled={busy || !authorization}
              onConfirm={() =>
                void execute(() =>
                  api.medication(item.id_atencion, Number(authorization)),
                )
              }
              label="Registrar administración"
            />
          </ActionPanel>
        ) : null}
        {mode === "close" ? (
          <ActionPanel title="Cerrar atención">
            <Field label="Destino">
              <select
                className={inputClass}
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value as EnfermeriaDestino)
                }
              >
                {Object.entries(destinationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Acciones y cuidados realizados"
              help="Registra aquí las acciones realizadas. La administración de medicamentos se registra por separado mediante una autorización vigente."
            >
              <textarea
                className={textareaClass}
                value={actions}
                onChange={(event) => setActions(event.target.value)}
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
              />
              Notificar al apoderado al cerrar
            </label>
            {notify ? (
              <>
                <Field label="Apoderado">
                  <select
                    className={inputClass}
                    value={guardian}
                    onChange={(event) => setGuardian(event.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {record?.apoderados.map((value) => (
                      <option
                        key={value.id_apoderado}
                        value={value.id_apoderado}
                      >
                        {value.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Medio de contacto">
                  <select
                    className={inputClass}
                    value={medium}
                    onChange={(event) =>
                      setMedium(event.target.value as typeof medium)
                    }
                  >
                    <option value="telefono">Teléfono</option>
                    <option value="presencial">Presencial</option>
                    <option value="otro">Otro</option>
                  </select>
                </Field>
                <Field label="Observación de contacto">
                  <input
                    className={inputClass}
                    value={contactNote}
                    onChange={(event) => setContactNote(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
            <PanelActions
              onCancel={() => setMode(null)}
              disabled={busy || (notify && !guardian)}
              onConfirm={() =>
                void execute(() =>
                  api.close(item.id_atencion, {
                    destino: destination,
                    acciones_realizadas: actions,
                    notificar_apoderado: notify,
                    ...(notify
                      ? {
                          id_apoderado: Number(guardian),
                          medio_contacto: medium,
                          observacion_contacto: contactNote,
                        }
                      : {}),
                  }),
                )
              }
              label="Cerrar atención"
            />
          </ActionPanel>
        ) : null}
        {item.historial?.length ? (
          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">
              Historial operativo
            </h3>
            <ol className="mt-3 space-y-3">
              {item.historial.map((movement) => (
                <li
                  key={movement.id_movimiento}
                  className="border-l-2 border-blue-200 pl-3 text-sm text-slate-700"
                >
                  <strong>{movementLabel(movement.accion)}</strong> ·{" "}
                  {movement.actor}
                  <span className="block text-slate-500">
                    {formatDateTime(movement.creado_en)}
                    {movement.motivo ? ` · ${movement.motivo}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}
      </div>
    </AccessibleDialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
function MedicationData({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
function ActionPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="font-semibold text-blue-950">{title}</h3>
      {children}
    </section>
  );
}
function PanelActions({
  onCancel,
  onConfirm,
  disabled,
  label,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" className={secondaryButton} onClick={onCancel}>
        Cancelar
      </button>
      <button
        type="button"
        className={primaryButton}
        disabled={disabled}
        onClick={onConfirm}
      >
        {label}
      </button>
    </div>
  );
}

function HealthRecordDialog({
  api,
  target,
  onClose,
  onRecordChanged,
}: {
  api: Api;
  target: { studentId: number; schoolId: number };
  onClose: () => void;
  onRecordChanged: () => void;
}) {
  const [data, setData] = useState<FichaAlumno | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [authForm, setAuthForm] = useState({
    id_apoderado: "",
    medicamento: "",
    dosis_instruccion: "",
    via: "",
    fecha_inicio: todayInput(),
    fecha_fin: todayInput(),
    observaciones: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .record(target.studentId, target.schoolId)
      .then((record) => {
        setData(record);
        setForm({
          grupo_sanguineo: record.ficha?.grupo_sanguineo ?? "",
          alergias_declaradas: record.ficha?.alergias_declaradas ?? "",
          condiciones_declaradas: record.ficha?.condiciones_declaradas ?? "",
          medicacion_habitual_declarada:
            record.ficha?.medicacion_habitual_declarada ?? "",
          seguro_centro_atencion: record.ficha?.seguro_centro_atencion ?? "",
          contacto_emergencia: record.ficha?.contacto_emergencia ?? "",
          telefono_emergencia: record.ficha?.telefono_emergencia ?? "",
          observaciones_relevantes:
            record.ficha?.observaciones_relevantes ?? "",
        });
      })
      .catch((requestError) => setError(enfermeriaError(requestError)));
  }, [api, target]);
  function field(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function run(operation: () => Promise<FichaAlumno>) {
    setBusy(true);
    setError("");
    try {
      const updated = await operation();
      setData(updated);
      setAuthorizationOpen(false);
      onRecordChanged();
    } catch (requestError) {
      setError(enfermeriaError(requestError));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(item: AutorizacionMedicacion) {
    const reason = window.prompt("Motivo de revocación (obligatorio)");
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.revoke(item.id_autorizacion, reason.trim());
      setData(await api.record(target.studentId, target.schoolId));
      onRecordChanged();
    } catch (requestError) {
      setError(enfermeriaError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessibleDialog
      open
      title={data?.estudiante.nombre ?? "Ficha de salud"}
      eyebrow="Información declarada por la familia"
      description={
        data
          ? `${data.estudiante.colegio}. Esta ficha no constituye un diagnóstico clínico.`
          : "Cargando ficha…"
      }
      icon={<FileHeart size={20} />}
      onClose={onClose}
      preventClose={busy}
      maxWidthClassName="max-w-5xl"
      footer={
        <>
          <button
            type="button"
            className={secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cerrar ficha
          </button>
          <button
            type="button"
            className={primaryButton}
            disabled={busy || !data}
            onClick={() =>
              void run(() =>
                api.saveRecord(target.studentId, target.schoolId, form),
              )
            }
          >
            Guardar información declarada
          </button>
        </>
      }
    >
      {!data && !error ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="font-semibold text-slate-950">
              Información declarada
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Grupo sanguíneo (opcional)">
                <input
                  className={inputClass}
                  value={form.grupo_sanguineo ?? ""}
                  onChange={(event) =>
                    field("grupo_sanguineo", event.target.value)
                  }
                />
              </Field>
              <Field label="Seguro o centro de atención">
                <input
                  className={inputClass}
                  value={form.seguro_centro_atencion ?? ""}
                  onChange={(event) =>
                    field("seguro_centro_atencion", event.target.value)
                  }
                />
              </Field>
              <Field label="Contacto de emergencia">
                <input
                  className={inputClass}
                  value={form.contacto_emergencia ?? ""}
                  onChange={(event) =>
                    field("contacto_emergencia", event.target.value)
                  }
                />
              </Field>
              <Field label="Teléfono de emergencia">
                <input
                  className={inputClass}
                  value={form.telefono_emergencia ?? ""}
                  onChange={(event) =>
                    field("telefono_emergencia", event.target.value)
                  }
                />
              </Field>
            </div>
          </section>
          <section>
            <h3 className="font-semibold text-slate-950">Alertas declaradas</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Field label="Alergias declaradas">
                <textarea
                  className={textareaClass}
                  value={form.alergias_declaradas ?? ""}
                  onChange={(event) =>
                    field("alergias_declaradas", event.target.value)
                  }
                />
              </Field>
              <Field label="Condiciones relevantes declaradas">
                <textarea
                  className={textareaClass}
                  value={form.condiciones_declaradas ?? ""}
                  onChange={(event) =>
                    field("condiciones_declaradas", event.target.value)
                  }
                />
              </Field>
              <Field label="Medicación habitual declarada">
                <textarea
                  className={textareaClass}
                  value={form.medicacion_habitual_declarada ?? ""}
                  onChange={(event) =>
                    field("medicacion_habitual_declarada", event.target.value)
                  }
                />
              </Field>
              <Field label="Observaciones relevantes">
                <textarea
                  className={textareaClass}
                  value={form.observaciones_relevantes ?? ""}
                  onChange={(event) =>
                    field("observaciones_relevantes", event.target.value)
                  }
                />
              </Field>
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">
                  Autorizaciones de medicación
                </h3>
                <p className="text-sm text-slate-600">
                  No se registra firma digital ni adjunto en V1.
                </p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setAuthorizationOpen((value) => !value)}
              >
                <Pill size={17} />
                Nueva autorización
              </button>
            </div>
            {authorizationOpen ? (
              <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Apoderado que autoriza">
                    <select
                      className={inputClass}
                      value={authForm.id_apoderado}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          id_apoderado: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona</option>
                      {data?.apoderados.map((item) => (
                        <option
                          key={item.id_apoderado}
                          value={item.id_apoderado}
                        >
                          {item.nombre} · {item.parentesco}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Medicamento">
                    <input
                      className={inputClass}
                      value={authForm.medicamento}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          medicamento: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Dosis o instrucción declarada">
                    <input
                      className={inputClass}
                      value={authForm.dosis_instruccion}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          dosis_instruccion: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Vía (opcional)">
                    <input
                      className={inputClass}
                      value={authForm.via}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          via: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Inicio">
                    <input
                      type="date"
                      className={inputClass}
                      value={authForm.fecha_inicio}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          fecha_inicio: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Fin">
                    <input
                      type="date"
                      className={inputClass}
                      value={authForm.fecha_fin}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          fecha_fin: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Observaciones">
                  <textarea
                    className={textareaClass}
                    value={authForm.observaciones}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        observaciones: event.target.value,
                      }))
                    }
                  />
                </Field>
                <button
                  type="button"
                  className={primaryButton}
                  disabled={
                    busy ||
                    !authForm.id_apoderado ||
                    !authForm.medicamento.trim() ||
                    !authForm.dosis_instruccion.trim()
                  }
                  onClick={() =>
                    void run(() =>
                      api.authorize(target.studentId, target.schoolId, {
                        id_apoderado: Number(authForm.id_apoderado),
                        medicamento: authForm.medicamento,
                        dosis_instruccion: authForm.dosis_instruccion,
                        via: authForm.via,
                        fecha_inicio: authForm.fecha_inicio,
                        fecha_fin: authForm.fecha_fin,
                        observaciones: authForm.observaciones,
                      }),
                    )
                  }
                >
                  Registrar autorización
                </button>
              </div>
            ) : null}
            {data?.autorizaciones.length ? (
              <ul className="mt-4 divide-y divide-slate-200">
                {data.autorizaciones.map((item) => (
                  <li
                    key={item.id_autorizacion}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.medicamento} ·{" "}
                        <span className="font-normal">
                          {item.dosis_instruccion}
                        </span>
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.apoderado} · {item.estado} ·{" "}
                        {item.fecha_inicio.slice(0, 10)} a{" "}
                        {item.fecha_fin.slice(0, 10)}
                      </p>
                    </div>
                    {item.estado === "activa" ? (
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={busy}
                        onClick={() => void revoke(item)}
                      >
                        <XCircle size={17} />
                        Revocar
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No hay autorizaciones registradas.
              </p>
            )}
          </section>
          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">
              Historial de atenciones
            </h3>
            {data?.atenciones.length ? (
              <ul className="mt-3 divide-y divide-slate-200">
                {data.atenciones.map((item) => (
                  <li
                    key={item.id_atencion}
                    className="py-3 text-sm text-slate-700"
                  >
                    <strong>{formatDateTime(item.fecha_hora_ingreso)}</strong> ·{" "}
                    {item.motivo} · {item.estado}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No hay atenciones registradas.
              </p>
            )}
          </section>
          {data?.ficha ? (
            <p className="text-sm text-slate-600">
              Última actualización:{" "}
              {formatDateTime(data.ficha.fecha_actualizacion)} por{" "}
              {data.ficha.actualizado_por}.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </AccessibleDialog>
  );
}
