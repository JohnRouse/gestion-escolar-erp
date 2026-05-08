import { Module } from '@nestjs/common';
import { AnaliticasController } from './analiticas.controller';
import { AnaliticasService } from './analiticas.service';

@Module({
  controllers: [AnaliticasController],
  providers: [AnaliticasService]
})
export class AnaliticasModule {}
