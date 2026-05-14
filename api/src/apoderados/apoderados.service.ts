import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApoderadosService {
  constructor(private prisma: PrismaService) {}

  async getPerfil(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: {
        persona: {
          include: {
            apoderados: true,
          },
        },
      },
    });

    if (!usuario || !usuario.persona.apoderados?.[0]) {
      throw new NotFoundException('Apoderado no encontrado');
    }

    const apoderado = usuario.persona.apoderados[0];

    return {
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      nombres: usuario.persona.nombres,
      apellido_paterno: usuario.persona.apellido_paterno,
      apellido_materno: usuario.persona.apellido_materno,
      correo: usuario.persona.correo,
      telefono: usuario.persona.telefono,
      ocupacion: apoderado.ocupacion,
      tema: usuario.tema,
      notificaciones_activas: usuario.notificaciones_activas,
      avatar_url: usuario.avatar_url,
    };
  }

  async updatePerfil(usuarioId: number, data: {
    correo?: string;
    telefono?: string;
    ocupacion?: string;
    tema?: string;
    notificaciones_activas?: boolean;
    avatar_url?: string;
  }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { persona: { include: { apoderados: true } } },
    });

    if (!usuario || !usuario.persona.apoderados?.[0]) {
      throw new NotFoundException('Apoderado no encontrado');
    }

    // Actualizar persona
    if (data.correo !== undefined || data.telefono !== undefined) {
      await this.prisma.persona.update({
        where: { id_persona: usuario.id_persona },
        data: {
          ...(data.correo !== undefined && { correo: data.correo }),
          ...(data.telefono !== undefined && { telefono: data.telefono }),
        },
      });
    }

    // Actualizar apoderado
    if (data.ocupacion !== undefined) {
      await this.prisma.apoderado.update({
        where: { id_persona: usuario.id_persona },
        data: { ocupacion: data.ocupacion },
      });
    }

    // Actualizar usuario
    await this.prisma.usuario.update({
      where: { id_usuario: usuarioId },
      data: {
        ...(data.tema !== undefined && { tema: data.tema }),
        ...(data.notificaciones_activas !== undefined && { notificaciones_activas: data.notificaciones_activas }),
        ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
      },
    });

    return this.getPerfil(usuarioId);
  }
}