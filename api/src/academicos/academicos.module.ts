import { Module } from '@nestjs/common';
import { AcademicosController } from './academicos.controller';
import { AsistenciaController } from './asistencia/asistencia.controller';
import { AcademicosService } from './academicos.service';
import { AsistenciaService } from './asistencia/asistencia.service';
import { StorageService } from '../storage/storage.service';
import { AcademicosPadresController } from './academicos-padres.controller';
import { AsistenciaPadresController } from './asistencia/asistencia-padres.controller';

@Module({
  controllers: [
    AcademicosPadresController,
    AsistenciaPadresController,
    AcademicosController,
    AsistenciaController,
  ],
  providers: [AcademicosService, AsistenciaService, StorageService]
})
export class AcademicosModule {}
