import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Search, UsersRound } from "lucide-react";
import AccessibleDialog from "../../components/AccessibleDialog";
import {
  citaError,
  type CitaCreatePayload,
  type CitaParticipant,
  type CitaRecipient,
  type CitaSection,
  type CitaTipo,
  type citasApi,
} from "./citasApi";

type Api = ReturnType<typeof citasApi>;

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 motion-reduce:transition-none";

function today() {
  const current = new Date();
  const offset = current.getTimezoneOffset() * 60_000;
  return new Date(current.getTime() - offset).toISOString().slice(0, 10);
}

export default function CitaForm({
  api,
  showSchool,
  allowIndividual,
  onClose,
  onSaved,
}: {
  api: Api;
  showSchool: boolean;
  allowIndividual: boolean;
  onClose: () => void;
  onSaved: (item: Awaited<ReturnType<Api["create"]>>) => void;
}) {
  const typeFocus = useRef<HTMLInputElement | null>(null);
  const [tipo, setTipo] = useState<CitaTipo>(
    allowIndividual ? "individual" : "seccion",
  );
  const [participants, setParticipants] = useState<CitaParticipant[]>([]);
  const [sections, setSections] = useState<CitaSection[]>([]);
  const [recipients, setRecipients] = useState<CitaRecipient[]>([]);
  const [participantKey, setParticipantKey] = useState("");
  const [parentId, setParentId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [search, setSearch] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  const selectedParticipant = participants.find(
    (item) => String(item.id_matricula) === participantKey,
  );
  const selectedParent = selectedParticipant?.apoderados.find(
    (item) => item.id_apoderado === Number(parentId),
  );
  const selectedSection = sections.find(
    (item) => item.id_seccion === Number(sectionId),
  );
  const selectedRecipient = recipients.find(
    (item) => item.key === recipientKey,
  );
  const schoolOptions = useMemo(
    () =>
      Array.from(
        new Map(
          sections.map((section) => [
            section.id_colegio,
            { id: section.id_colegio, nombre: section.colegio },
          ]),
        ).values(),
      ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [sections],
  );
  const visibleSections =
    showSchool && schoolId
      ? sections.filter((section) => section.id_colegio === Number(schoolId))
      : sections;

  useEffect(() => {
    if (tipo !== "individual") return;
    const term = search.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSearch(true);
      setSearchError("");
      api
        .participants(term, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setParticipants(data);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted)
            setSearchError(citaError(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingSearch(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, search, tipo]);

  useEffect(() => {
    if (tipo !== "seccion" || sections.length) return;
    let active = true;
    api
      .sections()
      .then((data) => active && setSections(data))
      .catch((requestError) => active && setError(citaError(requestError)))
      .finally(() => active && setLoadingSections(false));
    return () => {
      active = false;
    };
  }, [api, sections.length, tipo]);

  useEffect(() => {
    const target =
      tipo === "individual"
        ? selectedParticipant?.id_matricula
        : selectedSection?.id_seccion;
    if (!target) return;
    let active = true;
    const request =
      tipo === "individual"
        ? api.recipients(target)
        : api.sectionResponsibles(target);
    request
      .then((data) => active && setRecipients(data))
      .catch((requestError) => active && setError(citaError(requestError)))
      .finally(() => active && setLoadingRecipients(false));
    return () => {
      active = false;
    };
  }, [api, selectedParticipant, selectedSection, tipo]);

  const canSave = Boolean(
    (tipo === "individual" ? selectedParticipant : selectedSection) &&
    (tipo !== "individual" || selectedParent) &&
    selectedRecipient &&
    fecha &&
    horaInicio &&
    horaFin &&
    horaInicio < horaFin &&
    motivo.trim().length >= 3,
  );

  function changeType(nextType: CitaTipo) {
    if (nextType === "individual" && !allowIndividual) return;
    setTipo(nextType);
    setParticipantKey("");
    setParentId("");
    setSectionId("");
    setSchoolId("");
    setRecipientKey("");
    setRecipients([]);
    setLoadingRecipients(false);
    if (nextType === "seccion" && !sections.length) setLoadingSections(true);
    setError("");
  }

  async function submit() {
    if (!selectedRecipient || !canSave) {
      setError(
        tipo === "individual"
          ? "Completa estudiante, apoderado participante, responsable, fecha, horario y motivo."
          : "Completa sección, responsable, fecha, horario y asunto.",
      );
      return;
    }
    let payload: CitaCreatePayload;
    const common = {
      tipo_destinatario: selectedRecipient.tipo,
      id_destinatario: selectedRecipient.id_destinatario,
      contexto_destinatario: selectedRecipient.contexto,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: motivo.trim(),
    } as const;
    if (tipo === "individual" && selectedParticipant && selectedParent) {
      payload = {
        ...common,
        tipo: "individual",
        id_colegio: selectedParticipant.id_colegio,
        id_matricula: selectedParticipant.id_matricula,
        id_apoderado: selectedParent.id_apoderado,
      };
    } else if (tipo === "seccion" && selectedSection) {
      payload = {
        ...common,
        tipo: "seccion",
        id_colegio: selectedSection.id_colegio,
        id_seccion: selectedSection.id_seccion,
      };
    } else {
      setError("Selecciona la audiencia de la agenda.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      onSaved(await api.create(payload));
    } catch (requestError) {
      setError(citaError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccessibleDialog
      open
      title="Nueva cita"
      eyebrow="Agenda institucional"
      description="Registra una cita familiar o una reunión colectiva sin salir de la agenda."
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <CalendarPlus size={21} aria-hidden="true" />
        </span>
      }
      initialFocusRef={typeFocus}
      maxWidthClassName="max-w-3xl"
      preventClose={saving}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 motion-reduce:transition-none"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 motion-reduce:transition-none"
            disabled={!canSave || saving}
            onClick={() => void submit()}
          >
            {saving
              ? "Guardando…"
              : tipo === "individual"
                ? "Guardar cita"
                : "Guardar reunión"}
          </button>
        </div>
      }
    >
      <div className="space-y-6 p-5 sm:p-6">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-950">
            Tipo de agenda
          </legend>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Elige si convocas a una familia o a toda una sección.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                [
                  "individual",
                  "Cita individual",
                  "Estudiante y apoderado vinculados",
                ],
                [
                  "seccion",
                  "Reunión de sección",
                  "Familias de matrículas activas",
                ],
              ] as const
            ).map(([value, label, help]) => {
              const disabled = value === "individual" && !allowIndividual;
              const initialType = allowIndividual ? "individual" : "seccion";
              return (
                <label
                  key={value}
                  className={`flex min-h-16 items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 motion-reduce:transition-none ${
                    disabled
                      ? "cursor-not-allowed opacity-65"
                      : "cursor-pointer"
                  } ${
                    tipo === value
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <input
                    ref={value === initialType ? typeFocus : undefined}
                    type="radio"
                    name="tipo-agenda"
                    value={value}
                    checked={tipo === value}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                    onChange={() => changeType(value)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600">
                      {disabled ? "Disponible para gestión autorizada" : help}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {tipo === "individual" ? (
          <section aria-labelledby="cita-family-title">
            <h3
              id="cita-family-title"
              className="text-sm font-semibold text-slate-950"
            >
              Familia y estudiante
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Busca por nombre, apellido, DNI, código de matrícula o código de
              estudiante.
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Buscar estudiante o apoderado
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
                  value={search}
                  placeholder="Ej.: Santiago Pérez, DNI o SMV-2027-0004"
                  autoComplete="off"
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearch(value);
                    setParticipantKey("");
                    setParentId("");
                    setRecipientKey("");
                    setRecipients([]);
                    setLoadingRecipients(false);
                    if (value.trim().length < 2) {
                      setParticipants([]);
                      setLoadingSearch(false);
                      setSearchError("");
                    }
                  }}
                />
              </span>
            </label>
            <div className="mt-3" aria-live="polite" aria-busy={loadingSearch}>
              {search.trim().length < 2 ? (
                <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                  Escribe al menos 2 caracteres para buscar. No se cargan
                  alumnos al abrir.
                </p>
              ) : loadingSearch ? (
                <p className="rounded-md bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                  Buscando familias…
                </p>
              ) : searchError ? (
                <p
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {searchError}
                </p>
              ) : participants.length ? (
                <ul
                  className="max-h-64 space-y-2 overflow-y-auto pr-1"
                  aria-label="Estudiantes encontrados"
                >
                  {participants.map((item) => {
                    const key = String(item.id_matricula);
                    const selected = key === participantKey;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                            selected
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                          }`}
                          onClick={() => {
                            setParticipantKey(key);
                            setParentId(
                              item.apoderado_coincidente
                                ? String(item.apoderado_coincidente)
                                : item.apoderados.length === 1
                                  ? String(item.apoderados[0].id_apoderado)
                                  : "",
                            );
                            setRecipients([]);
                            setRecipientKey("");
                            setLoadingRecipients(true);
                            setError("");
                          }}
                        >
                          <span className="block text-sm font-semibold text-slate-950">
                            {item.estudiante.nombre}
                          </span>
                          <span className="mt-0.5 block text-sm text-slate-600">
                            {item.estudiante.seccion}
                            {showSchool ? ` · ${item.colegio}` : ""}
                          </span>
                          <span className="mt-1 block break-words text-xs text-slate-500">
                            {item.codigo_matricula ?? item.estudiante.codigo}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                  role="status"
                >
                  <p className="font-semibold text-slate-900">
                    No hay coincidencias reales
                  </p>
                  <p className="mt-1">
                    Prueba con parte del nombre, DNI o código de matrícula.
                  </p>
                </div>
              )}
            </div>
            {selectedParticipant ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Apoderado participante <span aria-hidden="true">*</span>
                </span>
                <select
                  className={inputClass}
                  value={parentId}
                  onChange={(event) => {
                    setParentId(event.target.value);
                    setError("");
                  }}
                  required
                >
                  <option value="">Seleccionar apoderado participante</option>
                  {selectedParticipant.apoderados.map((item) => (
                    <option key={item.id_apoderado} value={item.id_apoderado}>
                      {item.nombre}
                      {item.parentesco ? ` — ${item.parentesco}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>
        ) : (
          <section aria-labelledby="cita-section-title">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-blue-700">
                <UsersRound size={19} aria-hidden="true" />
              </span>
              <div>
                <h3
                  id="cita-section-title"
                  className="text-sm font-semibold text-slate-950"
                >
                  Sección convocada
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  La audiencia se deriva de sus matrículas activas y vínculos de
                  apoderados.
                </p>
              </div>
            </div>
            {showSchool ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Institución
                </span>
                <select
                  className={inputClass}
                  value={schoolId}
                  disabled={loadingSections}
                  onChange={(event) => {
                    setSchoolId(event.target.value);
                    setSectionId("");
                    setRecipientKey("");
                    setRecipients([]);
                    setLoadingRecipients(false);
                  }}
                >
                  <option value="">Seleccionar institución</option>
                  {schoolOptions.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Sección
              </span>
              <select
                className={inputClass}
                value={sectionId}
                disabled={loadingSections || (showSchool && !schoolId)}
                onChange={(event) => {
                  setSectionId(event.target.value);
                  setRecipientKey("");
                  setRecipients([]);
                  setLoadingRecipients(Boolean(event.target.value));
                  setError("");
                }}
              >
                <option value="">
                  {loadingSections
                    ? "Cargando secciones…"
                    : visibleSections.length
                      ? "Seleccionar sección"
                      : "No hay secciones autorizadas"}
                </option>
                {visibleSections.map((section) => (
                  <option key={section.id_seccion} value={section.id_seccion}>
                    {section.label}
                    {section.relaciones.length
                      ? ` — ${section.relaciones.join(", ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            {!loadingSections && !sections.length ? (
              <p
                className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
                role="status"
              >
                No tienes secciones docentes o de Tutoría disponibles en este
                alcance.
              </p>
            ) : null}
          </section>
        )}

        <section aria-labelledby="cita-responsible-title">
          <h3
            id="cita-responsible-title"
            className="text-sm font-semibold text-slate-950"
          >
            Responsable
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Docente y Tutor conservan su contexto académico; Staff conserva su
            cargo institucional.
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Persona y función
            </span>
            <select
              className={inputClass}
              value={recipientKey}
              disabled={
                !(tipo === "individual"
                  ? selectedParticipant
                  : selectedSection) || loadingRecipients
              }
              onChange={(event) => setRecipientKey(event.target.value)}
            >
              <option value="">
                {loadingRecipients
                  ? "Cargando responsables…"
                  : recipients.length
                    ? "Seleccionar responsable"
                    : "Sin responsables disponibles"}
              </option>
              {recipients.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.nombre} · {item.funcion}
                </option>
              ))}
            </select>
          </label>
          {selectedRecipient ? (
            <p className="mt-2 text-sm text-slate-600">
              Función en esta agenda:{" "}
              <span className="font-semibold text-slate-900">
                {selectedRecipient.funcion}
              </span>
            </p>
          ) : null}
        </section>

        <section aria-labelledby="cita-schedule-title">
          <h3
            id="cita-schedule-title"
            className="text-sm font-semibold text-slate-950"
          >
            Horario
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Se comprobarán otras citas y reuniones activas del responsable.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Fecha
              </span>
              <input
                type="date"
                min={today()}
                className={inputClass}
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
              />
            </label>
            <label className="block">
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
            <label className="block">
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
          {horaInicio && horaFin && horaInicio >= horaFin ? (
            <p className="mt-2 text-sm font-medium text-red-700" role="alert">
              La hora final debe ser posterior a la hora inicial.
            </p>
          ) : null}
          <label className="mt-3 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              {tipo === "individual" ? "Motivo" : "Asunto"}
            </span>
            <textarea
              className={`${inputClass} min-h-24 resize-y py-3`}
              value={motivo}
              maxLength={2000}
              placeholder={
                tipo === "individual"
                  ? "Describe brevemente el motivo de la cita"
                  : "Ej.: Reunión con padres de familia"
              }
              onChange={(event) => setMotivo(event.target.value)}
            />
          </label>
        </section>

        {error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>
    </AccessibleDialog>
  );
}
