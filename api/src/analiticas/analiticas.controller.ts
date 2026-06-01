import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AnaliticasService } from './analiticas.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('analiticas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnaliticasController {
  constructor(private readonly analiticasService: AnaliticasService) {}

  private buildParams(req: any, scope?: string, colegioId?: string) {
    return {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    };
  }

  @Get('financieras')
  @Roles('Admin', 'Director')
  async getFinancieras(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getFinancieras(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('academicas')
  @Roles('Admin', 'Director')
  async getAcademicas(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getAcademicas(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('alertas')
  @Roles('Admin', 'Director')
  async getAlertas(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getAlertas(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('operativas')
  @Roles('Admin', 'Director')
  async getOperativas(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getOperativas(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('tesoreria/kpis')
  @Roles('Admin', 'Secretaria', 'Director')
  async getTesoreriaKpis(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getTesoreriaKpis(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('matricula-tendencia')
  @Roles('Admin', 'Director')
  async getMatriculaTendencia(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getMatriculaTendencia(
      this.buildParams(req, scope, colegioId),
    );
  }

  @Get('distribucion-nivel')
  @Roles('Admin', 'Director')
  async getDistribucionPorNivel(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.analiticasService.getDistribucionPorNivel(
      this.buildParams(req, scope, colegioId),
    );
  }
}
