import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AcademicosService } from './academicos.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('academicos/padres')
@UseGuards(AuthGuard('jwt-portal'))
export class AcademicosPadresController {
  constructor(private readonly academicosService: AcademicosService) {}

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

  @Put('hijos/:id/avatar')
  updateAvatar(
    @Req() req: PortalRequest,
    @Param('id') alumnoId: string,
    @Body() body: { avatar_url: string },
  ) {
    return this.academicosService.updateAvatarHijo(
      req.user.personaId,
      Number(alumnoId),
      body.avatar_url,
    );
  }
}
