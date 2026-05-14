import { Module } from '@nestjs/common';
import { ApoderadosController } from './apoderados.controller';
import { ApoderadosService } from './apoderados.service';
import { EstudiantesController } from './estudiantes.controller';

@Module({
  controllers: [ApoderadosController, EstudiantesController],
  providers: [ApoderadosService],
  exports: [ApoderadosService],
})
export class ApoderadosModule {}