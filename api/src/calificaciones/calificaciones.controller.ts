import {
  Controller, Get, Post, Put, Param, Query, Body, Delete,
  UseGuards, Request, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { CalificacionesService } from './calificaciones.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { SaveNotasDto } from './dto/save-notas.dto';
import { SaveNotasMasivoDto } from './dto/save-notas-masivo.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('calificaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CalificacionesController {
  constructor(
    private readonly calificacionesService: CalificacionesService,
    private prisma: PrismaService,
  ) {}

  // ── Evaluaciones ────────────────────────────────
  @Post('evaluaciones')
  @Roles('Admin', 'Profesor')
  async createEvaluacion(@Body() dto: CreateEvaluacionDto) {
    return this.calificacionesService.createEvaluacion(dto);
  }

  @Get('evaluaciones')
  async getEvaluaciones(
    @Query('asignacion_id') asignacionId: string,
    @Query('unidad_id') unidadId: string,
  ) {
    return this.calificacionesService.getEvaluaciones(Number(asignacionId), Number(unidadId));
  }

  @Get('evaluaciones/:id/notas')
  async getEvaluacionNotas(@Param('id') id: string) {
    return this.calificacionesService.getEvaluacionNotas(Number(id));
  }

  @Post('evaluaciones/:id/notas')
  @Roles('Admin', 'Profesor')
  async saveNotasIndividual(
    @Param('id') id: string,
    @Body() dto: SaveNotasDto,
  ) {
    return this.calificacionesService.saveNotasIndividual(Number(id), dto);
  }

  // ── Modo Grilla ──────────────────────────────────
  @Get('unidades/:id/grilla')
  async getGrillaUnidad(
    @Param('id') unidadId: string,
    @Query('asignacion_id') asignacionId: string,
  ) {
    return this.calificacionesService.getGrillaUnidad(Number(unidadId), Number(asignacionId));
  }

  @Put('unidades/:id/notas')
  @Roles('Admin', 'Profesor')
  async saveNotasMasivo(
    @Param('id') unidadId: string,
    @Body() dto: SaveNotasMasivoDto,
  ) {
    // Asegurar que el id_unidad en el body coincida con el de la ruta
    if (Number(unidadId) !== dto.id_unidad) {
      throw new BadRequestException('El id_unidad no coincide');
    }
    return this.calificacionesService.saveNotasMasivo(dto, 0); // El docente se obtendrá del token, pero por ahora pasamos 0 (no se usa)
  }

  // ── Cierre de unidad ─────────────────────────────
  @Put('unidades/:id/cerrar')
  @Roles('Admin', 'Director')
  async cerrarUnidad(@Param('id') id: string) {
    return this.calificacionesService.cerrarUnidad(Number(id));
  }

  // ── Consulta para padres ─────────────────────────
  @Get('padres/notas')
  @Roles('Apoderado', 'Admin')
  async getNotasAlumno(
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId: string,
  ) {
    return this.calificacionesService.getNotasAlumno(Number(alumnoId), Number(bimestreId));
  }

  @Get('padres/comparativa')
@Roles('Apoderado', 'Admin')
async getComparativa(
  @Query('alumno_id') alumnoId: string,
  @Query('bimestre_id') bimestreId: string,
) {
  return this.calificacionesService.getComparativa(Number(alumnoId), Number(bimestreId));
}

@Get('padres/comentarios')
@Roles('Apoderado', 'Admin')
async getComentarios(
  @Query('alumno_id') alumnoId: string,
  @Query('bimestre_id') bimestreId: string,
) {
  return this.calificacionesService.getComentarios(Number(alumnoId), Number(bimestreId));
}

@Get('padres/unidades')
@Roles('Apoderado', 'Admin')
async getUnidadesComparativa(
  @Query('alumno_id') alumnoId: string,
  @Query('bimestre_id') bimestreId: string,
) {
  return this.calificacionesService.getUnidadesComparativa(Number(alumnoId), Number(bimestreId));
}

@Get('padres/alertas')
@Roles('Apoderado', 'Admin')
async getAlertasAcademicas(
  @Query('alumno_id') alumnoId: string,
  @Query('bimestre_id') bimestreId: string,
) {
  return this.calificacionesService.getAlertasAcademicas(Number(alumnoId), Number(bimestreId));
}

@Get('padres/libreta')
@Roles('Apoderado', 'Admin')
async getLibreta(
  @Query('alumno_id') alumnoId: string,
  @Query('bimestre_id') bimestreId: string,
) {
  return this.calificacionesService.getLibreta(Number(alumnoId), Number(bimestreId));
}

@Delete('evaluaciones/:id')
@Roles('Admin', 'Profesor')
async deleteEvaluacion(@Param('id') id: string) {
  return this.calificacionesService.deleteEvaluacion(Number(id));
}

@Get('escala')
@Roles('Admin')
async getEscala() {
  return this.prisma.escalaCalificacion.findFirst();
}

@Put('escala')
@Roles('Admin')
async updateEscala(@Body() body: { nota_minima: number; nota_maxima: number; nota_aprobatoria: number }) {
  const escala = await this.prisma.escalaCalificacion.findFirst();
  if (!escala) throw new NotFoundException('Escala no encontrada');
  return this.prisma.escalaCalificacion.update({
    where: { id_escala: escala.id_escala },
    data: body,
  });
}

@Get('tipos-evaluacion')
async getTiposEvaluacion() {
  return this.prisma.tipoEvaluacion.findMany();
}

@Post('tipos-evaluacion')
@Roles('Admin')
async createTipoEvaluacion(@Body() body: { nombre_tipo: string }) {
  return this.prisma.tipoEvaluacion.create({ data: { nombre_tipo: body.nombre_tipo } });
}

@Put('tipos-evaluacion/:id')
@Roles('Admin')
async updateTipoEvaluacion(@Param('id') id: string, @Body() body: { nombre_tipo: string }) {
  return this.prisma.tipoEvaluacion.update({ where: { id_tipo_eval: Number(id) }, data: { nombre_tipo: body.nombre_tipo } });
}

@Delete('tipos-evaluacion/:id')
@Roles('Admin')
async deleteTipoEvaluacion(@Param('id') id: string) {
  return this.prisma.tipoEvaluacion.delete({ where: { id_tipo_eval: Number(id) } });
}

}
