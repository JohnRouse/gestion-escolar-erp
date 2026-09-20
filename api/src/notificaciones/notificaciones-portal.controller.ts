import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  NotificacionLecturaDto,
  NotificacionesListDto,
} from './notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('notificaciones/portal')
@UseGuards(AuthGuard('jwt-portal'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificacionesPortalController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  list(@Req() req: PortalRequest, @Query() query: NotificacionesListDto) {
    return this.notificaciones.getPortalNotificaciones(req.user.userId, query);
  }

  @Get('count')
  async count(@Req() req: PortalRequest) {
    return {
      count: await this.notificaciones.getPortalCountNoLeidas(req.user.userId),
    };
  }

  @Patch(':id/leida')
  markRead(
    @Req() req: PortalRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NotificacionLecturaDto,
  ) {
    return this.notificaciones.marcarPortalLectura(
      req.user.userId,
      id,
      body.leida,
    );
  }
}
