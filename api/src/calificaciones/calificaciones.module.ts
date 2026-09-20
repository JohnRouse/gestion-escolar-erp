import { Module } from '@nestjs/common';
import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService } from './calificaciones.service';
import { CalificacionesPadresController } from './calificaciones-padres.controller';

@Module({
  controllers: [CalificacionesPadresController, CalificacionesController],
  providers: [CalificacionesService]
})
export class CalificacionesModule {}
