import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando datos institucionales...');

  // ── ROLES ──
  const rolAdmin = await prisma.rol.upsert({ where: { nombre_rol: 'Admin' }, update: {}, create: { nombre_rol: 'Admin' } });
  const rolProfesor = await prisma.rol.upsert({ where: { nombre_rol: 'Profesor' }, update: {}, create: { nombre_rol: 'Profesor' } });
  const rolApoderado = await prisma.rol.upsert({ where: { nombre_rol: 'Apoderado' }, update: {}, create: { nombre_rol: 'Apoderado' } });
  const rolAlumno = await prisma.rol.upsert({ where: { nombre_rol: 'Alumno' }, update: {}, create: { nombre_rol: 'Alumno' } });
  const rolDirector = await prisma.rol.upsert({ where: { nombre_rol: 'Director' }, update: {}, create: { nombre_rol: 'Director' } });
  const rolSecretaria = await prisma.rol.upsert({ where: { nombre_rol: 'Secretaria' }, update: {}, create: { nombre_rol: 'Secretaria' } });

  // ── USUARIO ADMIN ──
  const personaAdmin = await prisma.persona.upsert({
    where: { dni: '00000000' },
    update: {},
    create: {
      dni: '00000000', nombres: 'Admin', apellido_paterno: 'Sistema', apellido_materno: 'Principal',
      fecha_nacimiento: new Date('2000-01-01'), genero: 'M', correo: 'admin@colegio.edu.pe',
    },
  });
  const hashedAdmin = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password_hash: hashedAdmin, id_persona: personaAdmin.id_persona, id_rol: rolAdmin.id_rol, estado: true },
  });

  // ── NIVELES ──
  const nivelInicial = await prisma.nivel.upsert({ where: { id_nivel: 1 }, update: {}, create: { id_nivel: 1, nombre_nivel: 'Inicial' } });
  const nivelPrimaria = await prisma.nivel.upsert({ where: { id_nivel: 2 }, update: {}, create: { id_nivel: 2, nombre_nivel: 'Primaria' } });
  const nivelSecundaria = await prisma.nivel.upsert({ where: { id_nivel: 3 }, update: {}, create: { id_nivel: 3, nombre_nivel: 'Secundaria' } });

  // ── GRADOS ── (Inicial: 3-4-5 años, Primaria: 1ero-6to, Secundaria: 1ero-5to)
  const gradosData = [
    { nombre: '3 años', nivel: 1 }, { nombre: '4 años', nivel: 1 }, { nombre: '5 años', nivel: 1 },
    { nombre: '1er Grado', nivel: 2 }, { nombre: '2do Grado', nivel: 2 }, { nombre: '3er Grado', nivel: 2 },
    { nombre: '4to Grado', nivel: 2 }, { nombre: '5to Grado', nivel: 2 }, { nombre: '6to Grado', nivel: 2 },
    { nombre: '1er Grado', nivel: 3 }, { nombre: '2do Grado', nivel: 3 }, { nombre: '3er Grado', nivel: 3 },
    { nombre: '4to Grado', nivel: 3 }, { nombre: '5to Grado', nivel: 3 },
  ];
  for (const g of gradosData) {
    await prisma.grado.upsert({
      where: { id_grado: gradosData.indexOf(g) + 1 },
      update: {},
      create: { id_grado: gradosData.indexOf(g) + 1, nombre_grado: g.nombre, id_nivel: g.nivel },
    });
  }

  // ── AULAS ── (creamos dos por grado)
  for (let i = 1; i <= 28; i++) {
    const letra = i % 2 === 1 ? 'A' : 'B';
    await prisma.aula.upsert({
      where: { id_aula: i },
      update: {},
      create: { id_aula: i, nombre_aula: `Aula ${Math.ceil(i / 2)}${letra}`, capacidad: 30 },
    });
  }

  // ── SECCIONES ── (dos secciones por grado: A y B)
  let seccionId = 1;
  for (let gradoId = 1; gradoId <= 14; gradoId++) {
    for (const letra of ['A', 'B']) {
      await prisma.seccion.upsert({
        where: { id_seccion: seccionId },
        update: {},
        create: { id_seccion: seccionId, letra: letra, id_grado: gradoId, id_aula: seccionId },
      });
      seccionId++;
    }
  }

  // ── AÑO LECTIVO ──
  const anioActual = await prisma.anioLectivo.upsert({
    where: { id_anio: 1 },
    update: {},
    create: {
      id_anio: 1, nombre_anio: 'Año Escolar 2025',
      fecha_inicio: new Date('2025-03-01'), fecha_fin: new Date('2025-12-20'),
      estado: 'Abierto',
    },
  });

  // ── BIMESTRES Y UNIDADES ── (opcional pero útil para pruebas)
  for (let b = 1; b <= 4; b++) {
    const bim = await prisma.bimestre.upsert({
      where: { id_bimestre: b },
      update: {},
      create: { id_bimestre: b, numero: b, fecha_inicio: new Date(2025, (b - 1) * 3, 1), fecha_fin: new Date(2025, b * 3, 1), id_anio: 1 },
    });
    // dos unidades por bimestre
    for (let u = 1; u <= 2; u++) {
      await prisma.unidad.upsert({
        where: { id_unidad: (b - 1) * 2 + u },
        update: {},
        create: { id_unidad: (b - 1) * 2 + u, numero: u, fecha_inicio: new Date(2025, (b - 1) * 3, 1), fecha_fin: new Date(2025, (b - 1) * 3 + 1, 1), id_bimestre: bim.id_bimestre, estado_abierto: true },
      });
    }
  }

  // ── ÁREAS CURRICULARES Y CURSOS ──
  const areas = ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Personal Social', 'Inglés', 'Educación Física', 'Arte'];
  for (let i = 0; i < areas.length; i++) {
    const area = await prisma.areaCurricular.upsert({
      where: { id_area: i + 1 },
      update: {},
      create: { id_area: i + 1, nombre_area: areas[i] },
    });
    // Por simplicidad, creamos un curso por área con el mismo nombre
    await prisma.curso.upsert({
      where: { id_curso: i + 1 },
      update: {},
      create: { id_curso: i + 1, nombre_curso: areas[i], id_area: area.id_area },
    });
  }

  // ── CONCEPTOS DE PAGO ──
  const conceptosPago = [
    { nombre: 'Matrícula 2025', monto: 500.00, esPension: false },
    { nombre: 'Pensión Marzo', monto: 350.00, esPension: true },
    { nombre: 'Pensión Abril', monto: 350.00, esPension: true },
    { nombre: 'Pensión Mayo', monto: 350.00, esPension: true },
    { nombre: 'Pensión Junio', monto: 350.00, esPension: true },
    { nombre: 'Pensión Julio', monto: 350.00, esPension: true },
    { nombre: 'Pensión Agosto', monto: 350.00, esPension: true },
    { nombre: 'Pensión Setiembre', monto: 350.00, esPension: true },
    { nombre: 'Pensión Octubre', monto: 350.00, esPension: true },
    { nombre: 'Pensión Noviembre', monto: 350.00, esPension: true },
  ];
  for (const cp of conceptosPago) {
    await prisma.conceptoPago.create({
      data: {
        nombre_concepto: cp.nombre,
        monto_base: cp.monto,
        id_anio: 1,
        es_pension: cp.esPension,
      },
    });
  }

  // ── TIPOS DE EVALUACIÓN ──
  const tiposEval = ['Participación', 'Cuaderno', 'Práctica', 'Examen', 'Exposición'];
  for (const tipo of tiposEval) {
    await prisma.tipoEvaluacion.upsert({
      where: { id_tipo_eval: tiposEval.indexOf(tipo) + 1 },
      update: {},
      create: { nombre_tipo: tipo },
    });
  }

  // ── ESCALA DE CALIFICACIÓN ──
  await prisma.escalaCalificacion.upsert({
    where: { id_escala: 1 },
    update: {},
    create: {
      id_escala: 1,
      nombre_escala: 'Escala Numérica (0-20)',
      nota_minima: 0,
      nota_maxima: 20,
      nota_aprobatoria: 11,
      tipo_calificacion: 'Numérica',
    },
  });

  // ── DOCENTE DE PRUEBA ──
