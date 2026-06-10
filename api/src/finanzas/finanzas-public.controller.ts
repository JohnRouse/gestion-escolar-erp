import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
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

  @Post('reportar-pago')
  @UseInterceptors(
    FileInterceptor('comprobante', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = './uploads/comprobantes';
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname || '').toLowerCase() || '.jpg';
          cb(null, `comprobante-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async reportarPagoPublico(
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    const capturaUrl = file ? `/uploads/comprobantes/${file.filename}` : null;
    return this.finanzasService.reportarPagoPublico(body, capturaUrl);
  }
}