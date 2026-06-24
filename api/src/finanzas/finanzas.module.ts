import { Module } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { FinanzasController } from './finanzas.controller';
import { FinanzasPublicController } from './finanzas-public.controller';
import { StorageService } from '../storage/storage.service';

@Module({
  providers: [FinanzasService, StorageService],
  controllers: [FinanzasController, FinanzasPublicController],
})
export class FinanzasModule {}