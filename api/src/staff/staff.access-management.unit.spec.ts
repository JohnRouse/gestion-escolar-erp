import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffAccessManageDto } from './staff.dto';
import { StaffService } from './staff.service';

type Account = {
  id_usuario: number;
  id_persona: number;
  username: string;
  estado: boolean;
  rol: { nombre_rol: string };
  tenants: { id_tenant: number; estado: string }[];
  colegios: {
    id_colegio: number;
    rol_colegio: string;
    estado: string;
    colegio: { id_tenant: number };
  }[];
};

const staff = {
  id_staff: 30,
  id_persona: 20,
  id_tenant: 1,
  id_colegio: 10,
  cargo: 'Coordinación',
  area: 'Administración',
  permite_citas: true,
  es_miembro_staff: true,
  persona: {
    id_persona: 20,
    dni: '12345678',
    nombres: 'Persona',
    apellido_paterno: 'Cuenta',
    apellido_materno: 'Prueba',
    fecha_nacimiento: new Date('1980-01-01'),
  },
  colegio: { id_colegio: 10, nombre: 'Colegio autorizado' },
  seccion: null,
};

function setup(
  actorRole: 'Admin' | 'Director' = 'Admin',
  targetRole = 'Secretaria',
  options: {
    duplicateUser?: { id_usuario: number } | null;
    userState?: boolean;
    tenantState?: string;
    schoolState?: string;
    actorSchoolRole?: 'Admin' | 'Director';
  } = {},
) {
  const account: Account = {
    id_usuario: 50,
    id_persona: 20,
    username: 'staff.account',
    estado: options.userState ?? true,
    rol: { nombre_rol: targetRole },
    tenants: [{ id_tenant: 1, estado: options.tenantState ?? 'Activo' }],
    colegios: [
      {
        id_colegio: 10,
        rol_colegio: targetRole,
        estado: options.schoolState ?? 'Activo',
        colegio: { id_tenant: 1 },
      },
    ],
  };
  const actor = {
    estado: true,
    rol: { nombre_rol: actorRole },
    tenants: [{ id_tenant: 1 }],
    colegios: [
      {
        id_colegio: 10,
        rol_colegio: options.actorSchoolRole ?? actorRole,
        estado: 'Activo',
      },
    ],
  };
  const passwordUpdates: string[] = [];
  const usuarioUpdate = jest.fn(
    ({
      data,
    }: {
      data: {
        username?: string;
        estado?: boolean;
        id_rol?: number;
        password_hash?: string;
      };
    }) => {
      if (data.username) account.username = data.username;
      if (data.estado !== undefined) account.estado = data.estado;
      if (data.id_rol === 2) account.rol.nombre_rol = 'Director';
      if (data.id_rol === 1) account.rol.nombre_rol = 'Admin';
      if (data.password_hash) passwordUpdates.push(data.password_hash);
      return Promise.resolve({});
    },
  );
  const colegioUpdate = jest.fn(({ data }: { data: { estado: string } }) => {
    account.colegios[0].estado = data.estado;
    return Promise.resolve({});
  });
  const colegioUpdateMany = jest.fn(
    ({ data }: { data: { rol_colegio: string } }) => {
      account.colegios[0].rol_colegio = data.rol_colegio;
      return Promise.resolve({ count: 1 });
    },
  );
  const colegioUpsert = jest.fn(
    ({ update }: { update: { estado: string } }) => {
      account.colegios[0].estado = update.estado;
      return Promise.resolve({});
    },
  );
  const tenantUpsert = jest.fn(({ update }: { update: { estado: string } }) => {
    account.tenants[0].estado = update.estado;
    return Promise.resolve({});
  });
  const usuarioFindUnique = jest.fn(
    ({ where }: { where: { id_usuario?: number; username?: string } }) => {
      if (where.id_usuario === 1) return Promise.resolve(actor);
      if (where.username) return Promise.resolve(options.duplicateUser ?? null);
      return Promise.resolve(null);
    },
  );
  const db = {
    usuario: {
      findUnique: usuarioFindUnique,
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(account)),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([account])),
      update: usuarioUpdate,
    },
    staff: { findFirst: jest.fn().mockResolvedValue(staff) },
    persona: {
      findUnique: jest.fn().mockResolvedValue({
        staff: [
          {
            id_tenant: 1,
            id_colegio: 10,
            colegio: { id_tenant: 1 },
            seccion: null,
          },
        ],
        usuarios: [
          {
            tenants: [{ id_tenant: 1 }],
            colegios: [{ id_colegio: 10, colegio: { id_tenant: 1 } }],
          },
        ],
        docentes: [],
        estudiantes: [],
        apoderados: [],
      }),
    },
    rol: {
      findUnique: jest.fn(({ where }: { where: { nombre_rol: string } }) =>
        Promise.resolve(
          where.nombre_rol === 'Admin'
            ? { id_rol: 1 }
            : where.nombre_rol === 'Director'
              ? { id_rol: 2 }
              : { id_rol: 3 },
        ),
      ),
    },
    usuarioColegio: {
      update: colegioUpdate,
      updateMany: colegioUpdateMany,
      upsert: colegioUpsert,
      count: jest.fn().mockResolvedValue(1),
    },
    usuarioTenant: { upsert: tenantUpsert },
  };
  const prisma = {
    ...db,
    $transaction: (callback: (tx: typeof db) => Promise<unknown>) =>
      callback(db),
  } as unknown as PrismaService;
  return {
    service: new StaffService(prisma),
    account,
    passwordUpdates,
    usuarioUpdate,
    colegioUpdate,
    colegioUpdateMany,
    colegioUpsert,
    tenantUpsert,
  };
}

