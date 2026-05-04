import { Module } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';

@Module({
  providers: [FinanzasService],
  controllers: [FinanzasController],
})
export class FinanzasModule {}