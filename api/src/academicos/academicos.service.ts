import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { normalizePersonaInput } from '../common/persona-normalizer';

interface ScopeParams {
  userId: number;
  rol: string;
  scope?: string;
  colegioId?: number;
}

interface MatriculaScope {
  tipo: 'todos' | 'colegio';
  tenantId: number | null;
  colegioIds: number[];
  colegios: {
    id_colegio: number;
    id_tenant: number;
    nombre: string;
    nombre_corto: string | null;
    codigo: string | null;
  }[];
  puedeVerConsolidado: boolean;
}

@Injectable()
export class AcademicosService {
  constructor(private prisma: PrismaService) {}

  // ── HELPERS DE ESTADOS FINALES ──────────────────────
  private readonly estadosMatriculaFinales = [
    'Anulado',
    'Retirado',
    'No continúa',
    'Finalizado',
    'Promocionado',
    'Egresado',
  ];

  private readonly estadosRevisionFinales = ['Rechazado'];

  private esMatriculaFinal(matricula?: {
    estado_matricula?: string | null;
    estado_revision?: string | null;
  } | null) {
    if (!matricula) return false;

    return (
      this.estadosMatriculaFinales.includes(String(matricula.estado_matricula || '')) ||
      this.estadosRevisionFinales.includes(String(matricula.estado_revision || ''))
    );
  }

  private asegurarMatriculaNoFinal(
    matricula: {
      estado_matricula?: string | null;
      estado_revision?: string | null;
    },
    accion: string,
  ) {
    if (!this.esMatriculaFinal(matricula)) return;

    const estadoMatricula = matricula.estado_matricula || '—';
    const estadoRevision = matricula.estado_revision || '—';

    throw new BadRequestException(
      `No se puede ${accion} porque la matrícula está cerrada. Estado: ${estadoMatricula}. Revisión: ${estadoRevision}. Si fue un error, usa un flujo de reapertura autorizado.`,
    );
  }

  private normalizeEmpty(value?: string | null) {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private normalizeGenero(value?: string | null) {
    if (!value) return null;
    if (value === 'Masculino') return 'M';
    if (value === 'Femenino') return 'F';
    return String(value).charAt(0).toUpperCase();
  }

  private validarFechaNacimiento(fecha: string) {
    const nacimiento = new Date(fecha);

    if (Number.isNaN(nacimiento.getTime())) {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }

    const hoy = new Date();
    const fechaMinima = new Date('1990-01-01');

    if (nacimiento > hoy) {
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura.',
      );
    }

    if (nacimiento < fechaMinima) {
      throw new BadRequestException(
        'La fecha de nacimiento ingresada parece demasiado antigua. Revisa el dato.',
      );
    }

    return nacimiento;
  }

  // ── HELPERS PARA VALIDACIÓN DE EDAD ────────────────────

