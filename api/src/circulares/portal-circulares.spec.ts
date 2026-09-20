/* eslint-disable */
import { NotFoundException } from '@nestjs/common';
import { CircularesService } from './circulares.service';

const enrollment = {
  id_tenant: 1,
  id_colegio: 10,
  id_seccion: 30,
  colegio: { id_tenant: 1 },
  seccion: {
    id_colegio: 10,
    colegio: { id_tenant: 1 },
    grado: { id_nivel: 20 },
  },
};

function setup() {
  const prisma: any = {
    matricula: { findMany: jest.fn().mockResolvedValue([enrollment]) },
    circular: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    circularDestinatario: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return {
    prisma,
    service: new CircularesService(prisma, {} as any),
  };
}

describe('Circulares del portal', () => {
  test('lista por vínculo, matrícula operativa, colegio y audiencia', async () => {
    const { prisma, service } = setup();

    await expect(service.findForApoderado(80)).resolves.toEqual([]);

    expect(prisma.matricula.findMany.mock.calls[0][0].where).toMatchObject({
      estado_matricula: {
        in: ['Activo', 'Matriculado', 'Pre-matriculado'],
      },
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
    });
    expect(prisma.circular.findMany.mock.calls[0][0].where.OR).toHaveLength(1);
  });

  test('marca únicamente destinos compatibles con el hijo', async () => {
    const { prisma, service } = setup();
    prisma.circular.findFirst.mockResolvedValue({
      id_circular: 5,
      id_tenant: 1,
      id_colegio: 10,
      destinatarios: [
        { id: 1, id_nivel: null, id_seccion: null },
        { id: 2, id_nivel: 20, id_seccion: 30 },
        { id: 3, id_nivel: 99, id_seccion: 999 },
      ],
    });

    await expect(service.marcarLeida(5, 80)).resolves.toEqual({
      message: 'Circular marcada como leída',
    });
    expect(prisma.circularDestinatario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_circular: 5, id: { in: [1, 2] } },
      }),
    );
  });

  test('no permite mutar una circular fuera de audiencia', async () => {
    const { prisma, service } = setup();
    prisma.circular.findFirst.mockResolvedValue(null);

    await expect(service.marcarLeida(999, 80)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.circularDestinatario.updateMany).not.toHaveBeenCalled();
  });
});
