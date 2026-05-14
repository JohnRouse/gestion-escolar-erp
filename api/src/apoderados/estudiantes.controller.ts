import { Controller, Put, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('estudiantes')
@UseGuards(AuthGuard('jwt'))
export class EstudiantesController {
  constructor(private prisma: PrismaService) {}

  @Put(':id/avatar')
  async updateAvatar(
    @Param('id') id: string,
    @Body() body: { avatar_url: string },
    @Request() req,
  ) {
    const estudianteId = Number(id);
    const usuarioId = req.user.userId;

    // Verificar que el estudiante exista y que el usuario sea su apoderado
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: estudianteId },
      include: {
        apoderados: {
          where: {
            apoderado: {
              persona: {
                usuarios: { some: { id_usuario: usuarioId } },
              },
            },
          },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.apoderados.length === 0) {
      throw new ForbiddenException('No tienes permiso para modificar este estudiante');
    }

    await this.prisma.estudiante.update({
      where: { id_persona: estudianteId },
      data: { avatar_url: body.avatar_url },
    });

    return { message: 'Avatar actualizado correctamente' };
  }
}