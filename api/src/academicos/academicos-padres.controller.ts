import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  STUDENT_AVATAR_MAX_BYTES,
  studentAvatarFileFilter,
} from '../storage/image-upload';
import { StorageService } from '../storage/storage.service';
import { AcademicosService } from './academicos.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('academicos/padres')
@UseGuards(AuthGuard('jwt-portal'))
export class AcademicosPadresController {
  constructor(
    private readonly academicosService: AcademicosService,
    private readonly storageService: StorageService,
  ) {}

  @Get('hijos')
  getHijos(@Req() req: PortalRequest) {
    return this.academicosService.getHijosApoderado(req.user.personaId);
  }

  @Get('anios')
  getAnios(@Req() req: PortalRequest) {
    return this.academicosService.getAniosApoderado(req.user.personaId);
  }

  @Get('horario')
  getHorario(@Req() req: PortalRequest, @Query('alumno_id') alumnoId: string) {
    return this.academicosService.getHorarioAlumno(
      req.user.personaId,
      Number(alumnoId),
    );
  }

  @Post('hijos/:id/avatar')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      fileFilter: studentAvatarFileFilter,
      limits: { fileSize: STUDENT_AVATAR_MAX_BYTES },
    }),
  )
  async updateAvatar(
    @Req() req: PortalRequest,
    @Param('id') alumnoId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Selecciona una imagen JPG o PNG.');
    }

    const estudianteId = Number(alumnoId);
    if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
      throw new BadRequestException('Estudiante no disponible.');
    }
    await this.academicosService.autorizarAvatarHijo(
      req.user.personaId,
      estudianteId,
    );

    const savedImage = await this.storageService.saveImage(file, {
      folder: 'alumnos',
      prefix: 'foto-estudiante',
    });

    return this.academicosService.updateAvatarHijo(
      req.user.personaId,
      req.user.userId,
      estudianteId,
      savedImage.url,
    );
  }

  @Delete('hijos/:id/avatar')
  removeAvatar(@Req() req: PortalRequest, @Param('id') alumnoId: string) {
    const estudianteId = Number(alumnoId);
    if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
      throw new BadRequestException('Estudiante no disponible.');
    }

    return this.academicosService.removeAvatarHijo(
      req.user.personaId,
      req.user.userId,
      estudianteId,
    );
  }
}
