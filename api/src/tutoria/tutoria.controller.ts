import { Body, Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { TutoriaService } from './tutoria.service';

@Controller('tutoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TutoriaController {
  constructor(private readonly tutoriaService: TutoriaService) {}

  @Get('panel')
  @Roles('Admin', 'Director', 'Profesor')
  async getPanel(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('anio_id') anioId?: string,
  ) {
    return this.tutoriaService.getPanel(req.user, { scope, colegioId, anioId });
  }

  @Get('salones/:id/alumnos')
  @Roles('Admin', 'Director', 'Profesor')
  async getAlumnosSalon(
    @Request() req,
    @Param('id') idSeccion: string,
    @Query('id_anio') idAnio: string,
    @Query('id_bimestre') idBimestre: string,
  ) {
    return this.tutoriaService.getAlumnosSalon(req.user, {
      idSeccion: Number(idSeccion),
      idAnio: Number(idAnio),
      idBimestre: Number(idBimestre),
    });
  }

  @Get('alumnos/:id/resumen')
  @Roles('Admin', 'Director', 'Profesor')
  async getResumenAlumno(
    @Request() req,
    @Param('id') idMatricula: string,
    @Query('id_bimestre') idBimestre: string,
  ) {
    return this.tutoriaService.getResumenAlumno(req.user, Number(idMatricula), Number(idBimestre));
  }

  @Put('alumnos/:id/cierre')
  @Roles('Admin', 'Director', 'Profesor')
  async guardarCierreAlumno(
    @Request() req,
    @Param('id') idMatricula: string,
    @Body()
    body: {
      id_bimestre: number;
      comentario?: string;
      conducta?: { id_criterio: number; valor?: string | null }[];
      participacion_familiar?: { id_criterio: number; valor?: string | null }[];
    },
  ) {
    return this.tutoriaService.guardarCierreAlumno(req.user, Number(idMatricula), body);
  }
}
