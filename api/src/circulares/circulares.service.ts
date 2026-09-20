import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateCircularDto } from './dto/create-circular.dto';

type PortalAudienceScope = {
  branches: Prisma.CircularWhereInput[];
  levelIds: Set<number>;
  sectionIds: Set<number>;
};

@Injectable()
export class CircularesService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  // ── CREAR CIRCULAR ──────────────────────────────────
  async create(dto: CreateCircularDto, remitenteId: number) {
    const circular = await this.prisma.circular.create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        remitente_id_usuario: remitenteId,
        categoria: dto.categoria || 'General',
        urgente: dto.urgente || false,
        requiere_autorizacion: dto.requiere_autorizacion || false,
      },
    });

    const destinatarios: {
      id_circular: number;
      id_nivel?: number;
      id_seccion?: number;
    }[] = [];

    if (dto.niveles && dto.niveles.length > 0) {
      for (const nivelId of dto.niveles) {
        if (!dto.secciones || dto.secciones.length === 0) {
          destinatarios.push({ id_circular: circular.id_circular, id_nivel: nivelId });
        } else {
          for (const seccionId of dto.secciones) {
            const seccion = await this.prisma.seccion.findUnique({
              where: { id_seccion: seccionId },
              include: { grado: { include: { nivel: true } } },
            });
            if (seccion) {
              destinatarios.push({
                id_circular: circular.id_circular,
                id_nivel: seccion.grado.id_nivel,
                id_seccion: seccionId,
              });
            }
          }
        }
      }
    } else if (dto.secciones && dto.secciones.length > 0) {
      for (const seccionId of dto.secciones) {
        const seccion = await this.prisma.seccion.findUnique({
          where: { id_seccion: seccionId },
          include: { grado: { include: { nivel: true } } },
        });
        if (seccion) {
          destinatarios.push({
            id_circular: circular.id_circular,
            id_nivel: seccion.grado.id_nivel,
            id_seccion: seccionId,
          });
        }
      }
    } else {
      const todosNiveles = await this.prisma.nivel.findMany();
      for (const nivel of todosNiveles) {
        destinatarios.push({
          id_circular: circular.id_circular,
          id_nivel: nivel.id_nivel,
        });
      }
    }

    if (destinatarios.length > 0) {
      await this.prisma.circularDestinatario.createMany({ data: destinatarios });
    }

    // Notificar a los apoderados de los niveles seleccionados
    if (dto.niveles && dto.niveles.length > 0) {
      await this.notificacionesService.notificarApoderadosDeNivel({
        nivelIds: dto.niveles,
        tipo: 'circular.publicada',
        origen: 'sistema',
        referencia_tipo: 'circular',
        referencia_id: circular.id_circular,
        canal: 'padres',
        titulo: 'Nueva circular',
        mensaje: `Se ha publicado una nueva circular: "${circular.titulo}"`,
        url: `/dashboard/circulares?id_circular=${circular.id_circular}`,
      });
    }

    return circular;
  }

  // ── LISTAR PARA INTRANET ────────────────────────────
  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [circulares, total] = await Promise.all([
      this.prisma.circular.findMany({
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          remitente: { include: { persona: true } },
          adjuntos: true,
          destinatarios: true,
        },
      }),
      this.prisma.circular.count(),
    ]);
    return { data: circulares, total, page, limit };
  }

  // ── VER DETALLE ─────────────────────────────────────
  async findOne(id: number) {
    const circular = await this.prisma.circular.findUnique({
      where: { id_circular: id },
      include: {
        remitente: { include: { persona: true } },
        destinatarios: { include: { nivel: true, seccion: true } },
        adjuntos: true,
      },
    });
    if (!circular) throw new NotFoundException('Circular no encontrada');
    return circular;
  }

  // ── LISTAR PARA APODERADO (APP) ─────────────────────
  async findForApoderado(apoderadoId: number) {
    const scope = await this.getAudienceScope(apoderadoId);
    if (!scope.branches.length) return [];

    const circulares = await this.prisma.circular.findMany({
      where: { OR: scope.branches },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        remitente: { include: { persona: true } },
        adjuntos: true,
        destinatarios: { include: { nivel: true, seccion: true } },
      },
      distinct: ['id_circular'],
    });

    return circulares.map((c) => {
      const destinatario = c.destinatarios.find((item) =>
        this.isCircularAudienceMatch(c, item, scope),
      );

      const dirigido_a = c.destinatarios
        .map((d) => {
          if (!d.id_nivel && !d.id_seccion) return 'Todos';
          if (d.id_nivel && d.id_seccion) {
            return `${d.nivel?.nombre_nivel || ''} ${d.seccion?.letra || ''}`.trim();
          }
          if (d.id_nivel) return d.nivel?.nombre_nivel || '';
          return '';
        })
        .filter(Boolean)
        .join(', ');

      return {
        ...c,
        leida: destinatario?.leida ?? false,
        dirigido_a: dirigido_a || 'General',
      };
    });
  }

  private async getAudienceScope(
    apoderadoId: number,
  ): Promise<PortalAudienceScope> {
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: {
          in: ['Activo', 'Matriculado', 'Pre-matriculado'],
        },
        estudiante: {
          apoderados: { some: { id_apoderado: apoderadoId } },
        },
      },
      select: {
        id_tenant: true,
        id_colegio: true,
        id_seccion: true,
        colegio: { select: { id_tenant: true } },
        seccion: {
          select: {
            id_colegio: true,
            colegio: { select: { id_tenant: true } },
            grado: { select: { id_nivel: true } },
          },
        },
      },
    });

    const levelIds = new Set<number>();
    const sectionIds = new Set<number>();
    const branches = matriculas.flatMap((matricula) => {
      const tenantId =
        matricula.id_tenant ??
        matricula.colegio?.id_tenant ??
        matricula.seccion.colegio?.id_tenant;
      const schoolId = matricula.id_colegio ?? matricula.seccion.id_colegio;
      if (!tenantId || !schoolId) return [];
      levelIds.add(matricula.seccion.grado.id_nivel);
      sectionIds.add(matricula.id_seccion);
      return [
        {
          OR: [
            {
              id_colegio: schoolId,
              OR: [{ id_tenant: tenantId }, { id_tenant: null }],
              destinatarios: {
                some: {
                  OR: [
                    { id_nivel: null, id_seccion: null },
                    {
                      id_nivel: matricula.seccion.grado.id_nivel,
                      id_seccion: null,
                    },
                    { id_seccion: matricula.id_seccion },
                  ],
                },
              },
            },
            {
              id_tenant: null,
              id_colegio: null,
              destinatarios: {
                some: { id_seccion: matricula.id_seccion },
              },
            },
          ],
        },
      ];
    });

    return { branches, levelIds, sectionIds };
  }

  private isAudienceMatch(
    destinatario: { id_nivel: number | null; id_seccion: number | null },
    scope: PortalAudienceScope,
  ) {
    if (!destinatario.id_nivel && !destinatario.id_seccion) return true;
    if (destinatario.id_seccion) {
      return scope.sectionIds.has(destinatario.id_seccion);
    }
    return Boolean(
      destinatario.id_nivel && scope.levelIds.has(destinatario.id_nivel),
    );
  }

  private isCircularAudienceMatch(
    circular: { id_colegio: number | null },
    destinatario: { id_nivel: number | null; id_seccion: number | null },
    scope: PortalAudienceScope,
  ) {
    if (!circular.id_colegio) {
      return Boolean(
        destinatario.id_seccion &&
          scope.sectionIds.has(destinatario.id_seccion),
      );
    }
    return this.isAudienceMatch(destinatario, scope);
  }

  // ── TOTAL DE CIRCULARES ────────────────────────────
  async getTotalCirculares() {
    return this.prisma.circular.count();
  }

  // ── MARCAR COMO LEÍDA ───────────────────────────────
  async marcarLeida(circularId: number, apoderadoId: number) {
    const scope = await this.getAudienceScope(apoderadoId);
    const circular = scope.branches.length
      ? await this.prisma.circular.findFirst({
          where: { id_circular: circularId, OR: scope.branches },
          include: { destinatarios: true },
        })
      : null;
    if (!circular) throw new NotFoundException('Circular no disponible.');

    const destinationIds = circular.destinatarios
      .filter((item) => this.isCircularAudienceMatch(circular, item, scope))
      .map((item) => item.id);

    await this.prisma.circularDestinatario.updateMany({
      where: {
        id_circular: circularId,
        id: { in: destinationIds },
      },
      data: { leida: true, fecha_lectura: new Date() },
    });

    return { message: 'Circular marcada como leída' };
  }
}
