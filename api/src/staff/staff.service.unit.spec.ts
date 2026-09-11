import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StaffListDto, StaffScopeDto, StaffWriteDto } from './staff.dto';
import { StaffService } from './staff.service';

describe('StaffService routine and sensitive operations', () => {
  const hasStaffMembershipFilter = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(hasStaffMembershipFilter);
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return (
      record.es_miembro_staff === true ||
      Object.values(record).some(hasStaffMembershipFilter)
    );
  };

  it('accepts a routine Staff payload without free-text motive', async () => {
    const dto = plainToInstance(StaffWriteDto, {
      id_colegio: 10,
      cargo: 'Secretaría',
      area: 'Administración',
      permite_citas: false,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects ERP access without a motive before writing any entity', async () => {
    const transactionDb = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({
          estado: true,
          rol: { nombre_rol: 'Admin' },
          tenants: [{ id_tenant: 1 }],
          colegios: [
            {
              id_colegio: 10,
              rol_colegio: 'Admin',
              estado: 'Activo',
            },
          ],
        }),
      },
    };
    const prisma = {
      $transaction: (
        callback: (db: typeof transactionDb) => Promise<unknown>,
      ) => callback(transactionDb),
    } as unknown as PrismaService;
    const service = new StaffService(prisma);

    await expect(
      service.save(
        1,
        { tenant_id: 1, scope: 'all' },
        {
          id_colegio: 10,
          cargo: 'Secretaría',
          area: 'Administración',
          permite_citas: false,
          acceso: {
            username: 'staff.sensible',
            rol: 'Secretaria',
            password: 'Password-segura-2026',
          },
        },
      ),
    ).rejects.toThrow(
      'Explica el motivo para dar acceso al ERP o asignar el rol seleccionado.',
    );
  });

  it('only discloses a technical Tutor Persona inside its authorized context', async () => {
    const actor = {
      estado: true,
      rol: { nombre_rol: 'Admin' },
      tenants: [{ id_tenant: 1 }],
      colegios: [
        {
          id_colegio: 10,
          rol_colegio: 'Admin',
          estado: 'Activo',
        },
      ],
    };
    const technicalPersona = {
      id_persona: 20,
      dni: '12345678',
      nombres: 'Docente',
      apellido_paterno: 'Tutor',
      apellido_materno: 'Prueba',
      fecha_nacimiento: new Date('1980-01-01'),
      direccion: null,
      departamento: null,
      provincia: null,
      distrito: null,
      telefono: null,
      correo: null,
      staff: [
        {
          id_staff: 30,
          id_tenant: 2,
          id_colegio: 20,
          es_miembro_staff: false,
          seccion: null,
        },
      ],
      usuarios: [],
      docentes: [],
      estudiantes: [],
      apoderados: [],
    };
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(actor) },
      persona: { findUnique: jest.fn().mockResolvedValue(technicalPersona) },
    } as unknown as PrismaService;
    const service = new StaffService(prisma);
    const scope = Object.assign(new StaffScopeDto(), {
      tenant_id: 1,
      scope: 'all' as const,
    });

    await expect(
      service.lookup(1, scope, technicalPersona.dni),
    ).rejects.toThrow(
      'Solicita la vinculación a un administrador de su institución.',
    );

    technicalPersona.staff[0].id_tenant = 1;
    technicalPersona.staff[0].id_colegio = 10;
    await expect(
      service.lookup(1, scope, technicalPersona.dni),
    ).resolves.toMatchObject({
      id_persona: technicalPersona.id_persona,
      dni: technicalPersona.dni,
    });
  });

  it('applies es_miembro_staff=true to both list and detail queries', async () => {
    const actor = {
      estado: true,
      rol: { nombre_rol: 'Admin' },
      tenants: [{ id_tenant: 1 }],
      colegios: [
        {
          id_colegio: 10,
          rol_colegio: 'Admin',
          estado: 'Activo',
        },
      ],
    };
    const staffRecord = {
      id_staff: 30,
      id_persona: 20,
      id_tenant: 1,
      id_colegio: 10,
      cargo: 'Secretaría',
      area: 'Administración',
      permite_citas: true,
      es_miembro_staff: true,
      persona: {},
      colegio: { id_colegio: 10, nombre: 'Colegio prueba' },
      seccion: null,
    };
    let listWhere: unknown;
    let countWhere: unknown;
    let detailWhere: unknown;
    const findMany = jest.fn((input: { where: unknown }) => {
      listWhere = input.where;
      return Promise.resolve([]);
    });
    const count = jest.fn((input: { where: unknown }) => {
      countWhere = input.where;
      return Promise.resolve(0);
    });
    const findFirst = jest.fn((input: { where: unknown }) => {
      detailWhere = input.where;
      return Promise.resolve(staffRecord);
    });
    const prisma = {
      usuario: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(actor)
          .mockResolvedValueOnce(actor),
        findMany: jest.fn().mockResolvedValue([]),
      },
      staff: { findMany, count, findFirst },
    } as unknown as PrismaService;
    const service = new StaffService(prisma);
    const listScope = Object.assign(new StaffListDto(), {
      tenant_id: 1,
      scope: 'all' as const,
      page: 1,
      limit: 20,
    });
    const detailScope = Object.assign(new StaffScopeDto(), {
      tenant_id: 1,
      scope: 'all' as const,
    });

    await service.list(1, listScope);
    await service.detail(1, detailScope, staffRecord.id_staff);

    expect(hasStaffMembershipFilter(listWhere)).toBe(true);
    expect(hasStaffMembershipFilter(countWhere)).toBe(true);
    expect(hasStaffMembershipFilter(detailWhere)).toBe(true);
  });
});
