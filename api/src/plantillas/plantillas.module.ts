import { Module } from '@nestjs/common';
import { PlantillasController } from './plantillas.controller';

@Module({
  controllers: [PlantillasController],
})
export class PlantillasModule {}
