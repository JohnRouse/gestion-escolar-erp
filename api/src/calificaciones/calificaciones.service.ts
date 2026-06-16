import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { SaveNotasDto } from './dto/save-notas.dto';
import { SaveNotasMasivoDto } from './dto/save-notas-masivo.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class CalificacionesService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

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
    const evaluacion = await this.prisma.evaluacionDetalle.findUnique({ where: { id_evaluacion_det: evaluacionId } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');

    const unidad = await this.prisma.unidad.findUnique({ where: { id_unidad: evaluacion.id_unidad } });
    if (!unidad?.estado_abierto) throw new BadRequestException('La unidad no está abierta');

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
      include: {
        curso: true,
        seccion: {
          include: {
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
      },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    const evaluaciones = await this.prisma.evaluacionDetalle.findMany({
      where: { id_asignacion: asignacionId, id_unidad: unidadId },
      include: { tipo: true },
      orderBy: [
        { fecha_evaluacion: 'asc' },
        { id_evaluacion_det: 'asc' },
      ],
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
      const notasValidas = evaluaciones
        .map(ev => fila[ev.id_evaluacion_det])
        .filter(v => v !== null) as number[];
      fila.promedio = notasValidas.length > 0
        ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length
        : null;
      return fila;
    });

    const grado = asignacion.seccion?.grado;
    const nivel = grado?.nivel;
    const seccionNombre = grado
      ? `${grado.nombre_grado} "${asignacion.seccion.letra}"${nivel?.nombre_nivel ? ` · ${nivel.nombre_nivel}` : ''}`
      : asignacion.seccion.letra;

    return {
      asignacion: {
        seccion: seccionNombre,
        curso: asignacion.curso.nombre_curso,
      },
      evaluaciones: evaluaciones.map((ev) => ({
        id: ev.id_evaluacion_det,
        descripcion: ev.descripcion_actividad,
        tipo: ev.tipo?.nombre_tipo,
        nombre_tipo: ev.tipo?.nombre_tipo,
        tipo_evaluacion: ev.tipo
          ? {
              nombre: ev.tipo.nombre_tipo,
              descripcion: ev.tipo.nombre_tipo,
            }
          : null,
      })),
      grilla,
    };
  }

  async saveNotasMasivo(dto: SaveNotasMasivoDto, docenteId: number) {
    const unidad = await this.prisma.unidad.findUnique({ where: { id_unidad: dto.id_unidad } });
    if (!unidad?.estado_abierto) throw new BadRequestException('Unidad cerrada o no encontrada');

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.notas) {
        const evaluacion = await tx.evaluacionDetalle.findUnique({ where: { id_evaluacion_det: item.id_evaluacion_det } });
        if (!evaluacion || evaluacion.id_unidad !== dto.id_unidad) {
          throw new BadRequestException(`Evaluación ${item.id_evaluacion_det} no pertenece a la unidad`);
        }
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

    await this.prisma.unidad.update({
      where: { id_unidad: unidadId },
      data: { estado_abierto: false },
    });

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

    const cursos: any = {};
    for (const mat of matriculas) {
      for (const nota of mat.notas) {
        const cursoNombre = nota.evaluacion.asignacion.curso.nombre_curso;
        if (!cursos[cursoNombre]) cursos[cursoNombre] = { curso: cursoNombre, unidades: {} };
        const unidadId = nota.evaluacion.id_unidad;
        if (!cursos[cursoNombre].unidades[unidadId]) {
          cursos[cursoNombre].unidades[unidadId] = { unidad: nota.evaluacion.unidad.numero, evaluaciones: [] };
        }
        cursos[cursoNombre].unidades[unidadId].evaluaciones.push({
          id: nota.id_evaluacion_det,
          tipo: nota.evaluacion.tipo.nombre_tipo,
          descripcion: nota.evaluacion.descripcion_actividad,
          valor: Number(nota.valor_nota),
        });
      }
    }

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

  // ── Comparativa (evolución, radar, mensaje) ────────
  async getComparativa(alumnoId: number, bimestreId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: { include: { grado: true } } },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

    const idSeccion = matriculaActiva.id_seccion;
    const idAnio = matriculaActiva.id_anio;

    const bimestres = await this.prisma.bimestre.findMany({
      where: { id_anio: idAnio },
      orderBy: { numero: 'asc' },
    });

    const evolucion: { bimestre: number; promedio: number | null }[] = [];

    for (const bim of bimestres) {
      if (bim.numero > bimestreId) break;

      const notas = await this.prisma.notaAlumno.findMany({
        where: {
          matricula: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
          evaluacion: { unidad: { id_bimestre: bim.id_bimestre } },
        },
        select: { valor_nota: true },
      });

      const promedio =
        notas.length > 0
          ? Math.round(
              (notas.reduce((s, n) => s + Number(n.valor_nota), 0) / notas.length) * 10
            ) / 10
          : null;

      evolucion.push({ bimestre: bim.numero, promedio });
    }

    const bimestreActual = bimestres.find(b => b.numero === bimestreId);
    if (!bimestreActual) throw new NotFoundException('Bimestre no encontrado');

    const cursos = await this.prisma.curso.findMany({
      where: {
        asignaciones: {
          some: {
            id_seccion: idSeccion,
            id_anio: idAnio,
          },
        },
      },
      include: {
        asignaciones: {
          where: { id_seccion: idSeccion, id_anio: idAnio },
          include: {
            evaluaciones: {
              where: { unidad: { id_bimestre: bimestreActual.id_bimestre } },
              include: { notas: true },
            },
          },
        },
      },
    });

    const radar: {
      curso: string;
      promedioAlumno: number | null;
      promedioSeccion: number | null;
    }[] = [];

    for (const curso of cursos) {
      const notasAlumno: number[] = [];
      const notasSeccion: number[] = [];

      for (const asignacion of curso.asignaciones) {
        for (const evalDet of asignacion.evaluaciones) {
          for (const nota of evalDet.notas) {
            const valor = Number(nota.valor_nota);
            if (nota.id_matricula === matriculaActiva.id_matricula) {
              notasAlumno.push(valor);
            }
            notasSeccion.push(valor);
          }
        }
      }

      const promedioAlumno =
        notasAlumno.length > 0
          ? Math.round((notasAlumno.reduce((s, v) => s + v, 0) / notasAlumno.length) * 10) / 10
          : null;

      const promedioSeccion =
        notasSeccion.length > 0
          ? Math.round((notasSeccion.reduce((s, v) => s + v, 0) / notasSeccion.length) * 10) / 10
          : null;

      radar.push({ curso: curso.nombre_curso, promedioAlumno, promedioSeccion });
    }

    const cursoDestacado = radar
      .filter(c => c.promedioAlumno !== null && c.promedioSeccion !== null)
      .sort((a, b) => (b.promedioAlumno! - b.promedioSeccion!) - (a.promedioAlumno! - a.promedioSeccion!))[0];

    let mensaje = '';
    if (cursoDestacado) {
      const diff = cursoDestacado.promedioAlumno! - cursoDestacado.promedioSeccion!;
      if (diff > 0) {
        mensaje = `¡Muy bien! En ${cursoDestacado.curso} supera el promedio de su sección por ${diff.toFixed(1)} puntos.`;
      } else if (diff < 0) {
        mensaje = `En ${cursoDestacado.curso} está ${Math.abs(diff).toFixed(1)} puntos por debajo del promedio de su sección.`;
      } else {
        mensaje = `En ${cursoDestacado.curso} está igual que el promedio de su sección.`;
      }
    } else {
      mensaje = 'Aún no hay suficientes datos comparativos.';
    }

    return { evolucion, radar, mensaje };
  }

  // ── Comparativa de unidades por curso ──────────────
  async getUnidadesComparativa(alumnoId: number, bimestreId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: true },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

    const bimestre = await this.prisma.bimestre.findFirst({
      where: { numero: bimestreId, id_anio: matriculaActiva.id_anio },
      include: { unidades: { orderBy: { numero: 'asc' } } },
    });
    if (!bimestre) throw new NotFoundException('Bimestre no encontrado');

    const cursos = await this.prisma.curso.findMany({
      where: {
        asignaciones: { some: { id_seccion: matriculaActiva.id_seccion, id_anio: matriculaActiva.id_anio } },
      },
      include: {
        asignaciones: {
          where: { id_seccion: matriculaActiva.id_seccion, id_anio: matriculaActiva.id_anio },
          include: {
            evaluaciones: {
              where: { unidad: { id_bimestre: bimestre.id_bimestre } },
              include: { notas: { where: { id_matricula: matriculaActiva.id_matricula } } },
            },
          },
        },
      },
    });

    const resultado: {
      curso: string;
      unidades: { unidad: number; promedio: number | null }[];
    }[] = [];

    for (const curso of cursos) {
      const promediosPorUnidad: { unidad: number; promedio: number | null }[] = [];

      for (const unidad of bimestre.unidades) {
        const notas: number[] = [];
        for (const asignacion of curso.asignaciones) {
          for (const evalDet of asignacion.evaluaciones) {
            if (evalDet.id_unidad === unidad.id_unidad) {
              for (const nota of evalDet.notas) {
                notas.push(Number(nota.valor_nota));
              }
            }
          }
        }
        const promedio = notas.length > 0
          ? Math.round((notas.reduce((s, v) => s + v, 0) / notas.length) * 10) / 10
          : null;

        promediosPorUnidad.push({ unidad: unidad.numero, promedio });
      }

      resultado.push({ curso: curso.nombre_curso, unidades: promediosPorUnidad });
    }

    return resultado;
  }

  // ── Comentarios del docente ────────────────────────
  async getComentarios(alumnoId: number, bimestreId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

    const notas = await this.prisma.notaAlumno.findMany({
      where: {
        id_matricula: matriculaActiva.id_matricula,
        comentario: { not: '' },
        evaluacion: {
          unidad: { id_bimestre: bimestreId },
        },
      },
      include: {
        evaluacion: {
          include: {
            tipo: true,
            asignacion: { include: { curso: true } },
          },
        },
      },
      orderBy: { id_nota: 'desc' },
    });

    return notas.map((n) => {
      const valor = Number(n.valor_nota);
      let emocion = 'neutral';
      if (valor >= 14) emocion = 'positiva';
      else if (valor < 11) emocion = 'preocupante';

      return {
        curso: n.evaluacion.asignacion.curso.nombre_curso,
        tipo: n.evaluacion.tipo.nombre_tipo,
        comentario: n.comentario,
        valor_nota: valor,
        emocion,
      };
    });
  }

  // ── Alertas académicas ─────────────────────────────
  async getAlertasAcademicas(alumnoId: number, bimestreId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: { include: { grado: true } } },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

    const idSeccion = matriculaActiva.id_seccion;
    const idAnio = matriculaActiva.id_anio;

    const bimestres = await this.prisma.bimestre.findMany({
      where: { id_anio: idAnio },
      orderBy: { numero: 'asc' },
    });

    const bimestreActual = bimestres.find(b => b.numero === bimestreId);
    const bimestreAnterior = bimestres.find(b => b.numero === bimestreId - 1);

    if (!bimestreActual) throw new NotFoundException('Bimestre no encontrado');

    const cursos = await this.prisma.curso.findMany({
      where: {
        asignaciones: {
          some: { id_seccion: idSeccion, id_anio: idAnio },
        },
      },
      include: {
        asignaciones: {
          where: { id_seccion: idSeccion, id_anio: idAnio },
          include: {
            evaluaciones: {
              include: {
                notas: true,
                unidad: true,
              },
            },
          },
        },
      },
    });

    const alertas: {
      curso: string;
      promedioActual: number | null;
      promedioAnterior: number | null;
      promedioSeccion: number | null;
      diferencia: number | null;
      tendencia: 'mejora' | 'bajada' | 'estable' | 'sin_datos';
      mensaje: string;
    }[] = [];

    for (const curso of cursos) {
      const notasActuales: number[] = [];
      const notasSeccion: number[] = [];

      for (const asignacion of curso.asignaciones) {
        for (const evalDet of asignacion.evaluaciones) {
          if (evalDet.unidad.id_bimestre === bimestreActual.id_bimestre) {
            for (const nota of evalDet.notas) {
              const valor = Number(nota.valor_nota);
              notasSeccion.push(valor);
              if (nota.id_matricula === matriculaActiva.id_matricula) {
                notasActuales.push(valor);
              }
            }
          }
        }
      }

      const promedioActual = notasActuales.length > 0
        ? Math.round((notasActuales.reduce((s, v) => s + v, 0) / notasActuales.length) * 10) / 10
        : null;

      const promedioSeccion = notasSeccion.length > 0
        ? Math.round((notasSeccion.reduce((s, v) => s + v, 0) / notasSeccion.length) * 10) / 10
        : null;

      let promedioAnterior: number | null = null;
      if (bimestreAnterior) {
        const notasAnteriores: number[] = [];
        for (const asignacion of curso.asignaciones) {
          for (const evalDet of asignacion.evaluaciones) {
            if (evalDet.unidad.id_bimestre === bimestreAnterior.id_bimestre) {
              for (const nota of evalDet.notas) {
                if (nota.id_matricula === matriculaActiva.id_matricula) {
                  notasAnteriores.push(Number(nota.valor_nota));
                }
              }
            }
          }
        }
        promedioAnterior = notasAnteriores.length > 0
          ? Math.round((notasAnteriores.reduce((s, v) => s + v, 0) / notasAnteriores.length) * 10) / 10
          : null;
      }

      let diferencia: number | null = null;
      let tendencia: 'mejora' | 'bajada' | 'estable' | 'sin_datos' = 'sin_datos';
      let mensaje = '';

      if (promedioActual !== null && promedioAnterior !== null) {
        diferencia = Math.round((promedioActual - promedioAnterior) * 10) / 10;
        if (diferencia > 0.5) {
          tendencia = 'mejora';
          mensaje = `${curso.nombre_curso} subió ${diferencia.toFixed(1)} puntos. ¡Sigue así!`;
        } else if (diferencia < -0.5) {
          tendencia = 'bajada';
          mensaje = `${curso.nombre_curso} bajó ${Math.abs(diferencia).toFixed(1)} puntos respecto al bimestre anterior.`;
        } else {
          tendencia = 'estable';
          mensaje = `${curso.nombre_curso} se mantiene estable.`;
        }
      } else if (promedioActual !== null) {
        if (promedioSeccion !== null) {
          diferencia = Math.round((promedioActual - promedioSeccion) * 10) / 10;
          if (diferencia > 1) {
            tendencia = 'mejora';
            mensaje = `${curso.nombre_curso} supera el promedio de la sección por ${diferencia.toFixed(1)} puntos.`;
          } else if (diferencia < -1) {
            tendencia = 'bajada';
            mensaje = `${curso.nombre_curso} está ${Math.abs(diferencia).toFixed(1)} puntos bajo el promedio de la sección.`;
          } else {
            tendencia = 'estable';
            mensaje = `${curso.nombre_curso} está cerca del promedio de la sección.`;
          }
        } else {
          mensaje = `${curso.nombre_curso}: ${promedioActual.toFixed(1)} en este bimestre.`;
        }
      }

      if (promedioActual !== null) {
        alertas.push({
          curso: curso.nombre_curso,
          promedioActual,
          promedioAnterior,
          promedioSeccion,
          diferencia,
          tendencia,
          mensaje,
        });
      }
    }

    alertas.sort((a, b) => {
      const orden = { bajada: 0, mejora: 1, estable: 2, sin_datos: 3 };
      return orden[a.tendencia] - orden[b.tendencia];
    });

    return alertas;
  }

  // ── Libreta bimestral ──────────────────────────────
  async getLibreta(alumnoId: number, bimestreId: number) {
  const matriculaActiva = await this.prisma.matricula.findFirst({
    where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
    include: {
      estudiante: { include: { persona: true } },
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  });
  if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

  // Obtener las notas del bimestre (reutiliza el método existente)
  const notas = await this.getNotasAlumno(alumnoId, bimestreId);

  // Comentario bimestral del tutor
  const comentarioBimestral = await this.prisma.comentarioBimestral.findFirst({
  where: {
    matricula: {
      id_estudiante: alumnoId,
      estado_matricula: 'Activo',
    },
    id_bimestre: bimestreId,
  },
  include: { docente: { include: { persona: true } } },
});

  const comentarioTutor = comentarioBimestral
    ? {
        docente: `${comentarioBimestral.docente.persona.nombres} ${comentarioBimestral.docente.persona.apellido_paterno}`,
        comentario: comentarioBimestral.comentario,
      }
    : null;

  // Mapear cursos con docente
  const cursosConDocente = await Promise.all(
    notas.map(async (curso: any) => {
      const cursoData = await this.prisma.curso.findFirst({
        where: { nombre_curso: curso.curso },
      });
      let docente = 'Docente no asignado';
      if (cursoData) {
        const asignacion = await this.prisma.asignacionDocente.findFirst({
          where: {
            id_seccion: matriculaActiva.id_seccion,
            id_curso: cursoData.id_curso,
          },
          include: { docente: { include: { persona: true } } },
        });
        if (asignacion) {
          docente = `${asignacion.docente.persona.nombres} ${asignacion.docente.persona.apellido_paterno}`;
        }
      }
      return {
        nombre: curso.curso,
        promedioBimestre: curso.promedioBimestre,
        docente,
        unidades: curso.unidades.map((u: any) => ({
          numero: u.unidad,
          promedio: u.promedioUnidad,
          evaluaciones: u.evaluaciones.map((e: any) => ({
            tipo: e.tipo,
            descripcion: e.descripcion,
            valor: e.valor,
          })),
        })),
      };
    })
  );

  // Promedio general del bimestre
  const promedios = cursosConDocente
    .filter((c: any) => c.promedioBimestre !== null)
    .map((c: any) => c.promedioBimestre);
  const promedioGeneral = promedios.length > 0
    ? Math.round((promedios.reduce((a: number, b: number) => a + b, 0) / promedios.length) * 10) / 10
    : null;

  return {
    alumno: `${matriculaActiva.estudiante.persona.nombres} ${matriculaActiva.estudiante.persona.apellido_paterno}`,
    grado: `${matriculaActiva.seccion.grado.nombre_grado} ${matriculaActiva.seccion.letra}`,
    nivel: matriculaActiva.seccion.grado.nivel.nombre_nivel,
    bimestre: bimestreId,
    promedioGeneral,
    comentarioTutor,
    cursos: cursosConDocente,
  };
}

async deleteEvaluacion(id: number) {
  const evaluacion = await this.prisma.evaluacionDetalle.findUnique({
    where: { id_evaluacion_det: id },
    include: { notas: true },
  });
  if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
  if (evaluacion.notas.length > 0) {
    throw new BadRequestException('No se puede eliminar una evaluación con notas registradas');
  }
  return this.prisma.evaluacionDetalle.delete({ where: { id_evaluacion_det: id } });
}

}