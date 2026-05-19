import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { RecordatoriosService } from './recordatorios.service';

@Module({
  controllers: [EventosController],
  providers: [EventosService, RecordatoriosService], // 🆕
  exports: [EventosService, RecordatoriosService],
})
export class EventosModule {}