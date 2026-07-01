const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

const TITLE_CASE_FIELDS = new Set([
  'nombres',
  'apellido_paterno',
  'apellido_materno',
  'nombre_completo',
  'direccion',
  'pais',
  'departamento',
  'provincia',
  'distrito',
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
  'ocupacion',
  'cargo',
  'area',
  'banco_destino',
  'banco_1',
  'banco_2',
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

const SMALL_WORDS = new Set(['a', 'al', 'de', 'del', 'la', 'las', 'los', 'el', 'en', 'y', 'o', 'u', 'por', 'para', 'con']);

const SPECIAL_WORDS = {
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

function cleanSpaces(value) {
  return String(value || '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function cleanTextBlock(value) {
  const clean = String(value || '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return clean || null;
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function shouldNeverNormalize(key) {
  const lower = normalizeKey(key);
  return NEVER_NORMALIZE_PARTS.some((part) => lower.includes(part));
}

function normalizeAcronymCandidate(word) {
  const raw = String(word || '').trim();
  const normalized = raw
    .toLocaleLowerCase('es-PE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (SPECIAL_WORDS[raw.toLocaleLowerCase('es-PE')]) return SPECIAL_WORDS[raw.toLocaleLowerCase('es-PE')];
  if (SPECIAL_WORDS[normalized]) return SPECIAL_WORDS[normalized];

  return null;
}

function capitalizeToken(token) {
  if (!token) return token;

  const special = normalizeAcronymCandidate(token);
  if (special) return special;

  const lower = token.toLocaleLowerCase('es-PE');

  return lower.replace(/(^|[\s'’´`-])([\p{L}])/gu, (_match, prefix, letter) => {
    return `${prefix}${String(letter).toLocaleUpperCase('es-PE')}`;
  });
}

function titleCase(value) {
  const clean = cleanSpaces(value);
  if (!clean) return null;

  return clean
    .split(' ')
    .map((word, index) => {
      const special = normalizeAcronymCandidate(word);
      if (special) return special;

      const lower = word.toLocaleLowerCase('es-PE');

      if (index > 0 && SMALL_WORDS.has(lower)) return lower;

      return capitalizeToken(word);
    })
    .join(' ');
}

function normalizeField(field, value) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;

  const key = normalizeKey(field);

  if (shouldNeverNormalize(key)) return value;
  if (TEXT_BLOCK_FIELDS.has(key)) return cleanTextBlock(value);
  if (TITLE_CASE_FIELDS.has(key)) return titleCase(value);
  if (LOWER_CASE_FIELDS.has(key)) return cleanSpaces(value).toLocaleLowerCase('es-PE') || null;
  if (UPPER_CASE_FIELDS.has(key)) return cleanSpaces(value).toLocaleUpperCase('es-PE') || null;

  return cleanSpaces(value);
}

function delegateKeyFromModel(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function main() {
  let totalActualizados = 0;
  const omitidos = [];

  for (const model of Prisma.dmmf.datamodel.models) {
    const delegateKey = delegateKeyFromModel(model.name);
    const delegate = prisma[delegateKey];

    if (!delegate) continue;

    const idFields = model.fields.filter((field) => field.isId);
    const stringFields = model.fields.filter((field) => field.kind === 'scalar' && field.type === 'String');

    if (idFields.length !== 1 || stringFields.length === 0) {
      omitidos.push(model.name);
      continue;
    }

    const idField = idFields[0].name;
    const select = {
      [idField]: true,
    };

    for (const field of stringFields) {
      select[field.name] = true;
    }

    const rows = await delegate.findMany({ select });
    let actualizadosModelo = 0;

    for (const row of rows) {
      const data = {};

      for (const field of stringFields) {
        const before = row[field.name];
        const after = normalizeField(field.name, before);

        if ((before || null) !== (after || null)) {
          data[field.name] = after;
        }
      }

      if (Object.keys(data).length === 0) continue;

      await delegate.update({
        where: {
          [idField]: row[idField],
        },
        data,
      });

      actualizadosModelo += 1;
      totalActualizados += 1;
    }

    if (actualizadosModelo > 0) {
      console.log(`${model.name}: ${actualizadosModelo} registro(s) normalizado(s).`);
    }
  }

  console.log(`Total de registros normalizados: ${totalActualizados}`);

  if (omitidos.length) {
    console.log('Modelos omitidos por no tener ID simple o no tener textos directos:');
    console.log(omitidos.join(', '));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
