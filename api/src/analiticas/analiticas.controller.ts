import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnaliticasService } from './analiticas.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('analiticas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnaliticasController {
  constructor(private readonly analiticasService: AnaliticasService) {}

  @Get('financieras')
  @Roles('Admin', 'Director')
  async getFinancieras() {
    return this.analiticasService.getFinancieras();
  }

  @Get('academicas')
  @Roles('Admin', 'Director')
  async getAcademicas() {
    return this.analiticasService.getAcademicas();
  }

  @Get('alertas')
  @Roles('Admin', 'Director')
  async getAlertas() {
    return this.analiticasService.getAlertas();
  }

  @Get('operativas')
  @Roles('Admin', 'Director')
  async getOperativas() {
    return this.analiticasService.getOperativas();
  }
}