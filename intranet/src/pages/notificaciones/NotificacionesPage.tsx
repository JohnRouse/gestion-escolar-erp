import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  Info,
  MessageSquareHeart,
  Search,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useToast } from "../../contexts/ToastContext";
import {
  notificationError,
  notificacionesApi,
  safeNotificationTarget,
  type NotificacionItem,
  type NotificacionOrigen,
  type NotificacionesResult,
} from "./notificacionesApi";

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none";

const origins: Array<{ value: NotificacionOrigen; label: string }> = [
  { value: "citas", label: "Citas" },
  { value: "pagos", label: "Pagos" },
  { value: "matricula", label: "Matrícula" },
  { value: "academico", label: "Académico" },
  { value: "eventos", label: "Eventos" },
  { value: "sistema", label: "Sistema" },
];

const originMeta = {
  citas: {
    label: "Citas",
    icon: MessageSquareHeart,
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  pagos: {
    label: "Pagos",
    icon: CircleDollarSign,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  matricula: {
    label: "Matrícula",
    icon: ClipboardCheck,
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  academico: {
    label: "Académico",
    icon: BookOpenCheck,
    tone: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  eventos: {
    label: "Eventos",
    icon: CalendarDays,
    tone: "bg-cyan-50 text-cyan-800 ring-cyan-100",
  },
  sistema: {
    label: "Sistema",
    icon: Info,
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
  },
} satisfies Record<
  NotificacionOrigen,
  { label: string; icon: typeof Bell; tone: string }
>;

type ReadFilter = "all" | "unread" | "read";

export default function NotificacionesPage() {
  const { token } = useAuth();
  const { activeScope, tenant, queryParams } = useSchool();
  return (
    <NotificacionesContent
      key={`${activeScope.id_tenant}:${JSON.stringify(queryParams)}`}
      token={token}
      tenantId={activeScope.id_tenant ?? tenant?.id_tenant ?? 0}
    />
  );
}

function NotificacionesContent({
  token,
  tenantId,
}: {
  token: string | null;
  tenantId: number;
}) {
  const navigate = useNavigate();
  const { activeScope, queryParams, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const api = useMemo(
    () => notificacionesApi(token, { ...queryParams, tenant_id: tenantId }),
    [token, queryParams, tenantId],
  );
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [origin, setOrigin] = useState<NotificacionOrigen | "">("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<NotificacionesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const hasFilters = readFilter !== "all" || Boolean(origin || query.trim());
  const showSchool = activeScope.tipo === "todos";

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      api
        .list(
          {
            ...(readFilter === "unread" ? { leida: false } : {}),
            ...(readFilter === "read" ? { leida: true } : {}),
            ...(origin ? { origen: origin } : {}),
            ...(query.trim() ? { q: query.trim() } : {}),
            page,
          },
          controller.signal,
        )
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) {
            setError(notificationError(requestError));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, readFilter, origin, query, page, reload]);

  function announceChange() {
    window.dispatchEvent(new Event("notifications:changed"));
  }

  async function toggleRead(item: NotificacionItem, leida: boolean) {
    setBusyId(item.id_notif);
    try {
      await api.markRead(item.id_notif, leida);
      setReload((value) => value + 1);
      announceChange();
      showToast({
        type: "success",
        message: leida
          ? "Notificación marcada como leída."
          : "Notificación marcada como no leída.",
      });
    } catch (requestError) {
      showToast({ type: "error", message: notificationError(requestError) });
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(item: NotificacionItem) {
    const target = safeNotificationTarget(item.url);
    if (!target) return;
    if (!item.leida) {
      try {
        await api.markRead(item.id_notif, true);
        announceChange();
      } catch (requestError) {
        showToast({ type: "error", message: notificationError(requestError) });
        return;
      }
    }
    navigate(target);
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const response = await api.markAllRead();
      setReload((value) => value + 1);
      announceChange();
      showToast({
        type: "success",
        message:
          response.actualizadas === 1
            ? "Se marcó 1 notificación como leída."
            : `Se marcaron ${response.actualizadas} notificaciones como leídas.`,
      });
    } catch (requestError) {
      showToast({ type: "error", message: notificationError(requestError) });
    } finally {
      setMarkingAll(false);
    }
  }

  function clearFilters() {
    setReadFilter("all");
    setOrigin("");
    setQuery("");
    setPage(1);
  }

  return (
    <div className="w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Comunicación"
        title="Notificaciones"
        description="Consulta avisos y novedades relacionadas con tu actividad."
        icon={Bell}
        meta={[{ label: "Alcance activo", value: scopeLabel }]}
        actions={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            disabled={markingAll || !result?.resumen.no_leidas}
            onClick={() => void markAllRead()}
          >
            <CheckCheck size={18} aria-hidden="true" />
            {markingAll ? "Marcando…" : "Marcar todas como leídas"}
          </button>
        }
      />

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Resumen de notificaciones"
      >
        <Summary label="No leídas" value={result?.resumen.no_leidas} icon={Circle} />
        <Summary label="Hoy" value={result?.resumen.hoy} icon={CalendarDays} />
        <Summary
          label="Total reciente"
          value={result?.resumen.total_reciente}
          icon={Bell}
        />
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
        aria-labelledby="notifications-filters-title"
      >
        <h2 id="notifications-filters-title" className="sr-only">
          Buscar y filtrar notificaciones
        </h2>
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(260px,1fr)_220px_auto] lg:items-end">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">
              Estado
            </legend>
            <div className="inline-flex min-h-11 w-full rounded-md border border-slate-300 bg-slate-50 p-1 sm:w-auto">
              {(
                [
                  ["all", "Todas"],
                  ["unread", "No leídas"],
                  ["read", "Leídas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={readFilter === value}
                  className={`min-h-9 flex-1 rounded px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-reduce:transition-none ${
                    readFilter === value
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                  onClick={() => {
                    setReadFilter(value);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
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
                placeholder="Título o contenido"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </span>
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Origen
            </span>
            <select
              className={inputClass}
              value={origin}
              onChange={(event) => {
                setOrigin(event.target.value as NotificacionOrigen | "");
                setPage(1);
              }}
            >
              <option value="">Todos los orígenes</option>
              {origins.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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
        aria-labelledby="notifications-list-title"
        aria-busy={loading}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
          <div>
            <h2
              id="notifications-list-title"
              className="text-base font-semibold text-slate-950"
            >
              Bandeja personal
            </h2>
            <p className="text-sm text-slate-600">
              {result
                ? `${result.meta.total} avisos para ti en este alcance`
                : "Avisos del alcance activo"}
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
          <ErrorState message={error} onRetry={() => setReload((value) => value + 1)} />
        ) : !result?.data.length ? (
          <EmptyState filtered={hasFilters} onClear={clearFilters} />
        ) : (
          <>
            <ul className={`divide-y divide-slate-200 ${loading ? "opacity-60" : ""}`}>
              {result.data.map((item) => (
                <NotificationRow
                  key={item.id_notif}
                  item={item}
                  showSchool={showSchool}
                  busy={busyId === item.id_notif}
                  onToggle={(leida) => void toggleRead(item, leida)}
                  onOpen={() => void openNotification(item)}
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
  icon: typeof Bell;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
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

function NotificationRow({
  item,
  showSchool,
  busy,
  onToggle,
  onOpen,
}: {
  item: NotificacionItem;
  showSchool: boolean;
  busy: boolean;
  onToggle: (leida: boolean) => void;
  onOpen: () => void;
}) {
  const meta = originMeta[item.origen] ?? originMeta.sistema;
  const Icon = meta.icon;
  const target = safeNotificationTarget(item.url);
  return (
    <li
      className={`grid gap-3 px-4 py-4 transition-colors duration-150 sm:px-5 lg:grid-cols-[44px_minmax(0,1fr)_190px_auto] lg:items-center motion-reduce:transition-none ${
        item.leida ? "bg-white" : "bg-blue-50/40"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${meta.tone}`}
      >
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!item.leida ? (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              Nueva
            </span>
          ) : null}
          <h3 className="text-sm font-semibold text-slate-950">{item.titulo}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
          {item.mensaje}
        </p>
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          {meta.label}
          {showSchool && item.colegio?.nombre
            ? ` · ${item.colegio.nombre}`
            : ""}
        </p>
      </div>
      <time
        dateTime={item.fecha_creacion}
        className="text-sm text-slate-600 lg:text-right"
      >
        {formatNotificationDate(item.fecha_creacion)}
      </time>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none"
          disabled={busy}
          onClick={() => onToggle(!item.leida)}
        >
          {item.leida ? (
            <Circle size={17} aria-hidden="true" />
          ) : (
            <Check size={17} aria-hidden="true" />
          )}
          {item.leida ? "Marcar no leída" : "Marcar leída"}
        </button>
        {target ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            onClick={onOpen}
          >
            <ExternalLink size={17} aria-hidden="true" />
            Ver detalle
          </button>
        ) : null}
      </div>
    </li>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (sameDay) return `Hoy · ${time}`;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LoadingRows() {
  return (
    <div role="status" aria-label="Cargando notificaciones" className="divide-y divide-slate-200">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex min-h-24 animate-pulse items-center gap-4 px-5 motion-reduce:animate-none">
          <span className="h-10 w-10 shrink-0 rounded-lg bg-slate-200" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-4 w-48 max-w-full rounded bg-slate-200" />
            <span className="block h-3 w-3/4 rounded bg-slate-100" />
          </span>
        </div>
      ))}
      <span className="sr-only">Cargando notificaciones…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
        <AlertCircle size={23} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950">
        No se pudo cargar la bandeja
      </h3>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">{message}</p>
      <button
        type="button"
        className="mt-4 min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div role="status" className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Bell size={23} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-950">
        {filtered ? "No encontramos notificaciones" : "Tu bandeja está al día"}
      </h3>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
        {filtered
          ? "No hay avisos para los filtros seleccionados."
          : "Aquí aparecerán los avisos relacionados con tu actividad."}
      </p>
      {filtered ? (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-md px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          onClick={onClear}
        >
          Limpiar filtros
        </button>
      ) : null}
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
    <nav aria-label="Paginación de notificaciones" className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-slate-600">
        Página {page} de {totalPages} · {total} avisos
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft size={17} aria-hidden="true" /> Anterior
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Siguiente <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
