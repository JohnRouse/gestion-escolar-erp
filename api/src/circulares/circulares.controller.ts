import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  COMUNICADO_ATTACHMENT_MIME_TYPES,
  COMUNICADO_MAX_ADJUNTOS_POR_CARGA,
  COMUNICADO_MAX_BYTES_POR_ADJUNTO,
} from './comunicados-attachments';
import { CircularesService } from './circulares.service';
import {
  CreateCircularDto,
  ListarCircularesDto,
  OpcionesCircularesDto,
} from './dto/create-circular.dto';

type InternalRequest = Request & { user: { userId: number } };

@Controller('circulares')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Director', 'Secretaria')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CircularesController {
  constructor(private readonly circularesService: CircularesService) {}

  @Get()
  findAll(@Req() req: InternalRequest, @Query() query: ListarCircularesDto) {
    return this.circularesService.findAll(req.user.userId, query);
  }

  @Get('opciones')
  getOptions(
    @Req() req: InternalRequest,
    @Query() query: OpcionesCircularesDto,
  ) {
    return this.circularesService.getOptions(req.user.userId, query);
  }

  @Get('count')
  getTotal(@Req() req: InternalRequest, @Query() query: ListarCircularesDto) {
    return this.circularesService.getTotalCirculares(req.user.userId, query);
  }

  @Get(':id')
  findOne(@Req() req: InternalRequest, @Param('id', ParseIntPipe) id: number) {
    return this.circularesService.findOne(req.user.userId, id);
  }

  @Post()
  create(@Req() req: InternalRequest, @Body() dto: CreateCircularDto) {
    return this.circularesService.create(dto, req.user.userId);
  }

  @Post(':id/adjuntos')
  @UseInterceptors(
    FilesInterceptor('adjuntos', COMUNICADO_MAX_ADJUNTOS_POR_CARGA, {
      storage: memoryStorage(),
      limits: { fileSize: COMUNICADO_MAX_BYTES_POR_ADJUNTO },
      fileFilter: (_req, file, callback) => {
        if (!COMUNICADO_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'Solo se permiten PDF, imágenes y documentos de Office.',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  addAttachments(
    @Req() req: InternalRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.circularesService.addAttachments(req.user.userId, id, files);
  }
}
