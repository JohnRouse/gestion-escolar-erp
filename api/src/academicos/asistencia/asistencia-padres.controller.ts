import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AsistenciaService } from './asistencia.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('academicos/padres')
@UseGuards(AuthGuard('jwt-portal'))
export class AsistenciaPadresController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Get('asistencia')
  getAsistencia(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.asistenciaService.getAsistenciaAlumno(
      req.user.personaId,
      Number(alumnoId),
      desde,
      hasta,
    );
  }
}
