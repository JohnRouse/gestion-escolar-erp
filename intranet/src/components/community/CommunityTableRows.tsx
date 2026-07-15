import {
  Briefcase,
  Eye,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import PersonAvatar from '../PersonAvatar';
import {
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
  const ultimaMatricula =
    alumno.matriculas?.[0];

  const nombre =
    communityPersonName(
      alumno.persona,
    );

  const codigo =
    getCodigo(alumno);

  const distrito =
    alumno.persona.distrito
    || 'Sin distrito';

  const grado =
    ultimaMatricula
      ?.seccion
      ?.grado
      ?.nombre_grado
    || null;

  const nivel =
    ultimaMatricula
      ?.seccion
      ?.grado
      ?.nivel
      ?.nombre_nivel
    || null;

  const seccion =
    ultimaMatricula
      ?.seccion
      ?.letra
    || null;

  const colegio =
    ultimaMatricula
      ?.colegio
      ?.nombre
    || 'Sin institución';

  const estadoMatricula =
    ultimaMatricula
      ?.estado_matricula
    || 'Sin matrícula';

  return (
    <div className="carbon-list-row community-student-row community-student-table-grid group px-5 py-4">
      <div className="community-code-cell">
        <span className="erp-compact-code">
          {codigo}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {alumno.avatar_url ? (
          <span className="community-student-photo-frame">
            <img
              src={assetUrl(
                alumno.avatar_url,
              )}
              alt={nombre}
              className="community-student-list-photo"
            />
          </span>
        ) : (
          <PersonAvatar
            persona={alumno.persona}
            size="md"
            rounded="xl"
          />
        )}

        <div className="min-w-0">
          <p className="community-person-name truncate text-sm font-bold text-slate-950">
            {nombre}
          </p>

          <p className="community-id-line mt-1 text-xs text-slate-600">
            DNI {alumno.persona.dni || '—'}
          </p>
        </div>
      </div>

      <div className="community-location-cell">
        <MapPin
          size={14}
          className="shrink-0 text-slate-400"
        />

        <span>
          {distrito}
        </span>
      </div>

      <div className="min-w-0">
        {ultimaMatricula ? (
          <>
            <p className="text-sm font-bold text-slate-900">
              {grado || 'Grado'}{' '}
              &quot;{seccion || '-'}&quot;
            </p>

            <p className="mt-1 text-xs font-medium text-slate-600">
              {nivel || 'Sin nivel'}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">
              Sin grado asignado
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Sin sección visible
            </p>
          </>
        )}
      </div>

      <div className="min-w-0">
        <p className="community-school-name text-sm font-semibold text-slate-900">
          {colegio}
        </p>
      </div>

      <div>
        <span
          className={`inline-flex min-h-8 items-center rounded-md px-3 py-1 text-xs font-semibold ${getEstadoBadge(
            estadoMatricula,
          )}`}
        >
          {estadoMatricula}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            onOpen(
              alumno.id_persona,
            )
          }
          className="community-view-action inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <Eye size={14} />
          Ver detalles
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
  const nombre =
    communityPersonName(
      apoderado.persona,
    );

  return (
    <div className="carbon-list-row community-guardian-row group grid items-center gap-5 px-5 py-4 transition-colors xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1.2fr)_minmax(120px,0.45fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar
          persona={apoderado.persona}
          size="md"
          rounded="xl"
        />

        <div className="min-w-0">
          <p className="community-person-name truncate text-sm font-bold text-slate-950">
            {nombre}
          </p>

          <p className="community-id-line mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-600">
            <span className="erp-compact-code">
              DNI {apoderado.persona.dni || '—'}
            </span>

            <span aria-hidden="true">
              ·
            </span>

            {apoderado.persona.telefono ? (
              <>
                <Phone
                  size={12}
                  className="shrink-0"
                />

                <span>
                  {apoderado.persona.telefono}
                </span>
              </>
            ) : (
              <span>
                Sin teléfono
              </span>
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
            {apoderado.ocupacion
              || 'Sin ocupación'}
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
          {estadoLabel(
            apoderado,
          )}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            onOpen(
              apoderado.id_persona,
            )
          }
          className="community-view-action inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <Eye size={14} />
          Ver detalles
        </button>
      </div>
    </div>
  );
}
