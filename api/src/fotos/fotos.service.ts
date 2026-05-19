import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FotosService {
  constructor(private prisma: PrismaService) {}

  async obtenerFotos(seccionId: number) {
  const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: seccionId } });
  if (!seccion) throw new NotFoundException('Sección no encontrada');

  return this.prisma.foto.findMany({
    where: {
      OR: [
        { id_seccion: seccionId },
        { id_seccion: null },   // fotos generales
      ],
    },
    orderBy: { creado_en: 'desc' },
    take: 50,
  });
}
}
