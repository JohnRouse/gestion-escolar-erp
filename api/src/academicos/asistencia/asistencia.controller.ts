import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { SaveAsistenciaDto } from '../dto/save-asistencia.dto';
import { AsistenciaService } from './asistencia.service';

@Controller('academicos')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Get('asistencia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async getAsistencia(
    @Query('seccion_id') seccionId: string,
    @Query('fecha') fecha: string,
  ) {
    return this.asistenciaService.getAsistencia(Number(seccionId), fecha);
  }

  @Post('asistencia')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Profesor', 'Director')
  async saveAsistencia(@Body() dto: SaveAsistenciaDto) {
    return this.asistenciaService.saveAsistencia(
      dto.id_seccion,
      dto.fecha,
      dto.asistencias,
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
