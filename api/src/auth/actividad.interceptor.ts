import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActividadInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (userId) {
      // Actualizar última conexión de forma asíncrona sin esperar
      this.prisma.usuario.update({
        where: { id_usuario: userId },
        data: { ultima_conexion: new Date() },
      }).catch(() => {});
    }
    return next.handle();
  }
}