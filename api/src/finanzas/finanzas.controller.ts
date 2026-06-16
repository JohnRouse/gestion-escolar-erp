import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Delete,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('tesoreria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('kpis')
  @Roles('Admin', 'Secretaria', 'Director')
  async getTesoreriaKpis(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.getTesoreriaKpis({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('estado-cuenta/:matricula_id')
  @Roles('Admin', 'Secretaria', 'Director')
  async getEstadoCuenta(
    @Request() req,
    @Param('matricula_id') matriculaId: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.getEstadoCuenta(Number(matriculaId), {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('pagos')
  @Roles('Admin', 'Secretaria')
  async registrarPago(
    @Body() dto: RegistrarPagoDto,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.registrarPago(dto, req.user.userId, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('padres/estado-cuenta')
  @Roles('Apoderado', 'Admin')
  async getEstadoCuentaPadre(@Query('alumno_id') alumnoId: string) {
    return this.finanzasService.getEstadoCuentaPadre(Number(alumnoId));
  }

  @Get('pagos/pendientes/count')
  @Roles('Admin', 'Secretaria', 'Director')
  async getPagosPendientesCount(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.getPagosPendientesCount({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('pagos-extraordinarios/destinatarios')
  @Roles('Admin', 'Secretaria', 'Director')
  async getDestinatariosPagoExtraordinario(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.getDestinatariosPagoExtraordinario({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('pagos-extraordinarios')
  @Roles('Admin', 'Secretaria', 'Director')
  async crearPagoExtraordinario(@Body() dto: any, @Request() req) {
    return this.finanzasService.crearPagoExtraordinario(dto, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: dto.scope,
      colegioId: dto.id_colegio ? Number(dto.id_colegio) : undefined,
    });
  }

  @Post('webhook')
  async webhookPago(@Body() body: any) {
    console.log('[Webhook] Pago recibido:', body);
    return { received: true };
  }

  // ── NUEVAS RUTAS: PLANES DE PENSIÓN, PUBLICACIÓN Y DESCUENTOS ──
  @Get('planes-pensiones')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarPlanesPensiones(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('anio_id') anioId?: string,
  ) {
    return this.finanzasService.listarPlanesPensiones({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
      idAnio: anioId ? Number(anioId) : undefined,
    });
  }

  @Post('planes-pensiones')
  @Roles('Admin', 'Director')
  async crearPlanPensiones(
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.crearPlanPensiones(body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  @Post('matriculas/:id/generar-pensiones')
  @Roles('Admin', 'Director', 'Secretaria')
  async generarPensionesMatricula(
    @Param('id') id: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.generarCronogramaPensionesMatricula(Number(id), {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('matriculas/:id/aplicar-promocion-matricula')
  @Roles('Admin', 'Director', 'Secretaria')
  async aplicarPromocionMatricula(
    @Param('id') id: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.aplicarPromocionMatricula(id, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('pensiones/publicar-mes')
  @Roles('Admin', 'Director', 'Secretaria')
  async publicarPensionesMes(
    @Body() body: { id_anio: number; mes: number; id_colegio?: number; scope?: string },
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.publicarPensionesMes({
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
      idAnio: Number(body.id_anio),
      mes: Number(body.mes),
    });
  }

  @Patch('cronogramas/:id/visibilidad-apoderado')
  @Roles('Admin', 'Director', 'Secretaria')
  async actualizarVisibilidadCronogramaApoderado(
    @Param('id') id: string,
    @Body() body: { visible_apoderado?: boolean },
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.actualizarVisibilidadCronogramaApoderado(
      Number(id),
      body,
      {
        userId: req.user.userId,
        rol: req.user.rol,
        scope,
        colegioId: colegioId ? Number(colegioId) : undefined,
      },
    );
  }

  @Get('campanas-descuento')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarCampanasDescuento(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('anio_id') anioId?: string,
  ) {
    return this.finanzasService.listarCampanasDescuento({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
      idAnio: anioId ? Number(anioId) : undefined,
    });
  }

  @Post('campanas-descuento')
  @Roles('Admin', 'Director')
  async crearCampanaDescuento(
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.crearCampanaDescuento(body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  // ── NUEVAS RUTAS: REFERENCIAS DE PAGO Y PAGOS RECIBIDOS ──
  @Post('referencias/generar-faltantes')
  @Roles('Admin', 'Director', 'Secretaria')
  async generarReferenciasPagoFaltantes(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.generarReferenciasPagoFaltantes({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('referencias/:referencia')
  @Roles('Admin', 'Director', 'Secretaria')
  async buscarDeudaPorReferencia(
    @Param('referencia') referencia: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.buscarDeudaPorReferencia(referencia, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('deudas-pendientes')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarDeudasPendientes(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('q') q?: string,
    @Query('estado') estado?: string,
    @Query('anio_id') anioId?: string,
    @Query('concepto') concepto?: string,
    @Query('limit') limit?: string,
  ) {
    return this.finanzasService.listarDeudasPendientes({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
      q,
      estado,
      anioId: anioId ? Number(anioId) : undefined,
      concepto,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('cobranzas/:id/historial')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarGestionesCobranza(
    @Param('id') id: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const idCronograma = Number(id);

    if (!Number.isInteger(idCronograma) || idCronograma <= 0) {
      throw new BadRequestException('ID de cobranza inválido.');
    }

    return this.finanzasService.listarGestionesCobranza(idCronograma, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('cobranzas/:id/gestiones')
  @Roles('Admin', 'Director', 'Secretaria')
  async registrarGestionCobranza(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.registrarGestionCobranza(Number(id), body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  @Get('cobranzas/agenda')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarAgendaCobranzas(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('estado') estado?: string,
    @Query('q') q?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
  ) {
    return this.finanzasService.listarAgendaCobranzas({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
      estado,
      q,
      desde,
      hasta,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('pagos-recibidos')
  @Roles('Admin', 'Director', 'Secretaria')
  async registrarPagoRecibido(
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.registrarPagoRecibido(body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  @Post('pagos-recibidos/:id/aplicar')
  @Roles('Admin', 'Director', 'Secretaria')
  async aplicarPagoRecibido(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.aplicarPagoRecibido(Number(id), body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  // ── NUEVAS RUTAS: LISTAR, IDENTIFICAR Y CAMBIAR ESTADO DE PAGOS RECIBIDOS ──
  @Get('pagos-recibidos')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarPagosRecibidos(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
    @Query('q') q?: string,
    @Query('estado') estado?: string,
    @Query('medio') medio?: string,
    @Query('limit') limit?: string,
  ) {
    return this.finanzasService.listarPagosRecibidos({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
      q,
      estado,
      medio,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('pagos-recibidos/:id/identificar')
  @Roles('Admin', 'Director', 'Secretaria')
  async identificarPagoRecibido(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.identificarPagoRecibido(Number(id), body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  @Patch('pagos-recibidos/:id/estado')
  @Roles('Admin', 'Director', 'Secretaria')
  async actualizarEstadoPagoRecibido(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.actualizarEstadoPagoRecibido(Number(id), body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: scope || body.scope,
      colegioId: colegioId ? Number(colegioId) : body.id_colegio,
    });
  }

  // ── RUTA PARA HISTORIAL DE PAGOS RECIBIDOS ──
  @Get('pagos-recibidos/:id/historial')
  @Roles('Admin', 'Director', 'Secretaria')
  async listarHistorialPagoRecibido(
    @Param('id') id: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.listarHistorialPagoRecibido(Number(id), {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  // ── RUTA PARA COMPROBANTE DE PAGO ──
  @Get('pagos/:id/comprobante')
  @Roles('Admin', 'Director', 'Secretaria')
  async obtenerComprobantePago(
    @Param('id') id: string,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.obtenerComprobantePago(Number(id), {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  // ── RUTAS PARA DATOS DE COBRO DEL COLEGIO ──
  @Get('datos-cobro')
  @Roles('Admin', 'Director', 'Secretaria')
  async obtenerDatosCobroColegio(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.obtenerDatosCobroColegio({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Put('datos-cobro')
  @Roles('Admin', 'Director', 'Secretaria')
  async guardarDatosCobroColegio(
    @Body() body: any,
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.guardarDatosCobroColegio(body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  // ── CONCEPTOS ────────────────────────────────────────
  @Get('conceptos')
  @Roles('Admin', 'Director', 'Secretaria')
  async getConceptos(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.finanzasService.getConceptos({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('conceptos')
  @Roles('Admin', 'Director')
  async createConcepto(@Body() body: any, @Request() req) {
    return this.finanzasService.createConcepto(body, {
      userId: req.user.userId,
      rol: req.user.rol,
      scope: body.scope,
      colegioId: body.id_colegio ? Number(body.id_colegio) : undefined,
    });
  }

  @Put('conceptos/:id')
  @Roles('Admin', 'Director')
  async updateConcepto(@Param('id') id: string, @Body() body: any) {
    return this.finanzasService.updateConcepto(Number(id), body);
  }

  @Delete('conceptos/:id')
  @Roles('Admin', 'Director')
  async deleteConcepto(@Param('id') id: string) {
    return this.finanzasService.deleteConcepto(Number(id));
  }
}