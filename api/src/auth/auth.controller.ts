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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type AuthenticatedRequest = ExpressRequest & {
  user: { userId: number; personaId: number; rol: string; canal: string };
};

type PortalProfileUpdate = {
  correo?: string;
  telefono?: string;
  ocupacion?: string;
  avatar_url?: string;
  tema?: string;
  notificaciones_activas?: boolean;
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Post('portal/login')
  @HttpCode(HttpStatus.OK)
  async loginPortal(@Body() body: { username: string; password: string }) {
    return this.authService.loginPortal(body.username, body.password);
  }

  @Get('portal/perfil')
  @UseGuards(AuthGuard('jwt-portal'))
  async perfilPortal(@Request() req: AuthenticatedRequest) {
    return this.authService.getPortalPerfil(req.user.userId);
  }

  @Put('portal/perfil')
  @UseGuards(AuthGuard('jwt-portal'))
  async updatePerfilPortal(
    @Request() req: AuthenticatedRequest,
    @Body() body: PortalProfileUpdate,
  ) {
    return this.authService.updatePortalPerfil(req.user.userId, body);
  }

  @Put('portal/cambiar-password')
  @UseGuards(AuthGuard('jwt-portal'))
  async cambiarPasswordPortal(
    @Request() req: AuthenticatedRequest,
    @Body() body: { password_actual: string; password_nueva: string },
  ) {
    return this.authService.cambiarPassword(
      req.user.userId,
      body.password_actual,
      body.password_nueva,
    );
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

  @Post('perfil/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP.'), false);
          return;
        }

        cb(null, true);
      },
    }),
  )
  async subirAvatarPerfil(@Request() req, @UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('No se recibió la imagen.');
    }

    const saved = await this.storageService.saveFile(file, {
      folder: 'usuarios',
      prefix: 'avatar',
      entityId: req.user.userId,
      filenameBase: `usuario-${req.user.userId}`,
      allowedMimeExtensions: {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      },
    });

    await this.prisma.usuario.update({
      where: { id_usuario: req.user.userId },
      data: { avatar_url: saved.url },
    });

    return this.authService.getPerfil(req.user.userId);
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
