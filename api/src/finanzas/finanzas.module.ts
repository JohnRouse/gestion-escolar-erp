import { Module } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';
import { FinanzasPublicController } from './finanzas-public.controller';

@Module({
  providers: [FinanzasService],
  controllers: [FinanzasController, FinanzasPublicController],
})
export class FinanzasModule {}