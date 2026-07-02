import { Module } from '@nestjs/common';
import { TutoriaController } from './tutoria.controller';
import { TutoriaService } from './tutoria.service';
import { TutoriaAccessGuard } from './tutoria-access.guard';

@Module({
  controllers: [TutoriaController],
  providers: [TutoriaService, TutoriaAccessGuard],
})
export class TutoriaModule {}
