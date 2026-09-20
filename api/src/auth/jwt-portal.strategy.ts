import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

const ROLES_PORTAL = ['apoderado', 'padre', 'madre'];

@Injectable()
export class JwtPortalStrategy extends PassportStrategy(
  Strategy,
  'jwt-portal',
) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'SECRETO_TEMPORAL_COLEGIO',
    });
  }

  async validate(payload: {
    sub: number;
    username: string;
    rol: string;
    personaId?: number;
    canal?: string;
  }) {
    if (payload.canal !== 'portal-padres') {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: payload.sub },
      include: {
        rol: true,
        persona: { select: { apoderados: { select: { id_persona: true } } } },
      },
    });
    const rol = user?.rol?.nombre_rol;
    const rolNormalizado = String(rol || '')
      .trim()
      .toLowerCase();

    if (
      !user?.estado ||
      !ROLES_PORTAL.includes(rolNormalizado) ||
      !user.persona?.apoderados?.length
    ) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id_usuario,
      personaId: user.id_persona,
      username: user.username,
      rol,
      canal: 'portal-padres',
    };
  }
}
