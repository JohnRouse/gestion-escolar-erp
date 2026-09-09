import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export function requireStaffTestDatabase() {
  const url = new URL(process.env.DATABASE_URL || 'http://invalid');
  if (
    url.protocol !== 'mysql:' ||
    url.hostname !== '127.0.0.1' ||
    url.port !== '33316' ||
    url.pathname !== '/staff_v1_test'
  ) {
    throw new Error(
      'Staff tests require the isolated MySQL instance at 127.0.0.1:33316/staff_v1_test.',
    );
  }
}
export const staffTestPassword = 'Staff-fixture-2026!';
export async function staffFixture(db: PrismaService) {
  requireStaffTestDatabase();
  // Destructive reset is permitted only on the dedicated temporary instance above.
  await db.$transaction(
    async (tx) => {
      await tx.staff.deleteMany();
      await tx.usuarioColegio.deleteMany();
      await tx.usuarioTenant.deleteMany();
      await tx.usuario.deleteMany();
      await tx.persona.deleteMany();
      await tx.rol.deleteMany();
      await tx.colegio.deleteMany();
      await tx.tenant.deleteMany();
    },
    { timeout: 30000 },
  );
  const tenant = await db.tenant.create({
    data: { nombre: 'Organización de prueba Staff', slug: 'staff-test' },
  });
  const otherTenant = await db.tenant.create({
    data: { nombre: 'Otra organización de prueba', slug: 'staff-other' },
  });
  const school = await db.colegio.create({
    data: { nombre: 'Colegio de prueba A', id_tenant: tenant.id_tenant },
  });
  const second = await db.colegio.create({
    data: { nombre: 'Colegio de prueba B', id_tenant: tenant.id_tenant },
  });
  const denied = await db.colegio.create({
    data: { nombre: 'Colegio restringido', id_tenant: tenant.id_tenant },
  });
  const foreign = await db.colegio.create({
    data: {
      nombre: 'Colegio de otro tenant',
      id_tenant: otherTenant.id_tenant,
    },
  });
  const password_hash = await bcrypt.hash(staffTestPassword, 10);
  const actors: Record<string, number> = {};
  let counter = 0;
  for (const name of ['Admin', 'Director', 'Profesor', 'Secretaria']) {
    const rol = await db.rol.create({ data: { nombre_rol: name } });
    const persona = await db.persona.create({
      data: {
        dni: `9100000${++counter}`,
        nombres: name,
        apellido_paterno: 'Prueba',
        apellido_materno: 'Staff',
        fecha_nacimiento: new Date('1985-01-01'),
      },
    });
    const user = await db.usuario.create({
      data: {
        username: `staff.${name.toLowerCase()}`,
        password_hash,
        id_persona: persona.id_persona,
        id_rol: rol.id_rol,
      },
    });
    actors[name] = user.id_usuario;
    await db.usuarioTenant.create({
      data: {
        id_usuario: user.id_usuario,
        id_tenant: tenant.id_tenant,
        rol_tenant: 'Miembro',
      },
    });
    for (const c of [school, second])
      await db.usuarioColegio.create({
        data: {
          id_usuario: user.id_usuario,
          id_colegio: c.id_colegio,
          rol_colegio: name,
          es_principal: c.id_colegio === school.id_colegio,
        },
      });
  }
  const makeStaff = async (
    dni: string,
    colegio: typeof school,
    idTenant: number | null,
  ) => {
    const persona = await db.persona.create({
      data: {
        dni,
        nombres: 'Colaborador',
        apellido_paterno: dni,
        apellido_materno: 'Prueba',
        fecha_nacimiento: new Date('1980-01-01'),
      },
    });
    return db.staff.create({
      data: {
        id_persona: persona.id_persona,
        id_tenant: idTenant,
        id_colegio: colegio.id_colegio,
        cargo: 'Coordinador',
        area: 'Administración',
      },
    });
  };
  const legacy = await makeStaff('92000001', school, null);
  const forbidden = await makeStaff('92000002', denied, tenant.id_tenant);
  const foreignStaff = await makeStaff(
    '92000003',
    foreign,
    otherTenant.id_tenant,
  );
  return {
    tenant,
    otherTenant,
    school,
    second,
    denied,
    foreign,
    actors,
    legacy,
    forbidden,
    foreignStaff,
  };
}
