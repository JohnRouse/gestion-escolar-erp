import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CreateCircularDto } from './dto/create-circular.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { NotFoundException } from '@nestjs/common';
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
  const result = await this.circularesService.findAll(Number(page), Number(limit));
  return {
    ...result,
    data: result.data.map(c => ({
      ...c,
      remitente: c.remitente
        ? {
            id_usuario: c.remitente.id_usuario,
            username: c.remitente.username,
            persona: c.remitente.persona,
          }
        : null,
    })),
  };
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
  const circulares = await this.circularesService.findForApoderado(apoderado.id_persona);
  return circulares.map(c => ({
    ...c,
    remitente: c.remitente
      ? {
          id_usuario: c.remitente.id_usuario,
          username: c.remitente.username,
          persona: c.remitente.persona,
        }
      : null,
  }));
}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.circularesService.findOne(Number(id));
  }
}