import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AsistenciaService {
  constructor(private prisma: PrismaService) {}

  async getAsistencia(seccionId: number, fecha: string) {
    const matriculas = await this.prisma.matricula.findMany({
      where: { id_seccion: seccionId, estado_matricula: 'Activo' },
      include: {
        estudiante: { include: { persona: true } },
        asistencias: { where: { fecha: new Date(fecha) } },
      },
    });

    return matriculas.map((m) => ({
      id_matricula: m.id_matricula,
      alumno: `${m.estudiante.persona.nombres} ${m.estudiante.persona.apellido_paterno}`,
      estado: m.asistencias.length > 0 ? m.asistencias[0].estado : 'Presente',
    }));
  }

  async saveAsistencia(
    seccionId: number,
    fecha: string,
    asistencias: { id_matricula: number; estado: string }[],
  ) {
    const fechaAsistencia = new Date(fecha);

    if (fechaAsistencia.getDay() === 0 || fechaAsistencia.getDay() === 6) {
      throw new BadRequestException(
        'No se puede registrar asistencia en fines de semana',
      );
    }

    const data = asistencias.map((a) => ({
      id_matricula: a.id_matricula,
      fecha: new Date(fecha),
      estado: a.estado,
    }));

    for (const item of data) {
      await this.prisma.asistencia.upsert({
        where: {
          id_matricula_fecha: {
            id_matricula: item.id_matricula,
            fecha: item.fecha,
          },
        },
        update: { estado: item.estado },
        create: item,
      });
    }

    return { message: 'Asistencia guardada correctamente', total: data.length };
  }

  async getAsistenciaAlumno(estudianteId: number, desde: string, hasta: string) {
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: estudianteId,
        estado_matricula: 'Activo',
      },
      include: {
        asistencias: {
          where: {
            fecha: {
              gte: new Date(desde),
              lte: new Date(hasta),
            },
          },
          orderBy: { fecha: 'asc' },
        },
      },
    });

    return matriculas.flatMap((mat) =>
      mat.asistencias.map((asist) => ({
        fecha: asist.fecha.toISOString().split('T')[0],
        estado: asist.estado,
      })),
    );
  }
}
