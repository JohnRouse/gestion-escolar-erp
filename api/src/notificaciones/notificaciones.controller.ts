import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'))
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  async getNotificaciones(@Request() req) {
    return this.notificacionesService.getNotificaciones(req.user.userId);
  }

  @Get('count')
  async getCountNoLeidas(@Request() req) {
    const count = await this.notificacionesService.getCountNoLeidas(req.user.userId);
    return { count };
  }

  @Put(':id/leida')
  async marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(Number(id));
  }
}