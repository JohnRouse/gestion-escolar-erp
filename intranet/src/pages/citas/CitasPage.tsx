import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  UserRoundSearch,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useToast } from "../../contexts/ToastContext";
import CitaDetail from "./CitaDetail";
import CitaForm from "./CitaForm";
import {
  citaError,
  citasApi,
  type CitaEstado,
  type CitaItem,
  type CitasResult,
} from "./citasApi";

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none";

const stateStyles: Record<CitaEstado, string> = {
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmada: "bg-blue-50 text-blue-800 ring-blue-200",
  rechazada: "bg-red-50 text-red-800 ring-red-200",
  cancelada: "bg-slate-100 text-slate-700 ring-slate-200",
  realizada: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function contextLabel(context: string) {
  if (context === "tutor") return "Tutor";
  if (context === "docente") return "Docente";
  return "Staff";
}

function recipientFunction(item: CitaItem) {
  const context = contextLabel(item.destinatario.contexto);
  return item.destinatario.funcion
    .toLocaleLowerCase("es")
    .startsWith(context.toLocaleLowerCase("es"))
    ? item.destinatario.funcion
    : `${context} · ${item.destinatario.funcion}`;
}

export default function CitasPage() {
  const { token, user } = useAuth();
  const { activeScope, tenant, queryParams } = useSchool();
  return (
    <CitasContent
      key={`${activeScope.id_tenant}:${JSON.stringify(queryParams)}`}
      token={token}
      role={user?.rol ?? ""}
      tenantId={activeScope.id_tenant ?? tenant?.id_tenant ?? 0}
    />
  );
}

function CitasContent({
  token,
  role,
  tenantId,
}: {
  token: string | null;
  role: string;
  tenantId: number;
}) {
  const { activeScope, queryParams, colegios, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const api = useMemo(
    () => citasApi(token, { ...queryParams, tenant_id: tenantId }),
    [token, queryParams, tenantId],
  );
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<CitasResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<CitaItem | null>(null);
  const [detailBusyId, setDetailBusyId] = useState<number | null>(null);

  const managerRoles = ["Admin", "Director", "Secretaria"];
  const effectiveCreateRoles =
    role === "Profesor" ? ["Profesor"] : managerRoles;
  const allowedSchools = colegios.filter(
    (school) =>
      school.id_tenant === tenantId &&
      effectiveCreateRoles.includes(school.rol_colegio ?? "") &&
      (activeScope.tipo === "todos" ||
        school.id_colegio === activeScope.id_colegio),
  );
  const canCreate =
    ["Admin", "Director", "Secretaria", "Profesor"].includes(role) &&
    allowedSchools.length > 0;
  const hasFilters = Boolean(
    q.trim() || estado || desde || hasta || destinatario,
  );
  const showSchool = activeScope.tipo === "todos";

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .list(
          {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(estado ? { estado } : {}),
            ...(desde ? { desde } : {}),
            ...(hasta ? { hasta } : {}),
            ...(destinatario ? { destinatario } : {}),
            page,
          },
          controller.signal,
        )
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) setError(citaError(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, q, estado, desde, hasta, destinatario, page, reload]);

  async function openDetail(item: CitaItem) {
    setDetailBusyId(item.id_cita);
    try {
      setDetail(await api.detail(item.id_cita));
    } catch (requestError) {
      showToast({ type: "error", message: citaError(requestError) });
    } finally {
      setDetailBusyId(null);
    }
  }

  function clearFilters() {
    setQ("");
    setEstado("");
    setDesde("");
    setHasta("");
    setDestinatario("");
    setPage(1);
    setLoading(true);
  }

  return (
    <div className="w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Personal"
        title="Citas"
        description="Gestiona citas individuales y reuniones de sección con trazabilidad."
        icon={CalendarDays}
        meta={[{ label: "Alcance activo", value: scopeLabel }]}
        actions={
          canCreate ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              onClick={() => setCreating(true)}
            >
              <CalendarPlus size={18} aria-hidden="true" />
              Nueva cita
            </button>
          ) : null
        }
      />

      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Resumen de citas"
      >
        <Summary
          label="Pendientes"
          value={result?.resumen.pendientes}
          icon={Clock3}
          tone="amber"
        />
        <Summary
          label="Confirmadas"
          value={result?.resumen.confirmadas}
          icon={CheckCircle2}
          tone="blue"
        />
        <Summary
          label="Hoy"
          value={result?.resumen.hoy}
          icon={CalendarDays}
          tone="slate"
        />
        <Summary
          label="Próximas"
          value={result?.resumen.proximas}
          icon={CalendarPlus}
          tone="emerald"
        />
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
        aria-labelledby="citas-filters-title"
      >
        <h2 id="citas-filters-title" className="sr-only">
          Buscar y filtrar citas
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_170px_160px_160px_minmax(220px,1fr)_auto] xl:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Buscar
            </span>
            <span className="relative block">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                className={`${inputClass} pl-10`}
                placeholder="Familia, sección, responsable o motivo"
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </label>
          <FilterSelect
            label="Estado"
            value={estado}
            onChange={(value) => {
              setEstado(value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmada">Confirmada</option>
            <option value="realizada">Realizada</option>
            <option value="rechazada">Rechazada</option>
            <option value="cancelada">Cancelada</option>
          </FilterSelect>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Desde
            </span>
            <input
              type="date"
              className={inputClass}
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Hasta
            </span>
            <input
              type="date"
              className={inputClass}
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <FilterSelect
            label="Responsable"
            value={destinatario}
            onChange={(value) => {
              setDestinatario(value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {(result?.filtros.destinatarios ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.nombre} · {option.funcion}
              </option>
            ))}
          </FilterSelect>
          <div className="flex min-h-11 items-center">
            {hasFilters ? (
              <button
                type="button"
                className="min-h-11 w-full rounded-md px-3 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-labelledby="citas-list-title"
        aria-busy={loading}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
          <div>
            <h2
              id="citas-list-title"
              className="text-base font-semibold text-slate-950"
            >
              Agenda
            </h2>
            <p className="text-sm text-slate-600">
              {result
                ? `${result.meta.total} citas en este alcance`
                : "Citas del alcance activo"}
            </p>
          </div>
          {loading && result?.data.length ? (
            <span role="status" className="text-sm font-medium text-slate-600">
              Actualizando…
            </span>
          ) : null}
        </div>

        {loading && !result ? (
          <LoadingRows />
        ) : error ? (
          <div
            role="alert"
            className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertCircle size={23} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-950">
              No se pudo cargar la agenda
            </h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
              {error}
            </p>
            <button
              type="button"
              className="mt-4 min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              onClick={() => setReload((value) => value + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : !result?.data.length ? (
          <div
            role="status"
            className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <UserRoundSearch size={23} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-950">
              {hasFilters ? "No encontramos citas" : "Aún no hay citas"}
            </h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
              {hasFilters
                ? "No hay resultados para los filtros seleccionados."
                : canCreate
                  ? "Crea la primera solicitud para una familia de este alcance."
                  : "No tienes citas asignadas en este colegio."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="mt-4 min-h-11 rounded-md px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`hidden min-h-11 items-center gap-4 border-b border-slate-300 bg-slate-100 px-5 text-xs font-semibold uppercase tracking-[0.045em] text-slate-700 lg:grid ${showSchool ? "lg:grid-cols-[130px_minmax(170px,1fr)_minmax(170px,1fr)_minmax(190px,1.2fr)_120px_auto]" : "lg:grid-cols-[130px_minmax(180px,1fr)_minmax(180px,1fr)_120px_auto]"}`}
            >
              <span>Fecha y hora</span>
              <span>Audiencia</span>
              <span>Responsable</span>
              {showSchool ? <span>Institución</span> : null}
              <span>Estado</span>
              <span className="sr-only">Acciones</span>
            </div>
            <ul
              className={`divide-y divide-slate-200 ${loading ? "opacity-60" : ""}`}
            >
              {result.data.map((item) => (
                <CitaRow
                  key={item.id_cita}
                  item={item}
                  showSchool={showSchool}
                  busy={detailBusyId === item.id_cita}
                  onOpen={() => void openDetail(item)}
                />
              ))}
            </ul>
            <Pagination
              page={page}
              total={result.meta.total}
              totalPages={Math.max(1, result.meta.totalPages)}
              onPrevious={() => setPage((value) => value - 1)}
              onNext={() => setPage((value) => value + 1)}
            />
          </>
        )}
      </section>

      {creating ? (
        <CitaForm
          api={api}
          showSchool={showSchool}
          allowIndividual={managerRoles.includes(role)}
          onClose={() => setCreating(false)}
          onSaved={(created) => {
            setCreating(false);
            setReload((value) => value + 1);
            showToast({
              type: "success",
              message:
                created.tipo === "seccion"
                  ? "La reunión de sección quedó registrada."
                  : "La cita individual quedó registrada.",
            });
          }}
        />
      ) : null}
      {detail ? (
        <CitaDetail
          api={api}
          initial={detail}
          onClose={() => setDetail(null)}
          onChanged={() => setReload((value) => value + 1)}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <select
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: number;
  icon: typeof CalendarDays;
  tone: "amber" | "blue" | "slate" | "emerald";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  };
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-950">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function CitaRow({
  item,
  showSchool,
  busy,
  onOpen,
}: {
  item: CitaItem;
  showSchool: boolean;
  busy: boolean;
  onOpen: () => void;
}) {
  const isSection = item.tipo === "seccion";
  return (
    <li
      className={`grid gap-4 px-4 py-4 transition-colors duration-150 hover:bg-slate-50 sm:px-5 lg:items-center ${showSchool ? "lg:grid-cols-[130px_minmax(170px,1fr)_minmax(170px,1fr)_minmax(190px,1.2fr)_120px_auto]" : "lg:grid-cols-[130px_minmax(180px,1fr)_minmax(180px,1fr)_120px_auto]"} motion-reduce:transition-none`}
    >
      <div>
        <p className="text-sm font-semibold capitalize text-slate-950">
          {formatDate(item.fecha)}
        </p>
        <p className="mt-0.5 text-sm tabular-nums text-slate-600">
          {item.hora_inicio}–{item.hora_fin}
        </p>
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
        <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500 lg:hidden">
          Audiencia
        </p>
        <span className="mb-1 mt-1 inline-flex min-h-6 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 lg:mt-0">
          {isSection ? "Sección" : "Individual"}
        </span>
        <p className="break-words text-sm font-semibold text-slate-950">
          {isSection
            ? (item.seccion?.nombre ?? "Sección no disponible")
            : `${item.estudiante?.nombre ?? "Estudiante histórico"}${item.apoderado?.nombre ? ` · ${item.apoderado.nombre}` : ""}`}
        </p>
        <p className="mt-0.5 break-words text-sm text-slate-600">
          {isSection
            ? (item.motivo ?? "Reunión de sección")
            : (item.estudiante?.seccion ?? "Sin matrícula asociada")}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500 lg:hidden">
          Responsable
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-950 lg:mt-0">
          {item.destinatario.nombre}
        </p>
        <p className="mt-0.5 break-words text-sm text-slate-600">
          {recipientFunction(item)}
        </p>
      </div>
      {showSchool ? (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500 lg:hidden">
            Institución
          </p>
          <p className="mt-1 break-words text-sm text-slate-700 lg:mt-0">
            {item.colegio?.nombre ?? "Contexto histórico"}
          </p>
        </div>
      ) : null}
      <div>
        <span
          className={`inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${stateStyles[item.estado]}`}
        >
          {item.estado}
        </span>
      </div>
      <button
        type="button"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto lg:min-h-9 lg:text-xs motion-reduce:transition-none"
        aria-disabled={busy}
        onClick={() => {
          if (!busy) onOpen();
        }}
      >
        {busy ? "Abriendo…" : "Ver detalle"}
      </button>
    </li>
  );
}

function LoadingRows() {
  return (
    <div role="status" aria-label="Cargando citas">
      <span className="sr-only">Cargando citas…</span>
      {[1, 2, 3, 4].map((key) => (
        <div
          key={key}
          className="flex min-h-24 items-center gap-4 border-b border-slate-200 px-5 py-4"
        >
          <span className="erp-skeleton-circle motion-reduce:animate-none" />
          <div className="flex-1 space-y-3">
            <span className="erp-skeleton-line block w-2/5 motion-reduce:animate-none" />
            <span className="erp-skeleton-line block w-3/5 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({
  page,
  total,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  total: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      aria-label="Paginación de citas"
      className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-center text-sm text-slate-600 sm:text-left">
        <span className="font-semibold text-slate-900">{total}</span> citas ·
        Página {page} de {totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={page <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Siguiente
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
