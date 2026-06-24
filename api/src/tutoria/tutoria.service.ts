import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { jsPDF } from 'jspdf';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as http from 'http';

type JwtUser = { userId: number; username: string; rol: string };
type TipoCriterio = 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';

const ESTADOS_MATRICULA_ACTIVA = ['Activo', 'Matriculado', 'Pre-matriculado'];
const CRITERIOS_BASE: Record<TipoCriterio, string[]> = {
  CONDUCTA: [
    'Orden y presentación personal',
    'Asistencia y puntualidad en clases',
    'Responsabilidad en tareas, trabajos y exposiciones',
    'Comportamiento ético durante clases y actividades',
    'Participación en actividades académicas y extracurriculares',
  ],
  PARTICIPACION_FAMILIAR: [
    'Asiste a reuniones, talleres, actividades formativas y recojo de libretas oportunamente',
    'Participa en las diferentes actividades programadas por la institución',
    'Acompaña y supervisa el cumplimiento de actividades académicas de su hijo',
  ],
};

@Injectable()
export class TutoriaService {
  constructor(private prisma: PrismaService) {}

  private toNumber(value: any) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatAlumno(persona: any) {
    return [
      `${persona?.apellido_paterno || ''} ${persona?.apellido_materno || ''}`.trim(),
      persona?.nombres,
    ].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim() || 'Alumno';
  }

  private formatSeccion(seccion: any, includeColegio = true) {
    const grado = seccion?.grado?.nombre_grado || 'Grado';
    const nivel = seccion?.grado?.nivel?.nombre_nivel || 'Nivel';
    const letra = seccion?.letra || '';
    const colegio = includeColegio && seccion?.colegio?.nombre ? ` · ${seccion.colegio.nombre}` : '';
    return `${grado} "${letra}" · ${nivel}${colegio}`;
  }

