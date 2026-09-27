"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AlertCircle, ArrowLeft, Mail, Paperclip, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";

interface Adjunto {
  id_adjunto: number;
  nombre_archivo: string;
  url: string;
}

interface HijoIncluido {
  id_estudiante: number;
  nombre: string;
}

interface Comunicado {
  id_circular: number;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  categoria: string;
  urgente: boolean;
  requiere_autorizacion: boolean;
  remitente: string;
  adjuntos: Adjunto[];
  leida: boolean;
  fecha_lectura: string | null;
  confirmada: boolean;
  fecha_confirmacion: string | null;
  dirigido_a: string;
  hijos_incluidos: HijoIncluido[];
}

type ReadFilter = "todos" | "no_leidos" | "leidos";

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(" ") : message || error.message;
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ComunicadosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Comunicado | null>(null);
  const [search, setSearch] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>("todos");
  const [markingRead, setMarkingRead] = useState<number | null>(null);
  const [readAttempted, setReadAttempted] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.get<Comunicado[]>("/api/circulares/padres", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(response.data);
      const rawId = searchParams.get("id_circular");
      const requestedId = rawId ? Number(rawId) : null;
      const authorized = requestedId
        ? response.data.find((item) => item.id_circular === requestedId)
        : null;
      if (rawId) setSelected(authorized ?? null);
    } catch (requestError) {
      setItems([]);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const applyPersonalState = (
    id: number,
    state: Pick<
      Comunicado,
      "leida" | "fecha_lectura" | "confirmada" | "fecha_confirmacion"
    >,
  ) => {
    setItems((current) =>
      current.map((item) => (item.id_circular === id ? { ...item, ...state } : item)),
    );
    setSelected((current) =>
      current?.id_circular === id ? { ...current, ...state } : current,
    );
  };

  useEffect(() => {
    if (
      !selected ||
      selected.leida ||
      markingRead === selected.id_circular ||
      readAttempted === selected.id_circular
    ) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const id = selected.id_circular;
    const timer = window.setTimeout(() => {
      setReadAttempted(id);
      setMarkingRead(id);
      setActionError("");
      axios
        .put(`/api/circulares/${id}/leida`, {}, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => applyPersonalState(id, response.data))
        .catch((requestError) => setActionError(errorMessage(requestError)))
        .finally(() => setMarkingRead(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [markingRead, readAttempted, selected]);

  const confirm = async () => {
    if (!selected) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setConfirming(true);
    setActionError("");
    setActionSuccess("");
    try {
      const response = await axios.post(
        `/api/circulares/${selected.id_circular}/confirmar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      applyPersonalState(selected.id_circular, response.data);
      setActionSuccess("Recepción confirmada correctamente.");
    } catch (requestError) {
      setActionError(errorMessage(requestError));
    } finally {
      setConfirming(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return items.filter((item) => {
      if (
        query &&
        !`${item.titulo} ${item.contenido} ${item.remitente}`
          .toLocaleLowerCase("es")
          .includes(query)
      ) return false;
      if (urgentOnly && !item.urgente) return false;
      if (attachmentsOnly && item.adjuntos.length === 0) return false;
      if (readFilter === "no_leidos" && item.leida) return false;
      if (readFilter === "leidos" && !item.leida) return false;
      return true;
    });
  }, [attachmentsOnly, items, readFilter, search, urgentOnly]);

  if (selected) {
    return (
      <main className="portal-page">
        <ScreenHeader title="Comunicados" subtitle="Información institucional" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
        <div className="portal-content">
          <button
            onClick={() => {
              setSelected(null);
              setReadAttempted(null);
              setActionError("");
              setActionSuccess("");
              router.replace("/dashboard/comunicados");
            }}
            className="portal-button portal-button-quiet mb-4 px-2"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Volver a comunicados
          </button>

          <article className="m-card p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="portal-badge bg-accent-soft text-accent">
                {selected.categoria || "General"}
              </span>
              {selected.urgente && (
                <span className="portal-badge bg-danger-soft text-danger">
                  Urgente
                </span>
              )}
              <span className={`portal-badge ${selected.leida ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {selected.leida
                  ? "Leído"
                  : markingRead === selected.id_circular
                    ? "Marcando como leído…"
                    : "No leído"}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-text">
              {selected.titulo}
            </h1>
            <p className="mt-3 text-sm font-semibold text-text-secondary">
              De: {selected.remitente}
            </p>
            <p className="mt-1 text-xs text-text-muted">{formatDate(selected.fecha_creacion)}</p>
            <p className="mt-1 text-xs text-text-muted">Dirigido a: {selected.dirigido_a}</p>

            {selected.hijos_incluidos.length > 0 && (
              <section className="mt-4 rounded-xl bg-info-soft p-4" aria-labelledby="hijos-incluidos">
                <h2 id="hijos-incluidos" className="text-sm font-bold text-text">Estudiantes incluidos</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {selected.hijos_incluidos.map((child) => child.nombre).join(", ")}
                </p>
              </section>
            )}

            <div className="mt-5 border-t border-border pt-5">
              <p className="whitespace-pre-wrap text-base leading-7 text-text">{selected.contenido}</p>
            </div>

            {selected.adjuntos.length > 0 && (
              <section className="mt-5 border-t border-border pt-5" aria-labelledby="archivos-adjuntos">
                <h2 id="archivos-adjuntos" className="text-sm font-bold text-text">Archivos adjuntos</h2>
                <div className="mt-2 space-y-2">
                  {selected.adjuntos.map((file) => (
                    <a
                      key={file.id_adjunto}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-accent"
                    >
                      <Paperclip size={17} aria-hidden="true" />
                      {file.nombre_archivo}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {selected.requiere_autorizacion && (
              <section className="mt-5 border-t border-border pt-5" aria-labelledby="confirmacion-comunicado">
                <h2 id="confirmacion-comunicado" className="text-sm font-bold text-text">Acuse de recepción</h2>
                {selected.confirmada ? (
                  <div className="mt-2 rounded-xl bg-success-soft p-4 text-sm font-bold text-success">
                    Confirmado el {formatDate(selected.fecha_confirmacion!)}
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Confirmas que has recibido y revisado este comunicado. La confirmación es única como apoderado para los estudiantes incluidos.
                    </p>
                    <button
                      onClick={() => void confirm()}
                      disabled={confirming}
                      className="portal-button mt-3"
                    >
                      {confirming ? "Confirmando…" : "Confirmar recepción"}
                    </button>
                  </>
                )}
              </section>
            )}

            {actionError && (
              <div role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-bold text-danger">
                <p>{actionError}</p>
                {!selected.leida && markingRead === null && (
                  <button
                    type="button"
                    onClick={() => setReadAttempted(null)}
                    className="mt-2 min-h-11 rounded-lg border border-danger px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  >
                    Reintentar marcar como leído
                  </button>
                )}
              </div>
            )}
            {actionSuccess && (
              <p role="status" className="mt-4 rounded-xl bg-success-soft p-3 text-sm font-bold text-success">
                {actionSuccess}
              </p>
            )}
          </article>
        </div>
        <BottomNav />
      </main>
    );
  }

  const unread = items.filter((item) => !item.leida).length;

  return (
    <main className="portal-page">
      <ScreenHeader title="Comunicados" subtitle="Información institucional" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <div className="portal-content">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-secondary">
            {unread > 0 ? `${unread} sin leer` : "Todos leídos"}
          </p>
          <p className="text-xs text-text-muted">{items.length} comunicados</p>
        </div>

        <label className="relative mb-3 block">
          <span className="sr-only">Buscar comunicados</span>
          <Search size={18} className="absolute left-3 top-3 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar comunicados"
            className="portal-field portal-field-leading"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros de comunicados">
          {([['todos', 'Todos'], ['no_leidos', 'Sin leer'], ['leidos', 'Leídos']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setReadFilter(value)} aria-pressed={readFilter === value} className="portal-filter">
              {label}
            </button>
          ))}
          <button onClick={() => setUrgentOnly((value) => !value)} aria-pressed={urgentOnly} className="portal-filter">
            Urgentes
          </button>
          <button onClick={() => setAttachmentsOnly((value) => !value)} aria-pressed={attachmentsOnly} className="portal-filter">
            Con adjuntos
          </button>
        </div>

        {loading ? (
          <PortalSkeletonList />
        ) : error ? (
          <PortalState kind="error" icon={<AlertCircle size={21} />} title="No se pudieron cargar los comunicados" description={error} actionLabel="Reintentar" onAction={() => void load()} />
        ) : filtered.length === 0 ? (
          <PortalState icon={<Mail size={21} />} title="No hay comunicados para mostrar" description="Prueba cambiando los filtros." />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <button
                key={item.id_circular}
                onClick={() => {
                  setActionError("");
                  setActionSuccess("");
                  setReadAttempted(null);
                  setSelected(item);
                }}
                className={`press m-card w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${!item.leida ? "portal-unread" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!item.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                      <p className={`line-clamp-2 leading-6 text-text ${item.leida ? "font-semibold" : "font-extrabold"}`}>{item.titulo}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-text-secondary">{item.remitente}</p>
                  </div>
                  {item.urgente && <span className="portal-badge shrink-0 bg-danger-soft text-danger">Urgente</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-text-secondary">{item.contenido}</p>
                <p className="mt-2 text-xs text-text-muted">Dirigido a: {item.dirigido_a}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span>{formatDate(item.fecha_creacion)}</span>
                  <span>·</span>
                  <span>{item.categoria}</span>
                  {item.adjuntos.length > 0 && <><span>·</span><span className="inline-flex items-center gap-1"><Paperclip size={14} aria-hidden="true" />{item.adjuntos.length}</span></>}
                  {item.confirmada && <><span>·</span><span className="font-bold text-success">Confirmado</span></>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

export default function ComunicadosPage() {
  return (
    <Suspense
      fallback={
        <main className="portal-page">
          <ScreenHeader title="Comunicados" subtitle="Información institucional" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
          <p className="px-5 pt-8 text-center text-sm text-text-secondary">Cargando comunicados…</p>
          <BottomNav />
        </main>
      }
    >
      <ComunicadosContent />
    </Suspense>
  );
}
