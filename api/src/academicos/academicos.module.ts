import { Module } from '@nestjs/common';
import { AcademicosController } from './academicos.controller';
import { AsistenciaController } from './asistencia/asistencia.controller';
import { AcademicosService } from './academicos.service';
import { AsistenciaService } from './asistencia/asistencia.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [AcademicosController, AsistenciaController],
  providers: [AcademicosService, AsistenciaService, StorageService]
})
export class AcademicosModule {}
