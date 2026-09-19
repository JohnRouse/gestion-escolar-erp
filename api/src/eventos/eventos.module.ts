import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { RecordatoriosService } from './recordatorios.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EventosController],
  providers: [EventosService, RecordatoriosService],
  exports: [EventosService, RecordatoriosService],
})
export class EventosModule {}
