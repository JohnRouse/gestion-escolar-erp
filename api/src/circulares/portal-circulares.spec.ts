/* eslint-disable */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CircularesService } from './circulares.service';

const enrollment = {
  id_estudiante: 90,
  id_tenant: 1,
  id_colegio: 10,
  id_anio: 101,
  id_seccion: 30,
  colegio: { id_tenant: 1 },
  estudiante: {
    persona: {
      nombres: 'Víctor Alonso',
      apellido_paterno: 'Díaz',
      apellido_materno: 'Ramos',
    },
  },
  seccion: {
    id_colegio: 10,
    colegio: { id_tenant: 1 },
    grado: { id_nivel: 20 },
  },
};

const portalActor = {
  id_persona: 80,
  estado: true,
  rol: { nombre_rol: 'Apoderado' },
  persona: { apoderados: [{ id_persona: 80 }] },
};

function circular(overrides: Record<string, unknown> = {}) {
  return {
    id_circular: 5,
    id_tenant: 1,
    id_colegio: 10,
    id_anio: 101,
    titulo: 'Reunión institucional',
    contenido: 'Contenido',
    fecha_creacion: new Date('2026-09-19T15:00:00.000Z'),
    remitente_id_usuario: 7,
    categoria: 'General',
    urgente: false,
    requiere_autorizacion: true,
    colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio Uno' },
    anio: {
      id_anio: 101,
      nombre_anio: 'Año Escolar 2027',
      estado: 'Planificación',
    },
    remitente: {
      persona: {
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Rojas',
      },
    },
    adjuntos: [],
    destinatarios: [
      {
        id: 1,
        id_circular: 5,
        id_nivel: null,
        id_seccion: null,
        nivel: null,
        seccion: null,
        leida: true,
        confirmada: true,
      },
    ],
    estados_apoderados: [],
    ...overrides,
  };
}

function setup() {
  const state = {
    id: 1,
    id_circular: 5,
    id_apoderado: 80,
    fecha_lectura: new Date('2026-09-19T16:00:00.000Z'),
    fecha_confirmacion: null,
    id_usuario_lectura: 70,
    id_usuario_confirmacion: null,
  };
  const prisma: any = {
    usuario: { findUnique: jest.fn().mockResolvedValue(portalActor) },
    matricula: { findMany: jest.fn().mockResolvedValue([enrollment]) },
    circular: {
      findMany: jest.fn().mockResolvedValue([circular()]),
      findFirst: jest.fn().mockResolvedValue(circular()),
    },
    circularEstadoApoderado: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue(state),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(prisma),
  );
  return {
    prisma,
    service: new CircularesService(prisma, {} as any, {} as any),
  };
}

