import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor?.value) {
      Reflect.defineMetadata(
        'roles',
        roles,
        descriptor.value,
      );

      return descriptor;
    }

    Reflect.defineMetadata('roles', roles, target);
    return target;
  };
};

function normalizeRole(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  const compact = normalized.replace(/\s+/g, '');

  if (
    normalized === 'admin' ||
    normalized === 'administrador' ||
    normalized === 'administrador del sistema' ||
    compact === 'superadmin' ||
    compact === 'superadministrador' ||
    compact === 'superadminsaas'
  ) {
    return 'admin';
  }

  if (
    normalized === 'director' ||
    normalized === 'direccion'
  ) {
    return 'director';
  }

  if (
    normalized === 'profesor' ||
    normalized === 'docente'
  ) {
    return 'profesor';
  }

  if (
    normalized === 'secretaria' ||
    normalized === 'tesoreria'
  ) {
    return 'secretaria';
  }

  if (
    normalized === 'apoderado' ||
    normalized === 'padre' ||
    normalized === 'madre' ||
    normalized === 'tutor'
  ) {
    return 'apoderado';
  }

  if (
    normalized === 'alumno' ||
    normalized === 'estudiante'
  ) {
    return 'alumno';
  }

  return normalized;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        'roles',
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const userRole = normalizeRole(
      request.user?.rol,
    );

    if (!userRole) {
      return false;
    }

    return requiredRoles.some(
      (requiredRole) =>
        normalizeRole(requiredRole) === userRole,
    );
  }
}