  private getGrupoEvaluacionTutoria(evaluacion: { grupo_evaluacion?: string | null; descripcion_actividad?: string | null; tipo?: { nombre_tipo?: string | null } | null }) {
    const texto = `${evaluacion.grupo_evaluacion || ''} ${evaluacion.descripcion_actividad || ''} ${evaluacion.tipo?.nombre_tipo || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (texto.includes('PRACTICA')) return 'PRÁCTICAS';
    if (texto.includes('EXAMEN')) return 'EXAMEN';
    return 'TRABAJO EN CLASE';
  }

  private async getUsuario(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        persona: {
          include: {
            docentes: true,
            staff: { include: { seccion: { include: { colegio: true, grado: { include: { nivel: true } } } } } },
          },
        },
        colegios: { where: { estado: 'Activo' }, include: { colegio: true } },
      },
    });
    if (!usuario) throw new ForbiddenException('Usuario no encontrado.');
    return usuario;
  }

  private colegioIdsPermitidos(usuario: any) {
    return (usuario.colegios || []).map((item) => item.id_colegio).filter(Boolean);
  }

  private async resolveScope(user: JwtUser, query: { scope?: string; colegioId?: string }) {
    const usuario = await this.getUsuario(user.userId);
    const permitidos = this.colegioIdsPermitidos(usuario);
    if (!permitidos.length) throw new ForbiddenException('No tienes colegios asignados.');

    if (query.colegioId) {
      const id = Number(query.colegioId);
      if (!permitidos.includes(id)) throw new ForbiddenException('No tienes acceso al colegio seleccionado.');
      return { usuario, colegioIds: [id], permitidoIds: permitidos };
    }

    if (query.scope === 'all' && ['Admin', 'Director'].includes(user.rol)) {
      return { usuario, colegioIds: permitidos, permitidoIds: permitidos };
    }

    return { usuario, colegioIds: [permitidos[0]], permitidoIds: permitidos };
  }

  private async asegurarCriterios(idColegio?: number | null, idTenant?: number | null) {
    if (!idColegio) return [];

    const existentes = await this.prisma.criterioTutoria.findMany({
      where: { id_colegio: idColegio },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id_criterio: 'asc' }],
    });

    const faltantes: { tipo: TipoCriterio; descripcion: string; orden: number }[] = [];

    // Solo sembramos criterios base cuando el colegio todavía no tiene
    // ningún criterio de ese tipo. Así, si el usuario edita el texto,
    // el sistema no vuelve a crear el criterio original como duplicado.
    (Object.keys(CRITERIOS_BASE) as TipoCriterio[]).forEach((tipo) => {
      const existeTipo = existentes.some((item) => item.tipo === tipo);

      if (!existeTipo) {
        CRITERIOS_BASE[tipo].forEach((descripcion, index) => {
          faltantes.push({ tipo, descripcion, orden: index + 1 });
        });
      }
    });

    if (faltantes.length) {
      await this.prisma.criterioTutoria.createMany({
        data: faltantes.map((item) => ({
          id_tenant: idTenant || undefined,
          id_colegio: idColegio,
          tipo: item.tipo,
          descripcion: item.descripcion,
          orden: item.orden,
          activo: true,
        })),
      });
    }

    return this.prisma.criterioTutoria.findMany({
      where: { id_colegio: idColegio, activo: true },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id_criterio: 'asc' }],
    });
  }

  private async assertSeccionAccess(user: JwtUser, idSeccion: number, idColegio?: number | null) {
    const usuario = await this.getUsuario(user.userId);
    const permitidos = this.colegioIdsPermitidos(usuario);
    if (idColegio && !permitidos.includes(idColegio)) throw new ForbiddenException('No tienes acceso al colegio de este salón.');
    if (['Admin', 'Director'].includes(user.rol)) return usuario;

    const esTutor = (usuario.persona?.staff || []).some((staff) => staff.es_tutor && staff.id_seccion === idSeccion);
    if (!esTutor) throw new ForbiddenException('Solo puedes revisar salones donde fuiste asignado como tutor.');
    return usuario;
  }

  private async getSalones(user: JwtUser, usuario: any, anio: any) {
    if (!anio) return [];
    const include = { colegio: true, aula: true, grado: { include: { nivel: true } } };
    let secciones: any[] = [];

    if (['Admin', 'Director'].includes(user.rol)) {
      secciones = await this.prisma.seccion.findMany({
        where: { id_colegio: anio.id_colegio },
        include,
        orderBy: [{ id_grado: 'asc' }, { letra: 'asc' }],
      });
    } else {
      const ids = (usuario.persona?.staff || []).filter((s) => s.es_tutor && s.id_seccion).map((s) => s.id_seccion);
      if (ids.length) {
        secciones = await this.prisma.seccion.findMany({
          where: { id_seccion: { in: ids }, id_colegio: anio.id_colegio },
          include,
          orderBy: [{ id_grado: 'asc' }, { letra: 'asc' }],
        });
      }
    }

    const counts = await this.prisma.matricula.groupBy({
      by: ['id_seccion'],
      where: { id_anio: anio.id_anio, id_seccion: { in: secciones.map((s) => s.id_seccion) }, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } },
      _count: { id_matricula: true },
    });
    const countMap = new Map(counts.map((item) => [item.id_seccion, item._count.id_matricula]));

    return secciones.map((s) => ({
      id_seccion: s.id_seccion,
      label: this.formatSeccion(s),
      grado: s.grado?.nombre_grado || '',
      nivel: s.grado?.nivel?.nombre_nivel || '',
      letra: s.letra,
      colegio: s.colegio?.nombre || 'Colegio',
      id_colegio: s.id_colegio,
      matriculados: countMap.get(s.id_seccion) || 0,
    }));
  }


  private normalizarTipoCriterio(tipo?: string | null): TipoCriterio {
    const value = String(tipo || '').trim().toUpperCase();

    if (value === 'CONDUCTA' || value === 'PARTICIPACION_FAMILIAR') {
      return value as TipoCriterio;
    }

    throw new BadRequestException('Tipo de criterio inválido.');
  }

  private async getColegioConfigTutoria(user: JwtUser, query: { scope?: string; colegioId?: string }) {
    const { colegioIds, usuario } = await this.resolveScope(user, query);
    const idColegio = query.colegioId ? Number(query.colegioId) : colegioIds[0];

    if (!idColegio || !colegioIds.includes(idColegio)) {
      throw new ForbiddenException('No tienes acceso al colegio seleccionado.');
    }

    const colegio = await this.prisma.colegio.findUnique({
      where: { id_colegio: idColegio },
    });

    if (!colegio) throw new NotFoundException('Colegio no encontrado.');

    return {
      colegio,
      usuario,
      idColegio,
      idTenant: colegio.id_tenant,
    };
  }


  private normalizarTextoLibre(value: any, max = 500) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, max) : null;
  }

  async obtenerCabeceraLibretaConfig(user: JwtUser, query: { scope?: string; colegioId?: string }) {
    const { colegio } = await this.getColegioConfigTutoria(user, query);

    return {
      colegio: {
        id_colegio: colegio.id_colegio,
        nombre: colegio.nombre,
        nombre_corto: colegio.nombre_corto,
        codigo: colegio.codigo,
        cabecera_libreta_texto: colegio.cabecera_libreta_texto,
        direccion: colegio.direccion,
        telefono: colegio.telefono,
        logo_url: colegio.logo_url,
        color_principal: colegio.color_principal || '#2563eb',
      },
    };
  }

  async actualizarCabeceraLibretaConfig(
    user: JwtUser,
    params: {
      scope?: string;
      colegioId?: string;
      body: {
        nombre?: string;
        nombre_corto?: string | null;
        codigo?: string | null;
        cabecera_libreta_texto?: string | null;
        logo_url?: string | null;
        color_principal?: string | null;
        direccion?: string | null;
        telefono?: string | null;
      };
    },
  ) {
    const { colegio } = await this.getColegioConfigTutoria(user, {
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const nombre = this.normalizarTextoLibre(params.body.nombre, 150);
    const color = this.normalizarTextoLibre(params.body.color_principal, 20) || '#2563eb';

    if (!nombre) {
      throw new BadRequestException('El nombre oficial del colegio es obligatorio.');
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new BadRequestException('El color institucional debe tener formato hexadecimal. Ejemplo: #2563eb');
    }

    const logoUrl = this.normalizarTextoLibre(params.body.logo_url, 500);
    const cabeceraTexto =
      this.normalizarTextoLibre(params.body.cabecera_libreta_texto, 150) ||
      this.normalizarTextoLibre(params.body.codigo, 150);

    if (logoUrl && !/^(https?:\/\/|data:image\/|\/uploads\/|uploads\/)/i.test(logoUrl)) {
      throw new BadRequestException('La URL del escudo debe ser https://, data:image o una ruta /uploads/.');
    }

    const actualizado = await this.prisma.colegio.update({
      where: {
        id_colegio: colegio.id_colegio,
      },
      data: {
        nombre,
        nombre_corto: this.normalizarTextoLibre(params.body.nombre_corto, 50),
        cabecera_libreta_texto: cabeceraTexto,
        logo_url: logoUrl,
        color_principal: color,
        direccion: this.normalizarTextoLibre(params.body.direccion, 255),
        telefono: this.normalizarTextoLibre(params.body.telefono, 30),
      },
    });

    return {
      message: 'Cabecera de libreta actualizada correctamente.',
      colegio: {
        id_colegio: actualizado.id_colegio,
        nombre: actualizado.nombre,
        nombre_corto: actualizado.nombre_corto,
        codigo: actualizado.codigo,
        cabecera_libreta_texto: actualizado.cabecera_libreta_texto,
        direccion: actualizado.direccion,
        telefono: actualizado.telefono,
        logo_url: actualizado.logo_url,
        color_principal: actualizado.color_principal || '#2563eb',
      },
    };
  }

  async listarCriteriosConfig(user: JwtUser, query: { scope?: string; colegioId?: string }) {
    const { colegio, idColegio, idTenant } = await this.getColegioConfigTutoria(user, query);

    await this.asegurarCriterios(idColegio, idTenant);

    const criterios = await this.prisma.criterioTutoria.findMany({
      where: {
        id_colegio: idColegio,
      },
      orderBy: [
        { tipo: 'asc' },
        { orden: 'asc' },
        { id_criterio: 'asc' },
      ],
      include: {
        _count: {
          select: {
            calificaciones: true,
          },
        },
      },
    });

    return {
      colegio: {
        id_colegio: colegio.id_colegio,
        nombre: colegio.nombre,
        nombre_corto: colegio.nombre_corto,
      },
      criterios: criterios.map((criterio) => ({
        id_criterio: criterio.id_criterio,
        id_colegio: criterio.id_colegio,
        tipo: criterio.tipo,
        descripcion: criterio.descripcion,
        orden: criterio.orden,
        activo: criterio.activo,
        usos: criterio._count.calificaciones,
      })),
    };
  }

  async crearCriterioConfig(
    user: JwtUser,
    params: {
      scope?: string;
      colegioId?: string;
      body: {
        tipo: 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';
        descripcion: string;
        orden?: number;
        id_colegio?: number;
      };
    },
  ) {
    const colegioIdQuery = params.body.id_colegio
      ? String(params.body.id_colegio)
      : params.colegioId;

    const { idColegio, idTenant } = await this.getColegioConfigTutoria(user, {
      scope: params.scope,
      colegioId: colegioIdQuery,
    });

    const tipo = this.normalizarTipoCriterio(params.body.tipo);
    const descripcion = String(params.body.descripcion || '').replace(/\s+/g, ' ').trim();

    if (!descripcion) {
      throw new BadRequestException('Escribe la descripción del criterio.');
    }

    const existente = await this.prisma.criterioTutoria.findFirst({
      where: {
        id_colegio: idColegio,
        tipo,
        descripcion,
      },
    });

    if (existente) {
      if (!existente.activo) {
        return this.prisma.criterioTutoria.update({
          where: { id_criterio: existente.id_criterio },
          data: {
            activo: true,
            orden: params.body.orden || existente.orden,
          },
        });
      }

      throw new BadRequestException('Ya existe un criterio con esa descripción.');
    }

    const ultimo = await this.prisma.criterioTutoria.findFirst({
      where: {
        id_colegio: idColegio,
        tipo,
      },
      orderBy: {
        orden: 'desc',
      },
    });

    return this.prisma.criterioTutoria.create({
      data: {
        id_tenant: idTenant,
        id_colegio: idColegio,
        tipo,
        descripcion,
        orden: Number(params.body.orden || (ultimo?.orden || 0) + 1),
        activo: true,
      },
    });
  }

  async reordenarCriteriosConfig(
    user: JwtUser,
    params: {
      scope?: string;
      colegioId?: string;
      body: {
        tipo: 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';
        orden: { id_criterio: number; orden: number }[];
      };
    },
  ) {
    const { idColegio } = await this.getColegioConfigTutoria(user, {
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const tipo = this.normalizarTipoCriterio(params.body.tipo);
    const orden = Array.isArray(params.body.orden) ? params.body.orden : [];

    if (!orden.length) {
      throw new BadRequestException('Envía el orden de los criterios.');
    }

    const ids = orden.map((item) => Number(item.id_criterio)).filter(Boolean);

    const criterios = await this.prisma.criterioTutoria.findMany({
      where: {
        id_colegio: idColegio,
        tipo,
        id_criterio: { in: ids },
      },
      select: {
        id_criterio: true,
      },
    });

    if (criterios.length !== ids.length) {
      throw new ForbiddenException('Uno o más criterios no pertenecen al colegio seleccionado.');
    }

    await this.prisma.$transaction(
      orden.map((item, index) =>
        this.prisma.criterioTutoria.update({
          where: { id_criterio: Number(item.id_criterio) },
          data: { orden: Number(item.orden || index + 1) },
        }),
      ),
    );

    return { message: 'Orden de criterios actualizado correctamente.' };
  }

  async eliminarCriterioConfig(
    user: JwtUser,
    params: {
      scope?: string;
      colegioId?: string;
      idCriterio: number;
    },
  ) {
    const { idColegio } = await this.getColegioConfigTutoria(user, {
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const criterio = await this.prisma.criterioTutoria.findFirst({
      where: {
        id_criterio: params.idCriterio,
        id_colegio: idColegio,
      },
      include: {
        _count: {
          select: {
            calificaciones: true,
          },
        },
      },
    });

    if (!criterio) {
      throw new NotFoundException('Criterio no encontrado o sin acceso.');
    }

    if (criterio._count.calificaciones > 0) {
      throw new BadRequestException(
        'No se puede eliminar un criterio que ya tiene registros. Puedes desactivarlo para que no aparezca en nuevos cierres.',
      );
    }

    await this.prisma.criterioTutoria.delete({
      where: {
        id_criterio: criterio.id_criterio,
      },
    });

    const restantes = await this.prisma.criterioTutoria.findMany({
      where: {
        id_colegio: idColegio,
        tipo: criterio.tipo,
      },
      orderBy: [
        { orden: 'asc' },
        { id_criterio: 'asc' },
      ],
    });

    await this.prisma.$transaction(
      restantes.map((item, index) =>
        this.prisma.criterioTutoria.update({
          where: { id_criterio: item.id_criterio },
          data: { orden: index + 1 },
        }),
      ),
    );

    return {
      message: 'Criterio eliminado correctamente.',
    };
  }

  async actualizarCriterioConfig(
    user: JwtUser,
    params: {
      scope?: string;
      colegioId?: string;
      idCriterio: number;
      body: {
        descripcion?: string;
        orden?: number;
        activo?: boolean;
      };
    },
  ) {
    const { idColegio } = await this.getColegioConfigTutoria(user, {
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const criterio = await this.prisma.criterioTutoria.findFirst({
      where: {
        id_criterio: params.idCriterio,
        id_colegio: idColegio,
      },
    });

    if (!criterio) {
      throw new NotFoundException('Criterio no encontrado o sin acceso.');
    }

    const data: any = {};

    if (params.body.descripcion !== undefined) {
      const descripcion = String(params.body.descripcion || '').replace(/\s+/g, ' ').trim();

      if (!descripcion) {
        throw new BadRequestException('Escribe la descripción del criterio.');
      }

      data.descripcion = descripcion;
    }

    if (params.body.orden !== undefined) {
      data.orden = Number(params.body.orden || 1);
    }

    if (params.body.activo !== undefined) {
      data.activo = Boolean(params.body.activo);
    }

    return this.prisma.criterioTutoria.update({
      where: {
        id_criterio: criterio.id_criterio,
      },
      data,
    });
  }

  async getPanel(user: JwtUser, query: { scope?: string; colegioId?: string; anioId?: string }) {
    const { usuario, colegioIds } = await this.resolveScope(user, query);
    const anios = await this.prisma.anioLectivo.findMany({
      where: { id_colegio: { in: colegioIds } },
      include: { colegio: true },
      orderBy: [{ fecha_inicio: 'desc' }, { id_anio: 'desc' }],
    });

    const requested = query.anioId ? Number(query.anioId) : null;
    const selected = (requested ? anios.find((a) => a.id_anio === requested) : null)
      || anios.find((a) => ['Matrícula abierta', 'En curso', 'Planificación'].includes(a.estado))
      || anios[0]
      || null;

    const periodos = selected ? await this.prisma.bimestre.findMany({
      where: { id_anio: selected.id_anio },
      include: {
        unidades: {
          include: {
            registros_notas: {
              select: {
                cerrado: true,
              },
            },
          },
        },
      },
      orderBy: { numero: 'asc' },
    }) : [];

    const periodosDisponibles = periodos.filter((periodo) => {
      const unidades = periodo.unidades || [];
      const tieneUnidadAbierta = unidades.some((unidad) => unidad.estado_abierto);
      const tieneRegistroCerrado = unidades.some((unidad) =>
        unidad.registros_notas?.some((registro) => registro.cerrado),
      );

      return tieneUnidadAbierta || tieneRegistroCerrado;
    });

    return {
      anios: anios.map((a) => ({ id_anio: a.id_anio, nombre_anio: a.nombre_anio, estado: a.estado, colegio: a.colegio?.nombre || 'Colegio', id_colegio: a.id_colegio })),
      selected_anio_id: selected?.id_anio || null,
      periodos: periodosDisponibles.map((p) => ({ id_bimestre: p.id_bimestre, numero: p.numero, label: p.nombre || `Periodo ${p.numero}` })),
      salones: selected ? await this.getSalones(user, usuario, selected) : [],
      permisos: {
        puede_exportar: ['Admin', 'Director'].includes(user.rol),
        puede_editar_cierre: ['Admin', 'Director'].includes(user.rol) || Boolean((usuario.persona?.staff || []).some((s) => s.es_tutor)),
        es_tutor: Boolean((usuario.persona?.staff || []).some((s) => s.es_tutor)),
      },
    };
  }

  private async promedioMatricula(idMatricula: number, idBimestre: number) {
    const matricula = await this.prisma.matricula.findUnique({ where: { id_matricula: idMatricula }, select: { id_matricula: true, id_seccion: true, id_anio: true } });
    if (!matricula) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };

    const bimestre = await this.prisma.bimestre.findUnique({ where: { id_bimestre: idBimestre }, include: { unidades: true } });
    const unidadIds = (bimestre?.unidades || []).map((u) => u.id_unidad);
    if (!unidadIds.length) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_seccion: matricula.id_seccion, id_anio: matricula.id_anio },
      include: { evaluaciones: { where: { id_unidad: { in: unidadIds } }, include: { notas: { where: { id_matricula: idMatricula } } } } },
    });

    const promedios = asignaciones.map((asig) => {
      if (!asig.evaluaciones.length) return null;
      const total = asig.evaluaciones.reduce((sum, ev) => sum + this.toNumber(ev.notas[0]?.valor_nota), 0);
      return Math.round(total / asig.evaluaciones.length);
    }).filter((p): p is number => p !== null);

    if (!promedios.length) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };
    const puntaje = promedios.reduce((sum, p) => sum + p, 0);
    return { promedio: Math.round(puntaje / promedios.length), cursosDesaprobados: promedios.filter((p) => p <= 10).length, puntaje };
  }

  async getAlumnosSalon(user: JwtUser, params: { idSeccion: number; idAnio: number; idBimestre: number }) {
    const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: params.idSeccion }, include: { colegio: true } });
    if (!seccion) throw new NotFoundException('Salón no encontrado.');
    await this.assertSeccionAccess(user, params.idSeccion, seccion.id_colegio);

    const matriculas = await this.prisma.matricula.findMany({
      where: { id_seccion: params.idSeccion, id_anio: params.idAnio, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } },
      include: { estudiante: { include: { persona: true } } },
    });

    const criterios = await this.asegurarCriterios(seccion.id_colegio, seccion.id_tenant);
    const conductaIds = criterios.filter((c) => c.tipo === 'CONDUCTA').map((c) => c.id_criterio);
    const familiaIds = criterios.filter((c) => c.tipo === 'PARTICIPACION_FAMILIAR').map((c) => c.id_criterio);

    const rows = await Promise.all(matriculas.sort((a, b) => this.formatAlumno(a.estudiante.persona).localeCompare(this.formatAlumno(b.estudiante.persona), 'es-PE')).map(async (mat) => {
      const [prom, comentario, calificaciones] = await Promise.all([
        this.promedioMatricula(mat.id_matricula, params.idBimestre),
        this.prisma.comentarioBimestral.findUnique({ where: { id_matricula_id_bimestre: { id_matricula: mat.id_matricula, id_bimestre: params.idBimestre } } }),
        this.prisma.calificacionTutoria.findMany({ where: { id_matricula: mat.id_matricula, id_bimestre: params.idBimestre } }),
      ]);
      const calificados = new Set(calificaciones.filter((c) => c.valor && c.valor.trim()).map((c) => c.id_criterio));
      const completo = comentario?.comentario && conductaIds.every((id) => calificados.has(id)) && familiaIds.every((id) => calificados.has(id));
      return {
        id_matricula: mat.id_matricula,
        codigo: mat.codigo_matricula || mat.estudiante.codigo_estudiante || `MAT-${mat.id_matricula}`,
        alumno: this.formatAlumno(mat.estudiante.persona),
        avatar_url: mat.estudiante.avatar_url || null,
        promedio: prom.promedio,
        cursos_desaprobados: prom.cursosDesaprobados,
        conducta_pendiente: conductaIds.filter((id) => !calificados.has(id)).length,
        familia_pendiente: familiaIds.filter((id) => !calificados.has(id)).length,
        comentario_pendiente: !comentario?.comentario,
        estado_cierre: completo ? 'Completo' : 'Pendiente',
      };
    }));

    return rows;
  }

  private async assertMatriculaAccess(user: JwtUser, idMatricula: number) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: idMatricula },
      include: {
        colegio: true,
        anio: true,
        seccion: { include: { colegio: true, aula: true, grado: { include: { nivel: true } } } },
        estudiante: { include: { persona: true } },
      },
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada.');
    await this.assertSeccionAccess(user, matricula.id_seccion, matricula.id_colegio || matricula.seccion?.id_colegio);
    return matricula;
  }

  private async merito(idSeccion: number, idAnio: number, idBimestre: number, idMatricula: number) {
    const mats = await this.prisma.matricula.findMany({ where: { id_seccion: idSeccion, id_anio: idAnio, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } }, select: { id_matricula: true } });
    const rows = await Promise.all(mats.map(async (m) => ({ id_matricula: m.id_matricula, ...(await this.promedioMatricula(m.id_matricula, idBimestre)) })));
    const ordenados = rows.filter((r) => r.promedio !== null).sort((a, b) => Number(b.promedio) - Number(a.promedio) || b.puntaje - a.puntaje);
    const index = ordenados.findIndex((r) => r.id_matricula === idMatricula);
    const orden = index >= 0 ? index + 1 : null;
    const total = ordenados.length;
    let tercio = 'Sin datos';
    if (orden && total) {
      if (orden <= Math.ceil(total / 3)) tercio = 'Superior';
      else if (orden <= Math.ceil((total * 2) / 3)) tercio = 'Medio';
      else tercio = 'Inferior';
    }
    return { orden_merito: orden, total_alumnos: total, tercio };
  }

  async getResumenAlumno(user: JwtUser, idMatricula: number, idBimestre: number) {
    const matricula = await this.assertMatriculaAccess(user, idMatricula);
    const bimestre = await this.prisma.bimestre.findUnique({ where: { id_bimestre: idBimestre }, include: { unidades: true } });
    if (!bimestre) throw new NotFoundException('Periodo no encontrado.');
    const unidadIds = bimestre.unidades.map((u) => u.id_unidad);

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_seccion: matricula.id_seccion, id_anio: matricula.id_anio },
      include: {
        curso: { include: { area: true } },
        docente: { include: { persona: true } },
        evaluaciones: { where: { id_unidad: { in: unidadIds } }, include: { tipo: true, notas: { where: { id_matricula: idMatricula } } }, orderBy: [{ orden: 'asc' }, { id_evaluacion_det: 'asc' }] },
      },
      orderBy: [{ id_curso: 'asc' }],
    });

    const cursos = asignaciones.map((asig) => {
      const evaluaciones = asig.evaluaciones.map((ev) => ({
        id_evaluacion_det: ev.id_evaluacion_det,
        descripcion: ev.descripcion_actividad || ev.tipo?.nombre_tipo || 'Evaluación',
        grupo: this.getGrupoEvaluacionTutoria(ev),
        nota: this.toNumber(ev.notas[0]?.valor_nota),
      }));
      const promedio = evaluaciones.length ? Math.round(evaluaciones.reduce((s, ev) => s + ev.nota, 0) / evaluaciones.length) : null;
      return {
        id_asignacion: asig.id_asignacion,
        curso: asig.curso?.nombre_curso || 'Curso',
        area: asig.curso?.area?.nombre_area || 'Área',
        docente: asig.docente?.persona ? `${asig.docente.persona.nombres} ${asig.docente.persona.apellido_paterno}`.trim() : '',
        promedio,
        evaluaciones,
      };
    });

    const resumen = await this.promedioMatricula(idMatricula, idBimestre);
    const merito = await this.merito(matricula.id_seccion, matricula.id_anio, idBimestre, idMatricula);
    const criterios = await this.asegurarCriterios(matricula.id_colegio, matricula.id_tenant);
    const calificaciones = await this.prisma.calificacionTutoria.findMany({ where: { id_matricula: idMatricula, id_bimestre: idBimestre } });
    const calMap = new Map(calificaciones.map((c) => [c.id_criterio, c.valor || '']));
    const comentario = await this.prisma.comentarioBimestral.findUnique({
      where: {
        id_matricula_id_bimestre: {
          id_matricula: idMatricula,
          id_bimestre: idBimestre,
        },
      },
      include: {
        docente: {
          include: {
            persona: true,
          },
        },
        usuario_registro: {
          include: {
            persona: true,
          },
        },
      },
    });

    const criteriosActivos = criterios.filter((c) => c.activo);

    const mapCriterios = (tipo: TipoCriterio) =>
      criteriosActivos
        .filter((c) => c.activo && c.tipo === tipo)
        .map((c) => ({
          id_criterio: c.id_criterio,
          descripcion: c.descripcion,
          tipo: c.tipo,
          valor: calMap.get(c.id_criterio) || '',
        }));

    const conducta = mapCriterios('CONDUCTA');
    const participacionFamiliar = mapCriterios('PARTICIPACION_FAMILIAR');
    const comentarioTexto = comentario?.comentario || '';

    const cierreCompleto =
      Boolean(comentarioTexto.trim()) &&
      conducta.every((item) => Boolean(item.valor)) &&
      participacionFamiliar.every((item) => Boolean(item.valor));

    const personaRegistro =
      comentario?.usuario_registro?.persona ||
      comentario?.docente?.persona ||
      null;

    const registradoPor = personaRegistro
      ? `${personaRegistro.nombres || ''} ${personaRegistro.apellido_paterno || ''} ${personaRegistro.apellido_materno || ''}`
          .replace(/\s+/g, ' ')
          .trim()
      : null;

    return {
      alumno: {
        id_matricula: matricula.id_matricula,
        codigo: matricula.codigo_matricula || matricula.estudiante.codigo_estudiante || `MAT-${matricula.id_matricula}`,
        nombre: this.formatAlumno(matricula.estudiante.persona),
        avatar_url: matricula.estudiante.avatar_url || null,
        colegio: matricula.colegio?.nombre || matricula.seccion?.colegio?.nombre || 'Colegio',
        anio: matricula.anio?.nombre_anio || '',
        salon: this.formatSeccion(matricula.seccion),
      },
      estadistica: { promedio_general: resumen.promedio, puntaje: resumen.puntaje, cursos_desaprobados: resumen.cursosDesaprobados, ...merito },
      cursos,
      conducta,
      participacion_familiar: participacionFamiliar,
      comentario: comentarioTexto,
      cierre: {
        estado: cierreCompleto ? 'Completo' : 'Pendiente',
        actualizado_en: comentario?.updated_at || null,
        registrado_por: registradoPor,
      },
    };
  }


  async exportarLibretaPdf(user: JwtUser, idMatricula: number, idBimestre: number) {
    if (!idBimestre) throw new BadRequestException('Periodo obligatorio para exportar libreta.');

    const resumen = await this.getResumenAlumno(user, idMatricula, idBimestre);

    const [matricula, bimestre] = await Promise.all([
      this.prisma.matricula.findUnique({
        where: { id_matricula: idMatricula },
        include: {
          colegio: true,
          anio: true,
          estudiante: { include: { persona: true } },
          seccion: {
            include: {
              colegio: true,
              grado: { include: { nivel: true } },
            },
          },
        },
      }),
      this.prisma.bimestre.findUnique({
        where: { id_bimestre: idBimestre },
      }),
    ]);

    if (!matricula) throw new NotFoundException('Matrícula no encontrada.');

    const tutor = await this.prisma.staff.findFirst({
      where: {
        id_seccion: matricula.id_seccion,
        es_tutor: true,
      },
      include: { persona: true },
    });

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const safe = (value: any) => String(value ?? '').replace(/\s+/g, ' ').trim();

    const hexToRgb = (hex?: string | null): [number, number, number] => {
      const clean = safe(hex || '').replace('#', '');

      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [190, 70, 78];

      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    };

    const downloadRemoteImage = (imageUrl: string, redirects = 0): Promise<{ buffer: Buffer; contentType: string }> =>
      new Promise((resolve, reject) => {
        if (redirects > 4) {
          reject(new Error('Demasiadas redirecciones al descargar imagen.'));
          return;
        }

        const client = imageUrl.startsWith('https://') ? https : http;

        const req = client.get(imageUrl, (response) => {
          const status = response.statusCode || 0;
          const location = response.headers.location;

          if ([301, 302, 303, 307, 308].includes(status) && location) {
            const nextUrl = new URL(location, imageUrl).toString();
            response.resume();

            downloadRemoteImage(nextUrl, redirects + 1)
              .then(resolve)
              .catch(reject);

            return;
          }

          if (status < 200 || status >= 300) {
            response.resume();
            reject(new Error(`No se pudo descargar imagen. HTTP ${status}`));
            return;
          }

          const chunks: Buffer[] = [];

          response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          response.on('end', () => {
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: String(response.headers['content-type'] || ''),
            });
          });
        });

        req.on('error', reject);
        req.setTimeout(8000, () => {
          req.destroy(new Error('Tiempo de descarga de imagen agotado.'));
        });
      });

    const getImageDataUrl = async (
      imageUrl?: string | null,
    ): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> => {
      const raw = safe(imageUrl);

      if (!raw) return null;

      if (raw.startsWith('data:image/')) {
        return {
          dataUrl: raw,
          format: raw.includes('image/png') ? 'PNG' : 'JPEG',
        };
      }

      const lowerRaw = raw.toLowerCase();
      const inferFormat = (value: string, contentType = ''): 'PNG' | 'JPEG' | null => {
        const lower = value.toLowerCase();
        const ct = contentType.toLowerCase();

        if (ct.includes('image/png') || lower.endsWith('.png')) return 'PNG';
        if (ct.includes('image/jpeg') || ct.includes('image/jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPEG';

        return null;
      };

      if (/^https?:\/\//i.test(raw)) {
        try {
          const downloaded = await downloadRemoteImage(raw);
          const format = inferFormat(raw, downloaded.contentType);

          if (!format) return null;

          const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';

          return {
            dataUrl: `data:${mime};base64,${downloaded.buffer.toString('base64')}`,
            format,
          };
        } catch {
          return null;
        }
      }

      const clean = raw.split('?')[0];
      let localPath = '';

      if (clean.startsWith('/uploads/')) {
        localPath = join(process.cwd(), clean.replace(/^\/uploads\//, 'uploads/'));
      } else if (clean.startsWith('uploads/')) {
        localPath = join(process.cwd(), clean);
      } else if (clean.startsWith('/')) {
        localPath = clean;
      } else {
        localPath = join(process.cwd(), clean);
      }

      if (!existsSync(localPath)) return null;

      const format = inferFormat(localPath);

      if (!format) return null;

      const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
      const base64 = readFileSync(localPath).toString('base64');

      return {
        dataUrl: `data:${mime};base64,${base64}`,
        format,
      };
    };

    const nota = (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
      return String(Math.round(Number(value)));
    };

    const literal = (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
      const n = Math.round(Number(value));
      if (n >= 17) return 'AD';
      if (n >= 14) return 'A';
      if (n >= 11) return 'B';
      return 'C';
    };

    const nota2 = (value: number | null | undefined) => {
      const n = nota(value);
      return n === '-' ? '-' : n.padStart(2, '0');
    };

    const promedioLiteralTutoria = (values: string[]) => {
      const escala: Record<string, number> = {
        AD: 4,
        A: 3,
        B: 2,
        C: 1,
      };

      const validos = values
        .map((value) => safe(value).toUpperCase())
        .filter((value) => Object.prototype.hasOwnProperty.call(escala, value));

      if (!validos.length) return '';

      const promedio =
        validos.reduce((sum, value) => sum + escala[value], 0) / validos.length;

      if (promedio >= 3.5) return 'AD';
      if (promedio >= 2.5) return 'A';
      if (promedio >= 1.5) return 'B';
      return 'C';
    };

    const bimNumero = Math.min(4, Math.max(1, Number(bimestre?.numero || 1)));
    const periodoNombre = bimestre?.nombre || `${bimNumero}° BIMESTRE`;
    const colegio = matricula.colegio || matricula.seccion?.colegio;
    const colegioNombre = safe(colegio?.nombre || resumen.alumno.colegio || 'Colegio Privado');
    const colegioTitulo = colegioNombre.replace(/^Colegio\s+Privado\s+/i, '').toUpperCase();
    const colorInstitucional = hexToRgb(colegio?.color_principal);
    const logoInfo = await getImageDataUrl(colegio?.logo_url);
    const fotoAlumnoInfo = await getImageDataUrl(matricula.estudiante?.avatar_url);
    const codigoInstitucional = safe(colegio?.cabecera_libreta_texto || colegio?.codigo || '');
    const nivelNombre = safe(matricula.seccion?.grado?.nivel?.nombre_nivel || '');
    const salonNombre = safe(`${nivelNombre} ${matricula.seccion?.grado?.nombre_grado || ''} ${matricula.seccion?.letra || ''}`);
    const alumnoNombre = safe(resumen.alumno.nombre).toUpperCase();
    const codigoAlumno = safe(resumen.alumno.codigo || `MAT-${idMatricula}`);
    const ordenMerito = resumen.estadistica.orden_merito || '-';

    const tutorNombre = tutor?.persona
      ? `${tutor.persona.nombres || ''} ${tutor.persona.apellido_paterno || ''} ${tutor.persona.apellido_materno || ''}`
          .replace(/\s+/g, ' ')
          .trim()
      : 'TUTOR(A)';

    const fechaTexto = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const drawCell = (
      x: number,
      y: number,
      w: number,
      h: number,
      content = '',
      options: {
        fill?: [number, number, number];
        text?: [number, number, number];
        bold?: boolean;
        size?: number;
        align?: 'left' | 'center' | 'right';
        valign?: 'top' | 'middle';
        border?: [number, number, number];
        maxLines?: number;
      } = {},
    ) => {
      const fill = options.fill;
      const border = options.border || [80, 80, 80];
      const textColor = options.text || [30, 41, 59];
      const fontSize = options.size || 6.5;

      doc.setLineWidth(0.45);
      doc.setDrawColor(border[0], border[1], border[2]);

      if (fill) {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(x, y, w, h, 'FD');
      } else {
        doc.rect(x, y, w, h, 'S');
      }

      if (!content) return;

      doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const align = options.align || 'left';
      const maxWidth = Math.max(4, w - 4);
      const lines = doc.splitTextToSize(String(content), maxWidth).slice(0, options.maxLines || 4);
      const textHeight = lines.length * (fontSize + 1);
      const textY =
        options.valign === 'top'
          ? y + fontSize + 2
          : y + (h - textHeight) / 2 + fontSize;

      const textX =
        align === 'center'
          ? x + w / 2
          : align === 'right'
            ? x + w - 3
            : x + 3;

      doc.text(lines, textX, textY, { align });
    };

    const blue: [number, number, number] = [190, 207, 221];
    const blueDark: [number, number, number] = [48, 63, 84];
    const light: [number, number, number] = [247, 248, 244];
    const gray: [number, number, number] = [232, 236, 239];

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Encabezado
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.7);

    // Logo institucional
    if (logoInfo) {
      try {
        doc.addImage(logoInfo.dataUrl, logoInfo.format, 36, 26, 54, 64, undefined, 'FAST');
      } catch {
        doc.roundedRect(36, 26, 54, 64, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(110, 60, 60);
        doc.text('ESCUDO', 63, 61, { align: 'center' });
      }
    } else {
      doc.roundedRect(36, 26, 54, 64, 2, 2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(110, 60, 60);
      doc.text('ESCUDO', 63, 61, { align: 'center' });
    }

    // Foto del alumno
    doc.rect(pageWidth - 92, 26, 58, 74, 'S');

    if (fotoAlumnoInfo) {
      try {
        const boxX = pageWidth - 89;
        const boxY = 29;
        const boxW = 52;
        const boxH = 68;
        const props = doc.getImageProperties(fotoAlumnoInfo.dataUrl);
        const imageRatio = props.width / props.height;
        const boxRatio = boxW / boxH;

        let drawW = boxW;
        let drawH = boxH;

        if (imageRatio > boxRatio) {
          drawW = boxW;
          drawH = boxW / imageRatio;
        } else {
          drawH = boxH;
          drawW = boxH * imageRatio;
        }

        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY + (boxH - drawH) / 2;

        doc.addImage(fotoAlumnoInfo.dataUrl, fotoAlumnoInfo.format, drawX, drawY, drawW, drawH, undefined, 'FAST');
      } catch {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('FOTO', pageWidth - 63, 64, { align: 'center' });
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('FOTO', pageWidth - 63, 64, { align: 'center' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 66, 98);
    doc.setFontSize(20);
    doc.text('Colegio Privado', pageWidth / 2, 35, { align: 'center' });

    doc.setTextColor(colorInstitucional[0], colorInstitucional[1], colorInstitucional[2]);
    doc.setFontSize(colegioTitulo.length > 24 ? 24 : 30);
    doc.text(colegioTitulo || 'INSTITUCIÓN EDUCATIVA', pageWidth / 2, 66, { align: 'center', maxWidth: 430 });

    doc.setTextColor(55, 66, 98);
    doc.setFontSize(9);
    doc.text(
      codigoInstitucional
        ? codigoInstitucional
        : 'R.D. N° 003942 - 10 DRELM - UGEL 01 S.J.M',
      pageWidth / 2,
      86,
      { align: 'center' },
    );

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text(`BOLETA DE NOTAS - ${matricula.anio?.nombre_anio?.match(/\d{4}/)?.[0] || new Date().getFullYear()}`, pageWidth / 2, 106, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`NIVEL ${nivelNombre.toUpperCase() || ''} - ${periodoNombre.toUpperCase()}`.replace(/\s+/g, ' ').trim(), pageWidth / 2, 120, { align: 'center' });

    // Datos superiores
    const dataY = 140;
    drawCell(36, dataY, 54, 12, 'Código', { size: 7, bold: true, align: 'center', border: [255, 255, 255] });
    drawCell(104, dataY, 246, 12, 'Apellidos y Nombres', { size: 7, bold: true, align: 'center', border: [255, 255, 255] });
    drawCell(358, dataY, 130, 12, 'Salón', { size: 7, bold: true, align: 'center', border: [255, 255, 255] });
    drawCell(500, dataY, 44, 12, 'N° Ord', { size: 7, bold: true, align: 'center', border: [255, 255, 255] });

    drawCell(36, dataY + 13, 54, 18, codigoAlumno, { size: 7, bold: true, align: 'center', fill: light });
    drawCell(92, dataY + 13, 258, 18, alumnoNombre, { size: 7, bold: true, align: 'center', fill: light, maxLines: 1 });
    drawCell(352, dataY + 13, 136, 18, salonNombre.toUpperCase(), { size: 7, bold: true, align: 'center', fill: light, maxLines: 1 });
    drawCell(500, dataY + 13, 44, 18, String(ordenMerito), { size: 8, bold: true, align: 'center', fill: light });

    // Tabla izquierda: notas
    const leftX = 20;
    const leftY = 180;
    const leftW = 320;
    const nameW = 136;
    const pairW = 29;
    const promW = leftW - nameW - pairW * 4;
    const rowH = 11.2;
    let yL = leftY;

    drawCell(leftX, yL, nameW, 16, 'ÁREAS', { fill: blue, bold: true, align: 'center', size: 7, text: blueDark });
    ['I BIM', 'II BIM', 'III BIM', 'IV BIM'].forEach((label, index) => {
      drawCell(leftX + nameW + pairW * index, yL, pairW, 16, label, { fill: blue, bold: true, align: 'center', size: 6.5, text: blueDark });
    });
    drawCell(leftX + nameW + pairW * 4, yL, promW, 16, 'PROME', { fill: blue, bold: true, align: 'center', size: 6.5, text: blueDark });
    yL += 16;

    const areas = new Map<string, typeof resumen.cursos>();
    resumen.cursos.forEach((curso) => {
      const area = safe(curso.area || 'ÁREA');
      const actual = areas.get(area) || [];
      actual.push(curso);
      areas.set(area, actual);
    });

    const drawNotaPair = (x: number, y: number, w: number, h: number, value: number | null | undefined, active: boolean) => {
      if (!active) {
        drawCell(x, y, w / 2, h, '', { fill: light });
        drawCell(x + w / 2, y, w / 2, h, '', { fill: light });
        return;
      }

      drawCell(x, y, w / 2, h, nota(value), { fill: light, size: 6.5, align: 'center' });
      drawCell(x + w / 2, y, w / 2, h, literal(value), { fill: light, size: 6.5, bold: true, align: 'center' });
    };

    areas.forEach((cursos, area) => {
      drawCell(leftX, yL, leftW, rowH, area.toUpperCase(), { fill: blue, bold: true, size: 7, text: blueDark, maxLines: 1 });
      yL += rowH;

      cursos.forEach((curso) => {
        drawCell(leftX, yL, nameW, rowH, safe(curso.curso), { fill: light, size: 6.8, maxLines: 1 });
        for (let i = 1; i <= 4; i += 1) {
          drawNotaPair(leftX + nameW + pairW * (i - 1), yL, pairW, rowH, curso.promedio, i === bimNumero);
        }
        drawNotaPair(leftX + nameW + pairW * 4, yL, promW, rowH, curso.promedio, true);
        yL += rowH;
      });

      const valores = cursos
        .map((curso) => curso.promedio)
        .filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(Number(value)));
      const promedioArea = valores.length
        ? Math.round(valores.reduce((sum, value) => sum + Number(value), 0) / valores.length)
        : null;

      drawCell(leftX, yL, nameW, rowH, 'Promedio de Área:', { fill: gray, bold: true, size: 6.8 });
      for (let i = 1; i <= 4; i += 1) {
        drawNotaPair(leftX + nameW + pairW * (i - 1), yL, pairW, rowH, promedioArea, i === bimNumero);
      }
      drawNotaPair(leftX + nameW + pairW * 4, yL, promW, rowH, promedioArea, true);
      yL += rowH;
    });

    // Tabla derecha
    const rightX = 350;
    const rightY = 180;
    const rightW = 224;
    const indicatorW = 116;
    const bimW = (rightW - indicatorW) / 4;
    let yR = rightY;

    const drawRightHeader = (title: string) => {
      drawCell(rightX, yR, rightW, 14, title.toUpperCase(), { fill: blue, bold: true, align: 'center', size: 7, text: blueDark });
      yR += 14;
      drawCell(rightX, yR, indicatorW, 14, 'INDICADOR', { fill: blue, bold: true, align: 'center', size: 6.5, text: blueDark });
      ['I BIM', 'II BIM', 'III BIM', 'IV BIM'].forEach((label, index) => {
        drawCell(rightX + indicatorW + bimW * index, yR, bimW, 14, label, { fill: blue, bold: true, align: 'center', size: 6.1, text: blueDark });
      });
      yR += 14;
    };

    const drawRightRow = (label: string, value: string, h = 32) => {
      drawCell(rightX, yR, indicatorW, h, label, { fill: light, size: 6.2, valign: 'top', maxLines: 5 });
      for (let i = 1; i <= 4; i += 1) {
        drawCell(
          rightX + indicatorW + bimW * (i - 1),
          yR,
          bimW,
          h,
          i === bimNumero ? value : '',
          { fill: light, size: 7, bold: true, align: 'center' },
        );
      }
      yR += h;
    };

    drawRightHeader('Conducta');
    resumen.conducta.forEach((item) => {
      drawRightRow(safe(item.descripcion), safe(item.valor || ''), 30);
    });

    const conductaValores = resumen.conducta.map((item) => safe(item.valor));
    const conductaProm = promedioLiteralTutoria(conductaValores);
    drawRightRow('PROMEDIO', conductaProm, 16);

    yR += 8;

    drawRightHeader('Participación de padres de familia');
    resumen.participacion_familiar.forEach((item) => {
      drawRightRow(safe(item.descripcion), safe(item.valor || ''), 36);
    });

    yR += 8;

    drawRightHeader('Estadística');
    const statsRows = [
      ['Puntaje', String(resumen.estadistica.puntaje || '-')],
      ['Promedio', resumen.estadistica.promedio_general ? Number(resumen.estadistica.promedio_general).toFixed(2) : '-'],
      ['Cursos Desaprobados', String(resumen.estadistica.cursos_desaprobados || '-')],
      ['Orden de Mérito', String(resumen.estadistica.orden_merito || '-')],
      ['Tercio por Salón', String(resumen.estadistica.tercio || '-').toUpperCase().slice(0, 3)],
    ];

    statsRows.forEach(([label, value]) => drawRightRow(label, value, 15));

    // Fecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(`Lima, ${fechaTexto}`, rightX + rightW, Math.min(yR + 20, 650), { align: 'right' });

    // Comentario
    const commentY = 666;
    drawCell(20, commentY, pageWidth - 40, 14, 'COMENTARIOS DEL TUTOR(A)', {
      fill: blue,
      bold: true,
      align: 'center',
      size: 7,
      text: blueDark,
    });

    const comentario = safe(resumen.comentario || 'Sin comentario registrado.');
    const commentLines = doc.splitTextToSize(comentario, pageWidth - 54).slice(0, 5);

    drawCell(20, commentY + 14, pageWidth - 40, 54, '', { fill: light });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 30, 30);
    doc.text(commentLines, 26, commentY + 28, { lineHeightFactor: 1.15 });

    // Firmas
    const firmaY = 775;
    doc.setDrawColor(80, 80, 80);
    doc.line(90, firmaY, 220, firmaY);
    doc.line(360, firmaY, 510, firmaY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);

    doc.text(tutorNombre.toUpperCase(), 155, firmaY + 12, { align: 'center', maxWidth: 150 });
    doc.text('TUTOR(A)', 155, firmaY + 24, { align: 'center' });

    doc.text('DIRECCIÓN', 435, firmaY + 12, { align: 'center' });
    doc.text('DIRECTOR', 435, firmaY + 24, { align: 'center' });

    const buffer = Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
    const filenameBase = `${codigoAlumno}-${periodoNombre}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return {
      filename: `boleta-${filenameBase || idMatricula}.pdf`,
      buffer,
    };
  }

