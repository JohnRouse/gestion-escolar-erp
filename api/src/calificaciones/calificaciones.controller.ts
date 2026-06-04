//CALIFICACIONES CONTROLLER

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

  // ── Helper para resolver colegio según scope y permisos ──
  private async resolveColegioConfig(
    req: any,
    scope?: string,
    colegioId?: string,
    bodyColegioId?: number,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: {
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
          orderBy: { es_principal: 'desc' },
        },
      },
    });

    const colegios = usuario?.colegios || [];
    const permitidoIds = colegios.map((item) => item.id_colegio);

    const targetId =
      bodyColegioId ||
      (colegioId ? Number(colegioId) : undefined) ||
      (scope === 'all' ? undefined : permitidoIds[0]);

    if (targetId && !permitidoIds.includes(targetId)) {
      throw new BadRequestException('No tienes acceso al colegio seleccionado.');
    }

    const colegio = targetId
      ? colegios.find((item) => item.id_colegio === targetId)?.colegio
      : null;

    return {
      colegioId: targetId,
      tenantId: colegio?.id_tenant || colegios[0]?.colegio?.id_tenant || null,
      permitidoIds,
    };
  }

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

  // ── Escala de calificación ──────────────────────
  @Get('escala')
  @Roles('Admin')
  async getEscala(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const config = await this.resolveColegioConfig(req, scope, colegioId);

    if (!config.colegioId) {
      return this.prisma.escalaCalificacion.findFirst({
        where: { id_colegio: { in: config.permitidoIds } },
      });
    }

    let escala = await this.prisma.escalaCalificacion.findFirst({
      where: { id_colegio: config.colegioId },
    });

    if (!escala) {
      escala = await this.prisma.escalaCalificacion.create({
        data: {
          id_tenant: config.tenantId,
          id_colegio: config.colegioId,
          nombre_escala: 'Escala 0-20',
          nota_minima: 0,
          nota_maxima: 20,
          nota_aprobatoria: 11,
          tipo_calificacion: 'Numérica',
        },
      });
    }

    return escala;
  }

  @Put('escala')
  @Roles('Admin')
  async updateEscala(
    @Request() req,
    @Body()
    body: {
      nota_minima: number;
      nota_maxima: number;
      nota_aprobatoria: number;
      id_colegio?: number;
      id_tenant?: number;
    },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const config = await this.resolveColegioConfig(
      req,
      scope,
      colegioId,
      body.id_colegio ? Number(body.id_colegio) : undefined,
    );

    if (!config.colegioId) {
      throw new BadRequestException('Selecciona el colegio de la escala.');
    }

    const existente = await this.prisma.escalaCalificacion.findFirst({
      where: { id_colegio: config.colegioId },
    });

    if (existente) {
      return this.prisma.escalaCalificacion.update({
        where: { id_escala: existente.id_escala },
        data: {
          nota_minima: body.nota_minima,
          nota_maxima: body.nota_maxima,
          nota_aprobatoria: body.nota_aprobatoria,
        },
      });
    }

    return this.prisma.escalaCalificacion.create({
      data: {
        id_tenant: body.id_tenant || config.tenantId,
        id_colegio: config.colegioId,
        nombre_escala: 'Escala 0-20',
        nota_minima: body.nota_minima,
        nota_maxima: body.nota_maxima,
        nota_aprobatoria: body.nota_aprobatoria,
        tipo_calificacion: 'Numérica',
      },
    });
  }

  // ── Tipos de evaluación ─────────────────────────
  @Get('tipos-evaluacion')
  async getTiposEvaluacion(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const config = await this.resolveColegioConfig(req, scope, colegioId);

    return this.prisma.tipoEvaluacion.findMany({
      where: config.colegioId
        ? { id_colegio: config.colegioId }
        : { id_colegio: { in: config.permitidoIds } },
      orderBy: { nombre_tipo: 'asc' },
    });
  }

  @Post('tipos-evaluacion')
  @Roles('Admin')
  async createTipoEvaluacion(
    @Request() req,
    @Body() body: { nombre_tipo: string; id_colegio?: number; id_tenant?: number },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const config = await this.resolveColegioConfig(
      req,
      scope,
      colegioId,
      body.id_colegio ? Number(body.id_colegio) : undefined,
    );

    if (!config.colegioId) {
      throw new BadRequestException('Selecciona el colegio del tipo de evaluación.');
    }

    return this.prisma.tipoEvaluacion.create({
      data: {
        nombre_tipo: body.nombre_tipo,
        id_tenant: body.id_tenant || config.tenantId,
        id_colegio: config.colegioId,
      },
    });
  }

  @Put('tipos-evaluacion/:id')
  @Roles('Admin')
  async updateTipoEvaluacion(
    @Param('id') id: string,
    @Body() body: { nombre_tipo: string; id_colegio?: number; id_tenant?: number },
  ) {
    return this.prisma.tipoEvaluacion.update({
      where: { id_tipo_eval: Number(id) },
      data: {
        nombre_tipo: body.nombre_tipo,
        id_tenant: body.id_tenant,
        id_colegio: body.id_colegio,
      },
    });
  }

  @Delete('tipos-evaluacion/:id')
  @Roles('Admin')
  async deleteTipoEvaluacion(@Param('id') id: string) {
    return this.prisma.tipoEvaluacion.delete({ where: { id_tipo_eval: Number(id) } });
  }
}