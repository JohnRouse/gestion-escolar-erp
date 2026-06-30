const ENTITY_LABELS: Record<string, string> = {
  colegio: 'Colegio actual',
  escuela: 'Colegio actual',
  institucion: 'Institución actual',
  institución: 'Institución actual',
  academia: 'Academia actual',
  instituto: 'Instituto actual',
  universidad: 'Universidad actual',
};

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getCurrentInstitutionLabel() {
  const raw = String(
    import.meta.env.VITE_INSTITUTION_KIND ||
    import.meta.env.VITE_ENTITY_KIND ||
    'colegio'
  )
    .trim()
    .toLowerCase();

  return ENTITY_LABELS[raw] || `${capitalize(raw)} actual`;
}

export function normalizeCurrentScopeLabel(label: string) {
  const normalized = String(label || '').trim().toLowerCase();

  if (normalized === 'contexto activo' || normalized === 'contexto actual') {
    return getCurrentInstitutionLabel();
  }

  return label;
}
