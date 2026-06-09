import { Controller, Get, Param } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';

@Controller('tesoreria/public')
export class FinanzasPublicController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('pagos/:referencia')
  async obtenerPagoPublicoPorReferencia(
    @Param('referencia') referencia: string,
  ) {
    return this.finanzasService.obtenerPagoPublicoPorReferencia(referencia);
  }
}