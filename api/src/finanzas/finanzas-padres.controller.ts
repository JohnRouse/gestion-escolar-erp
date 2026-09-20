import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FinanzasService } from './finanzas.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('tesoreria/padres')
@UseGuards(AuthGuard('jwt-portal'))
export class FinanzasPadresController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('estado-cuenta')
  getEstadoCuenta(
    @Req() req: PortalRequest,
    @Query('alumno_id') alumnoId: string,
  ) {
    return this.finanzasService.getEstadoCuentaPadre(
      req.user.personaId,
      Number(alumnoId),
    );
  }
}
