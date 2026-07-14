import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ColegiosService } from './colegios.service';

@Controller('colegios')
@UseGuards(AuthGuard('jwt'))
export class ColegiosController {
  constructor(
    private readonly colegiosService:
      ColegiosService,
  ) {}

  @Get('mis-colegios')
  async getMisColegios(@Request() req) {
    return this.colegiosService.getMisColegios(
      req.user.userId,
    );
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (
        _req: any,
        file: any,
        callback: any,
      ) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowed.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Solo se permiten imágenes JPG, PNG o WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async subirLogo(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    const colegioId = Number(id);

    if (
      !Number.isInteger(colegioId) ||
      colegioId <= 0
    ) {
      throw new BadRequestException(
        'El colegio seleccionado no es válido.',
      );
    }

    if (!file) {
      throw new BadRequestException(
        'No se recibió la imagen.',
      );
    }

    return this.colegiosService.actualizarLogo(
      req.user.userId,
      req.user.rol,
      colegioId,
      file,
    );
  }

  @Delete(':id/logo')
  async quitarLogo(
    @Request() req,
    @Param('id') id: string,
  ) {
    const colegioId = Number(id);

    if (
      !Number.isInteger(colegioId) ||
      colegioId <= 0
    ) {
      throw new BadRequestException(
        'El colegio seleccionado no es válido.',
      );
    }

    return this.colegiosService.quitarLogo(
      req.user.userId,
      req.user.rol,
      colegioId,
    );
  }
}
