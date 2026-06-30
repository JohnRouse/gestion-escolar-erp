type PlainObject = Record<string, any>;

const TITLE_CASE_FIELDS = new Set([
  'nombres',
  'apellido_paterno',
  'apellido_materno',
  'direccion',
  'pais',
  'departamento',
  'provincia',
  'distrito',
  'ocupacion',
  'colegio_procedencia',
  'grado_procedencia',
]);

const UPPER_CASE_FIELDS = new Set([
  'dni',
  'codigo_modular_procedencia',
]);

const LOWER_CASE_FIELDS = new Set([
  'correo',
  'email',
]);

function cleanSpaces(value: string) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeToken(token: string) {
  if (!token) return token;

  const lower = token.toLocaleLowerCase('es-PE');

  return lower.replace(/(^|[\s'’´`-])([\p{L}])/gu, (_match, prefix, letter) => {
    return `${prefix}${String(letter).toLocaleUpperCase('es-PE')}`;
  });
}

export function toTitleCaseEs(value?: string | null) {
  const clean = cleanSpaces(String(value || ''));

  if (!clean) return null;

  return clean
    .split(' ')
    .map((word) => capitalizeToken(word))
    .join(' ');
}

export function normalizeEmail(value?: string | null) {
  const clean = cleanSpaces(String(value || ''));

  return clean ? clean.toLocaleLowerCase('es-PE') : null;
}

export function normalizeUpper(value?: string | null) {
  const clean = cleanSpaces(String(value || ''));

  return clean ? clean.toLocaleUpperCase('es-PE') : null;
}

export function normalizeNullableText(value?: string | null) {
  const clean = cleanSpaces(String(value || ''));

  return clean || null;
}

export function normalizePersonaInput<T extends PlainObject>(input: T): T {
  if (!input || typeof input !== 'object') return input;

  const output: PlainObject = { ...input };

  for (const key of Object.keys(output)) {
    const value = output[key];

    if (value === undefined || value === null) continue;

    if (TITLE_CASE_FIELDS.has(key)) {
      output[key] = toTitleCaseEs(value);
      continue;
    }

    if (LOWER_CASE_FIELDS.has(key)) {
      output[key] = normalizeEmail(value);
      continue;
    }

    if (UPPER_CASE_FIELDS.has(key)) {
      output[key] = normalizeUpper(value);
      continue;
    }

    if (typeof value === 'string') {
      output[key] = cleanSpaces(value);
    }
  }

  return output as T;
}

export function normalizePersonaDataForDb<T extends PlainObject>(data: T): T {
  return normalizePersonaInput(data);
}
