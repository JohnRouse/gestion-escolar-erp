import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('eventos')
@UseGuards(AuthGuard('jwt'))
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  async obtenerEventos(
    @Query('anio_id') anioId: string,
    @Query('mes') mes: string,
  ) {
    return this.eventosService.obtenerEventos(Number(anioId), Number(mes));
  }

  @Post()
  async crearEvento(@Body() body: any) {
    return this.eventosService.crearEvento(body);
  }
}