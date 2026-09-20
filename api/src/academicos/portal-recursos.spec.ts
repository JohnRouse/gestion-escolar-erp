/* eslint-disable */
import { NotFoundException } from '@nestjs/common';
import { AcademicosService } from './academicos.service';
import { AsistenciaService } from './asistencia/asistencia.service';
import { CalificacionesService } from '../calificaciones/calificaciones.service';
import { FinanzasService } from '../finanzas/finanzas.service';

describe('Recursos académicos y financieros del portal', () => {
  test('1. hijos devuelve solo relaciones del Apoderado autenticado', async () => {
    const prisma: any = {
      apoderadoEstudiante: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_estudiante: 40,
            estudiante: {
              avatar_url: null,
              persona: { nombres: 'Hija', apellido_paterno: 'Propia' },
              matriculas: [
                {
                  id_matricula: 90,
                  id_tenant: 1,
                  id_colegio: 10,
                  id_anio: 100,
                  colegio: { id_tenant: 1, nombre: 'Institución' },
                  anio: {
                    nombre_anio: '2026',
                    fecha_inicio: new Date('2026-03-01'),
                    fecha_fin: new Date('2026-12-20'),
                  },
                  seccion: {
                    id_colegio: 10,
                    letra: 'A',
                    colegio: { id_tenant: 1, nombre: 'Institución' },
                    grado: {
                      nombre_grado: 'Quinto',
                      nivel: { nombre_nivel: 'Primaria' },
                    },
                  },
                },
              ],
            },
          },
        ]),
      },
    };
    const service = new AcademicosService(prisma);
    await expect(service.getHijosApoderado(80)).resolves.toEqual([
      expect.objectContaining({ id_estudiante: 40, id_matricula: 90 }),
    ]);
    expect(prisma.apoderadoEstudiante.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_apoderado: 80 } }),
    );
    expect(
      prisma.apoderadoEstudiante.findMany.mock.calls[0][0].include.estudiante
        .include.matriculas.where.estado_matricula,
    ).toEqual({ in: ['Activo', 'Matriculado', 'Pre-matriculado'] });
  });

  test('2. asistencia de hijo propio usa vínculo y matrículas operativas', async () => {
    const prisma: any = {
      matricula: {
        findMany: jest.fn().mockResolvedValue([
          {
            asistencias: [
              { fecha: new Date('2026-09-01'), estado: 'Presente' },
            ],
          },
        ]),
      },
    };
    const service = new AsistenciaService(prisma, {} as any);
    await expect(
      service.getAsistenciaAlumno(80, 40, '2026-01-01', '2026-12-31'),
    ).resolves.toEqual([{ fecha: '2026-09-01', estado: 'Presente' }]);
    expect(prisma.matricula.findMany.mock.calls[0][0].where).toMatchObject({
      id_estudiante: 40,
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
      estado_matricula: {
        in: ['Activo', 'Matriculado', 'Pre-matriculado'],
      },
    });
  });

  test('3. asistencia de alumno ajeno responde 404 sin datos', async () => {
    const prisma: any = {
      matricula: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AsistenciaService(prisma, {} as any);
    await expect(
      service.getAsistenciaAlumno(80, 999, '2026-01-01', '2026-12-31'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('4. notas de hijo propio validan el vínculo antes de consultar', async () => {
    const prisma: any = {
      apoderadoEstudiante: {
        findUnique: jest.fn().mockResolvedValue({ id_estudiante: 40 }),
      },
      matricula: {
        findFirst: jest.fn().mockResolvedValue({
          id_matricula: 90,
          id_anio: 100,
        }),
      },
      bimestre: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CalificacionesService(prisma, {} as any);
    await expect(service.getNotasAlumno(80, 40, 1)).resolves.toEqual([]);
    expect(prisma.apoderadoEstudiante.findUnique).toHaveBeenCalledWith({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: 80,
          id_estudiante: 40,
        },
      },
      select: { id_estudiante: true },
    });
  });

  test('5. notas de alumno ajeno son rechazadas', async () => {
    const prisma: any = {
      apoderadoEstudiante: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new CalificacionesService(prisma, {} as any);
    await expect(service.getNotasAlumno(80, 999, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test.each(['Activo', 'Matriculado', 'Pre-matriculado'])(
    'alertas acepta matrícula operativa %s y devuelve vacío sin bimestres',
    async (estado) => {
      const prisma: any = {
        apoderadoEstudiante: {
          findUnique: jest.fn().mockResolvedValue({ id_estudiante: 40 }),
        },
        matricula: {
          findFirst: jest.fn().mockResolvedValue({
            id_matricula: 90,
            id_anio: 100,
            id_seccion: 30,
            estado_matricula: estado,
          }),
        },
        bimestre: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const service = new CalificacionesService(prisma, {} as any);

      await expect(service.getAlertasAcademicas(80, 40)).resolves.toEqual([]);
      expect(prisma.matricula.findFirst.mock.calls[0][0].where).toMatchObject({
        id_estudiante: 40,
        estado_matricula: {
          in: ['Activo', 'Matriculado', 'Pre-matriculado'],
        },
      });
    },
  );

  test.each(['Inactivo', 'Reserva'])(
    'alertas excluye matrícula no operativa %s',
    async () => {
      const prisma: any = {
        apoderadoEstudiante: {
          findUnique: jest.fn().mockResolvedValue({ id_estudiante: 40 }),
        },
        matricula: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const service = new CalificacionesService(prisma, {} as any);

      await expect(
        service.getAlertasAcademicas(80, 40),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  test('alertas de alumno ajeno siguen rechazadas antes de consultar matrícula', async () => {
    const prisma: any = {
      apoderadoEstudiante: { findUnique: jest.fn().mockResolvedValue(null) },
      matricula: { findFirst: jest.fn() },
    };
    const service = new CalificacionesService(prisma, {} as any);

    await expect(
      service.getAlertasAcademicas(80, 999),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.matricula.findFirst).not.toHaveBeenCalled();
  });

  test('6. estado de cuenta propio filtra conceptos no visibles al portal', async () => {
    const prisma: any = {
      matricula: {
        findFirst: jest.fn().mockResolvedValue({ id_matricula: 90 }),
      },
    };
    const service = new FinanzasService(prisma, {} as any);
    jest.spyOn(service, 'getEstadoCuenta').mockResolvedValue({
      deudas: [
        { visible_apoderado: true, estado: 'Pendiente', saldo: 120 },
        { visible_apoderado: false, estado: 'Pendiente', saldo: 900 },
      ],
    } as any);
    await expect(service.getEstadoCuentaPadre(80, 40)).resolves.toMatchObject({
      total_pendiente: 120,
      deudas: [{ visible_apoderado: true, estado: 'Pendiente', saldo: 120 }],
    });
    expect(prisma.matricula.findFirst.mock.calls[0][0].where).toMatchObject({
      id_estudiante: 40,
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
    });
  });

  test('7. estado de cuenta de alumno ajeno es rechazado', async () => {
    const prisma: any = {
      matricula: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new FinanzasService(prisma, {} as any);
    await expect(service.getEstadoCuentaPadre(80, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('8. horario propio usa vínculo y matrícula operativa', async () => {
    const prisma: any = {
      matricula: {
        findFirst: jest.fn().mockResolvedValue({
          id_matricula: 90,
          id_seccion: 30,
          id_anio: 100,
        }),
      },
      horario: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AcademicosService(prisma);

    await expect(service.getHorarioAlumno(80, 40)).resolves.toEqual({});
    expect(prisma.matricula.findFirst.mock.calls[0][0].where).toMatchObject({
      id_estudiante: 40,
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
      estado_matricula: {
        in: ['Activo', 'Matriculado', 'Pre-matriculado'],
      },
    });
  });

  test('9. horario de alumno ajeno es rechazado', async () => {
    const prisma: any = {
      matricula: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AcademicosService(prisma);

    await expect(service.getHorarioAlumno(80, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('10. avatar de hijo se actualiza por vínculo compuesto', async () => {
    const prisma: any = {
      apoderadoEstudiante: {
        findUnique: jest.fn().mockResolvedValue({ id_estudiante: 40 }),
      },
      estudiante: {
        update: jest.fn().mockResolvedValue({
          id_persona: 40,
          avatar_url: 'https://example.test/avatar.png',
        }),
      },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.updateAvatarHijo(80, 40, 'https://example.test/avatar.png'),
    ).resolves.toMatchObject({ id_persona: 40 });
    expect(prisma.apoderadoEstudiante.findUnique).toHaveBeenCalledWith({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: 80,
          id_estudiante: 40,
        },
      },
    });
  });

  test('11. avatar de alumno ajeno es rechazado', async () => {
    const prisma: any = {
      apoderadoEstudiante: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new AcademicosService(prisma);

    await expect(
      service.updateAvatarHijo(80, 999, 'https://example.test/avatar.png'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