  async guardarCierreAlumno(user: JwtUser, idMatricula: number, body: { id_bimestre: number; comentario?: string; conducta?: { id_criterio: number; valor?: string | null }[]; participacion_familiar?: { id_criterio: number; valor?: string | null }[] }) {
    if (!body.id_bimestre) throw new BadRequestException('Periodo obligatorio.');
    const matricula = await this.assertMatriculaAccess(user, idMatricula);
    const usuario = await this.getUsuario(user.userId);
    const docenteId = usuario.persona?.docentes?.[0]?.id_persona || null;
    const criterios = await this.asegurarCriterios(matricula.id_colegio, matricula.id_tenant);
    const criterioIds = new Set(criterios.map((c) => c.id_criterio));
    const values = [...(body.conducta || []), ...(body.participacion_familiar || [])].filter((c) => criterioIds.has(Number(c.id_criterio)));
    const normalizar = (valor?: string | null) => {
      const v = String(valor || '').toUpperCase().trim();
      return ['AD', 'A', 'B', 'C'].includes(v) ? v : null;
    };

    await this.prisma.$transaction(async (tx) => {
      for (const item of values) {
        await tx.calificacionTutoria.upsert({
          where: { uq_calificacion_tutoria: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre), id_criterio: Number(item.id_criterio) } },
          update: { valor: normalizar(item.valor), id_usuario_registro: user.userId },
          create: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre), id_criterio: Number(item.id_criterio), valor: normalizar(item.valor), id_usuario_registro: user.userId },
        });
      }
      const comentarioPayload = {
        comentario: body.comentario || '',
        id_usuario_registro: user.userId,
        ...(docenteId ? { id_docente: docenteId } : {}),
      };

      await tx.comentarioBimestral.upsert({
        where: { id_matricula_id_bimestre: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre) } },
        update: comentarioPayload,
        create: {
          id_matricula: idMatricula,
          id_bimestre: Number(body.id_bimestre),
          ...comentarioPayload,
        },
      });
    });

    return { message: 'Cierre de tutoría guardado correctamente.' };
  }
}
