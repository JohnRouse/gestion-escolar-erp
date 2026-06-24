import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FinanzasService } from './finanzas.service';
import { StorageService } from '../storage/storage.service';

@Controller('tesoreria/public')
export class FinanzasPublicController {
  constructor(
    private readonly finanzasService: FinanzasService,
    private readonly storageService: StorageService,
  ) {}

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
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP o PDF.'), false);
          return;
        }

        cb(null, true);
      },
    }),
  )
  async reportarPagoPublico(
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    let capturaUrl: string | null = null;

    if (file) {
      const codigoPago =
        String(
          body.referencia_pago ||
            body.codigo_pago ||
            body.id_cronograma ||
            'comprobante',
        )
          .replace(/\s+/g, '-')
          .trim();

      const saved = await this.storageService.saveFile(file, {
        folder: 'comprobantes',
        prefix: 'comprobante',
        entityId: body.id_cronograma,
        filenameBase: codigoPago,
        allowedMimeExtensions: {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'application/pdf': '.pdf',
        },
      });

      capturaUrl = saved.url;
    }

    return this.finanzasService.reportarPagoPublico(body, capturaUrl);
  }
}
