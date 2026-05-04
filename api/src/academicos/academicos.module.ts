import { Module } from '@nestjs/common';
import { AcademicosController } from './academicos.controller';
import { AcademicosService } from './academicos.service';

@Module({
  controllers: [AcademicosController],
  providers: [AcademicosService]
})
export class AcademicosModule {}
