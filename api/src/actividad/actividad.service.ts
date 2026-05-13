import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActividadService {
  constructor(private prisma: PrismaService) {}

  async getActividad(alumnoId: number, limite: number = 5) {
    const matricula = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: { include: { grado: { include: { nivel: true } } } } },
    });
    if (!matricula) return [];

    const idMatricula = matricula.id_matricula;
    const idNivel = matricula.seccion.grado.id_nivel;
    const idSeccion = matricula.seccion.id_seccion;

    const [circulares, notas, pagos, asistencias] = await Promise.all([
      this.prisma.circular.findMany({
        where: {
          destinatarios: {
            some: {
              OR: [
                { id_nivel: null, id_seccion: null },
                { id_nivel: idNivel, id_seccion: null },
                { id_nivel: idNivel, id_seccion: idSeccion },
              ],
            },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
        take: limite,
      }),
      this.prisma.notaAlumno.findMany({
        where: { id_matricula: idMatricula },
        orderBy: { id_nota: 'desc' },
        take: limite,
        include: {
          evaluacion: { select: { descripcion_actividad: true } },
        },
      }),
      this.prisma.pagoTransaccion.findMany({
        where: { cronograma: { id_matricula: idMatricula } },
        orderBy: { fecha_pago: 'desc' },
        take: limite,
      }),
      this.prisma.asistencia.findMany({
        where: { id_matricula: idMatricula },
        orderBy: { fecha: 'desc' },
        take: limite,
      }),
    ]);

    const eventos = [
      ...circulares.map((c) => ({
        tipo: 'circular',
        icono: '📢',
        mensaje: `Circular: ${c.titulo}`,
        fecha: c.fecha_creacion.toISOString(),
        url: '/dashboard/circulares',
      })),
      ...notas.map((n) => ({
        tipo: 'nota',
        icono: '📝',
        mensaje: `Nota de ${n.evaluacion.descripcion_actividad}: ${n.valor_nota}`,
        fecha: new Date().toISOString(),
        url: '/dashboard/calificaciones',
      })),
      ...pagos.map((p) => ({
        tipo: 'pago',
        icono: '💳',
        mensaje: `Pago registrado de S/ ${Number(p.monto_pagado).toFixed(2)}`,
        fecha: p.fecha_pago.toISOString(),
        url: '/dashboard/pagos',
      })),
      ...asistencias.map((a) => ({
        tipo: 'asistencia',
        icono: a.estado === 'Presente' ? '✅' : a.estado === 'Ausente' ? '❌' : a.estado === 'Tardanza' ? '⏱️' : '📝',
        mensaje: `Asistencia: ${a.estado}`,
        fecha: a.fecha.toISOString(),
        url: '/dashboard/asistencia',
      })),
    ];

    return eventos
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, limite);
  }
}