  private calcularEdadAlCorte(fechaNacimiento: Date, anio: number) {
    const corte = new Date(`${anio}-03-31T23:59:59.999-05:00`);

    let edad = corte.getFullYear() - fechaNacimiento.getFullYear();
    const mes = corte.getMonth() - fechaNacimiento.getMonth();

    if (mes < 0 || (mes === 0 && corte.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  private calcularEdadDetalladaAlCorte(fechaNacimiento: Date, fechaCorte: Date) {
    let anios = fechaCorte.getFullYear() - fechaNacimiento.getFullYear();
    let meses = fechaCorte.getMonth() - fechaNacimiento.getMonth();
    let dias = fechaCorte.getDate() - fechaNacimiento.getDate();

    if (dias < 0) {
      meses -= 1;

      const ultimoDiaMesAnterior = new Date(
        fechaCorte.getFullYear(),
        fechaCorte.getMonth(),
        0,
      ).getDate();

      dias += ultimoDiaMesAnterior;
    }

    if (meses < 0) {
      anios -= 1;
      meses += 12;
    }

    const partes = [`${anios} ${anios === 1 ? 'año' : 'años'}`];

    if (meses > 0) {
      partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
    }

    return {
      anios,
      meses,
      dias,
      texto:
        partes.length === 1
          ? partes[0]
          : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`,
    };
  }

  private extraerPrimerNumero(texto?: string | null) {
    const match = String(texto || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private extraerGradoPrimaria(nombreGrado?: string | null) {
    const normalizado = String(nombreGrado || '').toLowerCase();

    if (normalizado.includes('primer') || normalizado.includes('1')) return 1;
    if (normalizado.includes('segundo') || normalizado.includes('2')) return 2;
    if (normalizado.includes('tercer') || normalizado.includes('3')) return 3;
    if (normalizado.includes('cuarto') || normalizado.includes('4')) return 4;
    if (normalizado.includes('quinto') || normalizado.includes('5')) return 5;
    if (normalizado.includes('sexto') || normalizado.includes('6')) return 6;

    return null;
  }

  private getAnioCorte(anio: { fecha_inicio?: Date | string | null; nombre_anio?: string | null }) {
    if (anio.fecha_inicio) {
      const fechaInicio = new Date(anio.fecha_inicio);
      if (!Number.isNaN(fechaInicio.getTime())) return fechaInicio.getFullYear();
    }

    const desdeNombre = this.extraerPrimerNumero(anio.nombre_anio);
    if (desdeNombre && desdeNombre >= 2000) return desdeNombre;

    return new Date().getFullYear();
  }

  private getEdadRequerida(nivel?: string | null, grado?: string | null) {
    const nivelNormalizado = String(nivel || '').toLowerCase();
    const gradoNormalizado = String(grado || '').toLowerCase();

    if (nivelNormalizado.includes('inicial')) {
      const edadInicial = this.extraerPrimerNumero(gradoNormalizado);
      if (edadInicial && edadInicial >= 3 && edadInicial <= 5) {
        return {
          edad: edadInicial,
          permiteExcepcionTraslado: false,
          motivo: `Inicial ${edadInicial} años`,
        };
      }

      return null;
    }

    if (nivelNormalizado.includes('primaria')) {
      const gradoPrimaria = this.extraerGradoPrimaria(gradoNormalizado);

      if (!gradoPrimaria) return null;

      return {
        edad: 5 + gradoPrimaria,
        permiteExcepcionTraslado: gradoPrimaria >= 2,
        motivo: `${gradoPrimaria}.° de primaria`,
      };
    }

    return null;
  }

  private async validarEdadParaMatricula(params: {
    idEstudiante: number;
    idSeccion: number;
    idAnio: number;
    excepcionTraslado?: boolean;
  }) {
    const [estudiante, seccion, anio] = await Promise.all([
      this.prisma.estudiante.findUnique({
        where: { id_persona: params.idEstudiante },
        include: { persona: true },
      }),
      this.prisma.seccion.findUnique({
        where: { id_seccion: params.idSeccion },
        include: {
          grado: {
            include: { nivel: true },
          },
        },
      }),
      this.prisma.anioLectivo.findUnique({
        where: { id_anio: params.idAnio },
      }),
    ]);

    if (!estudiante) throw new NotFoundException('No se encontró el alumno seleccionado.');
    if (!seccion) throw new NotFoundException('No se encontró la sección seleccionada.');
    if (!anio) throw new NotFoundException('No se encontró el año lectivo seleccionado.');

    const fechaNacimiento = new Date(estudiante.persona.fecha_nacimiento);

    if (Number.isNaN(fechaNacimiento.getTime())) {
      throw new BadRequestException('La fecha de nacimiento del alumno no es válida.');
    }

    const anioCorte = this.getAnioCorte(anio);
    const edadAlCorte = this.calcularEdadAlCorte(fechaNacimiento, anioCorte);

    const fechaCorte = new Date(`${anioCorte}-03-31T23:59:59.999-05:00`);
    const edadDetallada = this.calcularEdadDetalladaAlCorte(
      fechaNacimiento,
      fechaCorte,
    );

    const regla = this.getEdadRequerida(
      seccion.grado?.nivel?.nombre_nivel,
      seccion.grado?.nombre_grado,
    );

    if (!regla) {
      return {
        valido: true,
        edadAlCorte,
        anioCorte,
      };
    }

    if (edadAlCorte >= regla.edad) {
      return {
        valido: true,
        edadAlCorte,
        anioCorte,
      };
    }

    if (regla.permiteExcepcionTraslado && params.excepcionTraslado) {
      return {
        valido: true,
        edadAlCorte,
        anioCorte,
        advertencia:
          'Se permitió por excepción de traslado. Debe existir constancia/certificado de estudios de la institución de origen.',
      };
    }

    throw new BadRequestException(
      `El alumno no cumple la edad para ${regla.motivo}. Para este año lectivo debe tener ${regla.edad} años cumplidos al 31 de marzo de ${anioCorte}. Edad al corte: ${edadDetallada.texto}.`,
    );
  }

  // ── HELPERS PARA CÓDIGO DE ESTUDIANTE POR COLEGIO ─────

  private normalizarPrefijoColegio(colegio: {
    codigo?: string | null;
    nombre_corto?: string | null;
    nombre?: string | null;
  }) {
    const base = colegio.codigo || colegio.nombre_corto || colegio.nombre || 'COL';

    const limpio = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    return (limpio || 'COL').slice(0, 6);
  }

  private async asegurarCodigoEstudianteColegio(
    tx: Prisma.TransactionClient,
    idEstudiante: number,
    idColegio: number,
  ) {
    const existente = await tx.estudianteCodigoColegio.findUnique({
      where: {
        id_estudiante_id_colegio: {
          id_estudiante: idEstudiante,
          id_colegio: idColegio,
        },
      },
    });

    if (existente) return existente;

    const colegio = await tx.colegio.findUnique({
      where: { id_colegio: idColegio },
      select: { codigo: true, nombre_corto: true, nombre: true },
    });

    if (!colegio) {
      throw new BadRequestException('No se encontró el colegio para generar el código del alumno.');
    }

    const prefijo = this.normalizarPrefijoColegio(colegio);

    const totalActual = await tx.estudianteCodigoColegio.count({
      where: { id_colegio: idColegio },
    });

    for (let intento = 1; intento <= 20; intento++) {
      const codigo = `${prefijo}-${String(totalActual + intento).padStart(6, '0')}`;

      try {
        return await tx.estudianteCodigoColegio.create({
          data: {
            id_estudiante: idEstudiante,
            id_colegio: idColegio,
            codigo,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException('No se pudo generar un código único para el alumno.');
  }

  // ── HELPERS DE NORMALIZACIÓN PARA PROCEDENCIA Y REVISIÓN ──

  private normalizarTexto(value?: string | null) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private esConceptoMatricula(concepto?: {
    tipo_concepto?: string | null;
    nombre_concepto?: string | null;
    es_pension?: boolean | null;
    es_extraordinario?: boolean | null;
  }) {
    if (!concepto) return false;

    if (concepto.tipo_concepto) {
      return concepto.tipo_concepto === 'MATRICULA';
    }

    return (
      !concepto.es_pension &&
      !concepto.es_extraordinario &&
      this.normalizarTexto(concepto.nombre_concepto).includes('matric')
    );
  }

  private esConceptoPension(concepto?: {
    tipo_concepto?: string | null;
    es_pension?: boolean | null;
  }) {
    if (!concepto) return false;

    if (concepto.tipo_concepto) {
      return concepto.tipo_concepto === 'PENSION';
    }

    return Boolean(concepto.es_pension);
  }

  private esConceptoExtraordinario(concepto?: {
    tipo_concepto?: string | null;
    es_extraordinario?: boolean | null;
  }) {
    if (!concepto) return false;

    if (concepto.tipo_concepto) {
      return concepto.tipo_concepto === 'EXTRAORDINARIO';
    }

    return Boolean(concepto.es_extraordinario);
  }

  private normalizarTipoIngreso(value?: string | null) {
    const valor = this.normalizeEmpty(value) || 'Nuevo';

    const key = valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const alias: Record<string, string> = {
      nuevo: 'Nuevo',
      traslado: 'Traslado',
      reingreso: 'Reingreso',
      'continuidad interna': 'Continuidad interna',
      continuidad: 'Continuidad interna',
      regularizacion: 'Regularización',
      regularización: 'Regularización',
      reserva: 'Reserva',
      renovacion: 'Renovación',
      'renovacion matricula': 'Renovación',
      'renovacion de matricula': 'Renovación',
      rematricula: 'Renovación',
      're matricula': 'Renovación',
      're-matricula': 'Renovación',
      'renovacion con cambio de sede': 'Renovación con cambio de sede',
      'renovacion cambio sede': 'Renovación con cambio de sede',
      'traslado interno siguiente anio': 'Renovación con cambio de sede',
      'traslado interno siguiente año': 'Renovación con cambio de sede',
    };

    const normalizado = alias[key] || valor;
    const permitidos = [
      'Nuevo',
      'Traslado',
      'Reingreso',
      'Continuidad interna',
      'Regularización',
      'Reserva',
      'Renovación',
      'Renovación con cambio de sede',
    ];

    if (!permitidos.includes(normalizado)) {
      throw new BadRequestException(
        'Tipo de ingreso inválido. Usa Nuevo, Traslado, Reingreso, Continuidad interna, Regularización, Reserva, Renovación o Renovación con cambio de sede.',
      );
    }

    return normalizado;
  }

  private normalizarEstadoRevision(value?: string | null) {
    const valor = this.normalizeEmpty(value) || 'Por revisar';
    const permitidos = ['Por revisar', 'Aprobado', 'Observado', 'Rechazado'];

    if (!permitidos.includes(valor)) {
      throw new BadRequestException(
        'Estado de revisión inválido. Usa Por revisar, Aprobado, Observado o Rechazado.',
      );
    }

    return valor;
  }

  // ── NUEVOS HELPERS DE MATRÍCULA PARA RENOVACIÓN Y CAMPAÑAS ──

  private tiposRenovacion = ['Renovación', 'Renovación con cambio de sede'];

  private estadosMatriculaNoFinales = [
    'Activo',
    'Pre-matriculado',
    'Reserva',
    'Pendiente',
    'Observado',
  ];

  private getAnioCorteDeRegistro(anio?: {
    fecha_inicio?: Date | string | null;
    nombre_anio?: string | null;
  } | null) {
    if (!anio) return new Date().getFullYear();

    if (anio.fecha_inicio) {
      const fecha = new Date(anio.fecha_inicio);
      if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
    }

    const match = String(anio.nombre_anio || '').match(/\d{4}/);
    return match ? Number(match[0]) : new Date().getFullYear();
  }

  private async buscarMatriculasNoFinalesAlumnoGrupo(params: {
    idEstudiante: number;
    idTenant: number | null;
  }) {
    const whereTenantGrupo = params.idTenant
      ? {
          OR: [
            { id_tenant: params.idTenant },
            { id_tenant: null },
            { colegio: { id_tenant: params.idTenant } },
          ],
        }
      : {};

    return this.prisma.matricula.findMany({
      where: {
        id_estudiante: params.idEstudiante,
        ...whereTenantGrupo,
        estado_matricula: { in: this.estadosMatriculaNoFinales },
      },
      include: {
        colegio: true,
        anio: true,
        seccion: {
          include: {
            grado: { include: { nivel: true } },
          },
        },
      },
      orderBy: { id_matricula: 'desc' },
    });
  }

  private mensajeMatriculaExistenteMismoAnio(matriculaExistente: any) {
    const colegioNombre = matriculaExistente?.colegio?.nombre || 'este colegio';
    const anioNombre = matriculaExistente?.anio?.nombre_anio || 'el año lectivo registrado';
    const gradoNombre = matriculaExistente?.seccion?.grado?.nombre_grado || 'grado';
    const nivelNombre = matriculaExistente?.seccion?.grado?.nivel?.nombre_nivel || 'nivel';
    const letra = matriculaExistente?.seccion?.letra || '-';
    const estado = matriculaExistente?.estado_matricula || 'matriculado';

    return `El alumno ya tiene una matrícula no finalizada para ${anioNombre}: ${estado} en ${colegioNombre}, ${gradoNombre} "${letra}" · ${nivelNombre}. No puede tener dos procesos para el mismo año escolar.`;
  }

  private async validarBloqueoYOrigenMatricula(params: {
    idEstudiante: number;
    idTenant: number | null;
    idColegioDestino: number;
    anioDestino: {
      id_anio: number;
      fecha_inicio?: Date | string | null;
      nombre_anio?: string | null;
    };
    tipoIngreso: string;
  }) {
    const anioDestino = this.getAnioCorteDeRegistro(params.anioDestino);
    const esRenovacion = this.tiposRenovacion.includes(params.tipoIngreso);

    const matriculas = await this.buscarMatriculasNoFinalesAlumnoGrupo({
      idEstudiante: params.idEstudiante,
      idTenant: params.idTenant,
    });

    const mismaGestion = matriculas.find(
      (matricula) => this.getAnioCorteDeRegistro(matricula.anio) === anioDestino,
    );

    if (mismaGestion) {
      throw new BadRequestException(
        this.mensajeMatriculaExistenteMismoAnio(mismaGestion),
      );
    }

    const matriculaOrigen =
      matriculas
        .filter((matricula) => this.getAnioCorteDeRegistro(matricula.anio) < anioDestino)
        .sort(
          (a, b) =>
            this.getAnioCorteDeRegistro(b.anio) -
            this.getAnioCorteDeRegistro(a.anio),
        )[0] || null;

    if (esRenovacion && !matriculaOrigen) {
      throw new BadRequestException(
        'No se encontró una matrícula anterior vigente para renovar. Si es alumno nuevo o reingreso, usa el tipo de ingreso correspondiente.',
      );
    }

    if (
      params.tipoIngreso === 'Renovación con cambio de sede' &&
      matriculaOrigen?.id_colegio === params.idColegioDestino
    ) {
      throw new BadRequestException(
        'El tipo “Renovación con cambio de sede” requiere que la sede destino sea distinta a la sede anterior.',
      );
    }

    if (
      params.tipoIngreso === 'Renovación' &&
      matriculaOrigen?.id_colegio &&
      matriculaOrigen.id_colegio !== params.idColegioDestino
    ) {
      throw new BadRequestException(
        'El alumno viene de otra sede del grupo. Usa “Renovación con cambio de sede”.',
      );
    }

    return { matriculaOrigen };
  }

  // ── FIN NUEVOS HELPERS DE MATRÍCULA ───────────────────

  private getEstadoOperativoAnio(anio: {
    estado?: string | null;
    fecha_inicio?: Date | string | null;
    fecha_fin?: Date | string | null;
  }) {
    const estado = String(anio.estado || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (['cerrado', 'archivado'].includes(estado)) return 'Cerrado';
    if (estado.includes('planificacion')) return 'Planificación';
    if (estado.includes('matricula') || estado === 'abierto') {
      return 'Matrícula abierta';
    }
    if (estado === 'activo' || estado.includes('curso')) return 'En curso';

    return anio.estado || 'Planificación';
  }

  private getFechaCorteMatriculaRegular(anio: {
    fecha_inicio?: Date | string | null;
    nombre_anio?: string | null;
  }) {
    const year = this.getAnioCorte(anio);
    return new Date(`${year}-03-31T23:59:59.999-05:00`);
  }

  private validarPeriodoAnioParaMatricula(
    anio: {
      estado?: string | null;
      fecha_inicio?: Date | string | null;
      fecha_fin?: Date | string | null;
      nombre_anio?: string | null;
    },
    tipoIngresoRaw?: string | null,
  ) {
    const tipoIngreso = this.normalizarTipoIngreso(tipoIngresoRaw);
    const estadoOperativo = this.getEstadoOperativoAnio(anio);

    const hoy = new Date();
    const fechaInicio = anio.fecha_inicio ? new Date(anio.fecha_inicio) : null;
    const fechaFin = anio.fecha_fin ? new Date(anio.fecha_fin) : null;
    const corteMatriculaRegular = this.getFechaCorteMatriculaRegular(anio);

    if (
      estadoOperativo === 'Cerrado' ||
      estadoOperativo === 'Archivado' ||
      (fechaFin && hoy > fechaFin)
    ) {
      throw new BadRequestException(
        'El año lectivo seleccionado está cerrado o vencido. No se pueden registrar nuevas matrículas en este periodo.',
      );
    }

    if (estadoOperativo === 'Planificación') {
      if (tipoIngreso === 'Reserva') {
        return {
          tipoIngreso,
          estadoMatricula: 'Reserva',
          generaCobroMatricula: false,
        };
      }

      if (this.tiposRenovacion.includes(tipoIngreso)) {
        return {
          tipoIngreso,
          estadoMatricula: 'Pre-matriculado',
          generaCobroMatricula: true,
        };
      }

      throw new BadRequestException(
        'El año lectivo está en planificación. Solo puedes registrar reservas o renovaciones/re-matrículas anticipadas.',
      );
    }

    const tiposPermitidosEnCurso = ['Traslado', 'Reingreso', 'Regularización'];

    const estaEnCursoPorFecha =
      fechaInicio && fechaFin && hoy >= fechaInicio && hoy <= fechaFin;

    const pasoCorteRegular = hoy > corteMatriculaRegular;

    if (
      estadoOperativo === 'En curso' ||
      (estaEnCursoPorFecha && pasoCorteRegular)
    ) {
      if (!tiposPermitidosEnCurso.includes(tipoIngreso)) {
        throw new BadRequestException(
          'La matrícula regular ya está cerrada para este año lectivo. En periodo en curso solo se permiten Traslado, Reingreso o Regularización autorizada.',
        );
      }
    }

    if (tipoIngreso === 'Reserva') {
      throw new BadRequestException(
        'El tipo Reserva solo debe usarse para años lectivos en planificación o futuros. Para el periodo abierto usa Nuevo, Traslado, Reingreso, Continuidad interna, Renovación o Renovación con cambio de sede.',
      );
    }

    return {
      tipoIngreso,
      estadoMatricula: 'Pre-matriculado',
      generaCobroMatricula: true,
    };
  }

  // ── HELPERS PARA PAGO DE MATRÍCULA Y ACTIVACIÓN ───────

  private getMesDesdeConcepto(nombre?: string | null) {
    const text = String(nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const meses: Record<string, number> = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      setiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };

    for (const [mes, index] of Object.entries(meses)) {
      if (text.includes(mes)) return index;
    }

    return null;
  }

  private getAnioDesdeAnioLectivo(anio: { fecha_inicio?: Date | string | null; nombre_anio?: string | null }) {
    if (anio.fecha_inicio) {
      const fecha = new Date(anio.fecha_inicio);
      if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
    }

    const match = String(anio.nombre_anio || '').match(/\d{4}/);
    return match ? Number(match[0]) : new Date().getFullYear();
  }

  private calcularFechaVencimientoConcepto(
    concepto: { nombre_concepto: string },
    anio: { fecha_inicio?: Date | string | null; nombre_anio?: string | null },
    index: number,
  ) {
    const year = this.getAnioDesdeAnioLectivo(anio);
    const mesDetectado = this.getMesDesdeConcepto(concepto.nombre_concepto);

    if (mesDetectado !== null) {
      return new Date(year, mesDetectado, 5);
    }

    const fechaInicio = anio.fecha_inicio ? new Date(anio.fecha_inicio) : new Date(year, 2, 1);
    const fecha = new Date(fechaInicio);
    fecha.setMonth(fecha.getMonth() + index);
    fecha.setDate(5);
    return fecha;
  }

  private async generarPensionesMatricula(
    tx: Prisma.TransactionClient,
    matricula: {
      id_matricula: number;
      id_anio: number;
      id_colegio: number | null;
      anio: { fecha_inicio?: Date | string | null; nombre_anio?: string | null };
    },
  ) {
    const conceptosPension = await tx.conceptoPago.findMany({
      where: {
        id_anio: matricula.id_anio,
        OR: matricula.id_colegio
          ? [{ id_colegio: matricula.id_colegio }, { id_colegio: null }]
          : [{ id_colegio: null }],
        tipo_concepto: 'PENSION',
      },
      orderBy: [{ id_colegio: 'desc' }, { id_concepto: 'asc' }],
    });

    let creados = 0;

    for (let i = 0; i < conceptosPension.length; i++) {
      const concepto = conceptosPension[i];

      const existente = await tx.cronogramaPagos.findFirst({
        where: {
          id_matricula: matricula.id_matricula,
          id_concepto: concepto.id_concepto,
        },
      });

      if (existente) continue;

      const creado = await tx.cronogramaPagos.create({
        data: {
          id_matricula: matricula.id_matricula,
          id_concepto: concepto.id_concepto,
          fecha_vencimiento: this.calcularFechaVencimientoConcepto(
            concepto,
            matricula.anio,
            i,
          ),
          estado_pago: 'Pendiente',
        },
      });

      await this.asegurarReferenciaPagoCronogramaAcademico(tx, creado.id_cronograma);

      creados++;
    }

    return creados;
  }

  // ── HELPERS DE MONTO / CAMPAÑA ────────────────────────
  private montoProgramadoCronograma(item: {
    monto_programado?: Prisma.Decimal | number | string | null;
    concepto?: { monto_base?: Prisma.Decimal | number | string | null };
  }) {
    return Number(item.monto_programado ?? item.concepto?.monto_base ?? 0);
  }

  private async obtenerCampanaMatriculaActiva(
    tx: Prisma.TransactionClient,
    params: {
      idTenant: number | null;
      idColegio: number | null;
      idAnio: number;
      tipoIngreso: string;
      matriculaOrigen?: any | null;
    },
  ) {
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const campanas = await tx.campanaMatricula.findMany({
      where: {
        id_anio: params.idAnio,
        estado: 'Activo',
        fecha_inicio: { lte: hoyInicio },
        fecha_fin: { gte: hoyInicio },
        OR: [
          { id_colegio: params.idColegio || undefined },
          { id_colegio: null },
        ],
      },
      orderBy: [{ id_colegio: 'desc' }, { id_campana: 'desc' }],
    });

    return (
      campanas.find((campana) => {
        if (campana.solo_alumnos_vigentes && !params.matriculaOrigen) {
          return false;
        }

        const aplica = String(campana.tipo_ingreso_aplica || '').trim();
        if (!aplica) return true;

        return aplica
          .split(',')
          .map((item) => item.trim())
          .includes(params.tipoIngreso);
      }) || null
    );
  }

  private async obtenerCampanaDescuentoMatriculaActiva(
    tx: Prisma.TransactionClient,
    params: {
      idTenant: number | null;
      idColegio: number | null;
      idAnio: number;
      tipoIngreso: string;
      matriculaOrigen?: any | null;
    },
  ) {
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const campanas = await tx.campanaDescuento.findMany({
      where: {
        estado: 'Activo',
        fecha_inicio: { lte: hoyInicio },
        fecha_fin: { gte: hoyInicio },
        OR: [{ id_colegio: params.idColegio || undefined }, { id_colegio: null }],
        AND: [
          {
            OR: [{ id_anio: params.idAnio }, { id_anio: null }],
          },
          {
            OR: [
              { tipo_concepto_aplica: 'MATRICULA' },
              { tipo_concepto_aplica: null },
            ],
          },
        ],
      },
      orderBy: [
        { id_colegio: 'desc' },
        { id_anio: 'desc' },
        { id_campana_descuento: 'desc' },
      ],
    });

    return (
      campanas.find((campana) => {
        if (campana.solo_alumnos_vigentes && !params.matriculaOrigen) {
          return false;
        }

        const aplica = String(campana.tipo_ingreso_aplica || '').trim();
        if (!aplica) return true;

        return aplica
          .split(',')
          .map((item) => item.trim())
          .includes(params.tipoIngreso);
      }) || null
    );
  }

  private async crearCronogramaMatriculaConMonto(
    tx: Prisma.TransactionClient,
    params: {
      idMatricula: number;
      concepto: any;
      fechaVencimiento: Date;
      idTenant: number | null;
      idColegio: number | null;
      tipoIngreso: string;
      matriculaOrigen?: any | null;
    },
  ) {
    const montoBase = Number(params.concepto.monto_base);
    const campana = await this.obtenerCampanaMatriculaActiva(tx, {
      idTenant: params.idTenant,
      idColegio: params.idColegio,
      idAnio: params.concepto.id_anio,
      tipoIngreso: params.tipoIngreso,
      matriculaOrigen: params.matriculaOrigen,
    });

    const campanaDescuento = await this.obtenerCampanaDescuentoMatriculaActiva(tx, {
      idTenant: params.idTenant,
      idColegio: params.idColegio,
      idAnio: params.concepto.id_anio,
      tipoIngreso: params.tipoIngreso,
      matriculaOrigen: params.matriculaOrigen,
    });

    let montoProgramado = montoBase;
    let descuentoAplicado = 0;

    if (campanaDescuento) {
      if (
        campanaDescuento.monto_promocional !== null &&
        campanaDescuento.monto_promocional !== undefined
      ) {
        montoProgramado = Number(campanaDescuento.monto_promocional);
      } else if (
        campanaDescuento.descuento_monto !== null &&
        campanaDescuento.descuento_monto !== undefined
      ) {
        montoProgramado = Math.max(montoBase - Number(campanaDescuento.descuento_monto), 0);
      } else if (
        campanaDescuento.descuento_porcentaje !== null &&
        campanaDescuento.descuento_porcentaje !== undefined
      ) {
        montoProgramado = Math.max(
          montoBase - (montoBase * Number(campanaDescuento.descuento_porcentaje)) / 100,
          0,
        );
      }

      descuentoAplicado = Math.max(montoBase - montoProgramado, 0);
    } else if (campana) {
      if (campana.monto_promocional !== null && campana.monto_promocional !== undefined) {
        montoProgramado = Number(campana.monto_promocional);
      } else if (campana.descuento_monto !== null && campana.descuento_monto !== undefined) {
        montoProgramado = Math.max(montoBase - Number(campana.descuento_monto), 0);
      }

      descuentoAplicado = Math.max(montoBase - montoProgramado, 0);
    }

    const creado = await tx.cronogramaPagos.create({
      data: {
        id_matricula: params.idMatricula,
        id_concepto: params.concepto.id_concepto,
        fecha_vencimiento: params.fechaVencimiento,
        estado_pago: 'Pendiente',
        monto_base_original: montoBase,
        descuento_aplicado: descuentoAplicado,
        monto_programado: montoProgramado,
        id_campana_matricula: campana?.id_campana || null,
        id_campana_descuento: campanaDescuento?.id_campana_descuento || null,
      },
    });

    await this.asegurarReferenciaPagoCronogramaAcademico(tx, creado.id_cronograma);

    return tx.cronogramaPagos.findUnique({
      where: { id_cronograma: creado.id_cronograma },
    });
  }

  // ── ASEGURAR CRONOGRAMA DE MATRÍCULA ─────────────────
  private async asegurarCronogramaMatricula(
    tx: Prisma.TransactionClient,
    matricula: {
      id_matricula: number;
      id_anio: number;
      id_colegio: number | null;
      estado_matricula?: string | null;
    },
  ) {
    const existente = await tx.cronogramaPagos.findFirst({
      where: {
        id_matricula: matricula.id_matricula,
        concepto: {
          tipo_concepto: 'MATRICULA',
        },
      },
      include: {
        concepto: true,
        pagos: true,
      },
    });

    if (existente) {
      return {
        cronograma: existente,
        creado: false,
      };
    }

    const conceptos = await tx.conceptoPago.findMany({
      where: {
        id_anio: matricula.id_anio,
        OR: matricula.id_colegio
          ? [{ id_colegio: matricula.id_colegio }, { id_colegio: null }]
          : [{ id_colegio: null }],
        tipo_concepto: 'MATRICULA',
      },
      orderBy: [{ id_colegio: 'desc' }, { id_concepto: 'asc' }],
    });

    if (!conceptos.length) {
      throw new BadRequestException(
        'No existe un concepto de tipo MATRÍCULA configurado para este colegio y año lectivo. Créalo en Configuración > Conceptos de pago.',
      );
    }

    let primerCronograma: any = null;

    for (const concepto of conceptos) {
      const yaExiste = await tx.cronogramaPagos.findFirst({
        where: {
          id_matricula: matricula.id_matricula,
          id_concepto: concepto.id_concepto,
        },
        include: {
          concepto: true,
          pagos: true,
        },
      });

      if (yaExiste) {
        primerCronograma = primerCronograma || yaExiste;
        continue;
      }

      // ── CAMBIO: vencimiento inmediato (mismo día a las 12:00) ──
      const fechaVenc = new Date();
      fechaVenc.setHours(12, 0, 0, 0);

      const creado = await tx.cronogramaPagos.create({
        data: {
          id_matricula: matricula.id_matricula,
          id_concepto: concepto.id_concepto,
          fecha_vencimiento: fechaVenc,
          estado_pago: 'Pendiente',
        },
        include: {
          concepto: true,
          pagos: true,
        },
      });

      await this.asegurarReferenciaPagoCronogramaAcademico(tx, creado.id_cronograma);

      primerCronograma = primerCronograma || creado;
    }

    if (matricula.estado_matricula === 'Reserva') {
      await tx.matricula.update({
        where: { id_matricula: matricula.id_matricula },
        data: { estado_matricula: 'Pre-matriculado' },
      });
    }

    return {
      cronograma: primerCronograma,
      creado: true,
    };
  }

  // ── FIN HELPERS ──────────────────────────────────────

  // ── NUEVOS HELPERS PARA REFERENCIA DE PAGO ─────────────

  private getPrefijoPagoColegio(colegio?: {
    codigo?: string | null;
    nombre_corto?: string | null;
    nombre?: string | null;
    id_colegio?: number | null;
  } | null) {
    const base =
      colegio?.codigo ||
      colegio?.nombre_corto ||
      colegio?.nombre ||
      (colegio?.id_colegio ? `COL${colegio.id_colegio}` : 'COL');

    const limpio = String(base)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return (limpio || 'COL').slice(0, 6);
  }

  private async asegurarReferenciaPagoCronogramaAcademico(
    tx: Prisma.TransactionClient,
    idCronograma: number,
  ) {
    const cronograma = await tx.cronogramaPagos.findUnique({
      where: { id_cronograma: idCronograma },
      include: {
        matricula: {
          include: {
            colegio: true,
            anio: true,
          },
        },
      },
    });

    if (!cronograma) {
      throw new BadRequestException('No se encontró el cronograma para generar el código de pago.');
    }

    if (cronograma.referencia_pago) {
      return cronograma.referencia_pago;
    }

    const prefijoColegio = this.getPrefijoPagoColegio(cronograma.matricula.colegio);
    const anio = this.getAnioCorteDeRegistro(cronograma.matricula.anio);
    const prefijo = `${prefijoColegio}-PG-${anio}`;

    const existentes = await tx.cronogramaPagos.count({
      where: {
        referencia_pago: {
          startsWith: `${prefijo}-`,
        },
      },
    });

    for (let intento = 1; intento <= 2000; intento += 1) {
      const referencia = `${prefijo}-${String(existentes + intento).padStart(6, '0')}`;

      try {
        await tx.cronogramaPagos.update({
          where: { id_cronograma: idCronograma },
          data: { referencia_pago: referencia },
        });

        return referencia;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException('No se pudo generar un código de pago único.');
  }

  // ── FIN NUEVOS HELPERS ───────────────────────────────

  private handlePersonaPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta?.target.join(', ')
          : String(error.meta?.target || '');

        if (target.includes('dni')) {
          throw new BadRequestException(
            'Ya existe una persona registrada con este DNI.',
          );
        }

        if (target.includes('username')) {
          throw new BadRequestException(
            'El nombre de usuario ya está registrado. Usa otro usuario para el acceso.',
          );
        }

        throw new BadRequestException('Ya existe un registro con estos datos.');
      }

      if (error.code === 'P2000') {
        throw new BadRequestException(
          'Uno de los campos ingresados excede el tamaño permitido.',
        );
      }
    }

    throw error;
  }

  private async resolveScope(params: ScopeParams): Promise<MatriculaScope> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: {
        rol: true,
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
          orderBy: { es_principal: 'desc' },
        },
      },
    });

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const colegiosPermitidos = usuario.colegios.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
    }));

    if (!colegiosPermitidos.length) {
      return {
        tipo: 'colegio',
        tenantId: null,
        colegioIds: [],
        colegios: [],
        puedeVerConsolidado: false,
      };
    }

    const puedeVerConsolidado =
      ['Admin', 'Director'].includes(params.rol) &&
      colegiosPermitidos.length > 1;

    if (params.colegioId) {
      const colegio = colegiosPermitidos.find(
        (item) => item.id_colegio === params.colegioId,
      );

      if (!colegio) {
        throw new UnauthorizedException('No tienes acceso a este colegio');
      }

      return {
        tipo: 'colegio',
        tenantId: colegio.id_tenant,
        colegioIds: [colegio.id_colegio],
        colegios: [colegio],
        puedeVerConsolidado,
      };
    }

    if (params.scope === 'all' && puedeVerConsolidado) {
      return {
        tipo: 'todos',
        tenantId: colegiosPermitidos[0].id_tenant,
        colegioIds: colegiosPermitidos.map((item) => item.id_colegio),
        colegios: colegiosPermitidos,
        puedeVerConsolidado,
      };
    }

    const principal = colegiosPermitidos[0];

    return {
      tipo: 'colegio',
      tenantId: principal.id_tenant,
      colegioIds: [principal.id_colegio],
      colegios: [principal],
      puedeVerConsolidado,
    };
  }

  private colegioWhere(scope: MatriculaScope) {
    return scope.colegioIds.length
      ? { id_colegio: { in: scope.colegioIds } }
      : { id_colegio: -1 };
  }

  private usuarioPublicoSelect() {
    return {
      id_usuario: true,
      username: true,
      estado: true,
      avatar_url: true,
      persona: {
        select: {
          id_persona: true,
          dni: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          telefono: true,
          correo: true,
        },
      },
      rol: {
        select: {
          id_rol: true,
          nombre_rol: true,
        },
      },
    };
  }

  private personaBasicaSelect() {
    return {
      id_persona: true,
      dni: true,
      nombres: true,
      apellido_paterno: true,
      apellido_materno: true,
      fecha_nacimiento: true,
      genero: true,
      direccion: true,
      pais: true,
      departamento: true,
      provincia: true,
      distrito: true,
      telefono: true,
      correo: true,
      created_at: true,
    };
  }

  private async resolveAnioActivo(scope: MatriculaScope, idAnio?: number) {
    if (!scope.colegioIds.length) return null;

    if (idAnio) {
      const anio = await this.prisma.anioLectivo.findFirst({
        where: {
          id_anio: idAnio,
          id_colegio: { in: scope.colegioIds },
        },
      });

      if (anio) return anio;
    }

    const activo = await this.prisma.anioLectivo.findFirst({
      where: {
        id_colegio: { in: scope.colegioIds },
        estado: 'Activo',
      },
      orderBy: { id_anio: 'desc' },
    });

    if (activo) return activo;

    return this.prisma.anioLectivo.findFirst({
      where: { id_colegio: { in: scope.colegioIds } },
      orderBy: { id_anio: 'desc' },
    });
  }

  // ── CONSULTAS ──────────────────────────────────────────

  async getCodigoAlumnoParaArchivo(
    params: ScopeParams & {
      idEstudiante: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        id_persona: params.idEstudiante,
        matriculas: {
          some: {
            id_colegio: {
              in: scope.colegioIds,
            },
          },
        },
      },
      select: {
        id_persona: true,
        codigo_estudiante: true,
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Alumno no encontrado o sin acceso.');
    }

    return {
      codigo_estudiante:
        estudiante.codigo_estudiante || `ALUMNO-${estudiante.id_persona}`,
    };
  }

  async actualizarFotoAlumno(
    params: ScopeParams & {
      idEstudiante: number;
      avatarUrl: string;
    },
  ) {
    const scope = await this.resolveScope(params);

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        id_persona: params.idEstudiante,
        matriculas: {
          some: {
            id_colegio: {
              in: scope.colegioIds,
            },
          },
        },
      },
      include: {
        persona: true,
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Alumno no encontrado o sin acceso.');
    }

    const actualizado = await this.prisma.estudiante.update({
      where: {
        id_persona: params.idEstudiante,
      },
      data: {
        avatar_url: params.avatarUrl,
      },
      include: {
        persona: true,
      },
    });

    return {
      message: 'Foto del alumno actualizada correctamente.',
      avatar_url: actualizado.avatar_url,
      alumno: {
        id_persona: actualizado.id_persona,
        codigo_estudiante: actualizado.codigo_estudiante,
        avatar_url: actualizado.avatar_url,
        persona: actualizado.persona,
      },
    };
  }

  async getNiveles(params?: Partial<ScopeParams>) {
    if (!params?.userId || !params?.rol) {
      return this.prisma.nivel.findMany({
        orderBy: { id_nivel: 'asc' },
      });
    }

    const scope = await this.resolveScope(params as ScopeParams);

    if (scope.tipo === 'colegio') {
      return this.prisma.nivel.findMany({
        where: {
          colegios: {
            some: {
              id_colegio: scope.colegioIds[0],
            },
          },
        },
        orderBy: { id_nivel: 'asc' },
      });
    }

    return this.prisma.nivel.findMany({
      orderBy: { id_nivel: 'asc' },
    });
  }

  async crearNivelConfig(
    params: ScopeParams & {
      nombreNivel: string;
      idColegio?: number;
    },
  ) {
    const scope = await this.resolveScope(params);
    const nombre = this.normalizeEmpty(params.nombreNivel);

    if (!nombre) {
      throw new BadRequestException('Ingresa el nombre del nivel.');
    }

    const colegioId =
      params.idColegio ||
      (scope.tipo === 'colegio' ? scope.colegioIds[0] : undefined);

    let nivel = await this.prisma.nivel.findFirst({
      where: { nombre_nivel: nombre },
    });

    if (!nivel) {
      nivel = await this.prisma.nivel.create({
        data: {
          nombre_nivel: nombre,
        },
      });
    }

    if (colegioId) {
      if (!scope.colegioIds.includes(colegioId)) {
        throw new UnauthorizedException('No tienes acceso a este colegio.');
      }

      await this.prisma.colegioNivel.upsert({
        where: {
          id_colegio_id_nivel: {
            id_colegio: colegioId,
            id_nivel: nivel.id_nivel,
          },
        },
        update: {},
        create: {
          id_colegio: colegioId,
          id_nivel: nivel.id_nivel,
        },
      });
    }

    return nivel;
  }

  async getGrados(params: ScopeParams & { nivelId: number }) {
  const scope = await this.resolveScope(params);
  if (!params.nivelId) return [];

  if (scope.tipo === 'colegio' && scope.colegioIds[0]) {
    return this.prisma.grado.findMany({
      where: {
        id_nivel: params.nivelId,
        colegios: { some: { id_colegio: scope.colegioIds[0], estado: 'Activo' } },
      },
      orderBy: { id_grado: 'asc' },
    });
  }

  return this.prisma.grado.findMany({
    where: { id_nivel: params.nivelId },
    orderBy: { id_grado: 'asc' },
  });
}

async crearGradoConfig(params: ScopeParams & { nombreGrado: string; idNivel: number; idColegio?: number }) {
  const scope = await this.resolveScope(params);
  const nombre = this.normalizeEmpty(params.nombreGrado);
  if (!nombre) throw new BadRequestException('Ingresa el nombre del grado.');

  const colegioId = params.idColegio || params.colegioId || (scope.tipo === 'colegio' ? scope.colegioIds[0] : undefined);
  if (!colegioId || !scope.colegioIds.includes(colegioId)) {
    throw new BadRequestException('Selecciona una institución válida para el grado.');
  }

  const nivel = await this.prisma.nivel.findUnique({ where: { id_nivel: params.idNivel } });
  if (!nivel) throw new NotFoundException('Nivel no encontrado.');

  let grado = await this.prisma.grado.findFirst({ where: { id_nivel: params.idNivel, nombre_grado: nombre } });
  if (!grado) {
    grado = await this.prisma.grado.create({ data: { id_nivel: params.idNivel, nombre_grado: nombre } });
  }

  await this.prisma.colegioNivel.upsert({
    where: { id_colegio_id_nivel: { id_colegio: colegioId, id_nivel: params.idNivel } },
    update: {},
    create: { id_colegio: colegioId, id_nivel: params.idNivel },
  });

  await this.prisma.colegioGrado.upsert({
    where: { id_colegio_id_grado: { id_colegio: colegioId, id_grado: grado.id_grado } },
    update: { estado: 'Activo' },
    create: { id_colegio: colegioId, id_grado: grado.id_grado, estado: 'Activo' },
  });

  return grado;
}

async eliminarGradoConfig(params: ScopeParams & { idGrado: number }) {
  const scope = await this.resolveScope(params);
  const colegioId = params.colegioId || (scope.tipo === 'colegio' ? scope.colegioIds[0] : undefined);

  if (!colegioId || !scope.colegioIds.includes(colegioId)) {
    throw new BadRequestException('Selecciona una institución válida.');
  }

  const secciones = await this.prisma.seccion.count({ where: { id_colegio: colegioId, id_grado: params.idGrado } });
  if (secciones > 0) {
    throw new BadRequestException('No se puede retirar un grado que tiene secciones en esta institución.');
  }

  await this.prisma.colegioGrado.deleteMany({ where: { id_colegio: colegioId, id_grado: params.idGrado } });

  const otrosUsos = await this.prisma.colegioGrado.count({ where: { id_grado: params.idGrado } });
  const seccionesGlobales = await this.prisma.seccion.count({ where: { id_grado: params.idGrado } });

  if (otrosUsos === 0 && seccionesGlobales === 0) {
    await this.prisma.grado.delete({ where: { id_grado: params.idGrado } });
  }

  return { message: 'Grado retirado de la institución correctamente.' };
}

async eliminarNivelConfig(
    params: ScopeParams & {
      idNivel: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const colegioId =
      params.colegioId ||
      (scope.tipo === 'colegio' ? scope.colegioIds[0] : undefined);

    if (!colegioId || !scope.colegioIds.includes(colegioId)) {
      throw new BadRequestException(
        'Selecciona una institución para retirar el nivel.',
      );
    }

    const nivel = await this.prisma.nivel.findUnique({
      where: { id_nivel: params.idNivel },
    });

    if (!nivel) throw new NotFoundException('Nivel no encontrado.');

    const secciones = await this.prisma.seccion.count({
      where: {
        id_colegio: colegioId,
        grado: { id_nivel: params.idNivel },
      },
    });

    if (secciones > 0) {
      throw new BadRequestException(
        'No se puede retirar un nivel que tiene secciones en esta institución.',
      );
    }

    const gradosDelNivel = await this.prisma.grado.findMany({
      where: { id_nivel: params.idNivel },
      select: { id_grado: true },
    });

    const gradoIds = gradosDelNivel.map((grado) => grado.id_grado);

    if (gradoIds.length > 0) {
      await this.prisma.colegioGrado.deleteMany({
        where: {
          id_colegio: colegioId,
          id_grado: { in: gradoIds },
        },
      });
    }

    await this.prisma.colegioNivel.deleteMany({
      where: {
        id_colegio: colegioId,
        id_nivel: params.idNivel,
      },
    });

    const otrosColegiosNivel = await this.prisma.colegioNivel.count({
      where: { id_nivel: params.idNivel },
    });

    const otrosColegiosGrados = gradoIds.length
      ? await this.prisma.colegioGrado.count({
          where: { id_grado: { in: gradoIds } },
        })
      : 0;

    const seccionesGlobales = await this.prisma.seccion.count({
      where: { grado: { id_nivel: params.idNivel } },
    });

    if (otrosColegiosNivel === 0 && otrosColegiosGrados === 0 && seccionesGlobales === 0) {
      if (gradoIds.length > 0) {
        await this.prisma.grado.deleteMany({
          where: { id_grado: { in: gradoIds } },
        });
      }

      await this.prisma.nivel.delete({
        where: { id_nivel: params.idNivel },
      });
    }

    return { message: 'Nivel retirado de la institución correctamente.' };
  }

  async getSecciones(
    params: ScopeParams & { gradoId?: number; anioId?: number },
  ) {
    const scope = await this.resolveScope(params);
    const where: any = {
      ...this.colegioWhere(scope),
    };

    if (params.gradoId) where.id_grado = params.gradoId;

    const secciones = await this.prisma.seccion.findMany({
      where,
      include: {
        colegio: true,
        aula: true,
        grado: { include: { nivel: true } },
        staff: {
          where: { es_tutor: true },
          include: {
            persona: {
              select: {
                id_persona: true,
                dni: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
          },
        },
        matriculas: params.anioId
          ? {
              where: {
                id_anio: params.anioId,
                estado_matricula: {
                  in: ['Activo', 'Pre-matriculado', 'Reserva'],
                },
                ...this.colegioWhere(scope),
              },
            }
          : false,
      },
      orderBy: [
        { colegio: { nombre: 'asc' } },
        { grado: { id_nivel: 'asc' } },
        { id_grado: 'asc' },
        { letra: 'asc' },
      ],
    });

    return secciones.map((sec) => ({
      id_seccion: sec.id_seccion,
      id_tenant: sec.id_tenant,
      id_colegio: sec.id_colegio,
      colegio: sec.colegio,
      letra: sec.letra,
      grado: sec.grado,
      aula: sec.aula,
      matriculas: sec.matriculas || [],
      capacidad: sec.aula.capacidad,
      matriculados: Array.isArray(sec.matriculas) ? sec.matriculas.length : 0,
      disponibles:
        sec.aula.capacidad -
        (Array.isArray(sec.matriculas) ? sec.matriculas.length : 0),
      Label:
  scope.tipo === 'todos'
    ? `${sec.grado.nombre_grado} "${sec.letra}" · ${sec.grado.nivel.nombre_nivel} · ${sec.colegio?.nombre || 'Sin institución'}`
    : `${sec.grado.nombre_grado} "${sec.letra}" · ${sec.grado.nivel.nombre_nivel}`,
colegio_nombre: sec.colegio?.nombre || null,
      tutor: sec.staff?.[0]?.persona
        ? {
            id_docente: sec.staff[0].persona.id_persona,
            dni: sec.staff[0].persona.dni,
            nombre: `${sec.staff[0].persona.nombres || ''} ${sec.staff[0].persona.apellido_paterno || ''} ${sec.staff[0].persona.apellido_materno || ''}`
              .replace(/\s+/g, ' ')
              .trim(),
          }
        : null,
    }));
  }

  
  async listarDocentesGestion(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const docentes = await this.prisma.docente.findMany({
      include: {
        persona: true,
        especialidades: {
          include: {
            area: true,
          },
        },
        _count: {
          select: {
            asignaciones: true,
          },
        },
      },
      orderBy: {
        id_persona: 'asc',
      },
    });

    return docentes.map((docente) => ({
      id_persona: docente.id_persona,
      persona: docente.persona,
      fecha_ingreso: docente.fecha_ingreso,
      especialidades: docente.especialidades || [],
      _count: docente._count,
      nombre: `${docente.persona.nombres || ''} ${docente.persona.apellido_paterno || ''} ${docente.persona.apellido_materno || ''}`
        .replace(/\s+/g, ' ')
        .trim(),
      colegios_asignados: [],
      scope_colegios: scope.colegioIds,
    }));
  }

  async asignarTutorSeccion(
    params: ScopeParams & {
      idSeccion: number;
      idDocente?: number | null;
    },
  ) {
    const scope = await this.resolveScope(params);

    const seccion = await this.prisma.seccion.findFirst({
      where: {
        id_seccion: params.idSeccion,
        id_colegio: { in: scope.colegioIds },
      },
      include: {
        colegio: true,
        grado: {
          include: {
            nivel: true,
          },
        },
      },
    });

    if (!seccion) {
      throw new NotFoundException('Sección no encontrada o sin acceso.');
    }

    if (!params.idDocente) {
      await this.prisma.staff.updateMany({
        where: {
          id_seccion: seccion.id_seccion,
          es_tutor: true,
        },
        data: {
          es_tutor: false,
          id_seccion: null,
        },
      });

      return {
        message: 'Tutor retirado correctamente.',
        tutor: null,
      };
    }

    const docente = await this.prisma.docente.findUnique({
      where: { id_persona: params.idDocente },
      include: {
        persona: true,
      },
    });

    if (!docente) {
      throw new NotFoundException('Docente no encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staff.updateMany({
        where: {
          id_seccion: seccion.id_seccion,
          es_tutor: true,
          id_persona: { not: docente.id_persona },
        },
        data: {
          es_tutor: false,
          id_seccion: null,
        },
      });

      await tx.staff.upsert({
        where: {
          id_persona: docente.id_persona,
        },
        update: {
          id_tenant: seccion.id_tenant || scope.tenantId,
          id_colegio: seccion.id_colegio,
          id_seccion: seccion.id_seccion,
          es_tutor: true,
          permite_citas: true,
        },
        create: {
          id_persona: docente.id_persona,
          id_tenant: seccion.id_tenant || scope.tenantId,
          id_colegio: seccion.id_colegio,
          id_seccion: seccion.id_seccion,
          cargo: 'Tutor',
          area: 'Tutoría',
          es_tutor: true,
          permite_citas: true,
        },
      });
    });

    const nombreTutor = `${docente.persona.nombres || ''} ${docente.persona.apellido_paterno || ''} ${docente.persona.apellido_materno || ''}`
      .replace(/\s+/g, ' ')
      .trim();

    return {
      message: `Tutor asignado correctamente a ${seccion.grado?.nombre_grado || 'grado'} "${seccion.letra}".`,
      tutor: {
        id_docente: docente.id_persona,
        dni: docente.persona.dni,
        nombre: nombreTutor,
      },
    };
  }

async obtenerPreparacionAnioLectivo(
  params: ScopeParams & { anioId: number; perfilOperativo?: string },
) {
    const scope = await this.resolveScope(params);

    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: params.anioId,
        id_colegio: { in: scope.colegioIds },
      },
      include: {
        colegio: true,
      },
    });

    if (!anio) {
      throw new NotFoundException('Año lectivo no encontrado o sin acceso.');
    }

    if (!anio.id_colegio) {
      throw new BadRequestException('El año lectivo no tiene una institución asociada.');
    }

    const colegioId = anio.id_colegio;
    const idAnio = anio.id_anio;

    const [
      periodos,
      unidades,
      unidadesAbiertas,
      niveles,
      grados,
      secciones,
      areas,
      cursos,
      asignaciones,
      evaluaciones,
      asignacionesConEvaluacion,
      matriculas,
      conceptos,
      conceptosMatricula,
      conceptosPension,
      tiposEvaluacion,
      escalas,
      plantillas,
    ] = await Promise.all([
      this.prisma.bimestre.count({
        where: { id_anio: idAnio },
      }),
      this.prisma.unidad.count({
        where: { bimestre: { id_anio: idAnio } },
      }),
      this.prisma.unidad.count({
        where: {
          estado_abierto: true,
          bimestre: { id_anio: idAnio },
        },
      }),
      this.prisma.colegioNivel.count({
        where: { id_colegio: colegioId },
      }),
      this.prisma.colegioGrado.count({
        where: {
          id_colegio: colegioId,
          estado: 'Activo',
        },
      }),
      this.prisma.seccion.count({
        where: { id_colegio: colegioId },
      }),
      this.prisma.areaCurricular.count({
        where: { id_colegio: colegioId },
      }),
      this.prisma.curso.count({
        where: { id_colegio: colegioId },
      }),
      this.prisma.asignacionDocente.count({
        where: {
          id_anio: idAnio,
          id_colegio: colegioId,
        },
      }),
      this.prisma.evaluacionDetalle.count({
        where: {
          asignacion: {
            id_anio: idAnio,
            id_colegio: colegioId,
          },
          unidad: {
            bimestre: {
              id_anio: idAnio,
            },
          },
        },
      }),
      this.prisma.evaluacionDetalle.groupBy({
        by: ['id_asignacion'],
        where: {
          asignacion: {
            id_anio: idAnio,
            id_colegio: colegioId,
          },
          unidad: {
            bimestre: {
              id_anio: idAnio,
            },
          },
        },
      }),
      this.prisma.matricula.count({
        where: {
          id_anio: idAnio,
          id_colegio: colegioId,
          estado_matricula: {
            notIn: this.estadosMatriculaFinales,
          },
        },
      }),
      this.prisma.conceptoPago.count({
        where: {
          id_anio: idAnio,
          id_colegio: colegioId,
        },
      }),
      this.prisma.conceptoPago.count({
        where: {
          id_anio: idAnio,
          id_colegio: colegioId,
          OR: [
            { tipo_concepto: 'MATRICULA' },
            { nombre_concepto: { contains: 'Matrícula' } },
            { nombre_concepto: { contains: 'Matricula' } },
          ],
        },
      }),
      this.prisma.conceptoPago.count({
        where: {
          id_anio: idAnio,
          id_colegio: colegioId,
          OR: [
            { tipo_concepto: 'PENSION' },
            { es_pension: true },
          ],
        },
      }),
      this.prisma.tipoEvaluacion.count({
        where: { id_colegio: colegioId },
      }),
      this.prisma.escalaCalificacion.count({
        where: {
          OR: [
            { id_colegio: colegioId },
            {
              id_colegio: null,
              id_tenant: anio.id_tenant,
            },
          ],
        },
      }),
      this.prisma.plantillaEvaluacion.count({
        where: { id_colegio: colegioId },
      }),
    ]);

    const normalizar = (value?: string | null) =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const estadoAnio = normalizar(anio.estado);
    const estaEnCurso = estadoAnio.includes('curso') || estadoAnio === 'activo';
    const estaEnMatricula = estadoAnio.includes('matricula');

    const asignacionesCubiertas = asignacionesConEvaluacion.length;

    const item = (
      grupo: string,
      clave: string,
      titulo: string,
      estado: 'listo' | 'parcial' | 'pendiente' | 'bloqueo' | 'no_aplica',
      mensaje: string,
      tab?: string,
      actual?: number,
      total?: number,
    ) => ({
      grupo,
      clave,
      titulo,
      estado,
      mensaje,
      tab,
      actual,
      total,
      obligatorio: true,
      aplica: true,
    });

    type ItemPreparacion = ReturnType<typeof item>;

    const perfilesOperativos = {
      colegio_completo: {
        key: 'colegio_completo',
        nombre: 'Colegio completo',
        descripcion: 'Valida matrícula, estructura académica, notas y finanzas.',
        obligatorios: [
          'anio',
          'periodos',
          'unidad_activa',
          'niveles',
          'grados',
          'secciones',
          'cursos',
          'asignaciones',
          'escala',
          'tipos',
          'plantillas',
          'plantillas_aplicadas',
          'matriculas',
          'concepto_matricula',
          'pensiones',
        ],
        excluidos: [],
      },
      academia: {
        key: 'academia',
        nombre: 'Academia / instituto',
        descripcion: 'Prioriza estructura, cursos, docentes y evaluación. Finanzas no bloquea la apertura académica.',
        obligatorios: [
          'anio',
          'periodos',
          'unidad_activa',
          'niveles',
          'grados',
          'secciones',
          'cursos',
          'asignaciones',
          'escala',
          'tipos',
          'plantillas',
          'plantillas_aplicadas',
        ],
        excluidos: ['concepto_matricula', 'pensiones'],
      },
      solo_matricula: {
        key: 'solo_matricula',
        nombre: 'Solo matrícula',
        descripcion: 'Valida lo mínimo para registrar alumnos y cobrar matrícula.',
        obligatorios: [
          'anio',
          'niveles',
          'grados',
          'secciones',
          'concepto_matricula',
        ],
        excluidos: [
          'periodos',
          'unidad_activa',
          'cursos',
          'asignaciones',
          'escala',
          'tipos',
          'plantillas',
          'plantillas_aplicadas',
          'pensiones',
        ],
      },
      solo_tesoreria: {
        key: 'solo_tesoreria',
        nombre: 'Solo tesorería',
        descripcion: 'Valida año lectivo y conceptos de cobro. Lo académico no bloquea.',
        obligatorios: ['anio', 'concepto_matricula', 'pensiones'],
        excluidos: [
          'periodos',
          'unidad_activa',
          'niveles',
          'grados',
          'secciones',
          'cursos',
          'asignaciones',
          'escala',
          'tipos',
          'plantillas',
          'plantillas_aplicadas',
          'matriculas',
        ],
      },
      sin_notas: {
        key: 'sin_notas',
        nombre: 'Sin notas',
        descripcion: 'Valida estructura, cursos y asignaciones. Evaluación y plantillas no bloquean.',
        obligatorios: [
          'anio',
          'periodos',
          'niveles',
          'grados',
          'secciones',
          'cursos',
          'asignaciones',
          'matriculas',
          'concepto_matricula',
          'pensiones',
        ],
        excluidos: ['unidad_activa', 'escala', 'tipos', 'plantillas', 'plantillas_aplicadas'],
      },
      sin_pensiones: {
        key: 'sin_pensiones',
        nombre: 'Sin pensiones',
        descripcion: 'Valida todo lo académico y matrícula, pero las pensiones no bloquean.',
        obligatorios: [
          'anio',
          'periodos',
          'unidad_activa',
          'niveles',
          'grados',
          'secciones',
          'cursos',
          'asignaciones',
          'escala',
          'tipos',
          'plantillas',
          'plantillas_aplicadas',
          'matriculas',
          'concepto_matricula',
        ],
        excluidos: ['pensiones'],
      },
    } as const;

    const perfilKey = String(params.perfilOperativo || 'colegio_completo').trim();
    const perfilOperativo =
      perfilesOperativos[perfilKey as keyof typeof perfilesOperativos] ||
      perfilesOperativos.colegio_completo;

    const baseItems = [
      item(
        'tiempo',
        'anio',
        'Año lectivo creado',
        anio.fecha_inicio && anio.fecha_fin ? 'listo' : 'bloqueo',
        anio.fecha_inicio && anio.fecha_fin
          ? `${anio.nombre_anio} tiene fechas de inicio y fin.`
          : 'Completa fecha de inicio y fecha de fin del año lectivo.',
        'anios',
      ),
      item(
        'tiempo',
        'periodos',
        'Periodos y unidades',
        periodos > 0 && unidades > 0 ? 'listo' : periodos > 0 ? 'parcial' : 'bloqueo',
        periodos > 0 && unidades > 0
          ? `${periodos} periodo(s) y ${unidades} unidad(es) configuradas.`
          : periodos > 0
            ? `${periodos} periodo(s) creados, pero faltan unidades.`
            : 'Genera la estructura académica del año: bimestres, trimestres o periodos.',
        'periodos',
        unidades,
        Math.max(periodos, 1),
      ),
      item(
        'tiempo',
        'unidad_activa',
        'Unidad disponible para notas',
        unidadesAbiertas > 0 ? 'listo' : estaEnCurso ? 'bloqueo' : 'pendiente',
        unidadesAbiertas > 0
          ? `${unidadesAbiertas} unidad(es) abierta(s) para registro de notas.`
          : estaEnCurso
            ? 'El año está en curso, pero no hay unidad abierta para docentes.'
            : 'Abre una unidad cuando Dirección habilite el registro de notas.',
        'periodos',
        unidadesAbiertas,
        1,
      ),
      item(
        'estructura',
        'niveles',
        'Niveles educativos',
        niveles > 0 ? 'listo' : 'bloqueo',
        niveles > 0
          ? `${niveles} nivel(es) vinculados a la institución.`
          : 'Agrega Inicial, Primaria, Secundaria u otra estructura según corresponda.',
        'niveles',
        niveles,
      ),
      item(
        'estructura',
        'grados',
        'Grados configurados',
        grados > 0 ? 'listo' : niveles > 0 ? 'pendiente' : 'bloqueo',
        grados > 0
          ? `${grados} grado(s) activos para esta institución.`
          : 'Agrega los grados dentro de cada nivel educativo.',
        'niveles',
        grados,
      ),
      item(
        'estructura',
        'secciones',
        'Secciones / aulas',
        secciones > 0 ? 'listo' : grados > 0 ? 'pendiente' : 'bloqueo',
        secciones > 0
          ? `${secciones} sección(es) disponibles para matrícula y asignaciones.`
          : 'Crea secciones por grado para poder matricular alumnos y asignar docentes.',
        'secciones',
        secciones,
      ),
      item(
        'estructura',
        'cursos',
        'Cursos y áreas',
        areas > 0 && cursos > 0 ? 'listo' : areas > 0 ? 'parcial' : 'pendiente',
        areas > 0 && cursos > 0
          ? `${areas} área(s) y ${cursos} curso(s) configurados.`
          : areas > 0
            ? 'Hay áreas creadas, pero faltan cursos.'
            : 'Agrega áreas curriculares y cursos de la institución.',
        'cursos',
        cursos,
      ),
      item(
        'estructura',
        'asignaciones',
        'Asignaciones docentes',
        asignaciones > 0 ? 'listo' : cursos > 0 && secciones > 0 ? 'pendiente' : 'bloqueo',
        asignaciones > 0
          ? `${asignaciones} asignación(es) docente-curso-sección registradas.`
          : 'Relaciona docente, curso, sección y año lectivo para habilitar notas y asistencia.',
        'asignaciones',
        asignaciones,
      ),
      item(
        'evaluacion',
        'escala',
        'Escala de calificación',
        escalas > 0 ? 'listo' : 'pendiente',
        escalas > 0
          ? `${escalas} escala(s) disponible(s).`
          : 'Configura nota mínima, nota aprobatoria y nota máxima.',
        'escala',
        escalas,
      ),
      item(
        'evaluacion',
        'tipos',
        'Tipos de evaluación',
        tiposEvaluacion > 0 ? 'listo' : 'pendiente',
        tiposEvaluacion > 0
          ? `${tiposEvaluacion} tipo(s) de evaluación disponibles.`
          : 'Agrega tipos como Cuaderno, Participación, Práctica o Examen.',
        'tipos',
        tiposEvaluacion,
      ),
      item(
        'evaluacion',
        'plantillas',
        'Plantillas de evaluación',
        plantillas > 0 ? 'listo' : 'pendiente',
        plantillas > 0
          ? `${plantillas} plantilla(s) de evaluación creadas.`
          : 'Crea una plantilla inicial antes de que los docentes registren notas.',
        'plantillas',
        plantillas,
      ),
      item(
        'evaluacion',
        'plantillas_aplicadas',
        'Plantillas aplicadas a cursos',
        asignaciones === 0
          ? 'no_aplica'
          : asignacionesCubiertas === asignaciones
            ? 'listo'
            : asignacionesCubiertas > 0
              ? 'parcial'
              : 'pendiente',
        asignaciones === 0
          ? 'Primero crea asignaciones docentes para medir cobertura.'
          : asignacionesCubiertas === asignaciones
            ? `Todas las asignaciones tienen evaluaciones cargadas (${asignacionesCubiertas}/${asignaciones}).`
            : `${asignacionesCubiertas}/${asignaciones} asignación(es) tienen evaluaciones. Faltan ${asignaciones - asignacionesCubiertas}.`,
        'plantillas',
        asignacionesCubiertas,
        asignaciones,
      ),
      item(
        'matricula',
        'matriculas',
        'Matrículas del año',
        matriculas > 0 ? 'listo' : estaEnMatricula || estaEnCurso ? 'pendiente' : 'no_aplica',
        matriculas > 0
          ? `${matriculas} matrícula(s) activas o en proceso para este año.`
          : estaEnMatricula || estaEnCurso
            ? 'Aún no hay alumnos matriculados para este año.'
            : 'Se revisará cuando el año entre a matrícula o curso.',
        'anios',
        matriculas,
      ),
      item(
        'finanzas',
        'concepto_matricula',
        'Concepto de matrícula',
        conceptosMatricula > 0 ? 'listo' : 'pendiente',
        conceptosMatricula > 0
          ? `${conceptosMatricula} concepto(s) de matrícula configurados.`
          : 'Agrega el concepto de matrícula del año lectivo.',
        'pagos',
        conceptosMatricula,
      ),
      item(
        'finanzas',
        'pensiones',
        'Conceptos de pensión',
        conceptosPension > 0 ? 'listo' : conceptos > 0 ? 'parcial' : 'pendiente',
        conceptosPension > 0
          ? `${conceptosPension} concepto(s) de pensión configurados.`
          : conceptos > 0
            ? 'Hay conceptos de pago, pero no hay pensiones identificadas.'
            : 'Agrega pensiones u otros conceptos de pago si la institución usa tesorería.',
        'pagos',
        conceptosPension,
      ),
    ];

    const items = baseItems.map((entry: ItemPreparacion) => {
      const esObligatorio = perfilOperativo.obligatorios.includes(entry.clave as never);
      const estaExcluido = perfilOperativo.excluidos.includes(entry.clave as never);

      if (estaExcluido) {
        return {
          ...entry,
          estado: 'no_aplica' as const,
          obligatorio: false,
          aplica: false,
          mensaje: 'No requerido para el perfil operativo seleccionado.',
        };
      }

      if (!esObligatorio) {
        return {
          ...entry,
          obligatorio: false,
          aplica: true,
          estado:
            entry.estado === 'listo' || entry.estado === 'parcial'
              ? entry.estado
              : ('no_aplica' as const),
          mensaje:
            entry.estado === 'listo' || entry.estado === 'parcial'
              ? `${entry.mensaje} Este punto es opcional para el perfil seleccionado.`
              : 'Opcional para el perfil operativo seleccionado.',
        };
      }

      return {
        ...entry,
        obligatorio: true,
        aplica: true,
      };
    });

    const gruposConfig = [
      { key: 'tiempo', titulo: 'Tiempo académico' },
      { key: 'estructura', titulo: 'Estructura académica' },
      { key: 'evaluacion', titulo: 'Evaluación y notas' },
      { key: 'matricula', titulo: 'Matrícula' },
      { key: 'finanzas', titulo: 'Finanzas' },
    ];

    const grupos = gruposConfig.map((grupo) => ({
      ...grupo,
      items: items.filter((entry) => entry.grupo === grupo.key),
    }));

    const evaluables = items.filter(
      (entry) => entry.aplica !== false && entry.obligatorio !== false && entry.estado !== 'no_aplica',
    );
    const puntos = evaluables.reduce((total, entry) => {
      if (entry.estado === 'listo') return total + 1;
      if (entry.estado === 'parcial') return total + 0.5;
      return total;
    }, 0);

    const porcentaje = evaluables.length
      ? Math.round((puntos / evaluables.length) * 100)
      : 0;

    const bloqueos = items.filter((entry) => entry.estado === 'bloqueo').length;
    const pendientes = items.filter((entry) => entry.estado === 'pendiente').length;
    const parciales = items.filter((entry) => entry.estado === 'parcial').length;
    const listos = items.filter((entry) => entry.estado === 'listo').length;

    return {
      perfil_operativo: perfilOperativo,
      anio: {
        id_anio: anio.id_anio,
        nombre_anio: anio.nombre_anio,
        estado: anio.estado,
        fecha_inicio: anio.fecha_inicio,
        fecha_fin: anio.fecha_fin,
      },
      colegio: anio.colegio
        ? {
            id_colegio: anio.colegio.id_colegio,
            nombre: anio.colegio.nombre,
            nombre_corto: anio.colegio.nombre_corto,
          }
        : null,
      resumen: {
        porcentaje,
        estado_general:
          bloqueos > 0
            ? 'bloqueado'
            : porcentaje >= 90
              ? 'listo'
              : porcentaje >= 50
                ? 'parcial'
                : 'incompleto',
        total: evaluables.length,
        listos,
        parciales,
        pendientes,
        bloqueos,
      },
      metricas: {
        periodos,
        unidades,
        unidades_abiertas: unidadesAbiertas,
        niveles,
        grados,
        secciones,
        areas,
        cursos,
        asignaciones,
        evaluaciones,
        asignaciones_cubiertas: asignacionesCubiertas,
        matriculas,
        conceptos,
        conceptos_matricula: conceptosMatricula,
        conceptos_pension: conceptosPension,
        tipos_evaluacion: tiposEvaluacion,
        escalas,
        plantillas,
      },
      grupos,
    };
  }

  async crearSeccionConfig(
    params: ScopeParams & {
      letra: string;
      idGrado: number;
      idAula?: number;
      idColegio?: number;
      capacidad?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const colegioId =
      params.idColegio ||
      (scope.tipo === 'colegio' ? scope.colegioIds[0] : undefined);

    if (!colegioId || !scope.colegioIds.includes(colegioId)) {
      throw new BadRequestException('Selecciona un colegio válido para la sección.');
    }

    const grado = await this.prisma.grado.findUnique({
      where: { id_grado: params.idGrado },
      include: { nivel: true },
    });

    if (!grado) throw new NotFoundException('Grado no encontrado');

    // Asegurar que el grado esté vinculado a la institución
    await this.prisma.colegioGrado.upsert({
      where: { id_colegio_id_grado: { id_colegio: colegioId, id_grado: params.idGrado } },
      update: { estado: 'Activo' },
      create: { id_colegio: colegioId, id_grado: params.idGrado, estado: 'Activo' },
    });

    const letra = String(params.letra || '').trim().toUpperCase();

    if (!letra) {
      throw new BadRequestException('Ingresa la letra de la sección.');
    }

    const colegio = scope.colegios.find((item) => item.id_colegio === colegioId);

    const existente = await this.prisma.seccion.findFirst({
      where: {
        id_colegio: colegioId,
        id_grado: params.idGrado,
        letra,
      },
    });

    if (existente) {
      throw new BadRequestException(
        `La sección ${grado.nombre_grado} "${letra}" ya existe para este colegio.`,
      );
    }

    let aulaId = params.idAula;

    if (!aulaId) {
      const nombreAula = `${grado.nombre_grado} ${letra}`;

      const aula = await this.prisma.aula.create({
        data: {
          id_tenant: colegio?.id_tenant || scope.tenantId,
          id_colegio: colegioId,
          nombre_aula: nombreAula,
          capacidad: params.capacidad || 30,
        },
      });

      aulaId = aula.id_aula;
    }

    return this.prisma.seccion.create({
      data: {
        letra,
        id_grado: params.idGrado,
        id_aula: aulaId,
        id_tenant: colegio?.id_tenant || scope.tenantId,
        id_colegio: colegioId,
      },
      include: {
        colegio: true,
        aula: true,
        grado: {
          include: {
            nivel: true,
          },
        },
      },
    });
  }

  async buscarAlumno(params: ScopeParams & { dni: string }) {
    const scope = await this.resolveScope(params);

    const persona = await this.prisma.persona.findFirst({
      where: {
        dni: params.dni,
        estudiantes: { some: {} },
      },
      include: {
        estudiantes: {
          include: {
            apoderados: {
              include: {
                apoderado: {
                  include: {
                    persona: true,
                  },
                },
              },
            },
            matriculas: {
              where: {
                ...this.colegioWhere(scope),
              },
              include: {
                colegio: true,
                anio: true,
                seccion: {
                  include: {
                    colegio: true,
                    grado: { include: { nivel: true } },
                  },
                },
              },
              orderBy: { id_matricula: 'desc' },
            },
          },
        },
      },
    });

    if (!persona) {
      throw new NotFoundException(
        'No se encontró un alumno registrado con ese DNI.',
      );
    }

    return persona;
  }

  async buscarMatriculas(
    params: ScopeParams & {
      q?: string;
      desde?: string;
      hasta?: string;
      registradoPor?: string;
      estado?: string;
      estadoRevision?: string;
      tipoIngreso?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const page = Math.max(Number(params.page || 1), 1);
    const limit = Math.min(Math.max(Number(params.limit || 10), 5), 50);
    const skip = (page - 1) * limit;

    const where: any = {
      ...this.colegioWhere(scope),
    };

    if (params.estado && params.estado !== 'Todos') {
      where.estado_matricula = params.estado;
    }

    if (params.estadoRevision && params.estadoRevision !== 'Todos') {
      where.estado_revision = params.estadoRevision;
    }

    if (params.tipoIngreso && params.tipoIngreso !== 'Todos') {
      where.tipo_ingreso = params.tipoIngreso;
    }

    if (params.desde || params.hasta) {
      where.fecha_matricula = {};

      if (params.desde) {
        where.fecha_matricula.gte = new Date(
          `${params.desde}T00:00:00.000-05:00`,
        );
      }

      if (params.hasta) {
        where.fecha_matricula.lte = new Date(
          `${params.hasta}T23:59:59.999-05:00`,
        );
      }
    }

    const q = params.q?.trim();

    if (q) {
      const numericId = Number(q);

      where.OR = [
        Number.isFinite(numericId) ? { id_matricula: numericId } : undefined,
        { codigo_matricula: { contains: q } },
        {
          estudiante: {
            persona: {
              OR: [
                { dni: { contains: q } },
                { nombres: { contains: q } },
                { apellido_paterno: { contains: q } },
                { apellido_materno: { contains: q } },
              ],
            },
          },
        },
        {
          estudiante: {
            apoderados: {
              some: {
                apoderado: {
                  persona: {
                    OR: [
                      { dni: { contains: q } },
                      { nombres: { contains: q } },
                      { apellido_paterno: { contains: q } },
                      { apellido_materno: { contains: q } },
                      { telefono: { contains: q } },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          estudiante: {
            codigos_colegio: {
              some: {
                codigo: { contains: q },
              },
            },
          },
        },
      ].filter(Boolean);
    }

    if (params.registradoPor?.trim()) {
      const filtro = params.registradoPor.trim();

      where.registrado_por = {
        OR: [
          { username: { contains: filtro } },
          {
            persona: {
              OR: [
                { nombres: { contains: filtro } },
                { apellido_paterno: { contains: filtro } },
                { apellido_materno: { contains: filtro } },
              ],
            },
          },
        ],
      };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.matricula.count({ where }),
      this.prisma.matricula.findMany({
        where,
        include: {
          colegio: true,
          anio: true,
          registrado_por: {
            select: this.usuarioPublicoSelect(),
          },
          revisado_por: {
            select: this.usuarioPublicoSelect(),
          },
          estudiante: {
            include: {
              persona: {
                select: this.personaBasicaSelect(),
              },
              codigos_colegio: true,
              apoderados: {
                include: {
                  apoderado: {
                    include: {
                      persona: {
                        select: this.personaBasicaSelect(),
                      },
                    },
                  },
                },
              },
            },
          },
          seccion: {
            include: {
              grado: { include: { nivel: true } },
            },
          },
        },
        orderBy: { fecha_matricula: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async vincularApoderadoAlumno(params: {
    idEstudiante: number;
    idApoderado: number;
    parentesco?: string;
  }) {
    const parentesco = params.parentesco?.trim() || 'Apoderado';

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: params.idEstudiante },
      include: { persona: true },
    });

    if (!estudiante) {
      throw new NotFoundException('No se encontró el alumno seleccionado.');
    }

    const apoderado = await this.prisma.apoderado.findUnique({
      where: { id_persona: params.idApoderado },
      include: { persona: true },
    });

    if (!apoderado) {
      throw new NotFoundException('No se encontró el apoderado seleccionado.');
    }

    await this.prisma.apoderadoEstudiante.upsert({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: params.idApoderado,
          id_estudiante: params.idEstudiante,
        },
      },
      update: {
        parentesco,
      },
      create: {
        id_apoderado: params.idApoderado,
        id_estudiante: params.idEstudiante,
        parentesco,
      },
    });

    return {
      message: 'Apoderado vinculado correctamente.',
      id_estudiante: params.idEstudiante,
      id_apoderado: params.idApoderado,
      parentesco,
    };
  }

  async desvincularApoderadoAlumno(params: {
    idEstudiante: number;
    idApoderado: number;
  }) {
    await this.prisma.apoderadoEstudiante.delete({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: params.idApoderado,
          id_estudiante: params.idEstudiante,
        },
      },
    });

    return {
      message: 'Apoderado desvinculado correctamente.',
    };
  }

  async buscarApoderado(dni: string) {
    const persona = await this.prisma.persona.findFirst({
      where: {
        dni,
        apoderados: { some: {} },
      },
      include: { apoderados: true },
    });

    if (!persona || !persona.apoderados.length) {
      throw new NotFoundException(
        'No se encontró un apoderado registrado con ese DNI.',
      );
    }

    return {
      id_persona: persona.id_persona,
      dni: persona.dni,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      telefono: persona.telefono,
      correo: persona.correo,
      direccion: persona.direccion,
      pais: persona.pais,
      departamento: persona.departamento,
      provincia: persona.provincia,
      distrito: persona.distrito,
      apoderado: persona.apoderados[0],
    };
  }

  // ── CREAR ALUMNO ──────────────────────────────────────

  async createAlumno(params: {
    dto: CreateAlumnoDto;
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
  }) {
    const scope = await this.resolveScope({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (
      scope.tipo === 'todos'
      || scope.colegioIds.length !== 1
    ) {
      throw new BadRequestException(
        'Selecciona una institución destino '
        + 'antes de registrar al alumno.',
      );
    }

    const idColegio = scope.colegioIds[0];

    const dto = normalizePersonaInput(
      params.dto,
    ) as CreateAlumnoDto;

    const existente =
      await this.prisma.persona.findUnique({
        where: {
          dni: dto.dni,
        },
        include: {
          estudiantes: true,
        },
      });

    if (
      existente
      ?.estudiantes
      ?.length
    ) {
      throw new BadRequestException(
        'El DNI ya pertenece a un alumno '
        + 'registrado. Usa la búsqueda para '
        + 'continuar la matrícula.',
      );
    }

    if (existente) {
      throw new BadRequestException(
        'El DNI ya pertenece a una persona '
        + 'registrada. Revisa si es apoderado, '
        + 'docente o staff.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const persona =
            await tx.persona.create({
              data: {
                dni: dto.dni.trim(),

                nombres:
                  dto.nombres.trim(),

                apellido_paterno:
                  dto.apellido_paterno.trim(),

                apellido_materno:
                  dto.apellido_materno.trim(),

                fecha_nacimiento:
                  this.validarFechaNacimiento(
                    dto.fecha_nacimiento,
                  ),

                genero:
                  this.normalizeGenero(
                    dto.genero,
                  ),

                direccion:
                  this.normalizeEmpty(
                    dto.direccion,
                  ),

                pais:
                  this.normalizeEmpty(
                    dto.pais,
                  )
                  || 'Perú',

                departamento:
                  this.normalizeEmpty(
                    dto.departamento,
                  ),

                provincia:
                  this.normalizeEmpty(
                    dto.provincia,
                  ),

                distrito:
                  this.normalizeEmpty(
                    dto.distrito,
                  ),

                telefono:
                  this.normalizeEmpty(
                    dto.telefono,
                  ),

                correo:
                  this.normalizeEmpty(
                    dto.correo,
                  ),
              },
            });

          const codigoGlobal =
            `ALU${String(
              persona.id_persona,
            ).padStart(6, '0')}`;

          const estudiante =
            await tx.estudiante.create({
              data: {
                id_persona:
                  persona.id_persona,

                codigo_estudiante:
                  codigoGlobal,
              },
            });

          await this
            .asegurarCodigoEstudianteColegio(
              tx,
              estudiante.id_persona,
              idColegio,
            );

          const registroInstitucional =
            await tx
              .estudianteCodigoColegio.update({
                where: {
                  id_estudiante_id_colegio: {
                    id_estudiante:
                      estudiante.id_persona,

                    id_colegio:
                      idColegio,
                  },
                },
                data: {
                  estado_institucional:
                    'Borrador',

                  fecha_estado:
                    new Date(),

                  motivo_estado:
                    'Ficha creada durante '
                    + 'el proceso de matrícula.',

                  id_usuario_estado:
                    params.userId,
                },
              });

          return {
            persona,
            estudiante,

            registro_institucional:
              registroInstitucional,

            estado_registro:
              'Borrador',
          };
        },
      );
    } catch (error) {
      this.handlePersonaPrismaError(
        error,
      );
    }
  }

  async updateAlumno(idEstudiante: number, dto: Partial<CreateAlumnoDto>) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: idEstudiante },
      include: { persona: true },
    });

    if (!estudiante) {
      throw new NotFoundException('No se encontró el alumno seleccionado.');
    }

    const data: Prisma.PersonaUpdateInput = {};

    if (dto.dni !== undefined) data.dni = dto.dni.trim();
    if (dto.nombres !== undefined) data.nombres = dto.nombres.trim();
    if (dto.apellido_paterno !== undefined) data.apellido_paterno = dto.apellido_paterno.trim();
    if (dto.apellido_materno !== undefined) data.apellido_materno = dto.apellido_materno.trim();

    if (dto.fecha_nacimiento !== undefined) {
      data.fecha_nacimiento = this.validarFechaNacimiento(dto.fecha_nacimiento);
    }

    if (dto.genero !== undefined) data.genero = this.normalizeGenero(dto.genero);
    if (dto.telefono !== undefined) data.telefono = this.normalizeEmpty(dto.telefono);
    if (dto.correo !== undefined) data.correo = this.normalizeEmpty(dto.correo);
    if (dto.direccion !== undefined) data.direccion = this.normalizeEmpty(dto.direccion);
    if (dto.pais !== undefined) data.pais = this.normalizeEmpty(dto.pais) || 'Perú';
    if (dto.departamento !== undefined) data.departamento = this.normalizeEmpty(dto.departamento);
    if (dto.provincia !== undefined) data.provincia = this.normalizeEmpty(dto.provincia);
    if (dto.distrito !== undefined) data.distrito = this.normalizeEmpty(dto.distrito);

    try {
      const persona = await this.prisma.persona.update({
        where: { id_persona: idEstudiante },
        data,
        include: {
          estudiantes: {
            include: {
              apoderados: {
                include: {
                  apoderado: {
                    include: { persona: true },
                  },
                },
              },
              matriculas: {
                include: {
                  colegio: true,
                  anio: true,
                  seccion: {
                    include: {
                      grado: { include: { nivel: true } },
                    },
                  },
                },
                orderBy: { id_matricula: 'desc' },
              },
            },
          },
        },
      });

      return persona;
    } catch (error) {
      this.handlePersonaPrismaError(error);
    }
  }

  // ── CREAR APODERADO ───────────────────────────────────

  async createApoderado(dto: CreateApoderadoDto) {
    
    dto = normalizePersonaInput(dto) as CreateApoderadoDto;
const existente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
      include: { apoderados: true },
    });

    if (existente?.apoderados?.length) {
      throw new BadRequestException(
        'Este DNI ya pertenece a un apoderado. Usa la búsqueda para vincularlo.',
      );
    }

    if (existente) {
      throw new BadRequestException(
        'El DNI ya pertenece a una persona registrada. Revisa si es alumno, docente o staff.',
      );
    }

    try {
      const persona = await this.prisma.persona.create({
        data: {
          dni: dto.dni.trim(),
          nombres: dto.nombres.trim(),
          apellido_paterno: dto.apellido_paterno.trim(),
          apellido_materno: dto.apellido_materno.trim(),
          fecha_nacimiento: new Date('1980-01-01'),
          telefono: this.normalizeEmpty(dto.telefono),
          correo: this.normalizeEmpty(dto.correo),
          direccion: this.normalizeEmpty(dto.direccion),
          pais: this.normalizeEmpty(dto.pais) || 'Perú',
          departamento: this.normalizeEmpty(dto.departamento),
          provincia: this.normalizeEmpty(dto.provincia),
          distrito: this.normalizeEmpty(dto.distrito),
        },
      });

      const apoderado = await this.prisma.apoderado.create({
        data: {
          id_persona: persona.id_persona,
          ocupacion: this.normalizeEmpty(dto.ocupacion),
        },
      });

      if (dto.username && dto.password) {
        const rolApoderado = await this.prisma.rol.findUnique({
          where: { nombre_rol: 'Apoderado' },
        });

        if (rolApoderado) {
          const hashed = await bcrypt.hash(dto.password, 10);

          await this.prisma.usuario.create({
            data: {
              username: dto.username.trim(),
              password_hash: hashed,
              id_persona: persona.id_persona,
              id_rol: rolApoderado.id_rol,
              estado: true,
            },
          });
        }
      }

      return { persona, apoderado };
    } catch (error) {
      this.handlePersonaPrismaError(error);
    }
  }

  // ── NUEVOS HELPERS DE CÓDIGO DE MATRÍCULA ─────────────

  private limpiarParteCodigo(value?: string | null, fallback = 'MAT') {
    const limpio = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return limpio || fallback;
  }

  private getPrefijoColegioMatricula(colegio?: {
    codigo?: string | null;
    nombre_corto?: string | null;
    nombre?: string | null;
    id_colegio?: number;
  } | null) {
    if (colegio?.codigo) {
      return this.limpiarParteCodigo(colegio.codigo, 'COL').slice(0, 6);
    }

    if (colegio?.nombre_corto) {
      return this.limpiarParteCodigo(colegio.nombre_corto, 'COL').slice(0, 3);
    }

    if (colegio?.nombre) {
      return this.limpiarParteCodigo(colegio.nombre, 'COL').slice(0, 3);
    }

    return colegio?.id_colegio ? `COL${colegio.id_colegio}` : 'COL';
  }

  private getPrefijoNivelMatricula(nivel?: { nombre_nivel?: string | null } | null) {
    const nombre = this.limpiarParteCodigo(nivel?.nombre_nivel, 'NIV');

    if (nombre.includes('INICIAL')) return 'INI';
    if (nombre.includes('PRIMARIA')) return 'PRI';
    if (nombre.includes('SECUNDARIA')) return 'SEC';

    return nombre.slice(0, 3);
  }

  private async generarCodigoMatricula(
    tx: Prisma.TransactionClient,
    params: {
      colegio: {
        id_colegio?: number;
        codigo?: string | null;
        nombre_corto?: string | null;
        nombre?: string | null;
      } | null;
      seccion: any;
      anio: {
        id_anio: number;
        nombre_anio?: string | null;
        fecha_inicio?: Date | string | null;
      };
    },
  ) {
    const prefijoColegio = this.getPrefijoColegioMatricula(params.colegio);
    const prefijoNivel = this.getPrefijoNivelMatricula(
      params.seccion?.grado?.nivel,
    );
    const anioEscolar = this.getAnioCorteDeRegistro(params.anio);
    const prefijo = `${prefijoColegio}-${prefijoNivel}-${anioEscolar}`;

    const existentes = await tx.matricula.count({
      where: {
        codigo_matricula: {
          startsWith: `${prefijo}-`,
        },
      },
    });

    for (let offset = 1; offset <= 1000; offset += 1) {
      const correlativo = existentes + offset;
      const codigo = `${prefijo}-${String(correlativo).padStart(6, '0')}`;

      const yaExiste = await tx.matricula.findFirst({
        where: { codigo_matricula: codigo },
        select: { id_matricula: true },
      });

      if (!yaExiste) return codigo;
    }

    throw new BadRequestException(
      'No se pudo generar un código de matrícula disponible. Intenta nuevamente.',
    );
  }

  // ── CREAR MATRÍCULA ───────────────────────────────────

  async createMatricula(params: {
    dto: CreateMatriculaDto & { id_colegio?: number };
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
  }) {
    const scope = await this.resolveScope({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId || params.dto.id_colegio,
    });

    if (scope.tipo === 'todos' || scope.colegioIds.length !== 1) {
      throw new BadRequestException(
        'Selecciona un colegio específico para matricular',
      );
    }

    const idColegio = scope.colegioIds[0];
    const idTenant = scope.tenantId;

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: params.dto.id_estudiante },
    });

    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: params.dto.id_anio,
        id_colegio: idColegio,
      },
    });

    if (!anio) {
      throw new BadRequestException(
        'El año lectivo no pertenece al colegio seleccionado',
      );
    }

    const validacionPeriodo = this.validarPeriodoAnioParaMatricula(
      anio,
      (params.dto as any).tipo_ingreso,
    );

    const seccion = await this.prisma.seccion.findFirst({
      where: {
        id_seccion: params.dto.id_seccion,
        id_colegio: idColegio,
      },
      include: {
        aula: true,
        grado: {
          include: {
            nivel: true,
          },
        },
      },
    });

    if (!seccion) {
      throw new BadRequestException(
        'La sección no pertenece al colegio seleccionado',
      );
    }

    // VALIDACIÓN DE MATRÍCULA EXISTENTE EN EL MISMO AÑO ESCOLAR
    const validacionMatricula = await this.validarBloqueoYOrigenMatricula({
      idEstudiante: params.dto.id_estudiante,
      idTenant,
      idColegioDestino: idColegio,
      anioDestino: anio,
      tipoIngreso: validacionPeriodo.tipoIngreso,
    });

    const matriculados = await this.prisma.matricula.count({
      where: {
        id_seccion: params.dto.id_seccion,
        id_anio: params.dto.id_anio,
        id_colegio: idColegio,
        estado_matricula: {
          in: ['Activo', 'Pre-matriculado', 'Reserva'],
        },
      },
    });

    if (matriculados >= seccion.aula.capacidad) {
      throw new BadRequestException('La sección está llena');
    }

    if (!params.dto.apoderados || params.dto.apoderados.length === 0) {
      throw new BadRequestException(
        'Debes vincular al menos un apoderado para matricular al alumno.',
      );
    }

    for (const apoderado of params.dto.apoderados) {
      const existeApoderado = await this.prisma.apoderado.findUnique({
        where: { id_persona: apoderado.id_apoderado },
      });

      if (!existeApoderado) {
        throw new BadRequestException(
          'Uno de los apoderados seleccionados no existe.',
        );
      }
    }

    await this.validarEdadParaMatricula({
      idEstudiante: params.dto.id_estudiante,
      idSeccion: params.dto.id_seccion,
      idAnio: params.dto.id_anio,
      excepcionTraslado: Boolean((params.dto as any).excepcion_traslado),
    });

    return this.prisma.$transaction(async (tx) => {
      const codigoMatricula = await this.generarCodigoMatricula(tx, {
        colegio: scope.colegios[0],
        seccion,
        anio,
      });

      const matricula = await tx.matricula.create({
        data: {
          codigo_matricula: codigoMatricula,
          id_tenant: idTenant,
          id_colegio: idColegio,
          id_estudiante: params.dto.id_estudiante,
          id_seccion: params.dto.id_seccion,
          id_anio: params.dto.id_anio,
          estado_matricula: validacionPeriodo.estadoMatricula,
          id_usuario_registro: params.userId,
          tipo_ingreso: validacionPeriodo.tipoIngreso,
          colegio_procedencia: this.normalizeEmpty((params.dto as any).colegio_procedencia),
          codigo_modular_procedencia: this.normalizeEmpty((params.dto as any).codigo_modular_procedencia),
          grado_procedencia: this.normalizeEmpty((params.dto as any).grado_procedencia),
          observacion_procedencia: this.normalizeEmpty((params.dto as any).observacion_procedencia),
          estado_revision: 'Por revisar',
          id_matricula_origen: validacionMatricula.matriculaOrigen?.id_matricula || null,
          id_colegio_origen: validacionMatricula.matriculaOrigen?.id_colegio || null,
          id_anio_origen: validacionMatricula.matriculaOrigen?.id_anio || null,
          tipo_proceso_matricula: this.tiposRenovacion.includes(validacionPeriodo.tipoIngreso)
            ? validacionPeriodo.tipoIngreso
            : null,
        },
      });

      await this.asegurarCodigoEstudianteColegio(
        tx,
        params.dto.id_estudiante,
        idColegio,
      );

      await tx.estudianteCodigoColegio.update({
        where: {
          id_estudiante_id_colegio: {
            id_estudiante:
              params.dto.id_estudiante,
            id_colegio:
              idColegio,
          },
        },
        data: {
          estado_institucional:
            'Activo',
          fecha_estado:
            new Date(),
          motivo_estado:
            null,
          id_usuario_estado:
            params.userId,
        },
      });

      for (const ap of params.dto.apoderados) {
        await tx.apoderadoEstudiante.upsert({
          where: {
            id_apoderado_id_estudiante: {
              id_apoderado: ap.id_apoderado,
              id_estudiante: params.dto.id_estudiante,
            },
          },
          update: { parentesco: ap.parentesco },
          create: {
            id_apoderado: ap.id_apoderado,
            id_estudiante: params.dto.id_estudiante,
            parentesco: ap.parentesco,
          },
        });
      }

      if (validacionPeriodo.generaCobroMatricula) {
        const conceptos = await tx.conceptoPago.findMany({
          where: {
            id_anio: params.dto.id_anio,
            OR: [{ id_colegio: idColegio }, { id_colegio: null }],
            tipo_concepto: 'MATRICULA',
          },
          orderBy: [{ id_colegio: 'desc' }, { id_concepto: 'asc' }],
        });

        if (!conceptos.length) {
          throw new BadRequestException(
            'No existe un concepto de tipo MATRÍCULA configurado para este colegio y año lectivo. Créalo en Configuración > Conceptos de pago.',
          );
        }

        for (const concepto of conceptos) {
          // ── CAMBIO: vencimiento inmediato (mismo día a las 12:00) ──
          const fechaVenc = new Date();
          fechaVenc.setHours(12, 0, 0, 0);

          await this.crearCronogramaMatriculaConMonto(tx, {
            idMatricula: matricula.id_matricula,
            concepto,
            fechaVencimiento: fechaVenc,
            idTenant,
            idColegio,
            tipoIngreso: validacionPeriodo.tipoIngreso,
            matriculaOrigen: validacionMatricula.matriculaOrigen,
          });
        }
      }

      return matricula;
    });
  }

  // ── PERIODOS Y UNIDADES ACADÉMICAS ─────────────────────────────

  private mapPeriodoUnidad(periodo: any) {
    const nombrePeriodo = periodo.nombre || `Periodo ${periodo.numero}`;

    return {
      id_bimestre: periodo.id_bimestre,
      numero: periodo.numero,
      nombre: nombrePeriodo,
      fecha_inicio: periodo.fecha_inicio,
      fecha_fin: periodo.fecha_fin,
      label: nombrePeriodo,
      unidades: (periodo.unidades || [])
        .sort((a: any, b: any) => a.numero - b.numero)
        .map((unidad: any) => {
          const nombreUnidad = unidad.nombre || `Unidad ${unidad.numero}`;

          return {
            id_unidad: unidad.id_unidad,
            numero: unidad.numero,
            nombre: nombreUnidad,
            fecha_inicio: unidad.fecha_inicio,
            fecha_fin: unidad.fecha_fin,
            estado_abierto: unidad.estado_abierto,
            label: nombreUnidad,
          };
        }),
    };
  }

  private repartirRangosFechas(fechaInicio: Date, fechaFin: Date, cantidad: number) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const totalMs = fin.getTime() - inicio.getTime();
    const paso = Math.floor(totalMs / cantidad);

    return Array.from({ length: cantidad }, (_, index) => {
      const desde = new Date(inicio.getTime() + paso * index);
      const hasta =
        index === cantidad - 1
          ? new Date(fin)
          : new Date(inicio.getTime() + paso * (index + 1) - 24 * 60 * 60 * 1000);

      return { desde, hasta };
    });
  }

  async listarPeriodosUnidadesGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    anioId?: number;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (!contexto.permitidoIds.length) return { anio: null, periodos: [] };

    if (!params.anioId) {
      return { anio: null, periodos: [] };
    }

    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: params.anioId,
        id_colegio: contexto.colegioId
          ? contexto.colegioId
          : { in: contexto.permitidoIds },
      },
      include: {
        colegio: true,
        bimestres: {
          include: {
            unidades: true,
          },
          orderBy: {
            numero: 'asc',
          },
        },
      },
    });

    if (!anio) {
      throw new NotFoundException('Año lectivo no encontrado o sin acceso.');
    }

    return {
      anio: {
        id_anio: anio.id_anio,
        nombre_anio: anio.nombre_anio,
        estado: anio.estado,
        fecha_inicio: anio.fecha_inicio,
        fecha_fin: anio.fecha_fin,
        colegio: anio.colegio?.nombre || anio.colegio?.nombre_corto || null,
        id_colegio: anio.id_colegio,
      },
      periodos: anio.bimestres.map((periodo) => this.mapPeriodoUnidad(periodo)),
    };
  }

  async generarPeriodosUnidadesGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    body: {
      id_anio: number;
      id_colegio?: number;
      cantidad_periodos: number;
      unidades_por_periodo: number;
      reemplazar?: boolean;
    };
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const idAnio = Number(params.body.id_anio);
    const cantidadPeriodos = Number(params.body.cantidad_periodos);
    const unidadesPorPeriodo = Number(params.body.unidades_por_periodo);

    if (!idAnio) throw new BadRequestException('Selecciona el año lectivo.');
    if (!Number.isInteger(cantidadPeriodos) || cantidadPeriodos < 1 || cantidadPeriodos > 12) {
      throw new BadRequestException('La cantidad de periodos debe estar entre 1 y 12.');
    }
    if (!Number.isInteger(unidadesPorPeriodo) || unidadesPorPeriodo < 1 || unidadesPorPeriodo > 12) {
      throw new BadRequestException('Las unidades por periodo deben estar entre 1 y 12.');
    }

    const nombrePeriodoBase =
      String((params.body as any).nombre_periodo_base || 'Periodo').trim() || 'Periodo';

    const nombreUnidadBase =
      String((params.body as any).nombre_unidad_base || 'Unidad').trim() || 'Unidad';

    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: idAnio },
      include: {
        colegio: true,
        bimestres: {
          include: {
            unidades: {
              include: {
                evaluaciones: {
                  select: { id_evaluacion_det: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!anio) throw new NotFoundException('Año lectivo no encontrado.');

    const idColegio = Number(params.body.id_colegio || params.colegioId || anio.id_colegio);

    if (!idColegio || !contexto.permitidoIds.includes(idColegio)) {
      throw new BadRequestException('No tienes acceso a la institución seleccionada.');
    }

    if (anio.id_colegio && anio.id_colegio !== idColegio) {
      throw new BadRequestException('El año lectivo no pertenece a la institución seleccionada.');
    }

    const tienePeriodos = anio.bimestres.length > 0;
    const tieneEvaluaciones = anio.bimestres.some((periodo) =>
      periodo.unidades.some((unidad) => unidad.evaluaciones.length > 0),
    );

    if (tienePeriodos && !params.body.reemplazar) {
      throw new BadRequestException('Este año ya tiene periodos creados. Marca reemplazar si deseas regenerarlos.');
    }

    if (tieneEvaluaciones) {
      throw new BadRequestException('No se pueden regenerar periodos porque ya existen evaluaciones vinculadas.');
    }

    const periodosFechas = this.repartirRangosFechas(
      anio.fecha_inicio,
      anio.fecha_fin,
      cantidadPeriodos,
    );

    await this.prisma.$transaction(async (tx) => {
      if (tienePeriodos && params.body.reemplazar) {
        await tx.unidad.deleteMany({
          where: {
            bimestre: {
              id_anio: idAnio,
            },
          },
        });

        await tx.bimestre.deleteMany({
          where: {
            id_anio: idAnio,
          },
        });
      }

      for (let i = 0; i < cantidadPeriodos; i++) {
        const periodoCreado = await tx.bimestre.create({
          data: {
            id_anio: idAnio,
            numero: i + 1,
            nombre: `${nombrePeriodoBase} ${i + 1}`,
            fecha_inicio: periodosFechas[i].desde,
            fecha_fin: periodosFechas[i].hasta,
          },
        });

        const unidadesFechas = this.repartirRangosFechas(
          periodosFechas[i].desde,
          periodosFechas[i].hasta,
          unidadesPorPeriodo,
        );

        for (let j = 0; j < unidadesPorPeriodo; j++) {
          await tx.unidad.create({
            data: {
              id_bimestre: periodoCreado.id_bimestre,
              numero: j + 1,
              nombre: `${nombreUnidadBase} ${j + 1}`,
              fecha_inicio: unidadesFechas[j].desde,
              fecha_fin: unidadesFechas[j].hasta,
              estado_abierto: i === 0 && j === 0,
            },
          });
        }
      }
    });

    return this.listarPeriodosUnidadesGestion({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: idColegio,
      anioId: idAnio,
    });
  }

  async actualizarEstadoUnidadGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    idUnidad: number;
    estadoAbierto: boolean;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (!params.idUnidad) throw new BadRequestException('Unidad inválida.');

    const unidad = await this.prisma.unidad.findUnique({
      where: { id_unidad: params.idUnidad },
      include: {
        bimestre: {
          include: {
            anio: true,
          },
        },
      },
    });

    if (!unidad) throw new NotFoundException('Unidad no encontrada.');

    const idColegio = unidad.bimestre.anio.id_colegio;

    if (idColegio && !contexto.permitidoIds.includes(idColegio)) {
      throw new BadRequestException('No tienes acceso a esta unidad.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (params.estadoAbierto) {
        await tx.unidad.updateMany({
          where: {
            bimestre: {
              id_anio: unidad.bimestre.id_anio,
            },
            id_unidad: {
              not: params.idUnidad,
            },
          },
          data: {
            estado_abierto: false,
          },
        });
      }

      await tx.unidad.update({
        where: { id_unidad: params.idUnidad },
        data: {
          estado_abierto: params.estadoAbierto,
        },
      });
    });

    return this.listarPeriodosUnidadesGestion({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: idColegio || params.colegioId,
      anioId: unidad.bimestre.id_anio,
    });
  }

    private parseFechaConfig(value?: string) {
    if (!value) return undefined;

    const fecha = new Date(`${value}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha ingresada no es válida.');
    }

    return fecha;
  }

  async actualizarPeriodoAcademicoGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    idPeriodo: number;
    body: {
      nombre?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
    };
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const periodo = await this.prisma.bimestre.findUnique({
      where: { id_bimestre: params.idPeriodo },
      include: { anio: true },
    });

    if (!periodo) {
      throw new NotFoundException('Periodo no encontrado.');
    }

    const idColegio = periodo.anio.id_colegio;

    if (idColegio && !contexto.permitidoIds.includes(idColegio)) {
      throw new BadRequestException('No tienes acceso a este periodo.');
    }

    const fechaInicio = this.parseFechaConfig(params.body.fecha_inicio);
    const fechaFin = this.parseFechaConfig(params.body.fecha_fin);

    const fechaInicioFinal = fechaInicio || periodo.fecha_inicio;
    const fechaFinFinal = fechaFin || periodo.fecha_fin;

    if (fechaFinFinal < fechaInicioFinal) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    await this.prisma.bimestre.update({
      where: { id_bimestre: params.idPeriodo },
      data: {
        nombre: params.body.nombre?.trim() || undefined,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
    });

    return this.listarPeriodosUnidadesGestion({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: idColegio || params.colegioId,
      anioId: periodo.id_anio,
    });
  }

  async actualizarUnidadAcademicaGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    idUnidad: number;
    body: {
      nombre?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
    };
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const unidad = await this.prisma.unidad.findUnique({
      where: { id_unidad: params.idUnidad },
      include: {
        bimestre: {
          include: {
            anio: true,
          },
        },
      },
    });

    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada.');
    }

    const idColegio = unidad.bimestre.anio.id_colegio;

    if (idColegio && !contexto.permitidoIds.includes(idColegio)) {
      throw new BadRequestException('No tienes acceso a esta unidad.');
    }

    const fechaInicio = this.parseFechaConfig(params.body.fecha_inicio);
    const fechaFin = this.parseFechaConfig(params.body.fecha_fin);

    const fechaInicioFinal = fechaInicio || unidad.fecha_inicio;
    const fechaFinFinal = fechaFin || unidad.fecha_fin;

    if (fechaFinFinal < fechaInicioFinal) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    await this.prisma.unidad.update({
      where: { id_unidad: params.idUnidad },
      data: {
        nombre: params.body.nombre?.trim() || undefined,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
    });

    return this.listarPeriodosUnidadesGestion({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: idColegio || params.colegioId,
      anioId: unidad.bimestre.id_anio,
    });
  }

  async getPeriodosPorAsignacionNotas(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    idAsignacion: number;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const asignacion = await this.prisma.asignacionDocente.findUnique({
      where: { id_asignacion: params.idAsignacion },
      include: {
        anio: {
          include: {
            colegio: true,
            bimestres: {
              include: {
                unidades: true,
              },
              orderBy: {
                numero: 'asc',
              },
            },
          },
        },
      },
    });

    if (!asignacion) throw new NotFoundException('Asignación no encontrada.');

    if (asignacion.id_colegio && !contexto.permitidoIds.includes(asignacion.id_colegio)) {
      throw new BadRequestException('No tienes acceso a esta asignación.');
    }

    const periodos = asignacion.anio.bimestres
      .map((periodo) => this.mapPeriodoUnidad(periodo))
      .map((periodo) => ({
        ...periodo,
        unidades: periodo.unidades.filter((unidad) => unidad.estado_abierto),
      }))
      .filter((periodo) => periodo.unidades.length > 0);

    const unidades = periodos.flatMap((periodo) =>
      periodo.unidades.map((unidad) => ({
        ...unidad,
        id_bimestre: periodo.id_bimestre,
        periodo: periodo.numero,
      })),
    );

    return {
      id_asignacion: asignacion.id_asignacion,
      id_anio: asignacion.id_anio,
      anio: asignacion.anio.nombre_anio,
      colegio: asignacion.anio.colegio?.nombre || asignacion.anio.colegio?.nombre_corto || null,
      periodos,
      unidad_abierta: unidades[0] || null,
    };
  }

  // ── ASIGNACIONES DOCENTES: GESTIÓN ADMIN / DIRECCIÓN ───────────

  private mapAsignacionDocenteGestion(asignacion: any) {
    const grado = asignacion.seccion?.grado;
    const nivel = grado?.nivel;

    const seccionNombre = grado
      ? `${grado.nombre_grado} "${asignacion.seccion.letra}"${nivel?.nombre_nivel ? ` · ${nivel.nombre_nivel}` : ''}`
      : asignacion.seccion?.letra || 'Sección';

    const docenteNombre = asignacion.docente?.persona
      ? [
          asignacion.docente.persona.nombres,
          asignacion.docente.persona.apellido_paterno,
          asignacion.docente.persona.apellido_materno,
        ].filter(Boolean).join(' ')
      : 'Docente sin nombre';

    return {
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      id_anio: asignacion.id_anio,
      id_colegio: asignacion.id_colegio,
      docente: docenteNombre,
      curso: asignacion.curso?.nombre_curso || 'Curso sin nombre',
      area: asignacion.curso?.area?.nombre_area || null,
      seccion: seccionNombre,
      grado: grado?.nombre_grado || null,
      nivel: nivel?.nombre_nivel || null,
      anio: asignacion.anio?.nombre_anio || null,
      colegio: asignacion.colegio?.nombre || asignacion.colegio?.nombre_corto || null,
      colegio_nombre_corto: asignacion.colegio?.nombre_corto || null,
      matriculados: asignacion.seccion?.matriculas?.length || 0,
      evaluaciones: asignacion.evaluaciones?.length || 0,
    };
  }

  async listarAsignacionesDocentesGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    anioId?: number;
    docenteId?: number;
    seccionId?: number;
    cursoId?: number;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (!contexto.permitidoIds.length) return [];

    const where: any = {
      id_colegio: contexto.colegioId
        ? contexto.colegioId
        : { in: contexto.permitidoIds },
    };

    if (params.anioId) where.id_anio = params.anioId;
    if (params.docenteId) where.id_docente = params.docenteId;
    if (params.seccionId) where.id_seccion = params.seccionId;
    if (params.cursoId) where.id_curso = params.cursoId;

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where,
      include: {
        colegio: true,
        anio: true,
        docente: { include: { persona: true } },
        curso: { include: { area: true } },
        evaluaciones: { select: { id_evaluacion_det: true } },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
            matriculas: {
              where: { estado_matricula: { in: ['Activo', 'Matriculado'] } },
              select: { id_matricula: true },
            },
          },
        },
      },
      orderBy: [
        { anio: { fecha_inicio: 'desc' } },
        { colegio: { nombre: 'asc' } },
        { seccion: { letra: 'asc' } },
        { curso: { nombre_curso: 'asc' } },
      ],
    });

    return asignaciones.map((item) => this.mapAsignacionDocenteGestion(item));
  }

  async crearAsignacionDocenteGestion(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    body: {
      id_docente: number;
      id_curso: number;
      id_seccion: number;
      id_anio: number;
      id_colegio?: number;
    };
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const idDocente = Number(params.body.id_docente);
    const idCurso = Number(params.body.id_curso);
    const idSeccion = Number(params.body.id_seccion);
    const idAnio = Number(params.body.id_anio);

    if (!idDocente || !idCurso || !idSeccion || !idAnio) {
      throw new BadRequestException('Selecciona docente, curso, sección y año lectivo.');
    }

    const [docente, curso, seccion, anio] = await Promise.all([
      this.prisma.docente.findUnique({ where: { id_persona: idDocente }, include: { persona: true } }),
      this.prisma.curso.findUnique({ where: { id_curso: idCurso } }),
      this.prisma.seccion.findUnique({ where: { id_seccion: idSeccion }, include: { grado: { include: { nivel: true } } } }),
      this.prisma.anioLectivo.findUnique({ where: { id_anio: idAnio } }),
    ]);

    if (!docente) throw new NotFoundException('Docente no encontrado.');
    if (!curso) throw new NotFoundException('Curso no encontrado.');
    if (!seccion) throw new NotFoundException('Sección no encontrada.');
    if (!anio) throw new NotFoundException('Año lectivo no encontrado.');

    const idColegio = Number(params.body.id_colegio || params.colegioId || seccion.id_colegio || anio.id_colegio);

    if (!idColegio || !contexto.permitidoIds.includes(idColegio)) {
      throw new BadRequestException('No tienes acceso a la institución seleccionada.');
    }

    if (seccion.id_colegio && seccion.id_colegio !== idColegio) {
      throw new BadRequestException('La sección no pertenece a la institución seleccionada.');
    }

    if (anio.id_colegio && anio.id_colegio !== idColegio) {
      throw new BadRequestException('El año lectivo no pertenece a la institución seleccionada.');
    }

    const duplicado = await this.prisma.asignacionDocente.findFirst({
      where: {
        id_docente: idDocente,
        id_curso: idCurso,
        id_seccion: idSeccion,
        id_anio: idAnio,
        id_colegio: idColegio,
      },
    });

    if (duplicado) {
      throw new BadRequestException('Esta asignación docente ya existe.');
    }

    const creado = await this.prisma.asignacionDocente.create({
      data: {
        id_tenant: anio.id_tenant || seccion.id_tenant || curso.id_tenant || null,
        id_colegio: idColegio,
        id_docente: idDocente,
        id_curso: idCurso,
        id_seccion: idSeccion,
        id_anio: idAnio,
      },
      include: {
        colegio: true,
        anio: true,
        docente: { include: { persona: true } },
        curso: { include: { area: true } },
        evaluaciones: { select: { id_evaluacion_det: true } },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
            matriculas: { where: { estado_matricula: { in: ['Activo', 'Matriculado'] } }, select: { id_matricula: true } },
          },
        },
      },
    });

    return this.mapAsignacionDocenteGestion(creado);
  }

  async eliminarAsignacionDocenteGestion(params: {
    idAsignacion: number;
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
  }) {
    if (!Number.isInteger(params.idAsignacion) || params.idAsignacion <= 0) {
      throw new BadRequestException('ID de asignación inválido.');
    }

    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const asignacion = await this.prisma.asignacionDocente.findUnique({
      where: { id_asignacion: params.idAsignacion },
      include: { evaluaciones: { select: { id_evaluacion_det: true } } },
    });

    if (!asignacion) throw new NotFoundException('Asignación no encontrada.');

    if (asignacion.id_colegio && !contexto.permitidoIds.includes(asignacion.id_colegio)) {
      throw new BadRequestException('No tienes acceso a esta asignación.');
    }

    if (asignacion.evaluaciones.length > 0) {
      throw new BadRequestException('No se puede eliminar la asignación porque ya tiene evaluaciones asociadas. Primero revisa el registro de notas.');
    }

    await this.prisma.asignacionDocente.delete({ where: { id_asignacion: params.idAsignacion } });

    return { message: 'Asignación docente eliminada correctamente.', id_asignacion: params.idAsignacion };
  }

  // ── FIN NUEVOS MÉTODOS ─────────────────────────────────

  // ── ASIGNACIONES DOCENTES / NOTAS ─────────────────────

  private async resolveContextoAcademicoUsuario(params: {
    userId: number;
    scope?: string;
    colegioId?: number;
  }) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: {
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
          orderBy: { es_principal: 'desc' },
        },
      },
    });

    const colegios = usuario?.colegios || [];
    const permitidoIds = colegios.map((item) => item.id_colegio);

    const targetId =
      params.colegioId ||
      (params.scope === 'all' ? undefined : permitidoIds[0]);

    if (targetId && !permitidoIds.includes(targetId)) {
      throw new BadRequestException('No tienes acceso al colegio seleccionado.');
    }

    return {
      colegioId: targetId,
      permitidoIds,
    };
  }

  private estadosAnioAcademicoOperativos() {
    return ['En curso', 'Abierto', 'Planificación', 'Matrícula abierta', 'Activo'];
  }

  private async resolverAnioAcademicoActivo(params: {
    anioId?: number;
    colegioId?: number;
    permitidoIds: number[];
  }) {
    if (params.anioId) return params.anioId;

    const whereColegio = params.colegioId
      ? { id_colegio: params.colegioId }
      : { id_colegio: { in: params.permitidoIds } };

    const enCurso = await this.prisma.anioLectivo.findFirst({
      where: {
        ...whereColegio,
        estado: { in: this.estadosAnioAcademicoOperativos() },
      },
      orderBy: { fecha_inicio: 'desc' },
    });

    if (enCurso) return enCurso.id_anio;

    const ultimo = await this.prisma.anioLectivo.findFirst({
      where: whereColegio,
      orderBy: { fecha_inicio: 'desc' },
    });

    return ultimo?.id_anio;
  }

  async getAsignacionesDocenteNotas(params: {
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
    anioId?: number;
    docenteId?: number;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (!contexto.permitidoIds.length) return [];

    let anioWhere: any = {};

    if (params.anioId) {
      anioWhere = { id_anio: params.anioId };
    } else if (contexto.colegioId) {
      const anioId = await this.resolverAnioAcademicoActivo({
        colegioId: contexto.colegioId,
        permitidoIds: contexto.permitidoIds,
      });

      if (!anioId) return [];

      anioWhere = { id_anio: anioId };
    } else {
      const aniosActivos = await this.prisma.anioLectivo.findMany({
        where: {
          id_colegio: { in: contexto.permitidoIds },
          estado: { in: this.estadosAnioAcademicoOperativos() },
        },
        select: {
          id_anio: true,
          id_colegio: true,
          fecha_inicio: true,
        },
        orderBy: [
          { id_colegio: 'asc' },
          { fecha_inicio: 'desc' },
        ],
      });

      const anioPorColegio = new Map<number, number>();

      for (const anio of aniosActivos) {
        if (anio.id_colegio && !anioPorColegio.has(anio.id_colegio)) {
          anioPorColegio.set(anio.id_colegio, anio.id_anio);
        }
      }

      if (anioPorColegio.size === 0) {
        const ultimosAnios = await this.prisma.anioLectivo.findMany({
          where: {
            id_colegio: { in: contexto.permitidoIds },
          },
          select: {
            id_anio: true,
            id_colegio: true,
            fecha_inicio: true,
          },
          orderBy: [
            { id_colegio: 'asc' },
            { fecha_inicio: 'desc' },
          ],
        });

        for (const anio of ultimosAnios) {
          if (anio.id_colegio && !anioPorColegio.has(anio.id_colegio)) {
            anioPorColegio.set(anio.id_colegio, anio.id_anio);
          }
        }
      }

      const anioIds = Array.from(anioPorColegio.values());

      if (!anioIds.length) return [];

      anioWhere = { id_anio: { in: anioIds } };
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: { persona: { include: { docentes: true } } },
    });

    const docenteUsuario = usuario?.persona?.docentes?.[0];

    const where: any = {
      ...anioWhere,
      id_colegio: contexto.colegioId
        ? contexto.colegioId
        : { in: contexto.permitidoIds },
    };

    if (params.rol === 'Profesor') {
      if (!docenteUsuario) return [];
      where.id_docente = docenteUsuario.id_persona;
    } else if (params.docenteId) {
      where.id_docente = params.docenteId;
    }

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where,
      include: {
        colegio: true,
        anio: true,
        docente: { include: { persona: true } },
        curso: { include: { area: true } },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
            matriculas: {
              where: { estado_matricula: { in: ['Activo', 'Matriculado'] } },
              select: { id_matricula: true },
            },
          },
        },
      },
      orderBy: [
        { colegio: { nombre: 'asc' } },
        { seccion: { grado: { nombre_grado: 'asc' } } },
        { seccion: { letra: 'asc' } },
        { curso: { nombre_curso: 'asc' } },
      ],
    });

    return asignaciones.map((asignacion) => {
      const grado = asignacion.seccion?.grado;
      const nivel = grado?.nivel;
      const seccionNombre = grado
        ? `${grado.nombre_grado} "${asignacion.seccion.letra}"${nivel?.nombre_nivel ? ` · ${nivel.nombre_nivel}` : ''}`
        : asignacion.seccion?.letra || 'Sección';

      const docenteNombre = asignacion.docente?.persona
        ? [
            asignacion.docente.persona.nombres,
            asignacion.docente.persona.apellido_paterno,
            asignacion.docente.persona.apellido_materno,
          ].filter(Boolean).join(' ')
        : 'Docente sin nombre';

      return {
        id_asignacion: asignacion.id_asignacion,
        id_docente: asignacion.id_docente,
        id_curso: asignacion.id_curso,
        id_seccion: asignacion.id_seccion,
        id_anio: asignacion.id_anio,
        id_colegio: asignacion.id_colegio,
        curso: asignacion.curso?.nombre_curso || 'Curso sin nombre',
        area: asignacion.curso?.area?.nombre_area || null,
        seccion: seccionNombre,
        grado: grado?.nombre_grado || null,
        nivel: nivel?.nombre_nivel || null,
        letra: asignacion.seccion?.letra || null,
        anio: asignacion.anio?.nombre_anio || null,
        colegio: asignacion.colegio?.nombre || asignacion.colegio?.nombre_corto || null,
        colegio_nombre_corto: asignacion.colegio?.nombre_corto || null,
        docente: docenteNombre,
        matriculados: asignacion.seccion?.matriculas?.length || 0,
      };
    });
  }

  // ── HORARIO ACADÉMICO: GESTIÓN ADMIN / DIRECCIÓN ───────

  private parseHoraHorarioGestion(value?: string | null, campo = 'hora') {
    const hora = String(value || '').trim();

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      throw new BadRequestException(`La ${campo} debe tener formato HH:MM.`);
    }

    const [hh, mm] = hora.split(':').map(Number);

    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      throw new BadRequestException(`La ${campo} no es válida.`);
    }

    return hora;
  }

  private minutosHorarioGestion(hora: string) {
    const [hh, mm] = hora.split(':').map(Number);
    return hh * 60 + mm;
  }

  private validarDiaHorarioGestion(dia: number) {
    if (!Number.isInteger(dia) || dia < 1 || dia > 6) {
      throw new BadRequestException('Selecciona un día válido entre lunes y sábado.');
    }

    return dia;
  }

  private validarRangoHorarioGestion(horaInicio: string, horaFin: string) {
    if (this.minutosHorarioGestion(horaFin) <= this.minutosHorarioGestion(horaInicio)) {
      throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio.');
    }
  }

  private horarioIncludeGestion() {
    return {
      curso: {
        include: {
          area: true,
        },
      },
      docente: {
        include: {
          persona: true,
        },
      },
      seccion: {
        include: {
          colegio: true,
          grado: {
            include: {
              nivel: true,
            },
          },
        },
      },
    };
  }

  private mapHorarioGestion(horario: any) {
    const persona = horario.docente?.persona;
    const docenteNombre = persona
      ? [persona.nombres, persona.apellido_paterno, persona.apellido_materno]
          .filter(Boolean)
          .join(' ')
      : 'Docente';

    const seccionNombre = horario.seccion?.grado
      ? `${horario.seccion.grado.nombre_grado} "${horario.seccion.letra}" · ${horario.seccion.grado.nivel?.nombre_nivel || ''}`.trim()
      : `Sección ${horario.seccion?.letra || ''}`.trim();

    return {
      id_horario: horario.id_horario,
      id_seccion: horario.id_seccion,
      id_curso: horario.id_curso,
      id_docente: horario.id_docente,
      id_anio: horario.id_anio,
      dia_semana: horario.dia_semana,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      curso: horario.curso?.nombre_curso || 'Curso',
      area: horario.curso?.area?.nombre_area || null,
      docente: docenteNombre,
      docente_dni: persona?.dni || null,
      seccion: seccionNombre,
      grado: horario.seccion?.grado?.nombre_grado || null,
      nivel: horario.seccion?.grado?.nivel?.nombre_nivel || null,
      colegio: horario.seccion?.colegio?.nombre || horario.seccion?.colegio?.nombre_corto || null,
      id_colegio: horario.seccion?.id_colegio || null,
    };
  }

  private async resolverAsignacionParaHorarioGestion(
    params: {
      colegioIds: number[];
      idAsignacion?: number;
      idSeccion?: number;
      idCurso?: number;
      idDocente?: number;
      idAnio?: number;
    },
  ) {
    if (params.idAsignacion) {
      const asignacion = await this.prisma.asignacionDocente.findFirst({
        where: {
          id_asignacion: params.idAsignacion,
          id_colegio: {
            in: params.colegioIds,
          },
        },
        include: {
          colegio: true,
          seccion: {
            include: {
              grado: {
                include: {
                  nivel: true,
                },
              },
            },
          },
          curso: true,
          docente: {
            include: {
              persona: true,
            },
          },
          anio: true,
        },
      });

      if (!asignacion) {
        throw new BadRequestException('La asignación docente no existe o no pertenece al colegio seleccionado.');
      }

      return asignacion;
    }

    const idSeccion = Number(params.idSeccion || 0);
    const idCurso = Number(params.idCurso || 0);
    const idDocente = Number(params.idDocente || 0);

    if (!idSeccion || !idCurso || !idDocente) {
      throw new BadRequestException('Selecciona una asignación docente válida.');
    }

    const where: any = {
      id_seccion: idSeccion,
      id_curso: idCurso,
      id_docente: idDocente,
      id_colegio: {
        in: params.colegioIds,
      },
    };

    if (params.idAnio) where.id_anio = Number(params.idAnio);

    const asignacion = await this.prisma.asignacionDocente.findFirst({
      where,
      include: {
        colegio: true,
        seccion: {
          include: {
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
        curso: true,
        docente: {
          include: {
            persona: true,
          },
        },
        anio: true,
      },
    });

    if (!asignacion) {
      throw new BadRequestException('No existe una asignación docente con esos datos. Crea primero la asignación docente.');
    }

    return asignacion;
  }

  private async validarConflictoHorarioGestion(params: {
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    idSeccion: number;
    idDocente: number;
    idAnio?: number;
    excluirHorarioId?: number;
  }) {
    /*
      Regla principal:
      - Un docente no puede tener dos bloques que se crucen en el mismo día.
      - Otra sección u otro docente sí pueden usar la misma franja horaria.
      - No se valida cruce por sección porque el horario se gestiona como agenda
        multi-docente / multi-sección.
    */
    const conflictoDocente = await this.prisma.horario.findFirst({
      where: {
        id_horario: params.excluirHorarioId
          ? {
              not: params.excluirHorarioId,
            }
          : undefined,
        dia_semana: params.diaSemana,
        id_docente: params.idDocente,
        id_anio: params.idAnio || undefined,
        hora_inicio: {
          lt: params.horaFin,
        },
        hora_fin: {
          gt: params.horaInicio,
        },
      },
      include: this.horarioIncludeGestion(),
    });

    if (!conflictoDocente) return;

    const conflictoMapeado = this.mapHorarioGestion(conflictoDocente);

    throw new BadRequestException(
      `El docente ya tiene ${conflictoMapeado.curso} con ${conflictoMapeado.seccion} de ${conflictoDocente.hora_inicio} a ${conflictoDocente.hora_fin}.`,
    );
  }

  async listarHorariosGestion(params: ScopeParams & {
    seccionId?: number;
    docenteId?: number;
    cursoId?: number;
    anioId?: number;
  }) {
    const scope = await this.resolveScope(params);

    if (!scope.colegioIds.length) return [];

    const where: any = {
      seccion: {
        id_colegio: {
          in: scope.colegioIds,
        },
      },
    };

    const rolUsuario = String(params.rol || '').trim().toLowerCase();
    const esProfesor = rolUsuario === 'profesor' || rolUsuario === 'docente';

    if (esProfesor) {
      const usuario = await this.prisma.usuario.findUnique({
        where: {
          id_usuario: params.userId,
        },
        select: {
          id_persona: true,
          persona: {
            select: {
              docentes: {
                select: {
                  id_persona: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      const idDocente =
        usuario?.persona?.docentes?.[0]?.id_persona ||
        usuario?.id_persona ||
        null;

      if (!idDocente) {
        return [];
      }

      // Seguridad: un Profesor nunca puede listar horarios de otro docente,
      // aunque manipule query params desde el navegador.
      where.id_docente = idDocente;
    } else if (params.docenteId) {
      where.id_docente = params.docenteId;
    }

    if (params.seccionId) where.id_seccion = params.seccionId;
    if (params.cursoId) where.id_curso = params.cursoId;
    if (params.anioId) where.id_anio = params.anioId;

    const horarios = await this.prisma.horario.findMany({
      where,
      include: this.horarioIncludeGestion(),
      orderBy: [
        {
          dia_semana: 'asc',
        },
        {
          hora_inicio: 'asc',
        },
      ],
    });

    return horarios.map((horario) => this.mapHorarioGestion(horario));
  }

  async crearHorarioGestion(params: ScopeParams & { body: any }) {
    const scope = await this.resolveScope(params);

    if (!scope.colegioIds.length) {
      throw new BadRequestException('No tienes colegios disponibles para gestionar horarios.');
    }

    const body = params.body || {};
    const diaSemana = this.validarDiaHorarioGestion(Number(body.dia_semana));
    const horaInicio = this.parseHoraHorarioGestion(body.hora_inicio, 'hora de inicio');
    const horaFin = this.parseHoraHorarioGestion(body.hora_fin, 'hora de fin');

    this.validarRangoHorarioGestion(horaInicio, horaFin);

    const asignacion = await this.resolverAsignacionParaHorarioGestion({
      colegioIds: scope.colegioIds,
      idAsignacion: body.id_asignacion ? Number(body.id_asignacion) : undefined,
      idSeccion: body.id_seccion ? Number(body.id_seccion) : undefined,
      idCurso: body.id_curso ? Number(body.id_curso) : undefined,
      idDocente: body.id_docente ? Number(body.id_docente) : undefined,
      idAnio: body.id_anio ? Number(body.id_anio) : undefined,
    });

    await this.validarConflictoHorarioGestion({
      diaSemana,
      horaInicio,
      horaFin,
      idSeccion: asignacion.id_seccion,
      idDocente: asignacion.id_docente,
      idAnio: asignacion.id_anio,
    });

    const creado = await this.prisma.horario.create({
      data: {
        id_seccion: asignacion.id_seccion,
        id_curso: asignacion.id_curso,
        id_docente: asignacion.id_docente,
        id_anio: asignacion.id_anio,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      },
      include: this.horarioIncludeGestion(),
    });

    return this.mapHorarioGestion(creado);
  }

  async actualizarHorarioGestion(params: ScopeParams & { idHorario: number; body: any }) {
    const scope = await this.resolveScope(params);

    const horario = await this.prisma.horario.findFirst({
      where: {
        id_horario: params.idHorario,
        seccion: {
          id_colegio: {
            in: scope.colegioIds,
          },
        },
      },
      include: this.horarioIncludeGestion(),
    });

    if (!horario) {
      throw new NotFoundException('Horario no encontrado o sin acceso.');
    }

    const body = params.body || {};
    let idSeccion = horario.id_seccion;
    let idCurso = horario.id_curso;
    let idDocente = horario.id_docente;

    if (body.id_asignacion || body.id_seccion || body.id_curso || body.id_docente) {
      const asignacion = await this.resolverAsignacionParaHorarioGestion({
        colegioIds: scope.colegioIds,
        idAsignacion: body.id_asignacion ? Number(body.id_asignacion) : undefined,
        idSeccion: body.id_seccion ? Number(body.id_seccion) : undefined,
        idCurso: body.id_curso ? Number(body.id_curso) : undefined,
        idDocente: body.id_docente ? Number(body.id_docente) : undefined,
        idAnio: body.id_anio ? Number(body.id_anio) : undefined,
      });

      idSeccion = asignacion.id_seccion;
      idCurso = asignacion.id_curso;
      idDocente = asignacion.id_docente;
    }

    const diaSemana =
      body.dia_semana !== undefined
        ? this.validarDiaHorarioGestion(Number(body.dia_semana))
        : horario.dia_semana;

    const horaInicio =
      body.hora_inicio !== undefined
        ? this.parseHoraHorarioGestion(body.hora_inicio, 'hora de inicio')
        : horario.hora_inicio;

    const horaFin =
      body.hora_fin !== undefined
        ? this.parseHoraHorarioGestion(body.hora_fin, 'hora de fin')
        : horario.hora_fin;

    this.validarRangoHorarioGestion(horaInicio, horaFin);

    await this.validarConflictoHorarioGestion({
      diaSemana,
      horaInicio,
      horaFin,
      idSeccion,
      idDocente,
      excluirHorarioId: params.idHorario,
    });

    const actualizado = await this.prisma.horario.update({
      where: {
        id_horario: params.idHorario,
      },
      data: {
        id_seccion: idSeccion,
        id_curso: idCurso,
        id_docente: idDocente,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      },
      include: this.horarioIncludeGestion(),
    });

    return this.mapHorarioGestion(actualizado);
  }

  async eliminarHorarioGestion(params: ScopeParams & { idHorario: number }) {
    const scope = await this.resolveScope(params);

    const horario = await this.prisma.horario.findFirst({
      where: {
        id_horario: params.idHorario,
        seccion: {
          id_colegio: {
            in: scope.colegioIds,
          },
        },
      },
    });

    if (!horario) {
      throw new NotFoundException('Horario no encontrado o sin acceso.');
    }

    await this.prisma.horario.delete({
      where: {
        id_horario: params.idHorario,
      },
    });

    return {
      message: 'Bloque horario eliminado correctamente.',
      id_horario: params.idHorario,
    };
  }

  // ── ASISTENCIA ────────────────────────────────────────

  async getSeccionesDocente(docenteId: number, anioId?: number) {
    const anioActivo =
      anioId ||
      (await this.prisma.anioLectivo.findFirst({
        where: { estado: { in: this.estadosAnioAcademicoOperativos() } },
        orderBy: { fecha_inicio: 'desc' },
      }))?.id_anio;

    if (!anioActivo) return [];

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_docente: docenteId, id_anio: anioActivo },
      distinct: ['id_seccion'],
      select: { seccion: true },
    });

    return asignaciones.map((a) => a.seccion);
  }

  async getHijosApoderado(apoderadoId: number) {
    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderadoId },
      include: {
        estudiante: {
          include: {
            persona: true,
            matriculas: {
              where: { estado_matricula: 'Activo' },
              include: {
                seccion: {
                  include: {
                    grado: {
                      include: { nivel: true },
                    },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    return relaciones.map((r) => {
      const matricula = r.estudiante.matriculas[0];
      const seccion = matricula?.seccion;
      const gradoNombre = seccion?.grado?.nombre_grado || '';
      const nivelNombre = seccion?.grado?.nivel?.nombre_nivel || '';

      return {
        id_estudiante: r.id_estudiante,
        nombre: `${r.estudiante.persona.nombres} ${r.estudiante.persona.apellido_paterno}`,
        grado: seccion
          ? `${gradoNombre} ${seccion.letra} · ${nivelNombre}`
          : 'Sin matrícula activa',
        avatar_url: r.estudiante.avatar_url,
      };
    });
  }

  async getHorarioAlumno(alumnoId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: true },
    });

    if (!matriculaActiva) {
      throw new NotFoundException('No se encontró matrícula activa');
    }

    const horarios = await this.prisma.horario.findMany({
      where: {
        id_seccion: matriculaActiva.id_seccion,
        id_anio: matriculaActiva.id_anio,
      },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
      include: { curso: true, docente: { include: { persona: true } } },
    });

    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const resultado: any = {};

    for (const h of horarios) {
      const diaNombre = dias[h.dia_semana - 1];
      if (!resultado[diaNombre]) resultado[diaNombre] = [];

      resultado[diaNombre].push({
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        curso: h.curso.nombre_curso,
        docente: `${h.docente.persona.nombres} ${h.docente.persona.apellido_paterno}`,
      });
    }

    return resultado;
  }

  async getTotalMatriculados(params: ScopeParams & { anioId: number }) {
    const scope = await this.resolveScope(params);

    return this.prisma.matricula.count({
      where: {
        id_anio: params.anioId,
        estado_matricula: 'Activo',
        ...this.colegioWhere(scope),
      },
    });
  }

  private parseFechaDocenteCrud(value?: string | null, campo = 'fecha') {
    if (!value) return null;

    const fecha = new Date(`${value}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) {
      throw new BadRequestException(`La ${campo} no es válida.`);
    }

    return fecha;
  }

  private limpiarTextoDocenteCrud(value?: string | null) {
    const clean = String(value || '').trim();
    return clean || null;
  }

  private idsUnicosDocenteCrud(values?: unknown[]) {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
  }

  private async validarAreasDocenteCrud(areaIds: number[], colegioIds: number[]) {
    if (!areaIds.length) {
      throw new BadRequestException('Selecciona al menos un área o especialidad para vincular al docente con el colegio.');
    }

    const areas = await this.prisma.areaCurricular.findMany({
      where: {
        id_area: { in: areaIds },
        id_colegio: { in: colegioIds },
      },
      select: {
        id_area: true,
      },
    });

    const validos = new Set(areas.map((area) => area.id_area));

    if (areaIds.some((id) => !validos.has(id))) {
      throw new BadRequestException('Una o más áreas no pertenecen al colegio seleccionado.');
    }

    return areaIds;
  }

  private docentePerteneceScopeCrud(docente: any, colegioIds: number[]) {
    const porEspecialidad = (docente.especialidades || []).some((item: any) =>
      item.area?.id_colegio && colegioIds.includes(item.area.id_colegio),
    );

    const porAsignacion = (docente.asignaciones || []).some((item: any) =>
      item.id_colegio && colegioIds.includes(item.id_colegio),
    );

    return porEspecialidad || porAsignacion;
  }

  private mapDocenteCrudGestion(docente: any) {
    const persona = docente.persona || {};
    const nombreCompleto = [
      persona.nombres,
      persona.apellido_paterno,
      persona.apellido_materno,
    ].filter(Boolean).join(' ');

    const usuarioProfesor =
      (persona.usuarios || []).find((usuario: any) => usuario.rol?.nombre_rol === 'Profesor') ||
      null;

    const colegios = new Map<number, string>();
    const secciones = new Map<number, any>();

    for (const esp of docente.especialidades || []) {
      const colegio = esp.area?.colegio;
      if (colegio?.id_colegio) {
        colegios.set(colegio.id_colegio, colegio.nombre || colegio.nombre_corto || 'Colegio');
      }
    }

    for (const asignacion of docente.asignaciones || []) {
      const colegio = asignacion.colegio;

      if (colegio?.id_colegio) {
        colegios.set(colegio.id_colegio, colegio.nombre || colegio.nombre_corto || 'Colegio');
      }

      if (asignacion.seccion?.id_seccion) {
        const seccionNombre = asignacion.seccion?.grado
          ? `${asignacion.seccion.grado.nombre_grado} "${asignacion.seccion.letra}"`
          : asignacion.seccion?.letra || 'Sección';

        secciones.set(asignacion.seccion.id_seccion, {
          id_seccion: asignacion.seccion.id_seccion,
          seccion: seccionNombre,
          nivel: asignacion.seccion?.grado?.nivel?.nombre_nivel || null,
          colegio: colegio?.nombre || colegio?.nombre_corto || null,
        });
      }
    }

    return {
      id_persona: docente.id_persona,
      nombre_completo: nombreCompleto,
      fecha_ingreso: docente.fecha_ingreso,
      persona: {
        dni: persona.dni,
        nombres: persona.nombres,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        fecha_nacimiento: persona.fecha_nacimiento,
        genero: persona.genero,
        telefono: persona.telefono,
        correo: persona.correo,
        direccion: persona.direccion,
        pais: persona.pais,
        departamento: persona.departamento,
        provincia: persona.provincia,
        distrito: persona.distrito,
      },
      credencial: {
        existe: Boolean(usuarioProfesor),
        username: usuarioProfesor?.username || '',
        estado: Boolean(usuarioProfesor?.estado),
        label: usuarioProfesor
          ? usuarioProfesor.estado
            ? 'Activo'
            : 'Inactivo'
          : 'Inactivo',
      },
      especialidades: (docente.especialidades || []).map((item: any) => ({
        id_area: item.id_area,
        area: item.area,
      })),
      colegios: Array.from(colegios.entries()).map(([id_colegio, nombre]) => ({
        id_colegio,
        nombre,
      })),
      secciones_count: secciones.size,
      secciones_resumen: Array.from(secciones.values()),
      tutorias_resumen: [],
      asignaciones_resumen: (docente.asignaciones || []).slice(0, 8).map((item: any) => ({
        id_asignacion: item.id_asignacion,
        curso: item.curso?.nombre_curso || 'Curso',
        area: item.curso?.area?.nombre_area || null,
        seccion: item.seccion?.grado
          ? `${item.seccion.grado.nombre_grado} "${item.seccion.letra}"`
          : item.seccion?.letra || 'Sección',
        nivel: item.seccion?.grado?.nivel?.nombre_nivel || null,
        anio: item.anio?.nombre_anio || null,
        colegio: item.colegio?.nombre || item.colegio?.nombre_corto || null,
      })),
      _count: {
        asignaciones: docente._count?.asignaciones || 0,
        horarios: docente._count?.horarios || 0,
      },
    };
  }

  private docenteIncludeCrud() {
    return {
      persona: {
        include: {
          usuarios: {
            include: {
              rol: true,
            },
          },
        },
      },
      especialidades: {
        include: {
          area: {
            include: {
              colegio: true,
            },
          },
        },
      },
      asignaciones: {
        take: 50,
        orderBy: {
          id_asignacion: 'desc' as const,
        },
        include: {
          colegio: true,
          anio: true,
          curso: {
            include: {
              area: true,
            },
          },
          seccion: {
            include: {
              grado: {
                include: {
                  nivel: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          asignaciones: true,
          horarios: true,
        },
      },
    };
  }

  async listarDocentesCrudGestion(params: ScopeParams & {
    q?: string;
    page?: number;
    limit?: number;
    estado?: string;
  }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    if (!contexto.permitidoIds.length) {
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 12, totalPages: 1 },
      };
    }

    const colegioIds = contexto.colegioId ? [contexto.colegioId] : contexto.permitidoIds;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(params.limit || 12, 1), 50);
    const skip = (page - 1) * limit;
    const q = String(params.q || '').trim();

    const where: any = {
      AND: [
        {
          OR: [
            {
              especialidades: {
                some: {
                  area: {
                    id_colegio: { in: colegioIds },
                  },
                },
              },
            },
            {
              asignaciones: {
                some: {
                  id_colegio: { in: colegioIds },
                },
              },
            },
          ],
        },
      ],
    };

    if (q) {
      where.AND.push({
        OR: [
          { persona: { dni: { contains: q } } },
          { persona: { nombres: { contains: q } } },
          { persona: { apellido_paterno: { contains: q } } },
          { persona: { apellido_materno: { contains: q } } },
          { persona: { correo: { contains: q } } },
          {
            especialidades: {
              some: {
                area: {
                  nombre_area: { contains: q },
                },
              },
            },
          },
        ],
      });
    }

    const estadoCredencial = String(params.estado || 'todos').trim().toLowerCase();

    if (estadoCredencial === 'activo') {
      where.AND.push({
        persona: {
          is: {
            usuarios: {
              some: {
                estado: true,
                rol: {
                  is: {
                    nombre_rol: 'Profesor',
                  },
                },
              },
            },
          },
        },
      });
    }

    if (estadoCredencial === 'inactivo') {
      where.AND.push({
        NOT: {
          persona: {
            is: {
              usuarios: {
                some: {
                  estado: true,
                  rol: {
                    is: {
                      nombre_rol: 'Profesor',
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    const [total, docentes] = await this.prisma.$transaction([
      this.prisma.docente.count({ where }),
      this.prisma.docente.findMany({
        where,
        skip,
        take: limit,
        include: this.docenteIncludeCrud(),
        orderBy: {
          id_persona: 'desc',
        },
      }),
    ]);

    return {
      data: docentes.map((docente) => this.mapDocenteCrudGestion(docente)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getDetalleDocenteCrudGestion(params: ScopeParams & { idDocente: number }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const docente = await this.prisma.docente.findUnique({
      where: { id_persona: params.idDocente },
      include: this.docenteIncludeCrud(),
    });

    if (!docente) throw new NotFoundException('Docente no encontrado.');

    const colegioIds = contexto.colegioId ? [contexto.colegioId] : contexto.permitidoIds;

    if (!this.docentePerteneceScopeCrud(docente, colegioIds)) {
      throw new BadRequestException('No tienes acceso a este docente.');
    }

    return this.mapDocenteCrudGestion(docente);
  }

  async crearDocenteCrudGestion(params: ScopeParams & { body: any }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const colegioIds = contexto.colegioId ? [contexto.colegioId] : contexto.permitidoIds;

    if (!colegioIds.length) {
      throw new BadRequestException('Selecciona un colegio válido.');
    }

    const body = normalizePersonaInput(params.body || {});
    const dni = String(body.dni || '').trim();

    if (!/^\d{8}$/.test(dni)) {
      throw new BadRequestException('El DNI debe tener 8 dígitos.');
    }

    const fechaNacimiento = this.parseFechaDocenteCrud(body.fecha_nacimiento, 'fecha de nacimiento');

    if (!fechaNacimiento) {
      throw new BadRequestException('Ingresa la fecha de nacimiento del docente.');
    }

    const areaIds = await this.validarAreasDocenteCrud(
      this.idsUnicosDocenteCrud(body.especialidades),
      colegioIds,
    );

    const fechaIngreso = this.parseFechaDocenteCrud(body.fecha_ingreso, 'fecha de ingreso');

    const docenteId = await this.prisma.$transaction(async (tx) => {
      const persona = await tx.persona.upsert({
        where: { dni },
        create: {
          dni,
          nombres: String(body.nombres || '').trim(),
          apellido_paterno: String(body.apellido_paterno || '').trim(),
          apellido_materno: String(body.apellido_materno || '').trim(),
          fecha_nacimiento: fechaNacimiento,
          genero: this.limpiarTextoDocenteCrud(body.genero),
          telefono: this.limpiarTextoDocenteCrud(body.telefono),
          correo: this.limpiarTextoDocenteCrud(body.correo),
          direccion: this.limpiarTextoDocenteCrud(body.direccion),
          pais: this.limpiarTextoDocenteCrud(body.pais) || 'Peru',
          departamento: this.limpiarTextoDocenteCrud(body.departamento),
          provincia: this.limpiarTextoDocenteCrud(body.provincia),
          distrito: this.limpiarTextoDocenteCrud(body.distrito),
        },
        update: {
          nombres: String(body.nombres || '').trim(),
          apellido_paterno: String(body.apellido_paterno || '').trim(),
          apellido_materno: String(body.apellido_materno || '').trim(),
          fecha_nacimiento: fechaNacimiento,
          genero: this.limpiarTextoDocenteCrud(body.genero),
          telefono: this.limpiarTextoDocenteCrud(body.telefono),
          correo: this.limpiarTextoDocenteCrud(body.correo),
          direccion: this.limpiarTextoDocenteCrud(body.direccion),
          pais: this.limpiarTextoDocenteCrud(body.pais) || 'Peru',
          departamento: this.limpiarTextoDocenteCrud(body.departamento),
          provincia: this.limpiarTextoDocenteCrud(body.provincia),
          distrito: this.limpiarTextoDocenteCrud(body.distrito),
        },
      });

      const existeDocente = await tx.docente.findUnique({
        where: { id_persona: persona.id_persona },
      });

      if (existeDocente) {
        throw new BadRequestException('Ya existe un docente registrado con este DNI.');
      }

      await tx.docente.create({
        data: {
          id_persona: persona.id_persona,
          fecha_ingreso: fechaIngreso,
        },
      });

      await tx.docenteEspecialidad.createMany({
        data: areaIds.map((idArea) => ({
          id_docente: persona.id_persona,
          id_area: idArea,
        })),
        skipDuplicates: true,
      });

      return persona.id_persona;
    });

    if (body.crear_credencial && body.username && body.password) {
      await this.guardarCredencialPersonaGestion({
        idPersona: docenteId,
        tipo: 'docente',
        userId: params.userId,
        rol: params.rol,
        scope: params.scope,
        colegioId: params.colegioId,
        body: {
          username: body.username,
          password: body.password,
          estado: body.credencial_activa !== false,
        },
      });
    }

    return this.getDetalleDocenteCrudGestion({
      idDocente: docenteId,
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
    });
  }

  async actualizarDocenteCrudGestion(params: ScopeParams & { idDocente: number; body: any }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const docente = await this.prisma.docente.findUnique({
      where: { id_persona: params.idDocente },
      include: {
        persona: true,
        especialidades: { include: { area: true } },
        asignaciones: true,
      },
    });

    if (!docente) throw new NotFoundException('Docente no encontrado.');

    const colegioIds = contexto.colegioId ? [contexto.colegioId] : contexto.permitidoIds;

    if (!this.docentePerteneceScopeCrud(docente, colegioIds)) {
      throw new BadRequestException('No tienes acceso a este docente.');
    }

    const body = normalizePersonaInput(params.body || {});
    const dataPersona: any = {};

    for (const key of [
      'nombres',
      'apellido_paterno',
      'apellido_materno',
      'genero',
      'telefono',
      'correo',
      'direccion',
      'pais',
      'departamento',
      'provincia',
      'distrito',
    ]) {
      if (body[key] !== undefined) dataPersona[key] = this.limpiarTextoDocenteCrud(body[key]);
    }

    if (body.nombres !== undefined) dataPersona.nombres = String(body.nombres || '').trim();
    if (body.apellido_paterno !== undefined) dataPersona.apellido_paterno = String(body.apellido_paterno || '').trim();
    if (body.apellido_materno !== undefined) dataPersona.apellido_materno = String(body.apellido_materno || '').trim();

    if (body.fecha_nacimiento !== undefined) {
      const fechaNacimiento = this.parseFechaDocenteCrud(body.fecha_nacimiento, 'fecha de nacimiento');
      if (fechaNacimiento) dataPersona.fecha_nacimiento = fechaNacimiento;
    }

    const dataDocente: any = {};

    if (body.fecha_ingreso !== undefined) {
      dataDocente.fecha_ingreso = this.parseFechaDocenteCrud(body.fecha_ingreso, 'fecha de ingreso');
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(dataPersona).length > 0) {
        await tx.persona.update({
          where: { id_persona: params.idDocente },
          data: dataPersona,
        });
      }

      if (Object.keys(dataDocente).length > 0) {
        await tx.docente.update({
          where: { id_persona: params.idDocente },
          data: dataDocente,
        });
      }

      if (Array.isArray(body.especialidades)) {
        const areaIds = await this.validarAreasDocenteCrud(
          this.idsUnicosDocenteCrud(body.especialidades),
          colegioIds,
        );

        await tx.docenteEspecialidad.deleteMany({
          where: {
            id_docente: params.idDocente,
          },
        });

        await tx.docenteEspecialidad.createMany({
          data: areaIds.map((idArea) => ({
            id_docente: params.idDocente,
            id_area: idArea,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getDetalleDocenteCrudGestion({
      idDocente: params.idDocente,
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
    });
  }

  async eliminarDocenteCrudGestion(params: ScopeParams & { idDocente: number }) {
    const contexto = await this.resolveContextoAcademicoUsuario({
      userId: params.userId,
      scope: params.scope,
      colegioId: params.colegioId,
    });

    const docente = await this.prisma.docente.findUnique({
      where: { id_persona: params.idDocente },
      include: {
        especialidades: { include: { area: true } },
        asignaciones: true,
      },
    });

    if (!docente) throw new NotFoundException('Docente no encontrado.');

    const colegioIds = contexto.colegioId ? [contexto.colegioId] : contexto.permitidoIds;

    if (!this.docentePerteneceScopeCrud(docente, colegioIds)) {
      throw new BadRequestException('No tienes acceso a este docente.');
    }

    const [asignaciones, horarios] = await Promise.all([
      this.prisma.asignacionDocente.count({ where: { id_docente: params.idDocente } }),
      this.prisma.horario.count({ where: { id_docente: params.idDocente } }),
    ]);

    if (asignaciones > 0 || horarios > 0) {
      throw new BadRequestException(
        'No se puede eliminar este docente porque tiene asignaciones u horarios vinculados. Primero retira esas relaciones.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.docenteEspecialidad.deleteMany({
        where: { id_docente: params.idDocente },
      }),
      this.prisma.docente.delete({
        where: { id_persona: params.idDocente },
      }),
    ]);

    return {
      message: 'Docente eliminado correctamente.',
      id_docente: params.idDocente,
    };
  }

  // ── CREDENCIALES DE ACCESO: DOCENTES / APODERADOS ──────

  private credencialUsuarioSelect() {
    return {
      id_usuario: true,
      username: true,
      estado: true,
      ultima_conexion: true,
      id_persona: true,
      rol: {
        select: {
          nombre_rol: true,
        },
      },
      colegios: {
        select: {
          id_colegio: true,
          estado: true,
          rol_colegio: true,
          colegio: {
            select: {
              id_colegio: true,
              nombre: true,
              nombre_corto: true,
            },
          },
        },
      },
    };
  }

  private mapCredencialUsuario(usuario: any) {
    if (!usuario) {
      return {
        existe: false,
        id_usuario: null,
        username: '',
        estado: false,
        rol: null,
        ultima_conexion: null,
        colegios: [],
      };
    }

    return {
      existe: true,
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      estado: Boolean(usuario.estado),
      rol: usuario.rol?.nombre_rol || null,
      ultima_conexion: usuario.ultima_conexion || null,
      colegios: (usuario.colegios || []).map((item: any) => ({
        id_colegio: item.id_colegio,
        estado: item.estado,
        rol_colegio: item.rol_colegio,
        nombre: item.colegio?.nombre || item.colegio?.nombre_corto || 'Colegio',
      })),
    };
  }

  private tipoCredencialToRol(tipo?: string | null) {
    const normalized = String(tipo || '').trim().toLowerCase();

    if (normalized === 'docente' || normalized === 'profesor') return 'Profesor';
    if (normalized === 'apoderado' || normalized === 'padre') return 'Apoderado';

    throw new BadRequestException('Tipo de credencial no válido. Usa docente o apoderado.');
  }

  private async getScopeParaCredencial(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    if (!scope.colegioIds.length) {
      throw new BadRequestException('No tienes colegios disponibles para gestionar accesos.');
    }

    return scope;
  }

  private async resolverColegiosCredencialPersona(params: ScopeParams & {
    idPersona: number;
    tipo: string;
  }) {
    const scope = await this.getScopeParaCredencial(params);
    const rolDestino = this.tipoCredencialToRol(params.tipo);

    let colegiosObjetivo: number[] = [];

    if (rolDestino === 'Profesor') {
      const docente = await this.prisma.docente.findUnique({
        where: { id_persona: params.idPersona },
        include: {
          especialidades: {
            include: {
              area: true,
            },
          },
          asignaciones: true,
        },
      });

      if (!docente) throw new NotFoundException('Docente no encontrado.');

      const colegiosDocente = new Set<number>();

      for (const esp of docente.especialidades || []) {
        if (esp.area?.id_colegio) colegiosDocente.add(esp.area.id_colegio);
      }

      for (const asignacion of docente.asignaciones || []) {
        if (asignacion.id_colegio) colegiosDocente.add(asignacion.id_colegio);
      }

      colegiosObjetivo = Array.from(colegiosDocente).filter((id) => scope.colegioIds.includes(id));
    }

    if (rolDestino === 'Apoderado') {
      const apoderado = await this.prisma.apoderado.findUnique({
        where: { id_persona: params.idPersona },
        include: {
          estudiantes: {
            include: {
              estudiante: {
                include: {
                  matriculas: true,
                },
              },
            },
          },
        },
      });

      if (!apoderado) throw new NotFoundException('Apoderado no encontrado.');

      const colegiosApoderado = new Set<number>();

      for (const rel of apoderado.estudiantes || []) {
        for (const matricula of rel.estudiante?.matriculas || []) {
          if (matricula.id_colegio) colegiosApoderado.add(matricula.id_colegio);
        }
      }

      colegiosObjetivo = Array.from(colegiosApoderado).filter((id) => scope.colegioIds.includes(id));
    }

    if (!colegiosObjetivo.length) {
      if (scope.tipo === 'colegio' && scope.colegioIds[0]) {
        colegiosObjetivo = [scope.colegioIds[0]];
      } else {
        throw new BadRequestException('La persona no está vinculada a ningún colegio dentro de tu contexto actual.');
      }
    }

    const colegios = await this.prisma.colegio.findMany({
      where: {
        id_colegio: {
          in: colegiosObjetivo,
        },
      },
      select: {
        id_colegio: true,
        id_tenant: true,
        nombre: true,
      },
    });

    return {
      scope,
      rolDestino,
      colegios,
    };
  }

  async getCredencialPersonaGestion(params: ScopeParams & {
    idPersona: number;
    tipo: string;
  }) {
    const { rolDestino } = await this.resolverColegiosCredencialPersona(params);

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id_persona: params.idPersona,
        rol: {
          nombre_rol: rolDestino,
        },
      },
      select: this.credencialUsuarioSelect(),
    });

    return this.mapCredencialUsuario(usuario);
  }

  async guardarCredencialPersonaGestion(params: ScopeParams & {
    idPersona: number;
    tipo: string;
    body: {
      username?: string;
      password?: string;
      estado?: boolean;
    };
  }) {
    const { rolDestino, colegios } = await this.resolverColegiosCredencialPersona(params);
    const body = params.body || {};

    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const estado = body.estado === undefined ? true : Boolean(body.estado);

    const rol = await this.prisma.rol.findUnique({
      where: {
        nombre_rol: rolDestino,
      },
    });

    if (!rol) {
      throw new BadRequestException(`No existe el rol ${rolDestino}. Crea ese rol primero.`);
    }

    const existente = await this.prisma.usuario.findFirst({
      where: {
        id_persona: params.idPersona,
        id_rol: rol.id_rol,
      },
      select: {
        id_usuario: true,
        username: true,
      },
    });

    if (!existente && (!username || !password)) {
      throw new BadRequestException('Para crear una credencial nueva debes ingresar usuario y contraseña temporal.');
    }

    if (username) {
      const usernameOcupado = await this.prisma.usuario.findFirst({
        where: {
          username,
          id_usuario: existente
            ? {
                not: existente.id_usuario,
              }
            : undefined,
        },
        select: {
          id_usuario: true,
        },
      });

      if (usernameOcupado) {
        throw new BadRequestException('El nombre de usuario ya está registrado. Usa otro usuario.');
      }
    }

    const usuario = await this.prisma.$transaction(async (tx) => {
      let idUsuario = existente?.id_usuario;

      if (existente) {
        const data: any = {
          estado,
        };

        if (username) data.username = username;
        if (password) data.password_hash = await bcrypt.hash(password, 10);

        const actualizado = await tx.usuario.update({
          where: {
            id_usuario: existente.id_usuario,
          },
          data,
          select: {
            id_usuario: true,
          },
        });

        idUsuario = actualizado.id_usuario;
      } else {
        const creado = await tx.usuario.create({
          data: {
            username,
            password_hash: await bcrypt.hash(password, 10),
            id_persona: params.idPersona,
            id_rol: rol.id_rol,
            estado,
          },
          select: {
            id_usuario: true,
          },
        });

        idUsuario = creado.id_usuario;
      }

      const tenants = Array.from(new Set(colegios.map((colegio) => colegio.id_tenant)));

      for (const idTenant of tenants) {
        await tx.usuarioTenant.upsert({
          where: {
            id_usuario_id_tenant: {
              id_usuario: idUsuario!,
              id_tenant: idTenant,
            },
          },
          update: {
            estado: estado ? 'Activo' : 'Inactivo',
            rol_tenant: rolDestino,
          },
          create: {
            id_usuario: idUsuario!,
            id_tenant: idTenant,
            rol_tenant: rolDestino,
            estado: estado ? 'Activo' : 'Inactivo',
          },
        });
      }

      for (let index = 0; index < colegios.length; index += 1) {
        const colegio = colegios[index];

        await tx.usuarioColegio.upsert({
          where: {
            id_usuario_id_colegio: {
              id_usuario: idUsuario!,
              id_colegio: colegio.id_colegio,
            },
          },
          update: {
            rol_colegio: rolDestino,
            estado: estado ? 'Activo' : 'Inactivo',
            es_principal: index === 0,
          },
          create: {
            id_usuario: idUsuario!,
            id_colegio: colegio.id_colegio,
            rol_colegio: rolDestino,
            estado: estado ? 'Activo' : 'Inactivo',
            es_principal: index === 0,
          },
        });
      }

      return tx.usuario.findUnique({
        where: {
          id_usuario: idUsuario!,
        },
        select: this.credencialUsuarioSelect(),
      });
    });

    return {
      message: existente
        ? 'Credencial actualizada correctamente.'
        : 'Credencial creada correctamente.',
      credencial: this.mapCredencialUsuario(usuario),
    };
  }

  async getTotalDocentes() {
    return this.prisma.docente.count();
  }

  async getAnios(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    return this.prisma.anioLectivo.findMany({
      where: {
        ...this.colegioWhere(scope),
      },
      orderBy: { fecha_inicio: 'desc' },
    });
  }

  async getUltimasMatriculas(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    return this.prisma.matricula.findMany({
      where: {
        ...this.colegioWhere(scope),
      },
      include: {
        colegio: true,
        anio: true,
        registrado_por: {
          select: this.usuarioPublicoSelect(),
        },
        revisado_por: {
          select: this.usuarioPublicoSelect(),
        },
        estudiante: {
          include: {
            persona: {
              select: this.personaBasicaSelect(),
            },
            codigos_colegio: true,
          },
        },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
          },
        },
      },
      orderBy: { fecha_matricula: 'desc' },
      take: 5,
    });
  }

  async getDetalleMatricula(params: ScopeParams & { idMatricula: number }) {
    const scope = await this.resolveScope(params);

    const matricula = await this.prisma.matricula.findFirst({
      where: {
        id_matricula: params.idMatricula,
        ...this.colegioWhere(scope),
      },
      include: {
        tenant: true,
        colegio: true,
        anio: true,
        registrado_por: {
          select: this.usuarioPublicoSelect(),
        },
        revisado_por: {
          select: this.usuarioPublicoSelect(),
        },
        estudiante: {
          include: {
            persona: {
              select: this.personaBasicaSelect(),
            },
            codigos_colegio: true,
            apoderados: {
              include: {
                apoderado: {
                  include: {
                    persona: {
                      select: this.personaBasicaSelect(),
                    },
                  },
                },
              },
            },
          },
        },
        seccion: {
          include: {
            aula: true,
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
        cronogramas: {
          include: {
            concepto: true,
            pagos: {
              include: {
                apoderado: {
                  include: {
                    persona: {
                      select: this.personaBasicaSelect(),
                    },
                  },
                },
                cajero: {
                  select: this.usuarioPublicoSelect(),
                },
              },
            },
          },
          orderBy: {
            fecha_vencimiento: 'asc',
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException('No se encontró la matrícula solicitada.');
    }

    const cronogramaMatricula =
      matricula.cronogramas.find((item) =>
        this.esConceptoMatricula(item.concepto),
      ) || null;

    const cronogramasPensiones = matricula.cronogramas.filter((item) =>
      this.esConceptoPension(item.concepto),
    );

    const cronogramasExtraordinarios = matricula.cronogramas.filter((item) =>
      this.esConceptoExtraordinario(item.concepto),
    );

    const cronogramasIniciales = matricula.cronogramas.filter((item) =>
      this.esConceptoMatricula(item.concepto),
    );

    const totalProgramado = matricula.cronogramas.reduce(
      (acc, item) => acc + this.montoProgramadoCronograma(item),
      0,
    );

    const totalPagado = matricula.cronogramas.reduce((acc, item) => {
      const pagadoConcepto = item.pagos.reduce(
        (sum, pago) => sum + Number(pago.monto_pagado),
        0,
      );

      return acc + pagadoConcepto;
    }, 0);

    return {
      ...matricula,
      resumen_financiero: {
        total_programado: totalProgramado,
        total_pagado: totalPagado,
        saldo: totalProgramado - totalPagado,
        concepto_matricula: cronogramaMatricula,
        estado_pago_matricula:
          cronogramaMatricula?.estado_pago || 'No generado',
      },
      clasificacion_cronogramas: {
        iniciales: cronogramasIniciales,
        pensiones: cronogramasPensiones,
        extraordinarios: cronogramasExtraordinarios,
      },
    };
  }

  // ── GENERAR COBRO DE MATRÍCULA (Para reservas que ya tienen concepto) ──
  async generarCobroMatricula(
    params: ScopeParams & {
      idMatricula: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    await this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.findFirst({
        where: {
          id_matricula: params.idMatricula,
          ...this.colegioWhere(scope),
        },
        include: {
          cronogramas: {
            include: {
              concepto: true,
              pagos: true,
            },
          },
        },
      });

      if (!matricula) {
        throw new NotFoundException('No se encontró la matrícula solicitada.');
      }

      this.asegurarMatriculaNoFinal(matricula, 'generar cobro de matrícula');

      if (matricula.estado_matricula === 'Activo') {
        throw new BadRequestException('La matrícula ya está activa.');
      }

      await this.asegurarCronogramaMatricula(tx, {
        id_matricula: matricula.id_matricula,
        id_anio: matricula.id_anio,
        id_colegio: matricula.id_colegio,
        estado_matricula: matricula.estado_matricula,
      });
    });

    const detalle = await this.getDetalleMatricula({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
      idMatricula: params.idMatricula,
    });

    return {
      message: 'Cobro de matrícula generado correctamente.',
      matricula: detalle,
    };
  }

  // ── COMUNIDAD ESCOLAR: ALUMNOS Y APODERADOS ──────────

  async listarAlumnos(
    params: ScopeParams & {
      q?: string;
      estado?: string;
      nivelId?: number;
      gradoId?: number;
      seccionId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const page = Math.max(
      Number(params.page || 1),
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(params.limit || 10),
        5,
      ),
      50,
    );

    const skip = (
      page - 1
    ) * limit;

    const and:
      Prisma.EstudianteWhereInput[] = [];

    if (scope.colegioIds.length) {
      and.push({
        OR: [
          {
            matriculas: {
              some: {
                id_colegio: {
                  in: scope.colegioIds,
                },
              },
            },
          },
          {
            codigos_colegio: {
              some: {
                id_colegio: {
                  in: scope.colegioIds,
                },
              },
            },
          },
        ],
      });
    } else {
      and.push({
        id_persona: -1,
      });
    }

    const q = params.q?.trim();

    if (q) {
      and.push({
        OR: [
          {
            codigo_estudiante: {
              contains: q,
            },
          },
          {
            codigos_colegio: {
              some: {
                codigo: {
                  contains: q,
                },
              },
            },
          },
          {
            persona: {
              is: {
                OR: [
                  {
                    dni: {
                      contains: q,
                    },
                  },
                  {
                    nombres: {
                      contains: q,
                    },
                  },
                  {
                    apellido_paterno: {
                      contains: q,
                    },
                  },
                  {
                    apellido_materno: {
                      contains: q,
                    },
                  },
                  {
                    telefono: {
                      contains: q,
                    },
                  },
                  {
                    correo: {
                      contains: q,
                    },
                  },
                  {
                    distrito: {
                      contains: q,
                    },
                  },
                ],
              },
            },
          },
          {
            apoderados: {
              some: {
                apoderado: {
                  is: {
                    persona: {
                      is: {
                        OR: [
                          {
                            dni: {
                              contains: q,
                            },
                          },
                          {
                            nombres: {
                              contains: q,
                            },
                          },
                          {
                            apellido_paterno: {
                              contains: q,
                            },
                          },
                          {
                            apellido_materno: {
                              contains: q,
                            },
                          },
                          {
                            telefono: {
                              contains: q,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    /*
     * Todos los filtros académicos se aplican
     * sobre la misma matrícula.
     *
     * Esto evita que el estado corresponda a
     * una matrícula y la sección a otra.
     */
    const matriculaVisibleWhere:
      Prisma.MatriculaWhereInput = {
        id_colegio: {
          in: scope.colegioIds,
        },
      };

    const estadoSolicitado =
      params.estado?.trim()
      || 'Todos';

    const esRegistroIncompleto =
      estadoSolicitado
      === 'Registro incompleto';

    const esInactivoInstitucional =
      estadoSolicitado
      === 'Inactivo';

    const esEstadoAdministrativo =
      esRegistroIncompleto
      || esInactivoInstitucional;

    if (
      estadoSolicitado !== 'Todos'
      && !esEstadoAdministrativo
    ) {
      matriculaVisibleWhere.estado_matricula =
        estadoSolicitado;
    }

    if (params.seccionId) {
      matriculaVisibleWhere.id_seccion =
        params.seccionId;
    }

    if (
      params.gradoId
      || params.nivelId
    ) {
      const seccionWhere:
        Prisma.SeccionWhereInput = {};

      if (params.gradoId) {
        seccionWhere.id_grado =
          params.gradoId;
      }

      if (params.nivelId) {
        seccionWhere.grado = {
          id_nivel:
            params.nivelId,
        };
      }

      matriculaVisibleWhere.seccion =
        seccionWhere;
    }

    if (esRegistroIncompleto) {
      and.push({
        codigos_colegio: {
          some: {
            id_colegio: {
              in: scope.colegioIds,
            },
            estado_institucional:
              'Borrador',
          },
        },
      });
    } else if (
      esInactivoInstitucional
    ) {
      and.push({
        codigos_colegio: {
          some: {
            id_colegio: {
              in: scope.colegioIds,
            },
            estado_institucional:
              'Inactivo',
          },
        },
      });
    } else if (
      estadoSolicitado !== 'Todos'
      || params.nivelId
      || params.gradoId
      || params.seccionId
    ) {
      and.push({
        matriculas: {
          some:
            matriculaVisibleWhere,
        },
      });
    }

    const matriculaIncludeWhere:
      Prisma.MatriculaWhereInput =
        esEstadoAdministrativo
          ? {
              id_colegio: {
                in: scope.colegioIds,
              },
            }
          : matriculaVisibleWhere;

    const where:
      Prisma.EstudianteWhereInput =
        and.length
          ? {
              AND: and,
            }
          : {};

    const [
      total,
      data,
    ] = await this.prisma.$transaction([
      this.prisma.estudiante.count({
        where,
      }),

      this.prisma.estudiante.findMany({
        where,

        include: {
          persona: true,

          codigos_colegio: {
            where: {
              id_colegio: {
                in: scope.colegioIds,
              },
            },
            include: {
              colegio: true,
            },
            orderBy: {
              id_colegio: 'asc',
            },
          },

          apoderados: {
            include: {
              apoderado: {
                include: {
                  persona: true,
                },
              },
            },
          },

          matriculas: {
            where: matriculaIncludeWhere,

            include: {
              colegio: true,
              anio: true,

              seccion: {
                include: {
                  grado: {
                    include: {
                      nivel: true,
                    },
                  },
                },
              },
            },

            orderBy: {
              fecha_matricula: 'desc',
            },

            take: 5,
          },
        },

        orderBy: {
          id_persona: 'desc',
        },

        skip,
        take: limit,
      }),
    ]);

    return {
      data,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(
          1,
          Math.ceil(
            total / limit,
          ),
        ),
      },
    };
  }

  async getDetalleAlumno(params: ScopeParams & { idEstudiante: number }) {
    const scope = await this.resolveScope(params);

    const alumno = await this.prisma.estudiante.findFirst({
      where: {
        id_persona: params.idEstudiante,
        OR: [
          { matriculas: { some: { id_colegio: { in: scope.colegioIds } } } },
          { codigos_colegio: { some: { id_colegio: { in: scope.colegioIds } } } },
        ],
      },
      include: {
        persona: {
          select: this.personaBasicaSelect(),
        },
        codigos_colegio: {
          where: {
            id_colegio: {
              in: scope.colegioIds,
            },
          },
          include: {
            colegio: true,
          },
          orderBy: {
            id_colegio: 'asc',
          },
        },
        apoderados: {
          include: {
            apoderado: {
              include: {
                persona: {
                  select: this.personaBasicaSelect(),
                },
              },
            },
          },
        },
        matriculas: {
          include: {
            colegio: true,
            anio: true,
            seccion: {
              include: { grado: { include: { nivel: true } } },
            },
            registrado_por: {
              select: this.usuarioPublicoSelect(),
            },
            revisado_por: {
              select: this.usuarioPublicoSelect(),
            },
            cronogramas: {
              include: { concepto: true, pagos: true },
            },
          },
          orderBy: { fecha_matricula: 'desc' },
        },
      },
    });

    if (!alumno) {
      throw new NotFoundException('No se encontró el alumno solicitado.');
    }

    return alumno;
  }

  async listarApoderados(
    params: ScopeParams & {
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const page = Math.max(Number(params.page || 1), 1);
    const limit = Math.min(Math.max(Number(params.limit || 10), 5), 50);
    const skip = (page - 1) * limit;

    const and: Prisma.ApoderadoWhereInput[] = [];

    if (scope.colegioIds.length) {
      and.push({
        estudiantes: {
          some: {
            estudiante: {
              is: {
                OR: [
                  {
                    matriculas: {
                      some: {
                        id_colegio: {
                          in: scope.colegioIds,
                        },
                      },
                    },
                  },
                  {
                    codigos_colegio: {
                      some: {
                        id_colegio: {
                          in: scope.colegioIds,
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });
    } else {
      and.push({ id_persona: -1 });
    }

    const q = params.q?.trim();

    if (q) {
      and.push({
        OR: [
          {
            persona: {
              is: {
                OR: [
                  { dni: { contains: q } },
                  { nombres: { contains: q } },
                  { apellido_paterno: { contains: q } },
                  { apellido_materno: { contains: q } },
                  { telefono: { contains: q } },
                  { correo: { contains: q } },
                  { distrito: { contains: q } },
                ],
              },
            },
          },
          {
            estudiantes: {
              some: {
                estudiante: {
                  is: {
                    persona: {
                      is: {
                        OR: [
                          { dni: { contains: q } },
                          { nombres: { contains: q } },
                          { apellido_paterno: { contains: q } },
                          { apellido_materno: { contains: q } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.ApoderadoWhereInput = and.length ? { AND: and } : {};

    const [total, data] = await this.prisma.$transaction([
      this.prisma.apoderado.count({ where }),
      this.prisma.apoderado.findMany({
        where,
        include: {
          persona: {
            include: {
              usuarios: {
                include: {
                  rol: true,
                },
              },
            },
          },
          estudiantes: {
            include: {
              estudiante: {
                include: {
                  persona: true,
                  codigos_colegio: true,
                  matriculas: {
                    include: {
                      colegio: true,
                      anio: true,
                      seccion: {
                        include: {
                          grado: {
                            include: {
                              nivel: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: {
                      fecha_matricula: 'desc',
                    },
                    take: 3,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          id_persona: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const dataConCredencial = data.map((apoderado: any) => {
      const persona = apoderado.persona || {};
      const usuarioApoderado =
        (persona.usuarios || []).find(
          (usuario: any) => usuario.rol?.nombre_rol === 'Apoderado',
        ) || null;

      const { usuarios, ...personaSinUsuarios } = persona;

      return {
        ...apoderado,
        persona: personaSinUsuarios,
        credencial: {
          existe: Boolean(usuarioApoderado),
          estado: Boolean(usuarioApoderado?.estado),
          label: usuarioApoderado
            ? usuarioApoderado.estado
              ? 'Activo'
              : 'Inactivo'
            : 'Sin credencial',
        },
      };
    });

    return {
      data: dataConCredencial,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getDetalleApoderado(params: ScopeParams & { idApoderado: number }) {
    const scope = await this.resolveScope(params);

    const apoderado = await this.prisma.apoderado.findFirst({
      where: {
        id_persona: params.idApoderado,
        estudiantes: {
          some: {
            estudiante: {
              is: {
                OR: [
                  { matriculas: { some: { id_colegio: { in: scope.colegioIds } } } },
                  { codigos_colegio: { some: { id_colegio: { in: scope.colegioIds } } } },
                ],
              },
            },
          },
        },
      },
      include: {
        persona: true,
        estudiantes: {
          include: {
            estudiante: {
              include: {
                persona: true,
                codigos_colegio: true,
                matriculas: {
                  include: {
                    colegio: true,
                    anio: true,
                    seccion: {
                      include: { grado: { include: { nivel: true } } },
                    },
                  },
                  orderBy: { fecha_matricula: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!apoderado) {
      throw new NotFoundException('No se encontró el apoderado solicitado.');
    }

    return apoderado;
  }

  async updateApoderado(idApoderado: number, dto: Partial<CreateApoderadoDto>) {
    const apoderado = await this.prisma.apoderado.findUnique({
      where: { id_persona: idApoderado },
      include: { persona: true },
    });

    if (!apoderado) {
      throw new NotFoundException('No se encontró el apoderado seleccionado.');
    }

    const data: Prisma.PersonaUpdateInput = {};

    if (dto.dni !== undefined) data.dni = dto.dni.trim();
    if (dto.nombres !== undefined) data.nombres = dto.nombres.trim();
    if (dto.apellido_paterno !== undefined) data.apellido_paterno = dto.apellido_paterno.trim();
    if (dto.apellido_materno !== undefined) data.apellido_materno = dto.apellido_materno.trim();
    if (dto.telefono !== undefined) data.telefono = this.normalizeEmpty(dto.telefono);
    if (dto.correo !== undefined) data.correo = this.normalizeEmpty(dto.correo);
    if (dto.direccion !== undefined) data.direccion = this.normalizeEmpty(dto.direccion);
    if (dto.pais !== undefined) data.pais = this.normalizeEmpty(dto.pais) || 'Perú';
    if (dto.departamento !== undefined) data.departamento = this.normalizeEmpty(dto.departamento);
    if (dto.provincia !== undefined) data.provincia = this.normalizeEmpty(dto.provincia);
    if (dto.distrito !== undefined) data.distrito = this.normalizeEmpty(dto.distrito);

    try {
      const persona = await this.prisma.persona.update({
        where: { id_persona: idApoderado },
        data,
      });

      let apoderadoActualizado = apoderado;

      if (dto.ocupacion !== undefined) {
        apoderadoActualizado = await this.prisma.apoderado.update({
          where: { id_persona: idApoderado },
          data: { ocupacion: this.normalizeEmpty(dto.ocupacion) },
          include: { persona: true },
        });
      }

      return {
        id_persona: persona.id_persona,
        dni: persona.dni,
        nombres: persona.nombres,
        apellido_paterno: persona.apellido_paterno,
        apellido_materno: persona.apellido_materno,
        telefono: persona.telefono,
        correo: persona.correo,
        direccion: persona.direccion,
        pais: persona.pais,
        departamento: persona.departamento,
        provincia: persona.provincia,
        distrito: persona.distrito,
        apoderado: {
          id_persona: apoderadoActualizado.id_persona,
          ocupacion: apoderadoActualizado.ocupacion,
        },
      };
    } catch (error) {
      this.handlePersonaPrismaError(error);
    }
  }

  // ── REVISIÓN ADMINISTRATIVA DE MATRÍCULA ─────────────

  async revisarMatricula(
    params: ScopeParams & {
      idMatricula: number;
      estadoRevision: string;
      observacionRevision?: string;
    },
  ) {
    const scope = await this.resolveScope(params);
    const estadoRevision = this.normalizarEstadoRevision(params.estadoRevision);

    const matricula = await this.prisma.matricula.findFirst({
      where: {
        id_matricula: params.idMatricula,
        ...this.colegioWhere(scope),
      },
    });

    if (!matricula) {
      throw new NotFoundException('No se encontró la matrícula solicitada.');
    }

    if (this.esMatriculaFinal(matricula)) {
      throw new BadRequestException(
        `No se puede modificar la revisión porque la matrícula está cerrada. Estado: ${matricula.estado_matricula}. Revisión: ${matricula.estado_revision}.`,
      );
    }

    if (estadoRevision === 'Observado' && !this.normalizeEmpty(params.observacionRevision)) {
      throw new BadRequestException('Para observar una matrícula debes ingresar una observación.');
    }

    const actualizada = await this.prisma.matricula.update({
      where: { id_matricula: params.idMatricula },
      data: {
        estado_revision: estadoRevision,
        estado_matricula:
          estadoRevision === 'Rechazado'
            ? 'Anulado'
            : undefined,
        id_usuario_revision: params.userId,
        fecha_revision: new Date(),
        observacion_revision: this.normalizeEmpty(params.observacionRevision),
      },
      include: {
        colegio: true,
        anio: true,
        registrado_por: {
          select: this.usuarioPublicoSelect(),
        },
        revisado_por: {
          select: this.usuarioPublicoSelect(),
        },
        estudiante: {
          include: {
            persona: {
              select: this.personaBasicaSelect(),
            },
            codigos_colegio: true,
            apoderados: {
              include: {
                apoderado: {
                  include: {
                    persona: {
                      select: this.personaBasicaSelect(),
                    },
                  },
                },
              },
            },
          },
        },
        seccion: {
          include: {
            aula: true,
            grado: { include: { nivel: true } },
          },
        },
        cronogramas: {
          include: {
            concepto: true,
            pagos: {
              include: {
                apoderado: {
                  include: {
                    persona: {
                      select: this.personaBasicaSelect(),
                    },
                  },
                },
                cajero: {
                  select: this.usuarioPublicoSelect(),
                },
              },
            },
          },
          orderBy: { fecha_vencimiento: 'asc' },
        },
      },
    });

    return {
      message: `Matrícula marcada como ${estadoRevision}.`,
      matricula: actualizada,
    };
  }

  // ── PAGO DE MATRÍCULA Y ACTIVACIÓN ──────────────────

  async registrarPagoMatricula(
    params: ScopeParams & {
      idMatricula: number;
      idApoderado: number;
      montoPagado: number;
      metodoPago?: string;
      nroOperacion?: string;
      activarAutomaticamente?: boolean;
    },
  ) {
    const scope = await this.resolveScope(params);

    if (!params.idApoderado) {
      throw new BadRequestException('Selecciona el apoderado que realiza el pago.');
    }

    const monto = Number(params.montoPagado);

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('El monto pagado debe ser mayor a cero.');
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.findFirst({
        where: {
          id_matricula: params.idMatricula,
          ...this.colegioWhere(scope),
        },
        include: {
          anio: true,
          estudiante: {
            include: {
              apoderados: true,
            },
          },
          cronogramas: {
            include: {
              concepto: true,
              pagos: true,
            },
          },
        },
      });

      if (!matricula) {
        throw new NotFoundException('No se encontró la matrícula solicitada.');
      }

      this.asegurarMatriculaNoFinal(matricula, 'registrar pagos');

      if (matricula.estado_revision !== 'Aprobado') {
        throw new BadRequestException(
          'Solo se puede registrar el pago de matrícula cuando la revisión está aprobada.',
        );
      }

      if (matricula.estado_matricula === 'Activo') {
        throw new BadRequestException('La matrícula ya está activa.');
      }

      const apoderadoVinculado = matricula.estudiante.apoderados.some(
        (rel) => rel.id_apoderado === params.idApoderado,
      );

      if (!apoderadoVinculado) {
        throw new BadRequestException(
          'El apoderado seleccionado no está vinculado al alumno.',
        );
      }

      const { cronograma: cronogramaMatricula } =
        await this.asegurarCronogramaMatricula(tx, {
          id_matricula: matricula.id_matricula,
          id_anio: matricula.id_anio,
          id_colegio: matricula.id_colegio,
          estado_matricula: matricula.estado_matricula,
        });

      if (cronogramaMatricula.estado_pago === 'Pagado') {
        throw new BadRequestException('El pago de matrícula ya fue registrado.');
      }

      const totalMatricula = this.montoProgramadoCronograma(cronogramaMatricula);
      const pagadoActual = cronogramaMatricula.pagos.reduce(
        (acc, pago) => acc + Number(pago.monto_pagado),
        0,
      );
      const saldo = totalMatricula - pagadoActual;

      if (monto > saldo) {
        throw new BadRequestException(
          `El monto ingresado excede el saldo pendiente de matrícula. Saldo: S/ ${saldo.toFixed(2)}.`,
        );
      }

      await tx.pagoTransaccion.create({
        data: {
          id_cronograma: cronogramaMatricula.id_cronograma,
          id_apoderado: params.idApoderado,
          id_usuario_cajero: params.userId,
          monto_pagado: monto,
          metodo_pago: this.normalizeEmpty(params.metodoPago),
          nro_operacion: this.normalizeEmpty(params.nroOperacion),
        },
      });

      const nuevoTotalPagado = pagadoActual + monto;
      const pagoCompleto = nuevoTotalPagado >= totalMatricula;

      await tx.cronogramaPagos.update({
        where: { id_cronograma: cronogramaMatricula.id_cronograma },
        data: {
          estado_pago: pagoCompleto ? 'Pagado' : 'Parcial',
        },
      });

      let activada = false;
      let pensionesCreadas = 0;

      if (pagoCompleto && params.activarAutomaticamente !== false) {
        await tx.matricula.update({
          where: { id_matricula: matricula.id_matricula },
          data: {
            estado_matricula: 'Activo',
          },
        });

        pensionesCreadas = 0;

        activada = true;
      }

      return {
        pagoCompleto,
        activada,
        pensionesCreadas,
      };
    });

    const detalle = await this.getDetalleMatricula({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
      idMatricula: params.idMatricula,
    });

    return {
      message: resultado.activada
        ? 'Pago de matrícula registrado. La matrícula fue activada correctamente.'
        : resultado.pagoCompleto
          ? 'Pago de matrícula registrado. La matrícula está lista para activarse.'
          : 'Pago parcial registrado correctamente.',
      ...resultado,
      matricula: detalle,
    };
  }

  async activarMatricula(
    params: ScopeParams & {
      idMatricula: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.findFirst({
        where: {
          id_matricula: params.idMatricula,
          ...this.colegioWhere(scope),
        },
        include: {
          anio: true,
          cronogramas: {
            include: {
              concepto: true,
              pagos: true,
            },
          },
        },
      });

      if (!matricula) {
        throw new NotFoundException('No se encontró la matrícula solicitada.');
      }

      this.asegurarMatriculaNoFinal(matricula, 'activar la matrícula');

      if (matricula.estado_revision !== 'Aprobado') {
        throw new BadRequestException(
          'La matrícula debe estar aprobada administrativamente antes de activarse.',
        );
      }

      if (matricula.estado_matricula === 'Activo') {
        return {
          activada: false,
          pensionesCreadas: 0,
          message: 'La matrícula ya estaba activa.',
        };
      }

      const { cronograma: cronogramaMatricula } =
        await this.asegurarCronogramaMatricula(tx, {
          id_matricula: matricula.id_matricula,
          id_anio: matricula.id_anio,
          id_colegio: matricula.id_colegio,
          estado_matricula: matricula.estado_matricula,
        });

      if (!cronogramaMatricula || cronogramaMatricula.estado_pago !== 'Pagado') {
        throw new BadRequestException(
          'No se puede activar la matrícula hasta que el pago de matrícula figure como Pagado.',
        );
      }

      await tx.matricula.update({
        where: { id_matricula: matricula.id_matricula },
        data: {
          estado_matricula: 'Activo',
        },
      });

      const pensionesCreadas = 0;

      return {
        activada: true,
        pensionesCreadas,
        message: 'Matrícula activada correctamente.',
      };
    });

    const detalle = await this.getDetalleMatricula({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId,
      idMatricula: params.idMatricula,
    });

    return {
      ...resultado,
      matricula: detalle,
    };
  }

  // ── FIN PAGO Y ACTIVACIÓN ───────────────────────────

  async getDirectorioStaff(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { persona: { include: { apoderados: true } } },
    });

    const apoderadoId = usuario?.persona?.apoderados?.[0]?.id_persona;
    if (!apoderadoId) throw new NotFoundException('Apoderado no encontrado');

    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderadoId },
      select: { id_estudiante: true },
    });

    const estudianteIds = relaciones.map((r) => r.id_estudiante);

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: { in: estudianteIds },
        estado_matricula: 'Activo',
      },
      select: {
        id_seccion: true,
        id_anio: true,
      },
    });

    const seccionIds = [
      ...new Set(matriculas.map((m) => m.id_seccion)),
    ];

    const anioIds = [
      ...new Set(matriculas.map((m) => m.id_anio)),
    ];

    const staffPorSeccion = await this.prisma.staff.findMany({
      where: {
        OR: [
          { id_seccion: { in: seccionIds } },
          { area: 'administrativa' },
          { area: 'salud' },
          { area: 'servicios' },
          { area: 'academica', id_seccion: null },
        ],
      },
      include: {
        persona: true,
        seccion: { include: { grado: { include: { nivel: true } } } },
      },
    });

    const resultado: any[] = [];

    for (const staff of staffPorSeccion) {
      const item: any = {
        id_staff: staff.id_staff,
        id_persona: staff.id_persona,
        nombre: `${staff.persona.nombres} ${staff.persona.apellido_paterno}`,
        cargo: staff.cargo,
        area: staff.area,
        telefono: staff.persona.telefono,
        permite_citas: staff.permite_citas,
        avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
          staff.persona.nombres,
        )}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`,
      };

      if (
        staff.cargo === 'Docente' ||
        staff.cargo === 'Tutor' ||
        staff.cargo === 'Profesor de Taller' ||
        staff.cargo === 'Auxiliar de Educación'
      ) {
        const docente = await this.prisma.docente.findUnique({
          where: { id_persona: staff.id_persona },
          include: {
            asignaciones: {
              where: {
                id_seccion: { in: seccionIds },
                id_anio: { in: anioIds },
              },
              include: { curso: true },
            },
            horarios: {
              where: {
                id_seccion: { in: seccionIds },
                id_anio: { in: anioIds },
              },
              include: { curso: true },
              orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
            },
          },
        });

        if (docente) {
          item.cursos = [
            ...new Set(
              docente.asignaciones.map((a) => a.curso.nombre_curso),
            ),
          ];

          const diasSemana = [
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
          ];

          const horarioPorDia: Record<
            string,
            { hora_inicio: string; hora_fin: string; curso: string }[]
          > = {};

          for (const h of docente.horarios) {
            const dia = diasSemana[h.dia_semana - 1];
            if (!horarioPorDia[dia]) horarioPorDia[dia] = [];

            horarioPorDia[dia].push({
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              curso: h.curso.nombre_curso,
            });
          }

          item.horario = horarioPorDia;
        }
      }

      resultado.push(item);
    }

    return resultado;
  }

  async getSeccionAlumno(alumnoId: number) {
    const matricula = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      select: {
        id_seccion: true,
        seccion: {
          select: {
            letra: true,
            grado: {
              select: {
                nombre_grado: true,
                nivel: { select: { nombre_nivel: true } },
              },
            },
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException('No se encontró matrícula activa');
    }

    return matricula;
  }

  // ── CAMPAÑAS DE MATRÍCULA ────────────────────────────
  async listarCampanasMatricula(
    params: ScopeParams & {
      idAnio?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    return this.prisma.campanaMatricula.findMany({
      where: {
        ...this.colegioWhere(scope),
        ...(params.idAnio ? { id_anio: params.idAnio } : {}),
      },
      include: {
        colegio: true,
        anio: true,
      },
      orderBy: [{ fecha_inicio: 'desc' }, { id_campana: 'desc' }],
    });
  }

  async crearCampanaMatricula(
    params: ScopeParams & {
      body: {
        id_anio: number;
        id_colegio?: number;
        nombre: string;
        descripcion?: string;
        fecha_inicio: string;
        fecha_fin: string;
        monto_promocional?: number;
        descuento_monto?: number;
        tipo_ingreso_aplica?: string;
        solo_alumnos_vigentes?: boolean;
        estado?: string;
      };
    },
  ) {
    const scope = await this.resolveScope({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId || params.body.id_colegio,
    });

    if (scope.tipo !== 'colegio' || scope.colegioIds.length !== 1) {
      throw new BadRequestException('Selecciona un colegio específico para crear la campaña.');
    }

    const idColegio = scope.colegioIds[0];
    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: Number(params.body.id_anio),
        id_colegio: idColegio,
      },
    });

    if (!anio) {
      throw new BadRequestException('El año lectivo no pertenece al colegio seleccionado.');
    }

    const fechaInicio = new Date(`${params.body.fecha_inicio}T00:00:00`);
    const fechaFin = new Date(`${params.body.fecha_fin}T00:00:00`);

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      throw new BadRequestException('Las fechas de campaña no son válidas.');
    }

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
    }

    if (
      params.body.monto_promocional === undefined &&
      params.body.descuento_monto === undefined
    ) {
      throw new BadRequestException('Ingresa un monto promocional o un descuento.');
    }

    return this.prisma.campanaMatricula.create({
      data: {
        id_tenant: scope.tenantId,
        id_colegio: idColegio,
        id_anio: Number(params.body.id_anio),
        nombre: params.body.nombre.trim(),
        descripcion: this.normalizeEmpty(params.body.descripcion),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        monto_promocional:
          params.body.monto_promocional !== undefined
            ? Number(params.body.monto_promocional)
            : undefined,
        descuento_monto:
          params.body.descuento_monto !== undefined
            ? Number(params.body.descuento_monto)
            : undefined,
        tipo_ingreso_aplica:
          this.normalizeEmpty(params.body.tipo_ingreso_aplica) ||
          'Renovación,Renovación con cambio de sede',
        solo_alumnos_vigentes: params.body.solo_alumnos_vigentes ?? true,
        estado: params.body.estado || 'Activo',
      },
      include: {
        colegio: true,
        anio: true,
      },
    });
  }
}