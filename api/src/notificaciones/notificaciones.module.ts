import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService]
})
export class NotificacionesModule {}
