import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CalificacionesService } from './calificaciones.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('calificaciones/padres')
@UseGuards(AuthGuard('jwt-portal'))
export class CalificacionesPadresController {
  constructor(private readonly calificacionesService: CalificacionesService) {}

  private ids(req: PortalRequest, alumnoId: string, bimestreNumero?: string) {
    return [
      req.user.personaId,
      Number(alumnoId),
      bimestreNumero ? Number(bimestreNumero) : undefined,
    ] as const;
  }

  @Get('notas')
  getNotas(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getNotasAlumno(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }

  @Get('comparativa')
  getComparativa(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getComparativa(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }

  @Get('comentarios')
  getComentarios(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getComentarios(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }

  @Get('unidades')
  getUnidades(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getUnidadesComparativa(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }

  @Get('alertas')
  getAlertas(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getAlertasAcademicas(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }

  @Get('libreta')
  getLibreta(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.calificacionesService.getLibreta(
      ...this.ids(req, alumnoId, bimestreId),
    );
  }
}
