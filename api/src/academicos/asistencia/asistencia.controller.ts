import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { SaveAsistenciaDto } from '../dto/save-asistencia.dto';
import { AsistenciaService } from './asistencia.service';

@Controller('academicos')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Get('asistencia/secciones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async getSeccionesDisponibles(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.asistenciaService.getSeccionesDisponibles(req.user, {
      scope,
      colegioId,
    });
  }

  @Get('asistencia/calendario')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async getCalendarioAsistencia(
    @Request() req,
    @Query('seccion_id') seccionId: string,
    @Query('mes') mes: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.asistenciaService.getCalendarioAsistencia(
      req.user,
      Number(seccionId),
      mes,
      { scope, colegioId },
    );
  }

  @Get('asistencia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async getAsistencia(
    @Request() req,
    @Query('seccion_id') seccionId: string,
    @Query('fecha') fecha: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.asistenciaService.getAsistencia(
      req.user,
      Number(seccionId),
      fecha,
      { scope, colegioId },
    );
  }

  @Post('asistencia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async saveAsistencia(
    @Request() req,
    @Body() dto: SaveAsistenciaDto,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.asistenciaService.saveAsistencia(
      req.user,
      dto.id_seccion,
      dto.fecha,
      dto.asistencias,
      { scope, colegioId },
    );
  }

  @Get('padres/asistencia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Apoderado', 'Admin')
  async getAsistenciaAlumno(
    @Query('alumno_id') alumnoId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.asistenciaService.getAsistenciaAlumno(
      Number(alumnoId),
      desde,
      hasta,
    );
  }
}
