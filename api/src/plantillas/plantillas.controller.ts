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
  NotFoundException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

type AlcancePlantilla =
  | 'institucion'
  | 'nivel'
  | 'grado'
  | 'seccion'
  | 'curso'
  | 'asignacion';

type AplicarPlantillaDto = {
  id_anio: number;
  id_unidad: number;
  id_colegio?: number;
  alcance: AlcancePlantilla;
  id_nivel?: number;
  id_grado?: number;
  id_seccion?: number;
  id_curso?: number;
  id_asignacion?: number;
};

@Controller('plantillas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlantillasController {
  constructor(private prisma: PrismaService) {}

  private toInt(value: any) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }

  private async colegiosPermitidos(req: any) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: req.user.userId },
      include: {
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
        },
      },
    });

    return (usuario?.colegios || []).map((item) => item.colegio.id_colegio);
  }

  private async validarColegio(req: any, colegioId?: number) {
    const permitidos = await this.colegiosPermitidos(req);

    if (!permitidos.length) {
      throw new BadRequestException('Tu usuario no tiene instituciones asignadas.');
    }

    if (colegioId && !permitidos.includes(colegioId)) {
      throw new BadRequestException('No tienes acceso a la institución seleccionada.');
    }

    return {
      colegioId,
      permitidos,
    };
  }

  private async getUnidad(idUnidad: number, idAnio: number) {
    const unidad = await this.prisma.unidad.findFirst({
      where: {
        id_unidad: idUnidad,
        bimestre: { id_anio: idAnio },
      },
      include: { bimestre: true },
    });

    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada para el año lectivo seleccionado.');
    }

    return unidad;
  }

  private getNombrePersona(persona?: any) {
    return [persona?.nombres, persona?.apellido_paterno, persona?.apellido_materno]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private mapAsignacion(asignacion: any, idUnidad?: number) {
    const grado = asignacion.seccion?.grado;
    const nivel = grado?.nivel;
    const docente = this.getNombrePersona(asignacion.docente?.persona) || 'Docente sin nombre';
    const evaluacionesUnidad = idUnidad
      ? (asignacion.evaluaciones || []).filter((item) => item.id_unidad === idUnidad)
      : asignacion.evaluaciones || [];

    return {
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      id_anio: asignacion.id_anio,
      id_colegio: asignacion.id_colegio,
      colegio: asignacion.colegio?.nombre || asignacion.colegio?.nombre_corto || null,
      docente,
      curso: asignacion.curso?.nombre_curso || 'Curso sin nombre',
      seccion: grado
        ? `${grado.nombre_grado} "${asignacion.seccion?.letra}"`
        : `Sección ${asignacion.seccion?.letra || ''}`,
      grado: grado?.nombre_grado || null,
      nivel: nivel?.nombre_nivel || null,
      evaluaciones: evaluacionesUnidad.length,
      cubierta: evaluacionesUnidad.length > 0,
    };
  }

  private buildAsignacionWhere(dto: AplicarPlantillaDto, colegioIdsPermitidos: number[]) {
    if (!dto.id_anio) throw new BadRequestException('Selecciona el año lectivo.');
    if (!dto.id_unidad) throw new BadRequestException('Selecciona la unidad.');

    const colegioIds = dto.id_colegio ? [dto.id_colegio] : colegioIdsPermitidos;

    const where: any = {
      id_anio: Number(dto.id_anio),
      id_colegio: { in: colegioIds },
    };

    if (dto.alcance === 'asignacion') {
      if (!dto.id_asignacion) throw new BadRequestException('Selecciona la asignación docente.');
      where.id_asignacion = Number(dto.id_asignacion);
      return where;
    }

    if (dto.alcance === 'curso') {
      if (!dto.id_curso) throw new BadRequestException('Selecciona el curso.');
      where.id_curso = Number(dto.id_curso);
      return where;
    }

    if (dto.alcance === 'seccion') {
      if (!dto.id_seccion) throw new BadRequestException('Selecciona la sección.');
      where.id_seccion = Number(dto.id_seccion);
      return where;
    }

    if (dto.alcance === 'grado') {
      if (!dto.id_grado) throw new BadRequestException('Selecciona el grado.');
      where.seccion = { grado: { id_grado: Number(dto.id_grado) } };
      return where;
    }

    if (dto.alcance === 'nivel') {
      if (!dto.id_nivel) throw new BadRequestException('Selecciona el nivel.');
      where.seccion = { grado: { id_nivel: Number(dto.id_nivel) } };
      return where;
    }

    return where;
  }

  private async obtenerAsignacionesParaAlcance(
    dto: AplicarPlantillaDto,
    colegioIdsPermitidos: number[],
  ) {
    const where = this.buildAsignacionWhere(dto, colegioIdsPermitidos);

    return this.prisma.asignacionDocente.findMany({
      where,
      include: {
        colegio: true,
        docente: { include: { persona: true } },
        curso: true,
        evaluaciones: {
          where: { id_unidad: Number(dto.id_unidad) },
          select: { id_evaluacion_det: true, id_unidad: true },
        },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
            matriculas: {
              where: {
                id_anio: Number(dto.id_anio),
                estado_matricula: { in: ['Activo', 'Matriculado'] },
              },
              select: { id_matricula: true },
            },
          },
        },
      },
      orderBy: [
        { colegio: { nombre: 'asc' } },
        { seccion: { grado: { id_nivel: 'asc' } } },
        { seccion: { id_grado: 'asc' } },
        { seccion: { letra: 'asc' } },
        { curso: { nombre_curso: 'asc' } },
      ],
    });
  }

  private buildCobertura(asignaciones: any[], idUnidad: number) {
    const mapped = asignaciones.map((item) => this.mapAsignacion(item, idUnidad));
    const cubiertas = mapped.filter((item) => item.cubierta);
    const faltantes = mapped.filter((item) => !item.cubierta);

    const agrupadas = faltantes.reduce((acc: any[], item) => {
      const key = `${item.colegio || 'Institución'}|${item.nivel || 'Nivel'}|${item.grado || 'Grado'}`;
      let grupo = acc.find((g) => g.key === key);

      if (!grupo) {
        grupo = {
          key,
          colegio: item.colegio,
          nivel: item.nivel,
          grado: item.grado,
          items: [],
        };
        acc.push(grupo);
      }

      grupo.items.push(item);
      return acc;
    }, []);

    return {
      total: mapped.length,
      cubiertas: cubiertas.length,
      faltantes: faltantes.length,
      porcentaje: mapped.length ? Math.round((cubiertas.length / mapped.length) * 100) : 0,
      asignaciones: mapped,
      faltantes_agrupadas: agrupadas,
      estado: mapped.length === 0
        ? 'sin_asignaciones'
        : faltantes.length === 0
          ? 'completo'
          : cubiertas.length === 0
            ? 'pendiente'
            : 'parcial',
    };
  }

  @Get()
  @Roles('Admin', 'Director')
  async findAll(
    @Request() req,
    @Query('scope') scope?: string,
    @Query('colegio_id') colegioId?: string,
  ) {
    const idColegio = this.toInt(colegioId);
    const contexto = await this.validarColegio(req, idColegio);

    const where: any = {};

    if (scope === 'all' && !idColegio) {
      where.id_colegio = { in: contexto.permitidos };
    } else if (idColegio) {
      where.id_colegio = idColegio;
    }

    return this.prisma.plantillaEvaluacion.findMany({
      where,
      include: {
        detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } },
        nivel: true,
        curso: true,
        colegio: true,
        tenant: true,
      },
      orderBy: [
        { id_colegio: 'asc' },
        { nombre: 'asc' },
      ],
    });
  }

  @Get('unidades')
  @Roles('Admin', 'Director')
  async unidadesPorAnio(@Query('anio_id') anioId?: string) {
    const idAnio = this.toInt(anioId);
    if (!idAnio) throw new BadRequestException('Selecciona el año lectivo.');

    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: idAnio },
      include: {
        bimestres: {
          include: { unidades: true },
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!anio) throw new NotFoundException('Año lectivo no encontrado.');

    return anio.bimestres
      .flatMap((bimestre) =>
        bimestre.unidades.map((unidad) => ({
          id_unidad: unidad.id_unidad,
          numero: unidad.numero,
          estado_abierto: unidad.estado_abierto,
          id_bimestre: bimestre.id_bimestre,
          bimestre: bimestre.numero,
          label: `Periodo ${bimestre.numero} · Unidad ${unidad.numero}`,
        })),
      )
      .sort((a, b) => a.bimestre - b.bimestre || a.numero - b.numero);
  }

  @Post()
  @Roles('Admin', 'Director')
  async create(@Body() body: {
    nombre: string;
    id_tenant?: number;
    id_colegio?: number;
    id_nivel?: number;
    id_curso?: number;
    detalles: { id_tipo_eval: number; descripcion: string; orden: number }[];
  }) {
    if (!body.nombre?.trim()) {
      throw new BadRequestException('Escribe el nombre de la plantilla.');
    }

    if (!body.detalles?.length) {
      throw new BadRequestException('Agrega al menos una evaluación a la plantilla.');
    }

    return this.prisma.plantillaEvaluacion.create({
      data: {
        nombre: body.nombre.trim(),
        id_tenant: body.id_tenant || null,
        id_colegio: body.id_colegio || null,
        id_nivel: body.id_nivel || null,
        id_curso: body.id_curso || null,
        detalles: { create: body.detalles },
      },
      include: { detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } } },
    });
  }

  @Put(':id')
  @Roles('Admin', 'Director')
  async update(@Param('id') id: string, @Body() body: any) {
    if (!body.nombre?.trim()) {
      throw new BadRequestException('Escribe el nombre de la plantilla.');
    }

    await this.prisma.plantillaEvaluacionDetalle.deleteMany({ where: { id_plantilla: Number(id) } });

    return this.prisma.plantillaEvaluacion.update({
      where: { id_plantilla: Number(id) },
      data: {
        nombre: body.nombre.trim(),
        id_tenant: body.id_tenant || null,
        id_colegio: body.id_colegio || null,
        id_nivel: body.id_nivel || null,
        id_curso: body.id_curso || null,
        detalles: { create: body.detalles || [] },
      },
      include: { detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } } },
    });
  }

  @Delete(':id')
  @Roles('Admin', 'Director')
  async delete(@Param('id') id: string) {
    await this.prisma.plantillaEvaluacionDetalle.deleteMany({ where: { id_plantilla: Number(id) } });
    return this.prisma.plantillaEvaluacion.delete({ where: { id_plantilla: Number(id) } });
  }

  @Post(':id/previsualizar')
  @Roles('Admin', 'Director')
  async previsualizar(
    @Param('id') id: string,
    @Request() req,
    @Body() body: AplicarPlantillaDto,
  ) {
    const idPlantilla = Number(id);
    const idColegio = this.toInt(body.id_colegio);
    const contexto = await this.validarColegio(req, idColegio);
    await this.getUnidad(Number(body.id_unidad), Number(body.id_anio));

    const plantilla = await this.prisma.plantillaEvaluacion.findUnique({
      where: { id_plantilla: idPlantilla },
      include: { detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } } },
    });

    if (!plantilla) throw new NotFoundException('Plantilla no encontrada.');
    if (!plantilla.detalles.length) throw new BadRequestException('La plantilla no tiene evaluaciones configuradas.');

    const asignaciones = await this.obtenerAsignacionesParaAlcance(body, contexto.permitidos);
    const cobertura = this.buildCobertura(asignaciones, Number(body.id_unidad));

    return {
      plantilla: {
        id_plantilla: plantilla.id_plantilla,
        nombre: plantilla.nombre,
        evaluaciones: plantilla.detalles.length,
      },
      cobertura,
    };
  }

  @Post(':id/aplicar-alcance')
  @Roles('Admin', 'Director')
  async aplicarPorAlcance(
    @Param('id') id: string,
    @Request() req,
    @Body() body: AplicarPlantillaDto,
  ) {
    const idPlantilla = Number(id);
    const idColegio = this.toInt(body.id_colegio);
    const contexto = await this.validarColegio(req, idColegio);
    await this.getUnidad(Number(body.id_unidad), Number(body.id_anio));

    const plantilla = await this.prisma.plantillaEvaluacion.findUnique({
      where: { id_plantilla: idPlantilla },
      include: { detalles: { orderBy: { orden: 'asc' } } },
    });

    if (!plantilla) throw new NotFoundException('Plantilla no encontrada.');
    if (!plantilla.detalles.length) throw new BadRequestException('La plantilla no tiene evaluaciones configuradas.');

    const asignaciones = await this.obtenerAsignacionesParaAlcance(body, contexto.permitidos);
    const pendientes = asignaciones.filter((asignacion) => !(asignacion.evaluaciones || []).length);

    let evaluacionesCreadas = 0;
    let notasCreadas = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const asignacion of pendientes) {
        for (const detalle of plantilla.detalles) {
          const evaluacion = await tx.evaluacionDetalle.create({
            data: {
              id_asignacion: asignacion.id_asignacion,
              id_unidad: Number(body.id_unidad),
              id_tipo_eval: detalle.id_tipo_eval,
              descripcion_actividad: detalle.descripcion,
            },
          });

          evaluacionesCreadas++;

          for (const matricula of asignacion.seccion?.matriculas || []) {
            await tx.notaAlumno.create({
              data: {
                id_matricula: matricula.id_matricula,
                id_evaluacion_det: evaluacion.id_evaluacion_det,
                valor_nota: 0,
              },
            });
            notasCreadas++;
          }
        }
      }
    });

    const asignacionesActualizadas = await this.obtenerAsignacionesParaAlcance(body, contexto.permitidos);
    const cobertura = this.buildCobertura(asignacionesActualizadas, Number(body.id_unidad));

    return {
      message: 'Plantilla aplicada correctamente.',
      evaluacionesCreadas,
      notasCreadas,
      asignacionesEncontradas: asignaciones.length,
      asignacionesOmitidas: asignaciones.length - pendientes.length,
      asignacionesAplicadas: pendientes.length,
      cobertura,
    };
  }

  @Get('recomendada')
  @Roles('Admin', 'Director', 'Profesor')
  async getRecomendada(@Query('asignacion_id') asignacionId?: string) {
    const idAsignacion = Number(asignacionId);

    if (!Number.isInteger(idAsignacion) || idAsignacion <= 0) {
      throw new BadRequestException('Selecciona una asignación válida para buscar plantilla.');
    }

    const asignacion = await this.prisma.asignacionDocente.findUnique({
      where: { id_asignacion: idAsignacion },
      include: {
        curso: true,
        seccion: { include: { grado: { include: { nivel: true } } } },
      },
    });

    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    const plantillas = await this.prisma.plantillaEvaluacion.findMany({
      where: {
        OR: [{ id_colegio: asignacion.id_colegio }, { id_colegio: null }],
      },
      include: {
        detalles: { include: { tipo: true }, orderBy: { orden: 'asc' } },
        nivel: true,
        curso: true,
      },
      orderBy: { nombre: 'asc' },
    });

    const porCurso = plantillas.find((plantilla) => plantilla.id_curso === asignacion.id_curso);
    const porNivel = plantillas.find(
      (plantilla) => !plantilla.id_curso && plantilla.id_nivel === asignacion.seccion.grado.id_nivel,
    );
    const global = plantillas.find((plantilla) => !plantilla.id_curso && !plantilla.id_nivel);
    const seleccionada = porCurso || porNivel || global || null;

    return {
      plantilla: seleccionada,
      alcance: seleccionada?.id_curso ? 'curso' : seleccionada?.id_nivel ? 'nivel' : seleccionada ? 'global' : null,
      asignacion: {
        id_asignacion: asignacion.id_asignacion,
        curso: asignacion.curso.nombre_curso,
        nivel: asignacion.seccion.grado.nivel.nombre_nivel,
        grado: asignacion.seccion.grado.nombre_grado,
        seccion: asignacion.seccion.letra,
      },
    };
  }
}