import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { AcademicosService } from './academicos.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAsistenciaDto } from './dto/save-asistencia.dto';

@Controller('academicos')
export class AcademicosController {
  constructor(
  private readonly academicosService: AcademicosService,
  private prisma: PrismaService,  // <--- agregar esta línea
) {}

  @Get('niveles')
  getNiveles() {
    return this.academicosService.getNiveles();
  }

  @Get('grados')
  getGrados(@Query('nivel_id') nivelId: string) {
    return this.academicosService.getGrados(Number(nivelId));
  }

  @Get('secciones')
  getSecciones(
    @Query('grado_id') gradoId: string,
    @Query('anio_id') anioId: string,
  ) {
    return this.academicosService.getSecciones(Number(gradoId), Number(anioId));
  }

  @Get('alumnos/buscar')
  buscarAlumno(@Query('dni') dni: string) {
    return this.academicosService.buscarAlumno(dni);
  }

  @Post('alumnos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createAlumno(@Body() dto: CreateAlumnoDto) {
    return this.academicosService.createAlumno(dto);
  }

  @Post('apoderados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createApoderado(@Body() dto: CreateApoderadoDto) {
    return this.academicosService.createApoderado(dto);
  }

  @Post('matriculas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createMatricula(@Body() dto: CreateMatriculaDto) {
    return this.academicosService.createMatricula(dto);
  }

  @Get('docente/secciones')
@UseGuards(AuthGuard('jwt'))
async getSeccionesDocente(@Request() req) {
  // El token JWT tiene 'userId' que es id_usuario; pero docente usa id_persona.
  // Debemos obtener el id_persona del docente a partir del usuario.
  const usuario = await this.prisma.usuario.findUnique({
    where: { id_usuario: req.user.userId },
    include: { persona: { include: { docentes: true } } },
  });
  const docente = usuario?.persona?.docentes?.[0];
  if (!docente) throw new NotFoundException('No se encontró docente');
  return this.academicosService.getSeccionesDocente(docente.id_persona, /* anio activo */ 1);
}

@Get('asistencia')
@UseGuards(AuthGuard('jwt'))
async getAsistencia(@Query('seccion_id') seccionId: string, @Query('fecha') fecha: string) {
  return this.academicosService.getAsistencia(Number(seccionId), fecha);
}

@Post('asistencia')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Profesor', 'Director')
async saveAsistencia(@Body() dto: SaveAsistenciaDto) {
  return this.academicosService.saveAsistencia(dto.id_seccion, dto.fecha, dto.asistencias);
}

@Get('padres/asistencia')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Apoderado', 'Admin')
async getAsistenciaAlumno(
  @Query('alumno_id') alumnoId: string,
  @Query('desde') desde: string,
  @Query('hasta') hasta: string,
) {
  return this.academicosService.getAsistenciaAlumno(Number(alumnoId), desde, hasta);
}

@Get('padres/hijos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Apoderado', 'Admin')
async getHijosApoderado(@Request() req) {
  const usuario = await this.prisma.usuario.findUnique({
    where: { id_usuario: req.user.userId },
    include: { persona: { include: { apoderados: true } } },
  });
  const apoderado = usuario?.persona?.apoderados?.[0];
  if (!apoderado) throw new NotFoundException('Apoderado no encontrado');
  return this.academicosService.getHijosApoderado(apoderado.id_persona);
}

@Get('padres/horario')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Apoderado', 'Admin')
async getHorarioAlumno(@Query('alumno_id') alumnoId: string) {
  return this.academicosService.getHorarioAlumno(Number(alumnoId));
}

@Get('matriculas/count')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Secretaria', 'Director')
async getTotalMatriculados(@Query('anio_id') anioId: string) {
  return this.academicosService.getTotalMatriculados(Number(anioId));
}

@Get('docentes/count')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Secretaria', 'Director')
async getTotalDocentes() {
  return this.academicosService.getTotalDocentes();
}

}