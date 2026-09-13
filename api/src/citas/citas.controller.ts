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
  CitaAcuerdoDto,
  CitaApoderadoCreateDto,
  CitaApoderadoDestinatariosDto,
  CitaCancelarDto,
  CitaCreateDto,
  CitaEstadoDto,
  CitaReprogramarDto,
  CitasDestinatariosDto,
  CitasListDto,
  CitasParticipantesDto,
  CitasResponsablesDto,
  CitasScopeDto,
} from './citas.dto';
import { CitasService } from './citas.service';

type CitasRequest = Request & { user: { userId: number } };

@Controller('citas')
@UseGuards(AuthGuard('jwt'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CitasController {
  constructor(private readonly citas: CitasService) {}

  @Get('apoderado/hijos')
  parentChildren(@Req() req: CitasRequest) {
    return this.citas.parentChildren(req.user.userId);
  }

  @Get('apoderado/destinatarios')
  parentRecipients(
    @Req() req: CitasRequest,
    @Query() query: CitaApoderadoDestinatariosDto,
  ) {
    return this.citas.parentRecipients(req.user.userId, query.matricula_id);
  }

  @Get('apoderado')
  parentAppointments(@Req() req: CitasRequest) {
    return this.citas.parentAppointments(req.user.userId);
  }

  @Post('apoderado')
  createParent(@Req() req: CitasRequest, @Body() body: CitaApoderadoCreateDto) {
    return this.citas.createParent(req.user.userId, body);
  }

  @Patch('apoderado/:id/cancelar')
  parentCancel(
    @Req() req: CitasRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CitaCancelarDto,
  ) {
    return this.citas.parentCancel(req.user.userId, id, body.comentario);
  }

  @Get('participantes')
  participants(
    @Req() req: CitasRequest,
    @Query() query: CitasParticipantesDto,
  ) {
    return this.citas.participants(req.user.userId, query);
  }

  @Get('destinatarios')
  recipients(@Req() req: CitasRequest, @Query() query: CitasDestinatariosDto) {
    return this.citas.recipients(req.user.userId, query);
  }

  @Get('secciones')
  sections(@Req() req: CitasRequest, @Query() query: CitasScopeDto) {
    return this.citas.sections(req.user.userId, query);
  }

  @Get('responsables')
  sectionResponsibles(
    @Req() req: CitasRequest,
    @Query() query: CitasResponsablesDto,
  ) {
    return this.citas.sectionResponsibles(req.user.userId, query);
  }

  @Get()
  list(@Req() req: CitasRequest, @Query() query: CitasListDto) {
    return this.citas.list(req.user.userId, query);
  }

  @Post()
  createInternal(
    @Req() req: CitasRequest,
    @Query() query: CitasScopeDto,
    @Body() body: CitaCreateDto,
  ) {
    return this.citas.createInternal(req.user.userId, query, body);
  }

  @Get(':id')
  detail(
    @Req() req: CitasRequest,
    @Query() query: CitasScopeDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.citas.detail(req.user.userId, query, id);
  }

  @Patch(':id/estado')
  changeState(
    @Req() req: CitasRequest,
    @Query() query: CitasScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CitaEstadoDto,
  ) {
    return this.citas.changeState(req.user.userId, query, id, body);
  }

  @Patch(':id/reprogramar')
  reprogram(
    @Req() req: CitasRequest,
    @Query() query: CitasScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CitaReprogramarDto,
  ) {
    return this.citas.reprogram(req.user.userId, query, id, body);
  }

  @Post(':id/acuerdos')
  addAgreement(
    @Req() req: CitasRequest,
    @Query() query: CitasScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CitaAcuerdoDto,
  ) {
    return this.citas.addAgreement(req.user.userId, query, id, body);
  }
}
