import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async getNotificaciones(usuarioId: number) {
    return this.prisma.notificacion.findMany({
      where: { id_usuario: usuarioId },
      orderBy: { fecha_creacion: 'desc' },
      take: 20,
    });
  }

  async getCountNoLeidas(usuarioId: number) {
    return this.prisma.notificacion.count({
      where: { id_usuario: usuarioId, leida: false },
    });
  }

  async marcarLeida(id: number) {
    return this.prisma.notificacion.update({
      where: { id_notif: id },
      data: { leida: true },
    });
  }

  async crearNotificacion(data: {
    id_usuario: number;
    tipo: string;
    titulo: string;
    mensaje: string;
    url?: string;
  }) {
    return this.prisma.notificacion.create({ data });
  }

  // Este método será llamado por otros servicios
  async notificarApoderadosDeAlumno(
    alumnoId: number,
    tipo: string,
    titulo: string,
    mensaje: string,
    url?: string,
  ) {
    // Buscar apoderados del alumno
    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_estudiante: alumnoId },
      include: {
        apoderado: {
          include: {
            persona: {
              include: { usuarios: true },
            },
          },
        },
      },
    });

    for (const rel of relaciones) {
      for (const usuario of rel.apoderado.persona.usuarios) {
        await this.crearNotificacion({
          id_usuario: usuario.id_usuario,
          tipo,
          titulo,
          mensaje,
          url,
        });
      }
    }
  }

  async notificarApoderadosDeNivel(
  nivelId: number,
  tipo: string,
  titulo: string,
  mensaje: string,
  url?: string,
) {
  // Buscar apoderados con hijos en ese nivel
  const apoderados = await this.prisma.apoderadoEstudiante.findMany({
    where: {
      estudiante: {
        matriculas: {
          some: {
            estado_matricula: 'Activo',
            seccion: { grado: { id_nivel: nivelId } },
          },
        },
      },
    },
    include: {
      apoderado: { include: { persona: { include: { usuarios: true } } } },
    },
  });

  // Usar un Set para evitar duplicados de usuario
  const usuariosNotificados = new Set<number>();

  for (const rel of apoderados) {
    for (const usuario of rel.apoderado.persona.usuarios) {
      if (!usuariosNotificados.has(usuario.id_usuario)) {
        usuariosNotificados.add(usuario.id_usuario);
        await this.crearNotificacion({
          id_usuario: usuario.id_usuario,
          tipo,
          titulo,
          mensaje,
          url,
        });
      }
    }
  }
}

async enviarPush(usuarioId: number, titulo: string, mensaje: string) {
  const tokens = await this.prisma.tokenFCM.findMany({
    where: { id_usuario: usuarioId },
  });
  // TODO: Integrar con Firebase Admin SDK
  console.log(`[FCM] Enviando a ${tokens.length} dispositivos: ${titulo} - ${mensaje}`);
}
}
