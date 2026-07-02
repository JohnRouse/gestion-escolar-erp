import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TutoriaAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.rol) {
      throw new ForbiddenException('No tienes acceso a tutoría.');
    }

    if (['Admin', 'Director'].includes(user.rol)) {
      return true;
    }

    if (user.rol !== 'Profesor') {
      throw new ForbiddenException('No tienes acceso a tutoría.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: user.userId },
      include: {
        persona: {
          include: {
            staff: true,
          },
        },
      },
    });

    const tieneSeccionTutor = (usuario?.persona?.staff || []).some(
      (staff: any) => staff.es_tutor && staff.id_seccion,
    );

    if (!tieneSeccionTutor) {
      throw new ForbiddenException('Solo los profesores tutores pueden acceder a tutoría.');
    }

    return true;
  }
}
