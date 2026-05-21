import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Controller('nfc')
export class NfcController {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  @Post('lectura')
  async registrarLectura(@Body() body: { codigo_estudiante: string; tipo: string }) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { codigo_estudiante: body.codigo_estudiante },
    });
    if (!estudiante) return { error: 'Estudiante no encontrado' };

    // Registrar la lectura
    await this.prisma.registroNFC.create({
      data: {
        id_estudiante: estudiante.id_persona,
        tipo: body.tipo || 'entrada',
      },
    });

    // Notificar a los apoderados
    await this.notificacionesService.notificarApoderadosDeAlumno(
      estudiante.id_persona,
      'informativa',
      'Asistencia registrada',
      `Tu hijo ha registrado ${body.tipo || 'entrada'} al colegio a las ${new Date().toLocaleTimeString('es-PE')}`,
      '/dashboard/asistencia',
    );

    return { message: 'Lectura registrada' };
  }
}