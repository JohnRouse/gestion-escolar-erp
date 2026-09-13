"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import SolicitarCitaModal, {
  type CitaRecipient,
} from "@/components/SolicitarCitaModal";

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
    axios
      .get<ChildEnrollment[]>("/api/citas/apoderado/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setLoadingRecipients(Boolean(response.data[0]?.id_matricula));
        setChildren(response.data);
        setMatriculaId(response.data[0]?.id_matricula ?? null);
      })
      .catch(() => setError("No se pudieron cargar los estudiantes vinculados."))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!matriculaId) return;
    const token = localStorage.getItem("token");
    axios
      .get<CitaRecipient[]>("/api/citas/apoderado/destinatarios", {
        params: { matricula_id: matriculaId },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setRecipients(response.data))
      .catch(() => setError("No se pudieron cargar las personas disponibles para citas."))
      .finally(() => setLoadingRecipients(false));
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
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Personas para citas" />
      <PageTransition>
        <div className="px-5 pb-28 pt-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard?open=servicios")}
            className="mb-4 flex min-h-11 items-center gap-1 text-sm font-bold text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_back</span>
            Servicios
          </button>

          <section className="m-card p-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-text-secondary">Solicitar sobre</span>
              <select
                className="input-underline min-h-11"
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

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por función">
            {[
              ["todos", "Todos"],
              ["docente", "Docentes"],
              ["tutor", "Tutor"],
              ["staff", "Staff"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setContext(key)}
                className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${
                  context === key
                    ? "bg-accent text-white"
                    : "border border-border bg-white text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mb-4 mt-2 text-sm leading-6 text-text-secondary">
            Los docentes corresponden a la sección vigente. El Staff se muestra solo cuando acepta citas.
          </p>

          {success ? (
            <p role="status" className="mb-4 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
              {success}
            </p>
          ) : null}
          {error ? (
            <div role="alert" className="m-card mb-4 p-4 text-sm font-semibold text-danger">
              {error}
            </div>
          ) : null}

          {loading || loadingRecipients ? (
            <div className="space-y-3" role="status" aria-label="Cargando destinatarios">
              {[1, 2, 3].map((item) => (
                <div key={item} className="m-card flex items-center gap-3 p-4">
                  <div className="skel h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="skel h-4 w-32" /><div className="skel h-3 w-24" /></div>
                </div>
              ))}
            </div>
          ) : !matriculaId ? (
            <p className="py-10 text-center text-sm text-text-secondary">Selecciona un estudiante para ver destinatarios válidos.</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">No hay destinatarios disponibles para este filtro.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((item) => (
                <li key={item.key} className="m-card flex items-center gap-3 p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent" aria-hidden="true">
                    {initials(item.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-extrabold text-text">{item.nombre}</p>
                    <p className="mt-0.5 break-words text-sm text-text-secondary">{item.funcion}</p>
                    <p className="mt-0.5 break-words text-sm text-text-muted">{item.detalle}</p>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 shrink-0 rounded-xl bg-accent px-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => setSelected(item)}
                  >
                    Solicitar
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
