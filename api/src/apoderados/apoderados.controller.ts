import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApoderadosService } from './apoderados.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('apoderados')
@UseGuards(AuthGuard('jwt'))
export class ApoderadosController {
  constructor(private readonly apoderadosService: ApoderadosService) {}

  @Get('perfil')
  async getPerfil(@Request() req) {
    return this.apoderadosService.getPerfil(req.user.userId);
  }

  @Put('perfil')
  async updatePerfil(@Request() req, @Body() data: any) {
    return this.apoderadosService.updatePerfil(req.user.userId, data);
  }
}