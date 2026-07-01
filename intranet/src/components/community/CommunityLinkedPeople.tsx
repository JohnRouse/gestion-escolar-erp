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
  Activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Anulado: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  'Pre-matriculado': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Inactivo: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

function getEstadoBadge(estado?: string | null) {
  return estadoBadge[estado || ''] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
}

export function communityPersonName(persona?: BasicPersona | null) {
  return [
    persona?.nombres,
    persona?.apellido_paterno,
    persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Sin nombre';
}

export function communityStudentCode(estudiante?: LinkedStudent['estudiante'] | null) {
  return estudiante?.codigos_colegio?.[0]?.codigo || estudiante?.codigo_estudiante || 'Sin código';
}

function relationLimitText(total: number, max: number, label: string) {
  const remaining = total - max;
  if (remaining <= 0) return null;

  return `+${remaining} ${label}${remaining === 1 ? '' : 's'} más`;
}

export function LinkedGuardiansCompact({
  items,
  max = 3,
}: {
  items: LinkedGuardian[];
  max?: number;
}) {
  if (!items.length) {
    return <span className="text-xs text-slate-400">Sin apoderados vinculados</span>;
  }

  return (
    <div className="space-y-1.5">
      {items.slice(0, max).map((rel) => {
        const persona = rel.apoderado.persona;
        const nombre = communityPersonName(persona);

        return (
          <div key={rel.apoderado.id_persona} className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">
              {rel.parentesco}: {nombre}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
              <Phone size={11} className="shrink-0" />
              {persona.telefono || 'Sin teléfono'}
            </p>
          </div>
        );
      })}

      {relationLimitText(items.length, max, 'apoderado') && (
        <p className="text-xs font-bold text-slate-400">
          {relationLimitText(items.length, max, 'apoderado')}
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
    return <span className="text-xs text-slate-400">Sin alumnos vinculados</span>;
  }

  return (
    <div className="space-y-1.5">
      {items.slice(0, max).map((rel) => {
        const estudiante = rel.estudiante;
        const nombre = communityPersonName(estudiante.persona);

        return (
          <div key={estudiante.id_persona} className="min-w-0">
            <p className="erp-compact-code truncate text-sm font-semibold text-slate-800">
              {communityStudentCode(estudiante)} · {nombre}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Parentesco: {rel.parentesco}
            </p>
          </div>
        );
      })}

      {relationLimitText(items.length, max, 'alumno') && (
        <p className="text-xs font-bold text-slate-400">
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
    return <p className="text-sm text-slate-400">Sin apoderados vinculados.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((rel) => {
        const persona = rel.apoderado.persona;
        const nombre = communityPersonName(persona);

        return (
          <button
            type="button"
            key={rel.apoderado.id_persona}
            onClick={() =>
              onSelect({
                id: rel.apoderado.id_persona,
                nombre,
              })
            }
            className="group flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-blue-200 hover:shadow-sm"
          >
            <PersonAvatar persona={persona} size="sm" rounded="xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                Apoderado: {nombre}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Parentesco registrado: {rel.parentesco}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                DNI: {persona.dni || '—'} · {persona.telefono || 'Sin teléfono'}
              </p>
              {persona.correo && (
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {persona.correo}
                </p>
              )}
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-600 opacity-0 transition group-hover:opacity-100">
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
  onSelect: (target: LinkedPersonTarget) => void;
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-400">Sin alumnos vinculados.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((rel) => {
        const estudiante = rel.estudiante;
        const nombre = communityPersonName(estudiante.persona);
        const matricula = estudiante.matriculas?.[0];
        const estadoMatricula = matricula?.estado_matricula;
        const seccion = matricula?.seccion;
        const salon = seccion?.grado
          ? `${seccion.grado.nombre_grado} "${seccion.letra}" · ${seccion.grado.nivel?.nombre_nivel || ''}`.trim()
          : 'Sin sección activa';

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
            className="group flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-blue-200 hover:shadow-sm"
          >
            <PersonAvatar persona={estudiante.persona} size="sm" rounded="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-900">
                  Alumno: {nombre}
                </p>
                {estadoMatricula && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEstadoBadge(estadoMatricula)}`}
                  >
                    {estadoMatricula}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Parentesco registrado: {rel.parentesco}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {communityStudentCode(estudiante)} · DNI {estudiante.persona.dni || '—'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {salon}
              </p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-600 opacity-0 transition group-hover:opacity-100">
                Ver ficha del alumno
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
