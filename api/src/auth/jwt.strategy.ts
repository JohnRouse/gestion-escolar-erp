import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'SECRETO_TEMPORAL_COLEGIO',
    });
  }

  async validate(payload: { sub: number; username: string; rol: string }) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: payload.sub },
      include: {
        rol: true,
      },
    });

    if (!user || !user.estado) {
      throw new UnauthorizedException();
    }

    const rol = user.rol?.nombre_rol || payload.rol;
    const rolNormalizado = String(rol || '').trim().toLowerCase();

    if (['apoderado', 'padre', 'madre'].includes(rolNormalizado)) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      username: payload.username,
      rol,
    };
  }
}