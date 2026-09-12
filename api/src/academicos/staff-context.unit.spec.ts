import { PrismaService } from '../prisma/prisma.service';
import { AcademicosService } from './academicos.service';

describe.each([
  {
    name: 'Staff con doble función',
    esMiembroStaff: true,
    expectedScope: {},
  },
  {
    name: 'Tutor técnico puro',
    esMiembroStaff: false,
    expectedScope: { id_tenant: 1, id_colegio: 11 },
  },
])('$name al asignar Tutoría', ({ esMiembroStaff, expectedScope }) => {
  it('conserva el alcance institucional y solo mueve el técnico académico', async () => {
    let updateData: Record<string, unknown> | undefined;
    const transactionStaff = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue({
        id_staff: 30,
        es_miembro_staff: esMiembroStaff,
      }),
      update: jest.fn((input: { data: Record<string, unknown> }) => {
        updateData = input.data;
        return Promise.resolve({});
      }),
      create: jest.fn(),
    };
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({
          rol: { nombre_rol: 'Director' },
          colegios: [
            {
              es_principal: true,
              colegio: {
                id_colegio: 11,
                id_tenant: 1,
                nombre: 'Colegio académico',
                nombre_corto: null,
                codigo: null,
              },
            },
          ],
        }),
      },
      seccion: {
        findFirst: jest.fn().mockResolvedValue({
          id_seccion: 100,
          id_tenant: 1,
          id_colegio: 11,
          letra: 'A',
          colegio: { nombre: 'Colegio académico' },
          grado: {
            nombre_grado: 'Primero',
            nivel: { nombre_nivel: 'Primaria' },
          },
        }),
      },
      docente: {
        findUnique: jest.fn().mockResolvedValue({
          id_persona: 20,
          persona: {
            nombres: 'Persona',
            apellido_paterno: 'Compartida',
            apellido_materno: 'Prueba',
          },
        }),
      },
      $transaction: (
        callback: (tx: { staff: typeof transactionStaff }) => Promise<unknown>,
      ) => callback({ staff: transactionStaff }),
    } as unknown as PrismaService;
    const service = new AcademicosService(prisma);

    await service.asignarTutorSeccion({
      userId: 1,
      rol: 'Director',
      colegioId: 11,
      idSeccion: 100,
      idDocente: 20,
    });

    expect(updateData).toEqual({
      ...expectedScope,
      id_seccion: 100,
      es_tutor: true,
      permite_citas: true,
    });
    expect(transactionStaff.create).not.toHaveBeenCalled();
  });
});

describe('Tutoría visible en el directorio de Docentes', () => {
  const mapDocente = (staffAssignments: object[]) => {
    const service = new AcademicosService({} as PrismaService);
    return (
      service as unknown as {
        mapDocenteCrudGestion: (docente: object) => {
          tutorias_resumen: { seccion: string }[];
        };
      }
    ).mapDocenteCrudGestion({
      id_persona: 20,
      fecha_ingreso: null,
      persona: {
        dni: '12345678',
        nombres: 'Docente',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Tutoría',
        usuarios: [],
        staff: staffAssignments,
      },
      especialidades: [],
      asignaciones: [],
      _count: { asignaciones: 0, horarios: 0 },
    });
  };

  it('expone Tutor únicamente desde una asignación académica real', () => {
    const docente = mapDocente([
      {
        es_tutor: true,
        colegio: null,
        seccion: {
          id_seccion: 100,
          letra: 'A',
          colegio: { id_colegio: 10, nombre: 'Colegio académico' },
          grado: {
            nombre_grado: '5to Grado',
            nivel: { nombre_nivel: 'Primaria' },
          },
        },
      },
    ]);

    expect(docente.tutorias_resumen).toEqual([
      expect.objectContaining({ seccion: '5to Grado "A"' }),
    ]);
  });

  it('no expone Tutor cuando el docente no tiene Tutoría asignada', () => {
    const docente = mapDocente([
      {
        es_tutor: false,
        colegio: null,
        seccion: {
          id_seccion: 100,
          letra: 'A',
        },
      },
    ]);

    expect(docente.tutorias_resumen).toEqual([]);
  });
});
