import { Module } from '@nestjs/common';
import { TutoriaController } from './tutoria.controller';
import { TutoriaService } from './tutoria.service';

@Module({
  controllers: [TutoriaController],
  providers: [TutoriaService],
})
export class TutoriaModule {}
