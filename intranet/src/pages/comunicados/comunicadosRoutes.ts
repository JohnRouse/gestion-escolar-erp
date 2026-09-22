export function legacyComunicadosTarget(search = '') {
  if (!search) return '/comunicados';
  return `/comunicados${search.startsWith('?') ? search : `?${search}`}`;
}
