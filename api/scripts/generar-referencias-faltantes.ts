import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function limpiarPrefijo(value?: string | null, fallback = 'COL') {
  const limpio = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return (limpio || fallback).slice(0, 6);
}

function getAnio(anio?: { fecha_inicio?: Date | string | null; nombre_anio?: string | null } | null) {
  if (anio?.fecha_inicio) {
    const fecha = new Date(anio.fecha_inicio);
    if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
  }

  const match = String(anio?.nombre_anio || '').match(/\d{4}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}

async function asegurarReferencia(idCronograma: number) {
  const cronograma = await prisma.cronogramaPagos.findUnique({
    where: { id_cronograma: idCronograma },
    include: {
      matricula: {
        include: {
          colegio: true,
          anio: true,
        },
      },
    },
  });

  if (!cronograma) return null;
  if (cronograma.referencia_pago) return cronograma.referencia_pago;

  const colegio = cronograma.matricula.colegio;
  const prefijoColegio = limpiarPrefijo(
    colegio?.codigo || colegio?.nombre_corto || colegio?.nombre || `COL${colegio?.id_colegio || ''}`,
  );

  const anio = getAnio(cronograma.matricula.anio);
  const prefijo = `${prefijoColegio}-PG-${anio}`;

  const existentes = await prisma.cronogramaPagos.count({
    where: {
      referencia_pago: {
        startsWith: `${prefijo}-`,
      },
    },
  });

  for (let intento = 1; intento <= 5000; intento += 1) {
    const referencia = `${prefijo}-${String(existentes + intento).padStart(6, '0')}`;

    try {
      await prisma.cronogramaPagos.update({
        where: { id_cronograma: idCronograma },
        data: { referencia_pago: referencia },
      });

      return referencia;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`No se pudo generar referencia para cronograma ${idCronograma}`);
}

async function main() {
  const pendientes = await prisma.cronogramaPagos.findMany({
    where: {
      OR: [
        { referencia_pago: null },
        { referencia_pago: '' },
      ],
    },
    select: {
      id_cronograma: true,
    },
    orderBy: {
      id_cronograma: 'asc',
    },
  });

  console.log(`Cronogramas sin código encontrados: ${pendientes.length}`);

  let ok = 0;

  for (const item of pendientes) {
    const referencia = await asegurarReferencia(item.id_cronograma);
    if (referencia) {
      ok += 1;
      console.log(`✓ ${item.id_cronograma} -> ${referencia}`);
    }
  }

  console.log(`Referencias generadas: ${ok}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
