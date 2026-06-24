import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { TutoriaService } from './tutoria.service';

@Controller('tutoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TutoriaController {
  constructor(private readonly tutoriaService: TutoriaService) {}

  @Get('libreta/config')
  @Roles('Admin', 'Director')
  async obtenerCabeceraLibreta(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.obtenerCabeceraLibretaConfig(req.user, {
      scope,
      colegioId,
    });
  }

  @Patch('libreta/config')
  @Roles('Admin', 'Director')
  async actualizarCabeceraLibreta(
    @Request() req,
    @Body()
    body: {
      nombre?: string;
      nombre_corto?: string | null;
      codigo?: string | null;
      logo_url?: string | null;
      color_principal?: string | null;
      direccion?: string | null;
      telefono?: string | null;
    },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.actualizarCabeceraLibretaConfig(req.user, {
      scope,
      colegioId,
      body,
    });
  }

  @Get('criterios')
  @Roles('Admin', 'Director')
  async listarCriterios(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.listarCriteriosConfig(req.user, {
      scope,
      colegioId,
    });
  }

  @Post('criterios')
  @Roles('Admin', 'Director')
  async crearCriterio(
    @Request() req,
    @Body()
    body: {
      tipo: 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';
      descripcion: string;
      orden?: number;
      id_colegio?: number;
    },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.crearCriterioConfig(req.user, {
      scope,
      colegioId,
      body,
    });
  }

  @Post('criterios/reordenar')
  @Roles('Admin', 'Director')
  async reordenarCriterios(
    @Request() req,
    @Body()
    body: {
      tipo: 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';
      orden: { id_criterio: number; orden: number }[];
    },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.reordenarCriteriosConfig(req.user, {
      scope,
      colegioId,
      body,
    });
  }

  @Delete('criterios/:id')
  @Roles('Admin', 'Director')
  async eliminarCriterio(
    @Request() req,
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.eliminarCriterioConfig(req.user, {
      scope,
      colegioId,
      idCriterio: Number(id),
    });
  }

  @Patch('criterios/:id')
  @Roles('Admin', 'Director')
  async actualizarCriterio(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      descripcion?: string;
      orden?: number;
      activo?: boolean;
    },
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.tutoriaService.actualizarCriterioConfig(req.user, {
      scope,
      colegioId,
      idCriterio: Number(id),
      body,
    });
  }

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

  @Get('alumnos/:id/libreta-pdf')
  @Roles('Admin', 'Director')
  async exportarLibretaPdf(
    @Request() req,
    @Param('id') idMatricula: string,
    @Query('id_bimestre') idBimestre: string,
    @Res() res: Response,
  ) {
    const pdf = await this.tutoriaService.exportarLibretaPdf(
      req.user,
      Number(idMatricula),
      Number(idBimestre),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.send(pdf.buffer);
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
