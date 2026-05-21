import {
  Controller, Get, Post, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('tesoreria')
@UseGuards(AuthGuard('jwt'))
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  /**
   * Obtiene estado de cuenta por matrícula (uso interno)
   */
  @Get('estado-cuenta/:matricula_id')
  @Roles('Admin', 'Secretaria', 'Director')
  async getEstadoCuenta(@Param('matricula_id') matriculaId: string) {
    return this.finanzasService.getEstadoCuenta(Number(matriculaId));
  }

  /**
   * Registra uno o varios pagos (cajero/secretaria)
   */
  @Post('pagos')
  @Roles('Admin', 'Secretaria')
  async registrarPago(@Body() dto: RegistrarPagoDto, @Request() req) {
    // El id del cajero viene del token JWT (req.user.userId)
    return this.finanzasService.registrarPago(dto, req.user.userId);
  }

  /**
   * Estado de cuenta para el padre (app móvil)
   */
  @Get('padres/estado-cuenta')
  @Roles('Apoderado', 'Admin')
  async getEstadoCuentaPadre(@Query('alumno_id') alumnoId: string) {
    return this.finanzasService.getEstadoCuentaPadre(Number(alumnoId));
  }

  @Get('pagos/pendientes/count')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Secretaria', 'Director')
async getPagosPendientesCount() {
  return this.finanzasService.getPagosPendientesCount();
}

@Post('pagos-extraordinarios')
@Roles('Admin', 'Secretaria', 'Director')
async crearPagoExtraordinario(@Body() dto: any) {
  return this.finanzasService.crearPagoExtraordinario(dto);
}

@Post('webhook')
async webhookPago(@Body() body: any) {
  // TODO: Verificar firma de Culqi/Stripe
  // TODO: Registrar el pago como confirmado
  console.log('[Webhook] Pago recibido:', body);
  return { received: true };
}
}
