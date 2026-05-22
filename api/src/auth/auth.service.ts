import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      include: { persona: true, rol: true },
    });

    if (!user || !user.estado) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id_usuario,
      username: user.username,
      rol: user.rol.nombre_rol,
      personaId: user.id_persona,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id_usuario,
        username: user.username,
        nombre: `${user.persona.nombres} ${user.persona.apellido_paterno}`,
        rol: user.rol.nombre_rol,
        genero: user.persona.genero,
      },
    };
  }

  async getPerfil(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: { persona: true, rol: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    return {
      id: user.id_usuario,
      username: user.username,
      nombre: `${user.persona.nombres} ${user.persona.apellido_paterno}`,
      rol: user.rol.nombre_rol,
    };
  }

  async cambiarPassword(usuarioId: number, passwordActual: string, passwordNueva: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const hashed = await bcrypt.hash(passwordNueva, 10);
    await this.prisma.usuario.update({
      where: { id_usuario: usuarioId },
      data: { password_hash: hashed },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async updatePerfil(userId: number, data: any) {
  const user = await this.prisma.usuario.findUnique({
    where: { id_usuario: userId },
    include: { persona: true },
  });
  if (!user) throw new NotFoundException('Usuario no encontrado');

  // Actualizar persona
  if (data.nombres || data.apellido_paterno || data.apellido_materno || data.correo || data.telefono) {
    await this.prisma.persona.update({
      where: { id_persona: user.id_persona },
      data: {
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno,
        correo: data.correo,
        telefono: data.telefono,
      },
    });
  }

  // Actualizar avatar (foto de perfil)
  if (data.avatar_url !== undefined) {
    await this.prisma.usuario.update({
      where: { id_usuario: userId },
      data: { avatar_url: data.avatar_url },
    });
  }

  return this.getPerfil(userId);
}
}