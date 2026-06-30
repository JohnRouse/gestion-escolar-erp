import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  async perfil(@Request() req) {
    return this.authService.getPerfil(req.user.userId);
  }

  @Get('contexto')
  @UseGuards(AuthGuard('jwt'))
  async contexto(@Request() req) {
    return this.authService.getContexto(req.user.userId);
  }

  @Put('estado')
  @UseGuards(AuthGuard('jwt'))
  async cambiarEstado(@Request() req, @Body() body: { estado: string }) {
    const estadosValidos = ['conectado', 'ocupado', 'ausente', 'desconectado'];

    if (!estadosValidos.includes(body.estado)) {
      throw new BadRequestException('Estado no válido');
    }

    await this.prisma.usuario.update({
      where: { id_usuario: req.user.userId },
      data: { estado_conexion: body.estado },
    });

    return { message: 'Estado actualizado' };
  }

  @Put('perfil')
  @UseGuards(AuthGuard('jwt'))
  async updatePerfil(@Request() req, @Body() body: any) {
    return this.authService.updatePerfil(req.user.userId, body);
  }

  @Put('cambiar-password')
  @UseGuards(AuthGuard('jwt'))
  async cambiarPassword(
    @Request() req,
    @Body() body: { password_actual: string; password_nueva: string },
  ) {
    return this.authService.cambiarPassword(
      req.user.userId,
      body.password_actual,
      body.password_nueva,
    );
  }
}