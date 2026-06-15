import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const money = (value: number) => Number(value.toFixed(2));

async function upsertById<T extends { [key: string]: any }>(
  model: any,
  idField: string,
  idValue: number,
  data: T,
) {
  return model.upsert({
    where: { [idField]: idValue },
    update: data,
    create: { [idField]: idValue, ...data },
  });
}

async function upsertPersona(data: {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: Date;
  genero?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}) {
  return prisma.persona.upsert({
    where: { dni: data.dni },
    update: {
      nombres: data.nombres,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno,
      fecha_nacimiento: data.fecha_nacimiento,
      genero: data.genero,
      correo: data.correo,
      telefono: data.telefono,
      direccion: data.direccion,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
    },
    create: data,
  });
}

async function upsertUsuario(params: {
  username: string;
  password: string;
  id_persona: number;
  id_rol: number;
  avatar_url?: string | null;
}) {
  const password_hash = await bcrypt.hash(params.password, 10);

  return prisma.usuario.upsert({
    where: { username: params.username },
    update: {
      password_hash,
      id_persona: params.id_persona,
      id_rol: params.id_rol,
      estado: true,
      avatar_url: params.avatar_url || null,
    },
    create: {
      username: params.username,
      password_hash,
      id_persona: params.id_persona,
      id_rol: params.id_rol,
      estado: true,
      avatar_url: params.avatar_url || null,
    },
  });
}

async function upsertColegio(data: {
  id_tenant: number;
  nombre: string;
  nombre_corto: string;
  codigo: string;
  direccion: string;
  telefono: string;
  logo_url?: string | null;
  color_principal: string;
}) {
  const existing = await prisma.colegio.findFirst({
    where: { id_tenant: data.id_tenant, codigo: data.codigo },
  });

  if (existing) {
    return prisma.colegio.update({
      where: { id_colegio: existing.id_colegio },
      data: { ...data, estado: 'Activo' },
    });
  }

  return prisma.colegio.create({
    data: { ...data, estado: 'Activo' },
  });
}

async function ensureUsuarioTenant(id_usuario: number, id_tenant: number, rol_tenant: string) {
  return prisma.usuarioTenant.upsert({
    where: { id_usuario_id_tenant: { id_usuario, id_tenant } },
    update: { rol_tenant, estado: 'Activo' },
    create: { id_usuario, id_tenant, rol_tenant, estado: 'Activo' },
  });
}

async function ensureUsuarioColegio(
  id_usuario: number,
  id_colegio: number,
  rol_colegio: string,
  es_principal = false,
) {
  return prisma.usuarioColegio.upsert({
    where: { id_usuario_id_colegio: { id_usuario, id_colegio } },
    update: { rol_colegio, es_principal, estado: 'Activo' },
    create: { id_usuario, id_colegio, rol_colegio, es_principal, estado: 'Activo' },
  });
}

async function ensureColegioNivel(id_colegio: number, id_nivel: number) {
  return prisma.colegioNivel.upsert({
    where: { id_colegio_id_nivel: { id_colegio, id_nivel } },
    update: {},
    create: { id_colegio, id_nivel },
  });
}

async function ensureApoderadoEstudiante(
  id_apoderado: number,
  id_estudiante: number,
  parentesco: string,
) {
  return prisma.apoderadoEstudiante.upsert({
    where: { id_apoderado_id_estudiante: { id_apoderado, id_estudiante } },
    update: { parentesco },
    create: { id_apoderado, id_estudiante, parentesco },
  });
}

async function ensureCodigoColegio(
  id_estudiante: number,
  id_colegio: number,
  codigo: string,
) {
  return prisma.estudianteCodigoColegio.upsert({
    where: { id_estudiante_id_colegio: { id_estudiante, id_colegio } },
    update: { codigo },
    create: { id_estudiante, id_colegio, codigo },
  });
}

async function ensureAsignacion(data: {
  id_tenant: number;
  id_colegio: number;
  id_docente: number;
  id_curso: number;
  id_seccion: number;
  id_anio: number;
}) {
  const existing = await prisma.asignacionDocente.findFirst({ where: data });
  if (existing) return existing;
  return prisma.asignacionDocente.create({ data });
}

async function ensureEvaluacion(data: {
  id_asignacion: number;
  id_unidad: number;
  id_tipo_eval: number;
  descripcion_actividad: string;
  fecha_evaluacion: Date;
}) {
  const existing = await prisma.evaluacionDetalle.findFirst({
    where: {
      id_asignacion: data.id_asignacion,
      id_unidad: data.id_unidad,
      id_tipo_eval: data.id_tipo_eval,
      descripcion_actividad: data.descripcion_actividad,
    },
  });

  if (existing) {
    return prisma.evaluacionDetalle.update({
      where: { id_evaluacion_det: existing.id_evaluacion_det },
      data,
    });
  }

  return prisma.evaluacionDetalle.create({ data });
}

async function ensureNota(
  id_matricula: number,
  id_evaluacion_det: number,
  valor_nota: number,
  comentario?: string,
) {
  const existing = await prisma.notaAlumno.findFirst({
    where: { id_matricula, id_evaluacion_det },
  });

  if (existing) {
    return prisma.notaAlumno.update({
      where: { id_nota: existing.id_nota },
      data: { valor_nota, comentario },
    });
  }

  return prisma.notaAlumno.create({
    data: { id_matricula, id_evaluacion_det, valor_nota, comentario },
  });
}

