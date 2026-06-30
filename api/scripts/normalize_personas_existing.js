const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function cleanSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  const clean = cleanSpaces(value);
  if (!clean) return null;

  return clean
    .split(' ')
    .map((word) =>
      word
        .toLocaleLowerCase('es-PE')
        .replace(/(^|[\s'’´`-])([\p{L}])/gu, (_match, prefix, letter) => {
          return `${prefix}${String(letter).toLocaleUpperCase('es-PE')}`;
        }),
    )
    .join(' ');
}

function lower(value) {
  const clean = cleanSpaces(value);
  return clean ? clean.toLocaleLowerCase('es-PE') : null;
}

function upper(value) {
  const clean = cleanSpaces(value);
  return clean ? clean.toLocaleUpperCase('es-PE') : null;
}

function normalizePersona(p) {
  return {
    dni: upper(p.dni),
    nombres: titleCase(p.nombres),
    apellido_paterno: titleCase(p.apellido_paterno),
    apellido_materno: titleCase(p.apellido_materno),
    direccion: titleCase(p.direccion),
    pais: titleCase(p.pais),
    departamento: titleCase(p.departamento),
    provincia: titleCase(p.provincia),
    distrito: titleCase(p.distrito),
    telefono: cleanSpaces(p.telefono || '') || null,
    correo: lower(p.correo),
  };
}

function hasChanges(before, after) {
  return Object.keys(after).some((key) => (before[key] || null) !== (after[key] || null));
}

async function main() {
  const personas = await prisma.persona.findMany({
    select: {
      id_persona: true,
      dni: true,
      nombres: true,
      apellido_paterno: true,
      apellido_materno: true,
      direccion: true,
      pais: true,
      departamento: true,
      provincia: true,
      distrito: true,
      telefono: true,
      correo: true,
    },
  });

  let actualizadas = 0;

  for (const persona of personas) {
    const data = normalizePersona(persona);

    if (!hasChanges(persona, data)) continue;

    await prisma.persona.update({
      where: { id_persona: persona.id_persona },
      data,
    });

    actualizadas += 1;
  }

  const apoderados = await prisma.apoderado.findMany({
    select: {
      id_persona: true,
      ocupacion: true,
    },
  });

  let apoderadosActualizados = 0;

  for (const apoderado of apoderados) {
    const ocupacion = titleCase(apoderado.ocupacion);

    if ((apoderado.ocupacion || null) === (ocupacion || null)) continue;

    await prisma.apoderado.update({
      where: { id_persona: apoderado.id_persona },
      data: { ocupacion },
    });

    apoderadosActualizados += 1;
  }

  console.log(`Personas normalizadas: ${actualizadas}`);
  console.log(`Apoderados normalizados: ${apoderadosActualizados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
