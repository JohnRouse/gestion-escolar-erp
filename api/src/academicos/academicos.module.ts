import { Module } from '@nestjs/common';
import { AcademicosController } from './academicos.controller';
import { AcademicosService } from './academicos.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [AcademicosController],
  providers: [AcademicosService, StorageService]
})
export class AcademicosModule {}
