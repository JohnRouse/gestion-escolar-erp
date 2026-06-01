import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('plantillas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlantillasController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('Admin', 'Director')
  async findAll() {
    return this.prisma.plantillaEvaluacion.findMany({
      include: {
        detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } },
        nivel: true,
        curso: true,
      },
    });
  }

  @Post()
  @Roles('Admin', 'Director')
  async create(@Body() body: {
    nombre: string;
    id_nivel?: number;
    id_curso?: number;
    detalles: { id_tipo_eval: number; descripcion: string; orden: number }[];
  }) {
    return this.prisma.plantillaEvaluacion.create({
      data: {
        nombre: body.nombre,
        id_nivel: body.id_nivel || null,
        id_curso: body.id_curso || null,
        detalles: { create: body.detalles },
      },
      include: { detalles: { include: { tipo: true } } },
    });
  }

  @Put(':id')
  @Roles('Admin', 'Director')
  async update(@Param('id') id: string, @Body() body: any) {
    await this.prisma.plantillaEvaluacionDetalle.deleteMany({ where: { id_plantilla: Number(id) } });
    return this.prisma.plantillaEvaluacion.update({
      where: { id_plantilla: Number(id) },
      data: {
        nombre: body.nombre,
        id_nivel: body.id_nivel || null,
        id_curso: body.id_curso || null,
        detalles: { create: body.detalles },
      },
      include: { detalles: { include: { tipo: true } } },
    });
  }

  @Delete(':id')
  @Roles('Admin', 'Director')
  async delete(@Param('id') id: string) {
    await this.prisma.plantillaEvaluacionDetalle.deleteMany({ where: { id_plantilla: Number(id) } });
    return this.prisma.plantillaEvaluacion.delete({ where: { id_plantilla: Number(id) } });
  }

  @Post(':id/aplicar')
@Roles('Admin', 'Director', 'Profesor')
async aplicar(
  @Param('id') id: string,
  @Body() body: { id_asignacion: number; id_unidad: number; modo?: 'reemplazar' | 'agregar' },
) {
  const plantilla = await this.prisma.plantillaEvaluacion.findUnique({
    where: { id_plantilla: Number(id) },
    include: { detalles: true },
  });
  if (!plantilla) throw new NotFoundException('Plantilla no encontrada');

  // Si el modo es "reemplazar", eliminar las evaluaciones existentes de esa asignación y unidad
  if (body.modo === 'reemplazar') {
    await this.prisma.evaluacionDetalle.deleteMany({
      where: {
        id_asignacion: body.id_asignacion,
        id_unidad: body.id_unidad,
      },
    });
  }

  const evaluaciones = await Promise.all(
    plantilla.detalles.map((detalle) =>
      this.prisma.evaluacionDetalle.create({
        data: {
          id_asignacion: body.id_asignacion,
          id_unidad: body.id_unidad,
          id_tipo_eval: detalle.id_tipo_eval,
          descripcion_actividad: detalle.descripcion,
        },
      })
    )
  );

  return { message: 'Plantilla aplicada', total: evaluaciones.length, modo: body.modo || 'agregar' };
}

@Post(':id/aplicar-anio')
@Roles('Admin', 'Director')
async aplicarAnio(
  @Param('id') id: string,
  @Body() body: { id_anio: number },
) {
  const idPlantilla = Number(id);
  const idAnio = Number(body.id_anio);

  const plantilla = await this.prisma.plantillaEvaluacion.findUnique({
    where: { id_plantilla: idPlantilla },
    include: {
      detalles: {
        orderBy: { orden: 'asc' },
      },
      nivel: true,
      curso: true,
    },
  });

  if (!plantilla) throw new NotFoundException('Plantilla no encontrada');

  const anio = await this.prisma.anioLectivo.findUnique({
    where: { id_anio: idAnio },
    include: {
      bimestres: {
        include: {
          unidades: true,
        },
      },
    },
  });

  if (!anio) throw new NotFoundException('Año lectivo no encontrado');

  const unidades = anio.bimestres
    .flatMap((bimestre) => bimestre.unidades)
    .sort((a, b) => a.numero - b.numero);

  if (unidades.length === 0) {
    return {
      message: 'El año lectivo no tiene unidades configuradas',
      asignaciones: 0,
      unidades: 0,
      evaluacionesCreadas: 0,
      evaluacionesExistentes: 0,
    };
  }

  const whereAsignaciones: any = {
    id_anio: idAnio,
  };

  if (plantilla.id_nivel) {
    whereAsignaciones.seccion = {
      grado: {
        id_nivel: plantilla.id_nivel,
      },
    };
  }

  if (plantilla.id_curso) {
    whereAsignaciones.id_curso = plantilla.id_curso;
  }

  const asignaciones = await this.prisma.asignacionDocente.findMany({
    where: whereAsignaciones,
    include: {
      curso: true,
      seccion: {
        include: {
          grado: {
            include: {
              nivel: true,
            },
          },
        },
      },
    },
  });

  let evaluacionesCreadas = 0;
  let evaluacionesExistentes = 0;

  await this.prisma.$transaction(async (tx) => {
    for (const asignacion of asignaciones) {
      for (const unidad of unidades) {
        for (const detalle of plantilla.detalles) {
          const existente = await tx.evaluacionDetalle.findFirst({
            where: {
              id_asignacion: asignacion.id_asignacion,
              id_unidad: unidad.id_unidad,
              id_tipo_eval: detalle.id_tipo_eval,
              descripcion_actividad: detalle.descripcion,
            },
          });

          if (existente) {
            evaluacionesExistentes++;
            continue;
          }

          await tx.evaluacionDetalle.create({
            data: {
              id_asignacion: asignacion.id_asignacion,
              id_unidad: unidad.id_unidad,
              id_tipo_eval: detalle.id_tipo_eval,
              descripcion_actividad: detalle.descripcion,
            },
          });

          evaluacionesCreadas++;
        }
      }
    }
  });

  return {
    message: 'Plantilla aplicada al año lectivo correctamente',
    plantilla: {
      id_plantilla: plantilla.id_plantilla,
      nombre: plantilla.nombre,
      alcance: plantilla.id_curso
        ? 'curso'
        : plantilla.id_nivel
          ? 'nivel'
          : 'global',
      nivel: plantilla.nivel?.nombre_nivel || null,
      curso: plantilla.curso?.nombre_curso || null,
    },
    asignaciones: asignaciones.length,
    unidades: unidades.length,
    evaluacionesCreadas,
    evaluacionesExistentes,
  };
}

}