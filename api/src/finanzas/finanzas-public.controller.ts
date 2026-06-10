import { Controller, Get, Param, Query } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';

@Controller('tesoreria/public')
export class FinanzasPublicController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('colegios')
  async listarColegiosPublicos() {
    return this.finanzasService.listarColegiosPublicos();
  }

  @Get('pagos/:referencia')
  async obtenerPagoPublicoPorReferencia(
    @Param('referencia') referencia: string,
  ) {
    return this.finanzasService.obtenerPagoPublicoPorReferencia(referencia);
  }

  @Get('consulta-pagos')
  async consultarPagosPublicosPorDni(
    @Query('colegio_id') colegioId: string,
    @Query('dni') dni: string,
  ) {
    return this.finanzasService.consultarPagosPublicosPorDni(
      Number(colegioId),
      dni,
    );
  }
}