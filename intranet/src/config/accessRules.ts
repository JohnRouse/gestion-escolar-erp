export type ModuleAccessKey =
  | 'asistencia'
  | 'calendario'
  | 'horario'
  | 'notas'
  | 'tutoria';

type UserForAccess = {
  rol?: string | null;
  contexto?: {
    tutoria?: {
      es_tutor?: boolean;
      secciones?: unknown[];
    } | null;
  } | null;
} | null | undefined;

type ModuleAccessRule = {
  roles: string[];
  profesorRequiereTutoria?: boolean;
};

export const MODULE_ACCESS_RULES: Record<ModuleAccessKey, ModuleAccessRule> = {
  asistencia: {
    roles: ['Profesor', 'Admin', 'Director'],
  },
  calendario: {
    // Profesor entra por /horario, que redirige a /calendario.
    roles: ['Profesor', 'Admin', 'Secretaria', 'Director'],
  },
  horario: {
    roles: ['Profesor'],
  },
  notas: {
    roles: ['Profesor', 'Admin', 'Director'],
  },
  tutoria: {
    roles: ['Profesor', 'Admin', 'Director'],
    profesorRequiereTutoria: true,
  },
};

export function hasRole(user: UserForAccess, roles: string[]) {
  return Boolean(user?.rol && roles.includes(user.rol));
}

export function userHasTutoriaContext(user: UserForAccess) {
  return (
    Boolean(user?.contexto?.tutoria?.es_tutor) ||
    Boolean(user?.contexto?.tutoria?.secciones?.length)
  );
}

export function canAccessTutoria(user: UserForAccess) {
  if (!user?.rol) return false;

  if (user.rol === 'Profesor') {
    return userHasTutoriaContext(user);
  }

  return ['Admin', 'Director'].includes(user.rol);
}

export function canAccessModule(user: UserForAccess, module: ModuleAccessKey) {
  const rule = MODULE_ACCESS_RULES[module];

  if (!rule || !hasRole(user, rule.roles)) {
    return false;
  }

  if (module === 'tutoria' && rule.profesorRequiereTutoria) {
    return canAccessTutoria(user);
  }

  return true;
}
