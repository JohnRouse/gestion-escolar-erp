import {
  useEffect,
  useState,
} from 'react';
import {
  Building2,
  Globe2,
  School,
} from 'lucide-react';
import { assetUrl } from '../utils/assets';

type InstitutionMarkKind =
  | 'group'
  | 'all'
  | 'school';

type InstitutionMarkColegio = {
  nombre?: string | null;
  logo_url?: string | null;
  color_principal?: string | null;
};

type InstitutionMarkProps = {
  kind: InstitutionMarkKind;
  colegio?: InstitutionMarkColegio | null;
  logoUrl?: string | null;
  label?: string | null;
  compact?: boolean;
};

export default function InstitutionMark({
  kind,
  colegio,
  logoUrl,
  label,
  compact = false,
}: InstitutionMarkProps) {
  const [logoFailed, setLogoFailed] =
    useState(false);

  const resolvedLogo =
    kind === 'school'
      ? colegio?.logo_url
      : kind === 'group'
        ? logoUrl
        : null;

  const logoSrc = assetUrl(
    resolvedLogo || '',
  );

  const showLogo = Boolean(
    logoSrc && !logoFailed,
  );

  useEffect(() => {
    setLogoFailed(false);
  }, [logoSrc]);

  const Icon =
    kind === 'all'
      ? Globe2
      : kind === 'group'
        ? Building2
        : School;

  const iconLabel =
    colegio?.nombre ||
    label ||
    (kind === 'all'
      ? 'Todas las instituciones'
      : kind === 'group'
        ? 'Grupo educativo'
        : 'Institución educativa');

  return (
    <span
      className={[
        'school-mark',
        'institution-mark',
        `institution-mark--${kind}`,
        compact
          ? 'institution-mark--compact'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <span className="institution-mark__inner">
        {showLogo ? (
          <img
            src={logoSrc}
            alt={iconLabel}
            className="institution-mark__image"
            onError={() =>
              setLogoFailed(true)
            }
          />
        ) : (
          <Icon
            className="institution-mark__icon"
            size={compact ? 18 : 20}
            strokeWidth={2}
          />
        )}
      </span>
    </span>
  );
}