async function ensureCronograma(data: {
  id_matricula: number;
  id_concepto: number;
  fecha_vencimiento: Date;
  estado_pago?: string;
  monto_base_original?: number;
  monto_programado?: number;
  descuento_aplicado?: number;
  id_plan_pension_detalle?: number | null;
  estado_publicacion?: string;
  visible_apoderado?: boolean;
  referencia_pago: string;
}) {
  const existing = await prisma.cronogramaPagos.findFirst({
    where: {
      id_matricula: data.id_matricula,
      id_concepto: data.id_concepto,
    },
  });

  const payload = {
    fecha_vencimiento: data.fecha_vencimiento,
    estado_pago: data.estado_pago || 'Pendiente',
    monto_base_original: data.monto_base_original ?? data.monto_programado ?? 0,
    monto_programado: data.monto_programado ?? data.monto_base_original ?? 0,
    descuento_aplicado: data.descuento_aplicado ?? 0,
    id_plan_pension_detalle: data.id_plan_pension_detalle || null,
    estado_publicacion: data.estado_publicacion || 'Publicado',
    visible_apoderado: data.visible_apoderado ?? true,
    fecha_publicacion: date('2026-01-15'),
    fecha_publicado: new Date('2026-01-15T08:00:00.000Z'),
    referencia_pago: data.referencia_pago,
  };

  if (existing) {
    return prisma.cronogramaPagos.update({
      where: { id_cronograma: existing.id_cronograma },
      data: payload,
    });
  }

  return prisma.cronogramaPagos.create({
    data: {
      id_matricula: data.id_matricula,
      id_concepto: data.id_concepto,
      ...payload,
    },
  });
}

async function ensurePagoTransaccion(data: {
  id_cronograma: number;
  id_apoderado: number;
  id_usuario_cajero: number;
  monto_pagado: number;
  fecha_pago: Date;
  metodo_pago: string;
  nro_operacion: string;
}) {
  const existing = await prisma.pagoTransaccion.findFirst({
    where: {
      id_cronograma: data.id_cronograma,
      nro_operacion: data.nro_operacion,
    },
  });

  if (existing) {
    return prisma.pagoTransaccion.update({
      where: { id_transaccion: existing.id_transaccion },
      data,
    });
  }

  return prisma.pagoTransaccion.create({ data });
}

