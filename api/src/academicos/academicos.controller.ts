import {
  Controller, Get, Post, Put, Delete, Param, Query, Body,
  UseGuards, Request, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { AcademicosService } from './academicos.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { SaveAsistenciaDto } from './dto/save-asistencia.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('academicos')
export class AcademicosController {
  constructor(
    private readonly academicosService: AcademicosService,
    private prisma: PrismaService,
  ) {}

  // ── NIVELES ──────────────────────────────────────────
  @Get('niveles')
  getNiveles() {
    return this.academicosService.getNiveles();
  }

  @Post('niveles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createNivel(@Body() body: { nombre_nivel: string }) {
    const existente = await this.prisma.nivel.findFirst({ where: { nombre_nivel: body.nombre_nivel } });
    if (existente) throw new BadRequestException('El nivel ya existe');
    return this.prisma.nivel.create({ data: { nombre_nivel: body.nombre_nivel } });
  }

  @Put('niveles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateNivel(@Param('id') id: string, @Body() body: { nombre_nivel: string }) {
    const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: Number(id) } });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');
    return this.prisma.nivel.update({ where: { id_nivel: Number(id) }, data: { nombre_nivel: body.nombre_nivel } });
  }

  @Delete('niveles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteNivel(@Param('id') id: string) {
    const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: Number(id) } });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');
    // Verificar que no tenga grados asociados
    const grados = await this.prisma.grado.count({ where: { id_nivel: Number(id) } });
    if (grados > 0) throw new BadRequestException('No se puede eliminar un nivel con grados asignados');
    return this.prisma.nivel.delete({ where: { id_nivel: Number(id) } });
  }

  // ── GRADOS ───────────────────────────────────────────
  @Get('grados')
  getGrados(@Query('nivel_id') nivelId: string) {
    return this.academicosService.getGrados(Number(nivelId));
  }

  @Post('grados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createGrado(@Body() body: { nombre_grado: string; id_nivel: number }) {
    const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: body.id_nivel } });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');
    return this.prisma.grado.create({ data: { nombre_grado: body.nombre_grado, id_nivel: body.id_nivel } });
  }

  @Put('grados/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateGrado(@Param('id') id: string, @Body() body: { nombre_grado: string; id_nivel?: number }) {
    const grado = await this.prisma.grado.findUnique({ where: { id_grado: Number(id) } });
    if (!grado) throw new NotFoundException('Grado no encontrado');
    const data: any = { nombre_grado: body.nombre_grado };
    if (body.id_nivel) data.id_nivel = body.id_nivel;
    return this.prisma.grado.update({ where: { id_grado: Number(id) }, data });
  }

  @Delete('grados/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteGrado(@Param('id') id: string) {
    const grado = await this.prisma.grado.findUnique({ where: { id_grado: Number(id) } });
    if (!grado) throw new NotFoundException('Grado no encontrado');
    const secciones = await this.prisma.seccion.count({ where: { id_grado: Number(id) } });
    if (secciones > 0) throw new BadRequestException('No se puede eliminar un grado con secciones asignadas');
    return this.prisma.grado.delete({ where: { id_grado: Number(id) } });
  }

  // ── SECCIONES ────────────────────────────────────────
  @Get('secciones')
