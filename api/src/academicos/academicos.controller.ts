import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
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
    const existente = await this.prisma.nivel.findFirst({
      where: { nombre_nivel: body.nombre_nivel },
    });
    if (existente) throw new BadRequestException('El nivel ya existe');
    return this.prisma.nivel.create({ data: { nombre_nivel: body.nombre_nivel } });
  }

  @Put('niveles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateNivel(@Param('id') id: string, @Body() body: { nombre_nivel: string }) {
    const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: Number(id) } });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');
    return this.prisma.nivel.update({
      where: { id_nivel: Number(id) },
      data: { nombre_nivel: body.nombre_nivel },
    });
  }

  @Delete('niveles/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteNivel(@Param('id') id: string) {
    const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: Number(id) } });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');

    const grados = await this.prisma.grado.count({ where: { id_nivel: Number(id) } });
    if (grados > 0) {
      throw new BadRequestException('No se puede eliminar un nivel con grados asignados');
    }

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
    const nivel = await this.prisma.nivel.findUnique({
      where: { id_nivel: body.id_nivel },
    });
    if (!nivel) throw new NotFoundException('Nivel no encontrado');

    return this.prisma.grado.create({
      data: { nombre_grado: body.nombre_grado, id_nivel: body.id_nivel },
    });
  }

  @Put('grados/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateGrado(
    @Param('id') id: string,
    @Body() body: { nombre_grado: string; id_nivel?: number },
  ) {
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

    const secciones = await this.prisma.seccion.count({
      where: { id_grado: Number(id) },
    });

    if (secciones > 0) {
      throw new BadRequestException('No se puede eliminar un grado con secciones asignadas');
    }

    return this.prisma.grado.delete({ where: { id_grado: Number(id) } });
  }

  // ── SECCIONES ────────────────────────────────────────
  @Get('secciones')
  @UseGuards(AuthGuard('jwt'))
  async getSecciones(
    @Request() req,
    @Query('grado_id') gradoId?: string,
    @Query('anio_id') anioId?: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.getSecciones({
      userId: req.user.userId,
      rol: req.user.rol,
      gradoId: gradoId ? Number(gradoId) : undefined,
      anioId: anioId ? Number(anioId) : undefined,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('secciones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createSeccion(
    @Body()
    body: {
      letra: string;
      id_grado: number;
      id_aula: number;
      id_tenant?: number;
      id_colegio?: number;
    },
  ) {
    const grado = await this.prisma.grado.findUnique({
      where: { id_grado: body.id_grado },
    });
    if (!grado) throw new NotFoundException('Grado no encontrado');

    return this.prisma.seccion.create({
      data: {
        letra: body.letra,
        id_grado: body.id_grado,
        id_aula: body.id_aula,
        id_tenant: body.id_tenant,
        id_colegio: body.id_colegio,
      },
    });
  }

  @Put('secciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateSeccion(
    @Param('id') id: string,
    @Body() body: { letra?: string; id_aula?: number },
  ) {
    const seccion = await this.prisma.seccion.findUnique({
      where: { id_seccion: Number(id) },
    });
    if (!seccion) throw new NotFoundException('Sección no encontrada');

    return this.prisma.seccion.update({
      where: { id_seccion: Number(id) },
      data: body,
    });
  }

  @Delete('secciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteSeccion(@Param('id') id: string) {
    const seccion = await this.prisma.seccion.findUnique({
      where: { id_seccion: Number(id) },
    });
    if (!seccion) throw new NotFoundException('Sección no encontrada');

    const matriculas = await this.prisma.matricula.count({
      where: { id_seccion: Number(id), estado_matricula: 'Activo' },
    });

    if (matriculas > 0) {
      throw new BadRequestException('No se puede eliminar una sección con alumnos matriculados');
    }

    return this.prisma.seccion.delete({ where: { id_seccion: Number(id) } });
  }

  @Get('anios')
  @UseGuards(AuthGuard('jwt'))
  async getAnios(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.getAnios({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Post('anios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createAnio(
    @Body()
    body: {
      nombre_anio: string;
      fecha_inicio: string;
      fecha_fin: string;
      id_tenant?: number;
      id_colegio?: number;
    },
  ) {
    return this.prisma.anioLectivo.create({
      data: {
        nombre_anio: body.nombre_anio,
        fecha_inicio: new Date(body.fecha_inicio),
        fecha_fin: new Date(body.fecha_fin),
        estado: 'Planificación',
        id_tenant: body.id_tenant,
        id_colegio: body.id_colegio,
      },
    });
  }

  @Put('anios/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateAnio(@Param('id') id: string, @Body() body: any) {
    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: Number(id) },
    });
    if (!anio) throw new NotFoundException('Año lectivo no encontrado');

    return this.prisma.anioLectivo.update({
      where: { id_anio: Number(id) },
      data: body,
    });
  }

  // ── ALUMNOS ──────────────────────────────────────────
  @Get('alumnos/buscar')
  @UseGuards(AuthGuard('jwt'))
  buscarAlumno(
    @Request() req,
    @Query('dni') dni: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.buscarAlumno({
      dni,
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
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

  @Get('apoderados/buscar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria', 'Director')
  buscarApoderado(@Query('dni') dni: string) {
    return this.academicosService.buscarApoderado(dni);
  }

  // ── MATRÍCULAS ───────────────────────────────────────
  @Post('matriculas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria')
  createMatricula(
    @Body() dto: CreateMatriculaDto & { id_colegio?: number },
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.createMatricula({
      dto,
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : dto.id_colegio,
    });
  }

  @Get('matriculas/ultimas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria', 'Director')
  async getUltimasMatriculas(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.getUltimasMatriculas({
      userId: req.user.userId,
      rol: req.user.rol,
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
  }

  @Get('matriculas/count')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Secretaria', 'Director')
  async getTotalMatriculados(
    @Request() req,
    @Query('anio_id') anioId: string,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    return this.academicosService.getTotalMatriculados({
      userId: req.user.userId,
      rol: req.user.rol,
      anioId: Number(anioId),
      scope,
      colegioId: colegioId ? Number(colegioId) : undefined,
    });
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
    return this.academicosService.saveAsistencia(
      dto.id_seccion,
      dto.fecha,
      dto.asistencias,
    );
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

  @Get('staff')
  @UseGuards(AuthGuard('jwt'))
  async getDirectorioStaff(@Request() req) {
    return this.academicosService.getDirectorioStaff(req.user.userId);
  }

  @Get('personal/estados')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async getEstadosPersonal() {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        persona: {
          OR: [{ docentes: { some: {} } }, { apoderados: { some: {} } }],
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

  // ── ÁREAS Y CURSOS ───────────────────────────────────
  @Get('areas')
  async getAreas() {
    return this.prisma.areaCurricular.findMany({ orderBy: { nombre_area: 'asc' } });
  }

  @Get('cursos')
  async getCursos() {
    return this.prisma.curso.findMany({
      include: { area: true },
      orderBy: { nombre_curso: 'asc' },
    });
  }

  @Post('areas')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createArea(@Body() body: { nombre_area: string }) {
    return this.prisma.areaCurricular.create({
      data: { nombre_area: body.nombre_area },
    });
  }

  @Post('cursos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async createCurso(@Body() body: { nombre_curso: string; id_area: number }) {
    return this.prisma.curso.create({
      data: { nombre_curso: body.nombre_curso, id_area: body.id_area },
    });
  }

  @Put('cursos/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateCurso(
    @Param('id') id: string,
    @Body() body: { nombre_curso: string; id_area?: number },
  ) {
    const curso = await this.prisma.curso.findUnique({ where: { id_curso: Number(id) } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const data: any = { nombre_curso: body.nombre_curso };
    if (body.id_area) data.id_area = body.id_area;

    return this.prisma.curso.update({ where: { id_curso: Number(id) }, data });
  }

  @Delete('cursos/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteCurso(@Param('id') id: string) {
    return this.prisma.curso.delete({ where: { id_curso: Number(id) } });
  }

  @Put('areas/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async updateArea(@Param('id') id: string, @Body() body: { nombre_area: string }) {
    return this.prisma.areaCurricular.update({
      where: { id_area: Number(id) },
      data: { nombre_area: body.nombre_area },
    });
  }

  @Delete('areas/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  async deleteArea(@Param('id') id: string) {
    return this.prisma.areaCurricular.delete({ where: { id_area: Number(id) } });
  }

  @Get('docente/asignaciones')
  @UseGuards(AuthGuard('jwt'))
  async getAsignacionesDocente(@Request() req) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: { persona: { include: { docentes: true } }, rol: true },
    });

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

  // ── PERIODOS ACADÉMICOS / BIMESTRES Y UNIDADES ──────
  @Get('periodos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async getPeriodos(@Query('anio_id') anioId?: string) {
    const idAnio = anioId ? Number(anioId) : 1;

    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: idAnio },
      include: {
        bimestres: {
          orderBy: { numero: 'asc' },
          include: { unidades: { orderBy: { numero: 'asc' } } },
        },
      },
    });

    if (!anio) throw new NotFoundException('Año lectivo no encontrado');

    return {
      id_anio: anio.id_anio,
      nombre_anio: anio.nombre_anio,
      fecha_inicio: anio.fecha_inicio,
      fecha_fin: anio.fecha_fin,
      estado: anio.estado,
      bimestres: anio.bimestres.map((bimestre) => {
        const tieneUnidadAbierta = bimestre.unidades.some((unidad) => unidad.estado_abierto);

        return {
          id_bimestre: bimestre.id_bimestre,
          numero: bimestre.numero,
          fecha_inicio: bimestre.fecha_inicio,
          fecha_fin: bimestre.fecha_fin,
          estado: tieneUnidadAbierta ? 'abierto' : 'cerrado',
          unidades: bimestre.unidades.map((unidad) => ({
            id_unidad: unidad.id_unidad,
            numero: unidad.numero,
            fecha_inicio: unidad.fecha_inicio,
            fecha_fin: unidad.fecha_fin,
            estado_abierto: unidad.estado_abierto,
          })),
        };
      }),
    };
  }

  @Put('bimestres/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async updateBimestre(
    @Param('id') id: string,
    @Body() body: { fecha_inicio?: string; fecha_fin?: string },
  ) {
    const bimestre = await this.prisma.bimestre.findUnique({
      where: { id_bimestre: Number(id) },
    });

    if (!bimestre) throw new NotFoundException('Bimestre no encontrado');

    const data: any = {};
    if (body.fecha_inicio !== undefined) data.fecha_inicio = new Date(body.fecha_inicio);
    if (body.fecha_fin !== undefined) data.fecha_fin = new Date(body.fecha_fin);

    return this.prisma.bimestre.update({
      where: { id_bimestre: Number(id) },
      data,
    });
  }

  @Put('unidades/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async updateUnidad(
    @Param('id') id: string,
    @Body() body: { fecha_inicio?: string; fecha_fin?: string },
  ) {
    const unidad = await this.prisma.unidad.findUnique({
      where: { id_unidad: Number(id) },
    });

    if (!unidad) throw new NotFoundException('Unidad no encontrada');

    const data: any = {};
    if (body.fecha_inicio !== undefined) data.fecha_inicio = new Date(body.fecha_inicio);
    if (body.fecha_fin !== undefined) data.fecha_fin = new Date(body.fecha_fin);

    return this.prisma.unidad.update({
      where: { id_unidad: Number(id) },
      data,
    });
  }

  @Put('unidades/:id/abrir')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async abrirUnidad(@Param('id') id: string) {
    const unidad = await this.prisma.unidad.findUnique({
      where: { id_unidad: Number(id) },
      include: { bimestre: true },
    });

    if (!unidad) throw new NotFoundException('Unidad no encontrada');

    await this.prisma.$transaction(async (tx) => {
      await tx.unidad.updateMany({
        where: { bimestre: { id_anio: unidad.bimestre.id_anio } },
        data: { estado_abierto: false },
      });

      await tx.unidad.update({
        where: { id_unidad: unidad.id_unidad },
        data: { estado_abierto: true },
      });
    });

    return { message: `Unidad ${unidad.numero} abierta correctamente` };
  }

  @Put('unidades/:id/cerrar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin', 'Director')
  async cerrarUnidadConfiguracion(@Param('id') id: string) {
    const unidad = await this.prisma.unidad.findUnique({
      where: { id_unidad: Number(id) },
    });

    if (!unidad) throw new NotFoundException('Unidad no encontrada');

    await this.prisma.unidad.update({
      where: { id_unidad: Number(id) },
      data: { estado_abierto: false },
    });

    return { message: `Unidad ${unidad.numero} cerrada correctamente` };
  }
}
