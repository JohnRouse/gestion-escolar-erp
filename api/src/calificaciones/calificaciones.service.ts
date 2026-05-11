import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { SaveNotasDto } from './dto/save-notas.dto';
import { SaveNotasMasivoDto } from './dto/save-notas-masivo.dto';

@Injectable()
export class CalificacionesService {
  constructor(private prisma: PrismaService) {}

  // ── Evaluaciones ────────────────────────────────
  async createEvaluacion(dto: CreateEvaluacionDto) {
    return this.prisma.evaluacionDetalle.create({
      data: {
        id_asignacion: dto.id_asignacion,
        id_unidad: dto.id_unidad,
        id_tipo_eval: dto.id_tipo_eval,
        descripcion_actividad: dto.descripcion_actividad,
        fecha_evaluacion: dto.fecha_evaluacion ? new Date(dto.fecha_evaluacion) : undefined,
      },
    });
  }

  async getEvaluaciones(asignacionId: number, unidadId: number) {
    return this.prisma.evaluacionDetalle.findMany({
      where: { id_asignacion: asignacionId, id_unidad: unidadId },
      include: { tipo: true },
      orderBy: { fecha_evaluacion: 'asc' },
    });
  }

  async getEvaluacionNotas(evaluacionId: number) {
    const evaluacion = await this.prisma.evaluacionDetalle.findUnique({
      where: { id_evaluacion_det: evaluacionId },
      include: {
        asignacion: { include: { seccion: true, curso: true } },
        notas: {
          include: { matricula: { include: { estudiante: { include: { persona: true } } } } },
        },
      },
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    return evaluacion;
  }

  async saveNotasIndividual(evaluacionId: number, dto: SaveNotasDto) {
    // Validar que la evaluación exista
    const evaluacion = await this.prisma.evaluacionDetalle.findUnique({ where: { id_evaluacion_det: evaluacionId } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    // Validar que la unidad esté abierta
    const unidad = await this.prisma.unidad.findUnique({ where: { id_unidad: evaluacion.id_unidad } });
    if (!unidad?.estado_abierto) throw new BadRequestException('La unidad no está abierta');

    // Validar que todas las matrículas correspondan a la sección de la asignación y estén activas
    const asignacion = await this.prisma.asignacionDocente.findUnique({ where: { id_asignacion: evaluacion.id_asignacion } });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    const matriculasValidas = await this.prisma.matricula.findMany({
      where: { id_seccion: asignacion.id_seccion, id_anio: asignacion.id_anio, estado_matricula: 'Activo' },
      select: { id_matricula: true },
    });
    const idsValidas = new Set(matriculasValidas.map(m => m.id_matricula));

    for (const nota of dto.notas) {
      if (!idsValidas.has(nota.id_matricula)) {
        throw new BadRequestException(`Matrícula ${nota.id_matricula} no válida para esta sección`);
      }
    }

    // Guardar notas (sin upsert compuesto)
    for (const nota of dto.notas) {
      const existente = await this.prisma.notaAlumno.findFirst({
        where: {
          id_matricula: nota.id_matricula,
          id_evaluacion_det: evaluacionId,
        },
      });

      if (existente) {
        await this.prisma.notaAlumno.update({
          where: { id_nota: existente.id_nota },
          data: {
            valor_nota: nota.valor_nota,
            comentario: nota.comentario,
          },
        });
      } else {
        await this.prisma.notaAlumno.create({
          data: {
            id_matricula: nota.id_matricula,
            id_evaluacion_det: evaluacionId,
            valor_nota: nota.valor_nota,
            comentario: nota.comentario,
          },
        });
      }
    }
    return { message: 'Notas guardadas correctamente', total: dto.notas.length };
  }

  // ── Modo Grilla (Unidad completa) ─────────────────
  async getGrillaUnidad(unidadId: number, asignacionId: number) {
    const asignacion = await this.prisma.asignacionDocente.findUnique({
      where: { id_asignacion: asignacionId },
      include: { seccion: true, curso: true },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    const evaluaciones = await this.prisma.evaluacionDetalle.findMany({
      where: { id_asignacion: asignacionId, id_unidad: unidadId },
      orderBy: { fecha_evaluacion: 'asc' },
    });

    const matriculas = await this.prisma.matricula.findMany({
      where: { id_seccion: asignacion.id_seccion, id_anio: asignacion.id_anio, estado_matricula: 'Activo' },
      include: {
        estudiante: { include: { persona: true } },
        notas: {
          where: { evaluacion: { id_unidad: unidadId } },
          include: { evaluacion: true },
        },
      },
    });

    const grilla = matriculas.map(mat => {
      const fila: any = {
        id_matricula: mat.id_matricula,
        alumno: `${mat.estudiante.persona.nombres} ${mat.estudiante.persona.apellido_paterno}`,
      };
      evaluaciones.forEach(ev => {
        const nota = mat.notas.find(n => n.id_evaluacion_det === ev.id_evaluacion_det);
        fila[ev.id_evaluacion_det] = nota ? Number(nota.valor_nota) : null;
      });
      // Calcular promedio de la unidad (solo evaluaciones con nota)
      const notasValidas = evaluaciones
        .map(ev => fila[ev.id_evaluacion_det])
        .filter(v => v !== null) as number[];
      fila.promedio = notasValidas.length > 0
        ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
        : null;
      return fila;
    });

    return {
      asignacion: { seccion: asignacion.seccion.letra, curso: asignacion.curso.nombre_curso },
      evaluaciones: evaluaciones.map(ev => ({ id: ev.id_evaluacion_det, descripcion: ev.descripcion_actividad })),
      grilla,
    };
  }

  async saveNotasMasivo(dto: SaveNotasMasivoDto, docenteId: number) {
    // Validar que la unidad esté abierta y pertenezca a una asignación del docente
    const unidad = await this.prisma.unidad.findUnique({ where: { id_unidad: dto.id_unidad } });
    if (!unidad?.estado_abierto) throw new BadRequestException('Unidad cerrada o no encontrada');

    // Obtener todas las asignaciones del docente para ese año y unidad
    // Para simplificar, validaremos que cada evaluación corresponda a una asignación del docente.
    // Pero podemos obtener las asignaciones del docente a partir del token.
    // El controlador ya verificará que el docente esté asignado.

    // Ejecutar las actualizaciones en una transacción
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.notas) {
        // Verificar que la evaluación corresponda a la unidad
        const evaluacion = await tx.evaluacionDetalle.findUnique({ where: { id_evaluacion_det: item.id_evaluacion_det } });
        if (!evaluacion || evaluacion.id_unidad !== dto.id_unidad) {
          throw new BadRequestException(`Evaluación ${item.id_evaluacion_det} no pertenece a la unidad`);
        }
        // Upsert de la nota
         // En lugar de upsert, buscar primero
        const existente = await tx.notaAlumno.findFirst({
          where: {
            id_matricula: item.id_matricula,
            id_evaluacion_det: item.id_evaluacion_det,
          },
        });

        if (existente) {
          await tx.notaAlumno.update({
            where: { id_nota: existente.id_nota },
            data: {
              valor_nota: item.valor_nota,
              comentario: item.comentario,
            },
          });
        } else {
          await tx.notaAlumno.create({
            data: {
              id_matricula: item.id_matricula,
              id_evaluacion_det: item.id_evaluacion_det,
              valor_nota: item.valor_nota,
              comentario: item.comentario,
            },
          });
        }
      }
    });
    return { message: 'Notas masivas guardadas correctamente', total: dto.notas.length };
  }

  // ── Cierre de unidad ──────────────────────────────
  async cerrarUnidad(unidadId: number) {
    const unidad = await this.prisma.unidad.findUnique({ where: { id_unidad: unidadId } });
    if (!unidad) throw new NotFoundException('Unidad no encontrada');
    if (!unidad.estado_abierto) throw new BadRequestException('La unidad ya está cerrada');

    // Calcular promedios de unidad para cada alumno (esto se hace al cerrar, o se puede calcular bajo demanda)
    // Por ahora, simplemente cerramos la unidad
    await this.prisma.unidad.update({
      where: { id_unidad: unidadId },
      data: { estado_abierto: false },
    });

    // Opcionalmente, calcular y guardar los promedios de unidad en una tabla de resumen.
    // Pero como no tenemos tabla de resumen, solo devolvemos éxito.
    return { message: 'Unidad cerrada correctamente' };
  }

  // ── Consulta para padres ──────────────────────────
  async getNotasAlumno(alumnoId: number, bimestreId: number) {
    const matriculas = await this.prisma.matricula.findMany({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: {
        seccion: { include: { grado: true } },
        notas: {
          where: { evaluacion: { unidad: { id_bimestre: bimestreId } } },
          include: {
            evaluacion: {
              include: { tipo: true, unidad: true, asignacion: { include: { curso: true } } },
            },
          },
        },
      },
    });

    // Estructurar por curso y unidad
    const cursos: any = {};
    for (const mat of matriculas) {
      for (const nota of mat.notas) {
  const cursoNombre = nota.evaluacion.asignacion.curso.nombre_curso;
  if (!cursos[cursoNombre]) cursos[cursoNombre] = { curso: cursoNombre, unidades: {} };
  const unidadId = nota.evaluacion.id_unidad;
  if (!cursos[cursoNombre].unidades[unidadId]) {
    cursos[cursoNombre].unidades[unidadId] = { unidad: nota.evaluacion.unidad.numero, evaluaciones: [] };
  }
  // Agregar el id_evaluacion_det junto con los demás datos
  cursos[cursoNombre].unidades[unidadId].evaluaciones.push({
    id: nota.id_evaluacion_det, // ← Agregar esta línea
    tipo: nota.evaluacion.tipo.nombre_tipo,
    descripcion: nota.evaluacion.descripcion_actividad,
    valor: Number(nota.valor_nota),
  });
}
    }

    // Calcular promedios por unidad y bimestre
    const resultado = Object.values(cursos).map((curso: any) => {
      const unidades = Object.values(curso.unidades).map((unidad: any) => {
        const notasUnidad = unidad.evaluaciones.map((e: any) => e.valor);
        const promedioUnidad = notasUnidad.length > 0 ? notasUnidad.reduce((a: number, b: number) => a + b, 0) / notasUnidad.length : null;
        return { ...unidad, promedioUnidad };
      });
      const promediosUnidad = unidades.map((u: any) => u.promedioUnidad).filter((p: any) => p !== null);
      const promedioBimestre = promediosUnidad.length > 0 ? promediosUnidad.reduce((a: number, b: number) => a + b, 0) / promediosUnidad.length : null;
      return { curso: curso.curso, unidades, promedioBimestre };
    });

    return resultado;
  }
}