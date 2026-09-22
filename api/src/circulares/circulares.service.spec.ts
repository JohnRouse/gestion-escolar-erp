/* eslint-disable */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CircularesService } from './circulares.service';

const person = {
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Rojas',
};

function actor(role = 'Admin', schoolId = 10, schoolRole = role) {
  return {
    estado: true,
    rol: { nombre_rol: role },
    tenants: [{ id_tenant: 1 }],
    colegios: [
      {
        id_colegio: schoolId,
        rol_colegio: schoolRole,
        colegio: { id_tenant: 1, nombre: 'Colegio Uno' },
      },
    ],
  };
}

function circularFixture(overrides: Record<string, unknown> = {}) {
  return {
    id_circular: 50,
    id_tenant: 1,
    id_colegio: 10,
    id_anio: 100,
    titulo: 'Comunicado de prueba',
    contenido: 'Contenido institucional',
    fecha_creacion: new Date('2026-09-19T15:00:00.000Z'),
    remitente_id_usuario: 7,
    categoria: 'General',
    urgente: false,
    requiere_autorizacion: false,
    colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio Uno' },
    anio: {
      id_anio: 100,
      nombre_anio: 'Año Escolar 2026',
      estado: 'Abierto',
    },
    remitente: { persona: person },
    adjuntos: [],
    destinatarios: [
      {
        id: 1,
        id_circular: 50,
        id_nivel: null,
        id_seccion: null,
        nivel: null,
        seccion: null,
      },
    ],
    ...overrides,
  };
}

