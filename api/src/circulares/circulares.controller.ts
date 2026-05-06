import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request, NotFoundException,
} from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CreateCircularDto } from './dto/create-circular.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('circulares')
@UseGuards(AuthGuard('jwt'))
export class CircularesController {
  constructor(
    private readonly circularesService: CircularesService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @Roles('Admin', 'Secretaria', 'Director')
  async create(@Body() dto: CreateCircularDto, @Request() req) {
    return this.circularesService.create(dto, req.user.userId);
  }

  @Get()
  @Roles('Admin', 'Secretaria', 'Director')
  async findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.circularesService.findAll(Number(page), Number(limit));
  }

  @Get('padres')
  @Roles('Apoderado', 'Admin')
  async findForApoderado(@Request() req) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: { persona: { include: { apoderados: true } } },
    });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
    return this.circularesService.findForApoderado(apoderado.id_persona);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.circularesService.findOne(Number(id));
  }
}