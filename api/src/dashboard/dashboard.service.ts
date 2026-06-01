import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DashboardParams {
  userId: number;
  rol: string;
  anioId?: number;
  bimestreId?: number;
  scope?: string;
  colegioId?: number;
}

interface DashboardScope {
  tipo: 'todos' | 'colegio';
  tenantId: number | null;
  colegioIds: number[];
  colegios: {
    id_colegio: number;
    id_tenant: number;
    nombre: string;
    nombre_corto: string | null;
    codigo: string | null;
    color_principal: string | null;
    niveles: string[];
  }[];
  puedeVerConsolidado: boolean;
}

type EstadoCarga =
  | 'completo'
  | 'avanzado'
  | 'en_proceso'
  | 'pendiente'
  | 'sin_evaluaciones';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private formatSeccion(seccion: any) {
    if (!seccion) return 'Sin sección';

    const grado = seccion.grado?.nombre_grado || 'Grado';
    const nivel = seccion.grado?.nivel?.nombre_nivel || 'Nivel';

    return `${grado} "${seccion.letra}" · ${nivel}`;
  }

  private async resolveScope(params: DashboardParams): Promise<DashboardScope> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: {
        rol: true,
        colegios: {
          where: { estado: 'Activo' },
          include: {
            colegio: {
              include: {
                niveles: {
                  include: {
                    nivel: true,
                  },
                },
              },
            },
          },
          orderBy: {
            es_principal: 'desc',
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const colegiosPermitidos = usuario.colegios.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
      color_principal: acceso.colegio.color_principal,
      niveles: acceso.colegio.niveles.map((item) => item.nivel.nombre_nivel),
    }));

    if (!colegiosPermitidos.length) {
      return {
        tipo: 'colegio',
        tenantId: null,
        colegioIds: [],
        colegios: [],
        puedeVerConsolidado: false,
      };
    }

    const puedeVerConsolidado =
      ['Admin', 'Director'].includes(params.rol) && colegiosPermitidos.length > 1;

    if (params.colegioId) {
      const colegio = colegiosPermitidos.find(
        (item) => item.id_colegio === params.colegioId,
      );

      if (!colegio) {
        throw new UnauthorizedException('No tienes acceso a este colegio');
      }

      return {
        tipo: 'colegio',
        tenantId: colegio.id_tenant,
        colegioIds: [colegio.id_colegio],
        colegios: [colegio],
        puedeVerConsolidado,
      };
    }

    if (params.scope === 'all' && puedeVerConsolidado) {
      return {
        tipo: 'todos',
        tenantId: colegiosPermitidos[0].id_tenant,
        colegioIds: colegiosPermitidos.map((item) => item.id_colegio),
        colegios: colegiosPermitidos,
        puedeVerConsolidado,
      };
    }

    const principal = colegiosPermitidos[0];

    return {
      tipo: 'colegio',
      tenantId: principal.id_tenant,
      colegioIds: [principal.id_colegio],
      colegios: [principal],
      puedeVerConsolidado,
    };
  }

  private async resolveAnioIds(scope: DashboardScope, anioId?: number) {
    if (!scope.colegioIds.length) return [];

    if (anioId && scope.tipo === 'colegio') {
      const anio = await this.prisma.anioLectivo.findFirst({
        where: {
          id_anio: anioId,
          id_colegio: {
            in: scope.colegioIds,
          },
        },
      });

      if (anio) return [anio.id_anio];
    }

    const aniosActivos = await this.prisma.anioLectivo.findMany({
      where: {
        id_colegio: {
          in: scope.colegioIds,
        },
        estado: 'Activo',
      },
      orderBy: {
        id_anio: 'asc',
      },
    });

    if (aniosActivos.length) {
      return aniosActivos.map((item) => item.id_anio);
    }

    const anios = await this.prisma.anioLectivo.findMany({
      where: {
        id_colegio: {
          in: scope.colegioIds,
        },
      },
      orderBy: {
        id_anio: 'asc',
      },
    });

    return anios.map((item) => item.id_anio);
  }

  private colegioWhere(scope: DashboardScope) {
    return scope.colegioIds.length
      ? {
          id_colegio: {
            in: scope.colegioIds,
          },
        }
      : {};
  }

  private anioWhere(anioIds: number[]) {
    return anioIds.length
      ? {
          id_anio: {
            in: anioIds,
          },
        }
      : {
          id_anio: -1,
        };
  }

  private async getBimestreActual(anioIds: number[], bimestreId?: number) {
    if (!anioIds.length) return null;

    if (bimestreId) {
      const bimestre = await this.prisma.bimestre.findFirst({
        where: {
          id_bimestre: bimestreId,
          id_anio: {
            in: anioIds,
          },
        },
      });

      if (bimestre) return bimestre;
    }

    const hoy = new Date();

    const bimestrePorFecha = await this.prisma.bimestre.findFirst({
      where: {
        id_anio: {
          in: anioIds,
        },
        fecha_inicio: { lte: hoy },
        fecha_fin: { gte: hoy },
      },
      orderBy: [{ id_anio: 'asc' }, { numero: 'asc' }],
    });

    if (bimestrePorFecha) return bimestrePorFecha;

    return this.prisma.bimestre.findFirst({
      where: {
        id_anio: {
          in: anioIds,
        },
      },
      orderBy: [{ id_anio: 'asc' }, { numero: 'asc' }],
    });
  }

  private async getUnidadAbierta(anioIds: number[], bimestreId?: number) {
    if (!anioIds.length) {
      return {
        unidadActual: null,
        idsUnidades: [],
      };
    }

    const unidadAbierta = await this.prisma.unidad.findFirst({
      where: {
        estado_abierto: true,
        bimestre: {
          id_anio: {
            in: anioIds,
          },
          ...(bimestreId ? { id_bimestre: bimestreId } : {}),
        },
      },
      include: {
        bimestre: true,
      },
      orderBy: {
        numero: 'asc',
      },
    });

    const unidadBase =
      unidadAbierta ||
      (await this.prisma.unidad.findFirst({
        where: {
          bimestre: {
            id_anio: {
              in: anioIds,
            },
            ...(bimestreId ? { id_bimestre: bimestreId } : {}),
          },
        },
        include: {
          bimestre: true,
        },
        orderBy: {
          numero: 'asc',
        },
      }));

    if (!unidadBase) {
      return {
        unidadActual: null,
        idsUnidades: [],
      };
    }

    const unidadesEquivalentes = await this.prisma.unidad.findMany({
      where: {
        numero: unidadBase.numero,
        bimestre: {
          numero: unidadBase.bimestre.numero,
          id_anio: {
            in: anioIds,
          },
        },
      },
      select: {
        id_unidad: true,
      },
    });

    return {
      unidadActual: unidadBase,
      idsUnidades: unidadesEquivalentes.map((item) => item.id_unidad),
    };
  }

  private async getEventosProximos(anioIds: number[], scope: DashboardScope) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const eventos = await this.prisma.evento.findMany({
      where: {
        id_anio: {
          in: anioIds.length ? anioIds : [-1],
        },
        ...this.colegioWhere(scope),
        fecha: { gte: hoy },
      },
      orderBy: { fecha: 'asc' },
      take: 5,
    });

    return eventos.map((evento) => ({
      id_evento: evento.id_evento,
      titulo: evento.titulo,
      fecha: evento.fecha,
      hora: evento.hora,
      tipo: evento.tipo,
      descripcion: evento.descripcion,
      id_colegio: evento.id_colegio,
    }));
  }

  private async getContextoBase(
    userId: number,
    anioIds: number[],
    scope: DashboardScope,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        rol: true,
        persona: {
          include: {
            docentes: {
              include: {
                asignaciones: {
                  where: {
                    ...this.anioWhere(anioIds),
                    ...this.colegioWhere(scope),
                  },
                  include: {
                    colegio: true,
                    curso: true,
                    seccion: {
                      include: {
                        colegio: true,
                        grado: {
                          include: {
                            nivel: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: {
                    id_asignacion: 'asc',
                  },
                },
              },
            },
            staff: {
              include: {
                colegio: true,
                seccion: {
                  include: {
                    colegio: true,
                    grado: {
                      include: {
                        nivel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const docente = usuario.persona.docentes?.[0] || null;
    const staff = usuario.persona.staff?.[0] || null;

    const asignaciones = (docente?.asignaciones || []).map((asignacion) => ({
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      id_anio: asignacion.id_anio,
      id_colegio:
        asignacion.id_colegio ||
        asignacion.seccion?.id_colegio ||
        asignacion.colegio?.id_colegio ||
        null,
      colegio:
        asignacion.colegio?.nombre ||
        asignacion.seccion?.colegio?.nombre ||
        null,
      curso: asignacion.curso.nombre_curso,
      seccion: this.formatSeccion(asignacion.seccion),
      grado: asignacion.seccion.grado.nombre_grado,
      nivel: asignacion.seccion.grado.nivel.nombre_nivel,
      letra: asignacion.seccion.letra,
    }));

    const tutoria =
      staff?.es_tutor && staff.seccion
        ? {
            es_tutor: true,
            secciones: [
              {
                id_seccion: staff.seccion.id_seccion,
                id_colegio:
                  staff.id_colegio ||
                  staff.seccion?.id_colegio ||
                  staff.colegio?.id_colegio ||
                  null,
                colegio:
                  staff.colegio?.nombre ||
                  staff.seccion?.colegio?.nombre ||
                  null,
                seccion: this.formatSeccion(staff.seccion),
                grado: staff.seccion.grado.nombre_grado,
                nivel: staff.seccion.grado.nivel.nombre_nivel,
                letra: staff.seccion.letra,
              },
            ],
          }
        : {
            es_tutor: false,
            secciones: [],
          };

    return {
      usuario,
      docente,
      staff,
      asignaciones,
      tutoria,
    };
  }

  private async getInstitucional(
    anioIds: number[],
    rol: string,
    scope: DashboardScope,
    bimestreId?: number,
  ) {
    const matriculaWhere = {
      ...this.anioWhere(anioIds),
      ...this.colegioWhere(scope),
      estado_matricula: 'Activo',
    };

    const [
      matriculados,
      docentesAsignados,
      circulares,
      pagosPendientes,
      secciones,
      eventosProximos,
      avanceCargaDocente,
      colegiosResumen,
    ] = await Promise.all([
      this.prisma.matricula.count({
        where: matriculaWhere,
      }),

      this.prisma.asignacionDocente.groupBy({
        by: ['id_docente'],
        where: {
          ...this.anioWhere(anioIds),
          ...this.colegioWhere(scope),
        },
      }),

      this.prisma.circular.count({
        where: {
          ...this.colegioWhere(scope),
        },
      }),

      this.prisma.cronogramaPagos.count({
        where: {
          estado_pago: 'Pendiente',
          matricula: matriculaWhere,
        },
      }),

      this.prisma.seccion.count({
        where: {
          ...this.colegioWhere(scope),
        },
      }),

      this.getEventosProximos(anioIds, scope),

      ['Admin', 'Director'].includes(rol)
        ? this.getAvanceCargaDocentes(anioIds, scope, bimestreId)
        : Promise.resolve(null),

      scope.tipo === 'todos'
        ? this.getResumenPorColegio(scope, bimestreId)
        : Promise.resolve([]),
    ]);

    return {
      scope: {
        tipo: scope.tipo,
        tenantId: scope.tenantId,
        colegioIds: scope.colegioIds,
      },
      colegios: colegiosResumen,
      kpis: {
        colegios: scope.colegios.length,
        matriculados,
        docentes: docentesAsignados.length,
        circulares,
        pagosPendientes,
        secciones,
      },
      eventosProximos,
      avanceCargaDocente,
    };
  }

  private async getResumenPorColegio(scope: DashboardScope, bimestreId?: number) {
    return Promise.all(
      scope.colegios.map(async (colegio) => {
        const colegioScope: DashboardScope = {
          tipo: 'colegio',
          tenantId: colegio.id_tenant,
          colegioIds: [colegio.id_colegio],
          colegios: [colegio],
          puedeVerConsolidado: scope.puedeVerConsolidado,
        };

        const anioIds = await this.resolveAnioIds(colegioScope, undefined);

        const matriculados = await this.prisma.matricula.count({
          where: {
            ...this.anioWhere(anioIds),
            id_colegio: colegio.id_colegio,
            estado_matricula: 'Activo',
          },
        });

        const docentes = await this.prisma.asignacionDocente.groupBy({
          by: ['id_docente'],
          where: {
            ...this.anioWhere(anioIds),
            id_colegio: colegio.id_colegio,
          },
        });

        const pagosPendientes = await this.prisma.cronogramaPagos.count({
          where: {
            estado_pago: 'Pendiente',
            matricula: {
              ...this.anioWhere(anioIds),
              id_colegio: colegio.id_colegio,
              estado_matricula: 'Activo',
            },
          },
        });

        const avanceCarga = await this.getAvanceCargaDocentes(
          anioIds,
          colegioScope,
          bimestreId,
        );

        return {
          id_colegio: colegio.id_colegio,
          nombre: colegio.nombre,
          nombre_corto: colegio.nombre_corto,
          codigo: colegio.codigo,
          color_principal: colegio.color_principal,
          niveles: colegio.niveles,
          kpis: {
            matriculados,
            docentes: docentes.length,
            pagosPendientes,
          },
          avanceCarga: avanceCarga.resumen,
          unidadActual: avanceCarga.unidadActual,
        };
      }),
    );
  }

  private async getDocente(
    docenteId: number | null,
    anioIds: number[],
    scope: DashboardScope,
    asignaciones: any[],
    bimestreId?: number,
  ) {
    if (!docenteId) {
      return null;
    }

    const idsAsignaciones = asignaciones.map((item) => item.id_asignacion);
    const idsSecciones = Array.from(
      new Set(asignaciones.map((item) => item.id_seccion)),
    );

    const unidadContext = await this.getUnidadAbierta(anioIds, bimestreId);
    const unidadActual = unidadContext.unidadActual;
    const idsUnidades = unidadContext.idsUnidades;

    const alumnosAsignados = await this.prisma.matricula.count({
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
        estado_matricula: 'Activo',
        id_seccion: { in: idsSecciones.length ? idsSecciones : [-1] },
      },
    });

    const seccionesResumen = await Promise.all(
      idsSecciones.map(async (idSeccion) => {
        const seccionInfo = asignaciones.find(
          (item) => item.id_seccion === idSeccion,
        );

        const totalAlumnos = await this.prisma.matricula.count({
          where: {
            ...this.anioWhere(anioIds),
            ...this.colegioWhere(scope),
            id_seccion: idSeccion,
            estado_matricula: 'Activo',
          },
        });

        const cursos = asignaciones
          .filter((item) => item.id_seccion === idSeccion)
          .map((item) => item.curso);

        return {
          id_seccion: idSeccion,
          seccion: seccionInfo?.seccion || 'Sección',
          totalAlumnos,
          cursos,
        };
      }),
    );

    if (!unidadActual) {
      return {
        unidadActual: null,
        avanceNotas: {
          totalEsperado: 0,
          registradas: 0,
          pendientes: 0,
          porcentaje: 0,
        },
        avancePorCurso: [],
        kpis: {
          cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
          secciones: idsSecciones.length,
          alumnosAsignados,
          evaluaciones: 0,
          promedio: null,
          notasPendientes: 0,
        },
        asignaciones,
        seccionesResumen,
        ultimasEvaluaciones: [],
      };
    }

    const evaluaciones = await this.prisma.evaluacionDetalle.findMany({
      where: {
        id_asignacion: {
          in: idsAsignaciones.length ? idsAsignaciones : [-1],
        },
        id_unidad: {
          in: idsUnidades.length ? idsUnidades : [-1],
        },
      },
      include: {
        unidad: {
          include: {
            bimestre: true,
          },
        },
        notas: {
          where: {
            matricula: {
              ...this.anioWhere(anioIds),
              ...this.colegioWhere(scope),
              estado_matricula: 'Activo',
            },
          },
        },
        asignacion: {
          include: {
            curso: true,
            colegio: true,
            seccion: {
              include: {
                colegio: true,
                grado: {
                  include: { nivel: true },
                },
              },
            },
          },
        },
      },
      orderBy: { id_evaluacion_det: 'desc' },
    });

    const notas = evaluaciones.flatMap((evaluacion) => evaluacion.notas);

    const promedio =
      notas.length > 0
        ? Math.round(
            (notas.reduce((total, nota) => total + Number(nota.valor_nota), 0) /
              notas.length) *
              10,
          ) / 10
        : null;

    const avancePorCurso = await Promise.all(
      asignaciones.map(async (asignacion) => {
        const totalAlumnos = await this.prisma.matricula.count({
          where: {
            ...this.anioWhere(anioIds),
            ...this.colegioWhere(scope),
            id_seccion: asignacion.id_seccion,
            estado_matricula: 'Activo',
          },
        });

        const evaluacionesCurso = evaluaciones.filter(
          (evaluacion) => evaluacion.id_asignacion === asignacion.id_asignacion,
        );

        const registradas = evaluacionesCurso.reduce(
          (total, evaluacion) => total + evaluacion.notas.length,
          0,
        );

        const totalEsperado = totalAlumnos * evaluacionesCurso.length;
        const pendientes = Math.max(0, totalEsperado - registradas);

        const porcentaje =
          totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

        return {
          id_asignacion: asignacion.id_asignacion,
          curso: asignacion.curso,
          seccion: asignacion.seccion,
          evaluaciones: evaluacionesCurso.length,
          alumnos: totalAlumnos,
          totalEsperado,
          registradas,
          pendientes,
          porcentaje,
        };
      }),
    );

    const totalEsperado = avancePorCurso.reduce(
      (total, item) => total + item.totalEsperado,
      0,
    );

    const registradas = avancePorCurso.reduce(
      (total, item) => total + item.registradas,
      0,
    );

    const pendientes = Math.max(0, totalEsperado - registradas);

    const porcentaje =
      totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

    const ultimasEvaluaciones = evaluaciones.slice(0, 6).map((evaluacion) => ({
      id_evaluacion_det: evaluacion.id_evaluacion_det,
      descripcion: evaluacion.descripcion_actividad,
      curso: evaluacion.asignacion.curso.nombre_curso,
      seccion: this.formatSeccion(evaluacion.asignacion.seccion),
      notasRegistradas: evaluacion.notas.length,
    }));

    return {
      unidadActual: {
        id_unidad: unidadActual.id_unidad,
        numero: unidadActual.numero,
        id_bimestre: unidadActual.id_bimestre,
        bimestre: unidadActual.bimestre.numero,
        fecha_inicio: unidadActual.fecha_inicio,
        fecha_fin: unidadActual.fecha_fin,
        estado_abierto: unidadActual.estado_abierto,
      },

      avanceNotas: {
        totalEsperado,
        registradas,
        pendientes,
        porcentaje,
      },

      avancePorCurso,

      kpis: {
        cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
        secciones: idsSecciones.length,
        alumnosAsignados,
        evaluaciones: evaluaciones.length,
        promedio,
        notasPendientes: pendientes,
      },

      asignaciones,
      seccionesResumen,
      ultimasEvaluaciones,
    };
  }

  private async getTutoria(
    seccionesTutoria: { id_seccion: number; seccion: string }[],
    anioIds: number[],
    scope: DashboardScope,
    bimestreId?: number,
  ) {
    if (!seccionesTutoria.length) {
      return null;
    }

    const bimestre = await this.getBimestreActual(anioIds, bimestreId);

    if (!bimestre) {
      return {
        bimestre: null,
        secciones: [],
      };
    }

    const secciones = await Promise.all(
      seccionesTutoria.map(async (seccionTutor) => {
        const matriculas = await this.prisma.matricula.findMany({
          where: {
            ...this.anioWhere(anioIds),
            ...this.colegioWhere(scope),
            id_seccion: seccionTutor.id_seccion,
            estado_matricula: 'Activo',
          },
          include: {
            estudiante: { include: { persona: true } },
            notas: {
              where: {
                evaluacion: {
                  unidad: {
                    id_bimestre: bimestre.id_bimestre,
                  },
                },
              },
            },
            asistencias: true,
            comentariosBimestrales: {
              where: {
                id_bimestre: bimestre.id_bimestre,
              },
            },
          },
        });

        const promedios = matriculas.map((matricula) => {
          if (!matricula.notas.length) return null;

          const promedio =
            matricula.notas.reduce(
              (total, nota) => total + Number(nota.valor_nota),
              0,
            ) / matricula.notas.length;

          return Math.round(promedio * 10) / 10;
        });

        const promediosValidos = promedios.filter(
          (promedio): promedio is number => promedio !== null,
        );

        const promedioGeneral =
          promediosValidos.length > 0
            ? Math.round(
                (promediosValidos.reduce((total, promedio) => total + promedio, 0) /
                  promediosValidos.length) *
                  10,
              ) / 10
            : null;

        const alumnosRiesgo = promediosValidos.filter(
          (promedio) => promedio < 11,
        ).length;

        const comentariosRegistrados = matriculas.filter(
          (matricula) => matricula.comentariosBimestrales.length > 0,
        ).length;

        return {
          id_seccion: seccionTutor.id_seccion,
          seccion: seccionTutor.seccion,
          alumnos: matriculas.length,
          promedioGeneral,
          alumnosRiesgo,
          comentariosRegistrados,
          comentariosPendientes: Math.max(
            0,
            matriculas.length - comentariosRegistrados,
          ),
        };
      }),
    );

    return {
      bimestre: {
        id_bimestre: bimestre.id_bimestre,
        numero: bimestre.numero,
        fecha_inicio: bimestre.fecha_inicio,
        fecha_fin: bimestre.fecha_fin,
      },
      secciones,
    };
  }

  private async getAvanceCargaDocentes(
    anioIds: number[],
    scope: DashboardScope,
    bimestreId?: number,
  ) {
    const unidadContext = await this.getUnidadAbierta(anioIds, bimestreId);
    const unidadActual = unidadContext.unidadActual;
    const idsUnidades = unidadContext.idsUnidades;

    if (!unidadActual) {
      return {
        unidadActual: null,
        resumen: {
          docentes: 0,
          docentesCompletos: 0,
          docentesPendientes: 0,
          porcentajePromedio: 0,
          totalEsperado: 0,
          registradas: 0,
          pendientes: 0,
          sinEvaluaciones: 0,
        },
        docentes: [],
      };
    }

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
      },
      include: {
        docente: {
          include: { persona: true },
        },
        curso: true,
        colegio: true,
        seccion: {
          include: {
            colegio: true,
            grado: {
              include: { nivel: true },
            },
          },
        },
        evaluaciones: {
          where: {
            id_unidad: {
              in: idsUnidades.length ? idsUnidades : [-1],
            },
          },
          include: {
            notas: {
              where: {
                matricula: {
                  ...this.anioWhere(anioIds),
                  ...this.colegioWhere(scope),
                  estado_matricula: 'Activo',
                },
              },
            },
          },
        },
      },
      orderBy: { id_docente: 'asc' },
    });

    const idsSecciones = Array.from(
      new Set(asignaciones.map((item) => item.id_seccion)),
    );

    const alumnosPorSeccionRaw = await this.prisma.matricula.groupBy({
      by: ['id_seccion'],
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
        estado_matricula: 'Activo',
        id_seccion: {
          in: idsSecciones.length ? idsSecciones : [-1],
        },
      },
      _count: {
        id_matricula: true,
      },
    });

    const alumnosPorSeccion = new Map<number, number>();

    alumnosPorSeccionRaw.forEach((item) => {
      alumnosPorSeccion.set(item.id_seccion, item._count.id_matricula);
    });

    const docentesMap = new Map<
      number,
      {
        id_docente: number;
        docente: string;
        cursos: string[];
        secciones: string[];
        colegios: string[];
        evaluaciones: number;
        totalEsperado: number;
        registradas: number;
        pendientes: number;
        porcentaje: number;
        estado: EstadoCarga;
      }
    >();

    for (const asignacion of asignaciones) {
      const idDocente = asignacion.id_docente;
      const docenteNombre = `${asignacion.docente.persona.nombres} ${asignacion.docente.persona.apellido_paterno}`.trim();

      const totalAlumnos = alumnosPorSeccion.get(asignacion.id_seccion) || 0;
      const evaluacionesCurso = asignacion.evaluaciones.length;
      const registradasCurso = asignacion.evaluaciones.reduce(
        (total, evaluacion) => total + evaluacion.notas.length,
        0,
      );

      const totalEsperadoCurso = totalAlumnos * evaluacionesCurso;

      if (!docentesMap.has(idDocente)) {
        docentesMap.set(idDocente, {
          id_docente: idDocente,
          docente: docenteNombre,
          cursos: [],
          secciones: [],
          colegios: [],
          evaluaciones: 0,
          totalEsperado: 0,
          registradas: 0,
          pendientes: 0,
          porcentaje: 0,
          estado: 'pendiente',
        });
      }

      const item = docentesMap.get(idDocente)!;

      item.cursos.push(asignacion.curso.nombre_curso);
      item.secciones.push(this.formatSeccion(asignacion.seccion));

      const colegioNombre =
        asignacion.colegio?.nombre ||
        asignacion.seccion?.colegio?.nombre ||
        null;

      if (colegioNombre) {
        item.colegios.push(colegioNombre);
      }

      item.evaluaciones += evaluacionesCurso;
      item.totalEsperado += totalEsperadoCurso;
      item.registradas += registradasCurso;
    }

    const docentes = Array.from(docentesMap.values()).map((docente) => {
      const pendientes = Math.max(0, docente.totalEsperado - docente.registradas);

      const porcentaje =
        docente.totalEsperado > 0
          ? Math.round((docente.registradas / docente.totalEsperado) * 100)
          : 0;

      let estado: EstadoCarga = 'pendiente';

      if (docente.evaluaciones === 0) estado = 'sin_evaluaciones';
      else if (porcentaje >= 100) estado = 'completo';
      else if (porcentaje >= 80) estado = 'avanzado';
      else if (porcentaje > 0) estado = 'en_proceso';
      else estado = 'pendiente';

      return {
        ...docente,
        cursos: Array.from(new Set(docente.cursos)),
        secciones: Array.from(new Set(docente.secciones)),
        colegios: Array.from(new Set(docente.colegios)),
        pendientes,
        porcentaje,
        estado,
      };
    });

    const totalEsperado = docentes.reduce(
      (total, item) => total + item.totalEsperado,
      0,
    );

    const registradas = docentes.reduce(
      (total, item) => total + item.registradas,
      0,
    );

    const pendientes = Math.max(0, totalEsperado - registradas);

    const porcentajePromedio =
      totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

    const docentesCompletos = docentes.filter(
      (item) => item.estado === 'completo',
    ).length;

    const sinEvaluaciones = docentes.filter(
      (item) => item.estado === 'sin_evaluaciones',
    ).length;

    return {
      unidadActual: {
        id_unidad: unidadActual.id_unidad,
        numero: unidadActual.numero,
        id_bimestre: unidadActual.id_bimestre,
        bimestre: unidadActual.bimestre.numero,
        fecha_inicio: unidadActual.fecha_inicio,
        fecha_fin: unidadActual.fecha_fin,
        estado_abierto: unidadActual.estado_abierto,
      },
      resumen: {
        docentes: docentes.length,
        docentesCompletos,
        docentesPendientes: Math.max(0, docentes.length - docentesCompletos),
        porcentajePromedio,
        totalEsperado,
        registradas,
        pendientes,
        sinEvaluaciones,
      },
      docentes: docentes.sort((a, b) => a.porcentaje - b.porcentaje),
    };
  }

  async getResumen(params: DashboardParams) {
    const { userId, rol, bimestreId } = params;

    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope, params.anioId);

    const contexto = await this.getContextoBase(userId, anioIds, scope);

    const esInstitucional = ['Admin', 'Director', 'Secretaria'].includes(rol);
    const esDocente = rol === 'Profesor' || contexto.asignaciones.length > 0;
    const esTutor = contexto.tutoria.es_tutor;

    const [institucional, docente, tutoria] = await Promise.all([
      esInstitucional
        ? this.getInstitucional(anioIds, rol, scope, bimestreId)
        : Promise.resolve(null),

      esDocente
        ? this.getDocente(
            contexto.docente?.id_persona || null,
            anioIds,
            scope,
            contexto.asignaciones,
            bimestreId,
          )
        : Promise.resolve(null),

      esTutor
        ? this.getTutoria(contexto.tutoria.secciones, anioIds, scope, bimestreId)
        : Promise.resolve(null),
    ]);

    return {
      rol,
      anioIds,
      scope: {
        tipo: scope.tipo,
        tenantId: scope.tenantId,
        colegioIds: scope.colegioIds,
        colegios: scope.colegios,
        puedeVerConsolidado: scope.puedeVerConsolidado,
      },
      usuario: {
        id: contexto.usuario.id_usuario,
        nombre: `${contexto.usuario.persona.nombres} ${contexto.usuario.persona.apellido_paterno}`.trim(),
        rol,
        cargo: contexto.staff?.cargo || (contexto.docente ? 'Docente' : rol),
      },
      modulos: {
        institucional,
        docente,
        tutoria,
      },
    };
  }
}