import { Phone } from 'lucide-react';
import PersonAvatar from '../PersonAvatar';

type BasicPersona = {
  dni?: string | null;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

type CodigoColegio = {
  id_colegio: number;
  codigo: string;
};

type LinkedGuardian = {
  parentesco: string;
  apoderado: {
    id_persona: number;
    persona: BasicPersona;
  };
};

type LinkedStudent = {
  parentesco: string;
  estudiante: {
    id_persona: number;
    avatar_url?: string | null;
    codigo_estudiante?: string | null;
    codigos_colegio?: CodigoColegio[];
    persona: BasicPersona;
    matriculas?: any[];
  };
};

export type LinkedPersonTarget = {
  id: number;
  nombre: string;
};

const estadoBadge: Record<string, string> = {
  Activo:
    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Reserva:
    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Anulado:
    'bg-red-50 text-red-600 ring-1 ring-red-200',
  'Pre-matriculado':
    'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Inactivo:
    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

function getEstadoBadge(estado?: string | null) {
  return (
    estadoBadge[estado || ''] ||
    'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  );
}

function communityAssetUrl(url?: string | null) {
  if (!url) return '';

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith('/api/')) {
    return url;
  }

  if (url.startsWith('/uploads/')) {
    return `/api${url}`;
  }

  if (url.startsWith('uploads/')) {
    return `/api/${url}`;
  }

  return url;
}

export function communityPersonName(
  persona?: BasicPersona | null,
) {
  return (
    [
      persona?.nombres,
      persona?.apellido_paterno,
      persona?.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Sin nombre'
  );
}

export function communityStudentCode(
  estudiante?: LinkedStudent['estudiante'] | null,
) {
  return (
    estudiante?.codigos_colegio?.[0]?.codigo ||
    estudiante?.codigo_estudiante ||
    'Sin código'
  );
}

function relationLimitText(
  total: number,
  max: number,
  label: string,
) {
  const remaining = total - max;

  if (remaining <= 0) return null;

  return `+${remaining} ${label}${
    remaining === 1 ? '' : 's'
  } más`;
}

export function LinkedGuardiansCompact({
  items,
  max = 3,
}: {
  items: LinkedGuardian[];
  max?: number;
}) {
  if (!items.length) {
    return (
      <span className="text-xs text-slate-500">
        Sin apoderados vinculados
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, max).map((relation) => {
        const persona = relation.apoderado.persona;
        const nombre = communityPersonName(persona);

        return (
          <div
            key={relation.apoderado.id_persona}
            className="min-w-0"
          >
            <p className="truncate text-sm font-semibold text-slate-800">
              {relation.parentesco}: {nombre}
            </p>

            <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
              <Phone size={12} className="shrink-0" />
              {persona.telefono || 'Sin teléfono'}
            </p>
          </div>
        );
      })}

      {relationLimitText(
        items.length,
        max,
        'apoderado',
      ) && (
        <p className="text-xs font-semibold text-slate-600">
          {relationLimitText(
            items.length,
            max,
            'apoderado',
          )}
        </p>
      )}
    </div>
  );
}

export function LinkedStudentsCompact({
  items,
  max = 3,
}: {
  items: LinkedStudent[];
  max?: number;
}) {
  if (!items.length) {
    return (
      <span className="text-xs text-slate-500">
        Sin alumnos vinculados
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, max).map((relation) => {
        const estudiante = relation.estudiante;
        const nombre = communityPersonName(
          estudiante.persona,
        );

        return (
          <div
            key={estudiante.id_persona}
            className="min-w-0"
          >
            <p className="truncate text-sm font-semibold text-slate-800">
              {communityStudentCode(estudiante)} · {nombre}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Parentesco: {relation.parentesco}
            </p>
          </div>
        );
      })}

      {relationLimitText(items.length, max, 'alumno') && (
        <p className="text-xs font-semibold text-slate-600">
          {relationLimitText(items.length, max, 'alumno')}
        </p>
      )}
    </div>
  );
}

export function LinkedGuardianCards({
  items,
  onSelect,
}: {
  items: LinkedGuardian[];
  onSelect: (target: LinkedPersonTarget) => void;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-slate-600">
        Sin apoderados vinculados.
      </p>
    );
  }

  return (
    <div className="community-linked-people">
      {items.map((relation) => {
        const persona = relation.apoderado.persona;
        const nombre = communityPersonName(persona);

        return (
          <button
            type="button"
            key={relation.apoderado.id_persona}
            onClick={() =>
              onSelect({
                id: relation.apoderado.id_persona,
                nombre,
              })
            }
            className="community-linked-person-card group flex min-h-[112px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
          >
            <PersonAvatar
              persona={persona}
              size="md"
              rounded="xl"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-slate-950">
                {nombre}
              </p>

              <p className="mt-1 text-xs font-medium text-slate-700">
                {relation.parentesco}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                DNI {persona.dni || '—'}
                {' · '}
                {persona.telefono || 'Sin teléfono'}
              </p>

              {persona.correo && (
                <p className="mt-0.5 break-all text-xs leading-5 text-slate-600">
                  {persona.correo}
                </p>
              )}

              <p className="mt-2 text-xs font-semibold text-blue-700">
                Ver ficha del apoderado
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function LinkedStudentCards({
  items,
  onSelect,
}: {
  items: LinkedStudent[];
  onSelect: (
    target: LinkedPersonTarget,
  ) => void;
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-slate-600">
        Sin alumnos vinculados.
      </p>
    );
  }

  return (
    <div className="community-linked-students-grid">
      {items.map((relation) => {
        const estudiante =
          relation.estudiante;

        const nombre =
          communityPersonName(
            estudiante.persona,
          );

        const matricula =
          estudiante.matriculas?.[0];

        const estadoMatricula =
          matricula?.estado_matricula;

        const seccion =
          matricula?.seccion;

        const salon =
          seccion?.grado
            ? `${seccion.grado.nombre_grado} "${seccion.letra}"${
                seccion.grado.nivel?.nombre_nivel
                  ? ` · ${seccion.grado.nivel.nombre_nivel}`
                  : ''
              }`
            : 'Sin sección activa';

        const colegio =
          matricula?.colegio?.nombre
          || null;

        return (
          <button
            type="button"
            key={estudiante.id_persona}
            onClick={() =>
              onSelect({
                id: estudiante.id_persona,
                nombre,
              })
            }
            className="community-linked-student-card"
          >
            <span className="community-linked-student-main">
              {estudiante.avatar_url ? (
                <span className="community-linked-student-photo-frame">
                  <img
                    src={communityAssetUrl(
                      estudiante.avatar_url,
                    )}
                    alt={nombre}
                    className="community-linked-student-photo"
                  />
                </span>
              ) : (
                <PersonAvatar
                  persona={estudiante.persona}
                  size="md"
                  rounded="xl"
                />
              )}

              <span className="min-w-0 flex-1">
                <span className="community-linked-student-heading">
                  <span className="community-linked-student-name">
                    {nombre}
                  </span>

                  {estadoMatricula && (
                    <span
                      className={`community-linked-student-status ${getEstadoBadge(
                        estadoMatricula,
                      )}`}
                    >
                      {estadoMatricula}
                    </span>
                  )}
                </span>

                <span className="community-linked-relation">
                  {relation.parentesco}
                </span>

                <span className="community-linked-student-meta">
                  {communityStudentCode(
                    estudiante,
                  )}
                  {' · '}
                  DNI {estudiante.persona.dni || '—'}
                </span>

                <span className="community-linked-student-room">
                  {salon}
                </span>

                {colegio && (
                  <span className="community-linked-student-school">
                    {colegio}
                  </span>
                )}
              </span>
            </span>

            <span className="community-linked-student-link">
              Ver ficha del alumno
            </span>
          </button>
        );
      })}
    </div>
  );
}
