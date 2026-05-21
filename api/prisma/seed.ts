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
  await prisma.nivel.upsert({ where: { id_nivel: 1 }, update: {}, create: { id_nivel: 1, nombre_nivel: 'Inicial' } });
  await prisma.nivel.upsert({ where: { id_nivel: 2 }, update: {}, create: { id_nivel: 2, nombre_nivel: 'Primaria' } });
  await prisma.nivel.upsert({ where: { id_nivel: 3 }, update: {}, create: { id_nivel: 3, nombre_nivel: 'Secundaria' } });

  // ── GRADOS ──
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

  // ── AULAS ──
  for (let i = 1; i <= 28; i++) {
    const letra = i % 2 === 1 ? 'A' : 'B';
    await prisma.aula.upsert({
      where: { id_aula: i },
      update: {},
      create: { id_aula: i, nombre_aula: `Aula ${Math.ceil(i / 2)}${letra}`, capacidad: 30 },
    });
  }

  // ── SECCIONES ──
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
  await prisma.anioLectivo.upsert({
    where: { id_anio: 1 },
    update: {},
    create: {
      id_anio: 1, nombre_anio: 'Año Escolar 2025',
      fecha_inicio: new Date('2025-03-01'), fecha_fin: new Date('2025-12-20'),
      estado: 'Abierto',
    },
  });

  // ── BIMESTRES Y UNIDADES ──
  for (let b = 1; b <= 4; b++) {
    const bim = await prisma.bimestre.upsert({
      where: { id_bimestre: b },
      update: {},
      create: { id_bimestre: b, numero: b, fecha_inicio: new Date(2025, (b - 1) * 3, 1), fecha_fin: new Date(2025, b * 3, 1), id_anio: 1 },
    });
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
    await prisma.conceptoPago.create({ data: { nombre_concepto: cp.nombre, monto_base: cp.monto, id_anio: 1, es_pension: cp.esPension } });
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
    create: { id_escala: 1, nombre_escala: 'Escala Numérica (0-20)', nota_minima: 0, nota_maxima: 20, nota_aprobatoria: 11, tipo_calificacion: 'Numérica' },
  });

  // ── DOCENTE DE PRUEBA ──
  const personaDocente = await prisma.persona.upsert({
    where: { dni: '11111111' },
    update: {},
    create: { dni: '11111111', nombres: 'Juan', apellido_paterno: 'Ríos', apellido_materno: 'Mendoza', fecha_nacimiento: new Date('1985-05-10'), genero: 'M', correo: 'juan.rios@colegio.edu.pe' },
  });
  const docente = await prisma.docente.upsert({
    where: { id_persona: personaDocente.id_persona },
    update: {},
    create: { id_persona: personaDocente.id_persona, fecha_ingreso: new Date('2020-03-01') },
  });
  const hashedDocente = await bcrypt.hash('docente123', 10);
  await prisma.usuario.upsert({
    where: { username: 'juan.rios' },
    update: {},
    create: { username: 'juan.rios', password_hash: hashedDocente, id_persona: personaDocente.id_persona, id_rol: rolProfesor.id_rol, estado: true },
  });

  // ── APODERADOS ADICIONALES ──

  // Carlos Mendoza + hijos
  const personaCarlos = await prisma.persona.upsert({
    where: { dni: '55555555' },
    update: {},
    create: { dni: '55555555', nombres: 'Carlos', apellido_paterno: 'Mendoza', apellido_materno: 'Torres', fecha_nacimiento: new Date('1980-06-20'), genero: 'M', correo: 'carlos.mendoza@email.com' },
  });
  await prisma.apoderado.upsert({ where: { id_persona: personaCarlos.id_persona }, update: {}, create: { id_persona: personaCarlos.id_persona, ocupacion: 'Ingeniero' } });
  const hashedCarlos = await bcrypt.hash('apoderado123', 10);
  await prisma.usuario.upsert({ where: { username: 'carlos.mendoza' }, update: {}, create: { username: 'carlos.mendoza', password_hash: hashedCarlos, id_persona: personaCarlos.id_persona, id_rol: rolApoderado.id_rol, estado: true } });

  const personaDiego = await prisma.persona.upsert({ where: { dni: '66666666' }, update: {}, create: { dni: '66666666', nombres: 'Diego', apellido_paterno: 'Mendoza', apellido_materno: 'López', fecha_nacimiento: new Date('2016-09-12'), genero: 'M' } });
  const personaValeria = await prisma.persona.upsert({ where: { dni: '77777777' }, update: {}, create: { dni: '77777777', nombres: 'Valeria', apellido_paterno: 'Mendoza', apellido_materno: 'López', fecha_nacimiento: new Date('2014-04-25'), genero: 'F' } });
  await prisma.estudiante.upsert({ where: { id_persona: personaDiego.id_persona }, update: {}, create: { id_persona: personaDiego.id_persona, codigo_estudiante: 'ALU000005' } });
  await prisma.estudiante.upsert({ where: { id_persona: personaValeria.id_persona }, update: {}, create: { id_persona: personaValeria.id_persona, codigo_estudiante: 'ALU000006' } });
  await prisma.apoderadoEstudiante.upsert({ where: { id_apoderado_id_estudiante: { id_apoderado: personaCarlos.id_persona, id_estudiante: personaDiego.id_persona } }, update: {}, create: { id_apoderado: personaCarlos.id_persona, id_estudiante: personaDiego.id_persona, parentesco: 'Padre' } });
  await prisma.apoderadoEstudiante.upsert({ where: { id_apoderado_id_estudiante: { id_apoderado: personaCarlos.id_persona, id_estudiante: personaValeria.id_persona } }, update: {}, create: { id_apoderado: personaCarlos.id_persona, id_estudiante: personaValeria.id_persona, parentesco: 'Padre' } });
  await prisma.matricula.upsert({ where: { id_matricula: 7 }, update: {}, create: { id_matricula: 7, id_estudiante: personaDiego.id_persona, id_seccion: 3, id_anio: 1, estado_matricula: 'Activo' } });
  await prisma.matricula.upsert({ where: { id_matricula: 8 }, update: {}, create: { id_matricula: 8, id_estudiante: personaValeria.id_persona, id_seccion: 7, id_anio: 1, estado_matricula: 'Activo' } });

  // Rosa Castillo + hija
  const personaRosa = await prisma.persona.upsert({ where: { dni: '88888888' }, update: {}, create: { dni: '88888888', nombres: 'Rosa', apellido_paterno: 'Castillo', apellido_materno: 'Paredes', fecha_nacimiento: new Date('1983-11-08'), genero: 'F', correo: 'rosa.castillo@email.com' } });
  await prisma.apoderado.upsert({ where: { id_persona: personaRosa.id_persona }, update: {}, create: { id_persona: personaRosa.id_persona, ocupacion: 'Abogada' } });
  const hashedRosa = await bcrypt.hash('apoderado123', 10);
  await prisma.usuario.upsert({ where: { username: 'rosa.castillo' }, update: {}, create: { username: 'rosa.castillo', password_hash: hashedRosa, id_persona: personaRosa.id_persona, id_rol: rolApoderado.id_rol, estado: true } });
  const personaLuciana = await prisma.persona.upsert({ where: { dni: '99999999' }, update: {}, create: { dni: '99999999', nombres: 'Luciana', apellido_paterno: 'Castillo', apellido_materno: 'Paredes', fecha_nacimiento: new Date('2019-07-15'), genero: 'F' } });
  await prisma.estudiante.upsert({ where: { id_persona: personaLuciana.id_persona }, update: {}, create: { id_persona: personaLuciana.id_persona, codigo_estudiante: 'ALU000007' } });
  await prisma.apoderadoEstudiante.upsert({ where: { id_apoderado_id_estudiante: { id_apoderado: personaRosa.id_persona, id_estudiante: personaLuciana.id_persona } }, update: {}, create: { id_apoderado: personaRosa.id_persona, id_estudiante: personaLuciana.id_persona, parentesco: 'Madre' } });
  await prisma.matricula.upsert({ where: { id_matricula: 9 }, update: {}, create: { id_matricula: 9, id_estudiante: personaLuciana.id_persona, id_seccion: 5, id_anio: 1, estado_matricula: 'Activo' } });

  // ── CRONOGRAMAS DE PAGO PARA NUEVOS ALUMNOS ──
  const idsMatriculasNuevas = [7, 8, 9]; // Diego, Valeria, Luciana
  for (const idMat of idsMatriculasNuevas) {
    const matric = await prisma.matricula.findUnique({ where: { id_matricula: idMat } });
    if (!matric) continue;
    const conceptos = await prisma.conceptoPago.findMany({ where: { id_anio: 1 } });
    for (let i = 0; i < conceptos.length; i++) {
      const concepto = conceptos[i];
      let fechaVenc = new Date('2025-03-01');
      if (concepto.es_pension) {
        fechaVenc = new Date('2025-03-05');
        fechaVenc.setMonth(fechaVenc.getMonth() + (i - 1)); // el primer concepto es matrícula (no pensión)
      } else {
        fechaVenc = new Date('2025-03-01');
      }
      await prisma.cronogramaPagos.upsert({
        where: { id_cronograma: i + 1 + (idMat - 1) * conceptos.length },
        update: {},
        create: { id_matricula: idMat, id_concepto: concepto.id_concepto, fecha_vencimiento: fechaVenc, estado_pago: 'Pendiente' },
      });
    }
  }

  // ── STAFF ADICIONAL ──
  await prisma.staff.upsert({ where: { id_persona: 1 }, update: {}, create: { id_persona: 1, cargo: 'Director', area: 'academica' } });
  await prisma.staff.upsert({ where: { id_persona: 2 }, update: {}, create: { id_persona: 2, cargo: 'Docente', area: 'academica' } });

  const personaAna = await prisma.persona.upsert({ where: { dni: '12345678' }, update: {}, create: { dni: '12345678', nombres: 'Ana', apellido_paterno: 'Torres', apellido_materno: 'Ramírez', fecha_nacimiento: new Date('1990-03-15'), genero: 'F', correo: 'ana.torres@colegio.edu.pe' } });
  await prisma.staff.upsert({ where: { id_persona: personaAna.id_persona }, update: {}, create: { id_persona: personaAna.id_persona, cargo: 'Secretaría', area: 'administrativa' } });

  const personaLuis = await prisma.persona.upsert({ where: { dni: '23456789' }, update: {}, create: { dni: '23456789', nombres: 'Luis', apellido_paterno: 'Gonzales', apellido_materno: 'Pérez', fecha_nacimiento: new Date('1985-07-20'), genero: 'M', correo: 'luis.gonzales@colegio.edu.pe' } });
  await prisma.staff.upsert({ where: { id_persona: personaLuis.id_persona }, update: {}, create: { id_persona: personaLuis.id_persona, cargo: 'Psicólogo Educativo', area: 'salud' } });

  const personaCarmen = await prisma.persona.upsert({ where: { dni: '34567890' }, update: {}, create: { dni: '34567890', nombres: 'Carmen', apellido_paterno: 'Rojas', apellido_materno: 'Linares', fecha_nacimiento: new Date('1992-11-10'), genero: 'F', correo: 'carmen.rojas@colegio.edu.pe' } });
  await prisma.staff.upsert({ where: { id_persona: personaCarmen.id_persona }, update: {}, create: { id_persona: personaCarmen.id_persona, cargo: 'Enfermería', area: 'salud' } });

  // ── ÁLBUMES Y FOTOS ──
  const album1 = await prisma.album.upsert({ where: { id_album: 1 }, update: {}, create: { titulo: 'Visita a la Granja - 3 años', descripcion: 'Los niños de inicial visitaron la granja educativa', fecha: new Date('2025-04-15'), id_seccion: 3, id_docente: 2, portada_url: 'https://picsum.photos/id/301/400/300' } });
  const album2 = await prisma.album.upsert({ where: { id_album: 2 }, update: {}, create: { titulo: 'Día del Logro - 1er Grado', descripcion: 'Exposición de trabajos del primer bimestre', fecha: new Date('2025-05-20'), id_seccion: 7, id_docente: 2, portada_url: 'https://picsum.photos/id/302/400/300' } });

  const fotosData = [
    { id_album: 1, url: 'https://picsum.photos/id/201/400/300', titulo: 'Jugando en el patio' },
    { id_album: 1, url: 'https://picsum.photos/id/202/400/300', titulo: 'Clase de arte' },
    { id_album: 1, url: 'https://picsum.photos/id/203/300/400', titulo: 'Día del logro' },
    { id_album: 1, url: 'https://picsum.photos/id/204/400/300', titulo: 'Hora del cuento' },
    { id_album: 1, url: 'https://picsum.photos/id/205/300/400', titulo: 'Educación física' },
    { id_album: 2, url: 'https://picsum.photos/id/104/400/300', titulo: 'Exposición de ciencias' },
    { id_album: 2, url: 'https://picsum.photos/id/105/300/400', titulo: 'Trabajo en equipo' },
    { id_album: 2, url: 'https://picsum.photos/id/106/400/300', titulo: 'Educación física' },
    { id_album: 2, url: 'https://picsum.photos/id/107/400/300', titulo: 'Actuación especial' },
  ];
  for (let i = 0; i < fotosData.length; i++) {
    await prisma.foto.upsert({ where: { id_foto: i + 1 }, update: {}, create: fotosData[i] });
  }

  console.log('✅ Seed completado con todos los datos de prueba.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });