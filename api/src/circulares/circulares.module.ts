import { Module } from '@nestjs/common';
import { CircularesService } from './circulares.service';
import { CircularesController } from './circulares.controller';
import { CircularesPadresController } from './circulares-padres.controller';
import { StorageService } from '../storage/storage.service';

@Module({
  providers: [CircularesService, StorageService],
  controllers: [CircularesPadresController, CircularesController],
})
export class CircularesModule {}
