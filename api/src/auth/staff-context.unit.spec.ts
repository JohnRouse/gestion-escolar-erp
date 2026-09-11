import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AuthService } from './auth.service';

type ContextCase = {
  name: string;
  role: string;
  docente: boolean;
  staff: boolean;
  tutor: boolean;
  cargo: string;
};

type DashboardContextHarness = {
  getContextoBase: (
    userId: number,
    anioIds: number[],
    scope: {
      tipo: 'colegio';
      tenantId: number;
      colegioIds: number[];
      colegios: never[];
      puedeVerConsolidado: boolean;
    },
  ) => Promise<{
    docente: object | null;
    staff: { cargo: string; id_colegio: number } | null;
    tutoria: {
      es_tutor: boolean;
      secciones: { id_colegio: number | null }[];
    };
  }>;
};

const cases: ContextCase[] = [
  {
    name: 'Docente puro',
    role: 'Profesor',
    docente: true,
    staff: false,
    tutor: false,
    cargo: 'Docente',
  },
  {
    name: 'Tutor académico',
    role: 'Profesor',
    docente: true,
    staff: false,
    tutor: true,
    cargo: 'Docente',
  },
  {
    name: 'Staff puro',
    role: 'Secretaria',
    docente: false,
    staff: true,
    tutor: false,
    cargo: 'Secretaría',
  },
  {
    name: 'Directora y Docente',
    role: 'Director',
    docente: true,
    staff: true,
    tutor: true,
    cargo: 'Directora',
  },
];

function contextUser(testCase: ContextCase) {
  const academicSchoolId = testCase.staff && testCase.tutor ? 11 : 10;
  const section = {
    id_seccion: 100,
    id_tenant: 1,
    id_colegio: academicSchoolId,
    letra: 'A',
    colegio: { id_colegio: academicSchoolId, nombre: 'Colegio académico' },
    grado: {
      nombre_grado: 'Primero',
      nivel: { nombre_nivel: 'Primaria' },
    },
  };
  const staffRecord =
    testCase.staff || testCase.tutor
      ? {
          id_staff: 30,
          id_tenant: 1,
          id_colegio: 10,
          cargo: testCase.staff ? testCase.cargo : 'Tutor',
          area: testCase.staff ? 'Dirección' : 'Tutoría',
          es_tutor: testCase.tutor,
          es_miembro_staff: testCase.staff,
          permite_citas: true,
          id_seccion: testCase.tutor ? section.id_seccion : null,
          colegio: { id_colegio: 10, nombre: 'Colegio institucional' },
          seccion: testCase.tutor ? section : null,
        }
      : null;

  return {
    id_usuario: 1,
    id_persona: 20,
    username: 'context.test',
    avatar_url: null,
    rol: { nombre_rol: testCase.role },
    persona: {
      id_persona: 20,
      nombres: 'Persona',
      apellido_paterno: 'Compartida',
      apellido_materno: 'Prueba',
      correo: null,
      docentes: testCase.docente ? [{ id_persona: 20, asignaciones: [] }] : [],
      staff: staffRecord ? [staffRecord] : [],
    },
  };
}

describe.each(cases)(
  '$name: separación de contexto Staff/Docente',
  (testCase) => {
    it('mantiene separados los contextos de Auth', async () => {
      const prisma = {
        usuario: {
          findUnique: jest.fn().mockResolvedValue(contextUser(testCase)),
        },
        usuarioColegio: { findMany: jest.fn().mockResolvedValue([]) },
        usuarioTenant: { findFirst: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;
      const service = new AuthService(prisma, {} as never);

      const result = await service.getContexto(1);

      expect(Boolean(result.docente)).toBe(testCase.docente);
      expect(Boolean(result.staff)).toBe(testCase.staff);
      expect(result.tutoria.es_tutor).toBe(testCase.tutor);
      expect(result.cargo_principal).toBe(testCase.cargo);
      if (testCase.staff && testCase.tutor) {
        expect(result.staff?.id_colegio).toBe(10);
        expect(result.tutoria.secciones[0]?.id_colegio).toBe(11);
      }
    });

    it('mantiene separados los contextos base del Dashboard', async () => {
      const prisma = {
        usuario: {
          findUnique: jest.fn().mockResolvedValue(contextUser(testCase)),
        },
      } as unknown as PrismaService;
      const service = new DashboardService(prisma);
      const harness = service as unknown as DashboardContextHarness;

      const result = await harness.getContextoBase(1, [1], {
        tipo: 'colegio',
        tenantId: 1,
        colegioIds: [10],
        colegios: [],
        puedeVerConsolidado: false,
      });

      expect(Boolean(result.docente)).toBe(testCase.docente);
      expect(Boolean(result.staff)).toBe(testCase.staff);
      expect(result.tutoria.es_tutor).toBe(testCase.tutor);
      if (testCase.staff) expect(result.staff?.cargo).toBe(testCase.cargo);
      if (testCase.staff && testCase.tutor) {
        expect(result.staff?.id_colegio).toBe(10);
        expect(result.tutoria.secciones[0]?.id_colegio).toBe(11);
      }
    });
  },
);
