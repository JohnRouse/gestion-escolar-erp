import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CircularesService } from './circulares.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('circulares')
@UseGuards(AuthGuard('jwt-portal'))
export class CircularesPadresController {
  constructor(private readonly circularesService: CircularesService) {}

  @Get('padres')
  list(@Req() req: PortalRequest) {
    return this.circularesService.findForApoderado(
      req.user.userId,
      req.user.personaId,
    );
  }

  @Put(':id/leida')
  markRead(@Req() req: PortalRequest, @Param('id', ParseIntPipe) id: number) {
    return this.circularesService.marcarLeida(
      id,
      req.user.userId,
      req.user.personaId,
    );
  }

  @Post(':id/confirmar')
  confirm(@Req() req: PortalRequest, @Param('id', ParseIntPipe) id: number) {
    return this.circularesService.confirmar(
      id,
      req.user.userId,
      req.user.personaId,
    );
  }
}