const query = { tenant_id: 1, colegio_id: 10 };
const action = (value: Partial<StaffAccessManageDto>): StaffAccessManageDto =>
  ({
    motivo: 'Corrección autorizada de acceso',
    ...value,
  }) as StaffAccessManageDto;

describe('Staff existing ERP access management', () => {
  const audit = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);

  afterAll(() => audit.mockRestore());

  it('rejects a duplicate username with conflict', async () => {
    const { service, usuarioUpdate } = setup('Admin', 'Secretaria', {
      duplicateUser: { id_usuario: 999 },
    });

    await expect(
      service.manageAccess(
        1,
        query,
        staff.id_staff,
        50,
        action({ accion: 'editar_usuario', username: 'staff.admin' }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it('resets the password with a new bcrypt hash and never audits the secret', async () => {
    audit.mockClear();
    const plainPassword = 'Nueva-clave-segura-2026!';
    const { service, passwordUpdates } = setup();

    await service.manageAccess(
      1,
      query,
      staff.id_staff,
      50,
      action({ accion: 'restablecer_password', password: plainPassword }),
    );

    expect(passwordUpdates).toHaveLength(1);
    await expect(
      bcrypt.compare(plainPassword, passwordUpdates[0]),
    ).resolves.toBe(true);
    const entries = audit.mock.calls.map((call) => String(call[0])).join();
    expect(entries).toContain('staff.acceso.restablecer_password');
    expect(entries).not.toContain(plainPassword);
    expect(entries).not.toMatch(/password_hash/);
  });

  it('prevents Director from elevating an account to Admin', async () => {
    const { service, usuarioUpdate } = setup('Director');

    await expect(
      service.manageAccess(
        1,
        query,
        staff.id_staff,
        50,
        action({ accion: 'cambiar_rol', rol: 'Admin' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it('uses the institutional Director role even if the actor global role is Admin', async () => {
    const { service, usuarioUpdate } = setup('Admin', 'Secretaria', {
      actorSchoolRole: 'Director',
    });

    await expect(
      service.manageAccess(
        1,
        query,
        staff.id_staff,
        50,
        action({ accion: 'cambiar_rol', rol: 'Admin' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it('prevents Director from modifying an existing Admin account', async () => {
    const { service, usuarioUpdate } = setup('Director', 'Admin');

    await expect(
      service.manageAccess(
        1,
        query,
        staff.id_staff,
        50,
        action({ accion: 'editar_usuario', username: 'admin.corregido' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it('rejects account management when the account belongs to another tenant', async () => {
    const { service, account, usuarioUpdate } = setup();
    account.tenants.push({ id_tenant: 2, estado: 'Activo' });

    await expect(
      service.manageAccess(
        1,
        query,
        staff.id_staff,
        50,
        action({ accion: 'editar_usuario', username: 'staff.corregido' }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(usuarioUpdate).not.toHaveBeenCalled();
  });

  it('allows Admin to change the global and institutional role together', async () => {
    const { service, account, colegioUpdateMany } = setup();

    await service.manageAccess(
      1,
      query,
      staff.id_staff,
      50,
      action({ accion: 'cambiar_rol', rol: 'Director' }),
    );

    expect(account.rol.nombre_rol).toBe('Director');
    expect(colegioUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { rol_colegio: 'Director' } }),
    );
  });

  it('deactivates only the membership of the Staff school', async () => {
    const { service, account, colegioUpdate, usuarioUpdate } = setup();

    await service.manageAccess(
      1,
      query,
      staff.id_staff,
      50,
      action({ accion: 'cambiar_estado', estado: false }),
    );

    expect(account.colegios[0].estado).toBe('Inactivo');
    expect(colegioUpdate).toHaveBeenCalledTimes(1);
    expect(usuarioUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: false } }),
    );
  });

  it('activates only the authorized account and memberships', async () => {
    const { service, account, colegioUpsert, tenantUpsert, usuarioUpdate } =
      setup('Admin', 'Secretaria', {
        userState: false,
        tenantState: 'Inactivo',
        schoolState: 'Inactivo',
      });

    await service.manageAccess(
      1,
      query,
      staff.id_staff,
      50,
      action({ accion: 'cambiar_estado', estado: true }),
    );

    expect(account.estado).toBe(true);
    expect(account.tenants[0].estado).toBe('Activo');
    expect(account.colegios[0].estado).toBe('Activo');
    expect(usuarioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: true } }),
    );
    expect(tenantUpsert).toHaveBeenCalledTimes(1);
    expect(colegioUpsert).toHaveBeenCalledTimes(1);
  });
});
