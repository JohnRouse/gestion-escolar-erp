import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateCircularDto } from './dto/create-circular.dto';

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
      for (const nivelId of dto.niveles) {
        await this.notificacionesService.notificarApoderadosDeNivel(
  nivelId,
  'informativa',
  'Nueva circular',
  `Se ha publicado una nueva circular: "${circular.titulo}"`,
  `/dashboard/circulares?id_circular=${circular.id_circular}`,
);
      }
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
  const relaciones = await this.prisma.apoderadoEstudiante.findMany({
    where: { id_apoderado: apoderadoId },
    select: { id_estudiante: true },
  });
  const estudianteIds = relaciones.map((r) => r.id_estudiante);

  const matriculas = await this.prisma.matricula.findMany({
    where: { id_estudiante: { in: estudianteIds }, estado_matricula: 'Activo' },
    include: { seccion: { include: { grado: { include: { nivel: true } } } } },
  });

  const destinos = new Map<string, { id_nivel: number; id_seccion: number | null }>();
  for (const mat of matriculas) {
    const id_nivel = mat.seccion.grado.id_nivel;
    const id_seccion = mat.id_seccion;
    const key = `${id_nivel}_${id_seccion}`;
    if (!destinos.has(key)) {
      destinos.set(key, { id_nivel, id_seccion });
    }
  }

  const niveles = new Set<number>();
  const seccionesHijos = new Set<number>();
  for (const d of destinos.values()) {
    niveles.add(d.id_nivel);
    if (d.id_seccion) seccionesHijos.add(d.id_seccion);
  }

  const circulares = await this.prisma.circular.findMany({
    where: {
      destinatarios: {
        some: {
          OR: [
            { id_nivel: null, id_seccion: null },
            { id_nivel: { in: Array.from(niveles) }, id_seccion: null },
            { id_nivel: { in: Array.from(niveles) }, id_seccion: { in: Array.from(seccionesHijos) } },
          ],
        },
      },
    },
    orderBy: { fecha_creacion: 'desc' },
    include: {
      remitente: { include: { persona: true } },
      adjuntos: true,
      destinatarios: { include: { nivel: true, seccion: true } },
    },
    distinct: ['id_circular'],
  });

  const circularesConLectura = circulares.map((c) => {
    const destinatario = c.destinatarios.find((d) => {
      if (!d.id_nivel && !d.id_seccion) return true;
      if (d.id_seccion && seccionesHijos.has(d.id_seccion)) return true;
      if (d.id_nivel && niveles.has(d.id_nivel) && !d.id_seccion) return true;
      return false;
    });

    // Construir el texto "Dirigido a"
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

  return circularesConLectura;
}

  // ── TOTAL DE CIRCULARES ────────────────────────────
  async getTotalCirculares() {
    return this.prisma.circular.count();
  }

  // ── MARCAR COMO LEÍDA ───────────────────────────────
  async marcarLeida(circularId: number, usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { persona: { include: { apoderados: true } } },
    });
    const apoderado = usuario?.persona?.apoderados?.[0];
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');

    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderado.id_persona },
      select: { id_estudiante: true },
    });
    const estudianteIds = relaciones.map((r) => r.id_estudiante);

    const matriculas = await this.prisma.matricula.findMany({
      where: { id_estudiante: { in: estudianteIds }, estado_matricula: 'Activo' },
      select: {
        id_seccion: true,
        seccion: { select: { grado: { select: { id_nivel: true } } } },
      },
    });

    const niveles = new Set<number>();
    const secciones = new Set<number>();
    for (const mat of matriculas) {
      niveles.add(mat.seccion.grado.id_nivel);
      secciones.add(mat.id_seccion);
    }

    await this.prisma.circularDestinatario.updateMany({
      where: {
        id_circular: circularId,
        OR: [
          { id_nivel: { in: Array.from(niveles) }, id_seccion: null },
          { id_seccion: { in: Array.from(secciones) } },
          { id_nivel: null, id_seccion: null },
        ],
      },
      data: { leida: true, fecha_lectura: new Date() },
    });

    return { message: 'Circular marcada como leída' };
  }
}