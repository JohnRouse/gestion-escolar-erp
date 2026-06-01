import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ColegiosService } from './colegios.service';

@Controller('colegios')
@UseGuards(AuthGuard('jwt'))
export class ColegiosController {
  constructor(private readonly colegiosService: ColegiosService) {}

  @Get('mis-colegios')
  async getMisColegios(@Request() req) {
    return this.colegiosService.getMisColegios(req.user.userId);
  }
}