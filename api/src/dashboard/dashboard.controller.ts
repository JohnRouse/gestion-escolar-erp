import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  async getResumen(
    @Request() req,
    @Query('anio_id') anioId?: string,
    @Query('bimestre_id') bimestreId?: string,
  ) {
    return this.dashboardService.getResumen({
      userId: req.user.userId,
      rol: req.user.rol,
      anioId: anioId ? Number(anioId) : 1,
      bimestreId: bimestreId ? Number(bimestreId) : undefined,
    });
  }
}