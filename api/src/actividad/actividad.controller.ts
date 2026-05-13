import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('actividad')
@UseGuards(AuthGuard('jwt'))
export class ActividadController {
  constructor(private readonly actividadService: ActividadService) {}

  @Get()
  async getActividad(
    @Query('alumno_id') alumnoId: string,
    @Query('limite') limite: string,
  ) {
    return this.actividadService.getActividad(
      Number(alumnoId),
      Number(limite) || 5,
    );
  }
}