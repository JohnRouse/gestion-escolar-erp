type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function legacyPortalComunicadosTarget(values: SearchParamsRecord) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  });
  const suffix = query.toString();
  return `/dashboard/comunicados${suffix ? `?${suffix}` : ''}`;
}
