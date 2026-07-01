import { Briefcase, Eye, Mail, Phone } from 'lucide-react';
import PersonAvatar from '../PersonAvatar';
import {
  LinkedGuardiansCompact,
  LinkedStudentsCompact,
  communityPersonName,
} from './CommunityLinkedPeople';

type PersonaResumen = {
  dni?: string | null;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  telefono?: string | null;
  correo?: string | null;
  distrito?: string | null;
};

type StudentRowProps = {
  alumno: {
    id_persona: number;
    avatar_url?: string | null;
    persona: PersonaResumen;
    matriculas?: any[];
    apoderados?: any[];
  };
  onOpen: (id: number) => void;
  getCodigo: (alumno: any) => string;
  getEstadoBadge: (estado?: string) => string;
  assetUrl: (url?: string | null) => string;
};

type GuardianRowProps = {
  apoderado: {
    id_persona: number;
    ocupacion?: string | null;
    persona: PersonaResumen;
    estudiantes?: any[];
  };
  onOpen: (id: number) => void;
  estadoClass: (apoderado: any) => string;
  estadoLabel: (apoderado: any) => string;
};

export function StudentTableRow({
  alumno,
  onOpen,
  getCodigo,
  getEstadoBadge,
  assetUrl,
}: StudentRowProps) {
  const ultimaMatricula = alumno.matriculas?.[0];
  const apoderadosList = alumno.apoderados || [];
  const nombre = communityPersonName(alumno.persona);
  const estadoMatricula = ultimaMatricula?.estado_matricula;

  return (
    <div
      className="carbon-list-row group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 xl:grid-cols-[2fr_1.4fr_1.4fr_auto]"
    >
      <div className="flex min-w-0 items-center gap-3">
        {alumno.avatar_url ? (
          <img
            src={assetUrl(alumno.avatar_url)}
            alt={nombre}
            className="h-11 w-11 rounded-2xl bg-white object-contain p-0.5 ring-1 ring-slate-200"
          />
        ) : (
          <PersonAvatar persona={alumno.persona} size="md" rounded="2xl" />
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {nombre}
          </p>
          <p className="erp-compact-meta mt-0.5 truncate text-xs text-slate-400">
            <span className="erp-compact-code font-semibold text-slate-500">
              {getCodigo(alumno)}
            </span>
            {' · '}DNI {alumno.persona.dni}
            {alumno.persona.distrito ? ` · ${alumno.persona.distrito}` : ''}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        {ultimaMatricula ? (
          <>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">
                {ultimaMatricula.seccion?.grado?.nombre_grado || 'Grado'}{' '}
                &quot;{ultimaMatricula.seccion?.letra || '-'}&quot;
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getEstadoBadge(estadoMatricula)}`}
              >
                {estadoMatricula || '—'}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {ultimaMatricula?.colegio?.nombre || '—'}
            </p>
          </>
        ) : (
          <span className="text-xs text-slate-400">Sin matrícula visible</span>
        )}
      </div>

      <div className="min-w-0">
        <LinkedGuardiansCompact items={apoderadosList} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpen(alumno.id_persona)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-600"
        >
          <Eye size={13} />
          Ver
        </button>
      </div>
    </div>
  );
}

export function GuardianTableRow({
  apoderado,
  onOpen,
  estadoClass,
  estadoLabel,
}: GuardianRowProps) {
  const nombre = communityPersonName(apoderado.persona);

  return (
    <div
      className="carbon-list-row group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 xl:grid-cols-[1.8fr_1.25fr_1.45fr_0.8fr_auto]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar persona={apoderado.persona} size="md" rounded="2xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{nombre}</p>
          <p className="erp-compact-meta mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
            <span className="erp-compact-code font-semibold text-slate-500">
              DNI {apoderado.persona.dni}
            </span>
            {apoderado.persona.telefono ? (
              <>
                <span className="text-slate-300">·</span>
                <Phone size={10} className="shrink-0" />
                {apoderado.persona.telefono}
              </>
            ) : (
              <>
                <span className="text-slate-300">·</span>
                Sin teléfono
              </>
            )}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Briefcase size={12} className="shrink-0 text-slate-400" />
          <p className="truncate text-sm font-semibold text-slate-700">
            {apoderado.ocupacion || 'Sin ocupación'}
          </p>
        </div>
        {apoderado.persona.correo ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
            <Mail size={10} className="shrink-0" />
            {apoderado.persona.correo}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400">Sin correo</p>
        )}
      </div>

      <div className="min-w-0">
        <LinkedStudentsCompact items={apoderado.estudiantes || []} />
      </div>

      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${estadoClass(apoderado)}`}
        >
          {estadoLabel(apoderado)}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpen(apoderado.id_persona)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-600"
        >
          <Eye size={13} />
          Ver
        </button>
      </div>
    </div>
  );
}