describe('Comunicados V1 del portal', () => {
  test('deriva audiencia de vínculo real y matrículas operativas', async () => {
    const { prisma, service } = setup();
    const result = await service.findForApoderado(70, 80);
    expect(result[0]).toMatchObject({
      id_circular: 5,
      leida: false,
      confirmada: false,
      hijos_incluidos: [
        { id_estudiante: 90, nombre: 'Víctor Alonso Díaz Ramos' },
      ],
    });
    expect(prisma.matricula.findMany.mock.calls[0][0].where).toMatchObject({
      estado_matricula: {
        in: ['Activo', 'Matriculado', 'Pre-matriculado'],
      },
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
    });
  });

  test('ignora los flags legacy compartidos al calcular el estado personal', async () => {
    const { service } = setup();
    await expect(service.findForApoderado(70, 80)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ leida: false, confirmada: false }),
      ]),
    );
  });

  test('la lectura escribe solo el estado del apoderado y conserva idempotencia', async () => {
    const { prisma, service } = setup();
    await service.marcarLeida(5, 70, 80);
    expect(prisma.circularEstadoApoderado.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_circular: 5,
          id_apoderado: 80,
          fecha_lectura: null,
        }),
      }),
    );
    expect(prisma.circularEstadoApoderado.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_circular_id_apoderado: { id_circular: 5, id_apoderado: 80 },
        },
        update: {},
      }),
    );
    expect(prisma.circularDestinatario).toBeUndefined();
  });

  test('dos apoderados usan claves personales diferentes', async () => {
    const { prisma, service } = setup();
    await service.marcarLeida(5, 70, 80);
    prisma.usuario.findUnique.mockResolvedValue({
      ...portalActor,
      id_persona: 81,
      persona: { apoderados: [{ id_persona: 81 }] },
    });
    await service.marcarLeida(5, 71, 81);
    const keys = prisma.circularEstadoApoderado.upsert.mock.calls.map(
      (call: any[]) => call[0].where.id_circular_id_apoderado.id_apoderado,
    );
    expect(keys).toEqual([80, 81]);
  });

  test('confirmación personal asegura lectura y actor, sin tocar audiencia', async () => {
    const { prisma, service } = setup();
    prisma.circularEstadoApoderado.upsert.mockResolvedValue({
      ...prisma.circularEstadoApoderado.upsert.getMockImplementation,
      fecha_lectura: new Date(),
      fecha_confirmacion: new Date(),
    });
    const result = await service.confirmar(5, 70, 80);
    expect(result.confirmada).toBe(true);
    expect(prisma.circularEstadoApoderado.updateMany).toHaveBeenCalledTimes(2);
    expect(
      prisma.circularEstadoApoderado.upsert.mock.calls[0][0].create,
    ).toMatchObject({
      id_circular: 5,
      id_apoderado: 80,
      id_usuario_lectura: 70,
      id_usuario_confirmacion: 70,
    });
    expect(prisma.circularDestinatario).toBeUndefined();
  });

  test('dos apoderados confirman con claves y usuarios de auditoría distintos', async () => {
    const { prisma, service } = setup();
    prisma.circularEstadoApoderado.upsert.mockImplementation(
      ({ create }: any) => Promise.resolve(create),
    );
    await service.confirmar(5, 70, 80);
    prisma.usuario.findUnique.mockResolvedValue({
      ...portalActor,
      id_persona: 81,
      persona: { apoderados: [{ id_persona: 81 }] },
    });
    await service.confirmar(5, 71, 81);

    const creates = prisma.circularEstadoApoderado.upsert.mock.calls.map(
      (call: any[]) => call[0].create,
    );
    expect(creates).toEqual([
      expect.objectContaining({
        id_apoderado: 80,
        id_usuario_confirmacion: 70,
      }),
      expect.objectContaining({
        id_apoderado: 81,
        id_usuario_confirmacion: 71,
      }),
    ]);
  });

  test('rechaza confirmar un comunicado que no lo requiere', async () => {
    const { prisma, service } = setup();
    prisma.circular.findFirst.mockResolvedValue(
      circular({ requiere_autorizacion: false }),
    );
    await expect(service.confirmar(5, 70, 80)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  test('un comunicado ajeno no se puede leer ni confirmar', async () => {
    const { prisma, service } = setup();
    prisma.circular.findFirst.mockResolvedValue(null);
    await expect(service.marcarLeida(999, 70, 80)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.confirmar(999, 70, 80)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.circularEstadoApoderado.upsert).not.toHaveBeenCalled();
  });

  test('el ID del query/deep link no concede acceso', async () => {
    const { prisma, service } = setup();
    prisma.circular.findMany.mockResolvedValue([]);
    await expect(service.findForApoderado(70, 80)).resolves.toEqual([]);
  });

  test('la misma sección de otro año no recibe el comunicado nuevo', async () => {
    const { prisma, service } = setup();
    prisma.circular.findMany.mockResolvedValue([
      circular({
        id_anio: 100,
        anio: {
          id_anio: 100,
          nombre_anio: 'Año Escolar 2026',
          estado: 'Abierto',
        },
      }),
    ]);

    await expect(service.findForApoderado(70, 80)).resolves.toEqual([]);
  });

  test('lectura y confirmación rechazan audiencia de la misma sección en otro año', async () => {
    const { prisma, service } = setup();
    prisma.circular.findFirst.mockResolvedValue(circular({ id_anio: 100 }));

    await expect(service.marcarLeida(5, 70, 80)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.confirmar(5, 70, 80)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.circularEstadoApoderado.upsert).not.toHaveBeenCalled();
  });

  test('legacy con id_anio NULL conserva la coincidencia contextual previa', async () => {
    const { prisma, service } = setup();
    prisma.circular.findMany.mockResolvedValue([
      circular({ id_anio: null, anio: null }),
    ]);

    await expect(service.findForApoderado(70, 80)).resolves.toHaveLength(1);
  });

  test('legacy sin colegio solo genera ramas seguras por sección', async () => {
    const { prisma, service } = setup();
    await service.findForApoderado(70, 80);
    const where = prisma.circular.findMany.mock.calls[0][0].where;
    const legacy = where.OR.find(
      (branch: any) => branch.id_tenant === null && branch.id_colegio === null,
    );
    expect(legacy).toEqual({
      id_anio: null,
      id_tenant: null,
      id_colegio: null,
      destinatarios: { some: { id_seccion: 30 } },
    });
  });

  test('rechaza identidad portal que no corresponde al apoderado del JWT', async () => {
    const { service } = setup();
    await expect(service.findForApoderado(70, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
