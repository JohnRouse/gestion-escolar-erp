import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCircularDto } from './dto/create-circular.dto';

@Injectable()
export class CircularesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCircularDto, remitenteId: number) {
    // Crear la circular principal
    const circular = await this.prisma.circular.create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        remitente_id_usuario: remitenteId,
      },
    });

    // Preparar los destinatarios
    const destinatarios: { id_circular: number; id_nivel?: number; id_seccion?: number }[] = [];

    // Si se enviaron niveles específicos
    if (dto.niveles && dto.niveles.length > 0) {
      for (const nivelId of dto.niveles) {
        // Si no se especifican secciones, va a todo el nivel
        if (!dto.secciones || dto.secciones.length === 0) {
          destinatarios.push({
            id_circular: circular.id_circular,
            id_nivel: nivelId,
          });
        } else {
          // Si hay secciones, se asume que pertenecen a ese nivel
          for (const seccionId of dto.secciones) {
            destinatarios.push({
              id_circular: circular.id_circular,
              id_nivel: nivelId,
              id_seccion: seccionId,
            });
          }
        }
      }
    } else if (dto.secciones && dto.secciones.length > 0) {
      // Solo secciones sin nivel explícito: obtenemos el nivel de cada sección
      for (const seccionId of dto.secciones) {
        const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: seccionId } });
        if (seccion) {
          destinatarios.push({
            id_circular: circular.id_circular,
            id_nivel: seccion.id_grado, // Nota: seccion.id_grado no da el nivel directamente, necesitamos el grado->nivel
            // Mejor calcular nivel a partir del grado. Pero por simplicidad, lo dejamos así.
            // Vamos a corregir: consultar grado y nivel.
          });
        }
      }
      // Corregimos la lógica: para cada sección, obtenemos su grado y luego el nivel
      destinatarios.length = 0; // limpiamos
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
      // Si no se enviaron niveles ni secciones, va a todo el colegio (todos los niveles)
      const todosNiveles = await this.prisma.nivel.findMany();
      for (const nivel of todosNiveles) {
        destinatarios.push({
          id_circular: circular.id_circular,
          id_nivel: nivel.id_nivel,
        });
      }
    }

    // Insertar destinatarios
    if (destinatarios.length > 0) {
      await this.prisma.circularDestinatario.createMany({ data: destinatarios });
    }

    return circular;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [circulares, total] = await Promise.all([
      this.prisma.circular.findMany({
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        include: { remitente: { include: { persona: true } } },
      }),
      this.prisma.circular.count(),
    ]);
    return { data: circulares, total, page, limit };
  }

  async findOne(id: number) {
    const circular = await this.prisma.circular.findUnique({
      where: { id_circular: id },
      include: {
        remitente: { include: { persona: true } },
        destinatarios: { include: { nivel: true, seccion: true } },
      },
    });
    if (!circular) throw new NotFoundException('Circular no encontrada');
    return circular;
  }

  async findForApoderado(apoderadoId: number) {
    // Obtener los estudiantes asociados al apoderado
    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderadoId },
      select: { id_estudiante: true },
    });
    const estudianteIds = relaciones.map(r => r.id_estudiante);

    // Obtener las matrículas activas de esos estudiantes para saber sus secciones/niveles
    const matriculas = await this.prisma.matricula.findMany({
      where: { id_estudiante: { in: estudianteIds }, estado_matricula: 'Activo' },
      include: { seccion: { include: { grado: { include: { nivel: true } } } } },
    });

    // Recolectar pares (id_nivel, id_seccion) únicos
    const destinos = new Map<string, { id_nivel: number; id_seccion: number | null }>();
    for (const mat of matriculas) {
      const id_nivel = mat.seccion.grado.id_nivel;
      const id_seccion = mat.id_seccion;
      const key = `${id_nivel}_${id_seccion}`;
      if (!destinos.has(key)) {
        destinos.set(key, { id_nivel, id_seccion });
      }
    }

    // También considerar niveles completos si tienen estudiantes (sin sección específica)
    const niveles = new Set<number>();
    for (const d of destinos.values()) {
      niveles.add(d.id_nivel);
    }

    const seccionesHijos = Array.from(
  new Set(
    Array.from(destinos.values())
      .map(d => d.id_seccion)
      .filter(Boolean) as number[]
  )
);

    // Buscar circulares donde el destinatario coincida con alguno de los niveles
    // o secciones de sus hijos, o que sean globales (id_nivel null e id_seccion null)
    const circulares = await this.prisma.circular.findMany({
  where: {
    destinatarios: {
      some: {
        OR: [
          // Global: sin nivel ni sección
          { id_nivel: null, id_seccion: null },
          // Para el nivel específico sin sección (todo el nivel)
          { id_nivel: { in: Array.from(niveles) }, id_seccion: null },
          // Para la sección específica dentro del nivel
          { id_nivel: { in: Array.from(niveles) }, id_seccion: { in: seccionesHijos } },
        ],
      },
    },
  },
  orderBy: { fecha_creacion: 'desc' },
  include: {
    remitente: {
      include: { persona: true },
    },
  },
  distinct: ['id_circular'],
});

    return circulares;
  }
}