async getSecciones(
  @Query('grado_id') gradoId?: string,
  @Query('anio_id') anioId?: string,
) {
  return this.academicosService.getSecciones(
    gradoId ? Number(gradoId) : undefined,
    anioId ? Number(anioId) : undefined,
  );
}

  @Post('secciones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createSeccion(@Body() body: { letra: string; id_grado: number; id_aula: number }) {
    const grado = await this.prisma.grado.findUnique({ where: { id_grado: body.id_grado } });
    if (!grado) throw new NotFoundException('Grado no encontrado');
    return this.prisma.seccion.create({ data: { letra: body.letra, id_grado: body.id_grado, id_aula: body.id_aula } });
  }

  @Put('secciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateSeccion(@Param('id') id: string, @Body() body: { letra?: string; id_aula?: number }) {
    const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: Number(id) } });
    if (!seccion) throw new NotFoundException('Sección no encontrada');
    return this.prisma.seccion.update({ where: { id_seccion: Number(id) }, data: body });
  }

  @Delete('secciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteSeccion(@Param('id') id: string) {
    const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: Number(id) } });
    if (!seccion) throw new NotFoundException('Sección no encontrada');
    const matriculas = await this.prisma.matricula.count({ where: { id_seccion: Number(id), estado_matricula: 'Activo' } });
    if (matriculas > 0) throw new BadRequestException('No se puede eliminar una sección con alumnos matriculados');
    return this.prisma.seccion.delete({ where: { id_seccion: Number(id) } });
  }

  // ── AÑOS LECTIVOS ────────────────────────────────────
  @Get('anios')
  async getAnios() {
    return this.academicosService.getAnios();
  }

  @Post('anios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createAnio(@Body() body: { nombre_anio: string; fecha_inicio: string; fecha_fin: string }) {
    return this.prisma.anioLectivo.create({
      data: {
        nombre_anio: body.nombre_anio,
        fecha_inicio: new Date(body.fecha_inicio),
        fecha_fin: new Date(body.fecha_fin),
        estado: 'Planificación',
      },
    });
  }

  @Put('anios/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateAnio(@Param('id') id: string, @Body() body: any) {
    const anio = await this.prisma.anioLectivo.findUnique({ where: { id_anio: Number(id) } });
    if (!anio) throw new NotFoundException('Año lectivo no encontrado');
    return this.prisma.anioLectivo.update({ where: { id_anio: Number(id) }, data: body });
  }

  // ── ALUMNOS ──────────────────────────────────────────
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

  // ── DOCENTES ─────────────────────────────────────────
  @Get('docentes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async getDocentes() {
    return this.prisma.docente.findMany({ include: { persona: true } });
  }

  @Get('docentes/count')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria', 'Director')
  async getTotalDocentes() {
    return this.academicosService.getTotalDocentes();
  }

  // ── APODERADOS ───────────────────────────────────────
  @Post('apoderados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createApoderado(@Body() dto: CreateApoderadoDto) {
    return this.academicosService.createApoderado(dto);
  }

  // ── MATRÍCULAS ───────────────────────────────────────
  @Post('matriculas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createMatricula(@Body() dto: CreateMatriculaDto) {
    return this.academicosService.createMatricula(dto);
  }

  @Get('matriculas/ultimas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  async getUltimasMatriculas() {
    return this.academicosService.getUltimasMatriculas();
  }

  @Get('matriculas/count')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria', 'Director')
  async getTotalMatriculados(@Query('anio_id') anioId: string) {
    return this.academicosService.getTotalMatriculados(Number(anioId));
  }

  // ── ASISTENCIA ───────────────────────────────────────
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

  // ── DOCENTE (SECCIONES Y HORARIO) ────────────────────
  @Get('docente/secciones')
  @UseGuards(AuthGuard('jwt'))
  async getSeccionesDocente(@Request() req) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: { persona: { include: { docentes: true } } },
    });
    const docente = usuario?.persona?.docentes?.[0];
    if (!docente) throw new NotFoundException('No se encontró docente');
    return this.academicosService.getSeccionesDocente(docente.id_persona, 1);
  }

  @Get('padres/horario')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Apoderado', 'Admin')
  async getHorarioAlumno(@Query('alumno_id') alumnoId: string) {
    return this.academicosService.getHorarioAlumno(Number(alumnoId));
  }

  // ── PADRES (HIJOS Y SECCIÓN) ─────────────────────────
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

  @Get('seccion-alumno')
  @UseGuards(AuthGuard('jwt'))
  async getSeccionAlumno(@Query('alumno_id') alumnoId: string) {
    return this.academicosService.getSeccionAlumno(Number(alumnoId));
  }

  // ── STAFF ────────────────────────────────────────────
  @Get('staff')
  @UseGuards(AuthGuard('jwt'))
  async getDirectorioStaff(@Request() req) {
    return this.academicosService.getDirectorioStaff(req.user.userId);
  }

  // ── ESTADOS DEL PERSONAL ─────────────────────────────
  @Get('personal/estados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async getEstadosPersonal() {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        persona: {
          OR: [
            { docentes: { some: {} } },
            { apoderados: { some: {} } }, // staff también puede estar como apoderado, ajustar si es necesario
          ],
        },
      },
      include: { persona: true },
      orderBy: { ultima_conexion: 'desc' },
    });
    return usuarios.map((u) => ({
      id_usuario: u.id_usuario,
      nombre: `${u.persona.nombres} ${u.persona.apellido_paterno}`,
      estado: u.estado_conexion,
      ultima_conexion: u.ultima_conexion,
    }));
  }

  @Get('areas')
async getAreas() {
  return this.prisma.areaCurricular.findMany({ orderBy: { nombre_area: 'asc' } });
}

@Get('cursos')
async getCursos() {
  return this.prisma.curso.findMany({ include: { area: true }, orderBy: { nombre_curso: 'asc' } });
}

@Post('areas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin')
async createArea(@Body() body: { nombre_area: string }) {
  return this.prisma.areaCurricular.create({ data: { nombre_area: body.nombre_area } });
}

@Post('cursos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin')
async createCurso(@Body() body: { nombre_curso: string; id_area: number }) {
  return this.prisma.curso.create({ data: { nombre_curso: body.nombre_curso, id_area: body.id_area } });
}

@Get('docente/asignaciones')
@UseGuards(AuthGuard('jwt'))
async getAsignacionesDocente(@Request() req) {
  const usuario = await this.prisma.usuario.findUnique({
    where: { id_usuario: req.user.userId },
    include: { persona: { include: { docentes: true } }, rol: true },
  });

  // Si es Admin o Director, devolver todas las asignaciones del año activo
  if (usuario?.rol?.nombre_rol === 'Admin' || usuario?.rol?.nombre_rol === 'Director') {
    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_anio: 1 },
      include: {
        curso: true,
        seccion: { include: { grado: { include: { nivel: true } } } },
      },
    });
    return asignaciones.map((a) => ({
      id_asignacion: a.id_asignacion,
      curso: a.curso.nombre_curso,
      seccion: `${a.seccion.grado.nombre_grado} "${a.seccion.letra}" · ${a.seccion.grado.nivel.nombre_nivel}`,
    }));
  }

  // Para docentes normales, solo sus propias asignaciones
  const docente = usuario?.persona?.docentes?.[0];
  if (!docente) throw new NotFoundException('No se encontró docente');

  const asignaciones = await this.prisma.asignacionDocente.findMany({
    where: { id_docente: docente.id_persona, id_anio: 1 },
    include: {
      curso: true,
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  });

  return asignaciones.map((a) => ({
    id_asignacion: a.id_asignacion,
    curso: a.curso.nombre_curso,
    seccion: `${a.seccion.grado.nombre_grado} "${a.seccion.letra}" · ${a.seccion.grado.nivel.nombre_nivel}`,
  }));
}

}