import { Module, Global } from '@nestjs/common';  // 👈 Añadir Global
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesPortalController } from './notificaciones-portal.controller';

@Global()
@Module({
  providers: [NotificacionesService],
  controllers: [NotificacionesPortalController, NotificacionesController],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
