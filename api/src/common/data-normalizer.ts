type PlainObject = Record<string, any>;

export const WRITE_OPERATIONS = new Set([
  'create',
  'update',
  'upsert',
  'createMany',
  'updateMany',
]);

const TITLE_CASE_FIELDS = new Set([
  // Personas
  'nombres',
  'apellido_paterno',
  'apellido_materno',
  'nombre_completo',

  // Ubicación
  'direccion',
  'pais',
  'departamento',
  'provincia',
  'distrito',

  // Académico / institucional
  'nombre',
  'nombre_corto',
  'nombre_nivel',
  'nombre_grado',
  'nombre_aula',
  'nombre_area',
  'nombre_curso',
  'nombre_anio',
  'nombre_concepto',
  'nombre_destinatario',
  'nombre_pagador',
  'colegio_procedencia',
  'grado_procedencia',

  // Staff / apoderados
  'ocupacion',
  'cargo',
  'area',

  // Finanzas
  'banco_destino',
  'banco_1',
  'banco_2',

  // Comunicación
  'titulo',
  'categoria',
]);

const UPPER_CASE_FIELDS = new Set([
  'dni',
  'ruc',
  'codigo',
  'codigo_estudiante',
  'codigo_matricula',
  'codigo_modular_procedencia',
  'numero_operacion',
  'referencia_escrita',
  'referencia_pago',
  'cci_1',
  'cci_2',
]);

const LOWER_CASE_FIELDS = new Set([
  'correo',
  'email',
  'username',
]);

const TEXT_BLOCK_FIELDS = new Set([
  'descripcion',
  'observacion',
  'observacion_revision',
  'observacion_procedencia',
  'mensaje',
  'contenido',
  'instrucciones',
  'comentario',
  'texto',
  'motivo',
]);

const CLEAN_ONLY_FIELDS = new Set([
  'telefono',
  'telefono_pagador',
  'numero_yape',
  'numero_plin',
  'cuenta_1',
  'cuenta_2',
  'medio_pago',
  'estado',
  'estado_pago',
  'estado_matricula',
  'tipo',
  'tipo_ingreso',
  'tipo_concepto',
  'tipo_concepto_aplica',
  'tipo_proceso_matricula',
  'parentesco',
  'genero',
  'plan',
  'slug',
]);

const NEVER_NORMALIZE_PARTS = [
  'url',
  'password',
  'hash',
  'token',
  'metadata',
  'json',
  'provider',
  'filename',
  'file',
  'archivo',
  'captura',
  'qr',
  'avatar',
];

const SMALL_WORDS = new Set([
  'a',
  'al',
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'en',
  'y',
  'o',
  'u',
  'por',
  'para',
  'con',
]);

const SPECIAL_WORDS: Record<string, string> = {
  'i.e.p.': 'I.E.P.',
  'iep': 'I.E.P.',
  'i.e.s.': 'I.E.S.',
  'ies': 'I.E.S.',
  'dni': 'DNI',
  'ruc': 'RUC',
  'bcp': 'BCP',
  'bbva': 'BBVA',
  'cci': 'CCI',
  'ugel': 'UGEL',
  'yape': 'Yape',
  'plin': 'Plin',
  'peru': 'Perú',
  'perú': 'Perú',
};

function isPlainObject(value: any) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    value.constructor === Object
  );
}

