import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

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
}