async function main() {
  console.log('🌱 Seed ERP escolar iniciado...');

  // ─────────────────────────────────────────────
  // ROLES
  // ─────────────────────────────────────────────
  const roles = await Promise.all(
    ['Admin', 'Director', 'Secretaria', 'Profesor', 'Apoderado', 'Alumno'].map((nombre_rol) =>
      prisma.rol.upsert({
        where: { nombre_rol },
        update: {},
        create: { nombre_rol },
      }),
    ),
  );

  const rol = Object.fromEntries(roles.map((r) => [r.nombre_rol, r]));

  // ─────────────────────────────────────────────
  // TENANT Y COLEGIOS
  // ─────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'grupo-victoria' },
    update: {
      nombre: 'Grupo Educativo Victoria',
      ruc: '20600000001',
      estado: 'Activo',
      plan: 'premium',
    },
    create: {
      nombre: 'Grupo Educativo Victoria',
      slug: 'grupo-victoria',
      ruc: '20600000001',
      estado: 'Activo',
      plan: 'premium',
    },
  });

  const colegioSMV = await upsertColegio({
    id_tenant: tenant.id_tenant,
    nombre: 'I.E.P. Santa María Victoria',
    nombre_corto: 'SMV',
    codigo: 'SMV',
    direccion: 'Av. Principal 123, Villa María del Triunfo',
    telefono: '987654321',
    color_principal: '#CCF32F',
    logo_url: null,
  });

  const colegioDemo = await upsertColegio({
    id_tenant: tenant.id_tenant,
    nombre: 'I.E.P. San Gabriel Demo',
    nombre_corto: 'SGD',
    codigo: 'SGD',
    direccion: 'Jr. Los Álamos 456, San Juan de Miraflores',
    telefono: '987000111',
    color_principal: '#2563EB',
    logo_url: null,
  });

  await prisma.datosCobroColegio.upsert({
    where: { id_colegio: colegioSMV.id_colegio },
    update: {
      nombre_destinatario: 'I.E.P. Santa María Victoria',
      numero_yape: '987654321',
      numero_plin: '987654321',
      banco_1: 'BCP',
      cuenta_1: '191-00000000-0-00',
      cci_1: '00219100000000000000',
      banco_2: 'Interbank',
      cuenta_2: '200-300400500',
      cci_2: '00320030040050000000',
      instrucciones:
        'Realiza el pago por Yape, Plin o transferencia y coloca el código de pago como descripción.',
      activo: true,
    },
    create: {
      id_colegio: colegioSMV.id_colegio,
      nombre_destinatario: 'I.E.P. Santa María Victoria',
      numero_yape: '987654321',
      numero_plin: '987654321',
      banco_1: 'BCP',
      cuenta_1: '191-00000000-0-00',
      cci_1: '00219100000000000000',
      banco_2: 'Interbank',
      cuenta_2: '200-300400500',
      cci_2: '00320030040050000000',
      instrucciones:
        'Realiza el pago por Yape, Plin o transferencia y coloca el código de pago como descripción.',
      activo: true,
    },
  });

  // ─────────────────────────────────────────────
  // PERSONAS Y USUARIOS PRINCIPALES
  // ─────────────────────────────────────────────
  const personaAdmin = await upsertPersona({
    dni: '00000000',
    nombres: 'Admin',
    apellido_paterno: 'Sistema',
    apellido_materno: 'Principal',
    fecha_nacimiento: date('1990-01-01'),
    genero: 'M',
    correo: 'admin@smv.edu.pe',
    telefono: '900000000',
    direccion: 'Oficina central',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Villa María del Triunfo',
  });
  const usuarioAdmin = await upsertUsuario({
    username: 'admin',
    password: 'admin123',
    id_persona: personaAdmin.id_persona,
    id_rol: rol.Admin.id_rol,
  });

  const personaDirectora = await upsertPersona({
    dni: '10101010',
    nombres: 'María Elena',
    apellido_paterno: 'Victoria',
    apellido_materno: 'Salas',
    fecha_nacimiento: date('1978-08-15'),
    genero: 'F',
    correo: 'directora@smv.edu.pe',
    telefono: '910101010',
  });
  const usuarioDirectora = await upsertUsuario({
    username: 'directora',
    password: 'directora123',
    id_persona: personaDirectora.id_persona,
    id_rol: rol.Director.id_rol,
  });

  const personaSecretaria = await upsertPersona({
    dni: '20202020',
    nombres: 'Rosa',
    apellido_paterno: 'Campos',
    apellido_materno: 'Luna',
    fecha_nacimiento: date('1988-04-12'),
    genero: 'F',
    correo: 'secretaria@smv.edu.pe',
    telefono: '920202020',
  });
  const usuarioSecretaria = await upsertUsuario({
    username: 'secretaria',
    password: 'secretaria123',
    id_persona: personaSecretaria.id_persona,
    id_rol: rol.Secretaria.id_rol,
  });

  const personaDocente1 = await upsertPersona({
    dni: '11111111',
    nombres: 'Juan Carlos',
    apellido_paterno: 'Ríos',
    apellido_materno: 'Mendoza',
    fecha_nacimiento: date('1985-05-10'),
    genero: 'M',
    correo: 'juan.rios@smv.edu.pe',
    telefono: '911111111',
  });
  const docente1 = await prisma.docente.upsert({
    where: { id_persona: personaDocente1.id_persona },
    update: { fecha_ingreso: date('2020-03-01') },
    create: { id_persona: personaDocente1.id_persona, fecha_ingreso: date('2020-03-01') },
  });
  const usuarioDocente1 = await upsertUsuario({
    username: 'juan.rios',
    password: 'docente123',
    id_persona: personaDocente1.id_persona,
    id_rol: rol.Profesor.id_rol,
  });

  const personaDocente2 = await upsertPersona({
    dni: '22222222',
    nombres: 'Karla Patricia',
    apellido_paterno: 'Torres',
    apellido_materno: 'Arias',
    fecha_nacimiento: date('1991-11-02'),
    genero: 'F',
    correo: 'karla.torres@smv.edu.pe',
    telefono: '922222222',
  });
  const docente2 = await prisma.docente.upsert({
    where: { id_persona: personaDocente2.id_persona },
    update: { fecha_ingreso: date('2021-03-01') },
    create: { id_persona: personaDocente2.id_persona, fecha_ingreso: date('2021-03-01') },
  });
  const usuarioDocente2 = await upsertUsuario({
    username: 'karla.torres',
    password: 'docente123',
    id_persona: personaDocente2.id_persona,
    id_rol: rol.Profesor.id_rol,
  });

  // Accesos SaaS / Colegios
  for (const user of [
    { usuario: usuarioAdmin, rolTenant: 'Administrador', rolColegio: 'Admin', ambos: true },
    { usuario: usuarioDirectora, rolTenant: 'Dirección', rolColegio: 'Director', ambos: true },
    { usuario: usuarioSecretaria, rolTenant: 'Tesorería', rolColegio: 'Secretaria', ambos: false },
    { usuario: usuarioDocente1, rolTenant: 'Docente', rolColegio: 'Profesor', ambos: false },
    { usuario: usuarioDocente2, rolTenant: 'Docente', rolColegio: 'Profesor', ambos: false },
  ]) {
    await ensureUsuarioTenant(user.usuario.id_usuario, tenant.id_tenant, user.rolTenant);
    await ensureUsuarioColegio(user.usuario.id_usuario, colegioSMV.id_colegio, user.rolColegio, true);
    if (user.ambos) {
      await ensureUsuarioColegio(user.usuario.id_usuario, colegioDemo.id_colegio, user.rolColegio, false);
    }
  }

  await prisma.staff.upsert({
    where: { id_persona: personaAdmin.id_persona },
    update: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      cargo: 'Administrador del sistema',
      area: 'Administración',
      es_tutor: false,
      permite_citas: false,
    },
    create: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_persona: personaAdmin.id_persona,
      cargo: 'Administrador del sistema',
      area: 'Administración',
      es_tutor: false,
      permite_citas: false,
    },
  });

  await prisma.staff.upsert({
    where: { id_persona: personaDirectora.id_persona },
    update: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      cargo: 'Directora',
      area: 'Dirección',
      es_tutor: false,
      permite_citas: true,
    },
    create: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_persona: personaDirectora.id_persona,
      cargo: 'Directora',
      area: 'Dirección',
      es_tutor: false,
      permite_citas: true,
    },
  });

  await prisma.staff.upsert({
    where: { id_persona: personaSecretaria.id_persona },
    update: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      cargo: 'Secretaria / Tesorería',
      area: 'Tesorería',
      es_tutor: false,
      permite_citas: true,
    },
    create: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_persona: personaSecretaria.id_persona,
      cargo: 'Secretaria / Tesorería',
      area: 'Tesorería',
      es_tutor: false,
      permite_citas: true,
    },
  });

  // ─────────────────────────────────────────────
  // ESTRUCTURA ACADÉMICA
  // ─────────────────────────────────────────────
  const niveles = [
    { id_nivel: 1, nombre_nivel: 'Inicial' },
    { id_nivel: 2, nombre_nivel: 'Primaria' },
    { id_nivel: 3, nombre_nivel: 'Secundaria' },
  ];

  for (const nivel of niveles) {
    await upsertById(prisma.nivel, 'id_nivel', nivel.id_nivel, {
      nombre_nivel: nivel.nombre_nivel,
    });
    await ensureColegioNivel(colegioSMV.id_colegio, nivel.id_nivel);
    await ensureColegioNivel(colegioDemo.id_colegio, nivel.id_nivel);
  }

  const grados = [
    { id_grado: 1, nombre_grado: '3 años', id_nivel: 1 },
    { id_grado: 2, nombre_grado: '4 años', id_nivel: 1 },
    { id_grado: 3, nombre_grado: '5 años', id_nivel: 1 },
    { id_grado: 4, nombre_grado: '1er Grado', id_nivel: 2 },
    { id_grado: 5, nombre_grado: '2do Grado', id_nivel: 2 },
    { id_grado: 6, nombre_grado: '3er Grado', id_nivel: 2 },
    { id_grado: 7, nombre_grado: '4to Grado', id_nivel: 2 },
    { id_grado: 8, nombre_grado: '5to Grado', id_nivel: 2 },
    { id_grado: 9, nombre_grado: '6to Grado', id_nivel: 2 },
    { id_grado: 10, nombre_grado: '1er Secundaria', id_nivel: 3 },
    { id_grado: 11, nombre_grado: '2do Secundaria', id_nivel: 3 },
    { id_grado: 12, nombre_grado: '3ro Secundaria', id_nivel: 3 },
    { id_grado: 13, nombre_grado: '4to Secundaria', id_nivel: 3 },
    { id_grado: 14, nombre_grado: '5to Secundaria', id_nivel: 3 },
  ];

  for (const grado of grados) {
    await upsertById(prisma.grado, 'id_grado', grado.id_grado, {
      nombre_grado: grado.nombre_grado,
      id_nivel: grado.id_nivel,
    });
  }

  let aulaId = 1;
  let seccionId = 1;

  for (const grado of grados) {
    for (const letra of ['A', 'B']) {
      const aula = await upsertById(prisma.aula, 'id_aula', aulaId, {
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        nombre_aula: `${grado.nombre_grado} ${letra}`,
        capacidad: 30,
      });

      await upsertById(prisma.seccion, 'id_seccion', seccionId, {
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        letra,
        id_grado: grado.id_grado,
        id_aula: aula.id_aula,
      });

      aulaId++;
      seccionId++;
    }
  }

  // ─────────────────────────────────────────────
  // AÑOS, BIMESTRES Y UNIDADES
  // ─────────────────────────────────────────────
  const anios = [
    {
      id_anio: 1,
      nombre_anio: 'Año Escolar 2025',
      fecha_inicio: date('2025-03-03'),
      fecha_fin: date('2025-12-19'),
      estado: 'Cerrado',
    },
    {
      id_anio: 2,
      nombre_anio: 'Año Escolar 2026',
      fecha_inicio: date('2026-03-02'),
      fecha_fin: date('2026-12-18'),
      estado: 'Abierto',
    },
    {
      id_anio: 3,
      nombre_anio: 'Año Escolar 2027',
      fecha_inicio: date('2027-03-01'),
      fecha_fin: date('2027-12-17'),
      estado: 'Planificación',
    },
  ];

  for (const anio of anios) {
    await upsertById(prisma.anioLectivo, 'id_anio', anio.id_anio, {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre_anio: anio.nombre_anio,
      fecha_inicio: anio.fecha_inicio,
      fecha_fin: anio.fecha_fin,
      estado: anio.estado,
    });

    for (let b = 1; b <= 4; b++) {
      const idBimestre = (anio.id_anio - 1) * 4 + b;
      const inicioMes = 2 + (b - 1) * 2;
      const finMes = inicioMes + 1;

      await upsertById(prisma.bimestre, 'id_bimestre', idBimestre, {
        numero: b,
        fecha_inicio: new Date(Date.UTC(2024 + anio.id_anio, inicioMes, 1)),
        fecha_fin: new Date(Date.UTC(2024 + anio.id_anio, finMes, 28)),
        id_anio: anio.id_anio,
      });

      for (let u = 1; u <= 2; u++) {
        const idUnidad = (anio.id_anio - 1) * 8 + (b - 1) * 2 + u;
        await upsertById(prisma.unidad, 'id_unidad', idUnidad, {
          numero: u,
          fecha_inicio: new Date(Date.UTC(2024 + anio.id_anio, inicioMes + u - 1, 1)),
          fecha_fin: new Date(Date.UTC(2024 + anio.id_anio, inicioMes + u - 1, 28)),
          id_bimestre: idBimestre,
          estado_abierto: anio.id_anio >= 2,
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // ÁREAS, CURSOS, TIPOS, ESCALA
  // ─────────────────────────────────────────────
  const areasCursos = [
    'Comunicación',
    'Matemática',
    'Ciencia y Tecnología',
    'Personal Social',
    'Inglés',
    'Educación Física',
    'Arte y Cultura',
    'Religión',
  ];

  for (let i = 0; i < areasCursos.length; i++) {
    const id = i + 1;
    const area = await upsertById(prisma.areaCurricular, 'id_area', id, {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre_area: areasCursos[i],
    });

    await upsertById(prisma.curso, 'id_curso', id, {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre_curso: areasCursos[i],
      id_area: area.id_area,
    });
  }

  const tiposEval = [
    'Participación',
    'Cuaderno',
    'Práctica calificada',
    'Examen bimestral',
    'Exposición',
  ];

  for (let i = 0; i < tiposEval.length; i++) {
    await upsertById(prisma.tipoEvaluacion, 'id_tipo_eval', i + 1, {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre_tipo: tiposEval[i],
    });
  }

  await upsertById(prisma.escalaCalificacion, 'id_escala', 1, {
    id_tenant: tenant.id_tenant,
    id_colegio: colegioSMV.id_colegio,
    nombre_escala: 'Escala numérica 0-20',
    nota_minima: 0,
    nota_maxima: 20,
    nota_aprobatoria: 11,
    tipo_calificacion: 'Numérica',
  });

  // ─────────────────────────────────────────────
  // APODERADOS, ALUMNOS Y MATRÍCULAS
  // ─────────────────────────────────────────────
  const personaApoderado1 = await upsertPersona({
    dni: '12345678',
    nombres: 'Carlos Alberto',
    apellido_paterno: 'Díaz',
    apellido_materno: 'Ramos',
    fecha_nacimiento: date('1982-06-20'),
    genero: 'M',
    correo: 'carlos.diaz@gmail.com',
    telefono: '912345678',
    direccion: 'Av. Los Jardines 245',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Villa María del Triunfo',
  });
  await prisma.apoderado.upsert({
    where: { id_persona: personaApoderado1.id_persona },
    update: { ocupacion: 'Ingeniero' },
    create: { id_persona: personaApoderado1.id_persona, ocupacion: 'Ingeniero' },
  });
  const usuarioApoderado1 = await upsertUsuario({
    username: 'carlos.diaz',
    password: 'apoderado123',
    id_persona: personaApoderado1.id_persona,
    id_rol: rol.Apoderado.id_rol,
  });

  const personaApoderado2 = await upsertPersona({
    dni: '87654321',
    nombres: 'Rosa Milagros',
    apellido_paterno: 'Pardo',
    apellido_materno: 'Salazar',
    fecha_nacimiento: date('1984-09-10'),
    genero: 'F',
    correo: 'rosa.pardo@gmail.com',
    telefono: '987654321',
    direccion: 'Jr. Las Flores 140',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Villa María del Triunfo',
  });
  await prisma.apoderado.upsert({
    where: { id_persona: personaApoderado2.id_persona },
    update: { ocupacion: 'Administradora' },
    create: { id_persona: personaApoderado2.id_persona, ocupacion: 'Administradora' },
  });
  const usuarioApoderado2 = await upsertUsuario({
    username: 'rosa.pardo',
    password: 'apoderado123',
    id_persona: personaApoderado2.id_persona,
    id_rol: rol.Apoderado.id_rol,
  });

  await ensureUsuarioTenant(usuarioApoderado1.id_usuario, tenant.id_tenant, 'Apoderado');
  await ensureUsuarioColegio(usuarioApoderado1.id_usuario, colegioSMV.id_colegio, 'Apoderado', true);
  await ensureUsuarioTenant(usuarioApoderado2.id_usuario, tenant.id_tenant, 'Apoderado');
  await ensureUsuarioColegio(usuarioApoderado2.id_usuario, colegioSMV.id_colegio, 'Apoderado', true);

  const estudiantesData = [
    {
      dni: '47516237',
      nombres: 'Víctor Alonso',
      apellido_paterno: 'Díaz',
      apellido_materno: 'Pardo',
      genero: 'M',
      nacimiento: '2015-05-14',
      codigo: 'SMV-2027-0001',
      seccionId: 15, // 5to Primaria A
      apoderados: [personaApoderado1.id_persona, personaApoderado2.id_persona],
    },
    {
      dni: '47516238',
      nombres: 'Valeria Sofía',
      apellido_paterno: 'Díaz',
      apellido_materno: 'Pardo',
      genero: 'F',
      nacimiento: '2017-07-22',
      codigo: 'SMV-2027-0002',
      seccionId: 11, // 3ro Primaria A
      apoderados: [personaApoderado1.id_persona, personaApoderado2.id_persona],
    },
    {
      dni: '47516239',
      nombres: 'Luciana Fernanda',
      apellido_paterno: 'Castillo',
      apellido_materno: 'Paredes',
      genero: 'F',
      nacimiento: '2019-10-01',
      codigo: 'SMV-2027-0003',
      seccionId: 5, // 5 años A
      apoderados: [personaApoderado2.id_persona],
    },
    {
      dni: '47516240',
      nombres: 'Mateo Gabriel',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Luna',
      genero: 'M',
      nacimiento: '2014-02-11',
      codigo: 'SMV-2027-0004',
      seccionId: 17, // 6to Primaria A
      apoderados: [personaApoderado1.id_persona],
    },
  ];

  const matriculas2027: any[] = [];

  for (let i = 0; i < estudiantesData.length; i++) {
    const est = estudiantesData[i];

    const personaEstudiante = await upsertPersona({
      dni: est.dni,
      nombres: est.nombres,
      apellido_paterno: est.apellido_paterno,
      apellido_materno: est.apellido_materno,
      fecha_nacimiento: date(est.nacimiento),
      genero: est.genero,
      correo: null as any,
      telefono: null as any,
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Villa María del Triunfo',
    });

    await prisma.estudiante.upsert({
      where: { id_persona: personaEstudiante.id_persona },
      update: { codigo_estudiante: est.codigo },
      create: {
        id_persona: personaEstudiante.id_persona,
        codigo_estudiante: est.codigo,
      },
    });

    await ensureCodigoColegio(personaEstudiante.id_persona, colegioSMV.id_colegio, est.codigo);

    for (const idApoderado of est.apoderados) {
      await ensureApoderadoEstudiante(
        idApoderado,
        personaEstudiante.id_persona,
        idApoderado === personaApoderado1.id_persona ? 'Padre' : 'Madre',
      );
    }

    const matricula = await prisma.matricula.upsert({
      where: { codigo_matricula: `MAT-2027-${String(i + 1).padStart(4, '0')}` },
      update: {
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        id_estudiante: personaEstudiante.id_persona,
        id_seccion: est.seccionId,
        id_anio: 3,
        estado_matricula: 'Matriculado',
        estado_revision: 'Aprobado',
        tipo_ingreso: i === 0 ? 'Promovido' : 'Nuevo',
        fecha_revision: new Date(),
        id_usuario_registro: usuarioAdmin.id_usuario,
        id_usuario_revision: usuarioAdmin.id_usuario,
      },
      create: {
        codigo_matricula: `MAT-2027-${String(i + 1).padStart(4, '0')}`,
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        id_estudiante: personaEstudiante.id_persona,
        id_seccion: est.seccionId,
        id_anio: 3,
        estado_matricula: 'Matriculado',
        estado_revision: 'Aprobado',
        tipo_ingreso: i === 0 ? 'Promovido' : 'Nuevo',
        fecha_revision: new Date(),
        id_usuario_registro: usuarioAdmin.id_usuario,
        id_usuario_revision: usuarioAdmin.id_usuario,
      },
    });

    matriculas2027.push({ ...matricula, persona: personaEstudiante });
  }

  // Staff tutor de 5to A
  await prisma.staff.upsert({
    where: { id_persona: personaDocente1.id_persona },
    update: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      cargo: 'Docente tutora',
      area: 'Primaria',
      id_seccion: 15,
      es_tutor: true,
      permite_citas: true,
    },
    create: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_persona: personaDocente1.id_persona,
      cargo: 'Docente tutora',
      area: 'Primaria',
      id_seccion: 15,
      es_tutor: true,
      permite_citas: true,
    },
  });

  // ─────────────────────────────────────────────
  // ASIGNACIONES Y NOTAS
  // ─────────────────────────────────────────────
  const asignaciones = [
    await ensureAsignacion({
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_docente: docente1.id_persona,
      id_curso: 1,
      id_seccion: 15,
      id_anio: 3,
    }),
    await ensureAsignacion({
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_docente: docente1.id_persona,
      id_curso: 2,
      id_seccion: 15,
      id_anio: 3,
    }),
    await ensureAsignacion({
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_docente: docente2.id_persona,
      id_curso: 5,
      id_seccion: 15,
      id_anio: 3,
    }),
  ];

  const evals = [
    await ensureEvaluacion({
      id_asignacion: asignaciones[0].id_asignacion,
      id_unidad: 17,
      id_tipo_eval: 3,
      descripcion_actividad: 'Práctica de comprensión lectora',
      fecha_evaluacion: date('2027-03-20'),
    }),
    await ensureEvaluacion({
      id_asignacion: asignaciones[0].id_asignacion,
      id_unidad: 17,
      id_tipo_eval: 4,
      descripcion_actividad: 'Examen de Comunicación',
      fecha_evaluacion: date('2027-04-25'),
    }),
    await ensureEvaluacion({
      id_asignacion: asignaciones[1].id_asignacion,
      id_unidad: 17,
      id_tipo_eval: 3,
      descripcion_actividad: 'Práctica de Matemática',
      fecha_evaluacion: date('2027-03-22'),
    }),
    await ensureEvaluacion({
      id_asignacion: asignaciones[1].id_asignacion,
      id_unidad: 17,
      id_tipo_eval: 4,
      descripcion_actividad: 'Examen de Matemática',
      fecha_evaluacion: date('2027-04-26'),
    }),
  ];

  for (const m of matriculas2027) {
    if (m.id_seccion !== 15 && m.id_seccion !== 17) continue;
    const base = m.id_seccion === 15 ? 14 : 12;
    await ensureNota(m.id_matricula, evals[0].id_evaluacion_det, base + 2, 'Buen avance en lectura.');
    await ensureNota(m.id_matricula, evals[1].id_evaluacion_det, base + 1, 'Debe cuidar la ortografía.');
    await ensureNota(m.id_matricula, evals[2].id_evaluacion_det, base, 'Resuelve con orden.');
    await ensureNota(m.id_matricula, evals[3].id_evaluacion_det, base + 3, 'Excelente desempeño.');
  }

  for (const m of matriculas2027) {
    await prisma.asistencia.upsert({
      where: {
        id_matricula_fecha: {
          id_matricula: m.id_matricula,
          fecha: date('2027-03-05'),
        },
      },
      update: { estado: m.id_matricula % 2 === 0 ? 'Tardanza' : 'Presente' },
      create: {
        id_matricula: m.id_matricula,
        fecha: date('2027-03-05'),
        estado: m.id_matricula % 2 === 0 ? 'Tardanza' : 'Presente',
      },
    });
  }

  // ─────────────────────────────────────────────
  // CONCEPTOS, PLANES, CRONOGRAMAS Y PAGOS
  // ─────────────────────────────────────────────
  const conceptos = [
    { id: 1, nombre: 'Matrícula 2027', monto: 500, esPension: false, tipo: 'MATRICULA' },
    { id: 2, nombre: 'Pensión Marzo 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 3, mesNombre: 'Marzo' },
    { id: 3, nombre: 'Pensión Abril 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 4, mesNombre: 'Abril' },
    { id: 4, nombre: 'Pensión Mayo 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 5, mesNombre: 'Mayo' },
    { id: 5, nombre: 'Pensión Junio 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 6, mesNombre: 'Junio' },
    { id: 6, nombre: 'Pensión Julio 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 7, mesNombre: 'Julio' },
    { id: 7, nombre: 'Pensión Agosto 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 8, mesNombre: 'Agosto' },
    { id: 8, nombre: 'Pensión Setiembre 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 9, mesNombre: 'Setiembre' },
    { id: 9, nombre: 'Pensión Octubre 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 10, mesNombre: 'Octubre' },
    { id: 10, nombre: 'Pensión Noviembre 2027', monto: 350, esPension: true, tipo: 'PENSION', mes: 11, mesNombre: 'Noviembre' },
    { id: 11, nombre: 'Materiales escolares 2027', monto: 120, esPension: false, tipo: 'EXTRAORDINARIO' },
  ];

  for (const c of conceptos) {
    await upsertById(prisma.conceptoPago, 'id_concepto', c.id, {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre_concepto: c.nombre,
      monto_base: c.monto,
      id_anio: 3,
      es_pension: c.esPension,
      es_extraordinario: c.tipo === 'EXTRAORDINARIO',
      tipo_concepto: c.tipo,
    });
  }

  const plan = await prisma.planPensiones.upsert({
    where: { id_plan_pension: 1 },
    update: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_anio: 3,
      nombre: 'Plan regular 2027',
      monto_mensual: 350,
      mes_inicio: 3,
      mes_fin: 11,
      dia_publicacion: 1,
      dia_vencimiento: 15,
      estado: 'Activo',
    },
    create: {
      id_plan_pension: 1,
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      id_anio: 3,
      nombre: 'Plan regular 2027',
      monto_mensual: 350,
      mes_inicio: 3,
      mes_fin: 11,
      dia_publicacion: 1,
      dia_vencimiento: 15,
      estado: 'Activo',
    },
  });

  const detallePorConcepto: Record<number, number> = {};

  const conceptosPension = conceptos.filter(
    (x): x is (typeof conceptos)[number] & { mes: number; mesNombre: string } =>
      x.esPension === true &&
      typeof x.mes === 'number' &&
      typeof x.mesNombre === 'string',
  );

  for (const c of conceptosPension) {
    const mes = c.mes;
    const mesNombre = c.mesNombre;

    const detalle = await prisma.planPensionesDetalle.upsert({
      where: { id_plan_pension_mes: { id_plan_pension: plan.id_plan_pension, mes } },
      update: {
        id_concepto: c.id,
        nombre_mes: mesNombre,
        fecha_publicacion: date(`2027-${String(mes).padStart(2, '0')}-01`),
        fecha_vencimiento: date(`2027-${String(mes).padStart(2, '0')}-15`),
        monto_base: c.monto,
        estado: 'Programado',
      },
      create: {
        id_plan_pension: plan.id_plan_pension,
        id_concepto: c.id,
        mes,
        nombre_mes: mesNombre,
        fecha_publicacion: date(`2027-${String(mes).padStart(2, '0')}-01`),
        fecha_vencimiento: date(`2027-${String(mes).padStart(2, '0')}-15`),
        monto_base: c.monto,
        estado: 'Programado',
      },
    });
    detallePorConcepto[c.id] = detalle.id_plan_detalle;
  }

  for (const m of matriculas2027) {
    for (const c of conceptos) {
      const isMatricula = c.tipo === 'MATRICULA';
      const isExtra = c.tipo === 'EXTRAORDINARIO';

      const vencimiento = isMatricula
        ? date('2027-02-15')
        : isExtra
          ? date('2027-03-10')
          : date(`2027-${String(c.mes).padStart(2, '0')}-15`);

      const ref = `SMV-PG-2027-${String(m.id_matricula).padStart(4, '0')}-${String(c.id).padStart(2, '0')}`;
      const cronograma = await ensureCronograma({
        id_matricula: m.id_matricula,
        id_concepto: c.id,
        fecha_vencimiento: vencimiento,
        estado_pago: isMatricula && m.persona.dni === '47516237' ? 'Pagado' : 'Pendiente',
        monto_base_original: money(c.monto),
        monto_programado: money(c.monto),
        descuento_aplicado: 0,
        id_plan_pension_detalle: c.esPension ? detallePorConcepto[c.id] : null,
        estado_publicacion: 'Publicado',
        visible_apoderado: true,
        referencia_pago: ref,
      });

      if (isMatricula && m.persona.dni === '47516237') {
        await ensurePagoTransaccion({
          id_cronograma: cronograma.id_cronograma,
          id_apoderado: personaApoderado1.id_persona,
          id_usuario_cajero: usuarioAdmin.id_usuario,
          monto_pagado: money(c.monto),
          fecha_pago: new Date('2027-02-10T10:30:00.000Z'),
          metodo_pago: 'Yape',
          nro_operacion: `YAPE-${m.id_matricula}-${c.id}`,
        });
      }

      if (c.id === 2 && m.persona.dni === '47516237') {
        const existingReporte = await prisma.pagoRecibido.findFirst({
          where: {
            numero_operacion: 'OP-DEMO-0001',
            id_cronograma: cronograma.id_cronograma,
          },
        });

        if (existingReporte) {
          await prisma.pagoRecibido.update({
            where: { id_pago_recibido: existingReporte.id_pago_recibido },
            data: {
              id_tenant: tenant.id_tenant,
              id_colegio: colegioSMV.id_colegio,
              medio_pago: 'Transferencia',
              monto_recibido: 350,
              fecha_pago_reportada: new Date('2027-03-12T11:00:00.000Z'),
              nombre_pagador: 'Carlos Díaz',
              telefono_pagador: '912345678',
              numero_operacion: 'OP-DEMO-0001',
              referencia_escrita: ref,
              estado: 'Pendiente',
              id_cronograma: cronograma.id_cronograma,
              id_matricula: m.id_matricula,
              id_estudiante: m.id_estudiante,
              id_apoderado: personaApoderado1.id_persona,
              id_usuario_registro: usuarioAdmin.id_usuario,
              banco_destino: 'BCP',
              origen_reporte: 'Portal público',
            },
          });
        } else {
          await prisma.pagoRecibido.create({
            data: {
              id_tenant: tenant.id_tenant,
              id_colegio: colegioSMV.id_colegio,
              medio_pago: 'Transferencia',
              monto_recibido: 350,
              fecha_pago_reportada: new Date('2027-03-12T11:00:00.000Z'),
              nombre_pagador: 'Carlos Díaz',
              telefono_pagador: '912345678',
              numero_operacion: 'OP-DEMO-0001',
              referencia_escrita: ref,
              estado: 'Pendiente',
              id_cronograma: cronograma.id_cronograma,
              id_matricula: m.id_matricula,
              id_estudiante: m.id_estudiante,
              id_apoderado: personaApoderado1.id_persona,
              id_usuario_registro: usuarioAdmin.id_usuario,
              banco_destino: 'BCP',
              origen_reporte: 'Portal público',
            },
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // PLANTILLAS, EVENTOS Y CIRCULARES
  // ─────────────────────────────────────────────
  const plantillaExistente = await prisma.plantillaEvaluacion.findFirst({
    where: {
      id_tenant: tenant.id_tenant,
      id_colegio: colegioSMV.id_colegio,
      nombre: 'Plantilla básica primaria',
      id_nivel: 2,
      id_curso: 1,
    },
  });

  const plantilla = plantillaExistente
    ? await prisma.plantillaEvaluacion.update({
        where: { id_plantilla: plantillaExistente.id_plantilla },
        data: {
          id_tenant: tenant.id_tenant,
          id_colegio: colegioSMV.id_colegio,
          nombre: 'Plantilla básica primaria',
          id_nivel: 2,
          id_curso: 1,
        },
      })
    : await prisma.plantillaEvaluacion.create({
        data: {
          id_tenant: tenant.id_tenant,
          id_colegio: colegioSMV.id_colegio,
          nombre: 'Plantilla básica primaria',
          id_nivel: 2,
          id_curso: 1,
        },
      });

  for (let i = 0; i < tiposEval.length; i++) {
    const detalleExistente = await prisma.plantillaEvaluacionDetalle.findFirst({
      where: {
        id_plantilla: plantilla.id_plantilla,
        id_tipo_eval: i + 1,
        descripcion: tiposEval[i],
      },
    });

    if (detalleExistente) {
      await prisma.plantillaEvaluacionDetalle.update({
        where: { id_detalle: detalleExistente.id_detalle },
        data: { orden: i + 1 },
      });
    } else {
      await prisma.plantillaEvaluacionDetalle.create({
        data: {
          id_plantilla: plantilla.id_plantilla,
          id_tipo_eval: i + 1,
          descripcion: tiposEval[i],
          orden: i + 1,
        },
      });
    }
  }

  const existingEvento = await prisma.evento.findFirst({
    where: {
      id_colegio: colegioSMV.id_colegio,
      titulo: 'Inicio del año escolar 2027',
    },
  });

  if (!existingEvento) {
    await prisma.evento.create({
      data: {
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        titulo: 'Inicio del año escolar 2027',
        fecha: date('2027-03-01'),
        hora: '08:00',
        tipo: 'Académico',
        descripcion: 'Inicio oficial de clases.',
        id_anio: 3,
      },
    });
  }

  const existingCircular = await prisma.circular.findFirst({
    where: {
      id_colegio: colegioSMV.id_colegio,
      titulo: 'Bienvenida al año escolar 2027',
    },
  });

  if (!existingCircular) {
    const circular = await prisma.circular.create({
      data: {
        id_tenant: tenant.id_tenant,
        id_colegio: colegioSMV.id_colegio,
        titulo: 'Bienvenida al año escolar 2027',
        contenido:
          'Estimadas familias, les damos la bienvenida al nuevo año escolar. Les recordamos revisar el cronograma de pagos y comunicados institucionales.',
        remitente_id_usuario: usuarioAdmin.id_usuario,
        categoria: 'General',
        urgente: false,
        requiere_autorizacion: false,
      },
    });

    await prisma.circularDestinatario.create({
      data: {
        id_circular: circular.id_circular,
        id_nivel: 2,
        id_seccion: 15,
      },
    });
  }

  console.log('✅ Seed completado.');
  console.log('');
  console.log('Usuarios de prueba:');
  console.log('  admin / admin123');
  console.log('  directora / directora123');
  console.log('  secretaria / secretaria123');
  console.log('  juan.rios / docente123');
  console.log('  karla.torres / docente123');
  console.log('  carlos.diaz / apoderado123');
  console.log('  rosa.pardo / apoderado123');
  console.log('');
  console.log('DNI alumno para portal público: 47516237');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
