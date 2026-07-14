import { Module } from '@nestjs/common';
import { ColegiosController } from './colegios.controller';
import { ColegiosService } from './colegios.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [ColegiosController],
  providers: [ColegiosService, StorageService],
})
export class ColegiosModule {}