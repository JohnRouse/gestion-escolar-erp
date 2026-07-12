import {
  Briefcase,
  Eye,
  Mail,
  Phone,
} from 'lucide-react';
import PersonAvatar from '../PersonAvatar';
import { communityPersonName } from './CommunityLinkedPeople';

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
  const nombre = communityPersonName(alumno.persona);
  const estadoMatricula = ultimaMatricula?.estado_matricula;

  return (
    <div className="carbon-list-row group grid items-center gap-6 px-5 py-4 transition-colors xl:grid-cols-[minmax(0,1.9fr)_minmax(260px,1.1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        {alumno.avatar_url ? (
          <img
            src={assetUrl(alumno.avatar_url)}
            alt={nombre}
            className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover ring-1 ring-slate-200"
          />
        ) : (
          <PersonAvatar
            persona={alumno.persona}
            size="md"
            rounded="xl"
          />
        )}

        <div className="min-w-0">
          <p className="community-person-name text-sm font-semibold text-slate-950">
            {nombre}
          </p>

          <p className="community-id-line mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-600">
            <span className="erp-compact-code">
              {getCodigo(alumno)}
            </span>

            <span aria-hidden="true">·</span>

            <span>DNI {alumno.persona.dni || '—'}</span>

            {alumno.persona.distrito && (
              <>
                <span aria-hidden="true">·</span>
                <span>{alumno.persona.distrito}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        {ultimaMatricula ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {ultimaMatricula.seccion?.grado?.nombre_grado ||
                  'Grado'}{' '}
                &quot;{ultimaMatricula.seccion?.letra || '-'}&quot;
              </p>

              <span
                className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${getEstadoBadge(
                  estadoMatricula,
                )}`}
              >
                {estadoMatricula || '—'}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-600">
              {ultimaMatricula?.colegio?.nombre || '—'}
            </p>
          </>
        ) : (
          <span className="text-xs text-slate-600">
            Sin matrícula visible
          </span>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpen(alumno.id_persona)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <Eye size={15} />
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
    <div className="carbon-list-row group grid items-center gap-6 px-5 py-4 transition-colors xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1.2fr)_minmax(120px,0.45fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar
          persona={apoderado.persona}
          size="md"
          rounded="xl"
        />

        <div className="min-w-0">
          <p className="community-person-name text-sm font-semibold text-slate-950">
            {nombre}
          </p>

          <p className="community-id-line mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-600">
            <span className="erp-compact-code">
              DNI {apoderado.persona.dni || '—'}
            </span>

            <span aria-hidden="true">·</span>

            {apoderado.persona.telefono ? (
              <>
                <Phone size={12} className="shrink-0" />
                <span>{apoderado.persona.telefono}</span>
              </>
            ) : (
              <span>Sin teléfono</span>
            )}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Briefcase
            size={14}
            className="shrink-0 text-slate-500"
          />

          <p className="text-sm font-semibold text-slate-900">
            {apoderado.ocupacion || 'Sin ocupación'}
          </p>
        </div>

        {apoderado.persona.correo ? (
          <p className="mt-1 flex items-start gap-1.5 break-all text-xs text-slate-600">
            <Mail
              size={12}
              className="mt-0.5 shrink-0"
            />
            {apoderado.persona.correo}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-600">
            Sin correo registrado
          </p>
        )}
      </div>

      <div>
        <span
          className={`inline-flex min-h-8 items-center rounded-md px-3 py-1 text-xs font-semibold ring-1 ${estadoClass(
            apoderado,
          )}`}
        >
          {estadoLabel(apoderado)}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onOpen(apoderado.id_persona)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
        >
          <Eye size={15} />
          Ver
        </button>
      </div>
    </div>
  );
}
