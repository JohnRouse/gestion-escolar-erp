import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  ActualizarAtencionDto,
  AdministrarMedicacionDto,
  CerrarAtencionDto,
  ContactoEnfermeriaDto,
  CrearAtencionDto,
  CrearAutorizacionMedicacionDto,
  EnfermeriaBuscarAlumnoDto,
  EnfermeriaListDto,
  EnfermeriaScopeDto,
  FichaScopeDto,
  GuardarFichaSaludDto,
  RevocarAutorizacionDto,
} from './enfermeria.dto';
import { EnfermeriaService } from './enfermeria.service';

type EnfermeriaRequest = Request & { user: { userId: number } };

@Controller('enfermeria')
@UseGuards(AuthGuard('jwt'))
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EnfermeriaController {
  constructor(private readonly enfermeria: EnfermeriaService) {}

  @Get('atenciones')
  list(@Req() req: EnfermeriaRequest, @Query() query: EnfermeriaListDto) {
    return this.enfermeria.list(req.user.userId, query);
  }

  @Get('atenciones/:id')
  detail(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.enfermeria.detail(req.user.userId, query, id);
  }

  @Post('atenciones')
  create(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Body() body: CrearAtencionDto,
  ) {
    return this.enfermeria.create(req.user.userId, query, body);
  }

  @Patch('atenciones/:id')
  update(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarAtencionDto,
  ) {
    return this.enfermeria.update(req.user.userId, query, id, body);
  }

  @Post('atenciones/:id/contactos')
  contact(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ContactoEnfermeriaDto,
  ) {
    return this.enfermeria.contact(req.user.userId, query, id, body);
  }

  @Post('atenciones/:id/medicacion')
  medication(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdministrarMedicacionDto,
  ) {
    return this.enfermeria.medication(req.user.userId, query, id, body);
  }

  @Post('atenciones/:id/cerrar')
  close(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CerrarAtencionDto,
  ) {
    return this.enfermeria.close(req.user.userId, query, id, body);
  }

  @Get('alumnos/buscar')
  students(
    @Req() req: EnfermeriaRequest,
    @Query() query: EnfermeriaBuscarAlumnoDto,
  ) {
    return this.enfermeria.students(req.user.userId, query);
  }

  @Get('alumnos/:id/ficha')
  record(
    @Req() req: EnfermeriaRequest,
    @Query() query: FichaScopeDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.enfermeria.record(req.user.userId, query, id);
  }

  @Put('alumnos/:id/ficha')
  saveRecord(
    @Req() req: EnfermeriaRequest,
    @Query() query: FichaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarFichaSaludDto,
  ) {
    return this.enfermeria.saveRecord(req.user.userId, query, id, body);
  }

  @Post('alumnos/:id/autorizaciones')
  authorization(
    @Req() req: EnfermeriaRequest,
    @Query() query: FichaScopeDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CrearAutorizacionMedicacionDto,
  ) {
    return this.enfermeria.authorization(req.user.userId, query, id, body);
  }

  @Patch('autorizaciones/:id/revocar')
  revoke(
    @Req() req: EnfermeriaRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RevocarAutorizacionDto,
  ) {
    return this.enfermeria.revoke(req.user.userId, id, body);
  }
}
