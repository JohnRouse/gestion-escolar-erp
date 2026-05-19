import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { CitasService } from './citas.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('citas')
@UseGuards(AuthGuard('jwt'))
export class CitasController {
  constructor(private readonly citasService: CitasService,
  private prisma: PrismaService,
  ) {}

  @Post()
  async solicitarCita(
    @Request() req,
    @Body() body: {
      id_staff: number;
      fecha: string;
      hora_inicio: string;
      hora_fin: string;
      motivo?: string;
    },
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: { persona: { include: { apoderados: true } } },
    });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');

    return this.citasService.solicitarCita(
      apoderado.id_persona,
      body.id_staff,
      body.fecha,
      body.hora_inicio,
      body.hora_fin,
      body.motivo,
    );
  }

  @Get('apoderado')
  async obtenerCitasApoderado(@Request() req) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: { persona: { include: { apoderados: true } } },
    });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');

    return this.citasService.obtenerCitasApoderado(apoderado.id_persona);
  }

  @Put(':id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body() body: { estado: string },
  ) {
    return this.citasService.cambiarEstadoCita(Number(id), body.estado);
  }
}