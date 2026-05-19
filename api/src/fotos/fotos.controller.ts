import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FotosService } from './fotos.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('fotos')
@UseGuards(AuthGuard('jwt'))
export class FotosController {
  constructor(private readonly fotosService: FotosService) {}

  @Get()
  async obtenerFotos(@Query('seccion_id') seccionId: string) {
    return this.fotosService.obtenerFotos(Number(seccionId));
  }
}