function setup() {
  const prisma: any = {
    usuario: { findUnique: jest.fn().mockResolvedValue(actor()) },
    anioLectivo: {
      findMany: jest.fn().mockResolvedValue([
        {
          id_anio: 100,
          nombre_anio: 'Año Escolar 2026',
          estado: 'Abierto',
          fecha_inicio: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]),
    },
    seccionAnio: {
      findMany: jest.fn().mockResolvedValue([
        {
          seccion: {
            id_seccion: 30,
            letra: 'A',
            grado: {
              nombre_grado: 'Primero',
              nivel: { id_nivel: 20, nombre_nivel: 'Primaria' },
            },
          },
        },
      ]),
    },
    matricula: {
      findMany: jest.fn().mockResolvedValue([{ id_anio: 100 }]),
    },
    circular: {
      create: jest.fn().mockResolvedValue(circularFixture()),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(circularFixture()),
    },
    adjunto: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(prisma),
  );
  const notifications: any = {
    notificarApoderadosDeAudienciaComunicado: jest
      .fn()
      .mockResolvedValue({ creadas: 2 }),
  };
  const storage: any = { saveFile: jest.fn() };
  return {
    prisma,
    notifications,
    storage,
    service: new CircularesService(prisma, notifications, storage),
  };
}

const createDto = {
  id_tenant: 1,
  id_colegio: 10,
  id_anio: 100,
  titulo: 'Comunicado de prueba',
  contenido: 'Contenido institucional',
  categoria: 'General' as const,
  urgente: false,
  requiere_autorizacion: false,
  audiencia: { tipo: 'colegio' as const, ids: [] },
};

describe('Comunicados V1: gestión, scope y audiencia', () => {
  test.each(['Admin', 'Director', 'Secretaria'])(
    'permite crear a %s con rol institucional efectivo',
    async (role) => {
      const { prisma, service } = setup();
      prisma.usuario.findUnique.mockResolvedValue(actor(role));
      await expect(service.create(createDto, 7)).resolves.toMatchObject({
        id_circular: 50,
      });
    },
  );

  test('rechaza a Profesor aunque esté autenticado', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(actor('Profesor'));
    await expect(service.create(createDto, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  test('rechaza crear en otro colegio', async () => {
    const { service } = setup();
    await expect(
      service.create({ ...createDto, id_colegio: 99 }, 7),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('todo el colegio crea una sola fila nula y no consulta estructura global', async () => {
    const { prisma, service } = setup();
    prisma.seccionAnio.findMany.mockResolvedValue([]);
    await service.create(createDto, 7);
    expect(
      prisma.circular.create.mock.calls[0][0].data.destinatarios.create,
    ).toEqual([{ id_nivel: null, id_seccion: null }]);
    expect(prisma.seccionAnio.findMany).not.toHaveBeenCalled();
    expect(prisma.nivel).toBeUndefined();
  });

  test('opciones devuelve 2026 y 2027 y prefiere el año con matrícula operativa', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findMany.mockResolvedValue([
      {
        id_anio: 100,
        nombre_anio: 'Año Escolar 2026',
        estado: 'Abierto',
        fecha_inicio: new Date('2026-03-01T00:00:00.000Z'),
      },
      {
        id_anio: 101,
        nombre_anio: 'Año Escolar 2027',
        estado: 'Planificación',
        fecha_inicio: new Date('2027-03-01T00:00:00.000Z'),
      },
    ]);
    prisma.matricula.findMany.mockResolvedValue([{ id_anio: 101 }]);

    const options = await service.getOptions(7, {
      tenant_id: 1,
      colegio_id: 10,
    });

    expect(options.anios.map((item) => item.id_anio)).toEqual([101, 100]);
    expect(options.anio_seleccionado).toEqual({
      id_anio: 101,
      nombre_anio: 'Año Escolar 2027',
    });
    expect(prisma.seccionAnio.findMany.mock.calls[0][0].where.id_anio).toBe(
      101,
    );
  });

  test('rechaza un nivel ajeno a SeccionAnio activa', async () => {
    const { service } = setup();
    await expect(
      service.create(
        { ...createDto, audiencia: { tipo: 'niveles', ids: [999] } },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('rechaza una sección existente en catálogo pero ausente de SeccionAnio del año', async () => {
    const { service } = setup();
    await expect(
      service.create(
        { ...createDto, audiencia: { tipo: 'secciones', ids: [999] } },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('persiste nivel y sección deducida de la estructura activa', async () => {
    const { prisma, service } = setup();
    await service.create(
      { ...createDto, audiencia: { tipo: 'secciones', ids: [30] } },
      7,
    );
    expect(
      prisma.circular.create.mock.calls[0][0].data.destinatarios.create,
    ).toEqual([{ id_nivel: 20, id_seccion: 30 }]);
    expect(prisma.circular.create.mock.calls[0][0].data.id_anio).toBe(100);
    expect(prisma.seccionAnio.findMany.mock.calls[0][0].where.id_anio).toBe(
      100,
    );
  });

  test('rechaza id_anio que no pertenece al tenant y colegio autorizados', async () => {
    const { service } = setup();
    await expect(
      service.create({ ...createDto, id_anio: 999 }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('rechaza un año cerrado para una publicación nueva', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findMany.mockResolvedValue([
      {
        id_anio: 100,
        nombre_anio: 'Año Escolar 2025',
        estado: 'Cerrado',
        fecha_inicio: new Date('2025-03-01T00:00:00.000Z'),
      },
    ]);
    await expect(service.create(createDto, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  test('GET directo no revela un comunicado de otro colegio', async () => {
    const { prisma, service } = setup();
    prisma.circular.findUnique.mockResolvedValue(
      circularFixture({
        id_colegio: 99,
        colegio: { id_colegio: 99, id_tenant: 1, nombre: 'Colegio Dos' },
      }),
    );
    await expect(service.findOne(7, 50)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('notifica con tenant, colegio, referencia y URL canónica', async () => {
    const { notifications, service } = setup();
    await service.create(createDto, 7);
    expect(
      notifications.notificarApoderadosDeAudienciaComunicado,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id_tenant: 1,
        id_colegio: 10,
        id_anio: 100,
        referencia_tipo: 'circular',
        referencia_id: 50,
        url: '/dashboard/comunicados?id_circular=50',
        deduplicar_existentes: true,
      }),
    );
  });

  test('asocia un adjunto válido con nombre y ruta de almacenamiento seguros', async () => {
    const { prisma, service, storage } = setup();
    storage.saveFile.mockResolvedValue({
      filename: 'comunicado-50-seguro.pdf',
      url: '/uploads/comunicados-1-10/comunicado-50-seguro.pdf',
    });
    const file = {
      originalname: '../autorizacion.pdf',
      mimetype: 'application/pdf',
      size: 128,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    await service.addAttachments(7, 50, [file]);

    expect(storage.saveFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        folder: 'comunicados-1-10',
        prefix: 'comunicado',
        entityId: 50,
      }),
    );
    expect(prisma.adjunto.createMany).toHaveBeenCalledWith({
      data: [
        {
          id_circular: 50,
          nombre_archivo: 'autorizacion.pdf',
          url: '/uploads/comunicados-1-10/comunicado-50-seguro.pdf',
        },
      ],
    });
  });

  test('rechaza un adjunto cuya extensión no coincide con el MIME', async () => {
    const { prisma, service, storage } = setup();
    const file = {
      originalname: 'contenido.exe',
      mimetype: 'application/pdf',
      size: 128,
      buffer: Buffer.from('contenido'),
    } as Express.Multer.File;

    await expect(service.addAttachments(7, 50, [file])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.saveFile).not.toHaveBeenCalled();
    expect(prisma.adjunto.createMany).not.toHaveBeenCalled();
  });
});
