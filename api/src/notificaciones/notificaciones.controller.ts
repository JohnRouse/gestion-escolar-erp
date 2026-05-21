import { Controller, Get, Put, Param, UseGuards, Request, Delete, Post, Body } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'))
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService, private prisma: PrismaService) {}

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

  @Post('token')
async registrarToken(@Request() req, @Body() body: { token: string }) {
  await this.prisma.tokenFCM.upsert({
    where: { id_usuario_token: { id_usuario: req.user.userId, token: body.token } },
    update: {},
    create: { id_usuario: req.user.userId, token: body.token },
  });
  return { message: 'Token registrado' };
}

@Delete('token')
async eliminarToken(@Request() req, @Body() body: { token: string }) {
  await this.prisma.tokenFCM.deleteMany({
    where: { id_usuario: req.user.userId, token: body.token },
  });
  return { message: 'Token eliminado' };
}
}