export function cleanSpaces(value?: string | null) {
  return String(value || '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export function cleanTextBlock(value?: string | null) {
  const clean = String(value || '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return clean || null;
}

function normalizeKey(key?: string | null) {
  return String(key || '').trim().toLowerCase();
}

function shouldNeverNormalize(key: string) {
  const lower = normalizeKey(key);

  return NEVER_NORMALIZE_PARTS.some((part) => lower.includes(part));
}

function normalizeAcronymCandidate(word: string) {
  const raw = word.trim();
  const normalized = raw
    .toLocaleLowerCase('es-PE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (SPECIAL_WORDS[raw.toLocaleLowerCase('es-PE')]) {
    return SPECIAL_WORDS[raw.toLocaleLowerCase('es-PE')];
  }

  if (SPECIAL_WORDS[normalized]) {
    return SPECIAL_WORDS[normalized];
  }

  return null;
}

function capitalizeToken(token: string) {
  if (!token) return token;

  const special = normalizeAcronymCandidate(token);
  if (special) return special;

  const lower = token.toLocaleLowerCase('es-PE');

  return lower.replace(/(^|[\s'’´`-])([\p{L}])/gu, (_match, prefix, letter) => {
    return `${prefix}${String(letter).toLocaleUpperCase('es-PE')}`;
  });
}

export function toTitleCaseEs(value?: string | null) {
  const clean = cleanSpaces(value);

  if (!clean) return null;

  return clean
    .split(' ')
    .map((word, index) => {
      const special = normalizeAcronymCandidate(word);
      if (special) return special;

      const lower = word.toLocaleLowerCase('es-PE');

      if (index > 0 && SMALL_WORDS.has(lower)) {
        return lower;
      }

      return capitalizeToken(word);
    })
    .join(' ');
}

export function normalizeEmail(value?: string | null) {
  const clean = cleanSpaces(value);

  return clean ? clean.toLocaleLowerCase('es-PE') : null;
}

export function normalizeUpper(value?: string | null) {
  const clean = cleanSpaces(value);

  return clean ? clean.toLocaleUpperCase('es-PE') : null;
}

export function normalizeNullableText(value?: string | null) {
  const clean = cleanSpaces(value);

  return clean || null;
}

export function normalizeValueByField(field: string, value: any) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;

  const key = normalizeKey(field);

  if (shouldNeverNormalize(key)) return value;

  if (TEXT_BLOCK_FIELDS.has(key)) return cleanTextBlock(value);
  if (TITLE_CASE_FIELDS.has(key)) return toTitleCaseEs(value);
  if (LOWER_CASE_FIELDS.has(key)) return normalizeEmail(value);
  if (UPPER_CASE_FIELDS.has(key)) return normalizeUpper(value);
  if (CLEAN_ONLY_FIELDS.has(key)) return normalizeNullableText(value);

  return cleanSpaces(value);
}

function normalizeSetOperation(field: string, value: any) {
  if (!isPlainObject(value)) return value;

  if (Object.prototype.hasOwnProperty.call(value, 'set') && typeof value.set === 'string') {
    return {
      ...value,
      set: normalizeValueByField(field, value.set),
    };
  }

  return value;
}

export function normalizeDataObject<T extends PlainObject>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => normalizeDataObject(item)) as any;
  }

  const output: PlainObject = { ...data };

  for (const key of Object.keys(output)) {
    const value = output[key];

    if (value === undefined || value === null) continue;

    if (typeof value === 'string') {
      output[key] = normalizeValueByField(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      output[key] = value.map((item) => isPlainObject(item) ? normalizeDataObject(item) : item);
      continue;
    }

    if (!isPlainObject(value)) continue;

    if (Object.prototype.hasOwnProperty.call(value, 'set')) {
      output[key] = normalizeSetOperation(key, value);
      continue;
    }

    if (value.create) {
      output[key] = {
        ...value,
        create: normalizeDataObject(value.create),
      };
      continue;
    }

    if (value.update) {
      output[key] = {
        ...value,
        update: normalizeDataObject(value.update),
      };
      continue;
    }

    if (value.upsert) {
      output[key] = {
        ...value,
        upsert: {
          ...value.upsert,
          create: normalizeDataObject(value.upsert.create || {}),
          update: normalizeDataObject(value.upsert.update || {}),
        },
      };
      continue;
    }

    if (value.createMany?.data) {
      output[key] = {
        ...value,
        createMany: {
          ...value.createMany,
          data: normalizeDataObject(value.createMany.data),
        },
      };
      continue;
    }

    if (value.updateMany?.data) {
      output[key] = {
        ...value,
        updateMany: {
          ...value.updateMany,
          data: normalizeDataObject(value.updateMany.data),
        },
      };
    }
  }

  return output as T;
}

export function normalizePrismaWriteArgs(model: string, operation: string, args: any) {
  if (!args || typeof args !== 'object') return args;

  if (!WRITE_OPERATIONS.has(operation)) return args;

  const output = { ...args };

  if (operation === 'upsert') {
    if (output.create) output.create = normalizeDataObject(output.create);
    if (output.update) output.update = normalizeDataObject(output.update);
    return output;
  }

  if (operation === 'createMany' && Array.isArray(output.data)) {
    output.data = output.data.map((item: any) => normalizeDataObject(item));
    return output;
  }

  if (output.data) {
    output.data = normalizeDataObject(output.data);
  }

  return output;
}

// Compatibilidad con el helper anterior
export function normalizePersonaInput<T extends PlainObject>(input: T): T {
  return normalizeDataObject(input);
}

export function normalizePersonaDataForDb<T extends PlainObject>(data: T): T {
  return normalizeDataObject(data);
}
