import { Module } from '@nestjs/common';
import { ComunicacionesController } from './comunicaciones.controller';
import { ComunicacionesService } from './comunicaciones.service';

@Module({
  controllers: [ComunicacionesController],
  providers: [ComunicacionesService]
})
export class ComunicacionesModule {}
