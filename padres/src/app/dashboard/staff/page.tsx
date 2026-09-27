"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";
import SolicitarCitaModal, {
  type CitaRecipient,
} from "@/components/SolicitarCitaModal";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

type ChildEnrollment = {
  id_matricula: number;
  id_colegio: number;
  colegio: string;
  estudiante: {
    id_estudiante: number;
    nombre: string;
    codigo: string;
    seccion: string;
    anio: string;
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function StaffPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const [children, setChildren] = useState<ChildEnrollment[]>([]);
  const [matriculaId, setMatriculaId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<CitaRecipient[]>([]);
  const [selected, setSelected] = useState<CitaRecipient | null>(null);
  const [context, setContext] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setError("");
    });
    axios
      .get<ChildEnrollment[]>("/api/citas/apoderado/hijos", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((response) => {
        const preferred = response.data.find((item) => item.estudiante.id_estudiante === selectedChild?.id_estudiante) ?? response.data[0];
        setLoadingRecipients(Boolean(preferred?.id_matricula));
        setChildren(response.data);
        setMatriculaId(preferred?.id_matricula ?? null);
      })
      .catch((requestError) => {
        if (!axios.isCancel(requestError)) setError("No se pudieron cargar los estudiantes vinculados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [router, selectedChild?.id_estudiante]);

  useEffect(() => {
    if (!matriculaId) return;
    const token = localStorage.getItem("token");
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoadingRecipients(true);
        setError("");
      }
    });
    axios
      .get<CitaRecipient[]>("/api/citas/apoderado/destinatarios", {
        params: { matricula_id: matriculaId },
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((response) => setRecipients(response.data))
      .catch((requestError) => {
        if (!axios.isCancel(requestError)) setError("No se pudieron cargar las personas disponibles para citas.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRecipients(false);
      });
    return () => controller.abort();
  }, [matriculaId]);

  const visible = useMemo(
    () =>
      context === "todos"
        ? recipients
        : recipients.filter((item) => item.contexto === context),
    [context, recipients],
  );
  const child = children.find((item) => item.id_matricula === matriculaId);

  return (
    <main className="portal-page">
      <ScreenHeader title="Personas para citas" subtitle="Directorio académico" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <PageTransition>
        <div className="portal-content">
          <section className="m-card p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-text-secondary">Solicitar sobre</span>
              <select
                className="portal-field"
                value={matriculaId ?? ""}
                disabled={loading}
                onChange={(event) => {
                  const nextId = Number(event.target.value) || null;
                  setMatriculaId(nextId);
                  setContext("todos");
                  setRecipients([]);
                  setSelected(null);
                  setError("");
                  setLoadingRecipients(Boolean(nextId));
                }}
              >
                <option value="">{loading ? "Cargando estudiantes…" : "Seleccionar estudiante"}</option>
                {children.map((item) => (
                  <option key={item.id_matricula} value={item.id_matricula}>
                    {item.estudiante.nombre} · {item.colegio}
                  </option>
                ))}
              </select>
            </label>
            {child ? (
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {child.estudiante.seccion} · {child.estudiante.anio}
              </p>
            ) : null}
          </section>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por función">
            {[
              ["todos", "Todos"],
              ["docente", "Docentes"],
              ["tutor", "Tutor"],
              ["staff", "Equipo escolar"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setContext(key)}
                aria-pressed={context === key}
                className="portal-filter"
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mb-4 mt-2 text-sm leading-6 text-text-secondary">
            Los docentes corresponden a la sección vigente. El equipo escolar se muestra solo cuando acepta citas.
          </p>

          {success ? (
            <p role="status" className="mb-4 rounded-lg border border-success/20 bg-success-soft p-3 text-sm font-semibold text-success">
              {success}
            </p>
          ) : null}
          {error ? (
            <PortalState kind="error" title="No pudimos cargar el directorio" description={error} className="mb-4" />
          ) : null}

          {loading || loadingRecipients ? (
            <PortalSkeletonList />
          ) : !matriculaId ? (
            <PortalState title="Selecciona un estudiante" description="Elige a quién corresponde la cita para ver las personas disponibles." />
          ) : visible.length === 0 ? (
            <PortalState title="No hay personas disponibles" description="Prueba otro filtro o consulta con la institución." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-white px-4">
              {visible.map((item) => (
                <li key={item.key} className="portal-list-item flex-wrap sm:flex-nowrap">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent" aria-hidden="true">
                    {initials(item.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-extrabold text-text">{item.nombre}</p>
                    <p className="mt-0.5 break-words text-sm text-text-secondary">{item.funcion}</p>
                    <p className="mt-0.5 break-words text-sm text-text-muted">{item.detalle}</p>
                  </div>
                  <button
                    type="button"
                    className="portal-button ml-14 w-full sm:ml-0 sm:w-auto"
                    onClick={() => setSelected(item)}
                  >
                    Solicitar cita
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageTransition>

      {selected && matriculaId ? (
        <SolicitarCitaModal
          idMatricula={matriculaId}
          destinatario={selected}
          isOpen
          onClose={() => setSelected(null)}
          onCreated={() => setSuccess("La solicitud quedó registrada y pendiente de confirmación.")}
        />
      ) : null}
      <BottomNav />
    </main>
  );
}
