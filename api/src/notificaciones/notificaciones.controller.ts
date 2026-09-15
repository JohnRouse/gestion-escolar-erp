import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificacionLecturaDto,
  NotificacionTokenDto,
  NotificacionesListDto,
  NotificacionesScopeDto,
} from './notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

type NotificationsRequest = Request & { user: { userId: number } };

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getNotificaciones(
    @Req() req: NotificationsRequest,
    @Query() query: NotificacionesListDto,
  ) {
    return this.notificacionesService.getNotificaciones(req.user.userId, query);
  }

  @Get('count')
  async getCountNoLeidas(
    @Req() req: NotificationsRequest,
    @Query() query: NotificacionesScopeDto,
  ) {
    const count = await this.notificacionesService.getCountNoLeidas(
      req.user.userId,
      query,
    );
    return { count };
  }

  @Patch('marcar-todas-leidas')
  @Put('marcar-todas-leidas')
  marcarTodasLeidas(
    @Req() req: NotificationsRequest,
    @Query() query: NotificacionesScopeDto,
  ) {
    return this.notificacionesService.marcarTodasLeidas(req.user.userId, query);
  }

  @Patch(':id/leida')
  @Put(':id/leida')
  marcarLectura(
    @Req() req: NotificationsRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: NotificacionesScopeDto,
    @Body() body: NotificacionLecturaDto,
  ) {
    return this.notificacionesService.marcarLectura(
      req.user.userId,
      id,
      body.leida,
      query,
    );
  }

  @Post('token')
  async registrarToken(
    @Req() req: NotificationsRequest,
    @Body() body: NotificacionTokenDto,
  ) {
    await this.prisma.tokenFCM.upsert({
      where: {
        id_usuario_token: { id_usuario: req.user.userId, token: body.token },
      },
      update: {},
      create: { id_usuario: req.user.userId, token: body.token },
    });
    return { message: 'Token registrado' };
  }

  @Delete('token')
  async eliminarToken(
    @Req() req: NotificationsRequest,
    @Body() body: NotificacionTokenDto,
  ) {
    await this.prisma.tokenFCM.deleteMany({
      where: { id_usuario: req.user.userId, token: body.token },
    });
    return { message: 'Token eliminado' };
  }
}
