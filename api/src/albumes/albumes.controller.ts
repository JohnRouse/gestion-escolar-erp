import { Controller, Get, Post, Param, Query, Body, UseGuards, Request, NotFoundException, Delete, Put } from '@nestjs/common';
import { AlbumesService } from './albumes.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('albumes')
@UseGuards(AuthGuard('jwt'))
export class AlbumesController {
  constructor(
    private readonly albumesService: AlbumesService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getAlbumes(@Request() req, @Query('seccion_id') seccionId?: string, @Query('q') q?: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
    return this.albumesService.getAlbumes(apoderado.id_persona, seccionId ? Number(seccionId) : undefined, q);
  }

  @Get(':id/fotos')
  async getFotosAlbum(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '15') {
    return this.albumesService.getFotosAlbum(Number(id), Number(page), Number(limit));
  }

  @Get('fotos/:id/comentarios')
  async getComentarios(@Param('id') id: string) {
    return this.albumesService.getComentarios(Number(id));
  }

  @Post('fotos/:id/comentarios')
  async crearComentario(@Request() req, @Param('id') id: string, @Body() body: { texto: string }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
    return this.albumesService.crearComentario(Number(id), apoderado.id_persona, body.texto);
  }

  @Put('fotos/:id/comentarios/:idComentario')
async editarComentario(
  @Request() req,
  @Param('idComentario') idComentario: string,
  @Body() body: { texto: string },
) {
  const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
  const apoderado = usuario?.persona?.apoderados?.[0];
  if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
  return this.albumesService.editarComentario(Number(idComentario), apoderado.id_persona, body.texto);
}

@Delete('fotos/:id/comentarios/:idComentario')
async eliminarComentario(
  @Request() req,
  @Param('idComentario') idComentario: string,
) {
  const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
  const apoderado = usuario?.persona?.apoderados?.[0];
  if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
  return this.albumesService.eliminarComentario(Number(idComentario), apoderado.id_persona);
}

@Post('fotos/:id/reaccionar')
async toggleReaccion(@Request() req, @Param('id') id: string) {
  const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
  const apoderado = usuario?.persona?.apoderados?.[0];
  if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
  return this.albumesService.toggleReaccion(Number(id), apoderado.id_persona);
}

@Get('fotos/:id/reacciones')
async getReacciones(@Request() req, @Param('id') id: string) {
  let idApoderado: number | undefined;
  if (req.user?.userId) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: req.user.userId }, include: { persona: { include: { apoderados: true } } } });
    idApoderado = usuario?.persona?.apoderados?.[0]?.id_persona;
  }
  return this.albumesService.getReacciones(Number(id), idApoderado);
}
}