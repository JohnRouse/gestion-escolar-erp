const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const horarios = await prisma.horario.findMany({
    where: {
      id_anio: null,
    },
    select: {
      id_horario: true,
      id_seccion: true,
      id_curso: true,
      id_docente: true,
      dia_semana: true,
      hora_inicio: true,
      hora_fin: true,
    },
  });

  let actualizados = 0;
  const ambiguos = [];
  const sinAsignacion = [];

  for (const horario of horarios) {
    const asignaciones =
      await prisma.asignacionDocente.findMany({
        where: {
          id_seccion: horario.id_seccion,
          id_curso: horario.id_curso,
          id_docente: horario.id_docente,
        },
        select: {
          id_anio: true,
        },
      });

    const anios = [
      ...new Set(
        asignaciones
          .map((item) => item.id_anio)
          .filter(Boolean),
      ),
    ];

    if (anios.length === 1) {
      await prisma.horario.update({
        where: {
          id_horario: horario.id_horario,
        },
        data: {
          id_anio: anios[0],
        },
      });

      actualizados += 1;
      continue;
    }

    if (anios.length === 0) {
      sinAsignacion.push(horario);
      continue;
    }

    ambiguos.push({
      ...horario,
      anios_posibles: anios,
    });
  }

  console.log('');
  console.log('========================================');
  console.log('REVISIÓN DE HORARIOS EXISTENTES');
  console.log('========================================');
  console.log(`Horarios encontrados: ${horarios.length}`);
  console.log(`Actualizados: ${actualizados}`);
  console.log(`Ambiguos: ${ambiguos.length}`);
  console.log(`Sin asignación: ${sinAsignacion.length}`);

  if (ambiguos.length) {
    console.log('');
    console.log(
      'Horarios ambiguos: pertenecen a más de un año posible.',
    );
    console.table(ambiguos);
  }

  if (sinAsignacion.length) {
    console.log('');
    console.log(
      'Horarios sin una asignación docente coincidente.',
    );
    console.table(sinAsignacion);
  }

  if (ambiguos.length || sinAsignacion.length) {
    console.log('');
    console.log(
      'Estos registros quedan sin año para no asignarlos '
      + 'incorrectamente. Deben revisarse o recrearse.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
