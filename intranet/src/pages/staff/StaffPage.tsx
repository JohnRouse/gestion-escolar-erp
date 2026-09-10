import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import { staffApi, staffError, type StaffItem } from './staffApi';
import StaffForm from './StaffForm';

const fullName = (item: StaffItem) =>
  [item.persona.nombres, item.persona.apellido_paterno, item.persona.apellido_materno]
    .filter(Boolean)
    .join(' ');

const initials = (item: StaffItem) =>
  [item.persona.nombres, item.persona.apellido_paterno]
    .map((part) => part.trim().charAt(0))
    .join('')
    .toUpperCase();

const schoolName = (item: StaffItem) =>
  item.colegio?.nombre ?? item.seccion?.colegio?.nombre ?? 'Institución no disponible';

export default function StaffPage() {
  const { token, user } = useAuth();
  const { activeScope, queryParams, scopeLabel } = useSchool();

  // Remount on scope changes to discard stale results and any open draft.
  return (
    <StaffContent
      key={`${activeScope.id_tenant}:${JSON.stringify(queryParams)}`}
      token={token}
      rol={user?.rol ?? ''}
      scopeLabel={scopeLabel}
    />
  );
}

function StaffContent({
  token,
  rol,
  scopeLabel,
}: {
  token: string | null;
  rol: string;
  scopeLabel: string;
}) {
  const { activeScope, tenant, queryParams, colegios } = useSchool();
  const { showToast } = useToast();
  const api = useMemo(
    () =>
      staffApi(token, {
        ...queryParams,
        tenant_id: activeScope.id_tenant ?? tenant?.id_tenant ?? 0,
      }),
    [token, queryParams, activeScope.id_tenant, tenant?.id_tenant],
  );
  const [q, setQ] = useState('');
  const [citas, setCitas] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    data: StaffItem[];
    meta: { total: number; totalPages: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ item: StaffItem | null } | null>(null);
  const [detailBusyId, setDetailBusyId] = useState<number | null>(null);
  const allowedSchools = colegios.filter(
    (school) =>
      school.id_tenant === (activeScope.id_tenant ?? tenant?.id_tenant) &&
      ['Admin', 'Director'].includes(school.rol_colegio ?? '') &&
      (activeScope.tipo === 'todos' || school.id_colegio === activeScope.id_colegio),
  );
  const hasFilters = Boolean(q.trim() || citas);
  const showSchool = activeScope.tipo === 'todos';

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api
        .list(q, citas, page, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) setError(staffError(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, q, citas, page, reload]);

  async function edit(item: StaffItem) {
    setDetailBusyId(item.id_staff);
    try {
      setForm({ item: await api.detail(item.id_staff) });
    } catch (requestError) {
      showToast({ type: 'error', message: staffError(requestError) });
    } finally {
      setDetailBusyId(null);
    }
  }

  function clearFilters() {
    setQ('');
    setCitas('');
    setPage(1);
    setLoading(true);
  }

  return (
    <div className="w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Personal"
        title="Staff institucional"
        description="Consulta y administra al personal de gestión, sus funciones y su acceso interno."
        icon={Users}
        meta={[{ label: 'Alcance', value: scopeLabel }]}
        actions={
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 motion-reduce:transition-none"
            disabled={!allowedSchools.length}
            onClick={() => setForm({ item: null })}
          >
            <Plus size={18} aria-hidden="true" />
            Nuevo miembro
          </button>
        }
      />

      <section
        className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
        aria-labelledby="staff-filters-title"
      >
        <h2 id="staff-filters-title" className="sr-only">
          Buscar y filtrar Staff
        </h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto] md:items-end">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Buscar personal
            </span>
            <span className="relative block">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none"
                type="search"
                aria-label="Buscar Staff"
                placeholder="Nombre, DNI, cargo o área"
                value={q}
                maxLength={100}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                  setLoading(true);
                }}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Disponibilidad de citas
            </span>
            <select
              className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none"
              aria-label="Citas"
              value={citas}
              onChange={(event) => {
                setCitas(event.target.value);
                setPage(1);
                setLoading(true);
              }}
            >
              <option value="">Todas las opciones</option>
              <option value="si">Permite citas</option>
              <option value="no">No permite citas</option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-md px-3 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-labelledby="staff-directory-title"
        aria-busy={loading}
      >
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
          <div>
            <h2 id="staff-directory-title" className="text-base font-semibold text-slate-950">
              Directorio de personal
            </h2>
            <p className="text-sm text-slate-600">
              {result ? `${result.meta.total} miembros en este alcance` : 'Personal del alcance activo'}
            </p>
          </div>
          {loading && result?.data.length ? (
            <span role="status" className="text-sm font-medium text-slate-600">
              Actualizando…
            </span>
          ) : null}
        </div>

        {loading && !result ? (
          <StaffLoading showSchool={showSchool} />
        ) : error ? (
          <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <AlertCircle size={23} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-950">No se pudo cargar el Staff</h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">{error}</p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              onClick={() => setReload((current) => current + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : !result?.data.length ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <UserRound size={23} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-950">
              {hasFilters ? 'No encontramos coincidencias' : 'Aún no hay miembros de Staff'}
            </h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
              {hasFilters
                ? 'No hay resultados para estos filtros.'
                : 'No hay miembros de Staff en este alcance.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-11 rounded-md px-4 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`hidden min-h-11 items-center gap-4 border-b border-slate-300 bg-slate-100 px-5 text-xs font-semibold uppercase tracking-[0.045em] text-slate-700 lg:grid ${
                showSchool
                  ? 'lg:grid-cols-[minmax(220px,1.6fr)_minmax(180px,1fr)_minmax(180px,1fr)_150px_auto]'
                  : 'lg:grid-cols-[minmax(240px,1.7fr)_minmax(220px,1.2fr)_170px_auto]'
              }`}
            >
              <span>Miembro</span>
              <span>Función</span>
              {showSchool && <span>Institución</span>}
              <span>Citas</span>
              <span className="sr-only">Acciones</span>
            </div>

            <ul className={`divide-y divide-slate-200 ${loading ? 'opacity-60' : ''}`}>
              {result.data.map((item) => (
                <StaffRow
                  key={item.id_staff}
                  item={item}
                  showSchool={showSchool}
                  detailBusy={detailBusyId === item.id_staff}
                  onEdit={() => void edit(item)}
                />
              ))}
            </ul>

            <StaffPagination
              page={page}
              total={result.meta.total}
              totalPages={Math.max(1, result.meta.totalPages)}
              onPrevious={() => {
                setPage((current) => current - 1);
                setLoading(true);
              }}
              onNext={() => {
                setPage((current) => current + 1);
                setLoading(true);
              }}
            />
          </>
        )}
      </section>

      {form && (
        <StaffForm
          item={form.item}
          api={api}
          rol={rol}
          colegios={allowedSchools}
          defaultColegio={activeScope.tipo === 'colegio' ? activeScope.id_colegio : null}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setReload((current) => current + 1);
            setLoading(true);
          }}
        />
      )}
    </div>
  );
}

function StaffRow({
  item,
  showSchool,
  detailBusy,
  onEdit,
}: {
  item: StaffItem;
  showSchool: boolean;
  detailBusy: boolean;
  onEdit: () => void;
}) {
  const name = fullName(item);

  return (
    <li
      className={`grid gap-4 px-4 py-4 transition-colors duration-150 hover:bg-slate-50 sm:px-5 lg:items-center ${
        showSchool
          ? 'lg:grid-cols-[minmax(220px,1.6fr)_minmax(180px,1fr)_minmax(180px,1fr)_150px_auto]'
          : 'lg:grid-cols-[minmax(240px,1.7fr)_minmax(220px,1.2fr)_170px_auto]'
      } motion-reduce:transition-none`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
          {initials(item)}
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold leading-5 text-slate-950 lg:truncate" title={name}>
            {name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600">DNI {item.persona.dni}</p>
        </div>
      </div>

      <div className="min-w-0 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
        <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500 lg:hidden">
          Función
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900 lg:mt-0">{item.cargo}</p>
        <p className="mt-0.5 break-words text-sm text-slate-600">{item.area}</p>
      </div>

      {showSchool && (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500 lg:hidden">
            Institución
          </p>
          <p className="mt-1 break-words text-sm text-slate-800 lg:mt-0" title={schoolName(item)}>
            {schoolName(item)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
            item.permite_citas
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          <CalendarCheck size={14} aria-hidden="true" />
          {item.permite_citas ? 'Permite citas' : 'No permite citas'}
        </span>
        {item.es_tutor && (
          <span className="inline-flex min-h-7 items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
            Tutor asignado
          </span>
        )}
      </div>

      <div className="flex justify-stretch lg:justify-end">
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto lg:min-h-9 lg:text-xs motion-reduce:transition-none"
          disabled={detailBusy}
          aria-label={`Editar ${name}`}
          onClick={onEdit}
        >
          <Pencil size={14} aria-hidden="true" />
          {detailBusy ? 'Abriendo…' : 'Editar'}
        </button>
      </div>
    </li>
  );
}

function StaffLoading({ showSchool }: { showSchool: boolean }) {
  return (
    <div role="status" aria-label="Cargando Staff">
      <span className="sr-only">Cargando Staff…</span>
      <div className="hidden min-h-11 items-center gap-4 border-b border-slate-300 bg-slate-100 px-5 lg:grid lg:grid-cols-5">
        {[1, 2, 3, 4, 5].slice(0, showSchool ? 5 : 4).map((key) => (
          <span key={key} className="erp-skeleton-line w-24 motion-reduce:animate-none" />
        ))}
      </div>
      {[1, 2, 3, 4].map((key) => (
        <div key={key} className="flex min-h-24 items-center gap-4 border-b border-slate-200 px-4 py-4 last:border-0 sm:px-5">
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

function StaffPagination({
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
      aria-label="Paginación Staff"
      className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-center text-sm text-slate-600 sm:text-left">
        <span className="font-semibold text-slate-900">{total}</span> miembros · Página {page} de {totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 motion-reduce:transition-none"
          disabled={page <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 motion-reduce:transition-none"
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
