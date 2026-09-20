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
import {
  CitaApoderadoCreateDto,
  CitaApoderadoDestinatariosDto,
  CitaCancelarDto,
} from './citas.dto';
import { CitasService } from './citas.service';

type PortalRequest = Request & {
  user: { userId: number; personaId: number; canal: 'portal-padres' };
};

@Controller('citas/apoderado')
@UseGuards(AuthGuard('jwt-portal'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CitasPortalController {
  constructor(private readonly citas: CitasService) {}

  @Get('hijos')
  children(@Req() req: PortalRequest) {
    return this.citas.parentChildren(req.user.userId);
  }

  @Get('destinatarios')
  recipients(
    @Req() req: PortalRequest,
    @Query() query: CitaApoderadoDestinatariosDto,
  ) {
    return this.citas.parentRecipients(req.user.userId, query.matricula_id);
  }

  @Get()
  appointments(@Req() req: PortalRequest) {
    return this.citas.parentAppointments(req.user.userId);
  }

  @Post()
  create(@Req() req: PortalRequest, @Body() body: CitaApoderadoCreateDto) {
    return this.citas.createParent(req.user.userId, body);
  }

  @Patch(':id/cancelar')
  cancel(
    @Req() req: PortalRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CitaCancelarDto,
  ) {
    return this.citas.parentCancel(req.user.userId, id, body.comentario);
  }
}