const personaDocente = await prisma.persona.upsert({
  where: { dni: '11111111' },
  update: {},
  create: {
    dni: '11111111',
    nombres: 'Juan',
    apellido_paterno: 'Ríos',
    apellido_materno: 'Mendoza',
    fecha_nacimiento: new Date('1985-05-10'),
    genero: 'M',
    correo: 'juan.rios@colegio.edu.pe',
  },
});
const docente = await prisma.docente.upsert({
  where: { id_persona: personaDocente.id_persona },
  update: {},
  create: {
    id_persona: personaDocente.id_persona,
    fecha_ingreso: new Date('2020-03-01'),
  },
});
// Crear usuario para el docente
const hashedDocente = await bcrypt.hash('docente123', 10);
await prisma.usuario.upsert({
  where: { username: 'juan.rios' },
  update: {},
  create: {
    username: 'juan.rios',
    password_hash: hashedDocente,
    id_persona: personaDocente.id_persona,
    id_rol: rolProfesor.id_rol,
    estado: true,
  },
});

await prisma.evaluacionDetalle.createMany({
  data: [
    { id_asignacion: 1, id_unidad: 1, id_tipo_eval: 3, descripcion_actividad: 'Práctica 1', fecha_evaluacion: new Date('2025-03-10') },
    { id_asignacion: 1, id_unidad: 1, id_tipo_eval: 3, descripcion_actividad: 'Práctica 2', fecha_evaluacion: new Date('2025-03-17') },
    { id_asignacion: 1, id_unidad: 1, id_tipo_eval: 4, descripcion_actividad: 'Examen', fecha_evaluacion: new Date('2025-03-24') },
  ],
  skipDuplicates: true,
});

