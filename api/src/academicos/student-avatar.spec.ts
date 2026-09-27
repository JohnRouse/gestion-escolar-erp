/* eslint-disable */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicosService } from './academicos.service';
import { AcademicosPadresController } from './academicos-padres.controller';

const actor = (schoolRole = 'Admin', globalRole = 'Admin') => ({
  estado: true,
  rol: { nombre_rol: globalRole },
  tenants: [{ id_tenant: 1 }],
  colegios: [
    {
      id_colegio: 10,
      rol_colegio: schoolRole,
      es_principal: true,
      colegio: { id_tenant: 1 },
    },
  ],
});

describe('Foto sincronizada del estudiante', () => {
  test('portal autoriza al padre antes de guardar y actualiza la URL generada', async () => {
    const academicos: any = {
      autorizarAvatarHijo: jest.fn().mockResolvedValue({ id_estudiante: 40 }),
      updateAvatarHijo: jest.fn().mockResolvedValue({
        id_persona: 40,
        avatar_url: '/uploads/alumnos/foto-estudiante-item-1.jpg',
      }),
    };
    const storage: any = {
      saveImage: jest.fn().mockResolvedValue({
        url: '/uploads/alumnos/foto-estudiante-item-1.jpg',
      }),
    };
    const controller = new AcademicosPadresController(academicos, storage);
    const file = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      mimetype: 'image/jpeg',
      size: 4,
    } as Express.Multer.File;

    await expect(
      controller.updateAvatar(
        {
          user: { userId: 7, personaId: 80, canal: 'portal-padres' },
        } as any,
        '40',
        file,
      ),
    ).resolves.toMatchObject({ id_persona: 40 });

    expect(academicos.autorizarAvatarHijo).toHaveBeenCalledWith(80, 40);
    expect(storage.saveImage).toHaveBeenCalledWith(file, {
      folder: 'alumnos',
      prefix: 'foto-estudiante',
    });
    expect(academicos.updateAvatarHijo).toHaveBeenCalledWith(
      80,
      7,
      40,
      '/uploads/alumnos/foto-estudiante-item-1.jpg',
    );
    expect(
      academicos.autorizarAvatarHijo.mock.invocationCallOrder[0],
    ).toBeLessThan(storage.saveImage.mock.invocationCallOrder[0]);
  });

  test('portal no escribe archivo ni DB para un hijo ajeno', async () => {
    const academicos: any = {
      autorizarAvatarHijo: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Estudiante no disponible.')),
      updateAvatarHijo: jest.fn(),
    };
    const storage: any = { saveImage: jest.fn() };
    const controller = new AcademicosPadresController(academicos, storage);

    await expect(
      controller.updateAvatar(
        {
          user: { userId: 7, personaId: 80, canal: 'portal-padres' },
        } as any,
        '999',
        { buffer: Buffer.from('x') } as Express.Multer.File,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.saveImage).not.toHaveBeenCalled();
    expect(academicos.updateAvatarHijo).not.toHaveBeenCalled();
  });

  test('intranet actualiza la misma columna Estudiante.avatar_url', async () => {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(actor()) },
      estudiante: {
        findFirst: jest.fn().mockResolvedValue({
          id_persona: 40,
          avatar_url: null,
        }),
        update: jest.fn().mockResolvedValue({
          id_persona: 40,
          avatar_url: '/uploads/alumnos/foto-estudiante-item-2.png',
          persona: { nombres: 'Víctor' },
        }),
      },
    };
    const service = new AcademicosService(prisma);

    await service.actualizarFotoAlumno({
      idEstudiante: 40,
      avatarUrl: '/uploads/alumnos/foto-estudiante-item-2.png',
      userId: 1,
      rol: 'Admin',
      scope: 'colegio',
      colegioId: 10,
      tenantId: 1,
    });

    expect(prisma.estudiante.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_persona: 40 },
        data: {
          avatar_url: '/uploads/alumnos/foto-estudiante-item-2.png',
        },
      }),
    );
  });

  test('scope ERP no encuentra un alumno fuera del colegio autorizado', async () => {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(actor()) },
      estudiante: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.autorizarFotoAlumnoIntranet({
        idEstudiante: 999,
        userId: 1,
        rol: 'Admin',
        colegioId: 10,
        tenantId: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.estudiante.findFirst.mock.calls[0][0].where).toMatchObject({
      id_persona: 999,
      matriculas: { some: { id_colegio: { in: [10] } } },
    });
  });

  test('rol Profesor efectivo en el colegio no puede cambiar la foto', async () => {
    const prisma: any = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(actor('Profesor', 'Admin')),
      },
      estudiante: { findFirst: jest.fn() },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.autorizarFotoAlumnoIntranet({
        idEstudiante: 40,
        userId: 1,
        rol: 'Admin',
        colegioId: 10,
        tenantId: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.estudiante.findFirst).not.toHaveBeenCalled();
  });

  test('rol Tesoreria no se equipara a Secretaria para cambiar la foto', async () => {
    const prisma: any = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(actor('Tesoreria', 'Admin')),
      },
      estudiante: { findFirst: jest.fn() },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.autorizarFotoAlumnoIntranet({
        idEstudiante: 40,
        userId: 1,
        rol: 'Admin',
        colegioId: 10,
        tenantId: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.estudiante.findFirst).not.toHaveBeenCalled();
  });

  test('rol global Profesor tampoco puede gestionar la foto institucional', async () => {
    const prisma: any = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(actor('Profesor', 'Profesor')),
      },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.autorizarFotoAlumnoIntranet({
        idEstudiante: 40,
        userId: 2,
        rol: 'Profesor',
        colegioId: 10,
        tenantId: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('ERP proyecta la misma Usuario.avatar_url en el listado del apoderado', async () => {
    const prisma: any = {
      apoderado: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id_persona: 80,
            persona: {
              nombres: 'Carlos',
              apellido_paterno: 'Díaz',
              usuarios: [
                {
                  estado: true,
                  avatar_url: '/uploads/usuarios/avatar-portal-item.webp',
                  rol: { nombre_rol: 'Padre' },
                },
              ],
            },
            estudiantes: [],
          },
        ]),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    const service = new AcademicosService(prisma);
    jest.spyOn(service as any, 'resolveScope').mockResolvedValue({
      colegioIds: [10],
    });

    const result = await service.listarApoderados({
      userId: 1,
      rol: 'Admin',
      colegioId: 10,
    });

    expect(result.data[0]).toMatchObject({
      avatar_url: '/uploads/usuarios/avatar-portal-item.webp',
      credencial: { existe: true, estado: true },
    });
    expect(result.data[0].persona).not.toHaveProperty('usuarios');
  });
});
