import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);

  const cronogramas = await prisma.cronogramaPagos.findMany({
    where: {
      estado_pago: { in: ['Pendiente', 'Parcial'] },
      concepto: {
        tipo_concepto: 'MATRICULA',
      },
    },
    include: {
      concepto: true,
      matricula: {
        include: {
          estudiante: {
            include: { persona: true },
          },
        },
      },
      pagos: true,
    },
    orderBy: {
      id_cronograma: 'asc',
    },
  });

  let actualizados = 0;

  for (const cron of cronogramas) {
    const pagado = cron.pagos.reduce((sum, pago) => sum + Number(pago.monto_pagado || 0), 0);
    const monto = Number(cron.monto_programado ?? cron.concepto?.monto_base ?? 0);
    const saldo = Math.max(monto - pagado, 0);

    if (saldo <= 0) continue;

    await prisma.cronogramaPagos.update({
      where: { id_cronograma: cron.id_cronograma },
      data: {
        fecha_vencimiento: hoy,
      },
    });

    actualizados += 1;
    const persona = cron.matricula.estudiante.persona;
    console.log(`✓ Matrícula ${cron.id_cronograma} -> vencimiento hoy | ${persona.nombres} ${persona.apellido_paterno}`);
  }

  console.log(`Cronogramas de matrícula actualizados: ${actualizados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
