import { Module } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';

@Module({
  providers: [ActividadService],
  controllers: [ActividadController],
})
export class ActividadModule {}