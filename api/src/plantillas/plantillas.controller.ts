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
  const plantilla = await this.prisma.plantillaEvaluacion.findUnique({
    where: { id_plantilla: Number(id) },
    include: { detalles: true },
  });
  if (!plantilla) throw new NotFoundException('Plantilla no encontrada');

  // Obtener todas las asignaciones activas del año
  const where: any = { id_anio: body.id_anio };
  if (plantilla.id_nivel) {
    where.seccion = { grado: { id_nivel: plantilla.id_nivel } };
  }
  if (plantilla.id_curso) {
    where.id_curso = plantilla.id_curso;
  }

  const asignaciones = await this.prisma.asignacionDocente.findMany({ where });

  let totalCreadas = 0;

  for (const asignacion of asignaciones) {
    // Para cada unidad (1 a 8)
    for (let unidad = 1; unidad <= 8; unidad++) {
      for (const detalle of plantilla.detalles) {
        // Verificar si ya existe una evaluación similar en esa unidad y asignación
        const existente = await this.prisma.evaluacionDetalle.findFirst({
  where: {
    id_asignacion: asignacion.id_asignacion,
    id_unidad: unidad,
    descripcion_actividad: detalle.descripcion,
    id_tipo_eval: detalle.id_tipo_eval,
  },
});
        if (!existente) {
          await this.prisma.evaluacionDetalle.create({
            data: {
              id_asignacion: asignacion.id_asignacion,
              id_unidad: unidad,
              id_tipo_eval: detalle.id_tipo_eval,
              descripcion_actividad: detalle.descripcion,
            },
          });
          totalCreadas++;
        }
      }
    }
  }

  return {
    message: 'Plantilla aplicada a todas las asignaciones del año',
    asignaciones: asignaciones.length,
    evaluacionesCreadas: totalCreadas,
  };
}

}