import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  ActualizarEventoDto,
  CancelarEventoDto,
  CrearEventoDto,
  ListarEventosDto,
  OpcionesEventosDto,
} from './dto/eventos.dto';
import { EventosService } from './eventos.service';

type EventosRequest = Request & { user: { userId: number } };

@Controller('eventos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  @Roles('Admin', 'Director', 'Secretaria', 'Profesor')
  obtenerEventos(@Req() req: EventosRequest, @Query() query: ListarEventosDto) {
    return this.eventosService.obtenerEventos(req.user.userId, query);
  }

  @Get('opciones')
  @Roles('Admin', 'Director', 'Secretaria')
  obtenerOpciones(
    @Req() req: EventosRequest,
    @Query() query: OpcionesEventosDto,
  ) {
    return this.eventosService.obtenerOpciones(req.user.userId, query);
  }

  @Get(':id')
  @Roles('Admin', 'Director', 'Secretaria', 'Profesor')
  obtenerEvento(
    @Req() req: EventosRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventosService.obtenerEvento(req.user.userId, id);
  }

  @Post()
  @Roles('Admin', 'Director', 'Secretaria')
  crearEvento(@Req() req: EventosRequest, @Body() body: CrearEventoDto) {
    return this.eventosService.crearEvento(req.user.userId, body);
  }

  @Patch(':id')
  @Roles('Admin', 'Director', 'Secretaria')
  actualizarEvento(
    @Req() req: EventosRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarEventoDto,
  ) {
    return this.eventosService.actualizarEvento(req.user.userId, id, body);
  }

  @Post(':id/cancelar')
  @Roles('Admin', 'Director', 'Secretaria')
  cancelarEvento(
    @Req() req: EventosRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelarEventoDto,
  ) {
    return this.eventosService.cancelarEvento(req.user.userId, id, body);
  }

  @Post(':id/realizar')
  @Roles('Admin', 'Director', 'Secretaria')
  realizarEvento(
    @Req() req: EventosRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventosService.realizarEvento(req.user.userId, id);
  }
}
