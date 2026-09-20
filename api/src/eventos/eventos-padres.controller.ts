import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ListarEventosPadresDto } from './dto/eventos.dto';
import { EventosService } from './eventos.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('eventos/padres')
@UseGuards(AuthGuard('jwt-portal'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventosPadresController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  list(@Req() req: PortalRequest, @Query() query: ListarEventosPadresDto) {
    return this.eventosService.obtenerEventosPadres(req.user.userId, query);
  }
}
