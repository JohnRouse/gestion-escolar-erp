import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const idCronograma = Number(process.argv[2]);
  const fecha = process.argv[3];

  if (!idCronograma || !fecha) {
    console.log('Uso: npx ts-node scripts/set-proximo-seguimiento.ts <id_cronograma> <YYYY-MM-DDTHH:mm>');
    process.exit(1);
  }

  const gestion = await prisma.cobranzaGestion.findFirst({
    where: { id_cronograma: idCronograma },
    orderBy: { fecha_gestion: 'desc' },
  });

  if (!gestion) {
    throw new Error(`No hay gestiones para el cronograma ${idCronograma}`);
  }

  const actualizado = await prisma.cobranzaGestion.update({
    where: { id_gestion: gestion.id_gestion },
    data: { fecha_programada: new Date(fecha) },
  });

  console.log(`Gestión ${actualizado.id_gestion} actualizada con próximo seguimiento ${actualizado.fecha_programada}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
