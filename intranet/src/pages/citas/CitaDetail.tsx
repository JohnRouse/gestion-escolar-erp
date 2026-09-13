import { useState } from "react";
import {
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock3,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import AccessibleDialog from "../../components/AccessibleDialog";
import {
  citaError,
  type CitaEstado,
  type CitaItem,
  type citasApi,
} from "./citasApi";

type Api = ReturnType<typeof citasApi>;
type Action =
  | { kind: "estado"; target: Exclude<CitaEstado, "pendiente">; title: string }
  | { kind: "reprogramar"; title: string }
  | { kind: "acuerdos"; title: string };

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 motion-reduce:transition-none";

const stateStyles: Record<CitaEstado, string> = {
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmada: "bg-blue-50 text-blue-800 ring-blue-200",
  rechazada: "bg-red-50 text-red-800 ring-red-200",
  cancelada: "bg-slate-100 text-slate-700 ring-slate-200",
  realizada: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function today() {
  const current = new Date();
  const offset = current.getTimezoneOffset() * 60_000;
  return new Date(current.getTime() - offset).toISOString().slice(0, 10);
}

function actionLabel(value: string, sectionMeeting: boolean) {
  const labels: Record<string, string> = {
    creada: sectionMeeting ? "Reunión creada" : "Solicitud creada",
    confirmada: sectionMeeting ? "Reunión confirmada" : "Cita confirmada",
    rechazada: "Cita rechazada",
    cancelada: sectionMeeting ? "Reunión cancelada" : "Cita cancelada",
    realizada: sectionMeeting ? "Reunión realizada" : "Cita realizada",
    reprogramada: sectionMeeting ? "Reunión reprogramada" : "Cita reprogramada",
    acuerdos: "Acuerdos registrados",
  };
  return labels[value] ?? value;
}

export default function CitaDetail({
  api,
  initial,
  onClose,
  onChanged,
}: {
  api: Api;
  initial: CitaItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState(initial);
  const [action, setAction] = useState<Action | null>(null);
  const [comment, setComment] = useState("");
  const [fecha, setFecha] = useState(initial.fecha.slice(0, 10));
  const [horaInicio, setHoraInicio] = useState(initial.hora_inicio);
  const [horaFin, setHoraFin] = useState(initial.hora_fin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const permissions = item.permisos;
  const isSection = item.tipo === "seccion";

  async function refresh() {
    const updated = await api.detail(item.id_cita);
    setItem(updated);
    setFecha(updated.fecha.slice(0, 10));
    setHoraInicio(updated.hora_inicio);
    setHoraFin(updated.hora_fin);
    setAction(null);
    setComment("");
    onChanged();
  }

  async function submitAction() {
    if (!action) return;
    if (
      ((action.kind === "estado" &&
        ["rechazada", "cancelada"].includes(action.target)) ||
        action.kind === "reprogramar" ||
        action.kind === "acuerdos") &&
      comment.trim().length < 3
    ) {
      setError("Escribe un motivo o acuerdo de al menos 3 caracteres.");
      return;
    }
    if (
      action.kind === "reprogramar" &&
      (!fecha || !horaInicio || !horaFin || horaInicio >= horaFin)
    ) {
      setError("Revisa la fecha y el rango horario de la reprogramación.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (action.kind === "estado") {
        await api.changeState(
          item.id_cita,
          action.target,
          comment.trim() || undefined,
        );
      } else if (action.kind === "reprogramar") {
        await api.reprogram(item.id_cita, {
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          comentario: comment.trim(),
        });
      } else {
        await api.addAgreement(item.id_cita, comment.trim());
      }
      await refresh();
    } catch (requestError) {
      setError(citaError(requestError));
    } finally {
      setSaving(false);
    }
  }

  const actionButtons = [
    permissions?.confirmar
      ? {
          label: "Confirmar",
          icon: Check,
          action: {
            kind: "estado",
            target: "confirmada",
            title: "Confirmar cita",
          } as Action,
        }
      : null,
    permissions?.rechazar
      ? {
          label: "Rechazar",
          icon: XCircle,
          action: {
            kind: "estado",
            target: "rechazada",
            title: "Rechazar cita",
          } as Action,
        }
      : null,
    permissions?.reprogramar
      ? {
          label: "Reprogramar",
          icon: RotateCcw,
          action: { kind: "reprogramar", title: "Reprogramar cita" } as Action,
        }
      : null,
    permissions?.cancelar
      ? {
          label: isSection ? "Cancelar reunión" : "Cancelar cita",
          icon: XCircle,
          action: {
            kind: "estado",
            target: "cancelada",
            title: isSection ? "Cancelar reunión" : "Cancelar cita",
          } as Action,
        }
      : null,
    permissions?.realizar
      ? {
          label: "Marcar realizada",
          icon: ClipboardCheck,
          action: {
            kind: "estado",
            target: "realizada",
            title: "Marcar cita realizada",
          } as Action,
        }
      : null,
    permissions?.acuerdos
      ? {
          label: "Registrar acuerdos",
          icon: FileText,
          action: { kind: "acuerdos", title: "Registrar acuerdos" } as Action,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: typeof Check;
    action: Action;
  }>;

  return (
    <AccessibleDialog
      open
      title={
        isSection
          ? `Reunión de ${item.seccion?.nombre ?? "sección"}`
          : `Cita con ${item.destinatario.nombre}`
      }
      eyebrow={isSection ? "Detalle de reunión" : "Detalle de cita"}
      description={`${formatDate(item.fecha)} · ${item.hora_inicio}–${item.hora_fin}`}
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <CalendarClock size={21} aria-hidden="true" />
        </span>
      }
      maxWidthClassName="max-w-4xl"
      preventClose={saving}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
          onClick={onClose}
        >
          Cerrar detalle
        </button>
      }
    >
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-7 items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {isSection ? "Reunión de sección" : "Cita individual"}
          </span>
          <span
            className={`inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${stateStyles[item.estado]}`}
          >
            {item.estado}
          </span>
          <span className="inline-flex min-h-7 items-center rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {item.destinatario.contexto === "tutor"
              ? "Tutor"
              : item.destinatario.contexto === "docente"
                ? "Docente"
                : "Staff"}
          </span>
          {item.legacy ? (
            <span className="text-xs font-medium text-slate-500">
              Registro histórico sin matrícula asociada
            </span>
          ) : null}
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {!isSection ? (
            <>
              <Data
                label="Estudiante"
                value={item.estudiante?.nombre ?? "No registrado (legacy)"}
              />
              <Data
                label="Apoderado"
                value={item.apoderado?.nombre ?? "No registrado (legacy)"}
              />
            </>
          ) : (
            <>
              <Data
                label="Sección"
                value={item.seccion?.nombre ?? "Sección no disponible"}
              />
              <Data
                label="Familias convocadas"
                value={String(item.audiencia?.familias_convocadas ?? 0)}
              />
              <Data
                label="Estudiantes"
                value={String(item.audiencia?.estudiantes ?? 0)}
              />
            </>
          )}
          <Data label="Responsable" value={item.destinatario.nombre} />
          <Data label="Función / contexto" value={item.destinatario.funcion} />
          <Data
            label="Institución"
            value={item.colegio?.nombre ?? "Contexto histórico"}
          />
          <Data
            label="Fecha y hora"
            value={`${formatDate(item.fecha)} · ${item.hora_inicio}–${item.hora_fin}`}
          />
          {item.estudiante ? (
            <Data
              label="Sección y año"
              value={`${item.estudiante.seccion} · ${item.estudiante.anio}`}
            />
          ) : null}
        </dl>

        {isSection &&
        item.audiencia &&
        (item.audiencia.familias.length ||
          item.audiencia.lista_estudiantes.length) ? (
          <details className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
              Ver familias y estudiantes convocados
            </summary>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Familias
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {item.audiencia.familias.map((family) => (
                    <li key={family.id_apoderado}>
                      {family.nombre} · {family.parentesco}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Estudiantes
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {item.audiencia.lista_estudiantes.map((student) => (
                    <li key={student.id_estudiante}>{student.nombre}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ) : null}

        <section aria-labelledby="cita-reason-title">
          <h3
            id="cita-reason-title"
            className="text-sm font-semibold text-slate-950"
          >
            {isSection ? "Asunto" : "Motivo"}
          </h3>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
            {item.motivo || "Sin motivo registrado."}
          </p>
        </section>

        {actionButtons.length ? (
          <section aria-labelledby="cita-actions-title">
            <h3
              id="cita-actions-title"
              className="text-sm font-semibold text-slate-950"
            >
              Acciones disponibles
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {actionButtons.map(
                ({ label, icon: Icon, action: nextAction }) => (
                  <button
                    key={label}
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
                    onClick={() => {
                      setAction(nextAction);
                      setComment("");
                      setError("");
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                ),
              )}
            </div>
          </section>
        ) : null}

        {action ? (
          <section
            className="rounded-lg border border-blue-200 bg-blue-50/50 p-4"
            aria-labelledby="cita-action-form-title"
          >
            <h3
              id="cita-action-form-title"
              className="text-sm font-semibold text-slate-950"
            >
              {action.title}
            </h3>
            {action.kind === "reprogramar" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nueva fecha
                  </span>
                  <input
                    type="date"
                    min={today()}
                    className={inputClass}
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Hora inicial
                  </span>
                  <input
                    type="time"
                    className={inputClass}
                    value={horaInicio}
                    onChange={(event) => setHoraInicio(event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Hora final
                  </span>
                  <input
                    type="time"
                    className={inputClass}
                    value={horaFin}
                    onChange={(event) => setHoraFin(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {action.kind === "acuerdos"
                  ? "Acuerdos"
                  : action.kind === "estado" &&
                      ["rechazada", "cancelada"].includes(action.target)
                    ? "Motivo"
                    : "Comentario (opcional)"}
              </span>
              <textarea
                className={`${inputClass} min-h-24 resize-y py-3`}
                value={comment}
                maxLength={action.kind === "acuerdos" ? 4000 : 1000}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            {error ? (
              <p className="mt-2 text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="min-h-11 rounded-md px-4 text-sm font-semibold text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                disabled={saving}
                onClick={() => setAction(null)}
              >
                Volver
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:bg-slate-300"
                disabled={saving}
                onClick={() => void submitAction()}
              >
                {saving ? "Guardando…" : action.title}
              </button>
            </div>
          </section>
        ) : error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <section aria-labelledby="cita-agreements-title">
          <h3
            id="cita-agreements-title"
            className="text-sm font-semibold text-slate-950"
          >
            Acuerdos
          </h3>
          {item.acuerdos.length ? (
            <ul className="mt-3 space-y-2">
              {item.acuerdos.map((agreement) => (
                <li
                  key={agreement.id_movimiento}
                  className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-200"
                >
                  <p className="whitespace-pre-wrap leading-6">
                    {agreement.texto}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-800">
                    {agreement.actor} · {formatDateTime(agreement.creado_en)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Aún no se han registrado acuerdos.
            </p>
          )}
        </section>

        <section aria-labelledby="cita-history-title">
          <h3
            id="cita-history-title"
            className="text-sm font-semibold text-slate-950"
          >
            Historial
          </h3>
          {item.historial.length ? (
            <ol className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
              {item.historial.map((movement) => (
                <li key={movement.id_movimiento} className="relative">
                  <span
                    className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-slate-900">
                    {actionLabel(movement.accion, isSection)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {movement.actor?.nombre ?? "Actor histórico"} ·{" "}
                    {formatDateTime(movement.creado_en)}
                  </p>
                  {movement.fecha_nueva ? (
                    <p className="mt-1 text-sm text-slate-700">
                      {movement.fecha_anterior
                        ? `${formatDate(movement.fecha_anterior)} → `
                        : ""}
                      {formatDate(movement.fecha_nueva)}
                      {movement.hora_inicio_nueva
                        ? ` · ${movement.hora_inicio_nueva}–${movement.hora_fin_nueva}`
                        : ""}
                    </p>
                  ) : null}
                  {movement.comentario ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {movement.comentario}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Clock3 size={16} aria-hidden="true" />
              Registro histórico anterior a la trazabilidad V1.
            </p>
          )}
        </section>
      </div>
    </AccessibleDialog>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.045em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}