// Asignar al docente a la sección 1 (Inicial 3 años A) en el año 1, curso Matemática (id_curso=2)
await prisma.asignacionDocente.upsert({
  where: { id_asignacion: 1 },
  update: {},
  create: {
    id_docente: docente.id_persona,
    id_curso: 2, // Matemática
    id_seccion: 1,
    id_anio: 1,
  },
});
const horarios = [
  { id_seccion: 7, id_curso: 2, id_docente: docente.id_persona, dia_semana: 1, hora_inicio: '08:30', hora_fin: '09:15' },
  { id_seccion: 7, id_curso: 1, id_docente: docente.id_persona, dia_semana: 1, hora_inicio: '09:30', hora_fin: '10:15' },
  { id_seccion: 7, id_curso: 3, id_docente: docente.id_persona, dia_semana: 2, hora_inicio: '08:30', hora_fin: '09:15' },
  { id_seccion: 7, id_curso: 2, id_docente: docente.id_persona, dia_semana: 2, hora_inicio: '09:30', hora_fin: '10:15' },
  { id_seccion: 7, id_curso: 4, id_docente: docente.id_persona, dia_semana: 3, hora_inicio: '08:30', hora_fin: '09:15' },
  { id_seccion: 7, id_curso: 5, id_docente: docente.id_persona, dia_semana: 3, hora_inicio: '09:30', hora_fin: '10:15' },
];

for (const h of horarios) {
  await prisma.horario.create({ data: h });
}

  console.log('✅ Seed completado: roles, admin, niveles, grados, secciones, año lectivo, conceptos de pago, tipos de evaluación, escala.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });